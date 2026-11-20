import * as THREE from 'three';
import type { RAPIER } from '../physics/Physics';
import type { Input } from '../engine/Input';
import type { CharacterView } from '../player/CharacterView';

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
  /** False while story-locked (e.g. the family car after it's seized in M1). */
  readonly available: boolean;
  teleport(pos: THREE.Vector3, heading: number): void;
  setAvailable(available: boolean): void;
  fixedUpdate(dt: number, input: Input | null): void;
  render(alpha: number, dt: number): void;
  seat(rig: CharacterView): void;
  unseat(rig: CharacterView): void;
  /** Candidate feet positions to step out to, in order of preference. */
  exitPoints(): THREE.Vector3[];
}
