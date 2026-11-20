import * as THREE from 'three';
import { RAPIER, Physics } from '../physics/Physics';
import { Rng } from '../utils/random';
import { clamp, damp, lerpAngle } from '../utils/math';
import {
  ROADS, MAP_HALF, inCrossing, laneOffset, laneOffsets, roadHeading, roadPoint, type Road,
} from '../world/cityLayout';
import { VEHICLE_TYPES, PARTS_PER_VEHICLE, type PartName, type VehicleType } from '../vehicles/vehicleTypes';

/**
 * AI traffic on the lane network: keep left, follow the vehicle ahead, wait at
 * busy junctions (then push through after a while — it's Delhi), turn at
 * junctions on a curve, honk when blocked. Rendering is instanced: 6 draw calls.
 */

export interface Obstacle {
  x: number;
  z: number;
  halfLen: number;
  isPlayer: boolean;
}

export interface TrafficContext {
  near: THREE.Vector3; // player position (spawning focus)
  obstacles: Obstacle[]; // player, bike, player car
  camera: THREE.Camera;
}

interface Turn {
  p0: THREE.Vector2; p1: THREE.Vector2; p2: THREE.Vector2;
  u: number; len: number;
  to: Road; toDir: 1 | -1; toLane: number; toT: number;
}

interface Car {
  type: VehicleType;
  road: Road; dir: 1 | -1; lane: number; t: number; offset: number;
  turn: Turn | null;
  decidedFor: Road | null;
  speed: number; cruise: number;
  x: number; z: number; heading: number;
  px: number; pz: number; ph: number;
  wait: number; honkCooldown: number; spin: number;
  body: RAPIER.RigidBody;
  colors: Record<PartName, THREE.Color>;
}

const DESPAWN = 140;
const LOOKAHEAD = 30;

export class Traffic {
  private cars: Car[] = [];
  private rng = new Rng(777);
  private meshes = new Map<PartName, THREE.InstancedMesh>();
  private m = new THREE.Matrix4();
  private m2 = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private up = new THREE.Vector3(0, 1, 0);
  private v = new THREE.Vector3();
  private s = new THREE.Vector3();
  /** Called when an AI vehicle honks (x, z, isAtPlayer). */
  onHonk?: (x: number, z: number, atPlayer: boolean) => void;

  constructor(scene: THREE.Scene, private readonly physics: Physics, count: number, near: THREE.Vector3) {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const lambert = new THREE.MeshLambertMaterial();
    const glow = new THREE.MeshBasicMaterial();
    for (const [part, n] of Object.entries(PARTS_PER_VEHICLE) as [PartName, number][]) {
      const mesh = new THREE.InstancedMesh(geo, part === 'headlight' || part === 'taillight' ? glow : lambert, count * n);
      mesh.castShadow = part !== 'headlight' && part !== 'taillight';
      mesh.receiveShadow = part === 'body' || part === 'roof';
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.meshes.set(part, mesh);
      scene.add(mesh);
    }
    for (let i = 0; i < count; i++) {
      const car = this.createCar();
      this.cars.push(car);
      this.respawn(car, near, 18, 110, null);
    }
    this.writeColors();
  }

  get count() {
    return this.cars.length;
  }

  private pickType(road: Road): VehicleType {
    const r = this.rng.next();
    if (road.median) {
      if (r < 0.12) return VEHICLE_TYPES.bus;
      if (r < 0.42) return VEHICLE_TYPES.auto;
      if (r < 0.72) return VEHICLE_TYPES.hatch;
      return VEHICLE_TYPES.sedan;
    }
    if (r < 0.35) return VEHICLE_TYPES.auto;
    if (r < 0.75) return VEHICLE_TYPES.hatch;
    return VEHICLE_TYPES.sedan;
  }

  private createCar(): Car {
    const body = this.physics.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased());
    const car: Car = {
      type: VEHICLE_TYPES.hatch, road: ROADS[0], dir: 1, lane: 0, t: 0, offset: 0, turn: null, decidedFor: null,
      speed: 0, cruise: 10, x: 0, z: 0, heading: 0, px: 0, pz: 0, ph: 0, wait: 0, honkCooldown: 0, spin: 0,
      body, colors: {} as Record<PartName, THREE.Color>,
    };
    return car;
  }

  /** Place a car on a random lane within [minD, maxD] of `near`, off-screen if a camera is given. */
  private respawn(car: Car, near: THREE.Vector3, minD: number, maxD: number, camera: THREE.Camera | null): boolean {
    const camDir = new THREE.Vector3();
    if (camera) camera.getWorldDirection(camDir);
    for (let attempt = 0; attempt < 60; attempt++) {
      const road = this.rng.chance(0.4) ? ROADS.find((r) => r.median)! : this.rng.pick(ROADS);
      const t = this.rng.float(-MAP_HALF + 20, MAP_HALF - 20);
      if (inCrossing(road, t, 4)) continue;
      const dir: 1 | -1 = this.rng.chance(0.5) ? 1 : -1;
      const lane = this.rng.int(0, laneOffsets(road).length - 1);
      const offset = laneOffset(road, dir, lane);
      const p = roadPoint(road, t, offset);
      const d = Math.hypot(p.x - near.x, p.z - near.z);
      if (d < minD || d > maxD) continue;
      if (camera && d < 80) {
        const dot = ((p.x - near.x) * camDir.x + (p.z - near.z) * camDir.z) / d;
        if (dot > 0.1) continue;
      }
      if (this.cars.some((o) => o !== car && Math.hypot(o.x - p.x, o.z - p.z) < 12)) continue;

      const type = this.pickType(road);
      if (type !== car.type || !car.colors.body) {
        car.type = type;
        while (car.body.numColliders() > 0) this.physics.world.removeCollider(car.body.collider(0), false);
        this.physics.world.createCollider(RAPIER.ColliderDesc.cuboid(type.half.x, type.half.y, type.half.z), car.body);
        this.assignColors(car);
      }
      Object.assign(car, {
        road, dir, lane, t, offset, turn: null, decidedFor: null,
        speed: 0, cruise: this.rng.float(type.cruise[0], type.cruise[1]),
        x: p.x, z: p.z, px: p.x, pz: p.z, heading: roadHeading(road, dir), wait: 0,
      });
      car.ph = car.heading;
      car.speed = car.cruise * 0.6;
      car.body.setTranslation({ x: p.x, y: type.half.y + 0.05, z: p.z }, true);
      car.body.setRotation(this.q.setFromAxisAngle(this.up, car.heading), true);
      return true;
    }
    return false;
  }

  private assignColors(car: Car) {
    const t = car.type;
    const body = new THREE.Color(this.rng.pick(t.bodyColors));
    car.colors = {
      body,
      roof: t.roofColor ? new THREE.Color(t.roofColor) : body,
      cabin: new THREE.Color(t.cabinColor),
      wheel: new THREE.Color('#161616'),
      headlight: new THREE.Color('#fff6d8'),
      taillight: new THREE.Color('#d32f2f'),
    };
  }

  private writeColors() {
    this.cars.forEach((car, i) => {
      const counters = new Map<PartName, number>();
      for (const part of car.type.parts) {
        const k = counters.get(part.part) ?? 0;
        counters.set(part.part, k + 1);
        this.meshes.get(part.part)!.setColorAt(i * PARTS_PER_VEHICLE[part.part] + k, car.colors[part.part]);
      }
    });
    for (const m of this.meshes.values()) if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }

  // ------------------------------------------------------------------ simulation

  fixedUpdate(dt: number, ctx: TrafficContext) {
    let recolor = false;
    for (const car of this.cars) {
      car.px = car.x;
      car.pz = car.z;
      car.ph = car.heading;
      car.honkCooldown = Math.max(0, car.honkCooldown - dt);

      const far = Math.hypot(car.x - ctx.near.x, car.z - ctx.near.z) > DESPAWN;
      const offMap = !car.turn && car.t * car.dir > MAP_HALF - 8;
      if (far || offMap) {
        const before = car.type;
        if (this.respawn(car, ctx.near, 45, 120, ctx.camera) && before !== car.type) recolor = true;
        continue;
      }

      // --- what is in front of us?
      const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
      let gap = Infinity;
      let blockedByPlayer = false;
      for (const o of this.cars) {
        if (o === car) continue;
        const rx = o.x - car.x, rz = o.z - car.z;
        const f = rx * fx + rz * fz;
        if (f <= 0 || f > LOOKAHEAD) continue;
        const lat = Math.abs(rx * fz - rz * fx);
        if (lat > 1.25 + o.type.half.x * 0.5) continue;
        // perpendicular traffic we've waited on long enough: push through
        const crossing = Math.abs(Math.cos(o.heading - car.heading)) < 0.5;
        if (crossing && car.wait > 3.5) continue;
        gap = Math.min(gap, f - car.type.half.z - o.type.half.z);
      }
      for (const o of ctx.obstacles) {
        const rx = o.x - car.x, rz = o.z - car.z;
        const f = rx * fx + rz * fz;
        if (f <= 0 || f > LOOKAHEAD) continue;
        if (Math.abs(rx * fz - rz * fx) > 1.5) continue;
        const g = f - car.type.half.z - o.halfLen;
        if (g < gap) {
          gap = g;
          blockedByPlayer = o.isPlayer;
        }
      }

      // --- junction logic (lane mode only)
      let stopGap = Infinity;
      if (!car.turn) {
        const next = this.nextCrossing(car);
        if (next) {
          const stopT = next.center - car.dir * (next.width / 2 + 0.6);
          const dist = (stopT - car.t) * car.dir;
          if (next !== car.decidedFor) {
            if (dist < 9 && car.wait < 4 && this.junctionBusy(car, next)) stopGap = dist;
            if (dist <= 0.4 && stopGap === Infinity) this.decide(car, next);
          }
        }
      }

      // --- speed control
      const cruise = car.turn ? car.cruise * 0.55 : car.cruise;
      const room = Math.min(gap, stopGap);
      const target = clamp((room - 1.6) * 1.1, 0, cruise);
      const rate = target < car.speed ? 9 : 2.6;
      car.speed = Math.max(0, car.speed + clamp(target - car.speed, -rate * dt, rate * dt));

      if (car.speed < 0.4 && target < 0.5) {
        car.wait += dt;
        const wantsHonk = blockedByPlayer ? car.wait > 0.8 : car.wait > 2.5 && this.rng.chance(dt * 0.6);
        if (wantsHonk && car.honkCooldown <= 0) {
          car.honkCooldown = this.rng.float(1.4, 3.2);
          this.onHonk?.(car.x, car.z, blockedByPlayer);
        }
      } else if (car.speed > 2) {
        car.wait = 0;
      }

      // --- move
      if (car.turn) this.advanceTurn(car, dt);
      else {
        car.t += car.dir * car.speed * dt;
        car.offset = damp(car.offset, laneOffset(car.road, car.dir, car.lane), 3, dt);
        const p = roadPoint(car.road, car.t, car.offset);
        car.x = p.x;
        car.z = p.z;
        car.heading = lerpAngle(car.heading, roadHeading(car.road, car.dir), 1 - Math.exp(-8 * dt));
      }
      car.spin += (car.speed * dt) / car.type.wheelRadius;
      car.body.setNextKinematicTranslation({ x: car.x, y: car.type.half.y + 0.05, z: car.z });
      car.body.setNextKinematicRotation(this.q.setFromAxisAngle(this.up, car.heading));
    }
    if (recolor) this.writeColors();
  }

  private nextCrossing(car: Car): Road | null {
    let best: Road | null = null;
    let bestD = Infinity;
    for (const r of ROADS) {
      if (r.axis === car.road.axis) continue;
      const d = (r.center - car.t) * car.dir;
      if (d > 0 && d < bestD) {
        bestD = d;
        best = r;
      }
    }
    return best;
  }

  /** Is another vehicle crossing the junction box right now? */
  private junctionBusy(car: Car, cross: Road): boolean {
    const c = roadPoint(car.road, cross.center, 0);
    const hx = (car.road.axis === 'x' ? cross.width : car.road.width) / 2 + 0.5;
    const hz = (car.road.axis === 'x' ? car.road.width : cross.width) / 2 + 0.5;
    return this.cars.some((o) => {
      if (o === car || Math.abs(o.x - c.x) > hx || Math.abs(o.z - c.z) > hz) return false;
      return Math.abs(Math.cos(o.heading - car.heading)) < 0.7 || o.turn !== null; // crossing or turning
    });
  }

  private decide(car: Car, cross: Road) {
    car.decidedFor = cross;
    if (!this.rng.chance(0.38)) return; // straight on
    const toDir: 1 | -1 = this.rng.chance(0.5) ? 1 : -1;
    const toLane = this.rng.int(0, laneOffsets(cross).length - 1);
    const toOffset = laneOffset(cross, toDir, toLane);
    const toT = car.road.center + toDir * (car.road.width / 2 + 0.6);
    if (Math.abs(toT) > MAP_HALF - 15) return;
    const a = roadPoint(car.road, car.t, car.offset);
    const corner = roadPoint(car.road, cross.center + toOffset, car.offset);
    const b = roadPoint(cross, toT, toOffset);
    const p0 = new THREE.Vector2(a.x, a.z), p1 = new THREE.Vector2(corner.x, corner.z), p2 = new THREE.Vector2(b.x, b.z);
    const len = (p0.distanceTo(p1) + p1.distanceTo(p2)) * 0.82 + 0.1;
    car.turn = { p0, p1, p2, u: 0, len, to: cross, toDir, toLane, toT };
  }

  private advanceTurn(car: Car, dt: number) {
    const tr = car.turn!;
    tr.u = Math.min(1, tr.u + (car.speed * dt) / tr.len);
    const u = tr.u, iu = 1 - u;
    car.x = iu * iu * tr.p0.x + 2 * iu * u * tr.p1.x + u * u * tr.p2.x;
    car.z = iu * iu * tr.p0.y + 2 * iu * u * tr.p1.y + u * u * tr.p2.y;
    const dx = 2 * iu * (tr.p1.x - tr.p0.x) + 2 * u * (tr.p2.x - tr.p1.x);
    const dz = 2 * iu * (tr.p1.y - tr.p0.y) + 2 * u * (tr.p2.y - tr.p1.y);
    if (dx * dx + dz * dz > 1e-6) car.heading = Math.atan2(dx, dz);
    if (u >= 1) {
      const from = car.road;
      car.road = tr.to;
      car.dir = tr.toDir;
      car.lane = tr.toLane;
      car.t = tr.toT;
      car.offset = laneOffset(car.road, car.dir, car.lane);
      car.heading = roadHeading(car.road, car.dir);
      car.decidedFor = from;
      car.turn = null;
    }
  }

  // ------------------------------------------------------------------ rendering

  render(alpha: number) {
    this.cars.forEach((car, i) => {
      const x = car.px + (car.x - car.px) * alpha;
      const z = car.pz + (car.z - car.pz) * alpha;
      const h = lerpAngle(car.ph, car.heading, alpha);
      this.m.compose(this.v.set(x, 0, z), this.q.setFromAxisAngle(this.up, h), this.s.set(1, 1, 1));
      const counters = new Map<PartName, number>();
      for (const p of car.type.parts) {
        const k = counters.get(p.part) ?? 0;
        counters.set(p.part, k + 1);
        this.m2.makeRotationX(p.part === 'wheel' ? car.spin : 0);
        this.m2.setPosition(p.x, p.y, p.z);
        this.m2.scale(this.s.set(p.sx, p.sy, p.sz));
        this.m2.premultiply(this.m);
        this.meshes.get(p.part)!.setMatrixAt(i * PARTS_PER_VEHICLE[p.part] + k, this.m2);
      }
    });
    for (const mesh of this.meshes.values()) mesh.instanceMatrix.needsUpdate = true;
  }
}
