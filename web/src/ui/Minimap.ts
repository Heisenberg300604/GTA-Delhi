import { ROADS, MAP_HALF, computeBlocks } from '../world/cityLayout';

/** Rotating minimap (camera-up), roads + blocks + player arrow + mission marker. */
export class Minimap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private blocks = computeBlocks();
  private readonly size = 200;
  private readonly scale = 1.1; // px per metre

  constructor(parent: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'minimap';
    this.canvas.width = this.canvas.height = this.size * 2; // retina
    parent.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
  }

  draw(px: number, pz: number, heading: number, cameraYaw: number, marker: { x: number; z: number } | null) {
    const ctx = this.ctx;
    const S = this.size * 2;
    const c = Math.cos(cameraYaw), s = Math.sin(cameraYaw);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, S, S);
    ctx.save();
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S / 2 - 4, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#2a2f3a';
    ctx.fillRect(0, 0, S, S);

    // world → screen: rotate so the camera's forward points up
    const k = this.scale * 2;
    ctx.setTransform(c * k, s * k, -s * k, c * k, S / 2 - (c * px - s * pz) * k, S / 2 - (s * px + c * pz) * k);
    for (const b of this.blocks) {
      ctx.fillStyle = b.kind === 'park' ? '#3f6b3a' : '#4a4f5c';
      ctx.fillRect(b.x0 + 1, b.z0 + 1, b.x1 - b.x0 - 2, b.z1 - b.z0 - 2);
    }
    ctx.fillStyle = '#7a7f8c';
    for (const r of ROADS) {
      if (r.axis === 'x') ctx.fillRect(-MAP_HALF, r.center - r.width / 2, MAP_HALF * 2, r.width);
      else ctx.fillRect(r.center - r.width / 2, -MAP_HALF, r.width, MAP_HALF * 2);
    }
    const main = ROADS.find((r) => r.median);
    if (main) {
      ctx.fillStyle = '#c9a93a';
      ctx.fillRect(-MAP_HALF, main.center - 0.6, MAP_HALF * 2, 1.2);
    }
    ctx.restore();

    // marker (clamped to the rim when off-map)
    if (marker) {
      const dx = marker.x - px, dz = marker.z - pz;
      let sx = (c * dx - s * dz) * k, sy = (s * dx + c * dz) * k;
      const r = Math.hypot(sx, sy), max = S / 2 - 22;
      if (r > max) {
        sx *= max / r;
        sy *= max / r;
      }
      ctx.fillStyle = '#f5c518';
      ctx.strokeStyle = '#141b2d';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(S / 2 + sx, S / 2 + sy, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // player arrow
    const a = heading - cameraYaw;
    const fx = Math.sin(a), fy = Math.cos(a); // screen-space facing (a = 0 means facing the camera)
    ctx.save();
    ctx.translate(S / 2, S / 2);
    ctx.rotate(Math.atan2(fx, -fy));
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#b3261e';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(11, 12);
    ctx.lineTo(0, 6);
    ctx.lineTo(-11, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    // rim
    ctx.strokeStyle = '#f2a33a';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S / 2 - 4, 0, Math.PI * 2);
    ctx.stroke();
  }
}
