import * as THREE from 'three';
import type { RAPIER } from '../physics/Physics';
import type { Input } from '../engine/Input';
import type { CharacterRig } from '../player/CharacterRig';

/** Anything the player can get into. The game state machine only talks to this. */
export interface Drivable {
  readonly name: string;
  readonly kind: 'bike' | 'car';
  readonly collider: RAPIER.Collider;
  readonly mountDistance: number;
  readonly exitMaxSpeed: number;
  /** Physics-state position (collider centre). */
  readonly position: THREE.Vector3;
  /** Interpolated ground-level position of the visual. */
  readonly visualPosition: THREE.Vector3;
  readonly heading: number;
  readonly speed: number;
  readonly kmh: number;
  readonly impact: number;
  readonly throttle: number;
  readonly halfLength: number;
  fixedUpdate(dt: number, input: Input | null): void;
  render(alpha: number, dt: number): void;
  seat(rig: CharacterRig): void;
  unseat(rig: CharacterRig): void;
  /** Candidate feet positions to step out to, in order of preference. */
  exitPoints(): THREE.Vector3[];
}
