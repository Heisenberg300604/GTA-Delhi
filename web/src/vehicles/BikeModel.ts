import * as THREE from 'three';
import { makeLabelTexture } from '../world/textures';

/**
 * Greybox "Vayu Spark 125" commuter bike with a TurboKart delivery box.
 * Origin at ground level between the wheels, facing +z.
 * Swap for a Blockbench/Blender GLB in Phase 3, keeping the same named groups.
 */
export class BikeModel {
  readonly root = new THREE.Group();
  /** Rotates around the forward axis for leaning. */
  readonly lean = new THREE.Group();
  readonly steer = new THREE.Group();
  readonly frontWheel = new THREE.Group();
  readonly rearWheel = new THREE.Group();
  /** Where the rider rig is attached. */
  readonly riderMount = new THREE.Group();
  readonly headlight: THREE.Mesh;

  constructor() {
    const mat = (c: string) => new THREE.MeshLambertMaterial({ color: c });
    const red = mat('#b3261e'), black = mat('#1c1c1c'), chrome = mat('#b9bec4'), seat = mat('#2a2522'), engine = mat('#4a4d52');
    const add = (parent: THREE.Object3D, geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, rx = 0) => {
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.set(x, y, z);
      mesh.rotation.x = rx;
      mesh.castShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const box = (sx: number, sy: number, sz: number) => new THREE.BoxGeometry(sx, sy, sz);

    this.root.add(this.lean);

    const wheel = (g: THREE.Group, z: number) => {
      g.position.set(0, 0.32, z);
      const tire = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.07, 8, 18), black);
      tire.rotation.y = Math.PI / 2;
      tire.castShadow = true;
      g.add(tire);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 12), chrome);
      rim.rotation.z = Math.PI / 2;
      g.add(rim);
      const spoke = new THREE.Mesh(box(0.07, 0.38, 0.05), engine);
      g.add(spoke);
    };
    wheel(this.rearWheel, -0.65);
    this.lean.add(this.rearWheel);

    this.steer.position.set(0, 0.95, 0.52);
    this.steer.rotation.x = -0.35; // rake
    this.lean.add(this.steer);
    // forks + handlebar live on the steering group
    add(this.steer, box(0.05, 0.75, 0.05), chrome, -0.09, -0.3, -0.04);
    add(this.steer, box(0.05, 0.75, 0.05), chrome, 0.09, -0.3, -0.04);
    add(this.steer, box(0.7, 0.04, 0.04), black, 0, 0.18, -0.04);
    this.headlight = add(this.steer, new THREE.CylinderGeometry(0.09, 0.09, 0.08, 12), new THREE.MeshBasicMaterial({ color: '#fff4cf' }), 0, 0.02, 0.14, Math.PI / 2);
    add(this.steer, box(0.24, 0.2, 0.1), red, 0, 0.02, 0.06); // headlight cowl
    this.frontWheel.position.set(0, -0.636, -0.094); // lands the wheel at y=0.32, z=0.65
    this.steer.add(this.frontWheel);
    // Front wheel counter-rotates the rake so it stays upright.
    this.frontWheel.rotation.x = 0.35;
    const fw = new THREE.Group();
    wheel(fw, 0);
    fw.position.set(0, 0, 0);
    this.frontWheel.add(fw);

    // body
    add(this.lean, box(0.12, 0.12, 1.1), red, 0, 0.72, 0.0, -0.18); // frame spine
    add(this.lean, box(0.3, 0.22, 0.45), red, 0, 0.92, 0.25); // tank
    add(this.lean, box(0.28, 0.1, 0.62), seat, 0, 0.88, -0.22); // seat
    add(this.lean, box(0.26, 0.3, 0.38), engine, 0, 0.48, 0.05); // engine
    add(this.lean, box(0.08, 0.08, 0.7), chrome, 0.18, 0.38, -0.35); // exhaust
    add(this.lean, box(0.28, 0.06, 0.5), red, 0, 0.66, -0.68); // rear mudguard
    add(this.lean, box(0.5, 0.04, 0.06), black, 0, 0.42, 0.0); // foot pegs
    add(this.lean, box(0.18, 0.06, 0.03), mat('#ff3b30'), 0, 0.82, -0.98); // tail light

    // TurboKart delivery box
    const label = makeLabelTexture('TURBO', '10 MIN ⚡ KART', '#2f7d32', '#f5ff9e');
    const boxMats = [
      new THREE.MeshLambertMaterial({ map: label }), new THREE.MeshLambertMaterial({ map: label }),
      mat('#2f7d32'), mat('#2f7d32'),
      new THREE.MeshLambertMaterial({ map: label }), new THREE.MeshLambertMaterial({ map: label }),
    ];
    const dbox = new THREE.Mesh(box(0.46, 0.44, 0.44), boxMats);
    dbox.position.set(0, 1.12, -0.72);
    dbox.castShadow = true;
    this.lean.add(dbox);
    add(this.lean, box(0.36, 0.04, 0.4), black, 0, 0.88, -0.72); // carrier

    this.riderMount.position.set(0, -0.1, -0.22);
    this.lean.add(this.riderMount);
  }

  update(dt: number, speed: number, steer: number, lean: number) {
    const spin = (speed * dt) / 0.33;
    this.rearWheel.rotation.x += spin;
    this.frontWheel.children[0].rotation.x += spin;
    this.steer.rotation.y = steer * 0.45;
    this.lean.rotation.z = lean;
  }
}
