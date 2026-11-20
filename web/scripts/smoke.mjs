// Headless smoke test: boots the game in your installed Chrome, drives the player
// and the bike with simulated keys, checks state, saves screenshots.
// Usage: npm run dev (in another terminal), then: node scripts/smoke.mjs [outDir]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'smoke-out';
mkdirSync(out, { recursive: true });
const url = process.env.URL ?? 'http://localhost:5173/';

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

await page.goto(url);
await page.waitForFunction(() => window.__game, null, { timeout: 30000 });
await page.evaluate(() => { document.querySelector('.hud-overlay').style.display = 'none'; });
await page.waitForTimeout(1500);
const g = (fn) => page.evaluate(fn);
const state = () => g(() => {
  const s = window.__game;
  const p = s.state === 'bike' ? s.bike.position : s.player.position;
  return { state: s.state, x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), kmh: +s.bike.kmh.toFixed(1), grounded: s.player.grounded };
});
const hold = async (key, ms) => { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); };

const results = [];
const check = (name, ok, info) => { results.push({ name, ok, info }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${JSON.stringify(info)}`); };

const s0 = await state();
check('spawns on foot, grounded', s0.state === 'foot' && s0.grounded, s0);
await page.screenshot({ path: `${out}/01-spawn.png` });

const pedSample = () => g(() => window.__game.crowd.peds.slice(0, 8).map((p) => [p.x, p.z]));
const pedsA = await pedSample();
await page.waitForTimeout(1000);
const pedsB = await pedSample();
const movedPeds = pedsA.filter((a, i) => Math.hypot(a[0] - pedsB[i][0], a[1] - pedsB[i][1]) > 0.3).length;
const nearPeds = await g(() => window.__game.crowd.peds.filter((p) => Math.hypot(p.x - window.__game.player.position.x, p.z - window.__game.player.position.z) < 60).length);
check('pedestrians spawn near the player and walk', nearPeds >= 5 && movedPeds >= 4, { nearPeds, movedPeds });

await hold('KeyW', 1200);
const s1 = await state();
check('walks forward (+x)', s1.x > s0.x + 1.5, { from: s0.x, to: s1.x });

await page.keyboard.down('ShiftLeft'); await hold('KeyW', 800); await page.keyboard.up('ShiftLeft');
const s2 = await state();
check('runs faster', s2.x - s1.x > 3, { dx: +(s2.x - s1.x).toFixed(2) });

await page.keyboard.press('Space');
await page.waitForTimeout(250);
const s3 = await state();
check('jumps', s3.y > s2.y + 0.3, { y0: s2.y, y1: s3.y });
await page.waitForTimeout(900);

// teleport next to the bike and mount
await g(() => { const s = window.__game; const b = s.bike.position; s.player.teleport({ x: b.x + 1.2, y: 0, z: b.z, setY() {} , clone() { return this; } }, 0); });
await page.waitForTimeout(300);
await page.keyboard.press('KeyF');
await page.waitForTimeout(300);
const s4 = await state();
check('mounts bike with F', s4.state === 'bike', s4);
await page.screenshot({ path: `${out}/02-on-bike.png` });

await hold('KeyW', 3000);
const s5 = await state();
check('bike accelerates', s5.kmh > 30, s5);
await page.screenshot({ path: `${out}/03-riding.png` });

await page.keyboard.down('KeyW'); await hold('KeyA', 900); await page.keyboard.up('KeyW');
const s6 = await state();
check('bike steers', Math.abs(s6.z - s5.z) > 1, { z0: s5.z, z1: s6.z });

await page.keyboard.down('KeyS');
let minKmh = Infinity;
for (let i = 0; i < 25; i++) { await page.waitForTimeout(100); minKmh = Math.min(minKmh, (await state()).kmh); }
await page.keyboard.up('KeyS');
await hold('KeyW', 300); // cancel any reverse
const s7 = await state();
check('bike brakes to a stop (then can reverse)', minKmh < 3, { minKmh });
await page.keyboard.press('KeyF');
await page.waitForTimeout(300);
const s8 = await state();
check('dismounts with F', s8.state === 'foot', s8);
await page.screenshot({ path: `${out}/04-dismounted.png` });

// ride into a wall at speed: must not tunnel through
await page.keyboard.press('KeyF');
await g(() => { const s = window.__game; s.cam.yaw = s.bike.heading + Math.PI; });
await hold('KeyW', 6000);
const s9 = await state();
check('bike stays inside map / no tunnelling', Math.abs(s9.x) < 140 && Math.abs(s9.z) < 140 && s9.y > -1, s9);

const stats = await g(() => document.querySelector('.debug').textContent);
console.log('\n' + stats);
await page.screenshot({ path: `${out}/05-final.png` });
check('no runtime errors', errors.length === 0, errors.slice(0, 5));
await browser.close();
process.exit(results.every((r) => r.ok) ? 0 : 1);
