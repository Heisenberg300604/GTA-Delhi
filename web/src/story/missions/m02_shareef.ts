import * as THREE from 'three';
import type { Mission } from '../MissionManager';
import type { MissionContext } from '../MissionContext';
import type { StoryHost } from '../StoryHost';
import { KERB, LANDMARKS, ROADS, computeBlocks, inCrossing, laneOffset } from '../../world/cityLayout';

/**
 * M2 — "Shareef Driving" (GDD §10).
 * Lucky offers a deal: drive the family car (boot locked) to the Kothi godown
 * without attracting attention. The genre inverted: obey the traffic rules.
 */

const HALF_PI = Math.PI / 2;
const LOT = LANDMARKS.lotCar;
const GATE = LANDMARKS.lotGate;
const NAKA = LANDMARKS.nakaStop;
const YARD = LANDMARKS.godownYard;
const SPEED_LIMIT = 50; // km/h
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const BLOCKS = computeBlocks();

// ---------------------------------------------------------------- helpers

function placePlayer(h: StoryHost, x: number, z: number, facing: number) {
  h.forceExit();
  h.player.teleport(v3(x, KERB, z), facing);
}

function carAtLot(h: StoryHost) {
  h.car.setAvailable(true);
  h.car.locked = false;
  h.car.teleport(v3(LOT.x, KERB, LOT.z), LOT.heading);
}

/** Is the car on a raised surface that isn't the lot or the godown yard (i.e. the pavement)? */
function onPavement(x: number, z: number, y: number): boolean {
  if (y < 0.74) return false;
  const b = BLOCKS.find((bb) => x > bb.x0 && x < bb.x1 && z > bb.z0 && z < bb.z1);
  return !!b && b.kind !== 'parking' && b.kind !== 'godown';
}

/** Driving against the flow (India keeps left)? */
function wrongSide(x: number, z: number, heading: number): boolean {
  const fx = Math.sin(heading), fz = Math.cos(heading);
  for (const road of ROADS) {
    const across = road.axis === 'x' ? z - road.center : x - road.center;
    const along = road.axis === 'x' ? x : z;
    if (Math.abs(across) > road.width / 2 || inCrossing(road, along, 1)) continue;
    const comp = road.axis === 'x' ? fx : fz;
    if (Math.abs(comp) < 0.7) continue; // turning / crossing
    const expected = laneOffset(road, comp > 0 ? 1 : -1, 0);
    if (Math.sign(across) !== Math.sign(expected) && Math.abs(across) > 0.9) return true;
  }
  return false;
}

/**
 * The shareef meter. ctx.vars.sus is suspicion 0..100 (saved with checkpoints);
 * the HUD shows how "shareef" you look (100 − suspicion). 100 suspicion = stopped.
 */
function shareefMeter(ctx: MissionContext): () => void {
  const h = ctx.host;
  if (typeof ctx.vars.sus !== 'number') ctx.vars.sus = 0;
  let cooldown = 0;
  let lastWarn = '';
  let warnTimer = 0;
  const warn = (msg: string) => {
    if (msg !== lastWarn || warnTimer <= 0) h.hud.showToast(msg, 2);
    lastWarn = msg;
    warnTimer = 2.5;
  };
  ctx.onRedLight(() => {
    ctx.vars.sus = (ctx.vars.sus as number) + 30;
    warn('🚦 Red light jump kiya! Suspicion +30');
  });
  return ctx.every((dt) => {
    cooldown = Math.max(0, cooldown - dt);
    warnTimer -= dt;
    const v = h.vehicle();
    let sus = ctx.vars.sus as number;
    if (v === h.car) {
      let clean = true;
      if (v.kmh > SPEED_LIMIT) {
        sus += (v.kmh - SPEED_LIMIT) * 0.6 * dt;
        warn(`Speed limit ${SPEED_LIMIT}! Dheere…`);
        clean = false;
      }
      if (v.impact > 0.2 && cooldown <= 0) {
        sus += 10 + v.impact * 25;
        cooldown = 0.8;
        warn('Thoka! Log dekh rahe hain…');
        clean = false;
      }
      if (h.input.down('KeyH')) {
        sus += 8 * dt;
        warn('Horn mat bajao. Shareef log horn nahi bajate.');
        clean = false;
      }
      if (onPavement(v.position.x, v.position.z, v.position.y)) {
        sus += 18 * dt;
        warn('Footpath pe gaadi?!');
        clean = false;
      } else if (Math.abs(v.speed) > 3 && wrongSide(v.position.x, v.position.z, v.heading)) {
        sus += 12 * dt;
        warn('Galat side! India mein left mein chalte hain.');
        clean = false;
      }
      if (!ctx.vars.belt && Math.abs(v.speed) > 2) {
        sus += 2.5 * dt;
        clean = false;
      }
      if (clean) sus -= 2.5 * dt;
      if (h.input.consumeUI('KeyB') && !ctx.vars.belt) {
        ctx.vars.belt = true;
        h.hud.showToast('Seatbelt lagaya ✔ Shareef aadmi.', 2.5);
      }
    }
    sus = Math.max(0, Math.min(100, sus));
    ctx.vars.sus = sus;
    h.hud.setMeter(`SHAREEF METER${ctx.vars.belt ? '' : ' · B: seatbelt'}`, 1 - sus / 100);
    if (sus >= 100) ctx.fail('Bahut shak ho gaya. Police ne gaadi rok li. (Too suspicious — the police pulled you over.)');
  });
}

/** Police naka: two staggered barricades, a jeep, two constables. */
function ensureNaka(ctx: MissionContext) {
  if (ctx.scratch.naka) return;
  ctx.scratch.naka = true;
  ctx.barrier(102.5, -106, 4.2);
  ctx.barrier(107.5, -110.5, 4.2);
  const jeep = ctx.propVehicle('sedan', '#f5f5f5', 108.2, -117, 0);
  const bar = new THREE.Group();
  const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.25), new THREE.MeshBasicMaterial({ color: '#ff1a1a' }));
  const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.25), new THREE.MeshBasicMaterial({ color: '#1a5cff' }));
  red.position.x = -0.26;
  blue.position.x = 0.26;
  bar.add(red, blue);
  bar.position.set(0, 1.6, -0.2);
  jeep.body.add(bar);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.77, 0.12, 4.0), new THREE.MeshLambertMaterial({ color: '#1f4fa8' }));
  stripe.position.y = 0.75;
  jeep.body.add(stripe);
  ctx.scratch.dhanpat = ctx.actor('dhanpat', 106.6, -104.4, 0);
  ctx.scratch.constable = ctx.actor('constable', 101.4, -108.2, 0.3);
}

// ---------------------------------------------------------------- stage 1: meet Lucky

async function meetLucky(ctx: MissionContext) {
  const h = ctx.host;
  let impression = 'polite';
  await ctx.cutscene(async () => {
    const onBike = h.vehicle() === h.bike;
    placePlayer(h, -75.6, 120.2, -0.86);
    if (onBike) h.bike.teleport(v3(-69.5, KERB, 117.5), 0);
    carAtLot(h);
    h.car.locked = true; // keys are with Lucky until he says so
    const lucky = ctx.actor('lucky', -78.0, 122.5, 2.2);
    const gogi = ctx.actor('gogi', -66.8, 116.0, -2.2);
    // Mummy's steel tiffin on the bonnet
    const tiffin = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.11, 14), new THREE.MeshLambertMaterial({ color: '#c9ced4' }));
      c.position.set(i * 0.3 - 0.3, 0, 0);
      tiffin.add(c);
    }
    tiffin.position.set(LOT.x + 0.2, KERB + 1.04, LOT.z - 1.3);
    ctx.prop(tiffin);

    await ctx.shot([-70.5, 2.3, 106.8], [-77.5, 1.2, 122.5]);
    await ctx.fade(0, 0.6);
    await ctx.wait(1.0);
    await ctx.shot([-76.4, 1.65, 119.6], [-78.0, 1.55, 122.5]);
    await ctx.say('lucky', 'Aao, Sethi junior. Rajma khaoge?', 'Come in, Sethi junior. Want some rajma?');
    await ctx.shot([-77.6, 1.65, 122.3], [-75.6, 1.55, 120.2]);
    await ctx.say('aryan', 'Ye... meri mummy ka tiffin hai.', "That's... my mother's tiffin.");
    await ctx.shot([-76.4, 1.65, 119.6], [-78.0, 1.55, 122.5]);
    await ctx.say('lucky', 'Har Mangalvaar aata hai. Rajma achha banta hai unka.', 'It comes every Tuesday. She makes good rajma.');
    await ctx.say('lucky', 'Dilli chhoti hai, beta. Sab kisi na kisi ke udhaar pe chal rahe hain.', "Delhi is small, son. Everyone's running on someone's loan.");
    if (ctx.skipping) ctx.skipping = false;
    const pick = await ctx.choose('aryan', [
      { text: 'Gaadi ki chaabi do. Abhi.', en: 'Give me the car keys. Now. (angry)' },
      { text: 'Lucky ji, gaadi Papa ki hai. Thoda time do, hum lauta denge.', en: "It's Papa's car. Give us some time, we'll pay. (polite)" },
      { text: 'Rajma mein namak kam hai. Mummy ko bataun?', en: 'The rajma needs salt. Shall I tell Mummy? (joke)' },
    ]);
    impression = (['angry', 'polite', 'joke'] as const)[pick];
    const reply: Record<string, [string, string]> = {
      angry: ['Garmi bahut hai, beta. Dimaag thanda rakh.', "It's hot, son. Keep your head cool."],
      polite: ['Time? Time hi toh sabse mehenga byaaj hai.', 'Time? Time is the most expensive interest there is.'],
      joke: ['(hasta hai) Bata de. Agle Mangalvaar se namak zyada aayega.', '(laughs) Tell her. Next Tuesday it comes with more salt.'],
    };
    await ctx.say('lucky', ...reply[impression]);
    await ctx.shot([-73.2, 1.8, 124.6], [-77.6, 1.3, 121.6]);
    await ctx.say('lucky', 'Chaudah lakh, Sethi. Gaadi se kuch nahi hota. Par ek kaam hai.', "Fourteen lakh, Sethi. The car doesn't cover a thing. But there's a job.");
    await ctx.say('lucky', 'Ye gaadi Bhalla godown chhod de. Vijay Nagar ke peeche. Boot mat kholna.', "Drop this car at the Bhalla godown. Behind Vijay Nagar. Don't open the boot.");
    await ctx.say('lucky', 'Aur sun — shareef aadmi ki tarah chalana. Red light, speed, horn, kuch nahi. Aaj naka laga hai.', 'And listen: drive like a gentleman. No red lights, no speeding, no horn. There\'s a police checkpoint today.');
    await ctx.say('aryan', 'Aur mujhe kya milega?', 'And what do I get?');
    await ctx.say('lucky', 'Pachaas hazaar kam. Aur gaadi tere Papa ko wapas. Udhaar pe.', 'Fifty thousand off. And the car goes back to your Papa. On loan.');
    await ctx.say('gogi', 'Bike yahin chhod de. Main sambhaal lunga.', "Leave the bike here. I'll look after it.");
    ctx.removeActor(lucky);
    ctx.removeActor(gogi);
  }, -0.86);
  h.save.data.flags.luckyImpression = impression;
  h.car.locked = false;
}

function restoreMeet(h: StoryHost) {
  placePlayer(h, GATE.x, GATE.z - 2, 0);
}

// ---------------------------------------------------------------- stage 2: the drive

async function drive(ctx: MissionContext) {
  const h = ctx.host;
  ensureNaka(ctx);
  ctx.vars.belt = ctx.vars.belt ?? false;
  await ctx.objective("Get in <em>Papa's car</em>", () => h.vehicle() === h.car, h.car.position);
  h.hud.showToast('B — seatbelt lagao. Speed limit 50. No red lights, no horn.', 5);
  shareefMeter(ctx);
  const watch = ctx.every(() => {
    const inCar = h.vehicle() === h.car;
    h.hud.setObjective(inCar
      ? 'Drive to <em>Bhalla Godown</em>, Vijay Nagar — like a <em>shareef aadmi</em>'
      : "Get back in <em>Papa's car</em>");
  });
  await ctx.objective('Drive to <em>Bhalla Godown</em>', () => h.vehicle() === h.car && ctx.near(NAKA, 16), YARD);
  watch();
}

function restoreDrive(h: StoryHost) {
  placePlayer(h, LOT.x + 2.4, LOT.z - 1, 0);
  carAtLot(h);
}

// ---------------------------------------------------------------- stage 3: the naka

async function naka(ctx: MissionContext) {
  const h = ctx.host;
  ensureNaka(ctx);
  shareefMeter(ctx);
  // driving straight through the naka without stopping = instant fail
  const bolt = ctx.every(() => {
    const f = h.focus();
    if (f.z < -108 && Math.abs(f.x - 105) < 6) ctx.fail('Naka tod ke bhaage? Police ne pakad liya. (You ran the checkpoint.)');
  });
  await ctx.objective('Stop at the <em>police naka</em>', () => {
    const v = h.vehicle();
    return v === h.car && Math.abs(v.speed) < 0.6 && ctx.near(NAKA, 4.5);
  }, NAKA);
  bolt();

  const dhanpat = ctx.scratch.dhanpat as ReturnType<MissionContext['actor']>;
  let sus = ctx.vars.sus as number;
  await ctx.cutscene(async () => {
    const car = h.car.position;
    const rx = -Math.cos(h.car.heading), rz = Math.sin(h.car.heading); // right side = driver's window (RHD)
    await ctx.shot([car.x + rx * 4.2 + 1.5, 1.7, car.z + rz * 4.2 + 3.5], [car.x + rx * 0.8, 1.3, car.z]);
    await ctx.walk(dhanpat, car.x + rx * 1.75, car.z + rz * 1.75, 1.3, Math.atan2(-rx, -rz));
    // at the driver's window, looking up at him
    const fx = Math.sin(h.car.heading), fz = Math.cos(h.car.heading);
    await ctx.shot([car.x + rx * 0.82 - fx * 0.55, 1.42, car.z + rz * 0.82 - fz * 0.55], [car.x + rx * 1.75, 1.6, car.z + rz * 1.75], 0, 50);
    await ctx.say('dhanpat', 'Gaadi side mein. Kaagaz dikhao.', 'Pull over. Show me the papers.');
    if (!ctx.vars.belt) {
      await ctx.say('dhanpat', 'Aur belt? Belt kaun lagayega, tera fufa?', 'And the seatbelt? Who will wear it, your uncle?');
      await ctx.say('dhanpat', 'Hazaar rupaye ka challan. Kaato.', 'A thousand-rupee fine. Pay up.');
      h.save.data.money -= 1000;
      h.hud.setWallet(h.save.data.money);
      ctx.vars.challan = true;
    }
    await ctx.say('dhanpat', 'Gaadi kiski hai?', 'Whose car is this?');
    if (ctx.skipping) ctx.skipping = false;
    const pick = await ctx.choose('aryan', [
      { text: 'Papa ki hai, sir. RC unke naam pe hai.', en: "It's my father's, sir. It's registered in his name. (truth)" },
      { text: 'Aapko pata hai main kiske liye kaam karta hoon?', en: 'Do you know who I work for? (attitude)' },
      { text: 'Sir... chai-paani?', en: 'Sir... something for tea? (bribe)' },
    ]);
    if (pick === 0) {
      sus = Math.max(0, sus - 15);
      await ctx.say('dhanpat', 'Hmm. Sethi... Vinod Sethi? Card waale? Meri beti ki shaadi ke card unhone chhaape the.', 'Hmm. Sethi... Vinod Sethi? The card printer? He printed my daughter\'s wedding cards.');
    } else if (pick === 1) {
      sus += 40;
      await ctx.say('dhanpat', 'Pata nahi. Par ab jaanna padega.', "I don't know. But now I'll have to find out.");
      h.save.data.flags.dhanpatSuspicious = true;
    } else {
      sus += 30;
      await ctx.say('dhanpat', 'Chai main khud pi leta hoon, beta. Sarkaar pilati hai.', 'I buy my own tea, son. The government pays for it.');
    }
    if (sus >= 70) {
      await ctx.say('dhanpat', 'Boot kholo.', 'Open the boot.');
      await ctx.say('aryan', 'Chaabi... chaabi mere paas nahi hai, sir.', "The key... I don't have the key, sir.");
      await ctx.wait(0.6);
      h.audio.ring();
      await ctx.say('constable', '(wireless) Dhanpat, ITO pe accident hua hai, turant pahuncho!', '(radio) Dhanpat, accident at ITO, get there now!');
      await ctx.say('dhanpat', 'Aaj tu bach gaya, Sethi. Agli baar nahi.', 'You got lucky today, Sethi. Not next time.');
    } else {
      await ctx.say('dhanpat', 'Theek hai. Jao. Aur dheere chalana.', 'Fine. Go. And drive slowly.');
    }
    await ctx.walk(dhanpat, 106.6, -104.4, 1.6, 0);
  }, h.car.heading);
  ctx.vars.sus = Math.min(95, sus);
}

function restoreNaka(h: StoryHost) {
  placePlayer(h, 103.4, -88, Math.PI);
  h.car.setAvailable(true);
  h.car.locked = false;
  h.car.teleport(v3(103.4, 0, -84), Math.PI);
  h.enter(h.car);
}

// ---------------------------------------------------------------- stage 4: the godown

async function deliver(ctx: MissionContext) {
  const h = ctx.host;
  ensureNaka(ctx);
  shareefMeter(ctx);
  await ctx.objective('Drive into the <em>godown</em> yard', () => h.vehicle() === h.car && ctx.near(YARD, 4), YARD);
  h.hud.setMeter(null);

  await ctx.cutscene(async () => {
    h.forceExit();
    h.car.teleport(v3(YARD.x, KERB, YARD.z - 0.5), HALF_PI);
    h.player.teleport(v3(YARD.x + 0.3, KERB, YARD.z + 1.6), HALF_PI);
    const lucky = ctx.actor('lucky', 121.0, -117.0, -2.0);
    const w1 = ctx.actor('worker', 120.8, -124.0, -HALF_PI);
    const w2 = ctx.actor('worker', 121.3, -125.2, -HALF_PI);
    await ctx.shot([114.6, 1.9, -114.8], [119.5, 1.2, -119.5]);
    await ctx.fade(0, 0.4);
    await ctx.say('lucky', 'Tu toh bada shareef nikla.', 'You turned out to be quite the gentleman.');
    if (ctx.vars.challan) await ctx.say('lucky', 'Belt ka challan? (hasta hai) Shareef bhi, aur bewakoof bhi.', 'A seatbelt fine? (laughs) A gentleman, and a fool.');
    await ctx.say('aryan', 'Boot mein kya hai?', "What's in the boot?");
    // the workers unload: stacks of red cloth-bound ledgers
    const rear = { x: YARD.x - 2.4, z: YARD.z - 0.5 };
    await Promise.all([ctx.walk(w1, rear.x + 0.2, rear.z - 1.1, 1.6), ctx.walk(w2, rear.x + 0.2, rear.z + 1.1, 1.6)]);
    const ledgers = new THREE.Group();
    const red = new THREE.MeshLambertMaterial({ color: '#a3201b' });
    const string = new THREE.MeshLambertMaterial({ color: '#e8d9a8' });
    for (let i = 0; i < 9; i++) {
      const book = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.11, 0.3), red);
      book.position.set((i % 3) * 0.46 - 0.46, 0.06 + Math.floor(i / 3) * 0.12, (i % 2) * 0.05);
      book.rotation.y = (i % 2) * 0.12;
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.112, 0.03), string);
      tie.position.copy(book.position);
      ledgers.add(book, tie);
    }
    ledgers.position.set(rear.x - 0.6, KERB, rear.z);
    ctx.prop(ledgers);
    await ctx.shot([rear.x - 2.3, 1.2, rear.z + 1.6], [rear.x - 0.5, 0.3, rear.z]);
    await ctx.wait(1.2);
    await ctx.shot([114.6, 1.9, -114.8], [119.5, 1.2, -119.5]);
    await ctx.say('lucky', 'Kaagaz. Dilli kaagaz pe chalti hai, beta.', 'Paper. Delhi runs on paper, son.');
    await ctx.say('lucky', 'Kaun kisko kitna dega — sab in laal bahi-khaton mein likha hai.', 'Who owes whom, and how much — it\'s all written in these red ledgers.');
    await ctx.say('aryan', 'Aur mere Papa ka naam?', "And my father's name?");
    await ctx.say('lucky', '(chup) ...Pachaas hazaar kaat diye. Gaadi le ja. Papa ko bolna, Lucky ne salaam bheja hai.', '(silence) ...Fifty thousand, cut. Take the car. Tell your Papa that Lucky sends his salaam.');
    await ctx.say('aryan', 'Aur agla kaam?', 'And the next job?');
    await ctx.say('lucky', 'Tu khud aayega. Sab aate hain.', "You'll come on your own. Everyone does.");
    await ctx.shot([110, 4.5, -112], [118.5, 0.8, -120.5], 3.5);
    for (const a of [lucky, w1, w2]) ctx.removeActor(a);
  }, HALF_PI);

  const save = h.save.data;
  const before = save.debt;
  save.debt -= 50000;
  save.flags.carSeized = false;
  save.flags.luckyContact = true;
  h.car.locked = false;
  h.hud.animateDebt(before, save.debt, 2.2);
  await ctx.wait(2.6);
  await ctx.say('lucky', 'Kal. Campus. Ek ladka dhoondhna hai. — L', 'SMS from Lucky: "Tomorrow. Campus. There\'s a boy to find."', true);
}

function restoreDeliver(h: StoryHost) {
  placePlayer(h, 103.4, -118, Math.PI);
  h.car.setAvailable(true);
  h.car.locked = false;
  h.car.teleport(v3(103.4, 0, -114), Math.PI);
  h.enter(h.car);
}

export const M02_SHAREEF: Mission = {
  id: 'm02',
  title: 'Shareef Driving',
  reward: 0,
  rewardText: "Debt −₹50,000 · Papa's car is back",
  next: 'Nukkad (coming soon)',
  trigger: { x: GATE.x, z: GATE.z - 2.2, radius: 5, label: 'L' },
  stages: [
    { id: 'meetLucky', run: meetLucky, restore: restoreMeet },
    { id: 'drive', run: drive, restore: restoreDrive },
    { id: 'naka', run: naka, restore: restoreNaka },
    { id: 'deliver', run: deliver, restore: restoreDeliver },
  ],
};
