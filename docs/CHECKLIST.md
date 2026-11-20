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
- [ ] Simple traffic on lane paths (stop for obstacles, honk, jams) ← pulled forward from Phase 5
- [ ] More street detail: carts, stalls, auto stand, metro-station entrance, potholes
- [ ] Chunk streaming scaffold + low-end benchmark route
- [ ] Test `?q=low` on a low-end laptop

## Phase 3 — Characters & vehicles
- [ ] Aryan model (Blender/Mixamo) + animation state machine
- [ ] Bike GLB (Blender script) replacing the greybox
- [ ] Car (Sitara Pari): raycast vehicle, enter/exit
- [ ] Vehicle damage (basic)

## Phase 4 — First mission
- [ ] Mission manager, dialogue system, cutscene timeline player
- [ ] Phone UI, markers, Hisaab counter changes, checkpoint save
- [ ] M1 "Happy Birthday, Pihu" playable

## Phase 5+
See GDD §23 (story systems, melee/knife/pistol, police heat, more missions, districts, AK-47, release).
