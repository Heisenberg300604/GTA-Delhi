import * as THREE from 'three';
import { Engine, type GameLoop } from '../engine/Engine';
import { Input } from '../engine/Input';
import { AudioSystem } from '../engine/Audio';
import { Physics } from '../physics/Physics';
import { City } from '../world/City';
import { Environment } from '../world/Environment';
import { Marker } from '../world/Marker';
import { SPAWN, KERB, LANDMARKS } from '../world/cityLayout';
import { PlayerController } from '../player/PlayerController';
import { BikeController } from '../vehicles/BikeController';
import { CarController } from '../vehicles/CarController';
import type { Drivable } from '../vehicles/Drivable';
import { CameraController } from '../camera/CameraController';
import { Hud } from '../ui/Hud';
import { DialogueBox } from '../ui/DialogueBox';
import { Minimap } from '../ui/Minimap';
import { DebugOverlay } from '../debug/DebugOverlay';
import { QUALITY_PRESETS } from '../config';
import { Crowd } from '../ai/Crowd';
import { Traffic, type Obstacle } from '../ai/Traffic';
import { clamp } from '../utils/math';
import { AnimatedCharacter, loadCharacterTemplate } from '../player/AnimatedCharacter';
import { SaveManager } from '../save/SaveManager';
import { MissionManager } from '../story/MissionManager';
import type { StoryHost, Interaction } from '../story/StoryHost';
import { CAST } from '../story/cast';
import { MISSIONS } from '../story/missions';
import { TrafficSignals } from '../world/TrafficSignals';
import { RAPIER } from '../physics/Physics';

/** Wires the systems together, owns the on-foot ↔ vehicle state machine and hosts the story. */
export class Game implements GameLoop, StoryHost {
  /** null = on foot. */
  private current: Drivable | null = null;
  readonly input: Input;
  readonly audio = new AudioSystem();
  readonly save = new SaveManager();
  readonly scene: THREE.Scene;
  readonly hud: Hud;
  readonly dialogue: DialogueBox;
  readonly marker: Marker;
  readonly camera: CameraController;
  readonly player: PlayerController;
  readonly bike: BikeController;
  readonly car: CarController;
  interaction: Interaction | null = null;
  readonly signals: TrafficSignals;
  private triggerMarker: Marker;
  readonly hasCharacterModels: boolean;

  private env: Environment;
  private vehicles: Drivable[];
  private crowd: Crowd;
  private traffic: Traffic;
  private minimap: Minimap;
  private debug: DebugOverlay;
  private missions: MissionManager;
  private npcs = new Map<string, AnimatedCharacter>();
  private lastImpact = 0;
  private obstacles: Obstacle[] = [];
  private storyStarted = false;
  private triggerLetter = '';

  private constructor(private readonly engine: Engine, private readonly physics: Physics, ui: HTMLElement, hasModel: boolean) {
    this.scene = engine.scene;
    this.hasCharacterModels = hasModel;
    const scene = this.scene;
    const preset = QUALITY_PRESETS[engine.quality];
    this.input = new Input(engine.canvas);
    this.env = new Environment(scene, engine.renderer, engine.quality);
    new City(scene, physics);

    this.player = new PlayerController(
      scene, physics, new THREE.Vector3(SPAWN.player.x, KERB, SPAWN.player.z), SPAWN.player.facing,
      hasModel ? new AnimatedCharacter(CAST.aryan.palette) : undefined,
    );
    this.bike = new BikeController(scene, physics, new THREE.Vector3(SPAWN.bike.x, 0, SPAWN.bike.z), SPAWN.bike.heading);
    this.car = new CarController(scene, physics, new THREE.Vector3(SPAWN.car.x, 0, SPAWN.car.z), SPAWN.car.heading);
    this.vehicles = [this.bike, this.car];
    this.camera = new CameraController(engine.camera, physics, SPAWN.cameraYaw, () => []);
    this.crowd = new Crowd(scene, physics, preset.pedestrians, this.player.position, preset.nearPedestrians);
    this.traffic = new Traffic(scene, physics, preset.traffic, this.player.position);
    this.marker = new Marker(scene);
    this.triggerMarker = new Marker(scene, '#ff7043');
    this.signals = new TrafficSignals(scene, physics);
    this.traffic.signals = this.signals;
    this.spawnStoryNpcs();

    this.hud = new Hud(ui, () => this.beginPlay());
    this.minimap = new Minimap(ui.querySelector('.hud') as HTMLElement);
    this.dialogue = new DialogueBox(ui.querySelector('.hud') as HTMLElement);
    this.debug = new DebugOverlay(ui);
    this.crowd.onBark = (text) => this.hud.showBark(text);
    this.traffic.onHonk = (x, z, atPlayer) => this.honkAt(x, z, atPlayer);
    this.missions = new MissionManager(this, MISSIONS);

    this.hud.setTitleProgress(this.save.hasProgress);
    this.applyWorldState();
    document.addEventListener('pointerlockchange', () => this.hud.showOverlay(!this.input.pointerLocked));
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyN' && !this.input.pointerLocked && !this.storyStarted) {
        this.save.reset();
        location.reload();
      }
    });
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

  /** Title-screen click: grab the mouse, unlock audio, start or resume the story. */
  beginPlay() {
    this.audio.unlock();
    this.input.requestPointerLock();
    if (!this.storyStarted) {
      this.storyStarted = true;
      this.missions.startNext();
    }
  }

  private spawnStoryNpcs() {
    if (!this.hasCharacterModels) return;
    const place = (id: keyof typeof CAST, x: number, z: number, facing: number, clip?: string) => {
      const a = new AnimatedCharacter(CAST[id].palette);
      a.root.position.set(x, KERB, z);
      a.root.rotation.y = facing;
      if (clip) a.setAction(clip);
      this.scene.add(a.root);
      this.npcs.set(id, a);
    };
    place('ramesh', LANDMARKS.chaiStall.x - 1.75, LANDMARKS.chaiStall.z + 0.35, Math.PI);
    place('baker', LANDMARKS.bakery.x, LANDMARKS.bakery.z + 0.3, 0);
  }

  /** Persistent consequences of finished missions. */
  private applyWorldState() {
    const s = this.save.data;
    if (s.flags.carSeized) {
      // seized by the Kothi: parked, locked, in Ring Road Parking
      this.car.teleport(new THREE.Vector3(LANDMARKS.lotCar.x, KERB, LANDMARKS.lotCar.z), LANDMARKS.lotCar.heading);
      this.car.locked = true;
    }
    this.hud.setDebt(s.debt, s.debtRevealed);
    this.hud.setWallet(s.money);
  }

  // ------------------------------------------------------------ StoryHost

  vehicle(): Drivable | null {
    return this.current;
  }

  focus(): THREE.Vector3 {
    return this.current ? this.current.position : this.player.position;
  }

  forceExit() {
    if (this.current) this.exitVehicle(this.current, this.current.exitPoints()[0]);
  }

  enter(v: Drivable) {
    if (this.current === v) return;
    this.forceExit();
    this.current = v;
    this.player.setActive(false);
    v.seat(this.player.rig);
  }

  spawnBarrier(x: number, z: number, length: number, yaw: number): () => void {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(length, 1.0, 0.45), Game.barrierMaterial());
    mesh.position.set(x, KERB + 0.35, z);
    mesh.rotation.y = yaw;
    mesh.castShadow = true;
    this.scene.add(mesh);
    const collider = this.physics.world.createCollider(
      RAPIER.ColliderDesc.cuboid(length / 2, 0.6, 0.25)
        .setTranslation(x, 0.6, z)
        .setRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) }),
    );
    return () => {
      mesh.removeFromParent();
      this.physics.world.removeCollider(collider, false);
    };
  }

  private static barrierMat: THREE.Material | null = null;
  private static barrierMaterial(): THREE.Material {
    if (!Game.barrierMat) {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 32;
      const g = c.getContext('2d')!;
      for (let i = 0; i < 8; i++) {
        g.fillStyle = i % 2 ? '#141414' : '#f5c518';
        g.beginPath();
        g.moveTo(i * 16 - 16, 32); g.lineTo(i * 16, 0); g.lineTo(i * 16 + 16, 0); g.lineTo(i * 16, 32);
        g.fill();
      }
      g.fillStyle = '#c62828';
      g.font = '900 13px sans-serif';
      g.fillText('POLICE', 40, 21);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      Game.barrierMat = new THREE.MeshLambertMaterial({ map: t });
    }
    return Game.barrierMat;
  }

  setControlsLocked(locked: boolean) {
    this.input.locked = locked;
  }

  setCrowdExclusion(zone: { x: number; z: number; r: number } | null) {
    this.crowd.exclusion = zone;
  }

  npc(id: string) {
    return this.npcs.get(id);
  }

  // ------------------------------------------------------------ simulation

  fixedUpdate(dt: number) {
    if (this.input.consume('KeyF')) {
      if (this.current) this.tryExit();
      else {
        const v = this.nearestVehicle();
        if (v) {
          this.enter(v);
          this.hud.showToast(v.kind === 'bike' ? `${v.name} · chal, nikal!` : `${v.name} · Papa ki gaadi. Dhyaan se.`);
        }
      }
    }
    if (this.interaction && !this.current && this.input.consume('KeyE')) {
      const it = this.interaction;
      if (Math.hypot(this.player.position.x - it.x, this.player.position.z - it.z) < it.radius) it.triggered = true;
    }
    if (!this.current && this.dialogue.done && this.input.consume('Mouse0')) this.player.rig.punch?.();
    this.player.fixedUpdate(dt, this.input, this.camera.yaw);
    for (const v of this.vehicles) v.fixedUpdate(dt, v === this.current ? this.input : null);

    const active = this.current;
    this.crowd.fixedUpdate(dt, {
      playerPos: this.focus(),
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
      if (!v.available) continue;
      this.obstacles.push({ x: v.position.x, z: v.position.z, halfLen: v.halfLength, isPlayer: v === active });
    }
    this.traffic.fixedUpdate(dt, { near: this.focus(), obstacles: this.obstacles, camera: this.engine.camera });
    const fp = this.focus();
    this.signals.update(dt, { x: fp.x, z: fp.z, heading: active ? active.heading : this.player.facing, speed: active ? active.speed : 0, driving: !!active });
    this.physics.step(dt);
  }

  private nearestVehicle(): Drivable | null {
    let best: Drivable | null = null;
    let bestD = Infinity;
    for (const v of this.vehicles) {
      if (!v.available || v.locked) continue;
      const d = Math.hypot(v.position.x - this.player.position.x, v.position.z - this.player.position.z);
      if (d < v.mountDistance && d < bestD) {
        best = v;
        bestD = d;
      }
    }
    return best;
  }

  private tryExit() {
    const v = this.current!;
    if (v.kmh / 3.6 > v.exitMaxSpeed) {
      this.hud.showToast('Slow down to get out');
      return;
    }
    const from = { x: v.position.x, y: v.position.y + 0.3, z: v.position.z };
    const spot =
      v.exitPoints().find((p) => {
        const dx = p.x - from.x, dz = p.z - from.z;
        const d = Math.hypot(dx, dz);
        return this.physics.castRay(from, { x: dx / d, y: 0, z: dz / d }, d + 0.4, (c) => c !== v.collider) === null;
      }) ?? v.exitPoints()[0];
    this.exitVehicle(v, spot);
  }

  private exitVehicle(v: Drivable, spot: THREE.Vector3) {
    v.unseat(this.player.rig);
    this.player.root.add(this.player.rig.root);
    this.player.teleport(spot, v.heading);
    this.player.setActive(true);
    this.current = null;
  }

  private honkAt(x: number, z: number, atPlayer: boolean) {
    const cam = this.engine.camera;
    const dx = x - cam.position.x, dz = z - cam.position.z;
    const d = Math.hypot(dx, dz);
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const pan = d > 0.1 ? (dx * right.x + dz * right.z) / d : 0;
    const vol = (atPlayer ? 0.14 : 0.08) * clamp(1 - d / 90, 0, 1);
    this.audio.playHorn(vol, pan * 0.8, 3200 - Math.min(d, 80) * 25);
    if (atPlayer && d < 25 && Math.random() < 0.35 && this.dialogue.done) {
      this.hud.showBark(Math.random() < 0.5 ? 'Abe hatt! Raasta chhod!' : 'Bhai, gaadi hata le yaar!');
    }
  }

  /** Show the next mission's start point; start it when the player arrives. */
  private updateMissionTrigger() {
    const next = this.storyStarted && !this.missions.running ? this.missions.nextAvailable() : null;
    const t = next?.trigger;
    if (!t || this.input.locked) {
      this.triggerMarker.hide();
      return;
    }
    this.triggerMarker.show(t.x, t.z, KERB + 0.02);
    this.triggerLetter = t.label;
    const f = this.focus();
    if (Math.hypot(f.x - t.x, f.z - t.z) < t.radius && (!this.current || Math.abs(this.current.speed) < 3)) {
      this.triggerMarker.hide();
      this.missions.start(next!);
    }
  }

  // ------------------------------------------------------------ frame

  update(dt: number, alpha: number) {
    const v = this.current;
    this.missions.tick(dt);
    this.updateMissionTrigger();
    this.dialogue.update(dt, this.input);

    this.player.render(alpha, dt);
    for (const veh of this.vehicles) veh.render(alpha, dt);
    if (v) this.player.rig.update(dt, 0);
    for (const n of this.npcs.values()) n.update(dt, 0);

    const target = v
      ? { position: v.visualPosition, mode: v.kind, heading: v.heading, speed: v.speed, shake: v.impact }
      : { position: this.player.visualPosition, mode: 'foot' as const };
    this.camera.update(dt, this.input, target);
    this.crowd.render(alpha, dt, this.engine.camera.position);
    this.traffic.render(alpha);
    this.marker.update(dt);
    this.triggerMarker.update(dt);
    this.env.update(this.engine.camera.position, target.position);

    // HUD
    const locked = this.input.locked;
    if (locked) this.hud.setPrompt(null);
    else if (!v) {
      const it = this.interaction;
      const nearIt = it && Math.hypot(this.player.position.x - it.x, this.player.position.z - it.z) < it.radius;
      const near = this.nearestVehicle();
      const lockedCar = !near && this.car.locked && this.car.available &&
        Math.hypot(this.car.position.x - this.player.position.x, this.car.position.z - this.player.position.z) < this.car.mountDistance;
      this.hud.setPrompt(nearIt ? `E — ${it!.label}`
        : near ? `F — ${near.kind === 'bike' ? 'ride' : 'drive'} the ${near.name}`
        : lockedCar ? '🔒 Locked — Lucky ke paas chaabi hai' : null);
    } else {
      this.hud.setPrompt(v.kmh < 3 ? `F — get ${v.kind === 'bike' ? 'off' : 'out'}` : null);
    }
    this.hud.setSpeed(v && !locked ? v.kmh : null, v?.name);
    this.hud.update(dt);
    const f = this.focus();
    const tp = this.triggerMarker.position;
    this.minimap.draw(f.x, f.z, v ? v.heading : this.player.facing, this.camera.yaw, this.marker.position, tp ? { ...tp, letter: this.triggerLetter } : null);

    // audio
    this.audio.setEngine(!!v, v ? v.speed : 0, v ? v.throttle : 0, v?.kind === 'car' ? 0.7 : 1);
    this.audio.setHorn(!!v && this.input.down('KeyH'));
    this.audio.updateAmbient(dt, Math.max(0, 1 - Math.abs(target.position.z) / 60));
    if (v && v.impact > 0.2 && performance.now() - this.lastImpact > 400) {
      this.audio.thump(v.impact);
      this.lastImpact = performance.now();
    }

    const m = this.missions.running;
    this.debug.update(dt, this.engine.renderer, {
      state: v ? `${v.kind} ${v.kmh.toFixed(0)} km/h` : `on foot ${this.player.grounded ? 'grounded' : 'airborne'}`,
      pos: `${f.x.toFixed(1)}, ${f.y.toFixed(1)}, ${f.z.toFixed(1)}`,
      quality: this.engine.quality,
      npcs: `${this.crowd.count} people · ${this.traffic.count} vehicles`,
      mission: m ? `${m.id} · stage ${this.save.data.current?.stage ?? '-'}` : 'free roam',
    });
    this.input.endFrame();
  }
}
