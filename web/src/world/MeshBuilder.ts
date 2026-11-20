import * as THREE from 'three';

type V3 = [number, number, number];

/**
 * Accumulates quads into one BufferGeometry (with vertex colours) so an entire
 * category of static geometry renders in a single draw call.
 */
export class MeshBuilder {
  private positions: number[] = [];
  private normals: number[] = [];
  private uvs: number[] = [];
  private colors: number[] = [];
  private indices: number[] = [];
  private count = 0;

  /** a=bottom-left, b=bottom-right, c=top-right, d=top-left as seen from the front. */
  quad(a: V3, b: V3, c: V3, d: V3, uv: [number, number, number, number], color: THREE.Color) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny /= len; nz /= len;
    const [u0, v0, u1, v1] = uv;
    for (const p of [a, b, c, d]) {
      this.positions.push(p[0], p[1], p[2]);
      this.normals.push(nx, ny, nz);
      this.colors.push(color.r, color.g, color.b);
    }
    this.uvs.push(u0, v0, u1, v0, u1, v1, u0, v1);
    const i = this.count;
    this.indices.push(i, i + 1, i + 2, i, i + 2, i + 3);
    this.count += 4;
  }

  /** Vertical wall from (x0,z0) to (x1,z1); outward normal is (end-start) × up. */
  wall(x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, uv: [number, number, number, number], color: THREE.Color) {
    this.quad([x0, y0, z0], [x1, y0, z1], [x1, y1, z1], [x0, y1, z0], uv, color);
  }

  /** Upward-facing rectangle at height y. UVs are world-scaled by uvScale. */
  floor(x0: number, z0: number, x1: number, z1: number, y: number, color: THREE.Color, uvScale = 1) {
    this.quad(
      [x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0],
      [x0 * uvScale, z1 * uvScale, x1 * uvScale, z0 * uvScale],
      color,
    );
  }

  /** Axis-aligned (optionally yawed) box. Bottom face omitted by default. */
  box(cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, yaw: number, color: THREE.Color, bottom = false) {
    const hx = sx / 2, hy = sy / 2, hz = sz / 2;
    const cos = Math.cos(yaw), sin = Math.sin(yaw);
    const t = (x: number, y: number, z: number): V3 => [cx + x * cos + z * sin, cy + y, cz - x * sin + z * cos];
    const uv: [number, number, number, number] = [0, 0, 1, 1];
    this.quad(t(-hx, -hy, hz), t(hx, -hy, hz), t(hx, hy, hz), t(-hx, hy, hz), uv, color);
    this.quad(t(hx, -hy, -hz), t(-hx, -hy, -hz), t(-hx, hy, -hz), t(hx, hy, -hz), uv, color);
    this.quad(t(hx, -hy, hz), t(hx, -hy, -hz), t(hx, hy, -hz), t(hx, hy, hz), uv, color);
    this.quad(t(-hx, -hy, -hz), t(-hx, -hy, hz), t(-hx, hy, hz), t(-hx, hy, -hz), uv, color);
    this.quad(t(-hx, hy, hz), t(hx, hy, hz), t(hx, hy, -hz), t(-hx, hy, -hz), uv, color);
    if (bottom) this.quad(t(-hx, -hy, -hz), t(hx, -hy, -hz), t(hx, -hy, hz), t(-hx, -hy, hz), uv, color);
  }

  get isEmpty() {
    return this.count === 0;
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    g.setIndex(this.indices);
    g.computeBoundingSphere();
    return g;
  }
}

/**
 * Collects transforms + colours for a single InstancedMesh (one draw call for
 * thousands of small props: AC units, balconies, parapets, poles...).
 */
export class InstanceBatch {
  private matrices: THREE.Matrix4[] = [];
  private colors: THREE.Color[] = [];
  private static q = new THREE.Quaternion();
  private static e = new THREE.Euler(0, 0, 0, 'YXZ');

  add(x: number, y: number, z: number, sx: number, sy: number, sz: number, color: THREE.Color, yaw = 0, tilt = 0) {
    InstanceBatch.e.set(tilt, yaw, 0, 'YXZ');
    InstanceBatch.q.setFromEuler(InstanceBatch.e);
    this.matrices.push(
      new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), InstanceBatch.q.clone(), new THREE.Vector3(sx, sy, sz)),
    );
    this.colors.push(color);
  }

  build(geometry: THREE.BufferGeometry, material: THREE.Material, shadows = true): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, this.matrices.length));
    mesh.count = this.matrices.length;
    this.matrices.forEach((m, i) => {
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, this.colors[i]);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = shadows;
    mesh.receiveShadow = shadows;
    mesh.computeBoundingSphere();
    return mesh;
  }
}
