import type * as THREE from 'three';

export type Pose = 'ground' | 'air' | 'ride';

/** What controllers and vehicles need from a character visual (blocky rig or skinned GLB). */
export interface CharacterView {
  readonly root: THREE.Group;
  setPose(pose: Pose): void;
  /** speed: horizontal m/s */
  update(dt: number, speed: number): void;
  /** One-shot action (melee). Optional for placeholder rigs. */
  punch?(): void;
}
