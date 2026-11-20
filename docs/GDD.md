# RING ROAD — Game Design Document

**Codename:** GTA DELHI
**Version:** 0.1 (Phase 0 — Design)
**Date:** 2026-11-21
**Status:** Draft for review. No code written yet.

> Design first. Build gradually. Test everything.

---

## 0. Executive Summary & Where I Pushed Back

**One-line pitch:** A 23-year-old delivery rider who knows every shortcut in North Delhi discovers that his family's debt was never an accident, and has to decide who he owes.

**The big decisions in this document:**

| Area | Decision |
|---|---|
| Title | **RING ROAD** (codename stays *Project Dilli*). Do **not** use "GTA Delhi" or "GTF Delhi". |
| Theme | *Hisaab* (accounts owed): money, loyalty, love. Aryan's arc moves from *managing* things to *deciding* them. |
| Core verb | Driving and riding through dense traffic. Combat is rare, short and mostly melee. |
| Starting district | **North Campus, Kamla Nagar and Majnu Ka Tila** (one compact "North Delhi pocket"). |
| World scope for the full campaign | 4 **pocket districts** joined by a stylised Ring Road, not 15 full districts. |
| Stack | Vite, TypeScript, **plain Three.js engine**, Rapier physics, **React only for UI**. Drop R3F and Drei (reasons in §21). |
| Art | Stylised low-poly ("Dusty Neon"). Most of the city is generated in code. Blender is optional. |
| Branching | About 8 story flags plus 3 endings. No branching mission trees. |
| Weapons | Fists, knife, pistol, AK-47, introduced gradually (§28) |
| Cutscenes | In-engine, data-driven (shots + dialogue + animation tracks), skippable (§27) |

**Where I disagreed with the brief, and why:**

1. **"GTA Delhi" / "GTF Delhi" as a name.** Rockstar's trademark makes it legally risky, and it tells players "knock-off" before they've played a second. The game's personality is Delhi, so the name should be too.
2. **React Three Fiber and Drei.** They're excellent for interactive scenes, but an open world with chunk streaming, object pools, a fixed-timestep physics loop and hundreds of instanced objects is easier to control with an imperative engine. React stays for the HUD, phone, dialogue and menus. See §21.
3. **Fifteen districts.** That is several years of work for a large studio. The 10-mission campaign needs four *pocket* districts and a connector road. The rest go on a post-campaign expansion list.
4. **Gunplay.** *Updated after your direction:* weapons **are in scope**: fists/melee, knife, pistol and one AK-47. They're expensive (aiming, hit reactions, enemy AI, animation), so they arrive in stages: melee and knife in Phase 5, pistol in Phase 5–6, the AK-47 in Phase 6 for late-story set pieces. Driving stays the core verb. See §28.
5. **Facial animation.** Expensive and easy to get wrong ("uncanny"). Dialogue uses illustrated expression portraits plus body language in-engine.
6. **Phase order.** Driving is the core verb, so a greybox motorcycle moves into Phase 1. If riding doesn't feel good on day 10, nothing else matters.
7. **Realistic Delhi geography.** Use real Delhi as inspiration and compress it. Districts are about 1:1.5 scale, and the roads between them about 1:5. A 1:1 Delhi would be empty, slow and expensive.
8. **Gangs and real communities.** No faction is defined by caste, religion, region or a real political party. Factions are defined by *business model* (old-money lending versus new-money nightlife). Every community that appears has good, bad and ordinary people.

---

## 1. Creative Direction

### 1.1 Design pillars

1. **Dilli is a character.** Traffic, crowds, weddings, food, heat and honking are gameplay systems, not wallpaper. A traffic jam is a problem to solve, a baraat is a mission, a chai stall is where gossip about your choices reaches you.
2. **Debt, not glory.** Aryan never wanted to be a gangster. Every step he takes into the underworld is paid for with something: money, trust or time with people he loves.
3. **Driving is the verb.** Bike or car is always a real choice. Bikes filter through jams and fit into galis. Cars protect you, carry passengers and push through. Chases are the action set pieces.
4. **Few choices, all remembered.** About eight meaningful decisions across the campaign. Each one shows up again later in dialogue, an objective or the ending.
5. **Small and dense beats big and empty.** A 600 m district full of life is better than a 6 km one with nothing in it.

### 1.2 Tone

A grounded urban crime drama with the dry, affectionate comedy of Delhi street life. Tension comes from people, not explosions. Funny moments stay in serious missions (an uncle dancing on your bonnet during a police escape), and serious moments stay in quiet ones (a father's confession during a power cut).

**What this game is not:**
- A rampage sandbox that rewards random violence.
- A satire of real politicians, police units, colleges or companies.
- A depiction of real gangs or real crimes.
- A how-to for anything. Criminal activity stays abstract and cinematic: "the ledger", "the deal", "the raid".

### 1.3 Visual direction: "Dusty Neon"

- **Style:** stylised low-poly with flat or soft shading and strong silhouettes. Think painted diorama, not photorealism. It's cheaper, ages better and runs on weak hardware.
- **Palette:** dusty ochre and faded pastel buildings by day, sodium-orange streetlights and harsh tube-light whites at night. Brand accents are ledger red, auto-rickshaw green-and-yellow and Garage orange.
- **Delhi signifiers (cheap and high impact):** tangled overhead wires, hand-painted signboards in Hindi and English, water tanks on roofs, AC units, balconies with laundry, ISI-mark shutters, potted tulsi, scooter rows, election-poster-style wall ads (fictional).
- **Lighting presets per mission** (golden hour, harsh noon, night market, monsoon storm) instead of a full day/night cycle until Phase 6.

### 1.4 Audio direction

- Honking is the city's percussion, built as a layered, distance-based ambience system.
- Original score: electronic and dholak-driven for tension, harmonium and strings for emotional scenes.
- Fictional FM radio stations (later phase): a Hinglish RJ, old film-style songs (original), devotional morning station, news and ads that react to story events.

### 1.5 Language

- Dialogue in **Hinglish (Latin script)**, with an English subtitle toggle.
- Signage in **Devanagari and English** (Noto Sans Devanagari for in-world text).

---

## 2. Title & Branding

### 2.1 Recommended title: **RING ROAD**

- Delhi's Ring Road links every district we build. The finale happens on it.
- It's a metaphor for the story: debts come back around, fathers' choices repeat in sons, and the story ends where it started (the chai stall).
- It's original, short, pronounceable worldwide and Delhi-specific.

**Tagline options:**
- "Every road in Dilli leads back to what you owe."
- *"Har raasta kisi hisaab pe khatam hota hai."*
- "Dilli mein sab ki setting hai. Ab tumhari baari."

### 2.2 Alternatives

| Title | Meaning | Pros | Cons |
|---|---|---|---|
| **HISAAB** | The account / reckoning | Thematic, strong single word | Less clear to non-Hindi speakers |
| **UDHAAR** | Debt / borrowed | Very on-theme | Sounds bleak |
| **GALIYAAN** | The lanes | Atmospheric | Less hint of action |
| **DILLI NIGHTS** | — | Instantly readable | Generic |

> Before any public release, search game stores and trademark databases for your final name. I haven't verified that "Ring Road" is unused for a game.

### 2.3 Branding concept

- **Logo:** the Ring Road drawn as a closed loop that doubles as a red rubber stamp from a *bahi-khata* ledger, with "RING ROAD" in a heavy condensed sans-serif and "रिंग रोड" set beneath.
- **Key art idea:** Aryan on his bike at a red light at night under tangled wires, an SUV's headlights behind him, a red ledger strapped to the carrier.
- **Colours:** Ledger Red `#B3261E`, Sodium Orange `#F2A33A`, Auto Green `#2F7D32`, Auto Yellow `#F5C518`, Night Navy `#141B2D`, Dust `#D9C7A3`.
- **UI motif:** ledger lines, rubber stamps, handwritten amounts. Mission complete is a stamp: **"हिसाब — CLEARED"**.

---

## 3. Aryan Sethi — Protagonist

| | |
|---|---|
| **Age** | 23 |
| **Home** | Rented 2-room flat, third floor, no lift, Shakti Nagar (next to Kamla Nagar), North Delhi |
| **Education** | B.Com at the fictional *Kesar Lal College*, North Campus. Dropped out in final year. |
| **Occupation** | Night-shift rider for *TurboKart*, a fictional 10-minute grocery app. He also rides his mother's tiffin deliveries in the afternoons. |
| **Earnings** | About ₹25,000 a month, varying with shifts and ratings |
| **Signature vehicle** | *Vayu Spark 125*, a battered commuter motorcycle with a TurboKart box on the back |

### 3.1 Background

Aryan grew up in Chawri Bazar's wedding-card lanes, where his father **Vinod** ran *Sethi Card Mahal*, a small, respected wedding-card printing press. Aryan spent childhood summers folding cards, smelling ink and running errands through Old Delhi. He knows the walled city's lanes better than its monuments.

Then the press's business shrank: digital invitations, then the pandemic's cancelled wedding seasons. Vinod borrowed from an "informal family friend" to keep it alive. The press closed anyway. Two years ago Vinod had a stroke. The family moved to a cheaper rental in Shakti Nagar, Aryan dropped out to work, and Vinod, a proud man now with a weak left hand, became quiet.

Aryan believes the family owes about ₹2 lakh. The real figure is ₹14 lakh, and that is the first thing the game tells him.

### 3.2 Personality

- **Funny.** He deflects pain with jokes and is genuinely good company.
- **A jugaadu.** He can fix, talk his way out of or reroute almost anything. Everyone in the gali calls him for help.
- **Observant about the city.** He reads Delhi traffic the way a sailor reads tides: which signal is broken, which lane floods first, when the Kamla Nagar evening jam starts. This is his only "superpower", and it becomes a gameplay mechanic (*Gali Gyaan*, §17).
- **Protective,** especially of his sister Pihu.
- **Conflict-avoidant.** He says yes to everyone and manages problems instead of deciding them.

### 3.3 Motivations

1. Clear the family's debt.
2. Get Pihu through medical-entrance coaching, which the family can't afford.
3. Win back his father's dignity. The secret dream is to reopen the press.
4. Be someone Shanaya doesn't have to explain to her family.

### 3.4 Flaws

- Lies by omission. He tells people the version that keeps the peace.
- Pride. He would rather do something dangerous than ask for help.
- A temper that flares only when his family is humiliated.
- Says yes too quickly, so others make his decisions for him.

### 3.5 Fears

- Becoming his father, a good man who signed the wrong paper.
- Being ordinary forever ("10-minute delivery boy").
- Shanaya outgrowing him.

### 3.6 Relationship with Delhi

Aryan knows Delhi at street level, not postcard level. He hasn't been inside the Red Fort since a school trip, but he knows which chaiwala opens at 5 AM, where the speed bumps are on Chhatra Marg and how to get from Kamla Nagar to Majnu Ka Tila in a jam. Delhi is his co-worker, his opponent and his home. In the epilogue the player finds out whether he still loves it.

### 3.7 Connection to the underworld

It starts with the debt. His father's loan came from the **Kothi**, an old-Delhi lending network (§6). Aryan's riding skill and street knowledge make him useful to **Lucky Malik**, the Kothi's collector, and Lucky has a hidden personal reason for picking Aryan (revealed in M8).

### 3.8 Arc: from *managing* to *deciding*

| Act | Aryan's state | Behaviour |
|---|---|---|
| I — *Udhaar* (Debt) | Reactive | Takes the work because there's no choice. Lies to keep everyone calm. |
| II — *Setting* (Connections) | Competent and compromised | He's good at this, and that scares him. The secrets pile up. |
| III — *Ring Road* | Forced to choose | Lucky hands him the ledger: "Ab tera hisaab hai. Tu decide kar." |

---

## 4. Shanaya Khurana — Co-Lead

| | |
|---|---|
| **Age** | 23 |
| **Home** | Lajpat Nagar, South Delhi, with her parents |
| **Education** | Second-year LL.B at the University Law Faculty (fictionalised), North Campus. Before that, a BA in Political Science at Kesar Lal College, where she met Aryan. |
| **Work** | Junior volunteer at the *Haq Legal Aid Clinic*, run by Advocate Farida Qureshi, which helps tenants and small shopkeepers |
| **Passion** | Founder-director of **Aaina** ("mirror"), a nukkad natak (street theatre) group |

### 4.1 Background

Shanaya's family runs *Khurana Suits & Sarees*, a mid-sized showroom in Lajpat Nagar Central Market. Her father **Rajiv** is warm, anxious about money and image, and believes in "settling" (job, marriage, flat). Her mother **Anju**, a school teacher, gave up an MA to raise the family and quietly regrets it. Her elder brother **Karan** works in corporate finance in Gurugram and treats Aryan with polite contempt.

### 4.2 Personality

- Sharp, articulate and funny in a dry way. She wins arguments and sometimes regrets winning them.
- Organised and a planner. She has a five-year plan and a backup plan.
- Morally serious without being preachy, though she can be self-righteous when tired.
- Brave in public (she will confront a landlord in a crowded market) and unsure in private.

### 4.3 Her own ambitions and problems

- **The dilemma:** a prestigious corporate law firm has offered her a paid internship. Her family is ecstatic. But it overlaps with the Haq Clinic's biggest case: shopkeepers in Chawri Bazar facing eviction for a "heritage redevelopment". Money and security against values is the *same* dilemma Aryan faces, from the other side.
- **Fear:** becoming her mother, a brilliant woman who postponed herself.
- **Social circle:** Ira (stand-up comic, best friend), the Aaina theatre group (including Rohit), clinic colleagues and law-school rivals.

### 4.4 Relationship with Delhi

A South Delhi girl who fell in love with North Campus chaos. The Metro's Yellow Line (fictional *Peeli Line*) is her thinking space. She knows the city as a map of injustices and of excellent food, and argues about both with equal heat.

### 4.5 Her opinion of Aryan

She loves his loyalty, the way he knows every chaiwala's name and how gentle he is with Pihu. What she can't stand: *"Tum har cheez manage karte ho, Aryan. Kabhi kuch decide nahi karte."* ("You manage everything, Aryan. You never decide anything.")

### 4.6 Meaningful narrative role

- She runs a **parallel investigation** from the legal side (the eviction case) that collides with Aryan's from the underworld side.
- She is **playable** for a section of M9.
- She makes at least one decision **against** Aryan's interest that is right by her own values (M8).
- **She is never kidnapped, killed or used as a prize.** Her outcome depends on trust and on her own choices, not on whether Aryan "saves" her.

---

## 5. Aryan & Shanaya — Relationship and Story Arc

### 5.1 History

They met three years ago when Aaina needed someone with a bike to carry props to a performance. Aryan showed up, stayed, and ended up playing a corrupt landlord in their next play (badly, by everyone's account). They've been together for about 2.5 years. Her parents know he exists but treat him as "a phase". His family adores her. Neelam calls her before calling Aryan.

### 5.2 Where they stand at the start

Comfortable but drifting. Since he dropped out, Aryan stopped talking about the future. Shanaya keeps asking "What's the plan?" and he keeps joking.

### 5.3 Relationship stages

| Stage | Missions | What happens |
|---|---|---|
| **Drifting** | M1–M2 | Warmth, inside jokes, small missed promises |
| **Secret** | M3–M6 | Aryan hides his work for Lucky. Shanaya rewrites her play's ending using his family's pain. Both cross a line. |
| **Rupture** | M7 | She sees everything at once, in a moving car, during a chase |
| **Reckoning** | M8 | She tells him she's filing the petition anyway. Honesty versus safety. |
| **Partnership or parting** | M9–Epilogue | They work together as equals, or they end it, depending on trust and the ending path |

### 5.4 Trust (hidden value)

Shanaya's **Trust** moves only through *narrative honesty and kept promises*, never through gifts.

| Moment | Raises trust | Lowers trust |
|---|---|---|
| M3 after the play | Half-truth ("Lucky ka kaam hai, debt ke liye") | Full lie |
| M5 Chawri Bazar | Greeting her and admitting why he's there | Hiding from her |
| Side hangouts (3 in Act II) | Showing up | Cancelling for a job |
| M7 at India Gate | Telling the full truth, ledger included | Partial truth |
| M8 her petition | Supporting her filing | Asking her to wait |

### 5.5 Clichés we avoid

- No love triangle.
- No damsel-in-distress kidnapping.
- No "she leaves, he grand-gestures, she returns".
- No relationship meter on the HUD.
- No "girlfriend nags, hero ignores". Shanaya is right about some things and wrong about others, and so is Aryan.

---

## 6. Fictional Factions

All factions, people, businesses and events are fictional. Factions are defined by business model, never by community, caste, religion or region.

### 6.1 The Kothi (कोठी) — "Old Delhi's ledger"

- **What it is:** an old informal-finance and market-influence network rooted in Old Delhi's wholesale markets. It began in the 1980s as a respected *committee* (a rotating savings circle) run from the Bhalla family's kothi. It grew into lending to traders that banks wouldn't touch, then into controlling parking contracts, godowns and wedding-season logistics.
- **Front businesses:** Bhalla Paper Traders (wholesale), the market traders' association office, parking-lot contracts in North Delhi.
- **Culture:** personal, paper-based and courtly. Debts live in red cloth-bound *bahi-khata* ledgers. They run on izzat, favours and "family friendships". Violence is a last resort but real. No phones at meetings.
- **Territory:** Chandni Chowk and Chawri Bazar, Kashmere Gate godowns, Kamla Nagar market, the Majnu Ka Tila parking lot.
- **Look:** maroon, brass and cream. White kurta-pyjamas with Nehru jackets, gold-rimmed spectacles, an old white *Kesari Classic* sedan.
- **Internal conflict:** Pradhan's old ways against his son Kunal's "modernisation", and Lucky's loyalty to Pradhan against his disgust at what the Kothi has become.

### 6.2 The Garage (गैराज) — "South Delhi's new money"

- **What it is:** a network built around luxury car modification, car rental and nightlife in South Delhi. Its front is *Torque Lab*, a custom workshop in an industrial pocket near Saket, plus clubs in Hauz Khas Village. Its illegal income stays abstract in-game: betting apps, car-paperwork rackets and club "arrangements".
- **Culture:** fast, digital, image-obsessed. Matte-black SUVs, orange crew jackets, neon, car meets on the city's outskirts. Its people call themselves "stakeholders", not gangsters.
- **Territory:** Hauz Khas, Saket and Mehrauli, now expanding north into parking contracts and campus betting.
- **Internal conflict:** enforcer Tony Bisht thinks leader Meher has made them "a builder's security guards". The street-racing *Pit Crew* hates the violence.

### 6.3 Anand Infra — the hidden third power

- **What it is:** not a gang. A respectable real-estate developer with billboards all over the city ("Building Tomorrow's Dilli") and a "Purani Dilli Heritage Revival Project".
- **The secret:** Anand Infra uses Kothi debts as a land-acquisition tool. Shopkeepers in Chawri Bazar were given loans designed to fail, and their properties pass to Anand-linked companies when they default. When Pradhan got cold feet, Anand began quietly funding **both** the Garage's expansion and Kunal's coup, so the Kothi would collapse and its ledger (the debts) would transfer to *Anand Asset Recovery Pvt. Ltd.*
- **Look:** glass, white marble, CSR banners, black SUVs, polite lawyers.

### 6.4 Backstory timeline

| When | Event |
|---|---|
| 1980s | Satpal Bhalla starts the committee in Chawri Bazar |
| 2000s | The Kothi grows into lending, parking and godowns |
| 2010 | Builder Vikram Anand needs Old Delhi contacts and meets Pradhan |
| 2020–21 | Pandemic: weddings cancelled, markets shut, loans spike. Anand proposes the "Heritage" plan and Pradhan agrees. |
| 2022 | Vinod Sethi borrows ₹2 lakh, signs blank papers "as formality", and the loan is marked *"Anand A/c"* |
| 2024 | Pradhan hesitates because some defaulters are old friends. Anand begins cultivating Kunal and the Garage. |
| Game start | Late June. Pre-monsoon heat. The last wedding season before Chaturmas. |

### 6.5 How the conflict escalates

| Mission | Gang-war temperature |
|---|---|
| M1–M2 | Only debt and collection. No war, no rivals. |
| M3 | The word "Garage" is spoken for the first time |
| M4 | Garage seen meeting Kunal. First chase. |
| M5 | A Garage tail in Old Delhi. Anand's name is heard. |
| M6 | Police raid on the Kothi wedding (who tipped them?) |
| M7 | Open betrayal. Lucky arrested. Shooting threatened. |
| M8 | The Garage comes to Aryan's home street |
| M9 | Anand revealed as the paymaster of both sides |
| M10 | Everyone converges on one ledger and one road |

---

## 7. Main Antagonists

### 7.1 Kunal Bhalla — the personal antagonist (31)

- Pradhan's only son. MBA abroad, came back to a father who still won't let him sign cheques.
- **Aryan's dark mirror:** another son crushed by his father's choices. Kunal escapes by force, Aryan by work.
- Charming, contemptuous, modern: *"Papa abhi bhi bahi-khate mein jeete hain. Duniya QR code pe chal rahi hai."*
- **Arc:** makes a secret deal with the Garage and Anand (M4), betrays Lucky (M7), turns on his own father (M8), and faces Aryan on the Ring Road (M10).

### 7.2 Meher Dutta — the rival (38)

- Ex-event manager who built the Garage out of South Delhi's party economy. She speaks softly and calculates constantly.
- *"Delhi doesn't have gangs anymore, Kunal. It has stakeholders."*
- Not a monster. She can become a temporary ally in Ending C when she learns Anand plans to discard her too.

### 7.3 Vikram Anand — the systemic antagonist (52)

- Developer, philanthropist and heritage enthusiast. He never raises his voice and never throws a punch.
- *"Heritage is just real estate with a good story."*
- The final reveal: the man behind both sides.

### 7.4 Satpal "Pradhan ji" Bhalla — the ambiguous patriarch (68)

- Courtly, feeds pigeons, remembers everyone's children's names. He made the original deal with Anand.
- He is both Aryan's would-be benefactor and the man who ruined his father.

---

## 8. Supporting Characters

| Character | Role | Notes |
|---|---|---|
| **Vinod Sethi** (52) | Aryan's father | Former wedding-card printer, recovering from a stroke. Ashamed and secretive. His confession in M8 is the emotional core. |
| **Neelam Sethi** (48) | Aryan's mother | Runs a home tiffin service for PG students. The family's real backbone, practical and funny. Her tiffin customers form an information network (side content). |
| **Pihu Sethi** (16, turns 17 in M1) | Aryan's sister | Class 12, preparing for medical entrance. Sarcastic, brilliant, sees through her brother. |
| **Lucky Malik** (45) | Kothi collector, Aryan's mentor | Charming, philosophical, dangerous. *"Dilli mein sab udhaar pe chalta hai."* Secret: as a 14-year-old he swept the floor of Vinod's press, and Vinod paid his school fees. |
| **Bittu (Vivek Negi)** (24) | Childhood friend, two-wheeler mechanic | Comic, loyal, dreams of his own custom-bike shop. Runs the customisation hub. |
| **Tenzin Norbu** (25) | Friend, runs his family's rooftop café in Majnu Ka Tila | Delhi-born, wry, observant, plays guitar. Torn between expanding the café and his cousins' push to move to Canada. Values honesty above everything. |
| **Mola** (Tenzin's grandmother) | Café matriarch | Few words, all accurate: "Drink. You look like someone who is lying." |
| **Rohit Kumar** (20) | B.Sc Computer Science student, Aaina actor | Lost committee money on a Garage betting app. Anxious and brilliant. Ally or casualty depending on M3. |
| **Ira Bhatt** (24) | Shanaya's best friend | Stand-up comic in Hauz Khas. Comic relief and Shanaya's confidante. |
| **Advocate Farida Qureshi** (61) | Runs the Haq Legal Aid Clinic | Veteran tenant-rights lawyer from Old Delhi, Shanaya's mentor. Unshakeable. |
| **C.P. Jain** (66) | Retired card printer, Vinod's old friend | The clinic's lead client in the Chawri Bazar eviction case |
| **ACP Devika Rawat** (44) | Crime Branch officer | Honest but pragmatic. Wants Anand, not small fish. Blocked by "higher-ups". |
| **Tony Bisht** (35) | Garage enforcer | Ex-bouncer, blunt, loyal to Meher, distrusts Anand |
| **Gogi & Sheru** | Kothi muscle | A comic but menacing duo who are always eating something |
| **Ramesh bhaiya** | Chaiwala | Runs the chai stall where the game begins and ends. Source of gossip that reacts to story choices. |

---

## 9. Central Storyline

### Act I — *Udhaar* (Debt): M1–M3

On his sister's birthday, Aryan learns his family owes ₹14 lakh to the Kothi when collectors seize the family car. To get it back he takes a "simple" driving job for Lucky Malik, the Kothi's collector, and finds himself good at it. Lucky's next job collides with Shanaya's theatre premiere: hunting down Rohit, a student in her own troupe who lost Kothi money on a betting app. Aryan hears a name for the first time: *the Garage*.

### Act II — *Setting* (Connections): M4–M7

Spying from Tenzin's rooftop, Aryan sees Kunal, the Kothi's heir, secretly meeting the Garage. Summoned to Pradhan's Old Delhi haveli, he finds his father's old press turned into a site office for Anand Infra, and runs into Shanaya, who is working on an eviction case in the same lane. At Pradhan's granddaughter's wedding, a police raid forces Aryan to smuggle the Kothi's master ledger out inside a baraat procession. Reading the ledger, he discovers his father's loan, and dozens of others, were designed to fail. At a "truce" meeting in Hauz Khas, Kunal sells Lucky to the police. Aryan escapes a Garage chase with Shanaya in the passenger seat, and she learns everything at once.

### Act III — *Ring Road*: M8–M10 and Epilogue

The monsoon breaks. The Garage comes for Aryan's family, and he gets them across a flooded city to Tenzin's café. There his father confesses, and Lucky reveals why he chose Aryan. Shanaya tells him she will file the clinic's petition no matter what. Aryan and Shanaya infiltrate Anand Infra's heritage gala in Connaught Place, one as a valet and one as a guest, and confirm that Anand has been paying both sides. With every faction converging on Lucky and the ledger, Lucky gives it to Aryan: *"Ab tera hisaab hai."* Aryan drives the Ring Road one last night and decides where the ledger ends up.

### Endings

| Path | Destination | Summary |
|---|---|---|
| **A — *Gawahi* (Testimony)** | ACP Rawat and the court where Shanaya files at dawn | The ledger becomes evidence. Anand falls. Aryan faces minor charges as a cooperating witness. The family debt is declared void. |
| **B — *Gaddi* (The Seat)** | Pradhan's haveli | Aryan hands the ledger back and takes Lucky's place. His family's page is torn out; everyone else still owes. Shanaya leaves. |
| **C — *Hisaab Barabar* (Settled)** | Anand's farmhouse | Aryan sets Meher, Kunal and Anand against each other and burns the ledger. Nobody owns anybody, including the law. |

**Shanaya outcome by path and trust:**

| | High trust | Low trust |
|---|---|---|
| **A** | Together, as equals. She's arguing his case. | They part with respect. She still wins the case. |
| **B** | She leaves, but sends one last voice note | She leaves without a word |
| **C** | Together but uneasy. She knows what he did. | She leaves |

**Epilogue — "Chai, Subah Chhe Baje":** dawn at Ramesh bhaiya's chai stall from M1. Who sits beside Aryan (Shanaya, Lucky, Pihu, his father, or nobody) depends on everything above. Then free roam continues.

---

## 10. Main Missions

Each mission lists: location, context, characters, opening, objectives, mechanics, dialogue, twist, completion, rewards, consequences, connection, and complexity.

### M1 — "Happy Birthday, Pihu"
- **Location:** chai stall → Kamla Nagar market → Shakti Nagar (Aryan's home). Golden hour into dusk.
- **Context:** Aryan finishes a 10-hour shift. It's Pihu's 17th birthday. Shanaya is already at the Sethi flat decorating with Neelam.
- **Characters:** Aryan, Shanaya (phone, then at home), Pihu, Neelam, Vinod, Bittu, Gogi & Sheru (collectors).
- **Opening:** close-up on a TurboKart delivery box. Aryan sips chai under tangled wires. Phone: 3 missed calls, "Shanaya ❤️" and "Mummy". Ramesh bhaiya: *"Aaj phir late? Tera boss tujhe award dega ya notice?"*
- **Objectives:**
  1. Walk to the bike (movement tutorial).
  2. Ride to Sweet Pinch Bakery (riding tutorial, horn, map marker).
  3. The bakery has moved. Ask a vendor and find it on foot (first NPC interaction).
  4. Ride home with the cake. A **cake-condition meter** drops with bumps, hard braking and collisions. The evening jam teaches lane-filtering.
  5. Climb the stairs. Cutscene.
- **Mechanics:** walking, running, riding, interact prompt, fragile-cargo meter, traffic jam.
- **Dialogue:** Shanaya: *"Pineapple. Not chocolate. Pihu says chocolate is for children."* Pihu, if the cake is damaged: *"Cake ki haalat dekh ke lagta hai tum Ring Road pe stunt karke aaye ho."* Gogi, politely, which is worse: *"Sethi ji, happy birthday bitiya ko. Teen mahine ho gaye."* He takes the car keys from the hook: *"Byaaj samajh lijiye."*
- **Twist:** Aryan asks, "Papa, kitna?" Vinod: *"…Chaudah."* "Chaudah hazaar?" Neelam: *"Lakh, beta."* The debt is ₹14 lakh, not ₹2 lakh, and Shanaya is in the room.
- **Completion:** reach home with the cake. There's no fail state for poor riding; cake condition only changes dialogue.
- **Rewards:** ₹500 shift pay. Unlocks the phone, map and Bittu's contact.
- **Consequences:** the **Hisaab counter** appears on the HUD: ₹14,00,000.
- **Next:** Gogi leaves a parking token: *"Ring Road Parking — Majnu Ka Tila."*
- **Complexity:** Low–Medium. The ideal first mission (Phase 4).

### M2 — "Shareef Driving"
- **Location:** Kothi parking lot at Majnu Ka Tila → Ring Road → a warehouse at the district edge.
- **Context:** Aryan goes to get the car back.
- **Characters:** Aryan, Lucky Malik, Gogi, a traffic-police head constable, Tenzin (cameo from his rooftop).
- **Opening:** a parking attendant on a plastic chair under a beach umbrella. Lucky eats rajma-chawal from a steel tiffin on the bonnet of the Sethi family car. It's Neelam's tiffin: *"Har Mangalvaar aata hai. Dilli chhoti hai, beta."*
- **Objectives:**
  1. Talk to Lucky. The first-impression choice (angry, polite or joke) sets a minor flag.
  2. Lucky's offer: drive the car, boot locked, to his warehouse across the Ring Road.
  3. **Shareef Driving:** a suspicion meter rises with speeding, red lights, wrong-side driving, excessive honking, collisions or no seatbelt.
  4. Police checkpoint dialogue: "Papa ki gaadi hai."
  5. Deliver.
- **Mechanics:** the car tutorial, traffic signals, and law-abiding driving, a deliberate inversion of the genre.
- **Twist:** the boot holds stacks of old red *bahi-khata* ledgers. Lucky: *"Kaagaz. Dilli kaagaz pe chalti hai."* The ledgers become central in M6.
- **Completion:** arrive with suspicion below the limit. A failure restarts at the checkpoint.
- **Rewards:** ₹50,000 off the debt (watching the counter tick down should feel satisfying). The car is returned "for use", unlocking the first car.
- **Consequences:** Lucky is in the phone's contacts. Aryan lies to his family: "settlement ho gaya."
- **Next:** Lucky texts: *"Kal. Campus. Ek ladka dhoondhna hai."* It's the same evening as Shanaya's premiere.
- **Complexity:** Medium (car controller, traffic signals, suspicion system).

### M3 — "Nukkad"
- **Location:** North Campus: college lawns, canteen, a hostel, Hudson Lane.
- **Context:** premiere of Aaina's street play *Byaaj* (Interest). Rohit, who collected ₹3 lakh in committee money for the Kothi and lost it, plays the moneylender.
- **Characters:** Aryan, Shanaya, Rohit, Ira, Lucky (phone), Gogi.
- **Opening:** a circle of students on the lawn, a dholak beat. Shanaya in black with a red dupatta: *"Maine ending badal di. Pehle family jeet jaati thi. Ab… nahi jeetti. Theek hai na?"* She used his family's story. The player chooses a reaction.
- **Objectives:**
  1. Watch the opening (crowd showcase).
  2. Lucky calls: identify Rohit by investigating the crew, canteen and hostel. A clue: a bus ticket out of the city.
  3. Rohit bolts mid-play. Foot chase across campus, over a wall, into Hudson Lane.
  4. **Decision:**
     - (A) Hand him to Lucky.
     - (B) Cover his ₹3 lakh by adding it to your own debt.
     - (C) Hide him at Tenzin's.
- **Mechanics:** on-foot investigation, foot-chase AI, a branching choice.
- **Twist:** Rohit lost the money on a betting app run by *the Garage*, the first time the name is heard.
- **Completion:** Rohit is resolved.
- **Rewards:**
  - A: ₹20k and Lucky's trust goes up.
  - B: debt goes up ₹3L; Rohit becomes an ally.
  - C: Rohit becomes an ally and Lucky becomes suspicious.
- **Consequences:** the `rohit_ally` flag pays off in M9. After the play, Shanaya asks why he ran after her actor; lie or half-truth (trust).
- **Next:** the Garage is moving in on the Majnu Ka Tila parking contract.
- **Complexity:** Medium–High.

### M4 — "Rooftop, Majnu Ka Tila"
- **Location:** Tenzin's rooftop café overlooking the colony square; rooftops; narrow lanes; the Ring Road.
- **Context:** Lucky wants photos of whoever is meeting Garage enforcer Tony Bisht.
- **Characters:** Aryan, Tenzin, Mola, Tony Bisht, Kunal (in a cap), Garage riders.
- **Opening:** Tenzin making laphing: *"My café is not your CCTV, Aryan."* Honesty persuades him. A lie forces a harder route over a neighbour's roof.
- **Objectives:**
  1. Gain rooftop access.
  2. Photo mode: tag three targets.
  3. The mystery man removes his cap: Kunal Bhalla.
  4. A phone glint gives Aryan away. Escape over rooftops among prayer flags, water tanks and laundry.
  5. Bike chase on the Ring Road. Lose the Garage riders.
- **Twist:** the Kothi's heir is dealing with its rival.
- **Decision:** send the photos to Lucky (Kunal hostile), keep them as leverage (leverage flag), or delete them.
- **Rewards:** ₹1L off the debt. Unlocks Tenzin hangouts and a laphing food buff.
- **Consequences:** the Garage knows Aryan's face, so spotters start appearing in North Delhi.
- **Next:** *"Pradhan ji tumse milna chahte hain. Kal, haveli."*
- **Complexity:** High. Fallback: scripted rooftop route and simple pursuers.

### M5 — "Haveli"
- **Location:** Old Delhi: pedestrianised Chandni Chowk, Khari Baoli spice market, Chawri Bazar's card lanes, Pradhan's haveli in a *katra*.
- **Characters:** Aryan, Lucky, Pradhan, Kunal, C.P. Jain, Shanaya, Advocate Qureshi, a Garage tail.
- **Opening:** Lucky at the metro exit with two plates of chole bhature: *"Pradhan ji se khaali pet nahi milte."*
- **Objectives:**
  1. Follow Lucky through the crowd. An e-rickshaw ride is optional.
  2. Lucky splits off. Reach the haveli **by landmark directions over the phone, with no map marker**: *"Paper waale ke baad left, neeli gate, jispe Ganesh ji ki tile hai — nahi, doosri wali."*
  3. Spot a Garage tail and lose him in Khari Baoli. Spice dust makes pursuers sneeze and stop.
  4. Pass Aryan's father's old press, now a sign reading *"Anand Heritage Project — Site Office"*. Shanaya stands outside C.P. Jain's shop. Greet her or hide.
  5. Haveli scene.
- **Dialogue:** Pradhan, feeding pigeons: *"Tumhare papa ke haath mein hunar tha. Hunar se ghar nahi chalta, beta. Hisaab se chalta hai."* He offers ₹3L off the debt if Aryan is his driver at his granddaughter's wedding.
- **Twist:** on the phone, Pradhan says *"Anand sahab, sab time pe hoga."*
- **Completion:** the haveli scene ends.
- **Rewards:** ₹1L advance. Old Delhi pocket opens for free roam. E-rickshaw becomes rideable.
- **Consequences:** if he told Shanaya the truth, the relationship moves to "Secret shared".
- **Next:** the wedding is in three days, the last auspicious date before Chaturmas.
- **Complexity:** Medium–High. Crowds are performance-heavy.

### M6 — "Baraat"
- **Location:** the *Shehnai Palace* banquet hall and the baraat route through Shakti Nagar.
- **Characters:** Aryan, Pradhan, Kunal, Lucky, ACP Rawat, the baraat (groom on a white horse, brass band, dancing relatives), Bittu.
- **Opening:** fairy lights, a generator hum, a sweet-stall queue, Pradhan holding a red cloth bundle, the master ledger (*Laal Bahi*), on his lap.
- **Objectives:**
  1. Mingle. Optional wedding activities.
  2. ACP Rawat's raid. Pradhan hands over his keys and the ledger: *"Gaadi nikaalo. Baraat ke saath. Police baraat nahi rokti."*
  3. **Blend into the baraat:** drive at dance pace inside the procession. Leaving formation or honking raises suspicion. Fufaji climbs onto the bonnet: *"Bhai dheere! Naagin dance chal raha hai!"*
  4. The baraat turns. Break away. Short police pursuit through the lanes.
  5. Hide in Bittu's garage.
- **Twist:** Aryan opens the *Laal Bahi* and finds his father's name, a rigged rate and the note *"Anand A/c"*. C.P. Jain and 30 other Chawri Bazar shopkeepers carry the same note. **The debt was a land grab.**
- **Decision:** photograph the pages (enables Ending A at full strength; risky) or not.
- **Completion:** deliver the ledger to Lucky.
- **Rewards:** ₹3L off the debt. Unlocks wedding side activities.
- **Consequences:** the police Heat system is introduced, and Rawat knows Aryan's face. Sets `ledger_photos`.
- **Next:** a truce meeting in Hauz Khas. Kunal negotiates, Aryan drives.
- **Complexity:** High. The showpiece mission.

### M7 — "Hauz Khas, 2 AM"
- **Location:** a long drive north to south, Hauz Khas Village (clubs, the lake, stylised ruins), the escape north, India Gate lawns at dawn.
- **Characters:** Aryan, Kunal, Lucky, Meher Dutta, Tony Bisht, Shanaya, Ira, ACP Rawat.
- **Opening:** the first long drive, with Kunal talking. *"Duniya QR code pe chal rahi hai, aur Papa laal kapde mein kaagaz baandh ke baithe hain."*
- **Objectives:**
  1. Drive Kunal south.
  2. Park in the impossible Hauz Khas Village lane (parking challenge).
  3. Wait and explore. Shanaya is two doors away at Ira's stand-up set; Aryan had told her he had a shift.
  4. The meeting goes wrong. Kunal sells Lucky to Rawat as a fall guy. Lucky is arrested.
  5. "Clean up the driver." Shanaya sees, runs over and gets into the car.
  6. Chase north with Shanaya talking throughout: *"Aryan, red light—" "Pata hai." "Woh log kaun hain?" "…Baad mein." "Nahi. Abhi."*
- **Twist:** Kunal's betrayal, and Shanaya learning everything at once.
- **Decision:** at India Gate at 4 AM, empty lawns and sprinklers, full truth (including the ledger) or partial truth.
- **Dialogue:** *"Tum har cheez manage karte ho, Aryan. Kabhi kuch decide nahi karte."*
- **Rewards:** no money; the job failed, deliberately. Unlocks the South and Central pockets.
- **Consequences:** Lucky in custody, the Kothi destabilised, high Garage Heat. Shanaya leaves in an auto at dawn.
- **Next:** the monsoon arrives.
- **Complexity:** High. A chase with in-car dialogue and two new districts.

### M8 — "Barsaat"
- **Location:** North Delhi in the first monsoon storm: Shakti Nagar, a flooded Ring Road underpass, Majnu Ka Tila.
- **Characters:** Aryan, his family, Lucky (out on bail), Bittu, Tenzin, Mola, Garage men, Shanaya.
- **Opening:** rain on a tin roof, a power cut, Pihu studying by candlelight, Vinod on the balcony. Lucky calls: *"Ghar se nikaal apni family ko. Abhi."*
- **Objectives:**
  1. Escort the family down the stairs. Vinod is slow.
  2. A Garage SUV blocks the gali mouth. Bittu opens his shutter for a back route if the friendship is good; otherwise go through a flooded lane.
  3. Drive with **water depth** in play: engines stall in deep water, including the pursuers'. Route around the flooded underpass.
  4. Reach Tenzin's.
- **Key scene:** Vinod's confession: *"Maine khaali kaagaz pe sign kiya. Kyunki woh shaadi mein aaye the, humare ghar."* Lucky arrives bruised and reveals that as a boy he swept Vinod's press floor and Vinod paid his school fees: *"Tujhe kaam kyun diya, socha kabhi?"*
- **Shanaya's choice:** she arrives soaked. *"Main permission nahi maang rahi. Main bata rahi hoon — kyunki main tumse cheezein chhupaati nahi."* She will file the clinic's petition.
- **Decision:** support her or ask her to wait.
- **Twist:** Pradhan's "fall" was Kunal's doing, and Lucky is now an ally.
- **Rewards:** unlocks rain weather and the press keys (a story item).
- **Next:** Anand Infra's heritage gala tomorrow in Connaught Place.
- **Complexity:** High. Fallback: a pre-built flooded variant of the chunk.

### M9 — "Valet"
- **Location:** a Connaught Place colonnade, Anand Infra's building, its rooftop gala and the parking lot.
- **Characters:** Aryan (valet), **Shanaya (playable guest)**, Anand, Meher, Kunal, ACP Rawat, Bittu, Rohit (remote, if an ally).
- **Opening:** SUVs under white colonnades at dusk, a red carpet. Bittu: *"Teen gaadiyan hain jinko kharoch bhi aayi toh hum dono bik jayenge."*
- **Aryan's part:**
  1. Valet-parking challenge.
  2. Identify Anand's SUV.
  3. Get into it. With Rohit as an ally, it's a guided gadget minigame. Without him, Aryan steals the key from the valet board while the head valet is distracted (on-foot stealth).
- **Shanaya's part:**
  1. Social stealth among the guests.
  2. Find the architect's model showing the press site as a luxury hotel.
  3. Draw Anand out with the right dialogue. He likes flattery about his legacy: *"Heritage is just real estate with a good story."*
- **Twist:** Meher **and** Kunal are both guests. Anand pays both sides. ACP Rawat corners Aryan in the lot: *"Mujhe Anand chahiye. Tum mujhe Anand do, main tumhe gawah banaungi, mulzim nahi."*
- **Completion:** evidence collected and an exit undetected.
- **Consequences:** Anand discovers the breach and orders the ledger recovered "by morning".
- **Complexity:** High. Two playable characters share one controller with a model swap. Fallback: Shanaya's part becomes a dialogue-only scene.

### M10 — "Ring Road"
- **Location:** a warehouse, then the Ring Road loop across every pocket district, then the chosen destination.
- **Opening:** 1:30 AM. Lucky hands over the *Laal Bahi*: *"Ab tera hisaab hai. Tu decide kar."*
- **Objectives:**
  1. Escape the warehouse. Choose a vehicle: the bike is agile in jams, the car is durable.
  2. Pick a destination on the phone map. **This is the ending choice** (A, B or C, §9).
  3. Night chase on the Ring Road, with Kunal's men, the Garage and police patrols all after you. Mid-chase, Pihu calls: *"Bhaiya, kahan ho? Papa so nahi rahe. Press ki chaabi haath mein le ke baithe hain."*
  4. Confrontation with Kunal: crashed cars in the rain, a dialogue standoff with no shootout. *"Tu aur main ek jaise hain, Sethi. Dono apne baap ka udhaar chuka rahe hain."*
- **Twist:** Pradhan himself made the original deal with Anand. There are no clean heroes, and Path B becomes knowingly dark.
- **Rewards:** the Hisaab counter's final state.
  - A: ₹0, with a court stamp.
  - B: ₹0 with "Kothi ka aadmi" status.
  - C: a "—" (the ledger burned).
- **Complexity:** Very High (streaming at speed, multiple pursuers, three finales). Built last.

### Epilogue — "Chai, Subah Chhe Baje"
A walkable dawn scene at the M1 chai stall. Who joins Aryan depends on the flags. Free roam continues afterwards.

### Story flags (the complete branching budget)
`lucky_first_impression`, `rohit_outcome` (A/B/C), `kunal_photos` (sent/kept/deleted), `ledger_photos`, `shanaya_trust` (0–10), `bittu_friendship`, `tenzin_honest`, `ending` (A/B/C).

---

## 11. Side Missions

| Activity | Where | Mechanic | Unlock |
|---|---|---|---|
| **TurboKart Shifts** | North Delhi | Timed deliveries with a rating. Each customer is a 2-line vignette (the 3 AM Maggi student). | Start |
| **Tiffin Tales** | North Delhi | Neelam's regulars (a retired judge, a night guard, homesick PG girls). Short stories with one choice each. | After M1 |
| **Raat Ki Race** | Ring Road | Pit Crew street races, with a rival arc | After M4 |
| **Sawari** | Anywhere | Auto-rickshaw driving. Haggling minigame ("Meter se chaloge?"). Tips depend on route and smoothness. | After M5 |
| **Gali Cricket** | Shakti Nagar | Batting minigame under gali rules: ball in the drain is out, one-tip-one-hand, broken window means run | Start |
| **Bittu's Garage** | Kamla Nagar | Customisation: paint, horn sounds, stickers ("Horn OK Please"), seat covers | After M2 |
| **Parking Maharaj** | Kamla Nagar, Hauz Khas, CP | Tight-parking challenges judged by a scolding uncle | After M2 |
| **Pihu's Coaching Run** | North Delhi | Get Pihu to coaching on time while answering her biology flashcards | After M1 |
| **Shanaya Hangouts** | Various | Laphing in Majnu Ka Tila, a Metro ride, Hauz Khas lake, moot-court rehearsal (you play opposing counsel). Showing up affects trust. | Act II |
| **Dilli Waale (strangers)** | Various | "The Last Route": a retired bus driver's final route, with you driving the bus. "MC Chhotu": a Hudson Lane rapper whose lyrics change with your input. "Kabootarbaaz": follow a pigeon across Old Delhi rooftops. "The Lost Pomeranian": ends in a wedding. | Varies |
| **Fest Season** | North Campus | Treasure hunt and a debate duel (a dialogue-rebuttal minigame) | After M3 |
| **Food Trail** | Everywhere | Fictional stalls give buffs (chole bhature: stamina) and fill a food journal | Start |
| **Collectibles** | Everywhere | 40 hand-painted ghost signs (photograph them), 20 hidden kulhads (each an audio story of Delhi) | Start |
| **Metro** | Stations | Fast travel with a short in-carriage scene | After M3 |
| **Kite Season** (seasonal, later) | Rooftops | Kite-fighting minigame | Post-launch |

---

## 12. Random Events

**Event Director rules:**
- At most one active event within 150 m.
- Global cooldown of 90–180 s; each event can't repeat for 15 min.
- Suppressed during missions, except ambient flavour.
- Weighted by district and time of day.

| # | Event | Player options |
|---|---|---|
| 1 | Fender-bender argument (*"Tujhe pata hai mera baap kaun hai?"*). A crowd gathers and traffic blocks. | Mediate, honk, reroute |
| 2 | A cow sits in the middle of the road | Wait. Honking doesn't work. |
| 3 | A DTS bus breaks down and passengers spill out | Reroute or push through |
| 4 | A baraat blocks the street | Wait, or join the dance (minigame) |
| 5 | Helmet checkpoint | Pay the fine, or flee (Heat 1) |
| 6 | Phone snatcher | Chase and return the phone for a reward |
| 7 | A tempo spills tomatoes across the road | Slippery road and an angry vendor |
| 8 | Market power cut | Lights die, generators kick in one by one (a lighting moment) |
| 9 | A monkey steals a student's bag | Chase on foot |
| 10 | Street dogs chase your bike at night | Speed up or stop |
| 11 | Wrong-side rider coming at you | Dodge |
| 12 | Puncture | Find a puncture-wala nearby |
| 13 | College protest march | Road closed, reroute |
| 14 | A stray cricket ball hits your car | Return the ball to the kids |
| 15 | Pickpocket in the market | Spot and catch |
| 16 | Lost child near the metro | Reunite with parents |
| 17 | Wedding fireworks | NPCs stop to watch |
| 18 | Chai-stall gossip that mentions your past choices | Listen |
| 19 | Garage spotter tails you (after M4) | Lose him or confront him |
| 20 | Kulfi cart bell | Buy kulfi |

---

## 13. Delhi District Design

Priority key:
- **P1:** starting pocket
- **P2:** needed by the campaign (a mission-sized pocket)
- **P3:** post-campaign expansion
- **P4:** long-term

| District | Identity and architecture | Roads and traffic | Gameplay role | Priority |
|---|---|---|---|---|
| **Kamla Nagar** | Dense market; 3–5 storey mixed-use buildings with signboards and wires | Narrow, very heavy two-wheeler traffic, evening jams | Home turf. M1, M6. | **P1** |
| **North Campus** | Colonial college buildings, lawns, the Ridge forest, hostels, PGs, Hudson Lane cafés | Wide campus roads, speed bumps, students | M3, college activities | **P1** |
| **Majnu Ka Tila** | Tibetan colony: narrow lanes, rooftop cafés, prayer flags, monastery courtyard | Pedestrian lanes inside, Ring Road on the edge | M2, M4, M8. Tenzin. | **P1** |
| **Chandni Chowk / Chawri Bazar** | Walled city: havelis, katras, wholesale lanes, wire tangles | Vehicle-free main street, e-rickshaws, extreme crowds | M5. Kothi heartland. | **P2** |
| **Connaught Place** | White Georgian colonnades in concentric circles | Radial roads, heavy cars | M9. Anand Infra. | **P2** |
| **India Gate** | Monument, huge lawns, wide avenues | Low density, open | End of M7, hangouts | **P2** (shares a pocket with CP) |
| **Hauz Khas** | Village lanes, clubs, medieval ruins, lake, deer park | Narrow, jammed at night | M7. Garage nightlife. | **P2** |
| **Chattarpur farmhouses** | Walled estates, long driveways | Empty, fast roads | Ending C | **P2** (finale only) |
| **Kashmere Gate** | Interstate bus terminal, auto-parts lanes, flyovers | Chaotic interchanges | Kothi godowns. Part of the connector. | P3 |
| **Saket** | Malls, gated colonies, wide roads | Medium | The Garage's Torque Lab, races | P3 |
| **Lajpat Nagar** | Central Market, mehendi stalls | Dense shopping traffic | Shanaya's family side missions | P3 |
| **Karol Bagh** | Bike and car-parts market | Heavy | Big customisation shop | P3 |
| **Nehru Place** | Electronics market, office towers | Medium | Rohit's tech side quests | P3 |
| **Rohini** | Residential sectors, outer roads | Fast arterials | Outskirts car meets, drag strip | P4 |
| **Dwarka** | Planned sub-city, metro, near the airport | Wide and fast | Late expansion | P4 |

**World scale:** districts are built at about 1:1.5 of real size. Between districts, a stylised Ring Road and connector at about 1:5 links pockets in 60–120 seconds of driving.

---

## 14. Starting District: "North Delhi Pocket"

### 14.1 Comparison

| Candidate | Gameplay variety | Story fit | Build cost | Performance |
|---|---|---|---|---|
| **North Campus + Kamla Nagar + Majnu Ka Tila** | ★★★★★ market, campus, colony, highway | ★★★★★ Aryan's home | ★★★★ mostly low-rise boxes | ★★★★ |
| Connaught Place | ★★★ | ★★★ | ★★ curved colonnades are hard | ★★★ |
| Chandni Chowk | ★★★ (vehicles banned) | ★★★★ | ★★ extreme density | ★★ huge crowds |
| Hauz Khas | ★★★ | ★★★ | ★★★ | ★★★ |

**Recommendation:** the North Delhi pocket. It's mostly low-rise rectangular buildings (cheap to generate in code), has every road type we need, and is where the first four missions happen.

### 14.2 Layout (about 700 m × 600 m)

```
                 N
     [Majnu Ka Tila colony]──[Kothi parking lot]──[Tenzin's rooftop café]
                │  (foot overbridge)
 ═══════════════ RING ROAD (6 lanes + flyover) ══════════════════════
                │                                   │
   [The Ridge: forest, monkeys]           [Hudson Lane cafés & PGs]
   [Kesar Lal College]──[Arts Quad]──Campus loop──[Vijay Nagar PG lanes]
                │                                   │
        [Metro station]                      [Lucky's warehouse]
                │
   [Kamla Nagar market grid]────[Shakti Nagar lanes: Aryan's home, Bittu's garage,
                │                 Ramesh's chai stall]
   [Shehnai Palace banquet] ──► exit to Old Delhi (later)
```

### 14.3 Fictional businesses

Ramesh Chai Corner, Sweet Pinch Bakery, Dolma Aunty's Momos, Bhature Junction, Second Floor Café (Hudson Lane), Shanti Girls PG, Royal Boys PG, Bittu Two-Wheeler Works, Norbu's Rooftop, Shehnai Palace, TurboKart dark store, Photostat & Spiral Binding (an ever-present Delhi shop type).

---

## 15. Vehicles

All names and models are original.

### 15.1 First implementation (only these two)

| Vehicle | Type | Handling idea |
|---|---|---|
| **Vayu Spark 125** | Commuter motorcycle | Agile, filters through jams, fits through galis, low top speed. Arcade model with fake lean (no real two-wheel balance physics). |
| **Sitara Pari** | Old family hatchback | Balanced and forgiving. Raycast-wheel vehicle. Carries passengers. |

### 15.2 Later roster

Vayu Lehar (scooter), Vayu Toofan 390 (sports bike), Sitara Shaan (sedan), Kesari Sardar (SUV), Kesari Classic (old white sedan, the Kothi's car), Indra Vega (sports car), Gati Teen-Pahiya (auto-rickshaw), Bijli Rani (e-rickshaw), DTS cluster bus, Kesari Rakshak (police patrol jeep), Garage matte-black SUVs.

### 15.3 Vehicle systems

- Enter and exit
- Acceleration, braking, reverse, steering
- Handbrake
- Suspension (raycast springs)
- Collision
- Camera transition
- Horn, with a choice of horn sounds as customisation
- Headlights
- Health and damage: smoke, dents later, no explosions
- Water stall (M8)
- Helmet (bike) and seatbelt (car), used by the Shareef and checkpoint systems
- Handling stats in data files (JSON)

---

## 16. NPC Systems

| Category | Behaviours |
|---|---|
| Pedestrians | Walk sidewalk graph, idle, chat in pairs, dodge vehicles, flee, gather at events |
| Shopkeepers and vendors | Stationary loops, call out to the player, sell items |
| Students | Groups on campus, sit on the lawns |
| Drivers | Follow the lane graph, honk when blocked, react to collisions |
| Traffic police | Whistle, issue fines, start Heat 1 |
| Patrol police | Pursuit (Heat 2+) |
| Story characters | Scripted by missions |
| Gang members | Spotters, pursuers, scripted fights |

**AI level of detail:**

| Tier | Range | What runs |
|---|---|---|
| 0 | < 25 m | Full animation and avoidance |
| 1 | 25–60 m | Animation at 20 Hz, simple steering |
| 2 | 60–120 m | Cheap instanced figures, no AI |
| — | Beyond 120 m | Despawned |

**Population:**
- Pedestrians spawn 40–80 m away and out of view, and despawn beyond 120 m.
- **Traffic** follows lane splines, with signals at major junctions. Elsewhere, Delhi rules apply: the bigger vehicle goes first, honking requests priority.
- Traffic cars are kinematic until hit, then become physical.
- Jams come from density zones plus scripted "jam volumes", for reliability.

**Heat (police):**

| Level | What happens |
|---|---|
| 1 — *Challan* | A traffic cop whistles. Stop and pay, or flee. |
| 2 — *PCR* | A single patrol vehicle pursues |
| 3 — *Naka* | Barricades appear at district exits |
| 4 — Crime Branch | Story only |

Lose Heat by breaking line of sight and waiting it out, or by hiding in a garage.

**Barks:** short Hinglish one-liners per archetype (*"Oye, dekh ke!"*, *"Bhaiya side!"*).

---

## 17. Gameplay Mechanics

- **Core loop:** take a call on the phone → travel (ride, drive, Metro) → mission or event → choice → money, debt and relationship consequences → the city reacts (gossip, spotters, unlocks).
- **On foot:** walk, run, sprint (stamina), jump, interact, melee (strike, shove, dodge), climb low walls.
- **Hisaab counter:** the family debt shown on the HUD. It's the game's main progression meter.
- **Money:** a wallet and a fictional UPI-style app called *PayDilli*.
- **Phone:** calls (missions start here), messages (Shanaya, family, Lucky), map, camera (photo missions, collectibles), contacts.
- **Gali Gyaan:** Aryan's signature skill. Discovered shortcuts are permanently added to the map and to route planning.
- **Honk as interaction:** clears pedestrians, irritates cops, gets honked back at, part of Shareef scoring.
- **Choices:** 2–3 dialogue options, untimed (except chase conversations). Choices are remembered through flags.
- **Combat:** melee, knife, pistol and AK-47 (§28). Fights are short, heavy and story-driven, never the main loop.
- **Failure:** gentle. Restart from the last checkpoint.
- **Saves:** auto-save at mission checkpoints, plus a manual save at home.
- **Accessibility:** subtitles, rebinding, "assist driving", no forced quick-time events.

**Controls (keyboard and mouse):**

| Key | Action |
|---|---|
| WASD | Move / drive |
| Shift | Sprint / boost |
| Space | Jump / handbrake |
| F | Enter or exit vehicle |
| E | Interact |
| H | Horn |
| Tab | Phone |
| M | Map |
| Mouse | Camera |

Gamepad support comes later.

---

## 18. Graphics & Animation Strategy

### 18.1 What code can make and what needs modelling

| Generated in code (most of the world) | Needs modelling or sourcing |
|---|---|
| Roads, kerbs, markings, pavements | Human characters (bodies, faces, clothes) |
| Modular buildings: walls, windows, balconies, AC units, water tanks, shutters | Rigs and skeletal animation |
| Signboards (text drawn on canvas textures) | Distinctive vehicles (bike, car, auto) |
| Overhead wires, streetlights, poles, barriers | Hero props (chai stall, haveli facade, India Gate) |
| Trees (low-poly), terrain, sky, rain, fog | Food items and other close-up props |
| Crowd and traffic placement; placeholder vehicles | — |

### 18.2 Characters and animation

- One shared humanoid rig, compatible with Mixamo. All characters reuse the same animation clips.
- **Phase 3 clip list:** idle, walk, run, sprint, jump, fall, land, sit on bike, sit in car, talk gestures (2), phone, punch, hit, dodge, dance (baraat).
- Clips blend through cross-fades in a small animation state machine.
- **Vehicle entry, version 1:** a short walk to the door, then a 0.3 s blend into the seated pose with a camera swing. Full enter and exit animations come later.
- **Faces:** none. Dialogue uses 2D illustrated portraits with 4–6 expressions per main character.
- **Cutscenes:** in-engine. Camera shots are data (positions, framing, cuts) driven by the dialogue timeline.

### 18.3 Lighting

- Hemisphere light plus one directional sun.
- One shadow-casting light with a short shadow distance.
- Streetlights are emissive meshes with fake light-pool decals, not real lights.
- Ambient occlusion baked into vertex colours by the procedural generator.

---

## 19. Blender-Free Asset Pipeline

| Option | Verdict |
|---|---|
| **A. Procedural Three.js** | **Primary.** Buildings, roads and props make up about 70% of what's on screen. |
| **B. Blender** | Optional. Install it in Phase 3 only if rig fixes, vehicle-entry animations or lightmap baking become blockers. |
| **C. Blockbench** (free, native on Mac) | **Yes**, for low-poly vehicles and props. Exports glTF and can animate rigid parts like wheels and doors. |
| **D. Mixamo** (free with an Adobe account) | **Yes**, for auto-rigging and animation clips. Its output is FBX, so it needs converting to GLB. Don't redistribute the raw files. |
| **E. Spline** | **No.** Its runtime is heavy and proprietary, and it doesn't fit a game pipeline. |
| **F. GLTF/GLB** | **Yes.** The only runtime format. Compress with `gltf-transform` (meshopt or Draco geometry, KTX2 textures). |
| **G. AI 3D generation** (Meshy, Tripo, Rodin, etc.) | For props and concepts only. Check each licence tier, decimate the meshes and log the licence. Characters still need rigging (via Mixamo). |
| **H. Ready-made assets** | Kenney, Quaternius, KayKit (CC0) as placeholders; Poly Haven (CC0) for textures; Sketchfab filtered by licence. Every asset is recorded in `docs/ASSETS.md`. |

**Characters plan:**
1. Placeholder capsule.
2. A CC0 low-poly rigged human, recoloured.
3. Custom Aryan and Shanaya, via an AI-generated or MakeHuman base auto-rigged in Mixamo (test in Phase 3).

---

## 20. Recommended Tools

VS Code, Node 22, npm, Vite, TypeScript, three, @dimforge/rapier3d-compat, React (UI only), zustand (engine-to-UI bridge), lil-gui (debug tweaks), Blockbench, Mixamo, gltf-transform CLI, the glTF Viewer website, the three.js editor (prop placement tests), Poly Haven, Freesound (check licences), Audacity, Krita or Photopea (portraits and textures), Git and GitHub, Vitest (logic tests), Playwright (smoke tests), Spector.js (draw-call debugging).

---

## 21. Technical Architecture

### 21.1 Stack decision

| Proposed | Decision | Why |
|---|---|---|
| Vite | ✅ | Fast dev server, simple build |
| TypeScript | ✅ | Essential at this size |
| Three.js | ✅ | Used directly through an imperative engine core |
| React | ✅ **UI only** | HUD, phone, dialogue, menus |
| React Three Fiber | ❌ | Explicit control over update order, pooling and streaming matters more than declarative JSX. It also keeps game logic out of React by design. |
| Drei | ❌ | The few helpers we'd use come straight from `three/examples` |
| Rapier | ✅ | Character controller, raycast vehicle, good performance in WebAssembly |

### 21.2 Data flow

```
Input ─► Engine.update(dt)  [fixed 60 Hz physics, variable render]
           ├─ PhysicsWorld (Rapier)
           ├─ PlayerController / VehicleController
           ├─ NPC & Traffic managers
           ├─ MissionManager ◄── mission scripts + data
           └─ CameraController ─► Renderer (Three.js)
Engine ──(events + throttled snapshot ≤10 Hz)──► UI store (zustand) ──► React HUD / Phone / Dialogue
React UI ──(commands)──► Engine EventBus
```

**Rules:**
- The engine never imports React.
- React never touches Three.js objects.
- All world content comes from data files plus seeded procedural generation, so the same seed always produces the same city.

### 21.3 Folder layout (in `web/`)

```
web/src/
  main.ts                 entry: boots engine + UI
  engine/                 Engine loop, Time, EventBus, Input, Assets, Settings
  physics/                Rapier world wrapper, collision groups
  world/                  WorldManager, ChunkStreamer, district builders (roads, buildings, props)
  player/                 PlayerController, CharacterAnimator
  vehicles/               VehicleManager, BikeController, CarController
  camera/                 CameraController (follow, vehicle, cinematic)
  ai/                     NPCManager, TrafficManager, behaviours
  missions/               MissionManager + missions/*
  dialogue/               DialogueManager + data
  audio/                  AudioManager
  env/                    lighting presets, weather (later)
  save/                   SaveManager (versioned JSON in localStorage/IndexedDB)
  ui/                     HUD (and later React components)
  debug/                  stats overlay, benchmark route
```

---

## 22. Performance Strategy

### 22.1 Budgets

| Metric | Low (integrated GPU, older laptop) | Medium | High (M-series / dedicated GPU) |
|---|---|---|---|
| Target FPS | 30 stable | 60 | 60+ |
| Render scale | 0.65 | 0.85 | 1.0 (pixel ratio capped at 2) |
| Draw calls | ≤ 150 | ≤ 250 | ≤ 400 |
| Visible triangles | ≤ 250k | ≤ 500k | ≤ 1M |
| GPU texture memory | ≤ 128 MB | ≤ 256 MB | ≤ 512 MB |
| Shadows | off, or 1024 within 30 m | 2048 within 50 m | 2048 within 80 m |
| Skinned characters visible | ≤ 8 | ≤ 16 | ≤ 30 |
| Active pedestrians | ≤ 15 | ≤ 30 | ≤ 50 |
| Traffic vehicles | ≤ 8 | ≤ 16 | ≤ 25 |
| Dynamic physics bodies | ≤ 15 | ≤ 30 | ≤ 50 |
| First download | ≤ 15 MB | | |

**CPU frame budget at 60 fps:**

| System | Budget |
|---|---|
| Physics | ≤ 2 ms |
| AI | ≤ 2 ms |
| Game logic | ≤ 1.5 ms |
| Render submission | ≤ 5 ms |

### 22.2 Techniques

- Instanced meshes for repeated parts (windows, AC units, poles).
- Merged static geometry per chunk.
- Texture atlases and vertex colours instead of many textures.
- Frustum culling.
- Chunks of about 120 m, loaded within 2 chunks of the player.
- Distance-based level of detail.
- Object pools for NPCs and cars.
- Physics colliders as simple boxes.
- AI ticked at a reduced rate by distance.
- An adaptive quality preset driven by frame-time history.

### 22.3 Benchmarking

**Warning:** the development machine is an Apple M4. It's far faster than our low-end target, so it can't be used to verify low-end performance.

1. A built-in benchmark route records average fps, 1% low fps, draw calls, triangles and heap size.
2. Test on an older Windows laptop with integrated graphics (Intel UHD 620-class) on Chrome, Firefox and Edge, plus Safari on the Mac.
3. Re-run after every phase.

---

## 23. Development Phases (adjusted)

| Phase | Deliverables | Exit criteria |
|---|---|---|
| **0 — Design** | This document | Key decisions confirmed |
| **1 — Greybox prototype** | Vite + TS + Three + Rapier; engine loop; input; capsule player; third-person camera; walk, run, jump; a greybox street with collision; **greybox bike moved into this phase**; debug overlay | Movement and riding feel good in a 10-minute playtest. 60 fps on the Mac. No physics glitches. |
| **2 — First Delhi block** | District data format; procedural roads, buildings, signboards, wires, streetlights; chunking; 10 simple pedestrians; ambient audio; evening lighting preset | Budgets met on the low-end machine |
| **3 — Characters & vehicles** | Aryan model and animations; bike and car models; enter and exit; car controller; vehicle camera; basic damage | Every animation blends cleanly; both vehicles are fun |
| **4 — First mission** | Mission manager, dialogue, phone, HUD, markers, Hisaab counter, checkpoint save; **M1 playable** | Someone new to the game finishes M1 without help |
| **5 — Story & world systems** | M2–M4, traffic, Heat 1–2, Shanaya, Tenzin, flags | Act I plus M4 playable end to end |
| **6 — Expansion** | Old Delhi, Hauz Khas, CP/India Gate pockets; connector road; M5–M10; rain; time-of-day; side missions | The campaign can be completed |
| **7 — Polish & release** | Optimisation, settings, saves, audio, browser testing, public demo | Stable on all target browsers |

---

## 24. First Playable Prototype ("Prototype 0.1", end of Phase 4)

- **Contents:** about a 300 m × 300 m slice of Kamla Nagar and Shakti Nagar; Aryan (placeholder art acceptable); the Vayu Spark bike; 10–15 pedestrians; 6–8 traffic vehicles; M1 complete; HUD with the Hisaab counter; save at checkpoint.
- **Out of scope:** the car, combat, police, other districts, day/night, weather.
- **Acceptance:**
  - Loads in under 10 s on broadband.
  - 30 fps or better on the low-end machine and 60 fps on the Mac.
  - No soft locks across 5 complete playthroughs.
  - A new player finishes M1 in 8–12 minutes.

---

## 25. Technical Risks & Solutions

| Risk | Solution |
|---|---|
| Scope creep (the biggest risk) | Phase exit criteria. Pocket districts. Every new idea goes on a backlog, not into the build. |
| Motorcycle physics feels bad | Arcade controller with fake lean, tuned from data |
| High-speed tunnelling | Physics substeps and continuous collision detection on vehicles |
| Mixed-source art looks inconsistent | One palette, vertex-colour style, recolour pass on every import |
| Skinned characters are expensive | Strict caps, AI level of detail, cheap instanced figures at distance |
| Streaming hitches | Spread generation across frames (Web Worker later), object pools |
| Three.js memory leaks | Asset manager with reference counting and explicit disposal |
| Safari WebGL quirks | Test every phase |
| Audio autoplay blocked by browsers | Start audio only on "Click to play" |
| Asset licensing | `docs/ASSETS.md` log with source and licence for every file |
| Trademark or IP exposure | Original names only. No GTA marks, real brands, real colleges or real people. |
| Sensitive content | No real communities as gangs; abstract crime; respectful depiction of Majnu Ka Tila and Old Delhi |
| Hindi text rendering | Noto Sans Devanagari, signs drawn to canvas |
| Save corruption across versions | Versioned save schema with migrations |
| Codebase too big for AI-assisted work | Small modules, this document, a checklist, clear module boundaries |

---

## 26. Dialogue, Slang & Audio Delivery

### 26.1 How characters talk

- **Hinglish first.** Characters switch between Hindi and English mid-sentence, the way Delhi actually talks. Each character has a voice sheet listing vocabulary, sentence length, favourite words and English ratio.
  - **Aryan:** quick, jokey, "bhai", "scene kya hai", "chill kar".
  - **Lucky:** Punjabi-tinged Hindi, proverbs, "puttar", "dekh beta".
  - **Pradhan:** formal Urdu-Hindi.
  - **Kunal:** MBA English with Hindi insults.
  - **Shanaya:** precise English, Hindi when emotional.
  - **Tenzin:** dry English and Hindi.
- **Delhi slang bank** (data file, `dialogue/slang.json`): *bhai, bhaiya, yaar, scene, setting, jugaad, chill maar, kat gaya, bawaal, jhakaas, paaji, behenji, uncleji, oye, chal hatt, dimaag mat kha, kya bakwaas, lafda, panga, ghanta, tashan.*
- **Profanity** is used the way Delhi uses it: casually among friends, as punctuation in anger, and as a weapon in threats. It's tiered and controlled by a settings toggle:
  - **Off.** Bleeped audio and censored subtitles.
  - **Mild.** *saala, kamina, kutta, ullu ka pattha, harami.*
  - **Full.** The real Delhi street register, common Hindi gaalis included.
  - **Rule:** never slurs aimed at caste, religion, disability, region or sexuality. Those make a game read as hateful, not gritty.
- **Barks** (ambient one-liners) are tagged by archetype, situation (bumped, honked at, near-miss, fight, police) and profanity tier, e.g. *"Oye andhe! Dikhta nahi?"*, *"Bhaiya side de do!"*, *"Abe gaadi chalana seekh le pehle!"*

### 26.2 Writing format

Each scene is a data file of lines, with speaker, text, English translation, emotion (for the portrait), audio clip id, camera shot id and timing. This one format drives the dialogue box, subtitles, voice playback and cutscenes.

### 26.3 Voice delivery: a staged plan

| Stage | Method | When |
|---|---|---|
| 1 | Text and subtitles only, with portrait expressions and a typewriter effect | Phase 4 |
| 2 | AI text-to-speech with Hindi/Hinglish-capable voices for prototyping (check each provider's licence for commercial use) | Phase 5 |
| 3 | Real voice actors (Delhi theatre groups or university drama societies are a great, affordable source) for main characters; TTS or recorded barks for crowds | Before public release |

### 26.4 Ambient Delhi audio

- **Sources:** CC0 or licensed field recordings (Freesound, filtered by licence), plus our own phone recordings of Delhi markets, traffic, metro announcements (fictional wording), chai stalls, temple bells and azaan from a distance (handled respectfully, never as a gag), and wedding bands.
- **System:** per-district ambience beds crossfading by position, positional one-shots (horns, vendor calls like *"Garam chai!"*, *"Momos le lo!"*, pressure-cooker whistles), and a traffic-density-driven horn layer.
- **Music:** original only. No copyrighted Bollywood songs.

---

## 27. Cutscene System

Cutscenes are essential to the San Andreas-style story feel, so they get a proper system rather than one-off hacks.

- **In-engine, data-driven.** A cutscene is a timeline file with tracks:
  - **Camera:** shot positions and targets, cuts, dolly or orbit moves, field of view, letterbox bars.
  - **Actors:** spawn, place, walk-to, play animation clip, look-at.
  - **Dialogue:** lines from the scene file, voice clip, subtitle, portrait.
  - **Audio:** music cues, sound effects.
  - **Events:** mission flag changes, screen fades, vehicle moves.
- **Player experience:** letterboxing, subtitles, skippable (holding Esc skips the whole scene; clicking advances a line), and a seamless blend back to gameplay.
- **Authoring:** first as hand-written data files. Later, a small in-game cutscene editor where you fly the debug camera, press a key to record a shot, and save.
- **Acting with no facial animation:** framing (close-ups using portraits as an overlay), body animation (Mixamo talking and gesture clips), timing and music. Most of what makes a cutscene feel cinematic is camera and editing, not faces.
- **Built in:** Phase 4, together with M1's ending (the collectors' scene).

---

## 28. Weapons & Combat

| Weapon | Role | Phase | Notes |
|---|---|---|---|
| **Fists / melee** | Default | 5 | Light and heavy strike, shove, dodge, block. Lock-on to nearest enemy. |
| **Knife** | Close range | 5 | Faster, more damage. Used in M4 and M7 confrontations. |
| **Pistol** | First firearm | 5–6 | Story-gated (the Kothi gives Aryan one after M6). Over-the-shoulder aim, soft lock-on assist, 12-round magazine. |
| **AK-47** | Late-game heavy weapon | 6 | Appears in M8–M10 set pieces (Garage hit squad, final night). Recoil, 30-round magazine, limited ammo. |

**Systems needed:**
- Weapon wheel (Tab or 1–4).
- Over-the-shoulder aim camera.
- Hitscan raycasts against Rapier colliders (cheap and reliable in the browser).
- Hit reactions and death animations from Mixamo.
- Enemy AI: take cover, shoot, flank, flee.
- Muzzle flash, tracers, impact decals and sparks.
- Health and armour.
- Police Heat rising sharply on gunfire.

**Design rules:**
- Firing near crowds makes them scatter; civilians are never targets for points.
- Story gunfights are short, with clear cover and a readable enemy count.
- Ammo is scarce, to keep escape-by-driving the smarter option.

---

## 29. Development Log

| Date | Phase | What happened |
|---|---|---|
| 2026-11-21 | 0 | GDD v0.1 written |
| 2026-11-21 | 1 | `web/` scaffolded: Vite, TypeScript, Three.js, Rapier |
| 2026-11-21 | 1 | Phase 1 complete: procedural Kamla Nagar slice, player, camera, Vayu Spark bike, synth audio, HUD, smoke test (11/11). 60 fps, 117 draw calls on M4 (high). |
| 2026-11-21 | 1 | Bike physics fix: Rapier's character controller snags a box (and a horizontal capsule) on flat ground, so the bike collider floats 17 cm up and height comes from a ground ray. Kerb hopping works for free. |
| 2026-11-21 | 2 | Pedestrians (instanced, 11 draw calls for up to 60 people), ambient horns, bark subtitles. 139 draw calls (high) / 76 (low). |
| 2026-11-21 | 2 | Traffic AI (cars, autos, DTS buses), drivable Sitara Pari with handbrake drift. |
| 2026-11-21 | 3 | Aryan becomes a real animated model (CC0 Quaternius base via the Blender pipeline, palette-recoloured). Nearest pedestrians use the same model (level of detail). 139 draw calls high / 66 low, 17/17 smoke checks. |
