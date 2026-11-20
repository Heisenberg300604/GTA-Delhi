import * as THREE from 'three';
import { RAPIER, Physics } from '../physics/Physics';
import { Input } from '../engine/Input';
import { CAR } from '../config';
import { clamp, damp, lerp, lerpAngle } from '../utils/math';
import { VehicleModel } from './VehicleModel';
import type { Drivable } from './Drivable';
import type { CharacterView } from '../player/CharacterView';

const H = CAR.half;
const GROUND_OFFSET = CAR.clearance + H.y;
const DOWN = { x: 0, y: -1, z: 0 };

/**
 * Arcade car: velocity with separate forward/lateral components, so lowering
 * lateral grip with the handbrake produces drifts. Same floating-collider +
 * ground-ray approach as the bike.
 */
export class CarController implements Drivable {
  readonly name = CAR.name;
  readonly kind = 'car' as const;
  readonly mountDistance = CAR.mountDistance;
  readonly exitMaxSpeed = CAR.exitMaxSpeed;
  readonly halfLength = H.z;
  readonly body: RAPIER.RigidBody;
  readonly collider: RAPIER.Collider;
  private model = new VehicleModel('hatch', CAR.color);
  available = true;
  locked = false;

  heading: number;
  speed = 0; // forward component, m/s
  impact = 0;
  throttle = 0;
  private lateral = 0;
  private steer = 0;
  private vy = 0;
  private roll = 0;
  private pitch = 0;
  private wheelSpin = 0;
  private controller: RAPIER.KinematicCharacterController;
  private prev = new THREE.Vector3();
  private curr = new THREE.Vector3();
  private prevHeading: number;
  private quat = new THREE.Quaternion();
  private up = new THREE.Vector3(0, 1, 0);

  constructor(scene: THREE.Scene, private readonly physics: Physics, spawn: THREE.Vector3, heading: number) {
    this.heading = this.prevHeading = heading;
    this.curr.set(spawn.x, spawn.y + GROUND_OFFSET, spawn.z);
    this.prev.copy(this.curr);
    const world = physics.world;
    this.body = world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased()
        .setTranslation(this.curr.x, this.curr.y, this.curr.z)
        .setRotation(this.quat.setFromAxisAngle(this.up, heading)),
    );
    this.collider = world.createCollider(RAPIER.ColliderDesc.cuboid(H.x, H.y, H.z), this.body);
    this.controller = world.createCharacterController(0.03);
    this.controller.setSlideEnabled(true);
    scene.add(this.model.root);
    this.render(1, 0);
  }

  get position() { return this.curr; }
  get visualPosition() { return this.model.root.position; }
  get kmh() { return Math.abs(this.speed) * 3.6; }

  teleport(pos: THREE.Vector3, heading: number) {
    this.curr.set(pos.x, pos.y + GROUND_OFFSET, pos.z);
    this.prev.copy(this.curr);
    this.heading = this.prevHeading = heading;
    this.speed = this.lateral = 0;
    this.body.setTranslation(this.curr, true);
    this.body.setRotation(this.quat.setFromAxisAngle(this.up, heading), true);
    this.render(1, 0);
  }

  setAvailable(available: boolean) {
    this.available = available;
    this.model.root.visible = available;
    this.collider.setEnabled(available);
  }

  seat(rig: CharacterView) {
    this.model.seat.add(rig.root);
    rig.setPose('ride');
    rig.root.visible = false; // cabin is opaque for now; driver shows once we have glass
  }

  unseat(rig: CharacterView) {
    rig.root.visible = true;
  }

  exitPoints(): THREE.Vector3[] {
    const rx = -Math.cos(this.heading), rz = Math.sin(this.heading);
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    const base = this.model.root.position;
    const at = (side: number, fwd: number) =>
      new THREE.Vector3(base.x + rx * side + fx * fwd, base.y + 0.05, base.z + rz * side + fz * fwd);
    return [at(1.6, 0.2), at(-1.6, 0.2), at(0, -3), at(0, 3)]; // driver side (right) first
  }

  fixedUpdate(dt: number, input: Input | null) {
    this.prev.copy(this.curr);
    this.prevHeading = this.heading;
    this.impact = Math.max(0, this.impact - dt * 2.5);
    if (!input && Math.abs(this.speed) < 0.05 && Math.abs(this.lateral) < 0.05) {
      this.speed = this.lateral = 0;
      this.steer = damp(this.steer, 0, 5, dt);
      return;
    }

    const throttle = input ? input.axis(['KeyS', 'ArrowDown'], ['KeyW', 'ArrowUp']) : 0;
    const steerIn = input ? input.axis(['KeyD', 'ArrowRight'], ['KeyA', 'ArrowLeft']) : 0;
    const handbrake = input ? input.down('Space') : false;
    this.throttle = throttle;
    const before = this.speed;

    const s = this.speed;
    if (throttle > 0) {
      if (s < -0.3) this.speed += CAR.brake * dt;
      else this.speed += CAR.accel * (1 - Math.pow(Math.max(s, 0) / CAR.maxSpeed, 2)) * dt;
    } else if (throttle < 0) {
      if (s > 0.3) this.speed -= CAR.brake * dt;
      else this.speed = Math.max(-CAR.reverseMax, this.speed - CAR.accel * 0.6 * dt);
    } else {
      const drag = (input ? CAR.coastDrag : 5) + CAR.airDrag * s * s;
      this.speed = Math.sign(s) * Math.max(0, Math.abs(s) - drag * dt);
    }
    if (handbrake) this.speed = Math.sign(this.speed) * Math.max(0, Math.abs(this.speed) - CAR.handbrake * dt);

    // steering + yaw
    this.steer = damp(this.steer, steerIn, CAR.steerRate, dt);
    const t = clamp(Math.abs(this.speed) / CAR.maxSpeed, 0, 1);
    const maxSteer = lerp(CAR.maxSteerLow, CAR.maxSteerHigh, Math.sqrt(t));
    let yawRate = (this.speed * Math.tan(this.steer * maxSteer)) / CAR.wheelbase;
    if (handbrake && Math.abs(this.speed) > 6) yawRate *= 1.45;
    // velocity keeps some of its old direction when grip is low → drift
    const oldHeading = this.heading;
    this.heading += yawRate * dt;
    const dh = this.heading - oldHeading;
    const grip = handbrake ? CAR.driftGrip : CAR.grip;
    // rotate the old velocity into the new frame: forward/lateral exchange
    const f = this.speed * Math.cos(dh) + this.lateral * Math.sin(dh);
    const l = -this.speed * Math.sin(dh) + this.lateral * Math.cos(dh);
    this.speed = f;
    this.lateral = l * Math.exp(-grip * dt);

    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    const rx = -Math.cos(this.heading), rz = Math.sin(this.heading);
    const vx = fx * this.speed + rx * this.lateral;
    const vz = fz * this.speed + rz * this.lateral;
    const desired = { x: vx * dt, y: 0, z: vz * dt };
    this.body.setNextKinematicRotation(this.quat.setFromAxisAngle(this.up, this.heading));
    this.controller.computeColliderMovement(this.collider, desired);
    const mv = this.controller.computedMovement();

    const want = Math.hypot(desired.x, desired.z);
    const got = Math.hypot(mv.x, mv.z);
    if (want > 1e-4 && got < want * 0.8 - 0.002) {
      const loss = (want - got) / dt;
      if (loss > 4) this.impact = Math.min(1, loss / 18);
      const gx = mv.x / dt, gz = mv.z / dt;
      this.speed = (gx * fx + gz * fz) * 0.8;
      this.lateral = (gx * rx + gz * rz) * 0.5;
    }
    this.curr.x += mv.x;
    this.curr.z += mv.z;

    const origin = { x: this.curr.x, y: this.curr.y + 0.6, z: this.curr.z };
    const hit = this.physics.castRay(origin, DOWN, 4, (c) => c.parent() === null);
    const targetY = (hit === null ? -100 : origin.y - hit) + GROUND_OFFSET;
    if (this.curr.y > targetY + 0.04) {
      this.vy -= 20 * dt;
      this.curr.y = Math.max(targetY, this.curr.y + this.vy * dt);
    } else {
      this.vy = 0;
      this.curr.y = damp(this.curr.y, targetY, 20, dt);
    }
    this.body.setNextKinematicTranslation(this.curr);

    // visual body motion
    const longAccel = (this.speed - before) / dt;
    this.pitch = damp(this.pitch, clamp(-longAccel * 0.006, -0.06, 0.06), 6, dt);
    this.roll = damp(this.roll, clamp(yawRate * this.speed * 0.008, -0.08, 0.08), 6, dt);
    this.wheelSpin += (this.speed * dt) / 0.31;
  }

  render(alpha: number, _dt: number) {
    const root = this.model.root;
    root.position.lerpVectors(this.prev, this.curr, alpha);
    root.position.y -= GROUND_OFFSET;
    root.rotation.y = lerpAngle(this.prevHeading, this.heading, alpha);
    this.model.body.rotation.set(this.pitch, 0, this.roll);
    for (const w of this.model.wheels) {
      w.spin.rotation.x = this.wheelSpin;
      w.pivot.rotation.y = w.front ? this.steer * 0.5 : 0;
    }
  }
}
