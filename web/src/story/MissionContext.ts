import * as THREE from 'three';
import type { StoryHost } from './StoryHost';
import { CAST, type CastId } from './cast';
import { AnimatedCharacter } from '../player/AnimatedCharacter';
import { VehicleModel } from '../vehicles/VehicleModel';
import type { VehicleKind } from '../vehicles/vehicleTypes';
import { KERB } from '../world/cityLayout';
import { dampAngle } from '../utils/math';

export class MissionAborted extends Error {}

/** Thrown into a stage when ctx.fail() is called; the manager retries from the checkpoint. */
export class MissionFailed extends Error {}

type XZ = { x: number; z: number };
type V3 = [number, number, number];

interface Waiter {
  pred: () => boolean;
  resolve: () => void;
  reject: (e: Error) => void;
}

/**
 * Awaitable story primitives. Mission scripts read like a screenplay:
 *   await ctx.say('ramesh', 'Aaj phir late?', 'Late again?');
 * Everything is driven by tick(dt) from the game loop, so pausing the game
 * (pointer unlocked) pauses the story too.
 */
export class MissionContext {
  time = 0;
  /** True while the player is holding Enter through a cutscene. */
  skipping = false;
  inCutscene = false;
  vars: Record<string, unknown>;
  /** Per-attempt scratch state (props spawned etc.); cleared on cleanup, never saved. */
  scratch: Record<string, unknown> = {};

  private waiters: Waiter[] = [];
  private tickers = new Set<(dt: number) => void>();
  private actors: AnimatedCharacter[] = [];
  private props: THREE.Object3D[] = [];
  private skipHold = 0;
  private aborted = false;
  private failure: string | null = null;
  private disposers: (() => void)[] = [];

  constructor(readonly host: StoryHost, vars: Record<string, unknown> = {}) {
    this.vars = vars;
  }

  tick(dt: number) {
    if (this.inCutscene) {
      this.skipHold = this.host.input.downUI('Enter') ? this.skipHold + dt : 0;
      if (this.skipHold > 0.6 && !this.skipping) {
        this.skipping = true;
        this.host.dialogue.hide();
      }
    }
    this.time += dt;
    for (const t of this.tickers) t(dt);
    for (const a of this.actors) a.update(dt, (a.root.userData.speed as number) ?? 0);
    if (this.failure !== null) {
      const all = this.waiters;
      this.waiters = [];
      for (const w of all) w.reject(new MissionFailed(this.failure));
      return;
    }
    const ready = this.waiters.filter((w) => this.aborted || w.pred());
    this.waiters = this.waiters.filter((w) => !ready.includes(w));
    for (const w of ready) {
      if (this.aborted) w.reject(new MissionAborted());
      else w.resolve();
    }
  }

  abort() {
    this.aborted = true;
  }

  /** Fail the mission (can be called from anywhere, e.g. inside an every() ticker). */
  fail(reason: string) {
    if (this.failure === null) this.failure = reason;
  }

  clearFailure() {
    this.failure = null;
  }

  /** Register cleanup work (unsubscribe, remove collider...). */
  onCleanup(fn: () => void) {
    this.disposers.push(fn);
  }

  /** Temporary barricade with a collider; removed when the attempt ends. */
  barrier(x: number, z: number, length: number, yaw = 0) {
    this.onCleanup(this.host.spawnBarrier(x, z, length, yaw));
  }

  /** Any temporary scene object. */
  prop<T extends THREE.Object3D>(o: T): T {
    this.host.scene.add(o);
    this.props.push(o);
    return o;
  }

  /** Called when the player drives through a red light (until cleanup). */
  onRedLight(fn: () => void) {
    this.onCleanup(this.host.signals.onRunRed(fn));
  }

  // ------------------------------------------------------------ timing

  waitUntil(pred: () => boolean): Promise<void> {
    return new Promise((resolve, reject) => this.waiters.push({ pred, resolve, reject }));
  }

  wait(seconds: number): Promise<void> {
    const t0 = this.time;
    return this.waitUntil(() => this.skipping || this.time - t0 >= seconds);
  }

  /** Run a callback every frame until the returned function is called. */
  every(fn: (dt: number) => void): () => void {
    this.tickers.add(fn);
    return () => this.tickers.delete(fn);
  }

  // ------------------------------------------------------------ dialogue

  async say(who: CastId, text: string, en?: string, phone = false): Promise<void> {
    if (this.skipping) return;
    const d = this.host.dialogue;
    d.say({ who, text, en, phone });
    await this.waitUntil(() => d.done || this.skipping);
  }

  async choose(who: CastId, options: { text: string; en?: string }[]): Promise<number> {
    const d = this.host.dialogue;
    d.choose(who, options);
    await this.waitUntil(() => d.done);
    return Math.max(0, d.choice);
  }

  // ------------------------------------------------------------ cutscenes

  async cutscene(fn: () => Promise<void>, returnHeading?: number): Promise<void> {
    const h = this.host;
    this.inCutscene = true;
    this.skipping = false;
    h.setControlsLocked(true);
    const f = h.focus();
    h.setCrowdExclusion({ x: f.x, z: f.z, r: 16 });
    h.hud.setLetterbox(true);
    h.hud.setSkipHint(true);
    try {
      await fn();
    } finally {
      this.inCutscene = false;
      this.skipping = false;
      h.setControlsLocked(false);
      h.setCrowdExclusion(null);
      h.hud.setLetterbox(false);
      h.hud.setSkipHint(false);
      h.hud.setFade(0);
      h.dialogue.hide();
      h.camera.clearShot(returnHeading ?? h.player.facing);
    }
  }

  /** Camera cut (duration 0) or glide. */
  shot(pos: V3, look: V3, duration = 0, fov?: number): Promise<void> {
    const cam = this.host.camera;
    cam.setShot(new THREE.Vector3(...pos), new THREE.Vector3(...look), this.skipping ? 0 : duration, fov);
    return duration > 0 ? this.waitUntil(() => cam.shotDone || this.skipping) : Promise.resolve();
  }

  async fade(to: 0 | 1, seconds = 0.6): Promise<void> {
    this.host.hud.setFade(to);
    await this.wait(seconds);
  }

  // ------------------------------------------------------------ actors & props

  actor(id: CastId, x: number, z: number, facing: number, clip?: string): AnimatedCharacter | null {
    if (!this.host.hasCharacterModels) return null;
    const a = new AnimatedCharacter(CAST[id].palette);
    a.root.position.set(x, KERB, z);
    a.root.rotation.y = facing;
    a.randomizePhase(Math.random());
    if (clip) a.setAction(clip);
    this.host.scene.add(a.root);
    this.actors.push(a);
    return a;
  }

  removeActor(a: AnimatedCharacter | null) {
    if (!a) return;
    a.root.removeFromParent();
    this.actors = this.actors.filter((x) => x !== a);
  }

  /** Walk an actor to a point (straight line), then stand facing `endFacing`. */
  async walk(a: AnimatedCharacter | null, x: number, z: number, speed = 1.5, endFacing?: number): Promise<void> {
    if (!a) return;
    const root = a.root;
    root.userData.speed = speed;
    const stop = this.every((dt) => {
      const dx = x - root.position.x, dz = z - root.position.z;
      const d = Math.hypot(dx, dz);
      if (this.skipping || d < 0.05) {
        root.position.x = x;
        root.position.z = z;
        return;
      }
      const step = Math.min(d, speed * dt);
      root.position.x += (dx / d) * step;
      root.position.z += (dz / d) * step;
      root.rotation.y = dampAngle(root.rotation.y, Math.atan2(dx, dz), 10, dt);
    });
    await this.waitUntil(() => this.skipping || Math.hypot(x - root.position.x, z - root.position.z) < 0.06);
    root.position.set(x, root.position.y, z);
    stop();
    root.userData.speed = 0;
    if (endFacing !== undefined) root.rotation.y = endFacing;
  }

  face(a: AnimatedCharacter | null, facing: number) {
    if (a) a.root.rotation.y = facing;
  }

  propVehicle(kind: VehicleKind, color: string, x: number, z: number, heading: number): VehicleModel {
    const v = new VehicleModel(kind, color);
    v.root.position.set(x, 0, z);
    v.root.rotation.y = heading;
    this.host.scene.add(v.root);
    this.props.push(v.root);
    return v;
  }

  /** Drive a prop vehicle in a straight line, easing in and out. */
  async drive(v: VehicleModel, x: number, z: number, speed = 8): Promise<void> {
    const root = v.root;
    const sx = root.position.x, sz = root.position.z;
    const total = Math.hypot(x - sx, z - sz);
    root.rotation.y = Math.atan2(x - sx, z - sz);
    let travelled = 0;
    const stop = this.every((dt) => {
      if (this.skipping) travelled = total;
      const remaining = total - travelled;
      const v0 = Math.min(speed, 1.5 + travelled * 1.2, 1 + remaining * 1.1);
      const step = Math.min(remaining, v0 * dt);
      travelled += step;
      v.roll(step);
      const k = total > 0 ? travelled / total : 1;
      root.position.set(sx + (x - sx) * k, 0, sz + (z - sz) * k);
    });
    await this.waitUntil(() => travelled >= total - 0.01);
    stop();
  }

  removeProp(o: THREE.Object3D) {
    o.removeFromParent();
    this.props = this.props.filter((p) => p !== o);
  }

  // ------------------------------------------------------------ objectives

  /** Show an objective (+ optional marker) until the condition holds. Text may contain <em>. */
  async objective(text: string, until: () => boolean, marker?: XZ): Promise<void> {
    const h = this.host;
    h.hud.setObjective(text);
    if (marker) h.marker.show(marker.x, marker.z);
    await this.waitUntil(until);
    h.hud.setObjective(null);
    h.marker.hide();
  }

  /** Walk-up interaction: marker + "E — label" prompt when close, resolves on E. */
  async interact(text: string, at: XZ, label: string, radius = 2.2): Promise<void> {
    const h = this.host;
    const it = { x: at.x, z: at.z, radius, label, triggered: false };
    h.interaction = it;
    await this.objective(text, () => it.triggered, at);
    h.interaction = null;
  }

  near(p: XZ, radius: number): boolean {
    const f = this.host.focus();
    return Math.hypot(f.x - p.x, f.z - p.z) < radius;
  }

  // ------------------------------------------------------------ cleanup

  cleanup() {
    for (const a of this.actors) a.root.removeFromParent();
    for (const p of this.props) p.removeFromParent();
    this.actors = [];
    this.props = [];
    this.tickers.clear();
    for (const d of this.disposers) d();
    this.disposers = [];
    this.scratch = {};
    this.skipping = false;
    this.inCutscene = false;
    const h = this.host;
    h.marker.hide();
    h.hud.setObjective(null);
    h.hud.setMeter(null);
    h.interaction = null;
  }
}
