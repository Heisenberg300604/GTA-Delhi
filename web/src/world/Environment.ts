import * as THREE from 'three';
import { QUALITY_PRESETS, type Quality } from '../config';

export interface LightingPreset {
  skyTop: string;
  horizon: string;
  fogNear: number;
  fogFar: number;
  sunColor: string;
  sunIntensity: number;
  sunDir: [number, number, number];
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  exposure: number;
}

/** "Golden hour, Kamla Nagar": the M1 mood. More presets arrive with missions. */
export const GOLDEN_HOUR: LightingPreset = {
  skyTop: '#5f86b8',
  horizon: '#f0c39a',
  fogNear: 70,
  fogFar: 340,
  sunColor: '#ffd3a3',
  sunIntensity: 2.6,
  sunDir: [-0.62, 0.42, 0.28],
  hemiSky: '#b9d0ea',
  hemiGround: '#8a6a4c',
  hemiIntensity: 1.25,
  exposure: 1.0,
};

/** Sky dome, sun (with a shadow frustum that follows the player), hemisphere fill and haze. */
export class Environment {
  readonly sun: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private sky: THREE.Mesh;
  private sunDir = new THREE.Vector3();

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer, quality: Quality, preset = GOLDEN_HOUR) {
    const q = QUALITY_PRESETS[quality];
    this.sunDir.set(...preset.sunDir).normalize();

    scene.fog = new THREE.Fog(preset.horizon, preset.fogNear, preset.fogFar);
    scene.background = new THREE.Color(preset.horizon);
    renderer.toneMappingExposure = preset.exposure;

    this.hemi = new THREE.HemisphereLight(preset.hemiSky, preset.hemiGround, preset.hemiIntensity);
    scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(preset.sunColor, preset.sunIntensity);
    this.sun.castShadow = q.shadows;
    this.sun.shadow.mapSize.set(q.shadowMap, q.shadowMap);
    const s = 45;
    Object.assign(this.sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 260 });
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.04;
    scene.add(this.sun, this.sun.target);

    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(900, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          top: { value: new THREE.Color(preset.skyTop) },
          horizon: { value: new THREE.Color(preset.horizon) },
          sunColor: { value: new THREE.Color(preset.sunColor) },
          sunDir: { value: this.sunDir },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 top; uniform vec3 horizon; uniform vec3 sunColor; uniform vec3 sunDir;
          varying vec3 vDir;
          void main() {
            vec3 d = normalize(vDir);
            float h = max(d.y, 0.0);
            vec3 col = mix(horizon, top, pow(smoothstep(0.0, 0.6, h), 0.8));
            float s = max(dot(d, sunDir), 0.0);
            col += sunColor * (pow(s, 900.0) * 3.0 + pow(s, 12.0) * 0.35);
            gl_FragColor = vec4(col, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      }),
    );
    this.sky.renderOrder = -1;
    this.sky.frustumCulled = false;
    scene.add(this.sky);
  }

  /** Keep the sky centred on the camera and the shadow frustum centred on the action. */
  update(cameraPos: THREE.Vector3, focus: THREE.Vector3) {
    this.sky.position.copy(cameraPos);
    // Snap to a grid so shadow edges don't shimmer as the player moves.
    const snap = 0.5;
    const fx = Math.round(focus.x / snap) * snap;
    const fz = Math.round(focus.z / snap) * snap;
    this.sun.target.position.set(fx, 0, fz);
    this.sun.position.set(fx + this.sunDir.x * 120, this.sunDir.y * 120, fz + this.sunDir.z * 120);
  }
}
