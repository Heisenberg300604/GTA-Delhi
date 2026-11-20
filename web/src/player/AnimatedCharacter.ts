import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { CharacterView, Pose } from './CharacterView';

/**
 * Skinned GLB character (CC0 "Animated Human" by Quaternius, exported with
 * tools/blender/export_character.py). Colours come from a 32×32 palette
 * texture generated in code, so one model gives Aryan and every pedestrian.
 */

export interface Palette {
  skin: string;
  eyes: string;
  hair: string;
  shirt: string;
  pants: string;
}

export const ARYAN_PALETTE: Palette = {
  skin: '#7a4e33',
  eyes: '#161616',
  hair: '#120c08',
  shirt: '#2f7d32', // TurboKart rider green
  pants: '#2b3a55',
};

const TARGET_HEIGHT = 1.74;
/** Palette bands (rows of the 32 px texture, top-down) — measured from the source texture. */
const BANDS: [keyof Palette, number, number][] = [
  ['skin', 0, 6], ['eyes', 6, 11], ['hair', 11, 17], ['shirt', 17, 23], ['pants', 23, 32],
];

export function makePaletteTexture(p: Palette, existing?: THREE.CanvasTexture): THREE.CanvasTexture {
  const canvas = (existing?.image as HTMLCanvasElement | undefined) ?? document.createElement('canvas');
  canvas.width = canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  for (const [key, y0, y1] of BANDS) {
    ctx.fillStyle = p[key];
    ctx.fillRect(0, y0, 32, y1 - y0);
  }
  if (existing) {
    existing.needsUpdate = true;
    return existing;
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false; // glTF UV convention
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  return tex;
}

interface Template {
  scene: THREE.Object3D;
  clips: Map<string, THREE.AnimationClip>;
  scale: number;
  footOffset: number;
}

let template: Template | null = null;

/** Load once; call before creating characters. Resolves false if the asset is missing. */
export async function loadCharacterTemplate(url: string): Promise<boolean> {
  try {
    const gltf = await new GLTFLoader().loadAsync(url);
    const clips = new Map<string, THREE.AnimationClip>();
    for (const clip of gltf.animations) {
      // keep animations in place: freeze the hips' horizontal travel
      for (const track of clip.tracks) {
        if (/Hips\.position$/.test(track.name)) {
          const v = track.values;
          for (let i = 0; i < v.length; i += 3) {
            v[i] = v[0];
            v[i + 2] = v[2];
          }
        }
      }
      clips.set(clip.name, clip);
    }
    gltf.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(gltf.scene, true);
    const height = box.max.y - box.min.y;
    const scale = TARGET_HEIGHT / height;
    template = { scene: gltf.scene, clips, scale, footOffset: -box.min.y * scale };
    return true;
  } catch (err) {
    console.warn('Character GLB not available, using placeholder rig', err);
    return false;
  }
}

export function characterTemplateLoaded(): boolean {
  return template !== null;
}

const AXIS_X = new THREE.Vector3(1, 0, 0);

export class AnimatedCharacter implements CharacterView {
  readonly root = new THREE.Group();
  private model: THREE.Object3D;
  private mixer: THREE.AnimationMixer;
  private actions = new Map<string, THREE.AnimationAction>();
  private current: THREE.AnimationAction | null = null;
  private pose: Pose = 'ground';
  private oneShot = 0;
  /** Clip forced by a script (cutscene actors), overriding locomotion. */
  private scripted: string | null = null;
  private bones = new Map<string, THREE.Bone>();
  private texture: THREE.CanvasTexture;
  private tmpQ = new THREE.Quaternion();
  private tmpQ2 = new THREE.Quaternion();
  private worldAxis = new THREE.Vector3();

  constructor(palette: Palette = ARYAN_PALETTE) {
    if (!template) throw new Error('loadCharacterTemplate() first');
    this.model = SkeletonUtils.clone(template.scene);
    this.model.scale.setScalar(template.scale);
    this.model.position.y = template.footOffset;
    this.root.add(this.model);

    this.texture = makePaletteTexture(palette);
    const material = new THREE.MeshLambertMaterial({ map: this.texture });
    this.model.traverse((o) => {
      if ((o as THREE.SkinnedMesh).isSkinnedMesh) {
        const m = o as THREE.SkinnedMesh;
        m.material = material;
        m.castShadow = true;
        m.frustumCulled = false;
      }
      if ((o as THREE.Bone).isBone) this.bones.set(o.name, o as THREE.Bone);
    });

    this.mixer = new THREE.AnimationMixer(this.model);
    for (const [name, clip] of template.clips) {
      const a = this.mixer.clipAction(clip);
      if (name === 'Jump' || name === 'Punch' || name === 'Death') {
        a.setLoop(THREE.LoopOnce, 1);
        a.clampWhenFinished = true;
      }
      this.actions.set(name, a);
    }
    this.play('Idle', 0);
    this.mixer.addEventListener('finished', (e) => {
      if (e.action === this.actions.get('Punch')) this.oneShot = 0;
    });
  }

  setPalette(p: Palette) {
    makePaletteTexture(p, this.texture);
  }

  /** Offset the animation clock so crowds don't walk in lock-step. */
  randomizePhase(seed: number) {
    this.mixer.setTime(seed * 10);
  }

  private play(name: string, fade = 0.2, timeScale = 1) {
    const next = this.actions.get(name);
    if (!next) return;
    next.timeScale = timeScale;
    if (next === this.current) return;
    next.reset().setEffectiveWeight(1).play();
    if (this.current && fade > 0) this.current.crossFadeTo(next, fade, false);
    else if (this.current) this.current.stop();
    this.current = next;
  }

  setPose(pose: Pose) {
    if (pose === this.pose) return;
    const wasAir = this.pose === 'air';
    this.pose = pose;
    if (pose === 'air' && !wasAir) {
      const jump = this.actions.get('Jump');
      if (jump) {
        this.play('Jump', 0.1, 1.2);
        jump.time = jump.getClip().duration * 0.25; // skip the crouch: we're already airborne
      }
    }
    if (pose === 'ride') this.play('Idle', 0);
  }

  /** Force a clip (e.g. 'Working' for the chaiwala); null returns to locomotion. */
  setAction(name: string | null, timeScale = 1) {
    this.scripted = name;
    if (name) this.play(name, 0.25, timeScale);
  }

  punch() {
    if (this.pose !== 'ground' || this.oneShot > 0) return;
    this.oneShot = 1;
    this.play('Punch', 0.08, 1.6);
  }

  update(dt: number, speed: number) {
    if (this.pose === 'ground' && this.oneShot === 0 && !this.scripted) {
      if (speed < 0.2) this.play('Idle', 0.25);
      else if (speed < 4.2) this.play('Walk', 0.2, THREE.MathUtils.clamp(speed / 1.9, 0.6, 1.7));
      else this.play('Run', 0.2, THREE.MathUtils.clamp(speed / 6, 0.75, 1.4));
    }
    if (this.current) {
      // keep timeScale responsive to speed while staying in the same clip
      const name = this.current.getClip().name;
      if (name === 'Walk') this.current.timeScale = THREE.MathUtils.clamp(speed / 1.9, 0.6, 1.7);
      if (name === 'Run') this.current.timeScale = THREE.MathUtils.clamp(speed / 6, 0.75, 1.4);
    }
    this.mixer.update(dt);
    if (this.pose === 'ride') this.applyRidePose();
  }

  /** Sitting astride a bike: bend joints around the character's side axis on top of Idle. */
  private applyRidePose() {
    this.root.updateWorldMatrix(true, true);
    this.worldAxis.copy(AXIS_X).applyQuaternion(this.root.getWorldQuaternion(this.tmpQ2)).normalize();
    const bend = (name: string, angle: number) => {
      const b = this.bones.get(name);
      if (!b || !b.parent) return;
      b.parent.updateWorldMatrix(true, false);
      const pw = b.parent.getWorldQuaternion(this.tmpQ2);
      const delta = this.tmpQ.setFromAxisAngle(this.worldAxis, angle);
      // local' = inv(Pw) · Δ · Pw · local
      b.quaternion.premultiply(pw.clone().invert().multiply(delta).multiply(pw));
      b.updateWorldMatrix(false, true);
    };
    bend('Spine', 0.25);
    bend('LeftUpLeg', -1.35);
    bend('RightUpLeg', -1.35);
    bend('LeftLeg', 1.45);
    bend('RightLeg', 1.45);
    bend('LeftArm', -0.9);
    bend('RightArm', -0.9);
  }
}
