import * as THREE from 'three';

/** F3 stats: FPS, frame time, draw calls, triangles, memory. Compare against GDD §22 budgets. */
export class DebugOverlay {
  private el: HTMLPreElement;
  private frames = 0;
  private time = 0;
  private worst = 0;
  visible = import.meta.env.DEV; // F3 toggles; hidden by default in production builds

  constructor(parent: HTMLElement) {
    this.el = document.createElement('pre');
    this.el.className = 'debug';
    parent.appendChild(this.el);
    this.el.style.display = this.visible ? 'block' : 'none';
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F3' || e.code === 'Backquote') {
        e.preventDefault();
        this.visible = !this.visible;
        this.el.style.display = this.visible ? 'block' : 'none';
      }
    });
  }

  update(dt: number, renderer: THREE.WebGLRenderer, extra: Record<string, string>) {
    this.frames++;
    this.time += dt;
    this.worst = Math.max(this.worst, dt);
    if (this.time < 0.5 || !this.visible) return;
    const info = renderer.info;
    const fps = this.frames / this.time;
    const lines = [
      `FPS ${fps.toFixed(0)}  (${((this.time / this.frames) * 1000).toFixed(1)} ms, worst ${(this.worst * 1000).toFixed(1)} ms)`,
      `draw calls ${info.render.calls}   tris ${(info.render.triangles / 1000).toFixed(0)}k`,
      `geometries ${info.memory.geometries}   textures ${info.memory.textures}`,
      ...Object.entries(extra).map(([k, v]) => `${k} ${v}`),
    ];
    this.el.textContent = lines.join('\n');
    this.frames = 0;
    this.time = 0;
    this.worst = 0;
  }
}
