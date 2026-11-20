import * as THREE from 'three';
import { RAPIER, Physics } from '../physics/Physics';
import { Input } from '../engine/Input';
import { PLAYER } from '../config';
import { dampAngle, damp } from '../utils/math';
import { CharacterRig } from './CharacterRig';

const CAPSULE_CENTER = PLAYER.halfHeight + PLAYER.radius; // feet → capsule centre

/** On-foot movement using Rapier's kinematic character controller. */
export class PlayerController {
  readonly body: RAPIER.RigidBody;
  readonly collider: RAPIER.Collider;
  readonly rig = new CharacterRig();
  /** Visual root (feet position), interpolated between physics ticks. */
  readonly root = new THREE.Group();

  facing = 0;
  grounded = true;
  active = true;
  horizontalSpeed = 0;

  private controller: RAPIER.KinematicCharacterController;
  private vel = new THREE.Vector3();
  private prev = new THREE.Vector3();
  private curr = new THREE.Vector3();
  private wish = new THREE.Vector3();

  constructor(scene: THREE.Scene, physics: Physics, spawn: THREE.Vector3, facing: number) {
    const world = physics.world;
    this.body = world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(spawn.x, spawn.y + CAPSULE_CENTER, spawn.z),
    );
    this.collider = world.createCollider(RAPIER.ColliderDesc.capsule(PLAYER.halfHeight, PLAYER.radius), this.body);
    this.controller = world.createCharacterController(0.02);
    this.controller.enableAutostep(PLAYER.stepHeight, 0.2, true);
    this.controller.enableSnapToGround(0.3);
    this.controller.setMaxSlopeClimbAngle((50 * Math.PI) / 180);
    this.controller.setApplyImpulsesToDynamicBodies(true);

    this.curr.set(spawn.x, spawn.y + CAPSULE_CENTER, spawn.z);
    this.prev.copy(this.curr);
    this.facing = facing;
    this.root.add(this.rig.root);
    scene.add(this.root);
  }

  get position(): THREE.Vector3 {
    return this.curr;
  }

  /** Feet position of the interpolated visual. */
  get visualPosition(): THREE.Vector3 {
    return this.root.position;
  }

  /** Enable/disable on-foot simulation (disabled while riding). */
  setActive(active: boolean) {
    this.active = active;
    this.collider.setEnabled(active);
    if (active) this.rig.setPose('ground');
  }

  teleport(feet: THREE.Vector3, facing: number) {
    this.curr.set(feet.x, feet.y + CAPSULE_CENTER, feet.z);
    this.prev.copy(this.curr);
    this.body.setTranslation(this.curr, true);
    this.body.setNextKinematicTranslation(this.curr);
    this.vel.set(0, 0, 0);
    this.facing = facing;
  }

  fixedUpdate(dt: number, input: Input, cameraYaw: number) {
    this.prev.copy(this.curr);
    if (!this.active) return;

    const ix = input.axis(['KeyA', 'ArrowLeft'], ['KeyD', 'ArrowRight']);
    const iy = input.axis(['KeyS', 'ArrowDown'], ['KeyW', 'ArrowUp']);
    // camera-relative directions: forward = (-sin yaw, -cos yaw), right = (cos yaw, -sin yaw)
    const fx = -Math.sin(cameraYaw), fz = -Math.cos(cameraYaw);
    this.wish.set(fx * iy + Math.cos(cameraYaw) * ix, 0, fz * iy - Math.sin(cameraYaw) * ix);
    if (this.wish.lengthSq() > 1) this.wish.normalize();

    const running = input.down('ShiftLeft') || input.down('ShiftRight');
    const target = running ? PLAYER.runSpeed : PLAYER.walkSpeed;
    const accel = this.grounded ? PLAYER.groundAccel : PLAYER.airAccel;
    this.vel.x = damp(this.vel.x, this.wish.x * target, accel / target, dt);
    this.vel.z = damp(this.vel.z, this.wish.z * target, accel / target, dt);

    if (input.consume('Space') && this.grounded) this.vel.y = PLAYER.jumpSpeed;
    this.vel.y -= PLAYER.gravity * dt;
    if (this.grounded && this.vel.y < 0) this.vel.y = -2;

    const desired = { x: this.vel.x * dt, y: this.vel.y * dt, z: this.vel.z * dt };
    this.controller.computeColliderMovement(this.collider, desired);
    const mv = this.controller.computedMovement();
    this.grounded = this.controller.computedGrounded();
    if (this.vel.y > 0 && mv.y < desired.y * 0.5) this.vel.y = 0; // bonked a ceiling

    this.curr.set(this.curr.x + mv.x, this.curr.y + mv.y, this.curr.z + mv.z);
    this.body.setNextKinematicTranslation(this.curr);

    this.horizontalSpeed = Math.hypot(mv.x, mv.z) / dt;
    if (this.wish.lengthSq() > 0.01) {
      this.facing = dampAngle(this.facing, Math.atan2(this.wish.x, this.wish.z), PLAYER.turnSpeed, dt);
    }
    // safety net: fell through the world
    if (this.curr.y < -20) this.teleport(new THREE.Vector3(this.curr.x, 2, this.curr.z), this.facing);
  }

  /** Interpolate the visual between physics states and animate. */
  render(alpha: number, dt: number) {
    if (!this.active) return;
    this.root.position.lerpVectors(this.prev, this.curr, alpha);
    this.root.position.y -= CAPSULE_CENTER;
    this.root.rotation.y = this.facing;
    this.rig.setPose(this.grounded ? 'ground' : 'air');
    this.rig.update(dt, this.horizontalSpeed);
  }
}
