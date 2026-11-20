import * as THREE from 'three';
import { RAPIER, Physics } from '../physics/Physics';
import { Input } from '../engine/Input';
import { BIKE } from '../config';
import { clamp, damp, lerp, lerpAngle } from '../utils/math';
import { BikeModel } from './BikeModel';
import type { Drivable } from './Drivable';
import type { CharacterRig } from '../player/CharacterRig';

// A capsule lying along the bike's length. (A flat-bottomed box gets snagged on
// flat ground by the character controller; rounded shapes slide cleanly.)
const RADIUS = BIKE.collider.radius;
const HALF_LEN = BIKE.collider.halfLength;
const SKIN = 0.03;
/** Collider floats this far above the road so kerbs pass underneath; walls, poles and cars still hit. */
const CLEARANCE = 0.17;
const GROUND_OFFSET = CLEARANCE + RADIUS; // collider centre → ground
const DOWN = { x: 0, y: -1, z: 0 };

/**
 * Arcade motorcycle. A kinematic body + character controller gives solid
 * collisions with the city without the instability of real two-wheel physics.
 * Steering uses a bicycle model; lean is visual only.
 */
export class BikeController implements Drivable {
  readonly name = BIKE.name;
  readonly kind = 'bike' as const;
  readonly mountDistance = BIKE.mountDistance;
  readonly exitMaxSpeed = BIKE.dismountMaxSpeed;
  readonly halfLength = 1.0;
  readonly body: RAPIER.RigidBody;
  readonly collider: RAPIER.Collider;
  readonly model = new BikeModel();

  heading: number;
  speed = 0;
  steer = 0;
  lean = 0;
  grounded = true;
  /** 0..1 strength of the last impact, decays (used for camera shake / sfx). */
  impact = 0;
  throttle = 0;

  private controller: RAPIER.KinematicCharacterController;
  private vy = 0;
  private prev = new THREE.Vector3();
  private curr = new THREE.Vector3();
  private prevHeading: number;
  private quat = new THREE.Quaternion();
  private up = new THREE.Vector3(0, 1, 0);

  constructor(scene: THREE.Scene, private readonly physics: Physics, spawn: THREE.Vector3, heading: number) {
    const world = physics.world;
    this.heading = heading;
    this.prevHeading = heading;
    this.curr.set(spawn.x, spawn.y + GROUND_OFFSET, spawn.z);
    this.prev.copy(this.curr);
    this.body = world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased()
        .setTranslation(this.curr.x, this.curr.y, this.curr.z)
        .setRotation(this.quat.setFromAxisAngle(this.up, heading)),
    );
    this.collider = world.createCollider(
      RAPIER.ColliderDesc.capsule(HALF_LEN, RADIUS).setRotation({ x: Math.SQRT1_2, y: 0, z: 0, w: Math.SQRT1_2 }),
      this.body,
    );
    // Horizontal collisions only; height comes from a ground ray (see fixedUpdate).
    this.controller = world.createCharacterController(SKIN);
    this.controller.setSlideEnabled(true);
    scene.add(this.model.root);
    this.render(1, 0);
  }

  /** Interpolated ground position of the bike visual. */
  get visualPosition(): THREE.Vector3 {
    return this.model.root.position;
  }

  get position(): THREE.Vector3 {
    return this.curr;
  }

  get kmh(): number {
    return Math.abs(this.speed) * 3.6;
  }

  seat(rig: CharacterRig) {
    this.model.riderMount.add(rig.root);
    rig.setPose('ride');
  }

  unseat(_rig: CharacterRig) {}

  exitPoints(): THREE.Vector3[] {
    const rx = -Math.cos(this.heading), rz = Math.sin(this.heading);
    const base = this.model.root.position;
    const at = (side: number) => new THREE.Vector3(base.x + rx * side, base.y + 0.05, base.z + rz * side);
    return [at(-1.0), at(1.0)]; // step off on the left, else the right
  }

  fixedUpdate(dt: number, input: Input | null) {
    this.prev.copy(this.curr);
    this.prevHeading = this.heading;
    this.impact = Math.max(0, this.impact - dt * 2.5);

    const idle = !input && Math.abs(this.speed) < 0.05 && this.grounded;
    if (idle) {
      this.speed = 0;
      this.lean = damp(this.lean, 0, 6, dt);
      this.steer = damp(this.steer, 0, 6, dt);
      return;
    }

    const throttle = input ? input.axis(['KeyS', 'ArrowDown'], ['KeyW', 'ArrowUp']) : 0;
    const steerIn = input ? input.axis(['KeyD', 'ArrowRight'], ['KeyA', 'ArrowLeft']) : 0;
    const handbrake = input ? input.down('Space') : false;
    this.throttle = throttle;

    // longitudinal
    const s = this.speed;
    if (throttle > 0) {
      if (s < -0.3) this.speed += BIKE.brake * dt;
      else this.speed += BIKE.accel * (1 - Math.pow(Math.max(s, 0) / BIKE.maxSpeed, 2)) * dt;
    } else if (throttle < 0) {
      if (s > 0.3) this.speed -= BIKE.brake * dt;
      else this.speed = Math.max(-BIKE.reverseMax, this.speed - BIKE.accel * 0.5 * dt);
    } else {
      const drag = (input ? BIKE.coastDrag : 6) + BIKE.airDrag * s * s;
      this.speed = Math.sign(s) * Math.max(0, Math.abs(s) - drag * dt);
    }
    if (handbrake) this.speed = Math.sign(this.speed) * Math.max(0, Math.abs(this.speed) - BIKE.handbrake * dt);

    // steering (bicycle model)
    this.steer = damp(this.steer, steerIn, BIKE.steerRate, dt);
    const t = clamp(Math.abs(this.speed) / BIKE.maxSpeed, 0, 1);
    const maxSteer = lerp(BIKE.maxSteerLow, BIKE.maxSteerHigh, Math.sqrt(t)) * (handbrake ? 1.6 : 1);
    const yawRate = (this.speed * Math.tan(this.steer * maxSteer)) / BIKE.wheelbase;
    this.heading += yawRate * dt;

    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    const desired = { x: fx * this.speed * dt, y: 0, z: fz * this.speed * dt };
    this.body.setNextKinematicRotation(this.quat.setFromAxisAngle(this.up, this.heading));
    this.controller.computeColliderMovement(this.collider, desired);
    const mv = this.controller.computedMovement();

    // collision response: only react to a real hit, not tiny slide losses
    const achieved = (mv.x * fx + mv.z * fz) / dt;
    if (Math.abs(achieved) < Math.abs(this.speed) * 0.8 - 0.2) {
      const loss = Math.abs(this.speed) - Math.abs(achieved);
      if (loss > 4) this.impact = Math.min(1, loss / 15);
      this.speed = achieved * 0.9;
    }
    this.curr.x += mv.x;
    this.curr.z += mv.z;

    // ride height from a ground ray (simple suspension)
    const origin = { x: this.curr.x, y: this.curr.y + 0.6, z: this.curr.z };
    const hit = this.physics.castRay(origin, DOWN, 4, (c) => c.parent() === null); // static world only
    const groundY = hit === null ? -100 : origin.y - hit;
    const targetY = groundY + GROUND_OFFSET;
    if (this.curr.y > targetY + 0.04) {
      this.vy -= BIKE.gravity * dt;
      this.curr.y = Math.max(targetY, this.curr.y + this.vy * dt);
      this.grounded = false;
    } else {
      this.vy = 0;
      this.curr.y = damp(this.curr.y, targetY, 25, dt);
      this.grounded = true;
    }
    this.body.setNextKinematicTranslation(this.curr);

    const leanTarget = -this.steer * clamp(Math.abs(this.speed) / 8, 0, 1) * BIKE.maxLean * Math.sign(this.speed || 1);
    this.lean = damp(this.lean, leanTarget, 7, dt);
    if (this.curr.y < -20) {
      this.curr.y = 2;
      this.prev.copy(this.curr);
      this.body.setTranslation(this.curr, true);
    }
  }

  render(alpha: number, dt: number) {
    const root = this.model.root;
    root.position.lerpVectors(this.prev, this.curr, alpha);
    root.position.y -= GROUND_OFFSET;
    root.rotation.y = lerpAngle(this.prevHeading, this.heading, alpha);
    this.model.update(dt, this.speed, this.steer, this.lean);
  }
}
