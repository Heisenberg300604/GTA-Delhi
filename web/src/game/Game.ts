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
import { CameraController } from '../camera/CameraController';
import { Hud } from '../ui/Hud';
import { DebugOverlay } from '../debug/DebugOverlay';
import { BIKE, QUALITY_PRESETS } from '../config';
import { Crowd } from '../ai/Crowd';

type PlayerState = 'foot' | 'bike';

/** Wires the systems together and owns the on-foot ↔ riding state machine. */
export class Game implements GameLoop {
  private state: PlayerState = 'foot';
  private input: Input;
  private audio = new AudioSystem();
  private env: Environment;
  private player: PlayerController;
  private bike: BikeController;
  private cam: CameraController;
  private crowd: Crowd;
  private hud: Hud;
  private debug: DebugOverlay;
  private tmp = new THREE.Vector3();
  private lastImpact = 0;

  private constructor(private readonly engine: Engine, private readonly physics: Physics, ui: HTMLElement) {
    const scene = engine.scene;
    this.input = new Input(engine.canvas);
    this.env = new Environment(scene, engine.renderer, engine.quality);
    new City(scene, physics);

    this.player = new PlayerController(scene, physics, new THREE.Vector3(SPAWN.player.x, KERB, SPAWN.player.z), SPAWN.player.facing);
    this.bike = new BikeController(scene, physics, new THREE.Vector3(SPAWN.bike.x, 0, SPAWN.bike.z), SPAWN.bike.heading);
    this.cam = new CameraController(engine.camera, physics, SPAWN.cameraYaw, () => [this.player.collider, this.bike.collider]);

    this.crowd = new Crowd(scene, physics, QUALITY_PRESETS[engine.quality].pedestrians, this.player.position);

    this.hud = new Hud(ui, () => this.start());
    this.crowd.onBark = (text) => this.hud.showBark(text);
    this.debug = new DebugOverlay(ui);
    document.addEventListener('pointerlockchange', () => this.hud.showOverlay(!this.input.pointerLocked));
    engine.onTicksDone = (ticks) => {
      if (ticks > 0) this.input.clearLatched();
    };
  }

  static async create(engine: Engine, ui: HTMLElement): Promise<Game> {
    const physics = await Physics.create();
    return new Game(engine, physics, ui);
  }

  private start() {
    this.audio.unlock();
    this.input.requestPointerLock();
  }

  // ------------------------------------------------------------ simulation

  fixedUpdate(dt: number) {
    if (this.state === 'foot') {
      if (this.input.consume('KeyF') && this.distanceToBike() < BIKE.mountDistance) this.mount();
      this.player.fixedUpdate(dt, this.input, this.cam.yaw);
      this.bike.fixedUpdate(dt, null);
    } else {
      if (this.input.consume('KeyF')) this.tryDismount();
      this.bike.fixedUpdate(dt, this.state === 'bike' ? this.input : null);
      this.player.fixedUpdate(dt, this.input, this.cam.yaw);
    }
    const riding = this.state === 'bike';
    this.crowd.fixedUpdate(dt, {
      playerPos: riding ? this.bike.position : this.player.position,
      playerOnFoot: !riding,
      bikePos: this.bike.position,
      bikeHeading: this.bike.heading,
      bikeSpeed: this.bike.speed,
      horn: riding && this.input.down('KeyH'),
      camera: this.engine.camera,
    });
    this.physics.step(dt);
  }

  private distanceToBike(): number {
    return this.tmp.copy(this.player.position).setY(0).distanceTo(new THREE.Vector3(this.bike.position.x, 0, this.bike.position.z));
  }

  private mount() {
    this.state = 'bike';
    this.player.setActive(false);
    this.bike.model.riderMount.add(this.player.rig.root);
    this.player.rig.setPose('ride');
    this.hud.showToast(`${BIKE.name} · chal, nikal!`);
  }

  private tryDismount() {
    if (this.bike.kmh / 3.6 > BIKE.dismountMaxSpeed) {
      this.hud.showToast('Slow down to get off');
      return;
    }
    // step off on the left; fall back to the right if something is in the way
    const right = this.bike.right();
    const origin = { x: this.bike.position.x, y: this.bike.position.y + 0.3, z: this.bike.position.z };
    let side = -1;
    const blocked = this.physics.castRay(origin, { x: -right.x, y: 0, z: -right.z }, 1.3, (c) => c !== this.bike.collider);
    if (blocked !== null) side = 1;
    const feet = new THREE.Vector3(
      this.bike.position.x + right.x * side * 1.0,
      this.bike.visualPosition.y + 0.05,
      this.bike.position.z + right.z * side * 1.0,
    );
    this.state = 'foot';
    this.player.root.add(this.player.rig.root);
    this.player.teleport(feet, this.bike.heading);
    this.player.setActive(true);
  }

  // ------------------------------------------------------------ frame

  update(dt: number, alpha: number) {
    const riding = this.state === 'bike';
    this.player.render(alpha, dt);
    this.bike.render(alpha, dt);
    if (riding) this.player.rig.update(dt, 0);

    const target = riding
      ? { position: this.bike.visualPosition, mode: 'bike' as const, heading: this.bike.heading, speed: this.bike.speed, shake: this.bike.impact }
      : { position: this.player.visualPosition, mode: 'foot' as const };
    this.cam.update(dt, this.input, target);
    this.crowd.render(alpha, dt, this.engine.camera.position);
    this.env.update(this.engine.camera.position, target.position);

    // HUD + audio
    if (!riding) {
      this.hud.setPrompt(this.distanceToBike() < BIKE.mountDistance ? 'F — ride the Vayu Spark 125' : null);
      this.hud.setSpeed(null);
    } else {
      this.hud.setPrompt(this.bike.kmh < 3 ? 'F — get off' : null);
      this.hud.setSpeed(this.bike.kmh);
    }
    this.hud.update(dt);
    this.audio.setEngine(riding, this.bike.speed, this.bike.throttle);
    this.audio.setHorn(riding && this.input.down('KeyH'));
    const fromMainRoad = Math.abs(target.position.z);
    this.audio.updateAmbient(dt, Math.max(0, 1 - fromMainRoad / 60));
    if (this.bike.impact > 0.2 && performance.now() - this.lastImpact > 400) {
      this.audio.thump(this.bike.impact);
      this.lastImpact = performance.now();
    }

    const p = riding ? this.bike.position : this.player.position;
    this.debug.update(dt, this.engine.renderer, {
      state: riding ? `riding ${this.bike.kmh.toFixed(0)} km/h` : `on foot ${this.player.grounded ? 'grounded' : 'airborne'}`,
      pos: `${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`,
      quality: this.engine.quality,
      pedestrians: String(this.crowd.count),
    });

    this.input.endFrame();
  }
}
