import * as THREE from 'three';
import type { Physics } from '../physics/Physics';
import { ROADS, KERB, type Road } from './cityLayout';
import { Rng } from '../utils/random';

export type Light = 'green' | 'yellow' | 'red';

interface Junction {
  xRoad: Road; // runs along x
  zRoad: Road; // runs along z
  cx: number;
  cz: number;
  offset: number;
  heads: { axis: 'x' | 'z'; lamp: number }[];
}

// 32 s cycle, with a 1 s all-red between phases
const CYCLE = 32;
const X_GREEN = 12, X_YELLOW = 15;
const Z_START = 16, Z_GREEN = 28, Z_YELLOW = 31;

const ON = { red: new THREE.Color('#ff2a1a'), yellow: new THREE.Color('#ffc21a'), green: new THREE.Color('#2aff6a') };
const OFF = { red: new THREE.Color('#3a0f0c'), yellow: new THREE.Color('#3a300c'), green: new THREE.Color('#0c3a18') };

/**
 * Signals at junctions on the big roads (those with a median). Small lanes
 * stay unsignalled — that's Delhi. AI traffic queries lightFor(); the player
 * crossing on red fires onRunRed (missions use it; Heat will later).
 */
export class TrafficSignals {
  private junctions: Junction[] = [];
  private time = 0;
  private lamps: THREE.InstancedMesh;
  private inside = new Set<Junction>();
  private listeners = new Set<() => void>();

  constructor(scene: THREE.Scene, physics: Physics) {
    const rng = new Rng(31);
    const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.11, 1, 6), new THREE.MeshLambertMaterial({ color: '#4a4d52' }), 64);
    const housings = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: '#1c1c1c' }), 64);
    const lampCount = 64 * 3;
    this.lamps = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial(), lampCount);
    let p = 0, l = 0;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);

    for (const xRoad of ROADS.filter((r) => r.axis === 'x')) {
      for (const zRoad of ROADS.filter((r) => r.axis === 'z')) {
        if (!xRoad.median && !zRoad.median) continue;
        const j: Junction = { xRoad, zRoad, cx: zRoad.center, cz: xRoad.center, offset: rng.float(0, CYCLE), heads: [] };
        const hx = zRoad.width / 2 + 0.6, hz = xRoad.width / 2 + 0.6;
        // one head per approach, on the far-left corner, facing the approaching driver
        const approaches: { x: number; z: number; face: number; axis: 'x' | 'z' }[] = [
          { x: j.cx + hx, z: j.cz - hz, face: -Math.PI / 2, axis: 'x' }, // eastbound traffic looks at this
          { x: j.cx - hx, z: j.cz + hz, face: Math.PI / 2, axis: 'x' }, // westbound
          { x: j.cx + hx, z: j.cz + hz, face: Math.PI, axis: 'z' }, // northbound (+z)
          { x: j.cx - hx, z: j.cz - hz, face: 0, axis: 'z' }, // southbound (-z)
        ];
        for (const a of approaches) {
          m.compose(new THREE.Vector3(a.x, KERB + 2.0, a.z), q.identity(), new THREE.Vector3(1, 4, 1));
          poles.setMatrixAt(p, m);
          q.setFromAxisAngle(up, a.face);
          m.compose(new THREE.Vector3(a.x, KERB + 3.7, a.z), q, new THREE.Vector3(0.36, 1.05, 0.28));
          housings.setMatrixAt(p, m);
          p++;
          physics.addStaticCylinder(a.x, KERB + 2, a.z, 2, 0.12);
          const front = new THREE.Vector3(0, 0, 0.16).applyQuaternion(q);
          j.heads.push({ axis: a.axis, lamp: l });
          for (let k = 0; k < 3; k++) {
            m.compose(new THREE.Vector3(a.x + front.x, KERB + 4.02 - k * 0.32, a.z + front.z), q, new THREE.Vector3(0.2, 0.2, 0.06));
            this.lamps.setMatrixAt(l + k, m);
          }
          l += 3;
        }
        this.junctions.push(j);
      }
    }
    for (const mesh of [poles, housings, this.lamps]) {
      mesh.count = mesh === this.lamps ? l : p;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = mesh !== this.lamps;
      scene.add(mesh);
    }
    this.paint();
  }

  /** Subscribe to "player ran a red light"; returns an unsubscribe function. */
  onRunRed(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  light(j: Junction, axis: 'x' | 'z'): Light {
    const t = (this.time + j.offset) % CYCLE;
    if (axis === 'x') return t < X_GREEN ? 'green' : t < X_YELLOW ? 'yellow' : 'red';
    return t >= Z_START && t < Z_GREEN ? 'green' : t >= Z_GREEN && t < Z_YELLOW ? 'yellow' : 'red';
  }

  /** Light facing traffic travelling along `road` towards its junction with `cross`; null if unsignalled. */
  lightFor(road: Road, cross: Road): Light | null {
    const j = this.junctions.find((jj) => (jj.xRoad === road && jj.zRoad === cross) || (jj.zRoad === road && jj.xRoad === cross));
    return j ? this.light(j, road.axis) : null;
  }

  update(dt: number, player: { x: number; z: number; heading: number; speed: number; driving: boolean }) {
    this.time += dt;
    this.paint();
    for (const j of this.junctions) {
      const inBox = Math.abs(player.x - j.cx) < j.zRoad.width / 2 && Math.abs(player.z - j.cz) < j.xRoad.width / 2;
      const was = this.inside.has(j);
      if (inBox && !was) {
        this.inside.add(j);
        const axis = Math.abs(Math.sin(player.heading)) > Math.abs(Math.cos(player.heading)) ? 'x' : 'z';
        if (player.driving && Math.abs(player.speed) > 2 && this.light(j, axis) === 'red') {
          for (const fn of this.listeners) fn();
        }
      } else if (!inBox && was) {
        this.inside.delete(j);
      }
    }
  }

  private paint() {
    for (const j of this.junctions) {
      for (const h of j.heads) {
        const s = this.light(j, h.axis);
        this.lamps.setColorAt(h.lamp, s === 'red' ? ON.red : OFF.red);
        this.lamps.setColorAt(h.lamp + 1, s === 'yellow' ? ON.yellow : OFF.yellow);
        this.lamps.setColorAt(h.lamp + 2, s === 'green' ? ON.green : OFF.green);
      }
    }
    if (this.lamps.instanceColor) this.lamps.instanceColor.needsUpdate = true;
  }
}
