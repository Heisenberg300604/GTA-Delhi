import * as THREE from 'three';
import { FIXED_DT, QUALITY_PRESETS, type Quality, CAMERA } from '../config';

export interface GameLoop {
  fixedUpdate(dt: number): void;
  update(dt: number, alpha: number): void;
}

/** Owns renderer, scene, camera and the fixed-timestep loop. Knows nothing about gameplay. */
export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly quality: Quality;

  private accumulator = 0;
  private last = 0;
  private loop?: GameLoop;
  /** Set by the game: called after each simulated tick batch (e.g. to clear latched input). */
  onTicksDone?: (ticks: number) => void;

  constructor(container: HTMLElement, quality: Quality) {
    this.quality = quality;
    const preset = QUALITY_PRESETS[quality];
    this.renderer = new THREE.WebGLRenderer({ antialias: preset.antialias, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(preset.pixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = preset.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(CAMERA.fov, window.innerWidth / window.innerHeight, 0.1, 1200);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  get canvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  start(loop: GameLoop) {
    this.loop = loop;
    this.last = performance.now();
    this.renderer.setAnimationLoop((now) => this.frame(now));
  }

  private frame(now: number) {
    const loop = this.loop!;
    const dt = Math.min((now - this.last) / 1000, 0.1);
    this.last = now;

    this.accumulator += dt;
    let ticks = 0;
    while (this.accumulator >= FIXED_DT && ticks < 5) {
      loop.fixedUpdate(FIXED_DT);
      this.accumulator -= FIXED_DT;
      ticks++;
    }
    if (ticks === 5) this.accumulator = 0; // avoid spiral of death after a stall
    this.onTicksDone?.(ticks);

    loop.update(dt, this.accumulator / FIXED_DT);
    this.renderer.render(this.scene, this.camera);
  }
}
