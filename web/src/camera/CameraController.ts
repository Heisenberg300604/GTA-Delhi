import * as THREE from 'three';
import { CAMERA } from '../config';
import { Input } from '../engine/Input';
import { Physics, RAPIER } from '../physics/Physics';
import { clamp, damp, dampAngle } from '../utils/math';

export interface CameraTarget {
  position: THREE.Vector3; // ground position of the followed thing
  mode: 'foot' | 'bike' | 'car';
  heading?: number;
  speed?: number;
  shake?: number;
}

/** Third-person orbit camera with wall avoidance, speed FOV and auto-align behind vehicles. */
export class CameraController {
  yaw: number;
  pitch = 0.22;
  private focus = new THREE.Vector3();
  private distance = CAMERA.distanceFoot;
  private idle = 0;
  private dir = new THREE.Vector3();
  private initialised = false;
  /** Cutscene shot; when set, the camera ignores the player. */
  private shot: { from: THREE.Vector3; to: THREE.Vector3; lookFrom: THREE.Vector3; lookTo: THREE.Vector3; t: number; duration: number; fov: number } | null = null;
  private look = new THREE.Vector3();

  /** Cut (duration 0) or glide to a camera position looking at a point. */
  setShot(pos: THREE.Vector3, lookAt: THREE.Vector3, duration = 0, fov: number = CAMERA.fov) {
    const from = duration > 0 && this.shot ? this.camera.position.clone() : pos.clone();
    const lookFrom = duration > 0 && this.shot ? this.look.clone() : lookAt.clone();
    this.shot = { from, to: pos.clone(), lookFrom, lookTo: lookAt.clone(), t: 0, duration, fov };
  }

  get shotDone(): boolean {
    return !this.shot || this.shot.t >= this.shot.duration;
  }

  /** Return to the gameplay camera, placed behind the given heading. */
  clearShot(behindHeading?: number) {
    this.shot = null;
    this.initialised = false;
    if (behindHeading !== undefined) this.yaw = behindHeading + Math.PI;
  }

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly physics: Physics,
    yaw: number,
    private readonly ignore: () => RAPIER.Collider[],
  ) {
    this.yaw = yaw;
  }

  update(dt: number, input: Input, target: CameraTarget) {
    if (this.shot) {
      const s = this.shot;
      s.t = Math.min(s.duration, s.t + dt);
      const k = s.duration > 0 ? s.t / s.duration : 1;
      const e = k * k * (3 - 2 * k); // smoothstep
      this.camera.position.lerpVectors(s.from, s.to, e);
      this.look.lerpVectors(s.lookFrom, s.lookTo, e);
      this.camera.lookAt(this.look);
      if (this.camera.fov !== s.fov) {
        this.camera.fov = s.fov;
        this.camera.updateProjectionMatrix();
      }
      return;
    }
    const moved = input.mouseDX !== 0 || input.mouseDY !== 0;
    this.yaw -= input.mouseDX * CAMERA.sensitivity;
    this.pitch = clamp(this.pitch + input.mouseDY * CAMERA.sensitivity, CAMERA.minPitch, CAMERA.maxPitch);
    this.idle = moved ? 0 : this.idle + dt;

    const onBike = target.mode !== 'foot'; // any vehicle
    const inCar = target.mode === 'car';
    const speed = Math.abs(target.speed ?? 0);
    if (onBike && target.heading !== undefined && this.idle > CAMERA.autoAlignDelay && speed > 2) {
      const strength = clamp(speed / 10, 0.4, 1) * 2.5;
      this.yaw = dampAngle(this.yaw, target.heading + Math.PI, strength, dt);
      this.pitch = damp(this.pitch, 0.16, 1.5, dt);
    }

    const height = inCar ? CAMERA.heightCar : onBike ? CAMERA.heightBike : CAMERA.heightFoot;
    const goal = new THREE.Vector3(target.position.x, target.position.y + height, target.position.z);
    if (!this.initialised) {
      this.focus.copy(goal);
      this.initialised = true;
    } else {
      this.focus.x = damp(this.focus.x, goal.x, 25, dt);
      this.focus.z = damp(this.focus.z, goal.z, 25, dt);
      this.focus.y = damp(this.focus.y, goal.y, 12, dt);
    }

    const want = (inCar ? CAMERA.distanceCar : onBike ? CAMERA.distanceBike : CAMERA.distanceFoot) + (onBike ? speed * 0.05 : 0);
    const cp = Math.cos(this.pitch);
    this.dir.set(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp);

    const ignored = this.ignore();
    const hit = this.physics.castRay(
      this.focus, this.dir, want + 0.3,
      (c) => !ignored.includes(c) && !(c.parent()?.isKinematic() ?? false),
    );
    const allowed = hit === null ? want : Math.max(0.8, hit - 0.3);
    this.distance = allowed < this.distance ? allowed : damp(this.distance, allowed, 3, dt);

    this.camera.position.copy(this.focus).addScaledVector(this.dir, this.distance);
    if (target.shake && target.shake > 0) {
      const s = target.shake * 0.25;
      this.camera.position.x += (Math.random() - 0.5) * s;
      this.camera.position.y += (Math.random() - 0.5) * s;
    }
    this.camera.lookAt(this.focus);

    const fov = CAMERA.fov + (onBike ? clamp(speed / 28, 0, 1) * CAMERA.fovBoost : 0);
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov = damp(this.camera.fov, fov, 4, dt);
      this.camera.updateProjectionMatrix();
    }
  }

  get focusPoint(): THREE.Vector3 {
    return this.focus;
  }
}
