# Development Checklist

## Phase 0 — Design ✅
- [x] GDD v0.1 (story, 10 missions, districts, systems, architecture, budgets)
- [x] Addenda: dialogue/slang/audio (§26), cutscenes (§27), weapons (§28)

## Phase 1 — Greybox prototype ✅
- [x] Vite + TypeScript + Three.js + Rapier project in `web/`
- [x] Fixed-timestep engine loop (60 Hz physics, interpolated rendering)
- [x] Input (keyboard, pointer-lock mouse, latched key presses)
- [x] Procedural Kamla Nagar slice: 10 roads, ~25 blocks, shops, signs (Hindi + English), wires, poles, median lights, park, parked cars, scooters, chai stall
- [x] Player: kinematic capsule, walk/run/jump, kerb step-up, placeholder rig with procedural animation
- [x] Third-person camera: orbit, wall avoidance, auto-align behind the bike, speed FOV, impact shake
- [x] Vayu Spark 125: arcade bike, lean, steering, brake/reverse, handbrake, collisions, kerb hopping, mount/dismount
- [x] Synth audio: engine with fake gearbox, two-tone horn, crash thump
- [x] HUD (title screen, Hisaab counter, prompts, speedometer) + F3 stats
- [x] Headless smoke test (11 checks), 60 fps / ~117 draw calls on M4 at high

## Phase 2 — First Delhi environment (in progress)
- [x] Pedestrians: 22/40/60 by quality, 11 instanced draw calls total, pavement loops, idle stops, sidestep the player, flee bikes and horns, Hinglish bark subtitles
- [x] Ambient city audio v1 (traffic rumble bed + random distant horns, denser near the main road)
- [ ] Recorded ambience (market murmur, vendor calls, chai-stall chatter): needs licensed or own recordings
- [x] Traffic: hatchbacks, sedans, autos, DTS buses (8/14/22 by quality, 6 instanced draw calls); keep-left lanes, car-following, junction yielding (then push through), curved turns, honking at the player, despawn/respawn off-screen
- [ ] More street detail: carts, stalls, auto stand, metro-station entrance, potholes
- [ ] Chunk streaming scaffold + low-end benchmark route
- [ ] Test `?q=low` on a low-end laptop

## Phase 3 — Characters & vehicles
- [x] Aryan model: CC0 Quaternius human → Blender pipeline → GLB; palette recolouring; Idle/Walk/Run/Jump/Punch blending; procedural riding pose
- [x] Pedestrian level of detail: nearest 4/8/12 pedestrians use the skinned model with their own outfit colours
- [ ] Female/kurta/sari variants (needs a second base mesh: Quaternius/Mixamo or Blender-modelled)
- [ ] Driving and sitting animations (Mixamo: sitting, driving, motorcycle) + car-door enter/exit
- [ ] Bike GLB (Blender script) replacing the greybox
- [x] Car (Sitara Pari): arcade handling with handbrake drift, body pitch/roll, steerable wheels, enter/exit (right-hand drive)
- [ ] Vehicle damage (basic)

## Phase 4 — First mission ✅
- [x] Mission runtime: missions are async "screenplay" scripts (`say`, `choose`, `shot`, `walk`, `drive`, `objective`, `interact`), stages with checkpoints
- [x] Cutscenes: letterbox, camera cuts and glides, actors from the cast, prop vehicles, hold Enter to skip, crowd cleared from the scene
- [x] Dialogue box: Hinglish + English subtitle, typewriter, choices (1/2/3), phone-call style
- [x] HUD: objective line, 3D beam marker, rotating minimap, cake meter, wallet, debt reveal, MISSION PASSED stamp, fades
- [x] Save system (localStorage, versioned): money, debt, flags, completed missions, mid-mission checkpoints; N on the title for a new game
- [x] Story NPCs in the world: Ramesh at the chai stall, Sweety Aunty at Sweet Pinch Bakery
- [x] M1 "Happy Birthday, Pihu" playable end to end (flavour choice, cake condition changes Pihu's line, family car seized, ₹14 lakh reveal)
- [x] Automated M1 playthrough test (`npm run test:m01`, 18 checks)
- [ ] Phone UI (contacts/messages screen): texts currently arrive as phone-style dialogue
- [ ] Portraits for dialogue (2D illustrated faces)

## Phase 5 — next up
- [ ] M2 "Shareef Driving" (Lucky, law-abiding driving + suspicion meter, police checkpoint) — needs Majnu Ka Tila pocket
- [ ] Traffic signals + police "challan" (Heat 1)
- [ ] Melee combat (punch/kick damage, hit reactions) — needs Mixamo files from YOUR_TASKS.md

## Phase 5+
See GDD §23 (story systems, melee/knife/pistol, police heat, more missions, districts, AK-47, release).
