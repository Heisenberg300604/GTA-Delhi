import * as THREE from 'three';
import { Rng } from '../utils/random';

/** All world textures are drawn at runtime on canvases: zero downloads, tiny memory. */

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function toTexture(c: HTMLCanvasElement, repeat = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function speckle(ctx: CanvasRenderingContext2D, w: number, h: number, rng: Rng, count: number, alpha: number) {
  for (let i = 0; i < count; i++) {
    const v = rng.int(0, 255);
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha})`;
    ctx.fillRect(rng.int(0, w), rng.int(0, h), rng.int(1, 3), rng.int(1, 3));
  }
}

/** One floor × one bay of an upper storey: window with iron grille, slab band, weather streaks. */
export function makeWindowTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(128, 128);
  const rng = new Rng(11);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 128, 128);
  speckle(ctx, 128, 128, rng, 500, 0.06);
  // weathering streaks below the window
  for (let i = 0; i < 6; i++) {
    const g = ctx.createLinearGradient(0, 96, 0, 128);
    g.addColorStop(0, 'rgba(60,50,40,0.18)');
    g.addColorStop(1, 'rgba(60,50,40,0)');
    ctx.fillStyle = g;
    ctx.fillRect(rng.int(32, 92), 96, rng.int(2, 6), 32);
  }
  // floor slab band at the top of the tile
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(0, 0, 128, 7);
  // window frame + glass
  ctx.fillStyle = '#5b4a3a';
  ctx.fillRect(30, 26, 68, 66);
  const glass = ctx.createLinearGradient(0, 30, 0, 88);
  glass.addColorStop(0, '#41566b');
  glass.addColorStop(1, '#1d2731');
  ctx.fillStyle = glass;
  ctx.fillRect(34, 30, 60, 58);
  ctx.fillStyle = 'rgba(255,240,210,0.12)';
  ctx.fillRect(36, 32, 22, 54);
  // iron grille
  ctx.strokeStyle = '#26221e';
  ctx.lineWidth = 2;
  for (let x = 40; x < 94; x += 9) {
    ctx.beginPath(); ctx.moveTo(x, 30); ctx.lineTo(x, 88); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(34, 59); ctx.lineTo(94, 59); ctx.stroke();
  // sill
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(28, 92, 72, 5);
  return toTexture(c);
}

/** Ground-floor shopfronts: left half an open shop, right half a rolling shutter. */
export function makeShopTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(256, 128);
  const rng = new Rng(23);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 128);
  // open shop
  ctx.fillStyle = '#2b2119';
  ctx.fillRect(8, 22, 112, 106);
  ctx.fillStyle = '#f4f1e6';
  ctx.fillRect(14, 26, 100, 3); // tube light
  const goods = ['#c0392b', '#f1c40f', '#27ae60', '#2980b9', '#e67e22', '#ecf0f1', '#8e44ad'];
  for (let shelf = 0; shelf < 4; shelf++) {
    const y = 38 + shelf * 20;
    ctx.fillStyle = '#4a3a2c';
    ctx.fillRect(12, y + 14, 104, 3);
    for (let x = 14; x < 112; ) {
      const w = rng.int(5, 12);
      ctx.fillStyle = rng.pick(goods);
      ctx.fillRect(x, y + rng.int(0, 5), w, 14 - rng.int(0, 5));
      x += w + 2;
    }
  }
  ctx.fillStyle = '#6b5a48';
  ctx.fillRect(8, 112, 112, 16); // counter
  // shutter
  ctx.fillStyle = '#8f9399';
  ctx.fillRect(136, 22, 112, 106);
  for (let y = 24; y < 128; y += 5) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(136, y, 112, 1);
  }
  ctx.fillStyle = 'rgba(180,40,40,0.55)';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('NO PARKING', 150, 70);
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(186, 118, 12, 6); // lock
  // lintel shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(0, 16, 256, 6);
  speckle(ctx, 256, 128, rng, 400, 0.06);
  return toTexture(c);
}

export function makeAsphaltTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(256, 256);
  const rng = new Rng(5);
  ctx.fillStyle = '#4d4c4b';
  ctx.fillRect(0, 0, 256, 256);
  speckle(ctx, 256, 256, rng, 5000, 0.1);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = `rgba(20,20,20,${rng.float(0.08, 0.2)})`;
    ctx.beginPath();
    ctx.ellipse(rng.int(0, 256), rng.int(0, 256), rng.int(10, 40), rng.int(6, 24), rng.float(0, 3), 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = 'rgba(70,68,64,0.6)'; // patch repairs
    ctx.fillRect(rng.int(0, 220), rng.int(0, 220), rng.int(20, 50), rng.int(15, 35));
  }
  return toTexture(c);
}

export function makePavingTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(128, 128);
  const rng = new Rng(7);
  const tones = ['#a8998a', '#b3a493', '#9d8f80', '#b8a99a', '#a07f74'];
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      ctx.fillStyle = rng.pick(tones);
      ctx.fillRect(x * 32, y * 32, 32, 32);
    }
  }
  ctx.strokeStyle = 'rgba(40,30,25,0.45)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 4; i++) {
    ctx.beginPath(); ctx.moveTo(i * 32, 0); ctx.lineTo(i * 32, 128); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * 32); ctx.lineTo(128, i * 32); ctx.stroke();
  }
  speckle(ctx, 128, 128, rng, 600, 0.1);
  return toTexture(c);
}

export function makeGrassTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(128, 128);
  const rng = new Rng(9);
  ctx.fillStyle = '#6f8a3e';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 2500; i++) {
    ctx.fillStyle = rng.pick(['#5f7a33', '#7f9a48', '#8a8a4a', '#6a7f3a', '#9a8d5c']);
    ctx.fillRect(rng.int(0, 128), rng.int(0, 128), 2, rng.int(2, 4));
  }
  return toTexture(c);
}

export const SIGNS: [string, string, string, string][] = [
  // [main text, sub text, background, foreground]
  ['RAMESH CHAI CORNER', 'चाय • समोसा • मठरी', '#b3261e', '#fff4d6'],
  ['SWEET PINCH BAKERY', 'Cakes • Pastries • Patties', '#f6d7e3', '#7a1f45'],
  ["DOLMA AUNTY'S MOMOS", 'मोमोज़ • थुकपा • लाफिंग', '#1f6f5c', '#ffffff'],
  ['BHATURE JUNCTION', 'छोले भटूरे • लस्सी', '#f2a33a', '#3a1d00'],
  ['PHOTOSTAT & SPIRAL BINDING', 'फोटोस्टेट • लेमिनेशन', '#ffffff', '#1d3c8f'],
  ['SHANTI GIRLS PG', 'AC • WiFi • Homely Food', '#ffe066', '#7a2400'],
  ['ROYAL BOYS PG', 'Rooms Available', '#1d3c8f', '#ffffff'],
  ['BITTU TWO-WHEELER WORKS', 'Puncture • Service • Mods', '#141b2d', '#f5c518'],
  ['TURBOKART', '10 MIN DELIVERY • डार्क स्टोर', '#2f7d32', '#f5ff9e'],
  ['KAMLA BOOK DEPOT', 'Guides • Notes • Novels', '#6d1a1a', '#ffe9b0'],
  ['NEW STYLE TAILORS', 'टेलर्स • Alteration', '#ffffff', '#8a1c1c'],
  ['MITHAAS SWEETS', 'मिठाई • नमकीन', '#f7c948', '#8a1c1c'],
  ['MOBILE CARE', 'Repair • Recharge • Covers', '#e53935', '#ffffff'],
  ['DILLI DRY CLEANERS', 'ड्राई क्लीनर्स', '#bde0fe', '#0b3d91'],
  ['VIDYA STATIONERS', 'Pens • Files • Xerox', '#ffffff', '#2e7d32'],
  ['SANJEEVANI CHEMIST', 'दवाइयाँ • 24 HRS', '#2e7d32', '#ffffff'],
  ['ROOP CLOTH HOUSE', 'Suits • Sarees • Dupattas', '#7b1fa2', '#ffe0f7'],
  ['GOLDEN OPTICALS', 'Eye Testing Free', '#111111', '#f2c94c'],
  ['LOHA HARDWARE', 'हार्डवेयर • Paints', '#455a64', '#ffcc80'],
  ['ZAIKA BIRYANI', 'बिरयानी • कबाब', '#0d5c46', '#ffd166'],
  ['SPEED COACHING CENTRE', 'NEET • JEE • CUET', '#0b3d91', '#ffffff'],
  ['RAJDHANI ELECTRICALS', 'इलेक्ट्रिकल्स • Inverters', '#f9a825', '#1a1a1a'],
  ['NAYA FASHION', 'SALE 50% • सेल', '#d81b60', '#ffffff'],
  ['KULHAD CAFÉ', 'कुल्हड़ चाय • Maggi', '#5d4037', '#ffe0b2'],
  ['SUNDAR SALOON', 'Unisex • Facial', '#00897b', '#ffffff'],
  ['DESI BURGER POINT', 'Aloo Tikki ₹40', '#ff7043', '#ffffff'],
  ['LASSI WALA', 'लस्सी • शिकंजी', '#fff3e0', '#bf360c'],
  ['STUDENT XEROX', '₹1 per page', '#fffde7', '#212121'],
  ['PRINCE JUICE CORNER', 'जूस • शेक', '#43a047', '#fff59d'],
  ['NORBU ROOFTOP CAFÉ', 'Laphing • Butter Tea', '#8d1b1b', '#ffd54f'],
  ['SHEHNAI PALACE', 'Banquet • Weddings', '#4a148c', '#ffd700'],
  ['METRO GUEST HOUSE', 'गेस्ट हाउस', '#263238', '#80cbc4'],
];

export interface SignAtlas {
  texture: THREE.CanvasTexture;
  /** UV rect [u0, v0, u1, v1] for sign index. */
  uv(index: number): [number, number, number, number];
  count: number;
}

export function makeSignAtlas(): SignAtlas {
  const cols = 4, rows = 8, cw = 256, ch = 128;
  const [c, ctx] = canvas(cols * cw, rows * ch);
  SIGNS.forEach(([main, sub, bg, fg], i) => {
    const x = (i % cols) * cw, y = Math.floor(i / cols) * ch;
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, cw, ch);
    ctx.strokeStyle = fg;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 4;
    ctx.strokeRect(x + 6, y + 6, cw - 12, ch - 12);
    ctx.globalAlpha = 1;
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let size = 40;
    ctx.font = `900 ${size}px "Arial Black", Impact, sans-serif`;
    while (ctx.measureText(main).width > cw - 28 && size > 14) {
      size -= 2;
      ctx.font = `900 ${size}px "Arial Black", Impact, sans-serif`;
    }
    ctx.fillText(main, x + cw / 2, y + 52);
    ctx.font = `600 20px "Kohinoor Devanagari", "Nirmala UI", "Noto Sans Devanagari", sans-serif`;
    ctx.fillText(sub, x + cw / 2, y + 96);
  });
  const texture = toTexture(c, false);
  return {
    texture,
    count: SIGNS.length,
    uv(index: number) {
      const col = index % cols, row = Math.floor(index / cols);
      const pad = 0.002;
      // canvas row 0 is the top of the texture (v = 1)
      return [col / cols + pad, 1 - (row + 1) / rows + pad, (col + 1) / cols - pad, 1 - row / rows - pad];
    },
  };
}

export function makeLabelTexture(main: string, sub: string, bg: string, fg: string): THREE.CanvasTexture {
  const [c, ctx] = canvas(128, 128);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.font = '900 22px "Arial Black", sans-serif';
  ctx.fillText(main, 64, 58);
  ctx.font = '700 14px sans-serif';
  ctx.fillText(sub, 64, 84);
  return toTexture(c, false);
}
