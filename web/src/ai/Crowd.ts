import * as THREE from 'three';
import { RAPIER, Physics } from '../physics/Physics';
import { Rng } from '../utils/random';
import { clamp, damp, dampAngle } from '../utils/math';
import { computeBlocks, KERB, type Block } from '../world/cityLayout';

/**
 * Pedestrians walking the pavement loops around each block.
 *
 * Rendering: every body part is one InstancedMesh shared by all pedestrians,
 * so the whole crowd costs ~11 draw calls no matter how many people there are.
 * Poses are computed on a single invisible template skeleton per pedestrian
 * per frame and copied into the instance matrices.
 */

const LANE_INSET = 2.15; // metres in from the kerb edge
const DESPAWN = 100;
const SPAWN_MIN = 35;
const SPAWN_MAX = 80;

const SKIN = ['#5c3a24', '#6e4429', '#7a4b2e', '#8d5a3c', '#a8714a', '#c48b5f'];
const TOPS = ['#ffffff', '#e8e2d0', '#1d3c8f', '#8a1c1c', '#2e7d32', '#f9a825', '#6a1b9a', '#ff7043', '#455a64', '#00897b', '#d81b60', '#90a4ae', '#3e2723'];
const LEGS = ['#2b3a55', '#1f1f1f', '#8d7b5a', '#e9e4d8', '#4e5b6e', '#5d4037'];
const SALWAR = ['#f8bbd0', '#ffe082', '#b2dfdb', '#ffffff', '#e1bee7', '#c5e1a5'];
const HAIR = ['#120d0a', '#1c140f', '#2b1d14', '#7d7d7d'];
const SHOES = ['#ececec', '#1a1a1a', '#6d4c33', '#8d6e63'];

const BARKS = [
  'Oye! Dekh ke chala!',
  'Abe andhe, dikhta nahi?',
  'Bhaiya, side se!',
  'Arre arre arre!',
  'Pagal hai kya?',
  'Footpath pe bike? Waah bhai waah.',
  'Dheere chala, bhai!',
];

type PartName =
  | 'hips' | 'torso' | 'dupatta' | 'head' | 'hair' | 'hairBack'
  | 'upperArm' | 'forearm' | 'upperLeg' | 'lowerLeg' | 'shoe';

interface Ped {
  loop: number; // index into loops
  s: number; // distance along the loop perimeter
  dir: 1 | -1;
  speed: number;
  baseSpeed: number;
  side: number; // lateral offset (+ = towards buildings)
  sideTarget: number;
  x: number; z: number; px: number; pz: number;
  facing: number;
  phase: number;
  idle: number;
  panic: number;
  female: boolean;
  kurta: boolean;
  colors: Record<PartName, THREE.Color>;
  body: RAPIER.RigidBody;
  visible: boolean;
}

interface Loop {
  x0: number; z0: number; x1: number; z1: number;
  perimeter: number;
}

export interface CrowdContext {
  playerPos: THREE.Vector3;
  playerOnFoot: boolean;
  bikePos: THREE.Vector3;
  bikeHeading: number;
  bikeSpeed: number;
  horn: boolean;
  camera: THREE.Camera;
}

export class Crowd {
  private peds: Ped[] = [];
  private loops: Loop[];
  private rng = new Rng(4242);
  private meshes = new Map<PartName, THREE.InstancedMesh>();
  private template = new Template();
  private barkCooldown = 0;
  /** Set by the game to show subtitles. */
  onBark?: (text: string) => void;

  constructor(scene: THREE.Scene, private readonly physics: Physics, count: number, near: THREE.Vector3) {
    this.loops = computeBlocks().map((b: Block) => {
      const x0 = b.x0 + LANE_INSET, x1 = b.x1 - LANE_INSET, z0 = b.z0 + LANE_INSET, z1 = b.z1 - LANE_INSET;
      return { x0, x1, z0, z1, perimeter: 2 * (x1 - x0 + z1 - z0) };
    });

    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshLambertMaterial();
    const perPed: Record<PartName, number> = {
      hips: 1, torso: 1, dupatta: 1, head: 1, hair: 1, hairBack: 1,
      upperArm: 2, forearm: 2, upperLeg: 2, lowerLeg: 2, shoe: 2,
    };
    for (const [name, n] of Object.entries(perPed) as [PartName, number][]) {
      const m = new THREE.InstancedMesh(geo, mat, count * n);
      m.castShadow = true;
      m.frustumCulled = false; // instances span the whole map; bounds would be stale
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.meshes.set(name, m);
      scene.add(m);
    }

    for (let i = 0; i < count; i++) this.peds.push(this.createPed(near));
    this.writeColors();
  }

  private createPed(near: THREE.Vector3): Ped {
    const r = this.rng;
    const female = r.chance(0.45);
    const kurta = r.chance(female ? 0.6 : 0.25);
    const skin = new THREE.Color(r.pick(SKIN));
    const top = new THREE.Color(r.pick(TOPS));
    const legs = new THREE.Color(female && kurta ? r.pick(SALWAR) : r.pick(LEGS));
    const hair = new THREE.Color(r.chance(0.12) ? HAIR[3] : r.pick(HAIR.slice(0, 3)));
    const colors: Record<PartName, THREE.Color> = {
      hips: legs, torso: top, dupatta: new THREE.Color(r.pick(SALWAR)).multiplyScalar(0.9), head: skin, hair, hairBack: hair,
      upperArm: top, forearm: skin, upperLeg: legs, lowerLeg: legs, shoe: new THREE.Color(r.pick(SHOES)),
    };
    const body = this.physics.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased());
    this.physics.world.createCollider(RAPIER.ColliderDesc.capsule(0.55, 0.26), body);
    const baseSpeed = r.float(1.0, 1.6);
    const ped: Ped = {
      loop: 0, s: 0, dir: r.chance(0.5) ? 1 : -1, speed: baseSpeed, baseSpeed,
      side: 0, sideTarget: r.float(-0.5, 0.5), x: 0, z: 0, px: 0, pz: 0,
      facing: 0, phase: r.float(0, 6), idle: 0, panic: 0, female, kurta, colors, body, visible: true,
    };
    this.placeRandomly(ped, near, 0, SPAWN_MAX, null);
    return ped;
  }

  /** Put a pedestrian on a random loop point within [minD, maxD] of `near`, preferably off-screen. */
  private placeRandomly(p: Ped, near: THREE.Vector3, minD: number, maxD: number, camera: THREE.Camera | null) {
    const camDir = new THREE.Vector3();
    if (camera) camera.getWorldDirection(camDir);
    for (let attempt = 0; attempt < 40; attempt++) {
      const li = Math.floor(this.rng.next() * this.loops.length);
      const loop = this.loops[li];
      const s = this.rng.float(0, loop.perimeter);
      const pt = loopPoint(loop, s);
      const d = Math.hypot(pt.x - near.x, pt.z - near.z);
      if (d < minD || d > maxD) continue;
      if (camera && d < 60) {
        const dot = ((pt.x - near.x) * camDir.x + (pt.z - near.z) * camDir.z) / (d || 1);
        if (dot > 0.2) continue; // in front of the camera: don't pop in
      }
      p.loop = li;
      p.s = s;
      p.side = p.sideTarget;
      const pos = this.position(p);
      p.x = p.px = pos.x;
      p.z = p.pz = pos.z;
      p.body.setTranslation({ x: p.x, y: KERB + 0.81, z: p.z }, true);
      p.idle = 0;
      p.panic = 0;
      return;
    }
  }

  private position(p: Ped): { x: number; z: number; tx: number; tz: number } {
    const loop = this.loops[p.loop];
    const pt = loopPoint(loop, p.s);
    // inward normal of the loop (towards the buildings) = left-hand side of the clockwise tangent
    const nx = -pt.tz, nz = pt.tx;
    return { x: pt.x + nx * p.side, z: pt.z + nz * p.side, tx: pt.tx * p.dir, tz: pt.tz * p.dir };
  }

  fixedUpdate(dt: number, ctx: CrowdContext) {
    this.barkCooldown = Math.max(0, this.barkCooldown - dt);
    const bfx = Math.sin(ctx.bikeHeading), bfz = Math.cos(ctx.bikeHeading);
    let nearestThreat: Ped | null = null;
    let nearestThreatD = Infinity;

    for (const p of this.peds) {
      p.px = p.x;
      p.pz = p.z;
      const dPlayer = Math.hypot(p.x - ctx.playerPos.x, p.z - ctx.playerPos.z);
      if (dPlayer > DESPAWN) {
        this.placeRandomly(p, ctx.playerPos, SPAWN_MIN, SPAWN_MAX, ctx.camera);
        continue;
      }

      // --- threats: an approaching bike or a horn
      const bx = p.x - ctx.bikePos.x, bz = p.z - ctx.bikePos.z;
      const bd = Math.hypot(bx, bz);
      const ahead = (bx * bfx + bz * bfz) * Math.sign(ctx.bikeSpeed || 1);
      const lateral = Math.abs(bx * bfz - bz * bfx);
      const bikeThreat = Math.abs(ctx.bikeSpeed) > 3 && bd < 9 && ahead > 0 && lateral < 2.2;
      if (bikeThreat || (ctx.horn && bd < 14)) {
        if (p.panic <= 0 && bikeThreat && bd < nearestThreatD) {
          nearestThreat = p;
          nearestThreatD = bd;
        }
        p.panic = bikeThreat ? 1.6 : Math.max(p.panic, 0.6);
        p.idle = 0;
        // step away from the bike's path, towards the buildings if possible
        const pos = this.position(p);
        const nx = -pos.tz * p.dir, nz = pos.tx * p.dir; // inward normal
        const awaySign = (bx * nx + bz * nz) >= 0 ? 1 : -1;
        p.sideTarget = clamp(p.side + awaySign * 1.6, -1.4, 1.5);
      }

      // --- the player on foot: slow down and sidestep instead of walking into him
      if (ctx.playerOnFoot && dPlayer < 1.6) {
        const pos = this.position(p);
        const toPlayer = (ctx.playerPos.x - p.x) * pos.tx + (ctx.playerPos.z - p.z) * pos.tz;
        if (toPlayer > 0) {
          p.speed = damp(p.speed, 0.3, 8, dt);
          p.sideTarget = clamp(p.side + (p.side > 0 ? -1 : 1) * 0.9, -1.4, 1.5);
        }
      }

      // --- locomotion
      if (p.panic > 0) {
        p.panic -= dt;
        p.speed = damp(p.speed, 4.2, 6, dt);
      } else if (p.idle > 0) {
        p.idle -= dt;
        p.speed = damp(p.speed, 0, 6, dt);
      } else {
        p.speed = damp(p.speed, p.baseSpeed, 3, dt);
        if (this.rng.chance(dt * 0.025)) p.idle = this.rng.float(2, 6);
        if (this.rng.chance(dt * 0.05)) p.sideTarget = this.rng.float(-0.6, 0.6);
      }
      p.side = damp(p.side, p.sideTarget, 4, dt);
      const loop = this.loops[p.loop];
      p.s = (p.s + p.dir * p.speed * dt + loop.perimeter) % loop.perimeter;
      const pos = this.position(p);
      p.x = pos.x;
      p.z = pos.z;
      if (p.speed > 0.2) p.facing = dampAngle(p.facing, Math.atan2(pos.tx, pos.tz), 8, dt);
      else if (p.idle > 0) p.facing = dampAngle(p.facing, Math.atan2(pos.tz * p.dir, -pos.tx * p.dir), 2, dt); // face the street
      p.body.setNextKinematicTranslation({ x: p.x, y: KERB + 0.81, z: p.z });
    }

    if (nearestThreat && this.barkCooldown <= 0) {
      this.barkCooldown = 3.5;
      this.onBark?.(this.rng.pick(BARKS));
    }
  }

  /** Pose every pedestrian and upload instance matrices. */
  render(alpha: number, dt: number, cameraPos: THREE.Vector3) {
    const t = this.template;
    let i = 0;
    for (const p of this.peds) {
      const x = p.px + (p.x - p.px) * alpha;
      const z = p.pz + (p.z - p.pz) * alpha;
      const far = Math.hypot(x - cameraPos.x, z - cameraPos.z) > 140;
      p.phase += dt * (p.speed > 0.15 ? 4 + p.speed * 1.4 : 0);
      t.pose(x, KERB, z, p.facing, p.phase, p.speed, p);
      for (const [name, objs] of t.parts) {
        const mesh = this.meshes.get(name)!;
        objs.forEach((o, k) => {
          mesh.setMatrixAt(i * objs.length + k, far ? ZERO : o.matrixWorld);
        });
      }
      i++;
    }
    for (const m of this.meshes.values()) m.instanceMatrix.needsUpdate = true;
  }

  private writeColors() {
    this.peds.forEach((p, i) => {
      for (const [name, objs] of this.template.parts) {
        const mesh = this.meshes.get(name)!;
        objs.forEach((_, k) => mesh.setColorAt(i * objs.length + k, p.colors[name]));
      }
    });
    for (const m of this.meshes.values()) if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }

  get count() {
    return this.peds.length;
  }
}

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

function loopPoint(l: Loop, s: number): { x: number; z: number; tx: number; tz: number } {
  const w = l.x1 - l.x0, d = l.z1 - l.z0;
  if (s < w) return { x: l.x0 + s, z: l.z0, tx: 1, tz: 0 };
  s -= w;
  if (s < d) return { x: l.x1, z: l.z0 + s, tx: 0, tz: 1 };
  s -= d;
  if (s < w) return { x: l.x1 - s, z: l.z1, tx: -1, tz: 0 };
  s -= w;
  return { x: l.x0, z: l.z1 - s, tx: 0, tz: -1 };
}

/** Invisible skeleton (same proportions as CharacterRig) used to compute part matrices. */
class Template {
  readonly root = new THREE.Group();
  readonly parts = new Map<PartName, THREE.Object3D[]>();
  private hips = new THREE.Group();
  private torso = new THREE.Group();
  private head = new THREE.Group();
  private legs: THREE.Group[] = [];
  private knees: THREE.Group[] = [];
  private arms: THREE.Group[] = [];
  private elbows: THREE.Group[] = [];
  private torsoBox: THREE.Object3D;
  private dupatta: THREE.Object3D;
  private hairBack: THREE.Object3D;

  constructor() {
    const part = (name: PartName, parent: THREE.Object3D, sx: number, sy: number, sz: number, y = 0, z = 0) => {
      const o = new THREE.Object3D();
      o.position.set(0, y, z);
      o.scale.set(sx, sy, sz);
      parent.add(o);
      if (!this.parts.has(name)) this.parts.set(name, []);
      this.parts.get(name)!.push(o);
      return o;
    };
    const group = (parent: THREE.Object3D, x: number, y: number) => {
      const g = new THREE.Group();
      g.position.set(x, y, 0);
      parent.add(g);
      return g;
    };
    this.root.add(this.hips);
    this.hips.position.y = 0.95;
    part('hips', this.hips, 0.34, 0.16, 0.21, 0.02);
    this.hips.add(this.torso);
    this.torsoBox = part('torso', this.torso, 0.42, 0.56, 0.24, 0.32);
    this.dupatta = part('dupatta', this.torso, 0.46, 0.07, 0.28, 0.52, 0.02);
    this.torso.add(this.head);
    this.head.position.y = 0.8;
    part('head', this.head, 0.23, 0.26, 0.24);
    part('hair', this.head, 0.25, 0.09, 0.26, 0.13, -0.01);
    this.hairBack = part('hairBack', this.head, 0.25, 0.2, 0.06, 0.02, -0.11);
    for (const x of [-0.27, 0.27]) {
      const arm = group(this.torso, x, 0.56);
      part('upperArm', arm, 0.11, 0.3, 0.12, -0.15);
      const elbow = group(arm, 0, -0.3);
      part('forearm', elbow, 0.09, 0.32, 0.1, -0.16);
      this.arms.push(arm);
      this.elbows.push(elbow);
    }
    for (const x of [-0.1, 0.1]) {
      const leg = group(this.hips, x, 0);
      part('upperLeg', leg, 0.14, 0.46, 0.16, -0.23);
      const knee = group(leg, 0, -0.46);
      part('lowerLeg', knee, 0.12, 0.44, 0.14, -0.22);
      part('shoe', knee, 0.13, 0.08, 0.26, -0.45, 0.05);
      this.legs.push(leg);
      this.knees.push(knee);
    }
  }

  pose(x: number, y: number, z: number, facing: number, phase: number, speed: number, p: Ped) {
    this.root.position.set(x, y, z);
    this.root.rotation.y = facing;
    // outfit variations
    this.torsoBox.scale.y = p.kurta ? 0.86 : 0.56;
    this.torsoBox.position.y = p.kurta ? 0.18 : 0.32;
    this.dupatta.scale.set(p.female ? 0.46 : 0, 0.07, 0.28);
    this.hairBack.scale.y = p.female ? 0.5 : 0.2;
    this.hairBack.position.y = p.female ? -0.12 : 0.02;

    const moving = speed > 0.15;
    const amp = moving ? 0.3 + 0.45 * clamp(speed / 4.5, 0, 1) : 0;
    const s = Math.sin(phase), c = Math.cos(phase);
    const run = clamp((speed - 2) / 2.5, 0, 1);
    this.hips.position.y = 0.95 + (moving ? Math.abs(c) * 0.04 : 0);
    this.torso.rotation.x = 0.04 + run * 0.2;
    this.legs[0].rotation.x = s * amp;
    this.legs[1].rotation.x = -s * amp;
    this.knees[0].rotation.x = Math.max(0, -c) * amp * 1.5 + 0.04;
    this.knees[1].rotation.x = Math.max(0, c) * amp * 1.5 + 0.04;
    this.arms[0].rotation.x = -s * amp * 0.8;
    this.arms[1].rotation.x = s * amp * 0.8;
    this.arms[0].rotation.z = 0.06;
    this.arms[1].rotation.z = -0.06;
    this.elbows[0].rotation.x = this.elbows[1].rotation.x = -0.2 - run * 0.9;
    this.root.updateMatrixWorld(true);
  }
}
