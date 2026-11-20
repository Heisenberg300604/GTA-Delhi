import * as THREE from 'three';
import type { Mission } from '../MissionManager';
import type { MissionContext } from '../MissionContext';
import type { StoryHost } from '../StoryHost';
import { KERB, LANDMARKS, SPAWN } from '../../world/cityLayout';
import { CAR } from '../../config';

/**
 * M1 — "Happy Birthday, Pihu" (GDD §10).
 * Tutorial: walk, ride, talk, a choice, careful riding with fragile cargo,
 * then the reveal: the family owes ₹14 lakh, and the collectors take the car.
 */

const HALF_PI = Math.PI / 2;
const BAKERY = LANDMARKS.bakery;
const HOME = LANDMARKS.home;
const BAKERY_TALK = { x: BAKERY.x, z: BAKERY.z + 1.9 };
const BAKERY_ARRIVE = { x: BAKERY.x, z: BAKERY.z + 2.6 };
const HOME_ARRIVE = { x: HOME.x - 2.6, z: HOME.z };

type Flavour = 'pineapple' | 'chocolate' | 'vanilla';

const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function placeBike(host: StoryHost, x: number, z: number, heading: number) {
  if (host.vehicle() === host.bike) host.forceExit();
  host.bike.teleport(v3(x, 0, z), heading);
}

function placePlayer(host: StoryHost, x: number, z: number, facing: number) {
  host.forceExit();
  host.player.teleport(v3(x, KERB, z), facing);
}

// ---------------------------------------------------------------- stage 1: intro

async function intro(ctx: MissionContext) {
  const h = ctx.host;
  placePlayer(h, -32.2, 9.7, 0.55);
  h.hud.setFade(1);
  await ctx.cutscene(async () => {
    await ctx.shot([-36.2, 1.75, 6.6], [-31.4, 1.35, 10.6]);
    await ctx.wait(0.3);
    await ctx.fade(0, 0.9);
    await ctx.say('ramesh', 'Aaj phir late? Tera boss tujhe award dega ya notice?', 'Late again? Will your boss give you an award or a notice?');
    await ctx.say('aryan', "Award, Ramesh bhaiya. 'Most Cancelled Orders of the Month.'", "An award, Ramesh bhaiya. 'Most Cancelled Orders of the Month.'");
    await ctx.say('ramesh', 'Chai pi le, phir ghar ja. Aaj Pihu ka birthday hai na?', "Have your chai, then go home. It's Pihu's birthday today, isn't it?");
    h.audio.ring();
    await ctx.wait(1.4);
    await ctx.shot([-33.9, 1.62, 8.15], [-32.1, 1.5, 9.8]);
    await ctx.say('shanaya', 'Kahan ho? Cake lena hai. Sweet Pinch Bakery, main road pe.', "Where are you? You need to get the cake. Sweet Pinch Bakery, on the main road.", true);
    await ctx.say('shanaya', 'Pineapple. Not chocolate. Pihu says chocolate is for children.', undefined, true);
    await ctx.say('aryan', 'Pineapple. Got it. Kuch aur, madam?', 'Pineapple. Got it. Anything else, madam?', true);
    await ctx.say('shanaya', 'Haan. Smile karke aana. Aunty pehle se tense hain.', "Yes. Come with a smile. Aunty's already tense.", true);
    await ctx.say('aryan', 'Tense kyun?', 'Why tense?', true);
    await ctx.say('shanaya', '...Ghar aao, phir baat karte hain.', "...Come home, we'll talk then.", true);
    await ctx.wait(0.4);
  }, 0.55);
}

// ---------------------------------------------------------------- stage 2: to the bakery

async function toBakery(ctx: MissionContext) {
  const h = ctx.host;
  h.hud.showToast('Tip: F to get on · W/S throttle & brake · H horn', 4);
  await ctx.objective('Get on your <em>bike</em>', () => h.vehicle() !== null, h.bike.position);
  await ctx.objective('Ride to <em>Sweet Pinch Bakery</em> on the main road', () => ctx.near(BAKERY_ARRIVE, 6), BAKERY_ARRIVE);
}

function restoreToBakery(h: StoryHost) {
  placePlayer(h, -32.2, 9.7, HALF_PI);
  placeBike(h, SPAWN.bike.x, SPAWN.bike.z, SPAWN.bike.heading);
}

// ---------------------------------------------------------------- stage 3: buy the cake

async function buyCake(ctx: MissionContext) {
  const h = ctx.host;
  await ctx.interact('Talk to <em>Sweety Aunty</em> at the counter', BAKERY_TALK, 'talk to Sweety Aunty');
  let flavour: Flavour = 'pineapple';
  let price = 450;
  await ctx.cutscene(async () => {
    placePlayer(h, BAKERY.x - 0.1, BAKERY.z + 2.15, Math.PI);
    await ctx.shot([BAKERY.x - 1.9, 1.75, BAKERY.z + 3.9], [BAKERY.x + 0.2, 1.45, BAKERY.z + 0.5]);
    await ctx.say('baker', 'Aao beta! Birthday cake? Kiska hai?', "Come, dear! A birthday cake? Whose is it?");
    await ctx.say('aryan', 'Meri behen ka. Satrah saal ki ho gayi.', "My sister's. She's turning seventeen.");
    await ctx.say('baker', 'Arre waah! Kaunsa flavour?', 'Oh lovely! Which flavour?');
    if (ctx.skipping) ctx.skipping = false; // never skip a choice
    const pick = await ctx.choose('aryan', [
      { text: 'Pineapple.', en: 'Shanaya was very clear about this.' },
      { text: 'Chocolate. Sabko pasand hota hai.', en: 'Chocolate. Everyone likes chocolate.' },
      { text: 'Jo sabse sasta ho, aunty.', en: "Whatever's cheapest, aunty." },
    ]);
    flavour = (['pineapple', 'chocolate', 'vanilla'] as const)[pick];
    price = flavour === 'vanilla' ? 300 : 450;
    await ctx.say('baker', flavour === 'vanilla' ? 'Vanilla, ₹300. Simple hai, par pyaar se bana hai.' : `${flavour === 'pineapple' ? 'Pineapple' : 'Chocolate'}, ₹450. Aur ye lo, candle free mein.`,
      flavour === 'vanilla' ? "Vanilla, ₹300. Simple, but made with love." : 'Here you go. And take this, a free candle.');
    await ctx.say('baker', 'Dheere chalana, beta. Cream hai, cement nahi.', "Ride slowly, dear. It's cream, not cement.");
  }, Math.PI);
  h.save.data.money -= price;
  h.hud.setWallet(h.save.data.money);
  h.hud.showToast(`Paid ₹${price} · PayDilli`, 2.5);
  ctx.vars.flavour = flavour;
  ctx.vars.cake = 1;
}

function restoreBuyCake(h: StoryHost) {
  placePlayer(h, BAKERY.x - 3, BAKERY.z + 2.6, Math.PI);
  placeBike(h, BAKERY.x - 5, BAKERY.z + 4.75, HALF_PI);
}

// ---------------------------------------------------------------- stage 4: deliver the cake

async function deliver(ctx: MissionContext) {
  const h = ctx.host;
  if (typeof ctx.vars.cake !== 'number') ctx.vars.cake = 1;
  let cooldown = 0;
  let lastSpeed = 0;
  let warned = false;
  const stop = ctx.every((dt) => {
    cooldown = Math.max(0, cooldown - dt);
    const v = h.vehicle();
    let cake = ctx.vars.cake as number;
    if (v) {
      if (v.impact > 0.25 && cooldown <= 0) {
        cake -= 0.12 + v.impact * 0.3;
        cooldown = 0.6;
        h.hud.showBark(['Arre, cake!', 'Cake ka kya hoga...', 'Bhai dhyaan se, cream hai!'][Math.floor(Math.random() * 3)]);
      }
      const decel = (Math.abs(lastSpeed) - Math.abs(v.speed)) / Math.max(dt, 1e-3);
      if (decel > 13 && Math.abs(lastSpeed) > 4) cake -= 0.35 * dt;
      lastSpeed = v.speed;
      if (!warned && v.kmh > 55) {
        warned = true;
        h.hud.showToast('Itni tez? The cake is sliding around…', 2.5);
      }
    }
    cake = Math.max(0, cake);
    ctx.vars.cake = cake;
    h.hud.setMeter('CAKE CONDITION', cake);
  });
  await ctx.objective('Take the cake home to <em>Shakti Nagar</em> — ride carefully', () => ctx.near(HOME_ARRIVE, 4.5), HOME_ARRIVE);
  stop();
  h.hud.setMeter(null);
}

function restoreDeliver(h: StoryHost) {
  restoreBuyCake(h);
}

// ---------------------------------------------------------------- stage 5: the party

function pihuLine(flavour: Flavour, cake: number): [string, string] {
  if (flavour === 'chocolate') return ['Chocolate? Main 17 ki hui hoon, bhaiya, 7 ki nahi.', "Chocolate? I'm turning 17, bhaiya, not 7."];
  if (flavour === 'vanilla') return ['Vanilla. Wow. Itna excitement main sambhaal nahi paaungi.', "Vanilla. Wow. I can't handle this much excitement."];
  if (cake < 0.5) return ['Bhaiya, cake ki haalat dekh ke lagta hai tum Ring Road pe stunt karke aaye ho.', 'Bhaiya, from the state of this cake it looks like you did stunts on the Ring Road.'];
  return ['Pineapple! Finally kisi ne meri baat suni.', 'Pineapple! Finally someone listened to me.'];
}

async function party(ctx: MissionContext) {
  const h = ctx.host;
  const flavour = (ctx.vars.flavour as Flavour) ?? 'pineapple';
  const cake = (ctx.vars.cake as number) ?? 1;
  const hx = HOME.x, hz = HOME.z;
  const faceRoad = -HALF_PI;

  await ctx.cutscene(async () => {
    // stage the scene
    const usedCar = h.vehicle() === h.car;
    placePlayer(h, hx - 2.5, hz + 0.2, HALF_PI);
    if (!usedCar) placeBike(h, -96.3, 27.5, 0);
    h.car.teleport(v3(LANDMARKS.homeParking.x, 0, LANDMARKS.homeParking.z), LANDMARKS.homeParking.heading);
    if (usedCar) placeBike(h, -96.3, 30.5, 0);

    const neelam = ctx.actor('neelam', hx - 0.8, hz - 1.1, faceRoad);
    const pihu = ctx.actor('pihu', hx - 1.0, hz + 0.6, faceRoad);
    const shanaya = ctx.actor('shanaya', hx - 1.4, hz + 1.8, faceRoad - 0.4);
    const vinod = ctx.actor('vinod', hx - 0.6, hz - 2.3, faceRoad + 0.3);

    await ctx.shot([hx - 6.8, 1.75, hz + 1.6], [hx - 1.2, 1.3, hz - 0.3]); // the whole family at the door
    await ctx.wait(0.5);
    await ctx.say('shanaya', 'Aa gaye! Dikhao dikhao.', "You're here! Show us, show us.");
    const [pl, pen] = pihuLine(flavour, cake);
    await ctx.shot([hx - 3.9, 1.6, hz + 2.7], [hx - 1.6, 1.45, hz + 0.3]); // Aryan & Pihu
    await ctx.say('pihu', pl, pen);
    await ctx.say('neelam', 'Chalo chalo, upar chalo. Mombatti lagate hain—', "Come on, let's go upstairs. Let's put the candles—");

    // the collectors arrive
    const collectors = ctx.propVehicle('sedan', '#1f1f1f', -98.4, -18, 0);
    h.audio.engineBy();
    await ctx.shot([hx - 3.0, 1.6, hz - 9.5], [-98.2, 1.0, hz - 5.0], 0, 55); // the car pulls in
    await ctx.drive(collectors, -98.4, hz - 4.5, 9);
    const gogi = ctx.actor('gogi', -97.4, hz - 4.0, HALF_PI);
    const sheru = ctx.actor('sheru', -97.6, hz - 5.6, HALF_PI);
    // staged so nobody blocks the camera: Gogi faces Papa, Sheru hangs back
    await Promise.all([
      ctx.walk(gogi, hx - 1.6, hz - 3.4, 1.3, 0.74),
      ctx.walk(sheru, hx - 2.6, hz - 4.2, 1.3, 0.81),
    ]);
    await ctx.shot([hx - 4.2, 1.7, hz - 0.6], [hx - 1.4, 1.45, hz - 3.0]);
    await ctx.say('gogi', 'Sethi ji, namaste. Happy birthday bitiya ko.', "Sethi ji, namaste. Happy birthday to your daughter.");
    await ctx.say('vinod', 'Gogi ji... yahan nahi. Bachche hain.', 'Gogi ji... not here. The children are here.');
    await ctx.say('gogi', 'Teen mahine ho gaye, Sethi ji. Hum toh bas yaad dilaane aaye hain.', "It's been three months, Sethi ji. We've only come to remind you.");
    await ctx.say('sheru', 'Chaabi.', 'The key.');
    await ctx.shot([hx - 4.3, 1.62, hz + 1.6], [hx - 2.5, 1.55, hz + 0.2]);
    await ctx.say('aryan', 'Kaunsi chaabi? Papa, ye log kaun hain?', 'What key? Papa, who are these people?');
    await ctx.shot([hx - 2.2, 1.6, hz - 0.4], [hx - 0.6, 1.5, hz - 2.3]);
    await ctx.wait(1.2);
    await ctx.say('gogi', 'Gaadi le ja rahe hain. Byaaj samajh lijiye.', "We're taking the car. Consider it interest.");

    // they take the family car
    await ctx.shot([hx - 1.5, 2.2, hz + 6.5], [LANDMARKS.homeParking.x, 0.9, LANDMARKS.homeParking.z], 0, 55);
    await ctx.walk(gogi, LANDMARKS.homeParking.x + 1.1, LANDMARKS.homeParking.z - 0.6, 1.6);
    ctx.removeActor(gogi);
    h.car.setAvailable(false);
    const familyCar = ctx.propVehicle('hatch', CAR.color, LANDMARKS.homeParking.x, LANDMARKS.homeParking.z, 0);
    await ctx.walk(sheru, -97.6, hz - 4.0, 1.8);
    ctx.removeActor(sheru);
    h.audio.engineBy();
    await Promise.all([ctx.drive(familyCar, -96.6, hz + 60, 10), ctx.drive(collectors, -98.4, hz + 58, 10)]);
    ctx.removeProp(familyCar.root);
    ctx.removeProp(collectors.root);

    // the reveal
    await ctx.shot([hx - 4.3, 1.62, hz + 1.6], [hx - 2.5, 1.55, hz + 0.2]);
    await ctx.say('aryan', 'Papa. Kitna?', 'Papa. How much?');
    await ctx.shot([hx - 3.0, 1.55, hz - 3.6], [hx - 0.6, 1.5, hz - 2.3]);
    await ctx.wait(0.8);
    await ctx.say('vinod', '...Chaudah.', '...Fourteen.');
    await ctx.say('aryan', 'Chaudah hazaar?', 'Fourteen thousand?');
    await ctx.shot([hx - 3.4, 1.6, hz - 0.2], [hx - 0.8, 1.5, hz - 1.1]);
    await ctx.wait(0.6);
    await ctx.say('neelam', 'Lakh, beta.', 'Lakh, son. (₹14,00,000)');
    await ctx.shot([hx - 3.0, 1.6, hz + 3.6], [hx - 1.4, 1.55, hz + 1.8]);
    await ctx.say('shanaya', 'Aryan...', undefined);
    await ctx.say('pihu', 'Cake... andar le chalein?', 'Shall we... take the cake inside?');
    await ctx.shot([hx - 10, 3.2, hz + 7], [hx - 1, 1.4, hz], 4);
    await ctx.fade(1, 0.8);
    for (const a of [neelam, pihu, shanaya, vinod]) ctx.removeActor(a);
  }, 0);

  // aftermath: the debt becomes visible for the rest of the game
  const save = h.save.data;
  save.debtRevealed = true;
  save.flags.carSeized = true;
  h.hud.setDebt(save.debt, true);
  h.hud.splash('₹14,00,000', 'हिसाब · The family owes the Kothi', '', 3.6);
  await ctx.wait(3.8);
  await ctx.say('gogi', 'Ring Road Parking, Majnu Ka Tila. Gaadi wahan milegi. — G', 'SMS from an unknown number: "Ring Road Parking, Majnu Ka Tila. The car will be there."', true);
}

function restoreParty(h: StoryHost) {
  placePlayer(h, HOME_ARRIVE.x, HOME_ARRIVE.z, HALF_PI);
  placeBike(h, -96.3, 27.5, 0);
}

export const M01_BIRTHDAY: Mission = {
  id: 'm01',
  title: 'Happy Birthday, Pihu',
  reward: 500,
  next: 'Shareef Driving (coming soon)',
  stages: [
    { id: 'intro', run: intro, restore: (h) => placePlayer(h, -32.2, 9.7, 0.55) },
    { id: 'toBakery', run: toBakery, restore: restoreToBakery },
    { id: 'buyCake', run: buyCake, restore: restoreBuyCake },
    { id: 'deliver', run: deliver, restore: restoreDeliver },
    { id: 'party', run: party, restore: restoreParty },
  ],
};

export const MISSIONS: Mission[] = [M01_BIRTHDAY];
