import * as THREE from 'three';
import { clamp, damp } from '../utils/math';

export interface RigLook {
  skin: string;
  hair: string;
  top: string;
  topAccent: string;
  legs: string;
  shoes: string;
}

/** Aryan's placeholder look: TurboKart rider jacket, jeans, white sneakers. */
export const ARYAN_LOOK: RigLook = {
  skin: '#8a5a3c',
  hair: '#15100c',
  top: '#2f7d32',
  topAccent: '#f5ff9e',
  legs: '#2b3a55',
  shoes: '#ececec',
};

type Pose = 'ground' | 'air' | 'ride';

/**
 * Blocky placeholder humanoid with procedural animation. It uses the same joint
 * layout as a Mixamo skeleton, so a skinned GLB can replace it in Phase 3
 * without touching the controllers.
 */
export class CharacterRig {
  readonly root = new THREE.Group();
  private hips = new THREE.Group();
  private torso = new THREE.Group();
  private head = new THREE.Group();
  private legL: THREE.Group; private legR: THREE.Group;
  private kneeL: THREE.Group; private kneeR: THREE.Group;
  private armL: THREE.Group; private armR: THREE.Group;
  private elbowL: THREE.Group; private elbowR: THREE.Group;
  private phase = 0;
  private pose: Pose = 'ground';

  constructor(look: RigLook = ARYAN_LOOK) {
    const mat = (c: string) => new THREE.MeshLambertMaterial({ color: c });
    const box = (sx: number, sy: number, sz: number, m: THREE.Material, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m);
      mesh.position.set(0, y, z);
      mesh.castShadow = true;
      return mesh;
    };
    const skin = mat(look.skin), top = mat(look.top), legs = mat(look.legs), shoes = mat(look.shoes);

    this.root.add(this.hips);
    this.hips.position.y = 0.95;
    this.hips.add(box(0.36, 0.16, 0.22, legs, 0.02));

    this.hips.add(this.torso);
    this.torso.add(box(0.44, 0.56, 0.25, top, 0.32));
    this.torso.add(box(0.06, 0.4, 0.02, mat(look.topAccent), 0.32, 0.13)); // zip stripe
    this.torso.add(box(0.12, 0.08, 0.12, skin, 0.64)); // neck

    this.torso.add(this.head);
    this.head.position.y = 0.8;
    this.head.add(box(0.24, 0.27, 0.25, skin));
    this.head.add(box(0.26, 0.09, 0.27, mat(look.hair), 0.13, -0.01));
    this.head.add(box(0.26, 0.2, 0.06, mat(look.hair), 0.02, -0.11));
    const eyes = mat('#1a1a1a');
    for (const x of [-0.06, 0.06]) {
      const e = box(0.04, 0.03, 0.02, eyes, 0.02, 0.13);
      e.position.x = x;
      this.head.add(e);
    }

    const limb = (x: number, y: number, parent: THREE.Object3D) => {
      const g = new THREE.Group();
      g.position.set(x, y, 0);
      parent.add(g);
      return g;
    };
    // legs
    this.legL = limb(-0.1, 0, this.hips);
    this.legR = limb(0.1, 0, this.hips);
    for (const leg of [this.legL, this.legR]) leg.add(box(0.15, 0.46, 0.17, legs, -0.23));
    this.kneeL = limb(0, -0.46, this.legL);
    this.kneeR = limb(0, -0.46, this.legR);
    for (const knee of [this.kneeL, this.kneeR]) {
      knee.add(box(0.13, 0.44, 0.15, legs, -0.22));
      knee.add(box(0.14, 0.08, 0.27, shoes, -0.45, 0.05));
    }
    // arms
    this.armL = limb(-0.28, 0.56, this.torso);
    this.armR = limb(0.28, 0.56, this.torso);
    for (const arm of [this.armL, this.armR]) arm.add(box(0.12, 0.3, 0.13, top, -0.15));
    this.elbowL = limb(0, -0.3, this.armL);
    this.elbowR = limb(0, -0.3, this.armR);
    for (const el of [this.elbowL, this.elbowR]) {
      el.add(box(0.1, 0.26, 0.11, skin, -0.13));
      el.add(box(0.1, 0.1, 0.1, skin, -0.3));
    }
  }

  setPose(pose: Pose) {
    this.pose = pose;
  }

  /** speed: horizontal m/s. */
  update(dt: number, speed: number) {
    const k = 16;
    const set = (g: THREE.Object3D, x: number, z = 0) => {
      g.rotation.x = damp(g.rotation.x, x, k, dt);
      g.rotation.z = damp(g.rotation.z, z, k, dt);
    };

    if (this.pose === 'ride') {
      this.hips.position.y = damp(this.hips.position.y, 0.95, k, dt);
      set(this.torso, 0.28);
      set(this.legL, -1.3, -0.12); set(this.legR, -1.3, 0.12);
      set(this.kneeL, 1.45); set(this.kneeR, 1.45);
      set(this.armL, -1.05, 0.12); set(this.armR, -1.05, -0.12);
      set(this.elbowL, -0.35); set(this.elbowR, -0.35);
      set(this.head, -0.2);
      return;
    }

    if (this.pose === 'air') {
      set(this.torso, 0.1);
      set(this.legL, -0.6); set(this.legR, 0.15);
      set(this.kneeL, 0.9); set(this.kneeR, 0.5);
      set(this.armL, -0.5, -0.5); set(this.armR, 0.3, 0.5);
      set(this.elbowL, -0.6); set(this.elbowR, -0.4);
      set(this.head, 0);
      return;
    }

    const moving = speed > 0.15;
    const freq = moving ? 4 + speed * 1.4 : 0;
    this.phase += dt * freq;
    const run = clamp((speed - 2.6) / 4, 0, 1);
    const amp = moving ? 0.35 + 0.45 * clamp(speed / 6.6, 0, 1) : 0;
    const s = Math.sin(this.phase);
    const c = Math.cos(this.phase);

    this.hips.position.y = 0.95 + (moving ? Math.abs(c) * 0.05 * (0.5 + run) - 0.02 * run : Math.sin(performance.now() * 0.002) * 0.005);
    set(this.torso, 0.05 + run * 0.18);
    set(this.legL, s * amp);
    set(this.legR, -s * amp);
    set(this.kneeL, Math.max(0, -c) * amp * 1.6 + 0.05);
    set(this.kneeR, Math.max(0, c) * amp * 1.6 + 0.05);
    set(this.armL, -s * amp * 0.9, 0.06);
    set(this.armR, s * amp * 0.9, -0.06);
    set(this.elbowL, -0.25 - run * 0.9);
    set(this.elbowR, -0.25 - run * 0.9);
    set(this.head, -run * 0.1);
  }
}
