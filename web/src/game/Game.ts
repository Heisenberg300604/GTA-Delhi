import * as THREE from 'three';
import { Engine, type GameLoop } from '../engine/Engine';
import { Input } from '../engine/Input';
import { AudioSystem } from '../engine/Audio';
import { Physics } from '../physics/Physics';
import { City } from '../world/City';
import { Environment } from '../world/Environment';
import { SPAWN, KERB } from '../world/cityLayout';
import { PlayerController } from '../player/PlayerController';
import { BikeController } from '../vehicles/BikeController';
import { CarController } from '../vehicles/CarController';
import type { Drivable } from '../vehicles/Drivable';
import { CameraController } from '../camera/CameraController';
import { Hud } from '../ui/Hud';
import { DebugOverlay } from '../debug/DebugOverlay';
import { QUALITY_PRESETS } from '../config';
import { Crowd } from '../ai/Crowd';
import { Traffic, type Obstacle } from '../ai/Traffic';
import { clamp } from '../utils/math';
import { AnimatedCharacter, loadCharacterTemplate } from '../player/AnimatedCharacter';

/** Wires the systems together and owns the on-foot ↔ vehicle state machine. */
export class Game implements GameLoop {
  /** null = on foot. */
  private vehicle: Drivable | null = null;
  private input: Input;
  private audio = new AudioSystem();
  private env: Environment;
  private player: PlayerController;
  private bike: BikeController;
  private car: CarController;
  private vehicles: Drivable[];
  private cam: CameraController;
  private crowd: Crowd;
  private traffic: Traffic;
  private hud: Hud;
  private debug: DebugOverlay;
  private lastImpact = 0;
  private obstacles: Obstacle[] = [];

  private constructor(private readonly engine: Engine, private readonly physics: Physics, ui: HTMLElement, hasModel: boolean) {
    const scene = engine.scene;
    const preset = QUALITY_PRESETS[engine.quality];
    this.input = new Input(engine.canvas);
    this.env = new Environment(scene, engine.renderer, engine.quality);
    new City(scene, physics);

    this.player = new PlayerController(
      scene, physics, new THREE.Vector3(SPAWN.player.x, KERB, SPAWN.player.z), SPAWN.player.facing,
      hasModel ? new AnimatedCharacter() : undefined,
    );
    this.bike = new BikeController(scene, physics, new THREE.Vector3(SPAWN.bike.x, 0, SPAWN.bike.z), SPAWN.bike.heading);
    this.car = new CarController(scene, physics, new THREE.Vector3(SPAWN.car.x, 0, SPAWN.car.z), SPAWN.car.heading);
    this.vehicles = [this.bike, this.car];
    this.cam = new CameraController(engine.camera, physics, SPAWN.cameraYaw, () => []);
    this.crowd = new Crowd(scene, physics, preset.pedestrians, this.player.position, preset.nearPedestrians);
    this.traffic = new Traffic(scene, physics, preset.traffic, this.player.position);

    this.hud = new Hud(ui, () => this.start());
    this.debug = new DebugOverlay(ui);
    this.crowd.onBark = (text) => this.hud.showBark(text);
    this.traffic.onHonk = (x, z, atPlayer) => this.honkAt(x, z, atPlayer);
    document.addEventListener('pointerlockchange', () => this.hud.showOverlay(!this.input.pointerLocked));
    engine.onTicksDone = (ticks) => {
      if (ticks > 0) this.input.clearLatched();
    };
  }

  static async create(engine: Engine, ui: HTMLElement): Promise<Game> {
    const [physics, hasModel] = await Promise.all([
      Physics.create(),
      loadCharacterTemplate(`${import.meta.env.BASE_URL}assets/characters/human.glb`),
    ]);
    return new Game(engine, physics, ui, hasModel);
  }

  private start() {
    this.audio.unlock();
    this.input.requestPointerLock();
  }

  /** Where the player effectively is (on foot or in a vehicle). */
  private get focus(): THREE.Vector3 {
    return this.vehicle ? this.vehicle.position : this.player.position;
  }

  // ------------------------------------------------------------ simulation

  fixedUpdate(dt: number) {
    if (this.input.consume('KeyF')) {
      if (this.vehicle) this.tryExit();
      else {
        const v = this.nearestVehicle();
        if (v) this.enter(v);
      }
    }
    if (!this.vehicle && this.input.consume('Mouse0')) this.player.rig.punch?.();
    this.player.fixedUpdate(dt, this.input, this.cam.yaw);
    for (const v of this.vehicles) v.fixedUpdate(dt, v === this.vehicle ? this.input : null);

    const active = this.vehicle;
    this.crowd.fixedUpdate(dt, {
      playerPos: this.focus,
      playerOnFoot: !active,
      bikePos: active ? active.position : this.bike.position,
      bikeHeading: active ? active.heading : this.bike.heading,
      bikeSpeed: active ? active.speed : 0,
      horn: !!active && this.input.down('KeyH'),
      camera: this.engine.camera,
    });

    this.obstacles.length = 0;
    if (!active) this.obstacles.push({ x: this.player.position.x, z: this.player.position.z, halfLen: 0.4, isPlayer: true });
    for (const v of this.vehicles) {
      this.obstacles.push({ x: v.position.x, z: v.position.z, halfLen: v.halfLength, isPlayer: v === active });
    }
    this.traffic.fixedUpdate(dt, { near: this.focus, obstacles: this.obstacles, camera: this.engine.camera });
    this.physics.step(dt);
  }

  private nearestVehicle(): Drivable | null {
    let best: Drivable | null = null;
    let bestD = Infinity;
    for (const v of this.vehicles) {
      const d = Math.hypot(v.position.x - this.player.position.x, v.position.z - this.player.position.z);
      if (d < v.mountDistance && d < bestD) {
        best = v;
        bestD = d;
      }
    }
    return best;
  }

  private enter(v: Drivable) {
    this.vehicle = v;
    this.player.setActive(false);
    v.seat(this.player.rig);
    this.hud.showToast(v.kind === 'bike' ? `${v.name} · chal, nikal!` : `${v.name} · Papa ki gaadi. Dhyaan se.`);
  }

  private tryExit() {
    const v = this.vehicle!;
    if (v.kmh / 3.6 > v.exitMaxSpeed) {
      this.hud.showToast('Slow down to get out');
      return;
    }
    // first exit point with a clear line from the vehicle centre
    const from = { x: v.position.x, y: v.position.y + 0.3, z: v.position.z };
    const spot =
      v.exitPoints().find((p) => {
        const dx = p.x - from.x, dz = p.z - from.z;
        const d = Math.hypot(dx, dz);
        return this.physics.castRay(from, { x: dx / d, y: 0, z: dz / d }, d + 0.4, (c) => c !== v.collider) === null;
      }) ?? v.exitPoints()[0];
    v.unseat(this.player.rig);
    this.player.root.add(this.player.rig.root);
    this.player.teleport(spot, v.heading);
    this.player.setActive(true);
    this.vehicle = null;
  }

  private honkAt(x: number, z: number, atPlayer: boolean) {
    const cam = this.engine.camera;
    const dx = x - cam.position.x, dz = z - cam.position.z;
    const d = Math.hypot(dx, dz);
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const pan = d > 0.1 ? (dx * right.x + dz * right.z) / d : 0;
    const vol = (atPlayer ? 0.14 : 0.08) * clamp(1 - d / 90, 0, 1);
    this.audio.playHorn(vol, pan * 0.8, 3200 - Math.min(d, 80) * 25);
    if (atPlayer && d < 25 && Math.random() < 0.35) {
      this.hud.showBark(Math.random() < 0.5 ? 'Abe hatt! Raasta chhod!' : 'Bhai, gaadi hata le yaar!');
    }
  }

  // ------------------------------------------------------------ frame

  update(dt: number, alpha: number) {
    const v = this.vehicle;
    this.player.render(alpha, dt);
    for (const veh of this.vehicles) veh.render(alpha, dt);
    if (v) this.player.rig.update(dt, 0);

    const target = v
      ? { position: v.visualPosition, mode: v.kind, heading: v.heading, speed: v.speed, shake: v.impact }
      : { position: this.player.visualPosition, mode: 'foot' as const };
    this.cam.update(dt, this.input, target);
    this.crowd.render(alpha, dt, this.engine.camera.position);
    this.traffic.render(alpha);
    this.env.update(this.engine.camera.position, target.position);

    // HUD
    if (!v) {
      const near = this.nearestVehicle();
      this.hud.setPrompt(near ? `F — ${near.kind === 'bike' ? 'ride' : 'drive'} the ${near.name}` : null);
      this.hud.setSpeed(null);
    } else {
      this.hud.setPrompt(v.kmh < 3 ? `F — get ${v.kind === 'bike' ? 'off' : 'out'}` : null);
      this.hud.setSpeed(v.kmh, v.name);
    }
    this.hud.update(dt);

    // audio
    this.audio.setEngine(!!v, v ? v.speed : 0, v ? v.throttle : 0, v?.kind === 'car' ? 0.7 : 1);
    this.audio.setHorn(!!v && this.input.down('KeyH'));
    this.audio.updateAmbient(dt, Math.max(0, 1 - Math.abs(target.position.z) / 60));
    if (v && v.impact > 0.2 && performance.now() - this.lastImpact > 400) {
      this.audio.thump(v.impact);
      this.lastImpact = performance.now();
    }

    const p = this.focus;
    this.debug.update(dt, this.engine.renderer, {
      state: v ? `${v.kind} ${v.kmh.toFixed(0)} km/h` : `on foot ${this.player.grounded ? 'grounded' : 'airborne'}`,
      pos: `${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`,
      quality: this.engine.quality,
      npcs: `${this.crowd.count} people · ${this.traffic.count} vehicles`,
    });
    this.input.endFrame();
  }
}
