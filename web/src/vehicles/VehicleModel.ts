import * as THREE from 'three';
import { VEHICLE_TYPES, type VehicleKind } from './vehicleTypes';

/**
 * Mesh-based vehicle visual (player car, cutscene props). Traffic uses the
 * instanced path instead. Facing +Z, origin on the ground.
 */
export class VehicleModel {
  readonly root = new THREE.Group();
  readonly body = new THREE.Group();
  readonly wheels: { pivot: THREE.Group; spin: THREE.Group; front: boolean }[] = [];
  readonly seat = new THREE.Group();
  private spinAngle = 0;

  constructor(kind: VehicleKind, color: string) {
    const type = VEHICLE_TYPES[kind];
    const mats = {
      body: new THREE.MeshLambertMaterial({ color }),
      roof: new THREE.MeshLambertMaterial({ color: type.roofColor ?? color }),
      cabin: new THREE.MeshLambertMaterial({ color: type.cabinColor }),
      headlight: new THREE.MeshBasicMaterial({ color: '#fff6d8' }),
      taillight: new THREE.MeshBasicMaterial({ color: '#d32f2f' }),
    };
    this.root.add(this.body);
    const tire = new THREE.MeshLambertMaterial({ color: '#161616' });
    const rim = new THREE.MeshLambertMaterial({ color: '#b9bec4' });
    for (const p of type.parts) {
      if (p.sx === 0) continue;
      if (p.part === 'wheel') {
        const pivot = new THREE.Group();
        pivot.position.set(p.x, p.y, p.z);
        const spin = new THREE.Group();
        pivot.add(spin);
        const t = new THREE.Mesh(new THREE.CylinderGeometry(p.sy / 2, p.sy / 2, p.sx, 14).rotateZ(Math.PI / 2), tire);
        const r = new THREE.Mesh(new THREE.CylinderGeometry(p.sy / 3.2, p.sy / 3.2, p.sx + 0.02, 8).rotateZ(Math.PI / 2), rim);
        t.castShadow = true;
        spin.add(t, r);
        this.root.add(pivot);
        this.wheels.push({ pivot, spin, front: p.z > 0 });
        continue;
      }
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(p.sx, p.sy, p.sz), mats[p.part]);
      mesh.position.set(p.x, p.y, p.z);
      mesh.castShadow = p.part === 'body' || p.part === 'cabin';
      this.body.add(mesh);
    }
    if (kind === 'hatch' || kind === 'sedan') {
      const dark = new THREE.MeshLambertMaterial({ color: '#2a2a2a' });
      const plate = new THREE.MeshLambertMaterial({ color: '#f4f4f4' });
      const half = type.half.z + 0.05;
      for (const z of [half, -half]) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(type.half.x * 2 + 0.04, 0.18, 0.12), dark);
        b.position.set(0, 0.36, z);
        const pl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.02), plate);
        pl.position.set(0, 0.5, z + Math.sign(z) * 0.07);
        this.body.add(b, pl);
      }
    }
    this.seat.position.set(-0.38, 0.1, -0.1); // right-hand drive
    this.body.add(this.seat);
  }

  /** For scripted (cutscene) movement: spin wheels by distance travelled. */
  roll(distance: number, steer = 0) {
    this.spinAngle += distance / 0.31;
    for (const w of this.wheels) {
      w.spin.rotation.x = this.spinAngle;
      w.pivot.rotation.y = w.front ? steer * 0.5 : 0;
    }
  }
}
