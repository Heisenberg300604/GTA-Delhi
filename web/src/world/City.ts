import * as THREE from 'three';
import { Physics } from '../physics/Physics';
import { Rng } from '../utils/random';
import { WORLD_SEED } from '../config';
import { MeshBuilder, InstanceBatch } from './MeshBuilder';
import {
  MAP_HALF, SIDEWALK, KERB, ROADS, SPAWN, LANDMARKS, computeBlocks, crossings, inCrossing, inClearZone, roadPoint,
  type Block, type Road,
} from './cityLayout';
import {
  makeWindowTexture, makeShopTexture, makeAsphaltTexture, makePavingTexture, makeGrassTexture,
  makeSignAtlas, type SignAtlas, STORY_SIGN, RANDOM_SIGNS, COLONY_SIGNS,
} from './textures';

const col = (hex: string) => new THREE.Color(hex);

const WALL_PALETTE = [
  '#eadbc0', '#dcb48a', '#cf8f6f', '#a9c2b5', '#bccfdc', '#e6c879', '#dcb0bb', '#f2eee4', '#b4afa6', '#e8c9a0', '#c9d6a3',
].map(col);
const AWNING_COLORS = ['#1f5fa8', '#2e7d32', '#c62828', '#f9a825', '#00838f', '#6a1b9a'].map(col);
const CLOTH_COLORS = ['#e53935', '#fdd835', '#1e88e5', '#ffffff', '#ec407a', '#43a047', '#ff7043'].map(col);
const CAR_COLORS = ['#f2f2f2', '#c0c4c8', '#8a1c1c', '#1d3c8f', '#2b2b2b', '#d7ccc8', '#6d7b8d'].map(col);
const COLONY_PALETTE = ['#f4efe6', '#f7f3ea', '#e9d8a6', '#c94f4f', '#f2c14e', '#a9cce3', '#efe2c4'].map(col);
const COLONY_TRIM = ['#8d1b1b', '#f2c14e', '#1f5fa8', '#2e7d32', '#8d1b1b'].map(col);
const FLAG_COLORS = ['#1e5bb8', '#ffffff', '#c62828', '#2e7d32', '#f9c80e'].map(col); // prayer flag order
const SCOOTER_COLORS = ['#e53935', '#1e88e5', '#212121', '#f5f5f5', '#8e24aa', '#ffb300'].map(col);

const GROUND_FLOOR = 4.0;
const FLOOR_HEIGHT = 3.1;
const BAY = 3.1;

interface FaceDef {
  sx: number; sz: number; ex: number; ez: number; nx: number; nz: number;
}

/**
 * Builds the first district procedurally from cityLayout data: roads, kerbs,
 * buildings, shop signs, wires, poles, props and their colliders.
 * Every category is merged or instanced, so the whole block costs ~20 draw calls.
 */
export class City {
  readonly group = new THREE.Group();

  private rng = new Rng(WORLD_SEED);
  private walls = new MeshBuilder();
  private shops = new MeshBuilder();
  private roofs = new MeshBuilder();
  private signs = new MeshBuilder();
  private sidewalks = new MeshBuilder();
  private kerbs = new MeshBuilder();
  private markings = new MeshBuilder();
  private props = new MeshBuilder();
  private grass = new MeshBuilder();
  private decor = new InstanceBatch();
  private tanks = new InstanceBatch();
  private poles = new InstanceBatch();
  private lamps = new InstanceBatch();
  private trunks = new InstanceBatch();
  private canopies = new InstanceBatch();
  private skyline = new InstanceBatch();
  private wires: number[] = [];
  private atlas: SignAtlas;
  /** Style of the block currently being built. */
  private style: 'market' | 'colony' = 'market';

  constructor(scene: THREE.Scene, private readonly physics: Physics) {
    this.atlas = makeSignAtlas();
    this.buildGround();
    for (const block of computeBlocks()) {
      this.buildSidewalk(block);
      this.style = block.kind === 'colony' ? 'colony' : 'market';
      if (block.kind === 'park') this.buildPark(block);
      else if (block.kind === 'parking') this.buildParkingLot(block);
      else if (block.kind === 'godown') this.buildGodown(block);
      else {
        this.buildMarketBlock(block);
        if (block.kind === 'colony') this.prayerFlags(block);
      }
    }
    for (const road of ROADS) {
      this.buildMarkings(road);
      this.buildPolesAndWires(road);
      if (road.median) this.buildMedian(road);
    }
    this.buildParkedVehicles();
    this.buildChaiStall();
    this.buildBakery();
    this.buildHome();
    this.buildBoundary();
    this.buildSkyline();
    this.assemble();
    scene.add(this.group);
  }

  // ---------------------------------------------------------------- ground & kerbs

  private buildGround() {
    const tex = makeAsphaltTexture();
    tex.repeat.set(1400 / 8, 1400 / 8);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(1400, 1400),
      new THREE.MeshLambertMaterial({ map: tex }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.group.add(ground);
    this.physics.addStaticBox(0, -0.5, 0, 700, 0.5, 700);
  }

  private buildSidewalk(b: Block) {
    const c = col('#ffffff');
    this.sidewalks.floor(b.x0, b.z0, b.x1, b.z1, KERB, c, 0.5);
    const kc = col('#7d776f');
    this.kerbs.wall(b.x1, b.z0, b.x0, b.z0, 0, KERB, [0, 0, 1, 1], kc);
    this.kerbs.wall(b.x0, b.z1, b.x1, b.z1, 0, KERB, [0, 0, 1, 1], kc);
    this.kerbs.wall(b.x1, b.z1, b.x1, b.z0, 0, KERB, [0, 0, 1, 1], kc);
    this.kerbs.wall(b.x0, b.z0, b.x0, b.z1, 0, KERB, [0, 0, 1, 1], kc);
    this.physics.addStaticBox((b.x0 + b.x1) / 2, KERB / 2, (b.z0 + b.z1) / 2, (b.x1 - b.x0) / 2, KERB / 2, (b.z1 - b.z0) / 2);
  }

  // ---------------------------------------------------------------- buildings

  private buildMarketBlock(b: Block) {
    const rng = this.rng;
    const bx0 = b.x0 + SIDEWALK, bx1 = b.x1 - SIDEWALK, bz0 = b.z0 + SIDEWALK, bz1 = b.z1 - SIDEWALK;
    const w = bx1 - bx0, d = bz1 - bz0;
    if (w < 4 || d < 4) return;
    const D = Math.min(13, d / 2);
    const Dx = Math.min(13, w / 2);

    // Rows along the -z and +z edges (these own the corners).
    for (const side of [-1, 1]) {
      const street = side < 0 ? b.z0 > -MAP_HALF : b.z1 < MAP_HALF;
      let x = bx0;
      let first = true;
      while (x < bx1 - 0.01) {
        let lw = rng.float(7, 12);
        if (bx1 - (x + lw) < 5) lw = bx1 - x;
        const corner = first || x + lw >= bx1 - 0.01;
        const depth = corner ? D : rng.float(Math.min(9, D), D);
        const z0 = side < 0 ? bz0 : bz1 - depth;
        this.building(x, z0, x + lw, z0 + depth, 0, side, street);
        x += lw;
        first = false;
      }
    }
    // Columns along the -x and +x edges, between the corner buildings.
    for (const side of [-1, 1]) {
      const street = side < 0 ? b.x0 > -MAP_HALF : b.x1 < MAP_HALF;
      let z = bz0 + D;
      const zEnd = bz1 - D;
      while (z < zEnd - 0.01) {
        let lw = rng.float(7, 12);
        if (zEnd - (z + lw) < 5) lw = zEnd - z;
        const depth = rng.float(Math.min(9, Dx), Dx);
        const x0 = side < 0 ? bx0 : bx1 - depth;
        this.building(x0, z, x0 + depth, z + lw, side, 0, street);
        z += lw;
      }
    }
    // Hidden interior filler so gaps between buildings never show the ground.
    if (w > 10 && d > 10) {
      const roofC = col('#8c857a');
      this.roofBox(bx0 + 3, bz0 + 3, bx1 - 3, bz1 - 3, 5.5, roofC);
    }
  }

  private roofBox(x0: number, z0: number, x1: number, z1: number, h: number, c: THREE.Color) {
    const uv: [number, number, number, number] = [0, 0, 1, 1];
    this.roofs.floor(x0, z0, x1, z1, h, c);
    this.roofs.wall(x1, z0, x0, z0, 0, h, uv, c);
    this.roofs.wall(x0, z1, x1, z1, 0, h, uv, c);
    this.roofs.wall(x1, z1, x1, z0, 0, h, uv, c);
    this.roofs.wall(x0, z0, x0, z1, 0, h, uv, c);
  }

  private building(x0: number, z0: number, x1: number, z1: number, nx: number, nz: number, street: boolean) {
    const rng = this.rng;
    const floors = rng.int(1, 4);
    const h = GROUND_FLOOR + floors * FLOOR_HEIGHT;
    const colony = this.style === 'colony';
    const wallC = rng.pick(colony ? COLONY_PALETTE : WALL_PALETTE).clone().multiplyScalar(rng.float(0.88, 1.04));
    const shopC = wallC.clone().lerp(col('#ffffff'), 0.55);
    const roofC = col('#8f887d').multiplyScalar(rng.float(0.85, 1.1));
    const trimC = colony ? rng.pick(COLONY_TRIM) : wallC.clone().multiplyScalar(0.8);

    const faces: FaceDef[] = [
      { sx: x0, sz: z1, ex: x1, ez: z1, nx: 0, nz: 1 },
      { sx: x1, sz: z0, ex: x0, ez: z0, nx: 0, nz: -1 },
      { sx: x1, sz: z1, ex: x1, ez: z0, nx: 1, nz: 0 },
      { sx: x0, sz: z0, ex: x0, ez: z1, nx: -1, nz: 0 },
    ];
    for (const f of faces) {
      const len = Math.hypot(f.ex - f.sx, f.ez - f.sz);
      const bays = Math.max(1, Math.round(len / BAY));
      const uOff = rng.chance(0.5) ? 0.5 : 0;
      this.shops.wall(f.sx, f.sz, f.ex, f.ez, 0, GROUND_FLOOR, [uOff, 0, uOff + bays * 0.5, 1], shopC);
      this.walls.wall(f.sx, f.sz, f.ex, f.ez, GROUND_FLOOR, h, [0, 0, bays, floors], wallC);
      if (street && f.nx === nx && f.nz === nz) this.decorateFacade(f, len, floors, wallC);
    }
    this.roofs.floor(x0, z0, x1, z1, h, roofC);

    // Parapet
    const p = 0.18, ph = 0.8, cy = h + ph / 2;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
    this.decor.add(cx, cy, z0 + p / 2, w, ph, p, trimC);
    this.decor.add(cx, cy, z1 - p / 2, w, ph, p, trimC);
    this.decor.add(x0 + p / 2, cy, cz, p, ph, d - 2 * p, trimC);
    this.decor.add(x1 - p / 2, cy, cz, p, ph, d - 2 * p, trimC);

    // Rooftop clutter: water tanks and stair rooms (mumty)
    const tanks = rng.int(0, 2);
    for (let i = 0; i < tanks; i++) {
      this.tanks.add(rng.float(x0 + 1.2, x1 - 1.2), h + 0.65, rng.float(z0 + 1.2, z1 - 1.2), 1.1, 1.3, 1.1, col('#1c1c1c'));
    }
    if (rng.chance(0.45) && w > 5 && d > 5) {
      this.decor.add(rng.float(x0 + 2, x1 - 2), h + 1.3, rng.float(z0 + 2, z1 - 2), 2.6, 2.6, 2.6, wallC);
    }

    this.physics.addStaticBox(cx, h / 2, cz, w / 2, h / 2, d / 2);
  }

  private decorateFacade(f: FaceDef, len: number, floors: number, wallC: THREE.Color) {
    const rng = this.rng;
    const rx = (f.ex - f.sx) / len, rz = (f.ez - f.sz) / len;
    const yaw = Math.atan2(f.nx, f.nz);
    const bays = Math.max(1, Math.round(len / BAY));
    const bw = len / bays;
    const acC = col('#d9d9d4');
    const railC = col('#2d2a26');
    const slabC = wallC.clone().multiplyScalar(0.75);

    for (let fl = 0; fl < floors; fl++) {
      const y0 = GROUND_FLOOR + fl * FLOOR_HEIGHT;
      for (let i = 0; i < bays; i++) {
        const t = (i + 0.5) * bw;
        const px = f.sx + rx * t, pz = f.sz + rz * t;
        if (rng.chance(0.22)) {
          const o = bw * 0.36;
          this.decor.add(px + rx * o + f.nx * 0.28, y0 + 0.9, pz + rz * o + f.nz * 0.28, 0.75, 0.5, 0.42, acC, yaw);
        } else if (rng.chance(0.28)) {
          this.decor.add(px + f.nx * 0.5, y0 + 0.06, pz + f.nz * 0.5, bw * 0.86, 0.12, 1.0, slabC, yaw);
          this.decor.add(px + f.nx * 0.98, y0 + 0.55, pz + f.nz * 0.98, bw * 0.86, 0.9, 0.05, railC, yaw);
          if (rng.chance(0.4)) {
            this.decor.add(px + f.nx * 0.9, y0 + 1.5, pz + f.nz * 0.9, bw * 0.45, 0.6, 0.03, rng.pick(CLOTH_COLORS), yaw);
          }
        }
      }
    }

    // Shop signs (+ optional awning) on the ground floor
    const signCount = Math.max(1, Math.floor(len / 5.5));
    const seg = len / signCount;
    for (let s = 0; s < signCount; s++) {
      if (!this.rng.chance(0.85)) continue;
      const sw = Math.min(seg - 0.5, 3.4);
      const t = (s + 0.5) * seg;
      if (inClearZone(f.sx + rx * t, f.sz + rz * t)) continue;
      const cx = f.sx + rx * t + f.nx * 0.07, cz = f.sz + rz * t + f.nz * 0.07;
      const y0 = 2.95, y1 = 4.0;
      const hx = rx * sw / 2, hz = rz * sw / 2;
      const [a0, a1] = this.style === 'colony' ? COLONY_SIGNS : RANDOM_SIGNS;
      const idx = a0 + Math.floor(rng.next() * (a1 - a0));
      this.signs.quad(
        [cx - hx, y0, cz - hz], [cx + hx, y0, cz + hz], [cx + hx, y1, cz + hz], [cx - hx, y1, cz - hz],
        this.atlas.uv(idx), col('#ffffff'),
      );
      if (rng.chance(0.55)) {
        const out = 0.7, tilt = 0.3;
        this.decor.add(
          f.sx + rx * t + f.nx * out, 2.85 - Math.sin(tilt) * out, f.sz + rz * t + f.nz * out,
          sw, 0.05, 1.4, rng.pick(AWNING_COLORS), yaw, tilt,
        );
      }
    }
  }

  // ---------------------------------------------------------------- park

  private buildPark(b: Block) {
    const rng = this.rng;
    const x0 = b.x0 + SIDEWALK, x1 = b.x1 - SIDEWALK, z0 = b.z0 + SIDEWALK, z1 = b.z1 - SIDEWALK;
    this.grass.floor(x0, z0, x1, z1, KERB + 0.01, col('#ffffff'), 0.25);
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    // paths
    this.sidewalks.floor(cx - 1.2, z0, cx + 1.2, z1, KERB + 0.02, col('#e8ddd0'), 0.5);
    this.sidewalks.floor(x0, cz - 1.2, x1, cz + 1.2, KERB + 0.02, col('#e8ddd0'), 0.5);
    // low boundary wall with four gates
    const wallC = col('#c9b8a0'), wh = 0.7, wt = 0.25, gap = 1.6;
    const seg = (ax: number, az: number, bx: number, bz: number) => {
      const mx = (ax + bx) / 2, mz = (az + bz) / 2;
      const sx = Math.max(wt, Math.abs(bx - ax)), sz = Math.max(wt, Math.abs(bz - az));
      this.decor.add(mx, KERB + wh / 2, mz, sx, wh, sz, wallC);
      this.physics.addStaticBox(mx, KERB + wh / 2, mz, sx / 2, wh / 2, sz / 2);
    };
    seg(x0, z0, cx - gap, z0); seg(cx + gap, z0, x1, z0);
    seg(x0, z1, cx - gap, z1); seg(cx + gap, z1, x1, z1);
    seg(x0, z0, x0, cz - gap); seg(x0, cz + gap, x0, z1);
    seg(x1, z0, x1, cz - gap); seg(x1, cz + gap, x1, z1);
    // trees
    for (let i = 0; i < 16; i++) {
      const x = rng.float(x0 + 2, x1 - 2), z = rng.float(z0 + 2, z1 - 2);
      if (Math.abs(x - cx) < 2.5 || Math.abs(z - cz) < 2.5) continue;
      this.tree(x, KERB, z);
    }
    // benches
    const benchC = col('#6d4c33');
    for (const [bx, bz, yaw] of [[cx - 5, cz - 2.2, 0], [cx + 5, cz + 2.2, Math.PI], [cx - 2.2, cz + 6, Math.PI / 2], [cx + 2.2, cz - 6, -Math.PI / 2]] as const) {
      this.decor.add(bx, KERB + 0.45, bz, 1.8, 0.08, 0.5, benchC, yaw);
      this.decor.add(bx, KERB + 0.22, bz, 1.6, 0.44, 0.1, col('#3a3a3a'), yaw);
    }
  }

  private tree(x: number, y: number, z: number) {
    const rng = this.rng;
    const th = rng.float(2.2, 3.4);
    this.trunks.add(x, y + th / 2, z, 0.35, th, 0.35, col('#5a4632'));
    const greens = ['#4f7a34', '#5d8a3c', '#3f6a2c', '#6b8f3e'];
    const s = rng.float(2.2, 3.2);
    this.canopies.add(x, y + th + s * 0.6, z, s, s * 0.85, s, col(rng.pick(greens)), rng.float(0, 6));
    if (rng.chance(0.6)) {
      this.canopies.add(x + rng.float(-0.8, 0.8), y + th + s * 1.1, z + rng.float(-0.8, 0.8), s * 0.7, s * 0.6, s * 0.7, col(rng.pick(greens)), rng.float(0, 6));
    }
    this.physics.addStaticCylinder(x, y + th / 2, z, th / 2, 0.22);
  }

  // ---------------------------------------------------------------- road furniture

  private buildMarkings(road: Road) {
    const white = col('#e9e6dc'), yellow = col('#e8b92e');
    const half = road.width / 2;
    const rect = (t0: number, t1: number, o0: number, o1: number, c: THREE.Color) => {
      const a = roadPoint(road, t0, o0), b = roadPoint(road, t1, o1);
      this.markings.floor(Math.min(a.x, b.x), Math.min(a.z, b.z), Math.max(a.x, b.x), Math.max(a.z, b.z), 0.015, c, 0);
    };
    const dashed = (offset: number, c: THREE.Color) => {
      for (let t = -MAP_HALF; t < MAP_HALF - 3; t += 6) {
        if (inCrossing(road, t, 1) || inCrossing(road, t + 3, 1)) continue;
        rect(t, t + 3, offset - 0.07, offset + 0.07, c);
      }
    };
    const solid = (offset: number, c: THREE.Color) => {
      let start = -MAP_HALF;
      for (const [a, b] of crossings(road, 1)) {
        if (a > start) rect(start, a, offset - 0.07, offset + 0.07, c);
        start = Math.max(start, b);
      }
      if (start < MAP_HALF) rect(start, MAP_HALF, offset - 0.07, offset + 0.07, c);
    };
    if (road.median) {
      dashed(-half / 2, white);
      dashed(half / 2, white);
    } else {
      dashed(0, white);
    }
    solid(-half + 0.35, yellow);
    solid(half - 0.35, yellow);

    // zebra crossings on each approach to every junction
    for (const other of ROADS.filter((r) => r.axis !== road.axis)) {
      for (const side of [-1, 1]) {
        const t = other.center + side * (other.width / 2 + 2);
        for (let o = -half + 0.6; o < half - 0.6; o += 1.0) rect(t - 1.4, t + 1.4, o, o + 0.5, white);
      }
    }
  }

  private buildMedian(road: Road) {
    const medC = col('#d6c15a');
    const shrubC = col('#4e7d32');
    let start = -MAP_HALF;
    const segments: [number, number][] = [];
    for (const [a, b] of crossings(road, 0.5)) {
      if (a > start) segments.push([start, a]);
      start = Math.max(start, b);
    }
    if (start < MAP_HALF) segments.push([start, MAP_HALF]);
    for (const [a, b] of segments) {
      const mid = (a + b) / 2, len = b - a;
      const p = roadPoint(road, mid, 0);
      const sx = road.axis === 'x' ? len : 1.0, sz = road.axis === 'x' ? 1.0 : len;
      this.decor.add(p.x, 0.2, p.z, sx, 0.4, sz, medC);
      this.physics.addStaticBox(p.x, 0.2, p.z, sx / 2, 0.2, sz / 2);
      for (let t = a + 1; t < b - 1; t += 1.6) {
        const q = roadPoint(road, t, 0);
        this.decor.add(q.x, 0.62, q.z, 0.8, 0.45, 0.7, shrubC, this.rng.float(0, 3));
      }
      // twin-arm streetlights on the median
      for (let t = a + 6; t < b - 4; t += 24) {
        const q = roadPoint(road, t, 0);
        this.poles.add(q.x, 4.6, q.z, 0.24, 9.2, 0.24, col('#5d6166'));
        const along = road.axis === 'x';
        this.decor.add(q.x, 9.1, q.z, along ? 0.12 : 4.6, 0.12, along ? 4.6 : 0.12, col('#5d6166'));
        for (const s of [-1, 1]) {
          const l = roadPoint(road, t, s * 2.2);
          this.lamps.add(l.x, 9.0, l.z, along ? 0.9 : 0.5, 0.16, along ? 0.5 : 0.9, col('#fff1c9'));
        }
        this.physics.addStaticCylinder(q.x, 4.6, q.z, 4.6, 0.15);
      }
    }
  }

  private buildPolesAndWires(road: Road) {
    const rng = this.rng;
    const poleC = col('#6b6258');
    const half = road.width / 2;
    const tops: { x: number; z: number; side: number; t: number }[] = [];
    for (const side of [-1, 1]) {
      let prev: { x: number; z: number; t: number } | null = null;
      for (let t = -MAP_HALF + 6; t < MAP_HALF - 4; t += 16) {
        if (inCrossing(road, t, 3)) {
          prev = null;
          continue;
        }
        const p = roadPoint(road, t, side * (half + 0.5));
        if (Math.hypot(p.x - SPAWN.bike.x, p.z - SPAWN.bike.z) < 2) continue;
        this.poles.add(p.x, 4, p.z, 0.22, 8, 0.22, poleC);
        this.decor.add(p.x, 7.6, p.z, road.axis === 'x' ? 0.1 : 1.2, 0.1, road.axis === 'x' ? 1.2 : 0.1, poleC);
        this.physics.addStaticCylinder(p.x, 4, p.z, 4, 0.14);
        if (prev && t - prev.t < 17) {
          for (const h of [7.6, 7.2, 6.7]) this.wire(prev.x, h, prev.z, p.x, h - rng.float(-0.15, 0.15), p.z, rng.float(0.5, 1.1));
        }
        // tangles into buildings
        if (rng.chance(0.55)) {
          const facade = roadPoint(road, t + rng.float(-4, 4), side * (half + SIDEWALK));
          this.wire(p.x, rng.float(6.6, 7.6), p.z, facade.x, rng.float(4.5, 7.5), facade.z, rng.float(0.2, 0.6));
        }
        tops.push({ x: p.x, z: p.z, side, t });
        prev = { x: p.x, z: p.z, t };
      }
    }
    // wires crossing the road
    for (const a of tops) {
      if (a.side !== -1 || !rng.chance(0.3)) continue;
      const b = tops.find((p) => p.side === 1 && p.t === a.t);
      if (b) this.wire(a.x, 7.4, a.z, b.x, 7.4, b.z, rng.float(0.6, 1.2));
    }
    // a few roadside trees on the smaller roads
    if (!road.median) {
      for (let t = -MAP_HALF + 14; t < MAP_HALF - 10; t += 16) {
        if (inCrossing(road, t, 5) || !rng.chance(0.35)) continue;
        const side = rng.chance(0.5) ? -1 : 1;
        const p = roadPoint(road, t, side * (half + 2.6));
        this.tree(p.x, KERB, p.z);
      }
    }
  }

  private wire(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, sag: number) {
    const n = 8;
    let px = x0, py = y0, pz = z0;
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
      const y = y0 + (y1 - y0) * t - sag * 4 * t * (1 - t);
      this.wires.push(px, py, pz, x, y, z);
      px = x; py = y; pz = z;
    }
  }

  // ---------------------------------------------------------------- vehicles & stall

  private parkedCar(x: number, z: number, yaw: number, base = 0) {
    const c = this.rng.pick(CAR_COLORS);
    const glass = col('#27313b');
    const dark = col('#1a1a1a');
    const f = (lx: number, lz: number) => ({ x: x + lx * Math.cos(yaw) + lz * Math.sin(yaw), z: z - lx * Math.sin(yaw) + lz * Math.cos(yaw) });
    this.props.box(x, base + 0.62, z, 1.7, 0.7, 3.9, yaw, c);
    const cab = f(0, -0.2);
    this.props.box(cab.x, base + 1.22, cab.z, 1.5, 0.5, 2.0, yaw, glass);
    this.props.box(cab.x, base + 1.5, cab.z, 1.45, 0.06, 1.9, yaw, c);
    for (const [lx, lz] of [[-0.78, 1.25], [0.78, 1.25], [-0.78, -1.25], [0.78, -1.25]]) {
      const w = f(lx, lz);
      this.props.box(w.x, base + 0.32, w.z, 0.22, 0.62, 0.62, yaw, dark);
    }
    this.physics.addStaticBox(x, base + 0.8, z, 0.85, 0.8, 1.95, yaw);
  }

  private buildParkedVehicles() {
    const rng = this.rng;
    for (const road of ROADS) {
      if (road.median) continue;
      const half = road.width / 2;
      for (let t = -MAP_HALF + 8; t < MAP_HALF - 8; t += rng.float(9, 22)) {
        if (inCrossing(road, t, 6)) continue;
        const side = rng.chance(0.5) ? -1 : 1;
        const p = roadPoint(road, t, side * (half - 1.15));
        if (inClearZone(p.x, p.z)) continue;
        const yaw = road.axis === 'x' ? Math.PI / 2 + (rng.chance(0.5) ? 0 : Math.PI) : rng.chance(0.5) ? 0 : Math.PI;
        this.parkedCar(p.x, p.z, yaw);
      }
    }
    // scooter rows on the main-road pavements, nose-in to the kerb
    const main = ROADS.find((r) => r.median)!;
    for (const side of [-1, 1]) {
      for (let t = -MAP_HALF + 10; t < MAP_HALF - 10; t += rng.float(14, 26)) {
        const count = rng.int(3, 7);
        const len = count * 0.85;
        if (inCrossing(main, t, 6) || inCrossing(main, t + len, 6)) continue;
        const a = roadPoint(main, t, side * 9.1), b = roadPoint(main, t + len, side * 9.1);
        if (inClearZone(a.x, a.z, 1) || inClearZone(b.x, b.z, 1)) continue;
        for (let i = 0; i < count; i++) {
          const p = roadPoint(main, t + i * 0.85, side * (main.width / 2 + 1.1));
          const c = rng.pick(SCOOTER_COLORS);
          this.props.box(p.x, KERB + 0.5, p.z, 0.32, 0.55, 1.5, 0, c);
          this.props.box(p.x, KERB + 0.95, p.z + side * 0.45, 0.6, 0.06, 0.06, 0, col('#222222'));
          this.props.box(p.x, KERB + 0.82, p.z - side * 0.2, 0.3, 0.12, 0.65, 0, col('#1b1b1b'));
        }
        const mid = roadPoint(main, t + (count - 1) * 0.425, side * (main.width / 2 + 1.1));
        this.physics.addStaticBox(mid.x, KERB + 0.6, mid.z, len / 2, 0.6, 0.75);
      }
    }
  }

  /** Ramesh bhaiya's chai stall: where the story starts (M1). */
  private buildChaiStall() {
    const x = -30, z = 11.0, y = KERB;
    const wood = col('#7a5232'), steel = col('#b8bcc2');
    this.decor.add(x, y + 0.55, z + 0.2, 2.6, 1.1, 1.1, wood);
    this.decor.add(x, y + 1.13, z + 0.2, 2.7, 0.06, 1.2, steel);
    for (const sx of [-1.3, 1.3]) {
      this.decor.add(x + sx, y + 1.3, z - 0.6, 0.07, 2.6, 0.07, col('#3a3a3a'));
    }
    this.decor.add(x, y + 2.65, z, 3.4, 0.05, 2.2, col('#1f5fa8'), Math.PI, 0.12); // tarp
    this.tanks.add(x - 0.6, y + 1.3, z + 0.2, 0.3, 0.3, 0.3, col('#7a7a7a')); // kettle
    this.tanks.add(x + 0.3, y + 1.22, z + 0.35, 0.5, 0.12, 0.5, col('#333333')); // stove
    // bench for customers
    this.decor.add(x + 2.9, y + 0.45, z + 0.5, 1.6, 0.08, 0.45, wood);
    this.decor.add(x + 2.9, y + 0.22, z + 0.5, 1.5, 0.44, 0.1, col('#3a3a3a'));
    // hanging sign
    const uv = this.atlas.uv(0);
    const sz = z - 0.75, y0 = y + 2.05, y1 = y + 2.55;
    this.signs.quad([x + 1.25, y0, sz], [x - 1.25, y0, sz], [x - 1.25, y1, sz], [x + 1.25, y1, sz], uv, col('#ffffff'));
    this.physics.addStaticBox(x, y + 0.6, z + 0.2, 1.35, 0.6, 0.6);
    this.physics.addStaticBox(x + 2.9, y + 0.25, z + 0.5, 0.8, 0.25, 0.25);
  }

  /** Sweet Pinch Bakery (M1): big sign, glass display counter, cake boxes. */
  private buildBakery() {
    const { x, z } = LANDMARKS.bakery;
    const y = KERB;
    const fz = z + 0.09;
    this.signs.quad([x - 2.2, 2.85, fz], [x + 2.2, 2.85, fz], [x + 2.2, 4.0, fz], [x - 2.2, 4.0, fz], this.atlas.uv(STORY_SIGN.bakery), col('#ffffff'));
    this.decor.add(x, 2.75 - Math.sin(0.3) * 0.75, z + 0.75, 4.4, 0.05, 1.5, col('#f06292'), 0, 0.3);
    this.decor.add(x, y + 0.5, z + 1.0, 2.4, 1.0, 0.7, col('#f3e5f5')); // display counter
    this.decor.add(x, y + 1.02, z + 1.0, 2.45, 0.05, 0.75, col('#9ec9d9')); // glass top
    for (let i = 0; i < 4; i++) this.decor.add(x - 0.9 + i * 0.6, y + 1.18, z + 0.95, 0.38, 0.26, 0.38, col(i % 2 ? '#fce4ec' : '#ffffff'));
    this.physics.addStaticBox(x, y + 0.55, z + 1.0, 1.25, 0.55, 0.4);
  }

  /** Sethi family home (M1): door, nameplate, birthday balloons. */
  private buildHome() {
    const { x, z } = LANDMARKS.home;
    const y = KERB;
    this.decor.add(x - 0.06, y + 1.15, z, 0.12, 2.3, 1.3, col('#5d3a1f')); // door
    this.decor.add(x - 0.1, y + 2.45, z, 0.1, 0.25, 1.6, col('#3e2a18')); // lintel
    this.decor.add(x - 0.12, y + 1.6, z + 1.0, 0.04, 0.22, 0.5, col('#f5d3a3')); // nameplate
    this.decor.add(x - 0.4, y + 0.08, z, 0.8, 0.16, 1.6, col('#9e9e9e')); // step
    const balloon = ['#e53935', '#fdd835', '#1e88e5', '#ec407a', '#43a047', '#ff7043'];
    balloon.forEach((c, i) => {
      const side = i % 2 ? 1 : -1;
      this.canopies.add(x - 0.3, y + 2.3 + (i % 3) * 0.28, z + side * (0.85 + (i % 3) * 0.12), 0.45, 0.55, 0.45, col(c), i);
    });
  }

  /** Majnu Ka Tila: strings of prayer flags between rooftops and across lanes. */
  private prayerFlags(b: Block) {
    const rng = this.rng;
    const inset = SIDEWALK + 1;
    const pick = () => ({
      x: rng.float(b.x0 + inset, b.x1 - inset),
      z: rng.float(b.z0 + inset, b.z1 - inset),
      y: rng.float(8.5, 12),
    });
    const strings: [{ x: number; z: number; y: number }, { x: number; z: number; y: number }][] = [];
    for (let i = 0; i < 6; i++) strings.push([pick(), pick()]);
    // a few across the lane edges, from the block to the road's far side
    for (const side of [-1, 1]) {
      const z = side < 0 ? b.z0 : b.z1;
      if (z >= MAP_HALF) continue;
      for (let i = 0; i < 2; i++) {
        const x = rng.float(b.x0 + 6, b.x1 - 6);
        strings.push([{ x, z: z - side * 3, y: 7.5 }, { x: x + rng.float(-6, 6), z: z + side * 9, y: 7.5 }]);
      }
    }
    for (const [a, c] of strings) {
      const len = Math.hypot(c.x - a.x, c.z - a.z);
      if (len < 5) continue;
      const n = Math.floor(len / 0.55);
      const yaw = Math.atan2(c.x - a.x, c.z - a.z) + Math.PI / 2;
      this.wire(a.x, a.y, a.z, c.x, c.y, c.z, len * 0.06);
      for (let i = 1; i < n; i++) {
        const t = i / n;
        const y = a.y + (c.y - a.y) * t - len * 0.06 * 4 * t * (1 - t) - 0.2;
        this.decor.add(a.x + (c.x - a.x) * t, y, a.z + (c.z - a.z) * t, 0.34, 0.4, 0.02, FLAG_COLORS[i % 5], yaw);
      }
    }
  }

  /** Ring Road Parking: the Kothi-run lot where the family car ends up (M2). */
  private buildParkingLot(b: Block) {
    const rng = this.rng;
    const x0 = b.x0 + SIDEWALK, x1 = b.x1 - SIDEWALK, z0 = b.z0 + SIDEWALK, z1 = b.z1 - SIDEWALK;
    const y = KERB;
    this.markings.floor(x0, z0, x1, z1, y + 0.004, col('#3d3c3b'), 0); // asphalt surface
    // bay lines along two rows
    for (const rowZ of [z1 - 5.2, (z0 + z1) / 2 - 1]) {
      for (let x = x0 + 2; x < x1 - 2; x += 2.9) this.markings.floor(x - 0.06, rowZ - 2.4, x + 0.06, rowZ + 2.4, y + 0.012, col('#e9e6dc'), 0);
    }
    // low wall with the gate on the south side
    const gate = { a: -76.5, b: -67.5 };
    const wallC = col('#bfb3a1'), wh = 1.0, wt = 0.3;
    const wall = (ax: number, az: number, bx: number, bz: number) => {
      const mx = (ax + bx) / 2, mz = (az + bz) / 2, sx = Math.max(wt, Math.abs(bx - ax)), sz = Math.max(wt, Math.abs(bz - az));
      this.decor.add(mx, y + wh / 2, mz, sx, wh, sz, wallC);
      this.physics.addStaticBox(mx, y + wh / 2, mz, sx / 2, wh / 2, sz / 2);
    };
    wall(x0, z0, gate.a, z0);
    wall(gate.b, z0, x1, z0);
    wall(x0, z1, x1, z1);
    wall(x0, z0, x0, z1);
    wall(x1, z0, x1, z1);
    // gate arch with the lot's sign
    for (const gx of [gate.a, gate.b]) this.poles.add(gx, y + 2.4, z0, 0.25, 4.8, 0.25, col('#3a3a3a'));
    const sz = z0 - 0.05;
    this.signs.quad([gate.b - 0.2, y + 3.6, sz], [gate.a + 0.2, y + 3.6, sz], [gate.a + 0.2, y + 4.8, sz], [gate.b - 0.2, y + 4.8, sz], this.atlas.uv(STORY_SIGN.parking), col('#ffffff'));
    this.signs.quad([gate.a + 0.2, y + 3.6, sz + 0.1], [gate.b - 0.2, y + 3.6, sz + 0.1], [gate.b - 0.2, y + 4.8, sz + 0.1], [gate.a + 0.2, y + 4.8, sz + 0.1], this.atlas.uv(STORY_SIGN.parking), col('#ffffff'));
    // attendant booth + umbrella + plastic chair
    const bx = -64.5, bz = z0 + 2.2;
    this.decor.add(bx, y + 1.1, bz, 1.6, 2.2, 1.6, col('#e9e4d8'));
    this.decor.add(bx, y + 2.28, bz, 1.9, 0.16, 1.9, col('#1f5fa8'));
    this.physics.addStaticBox(bx, y + 1.1, bz, 0.8, 1.1, 0.8);
    this.poles.add(-67.8, y + 1.2, bz - 0.3, 0.06, 2.4, 0.06, col('#cccccc'));
    this.canopies.add(-67.8, y + 2.45, bz - 0.3, 3.0, 0.5, 3.0, col('#d32f2f'), 0.3);
    this.decor.add(-67.2, y + 0.45, bz + 0.6, 0.5, 0.06, 0.5, col('#f5f5f5'));
    // parked cars (the family car's bay stays empty — the game places it)
    for (const rowZ of [z1 - 5.2, (z0 + z1) / 2 - 1]) {
      for (let x = x0 + 3.45; x < x1 - 2; x += 2.9) {
        if (Math.abs(x - LANDMARKS.lotCar.x) < 2 && Math.abs(rowZ - LANDMARKS.lotCar.z) < 3) continue;
        if (x > gate.a - 1 && x < gate.b + 1 && rowZ < (z0 + z1) / 2) continue; // driving aisle from the gate
        if (!rng.chance(0.75)) continue;
        this.parkedCar(x, rowZ, rng.chance(0.5) ? 0 : Math.PI, y);
      }
    }
  }

  /** Bhalla Paper Traders godown: shed + yard + walled compound with a west gate (M2). */
  private buildGodown(b: Block) {
    const x0 = b.x0 + SIDEWALK, z0 = b.z0 + SIDEWALK, z1 = b.z1 - SIDEWALK, x1 = MAP_HALF - 1;
    const y = KERB;
    this.markings.floor(x0, z0, x1, z1, y + 0.004, col('#9c968b'), 0); // concrete yard
    // shed
    const sx0 = 122, sx1 = x1 - 1, sz0 = z0 + 2, sz1 = z1 - 2, h = 7.5;
    const shed = col('#c9c2b5');
    const faces: FaceDef[] = [
      { sx: sx0, sz: sz1, ex: sx1, ez: sz1, nx: 0, nz: 1 },
      { sx: sx1, sz: sz0, ex: sx0, ez: sz0, nx: 0, nz: -1 },
      { sx: sx1, sz: sz1, ex: sx1, ez: sz0, nx: 1, nz: 0 },
      { sx: sx0, sz: sz0, ex: sx0, ez: sz1, nx: -1, nz: 0 },
    ];
    for (const f of faces) {
      const len = Math.hypot(f.ex - f.sx, f.ez - f.sz);
      const bays = Math.max(1, Math.round(len / 4.5));
      this.shops.wall(f.sx, f.sz, f.ex, f.ez, 0, 4.2, [0.5, 0, 0.5 + bays * 0.5, 1], shed);
      this.roofs.wall(f.sx, f.sz, f.ex, f.ez, 4.2, h, [0, 0, 1, 1], shed.clone().multiplyScalar(0.85));
    }
    this.roofs.floor(sx0, sz0, sx1, sz1, h, col('#7d8790'));
    this.physics.addStaticBox((sx0 + sx1) / 2, h / 2, (sz0 + sz1) / 2, (sx1 - sx0) / 2, h / 2, (sz1 - sz0) / 2);
    const signX = sx0 - 0.08, gz = LANDMARKS.godownGate.z;
    this.signs.quad([signX, 4.6, gz + 3], [signX, 4.6, gz - 3], [signX, 6.6, gz - 3], [signX, 6.6, gz + 3], this.atlas.uv(STORY_SIGN.godown), col('#ffffff'));
    // compound wall with a gate on the west side
    const wallC = col('#d8cfc0'), wh = 2.2, wt = 0.3;
    const wall = (ax: number, az: number, bx: number, bz: number) => {
      const mx = (ax + bx) / 2, mz = (az + bz) / 2, sx = Math.max(wt, Math.abs(bx - ax)), sz = Math.max(wt, Math.abs(bz - az));
      this.decor.add(mx, y + wh / 2, mz, sx, wh, sz, wallC);
      this.physics.addStaticBox(mx, y + wh / 2, mz, sx / 2, wh / 2, sz / 2);
    };
    wall(x0, z0, x0, gz - 4);
    wall(x0, gz + 4, x0, z1);
    wall(x0, z1, x1, z1);
    wall(x0, z0, x1, z0);
    for (const gzz of [gz - 4, gz + 4]) this.decor.add(x0, y + 1.4, gzz, 0.6, 2.8, 0.6, col('#8d1b1b'));
    // paper bales and a hand cart in the yard
    for (let i = 0; i < 6; i++) this.decor.add(119.5, y + 0.45 + (i % 2) * 0.9, z0 + 3 + Math.floor(i / 2) * 1.3, 1.2, 0.9, 1.1, col(i % 3 ? '#e8dcc0' : '#d7c9a7'));
    this.physics.addStaticBox(119.5, y + 0.9, z0 + 4.3, 0.6, 0.9, 2.0);
  }

  // ---------------------------------------------------------------- edges

  private buildBoundary() {
    const H = MAP_HALF;
    this.physics.addStaticBox(H + 0.5, 10, 0, 0.5, 20, H + 1);
    this.physics.addStaticBox(-H - 0.5, 10, 0, 0.5, 20, H + 1);
    this.physics.addStaticBox(0, 10, H + 0.5, H + 1, 20, 0.5);
    this.physics.addStaticBox(0, 10, -H - 0.5, H + 1, 20, 0.5);
    const yellow = col('#f5c518'), black = col('#1a1a1a');
    for (const road of ROADS) {
      for (const end of [-1, 1]) {
        const t = end * (H - 1);
        for (let o = -road.width / 2, i = 0; o < road.width / 2; o += 1, i++) {
          const p = roadPoint(road, t, o + 0.5);
          this.decor.add(p.x, 0.5, p.z, 1, 1, 1, i % 2 ? yellow : black);
        }
      }
    }
  }

  private buildSkyline() {
    const rng = this.rng;
    const H = MAP_HALF;
    for (let i = 0; i < 320; i++) {
      const x = rng.float(-H - 140, H + 140), z = rng.float(-H - 140, H + 140);
      if (Math.abs(x) < H + 14 && Math.abs(z) < H + 14) continue;
      const w = rng.float(10, 26), d = rng.float(10, 26), h = rng.float(7, 26) * (rng.chance(0.08) ? 2.5 : 1);
      this.skyline.add(x, h / 2, z, w, h, d, rng.pick(WALL_PALETTE).clone().multiplyScalar(0.8));
    }
  }

  // ---------------------------------------------------------------- assembly

  private assemble() {
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, cast = true, receive = true) => {
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = cast;
      m.receiveShadow = receive;
      this.group.add(m);
      return m;
    };
    const windowTex = makeWindowTexture();
    const shopTex = makeShopTexture();
    const paving = makePavingTexture();
    const grass = makeGrassTexture();

    add(this.walls.build(), new THREE.MeshLambertMaterial({ map: windowTex, vertexColors: true }));
    add(this.shops.build(), new THREE.MeshLambertMaterial({ map: shopTex, vertexColors: true }));
    add(this.roofs.build(), new THREE.MeshLambertMaterial({ vertexColors: true }));
    add(this.sidewalks.build(), new THREE.MeshLambertMaterial({ map: paving, vertexColors: true }), false);
    add(this.kerbs.build(), new THREE.MeshLambertMaterial({ vertexColors: true }), false);
    add(this.grass.build(), new THREE.MeshLambertMaterial({ map: grass, vertexColors: true }), false);
    add(this.props.build(), new THREE.MeshLambertMaterial({ vertexColors: true }));
    add(
      this.markings.build(),
      new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
      false,
    );
    add(
      this.signs.build(),
      new THREE.MeshLambertMaterial({
        map: this.atlas.texture, emissiveMap: this.atlas.texture, emissive: 0xffffff, emissiveIntensity: 0.3,
        polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
      }),
      false,
    );

    const box = new THREE.BoxGeometry(1, 1, 1);
    const cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 10);
    const lambert = new THREE.MeshLambertMaterial();
    this.group.add(this.decor.build(box, lambert));
    this.group.add(this.tanks.build(cyl, lambert));
    this.group.add(this.poles.build(new THREE.CylinderGeometry(0.5, 0.5, 1, 6), lambert));
    this.group.add(this.lamps.build(box, new THREE.MeshBasicMaterial(), false));
    this.group.add(this.trunks.build(new THREE.CylinderGeometry(0.4, 0.5, 1, 6), lambert));
    this.group.add(this.canopies.build(new THREE.IcosahedronGeometry(0.6, 0), new THREE.MeshLambertMaterial({ flatShading: true })));
    this.group.add(this.skyline.build(box, lambert, false));

    const wireGeo = new THREE.BufferGeometry();
    wireGeo.setAttribute('position', new THREE.Float32BufferAttribute(this.wires, 3));
    this.group.add(new THREE.LineSegments(wireGeo, new THREE.LineBasicMaterial({ color: 0x1b1b1b })));
  }
}
