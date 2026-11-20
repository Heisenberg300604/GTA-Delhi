// End-to-end playthrough of M1 "Happy Birthday, Pihu" with checks + screenshots.
// Usage: npm run dev (other terminal), then: node scripts/mission-m01.mjs [outDir]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'smoke-out';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

const results = [];
const check = (name, ok, info) => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${JSON.stringify(info ?? '')}`); };
const g = (fn, arg) => page.evaluate(fn, arg);
const until = async (fn, timeout = 20000, arg) => {
  try { await page.waitForFunction(fn, arg, { timeout, polling: 100 }); return true; } catch { return false; }
};
const objective = () => g(() => document.querySelector('.hud-objective').textContent);
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
/** Press E until the cutscene ends, answering choices with `pick`. */
const playThrough = async (pick = 'Digit1', maxSteps = 80) => {
  for (let i = 0; i < maxSteps; i++) {
    const s = await g(() => ({ locked: window.__game.input.locked, choice: !!document.querySelector('.dialogue .choice') && document.querySelector('.dialogue').style.opacity === '1' }));
    if (!s.locked) return true;
    await page.keyboard.press(s.choice ? pick : 'KeyE');
    await page.waitForTimeout(120);
  }
  return false;
};

await page.goto('http://localhost:5173/');
await page.waitForFunction(() => window.__game, null, { timeout: 30000 });
await g(() => { document.querySelector('.hud-overlay').style.display = 'none'; window.__game.beginPlay(); });

// --- intro cutscene
check('intro cutscene starts (controls locked, letterbox)', await until(() => window.__game.input.locked && document.querySelector('.hud').classList.contains('cinematic'), 5000));
await until(() => document.querySelector('.dialogue').style.opacity === '1', 8000);
await page.waitForTimeout(600);
await shot('m1-01-intro');
await page.keyboard.down('Enter'); await page.waitForTimeout(900); await page.keyboard.up('Enter');
check('holding Enter skips the cutscene', await until(() => !window.__game.input.locked, 8000));
check('objective: get on the bike', /bike/i.test(await objective()), await objective());

// --- ride to the bakery
await g(() => { const s = window.__game; const b = s.bike.position; s.player.teleport({ x: b.x + 1.2, y: 0.15, z: b.z }, 0); });
await page.waitForTimeout(300);
await page.keyboard.press('KeyF');
check('objective: ride to Sweet Pinch Bakery', await until(() => /Sweet Pinch/.test(document.querySelector('.hud-objective').textContent), 4000));
await page.waitForTimeout(400);
await shot('m1-02-objective-minimap');
await g(() => window.__game.bike.teleport({ x: 63, y: 0, z: -7.2 }, Math.PI / 2));
check('arriving at the bakery advances the mission', await until(() => /Sweety Aunty/.test(document.querySelector('.hud-objective').textContent), 5000), await objective());

// --- buy the cake
await page.keyboard.press('KeyF');
await page.waitForTimeout(300);
await g(() => window.__game.player.teleport({ x: 65, y: 0.15, z: -10.0 }, Math.PI));
await page.waitForTimeout(400);
const prompt = await g(() => document.querySelector('.hud-prompt').textContent);
check('interaction prompt appears near the baker', /talk/i.test(prompt), prompt);
await shot('m1-03-bakery-prompt');
await page.keyboard.press('KeyE');
await until(() => window.__game.input.locked, 3000);
await page.waitForTimeout(1500);
await shot('m1-04-bakery-dialogue');
check('bakery conversation with a choice completes', await playThrough('Digit1'));
const money1 = await g(() => window.__game.save.data.money);
check('paid ₹450 for the pineapple cake', money1 === 750, { money: money1 });
check('objective: take the cake home', await until(() => /home/i.test(document.querySelector('.hud-objective').textContent), 4000), await objective());

// --- deliver (ride a bit so the cake meter shows), then arrive
await g(() => { const s = window.__game; const b = s.bike.position; s.player.teleport({ x: b.x + 1.0, y: 0.15, z: b.z }, 0); });
await page.waitForTimeout(250);
await page.keyboard.press('KeyF');
await page.keyboard.down('KeyW'); await page.waitForTimeout(1500); await page.keyboard.up('KeyW');
await shot('m1-05-cake-meter');
const meter = await g(() => document.querySelector('.hud-meter').style.opacity);
check('cake condition meter is visible while delivering', meter === '1', { meter });
await g(() => window.__game.bike.teleport({ x: -96.3, y: 0, z: 16.5 }, 0));

// --- the party / reveal cutscene
check('party cutscene starts at home', await until(() => window.__game.input.locked, 6000));
/** Advance dialogue until `name` is speaking, then screenshot. */
const atSpeaker = async (name, file, maxPresses = 40) => {
  for (let i = 0; i < maxPresses; i++) {
    const who = await g(() => document.querySelector('.dialogue').style.opacity === '1' ? document.querySelector('.dialogue .who').textContent : '');
    if (who.includes(name)) { await page.waitForTimeout(900); await shot(file); return true; }
    if (who) await page.keyboard.press('KeyE');
    await page.waitForTimeout(250);
  }
  return false;
};
check('party: Shanaya greets', await atSpeaker('Shanaya', 'm1-06-party-wide'));
check('party: Pihu reacts to the cake', await atSpeaker('Pihu', 'm1-06b-pihu'));
check('collectors: Gogi speaks', await atSpeaker('Gogi', 'm1-07-collectors'));
check('reveal: Papa answers', await atSpeaker('Papa', 'm1-08-reveal'));
await page.keyboard.down('Enter'); await page.waitForTimeout(900); await page.keyboard.up('Enter');
check('mission completes', await until(() => window.__game.save.data.completed.includes('m01'), 25000));
await page.waitForTimeout(300);
await shot('m1-09-passed');
const end = await g(() => {
  const s = window.__game;
  return { money: s.save.data.money, debtRevealed: s.save.data.debtRevealed, carAvailable: s.car.available,
    debtVisible: !document.querySelector('.hud-hisaab').classList.contains('hidden'),
    stored: JSON.parse(localStorage.getItem('ringroad.save') || '{}').completed };
});
check('debt revealed on HUD, family car seized, shift pay received, saved', end.debtRevealed && end.debtVisible && !end.carAvailable && end.money === 1250 && end.stored?.includes('m01'), end);
check('no runtime errors', errors.length === 0, errors.slice(0, 5));
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
