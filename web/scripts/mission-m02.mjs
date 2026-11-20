// End-to-end playthrough of M2 "Shareef Driving", including a deliberate failure + retry.
// Usage: npm run dev (other terminal), then: node scripts/mission-m02.mjs [outDir]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'smoke-out';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
// start from a save where M1 is done and the car is seized
await page.addInitScript(() => {
  if (!localStorage.getItem('ringroad.save')) localStorage.setItem('ringroad.save', JSON.stringify({
    version: 1, money: 1250, debt: 1400000, debtRevealed: true, completed: ['m01'], flags: { carSeized: true }, current: null,
  }));
});

const results = [];
const check = (name, ok, info) => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${JSON.stringify(info ?? '')}`); };
const g = (fn, arg) => page.evaluate(fn, arg);
const until = async (fn, timeout = 20000, arg) => {
  try { await page.waitForFunction(fn, arg, { timeout, polling: 100 }); return true; } catch { return false; }
};
const objective = () => g(() => document.querySelector('.hud-objective').textContent);
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
const playThrough = async (pick = 'Digit1', maxSteps = 120) => {
  for (let i = 0; i < maxSteps; i++) {
    const s = await g(() => ({ locked: window.__game.input.locked, choice: !!document.querySelector('.dialogue .choice') && document.querySelector('.dialogue').style.opacity === '1' }));
    if (!s.locked) return true;
    await page.keyboard.press(s.choice ? pick : 'KeyE');
    await page.waitForTimeout(140);
  }
  return false;
};
const atSpeaker = async (name, file, maxPresses = 50) => {
  for (let i = 0; i < maxPresses; i++) {
    const who = await g(() => document.querySelector('.dialogue').style.opacity === '1' ? document.querySelector('.dialogue .who').textContent : '');
    if (who.includes(name)) { await page.waitForTimeout(900); await shot(file); return true; }
    const choice = await g(() => !!document.querySelector('.dialogue .choice') && document.querySelector('.dialogue').style.opacity === '1');
    await page.keyboard.press(choice ? 'Digit2' : 'KeyE');
    await page.waitForTimeout(250);
  }
  return false;
};

await page.goto('http://localhost:5173/');
await page.waitForFunction(() => window.__game, null, { timeout: 30000 });
await g(() => { document.querySelector('.hud-overlay').style.display = 'none'; window.__game.beginPlay(); });
await page.waitForTimeout(600);

const pre = await g(() => ({ locked: window.__game.car.locked, trigger: !!window.__game.triggerMarker.position, running: !!window.__game.missions.running }));
check('after M1: car locked in the lot, M2 start marker shown, nothing running', pre.locked && pre.trigger && !pre.running, pre);

// travel to the lot gate on foot → M2 starts
await g(() => window.__game.player.teleport({ x: -72, y: 0.15, z: 106 }, 0));
await page.waitForTimeout(300);
await shot('m2-00-lot-gate');
await g(() => window.__game.player.teleport({ x: -72, y: 0.15, z: 110.5 }, 0));
check('reaching the lot gate starts M2', await until(() => window.__game.missions.running?.id === 'm02' && window.__game.input.locked, 5000));
check('Lucky scene: Lucky speaks', await atSpeaker('Lucky', 'm2-01-lucky'));
check('meet-Lucky conversation completes (polite choice)', await playThrough('Digit2'));
const flags = await g(() => window.__game.save.data.flags);
check('first impression saved', flags.luckyImpression === 'polite', flags);

// --- drive: get in, seatbelt
check('objective: get in the car', /Papa's car/.test(await objective()), await objective());
await g(() => { const s = window.__game; const c = s.car.position; s.player.teleport({ x: c.x + 2.0, y: 0.15, z: c.z }, 0); });
await page.waitForTimeout(300);
await page.keyboard.press('KeyF');
check('player is in the car', await until(() => window.__game.vehicle() === window.__game.car, 3000));
await page.waitForTimeout(400);
await page.keyboard.press('KeyB');
await page.waitForTimeout(300);
check('seatbelt on', await g(() => window.__game.missions.context.vars.belt === true));
check('shareef meter visible', await g(() => document.querySelector('.hud-meter').style.opacity === '1'));

// --- deliberate failure: max out suspicion → MISSION FAILED → retry from checkpoint
await g(() => { window.__game.missions.context.vars.sus = 150; });
check('max suspicion fails the mission', await until(() => document.querySelector('.hud-splash .stamp').textContent === 'MISSION FAILED' && document.querySelector('.hud-splash').classList.contains('show'), 4000));
await shot('m2-02-failed');
check('stage retries from the checkpoint', await until(() => /Papa's car/.test(document.querySelector('.hud-objective').textContent) && window.__game.missions.context?.vars.sus !== 100, 8000), await objective());

// --- drive again, wear the belt, get to the naka
await g(() => { const s = window.__game; const c = s.car.position; s.player.teleport({ x: c.x + 2.0, y: 0.15, z: c.z }, 0); });
await page.waitForTimeout(300);
await page.keyboard.press('KeyF');
await page.waitForTimeout(300);
await page.keyboard.press('KeyB');
// drive a little for real: obey the speed limit on the lot aisle
await page.keyboard.down('KeyW'); await page.waitForTimeout(800); await page.keyboard.up('KeyW');
await shot('m2-03-driving');
await g(() => window.__game.car.teleport({ x: 103.4, y: 0, z: -90 }, Math.PI));
check('approaching the naka switches the objective', await until(() => /naka/i.test(document.querySelector('.hud-objective').textContent), 5000), await objective());
await shot('m2-04-naka-approach');
await g(() => window.__game.car.teleport({ x: 103.6, y: 0, z: -102.0 }, Math.PI));
check('stopping at the naka starts the constable scene', await until(() => window.__game.input.locked, 5000));
check('constable scene: Dhanpat speaks', await atSpeaker('Dhanpat', 'm2-05-naka'));
check('naka conversation completes (truth)', await playThrough('Digit1'));
const afterNaka = await g(() => ({ money: window.__game.save.data.money, challan: window.__game.missions.context.vars.challan }));
check('seatbelt worn → no challan', afterNaka.money === 1250 && !afterNaka.challan, afterNaka);

// --- deliver to the godown
check('objective: drive into the godown yard', /godown/i.test(await objective()), await objective());
await g(() => window.__game.car.teleport({ x: 117.5, y: 0.15, z: -120 }, Math.PI / 2));
check('godown scene starts', await until(() => window.__game.input.locked, 5000));
check('godown: Lucky speaks', await atSpeaker('Lucky', 'm2-06-godown'));
await page.waitForTimeout(400);
for (let i = 0; i < 6; i++) { await page.keyboard.press('KeyE'); await page.waitForTimeout(500); }
await shot('m2-07-ledgers');
await page.keyboard.down('Enter'); await page.waitForTimeout(900); await page.keyboard.up('Enter');
check('mission completes', await until(() => window.__game.save.data.completed.includes('m02'), 25000));
await page.waitForTimeout(1200);
await shot('m2-08-passed');
const end = await g(() => {
  const s = window.__game;
  return { debt: s.save.data.debt, carLocked: s.car.locked, seized: s.save.data.flags.carSeized, lucky: s.save.data.flags.luckyContact };
});
check('debt −₹50,000, car returned, Lucky in contacts', end.debt === 1350000 && !end.carLocked && end.seized === false && end.lucky === true, end);
check('no runtime errors', errors.length === 0, errors.slice(0, 5));
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
