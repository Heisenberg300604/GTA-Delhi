# Your Tasks (things only you can do)

Claude keeps building the game in parallel. Tick items off here as you finish them and tell Claude in chat.
Last updated: 2026-11-21

---

## 1. Download Mixamo animations ⭐ high priority
Mixamo needs your Adobe login, so Claude can't do this.

1. Go to https://www.mixamo.com and sign in (a free Adobe account works).
2. **Character:** you don't need one. Our character already has a Mixamo-compatible skeleton.
3. For each animation below, click **Download** with these settings:
   **Format: FBX · Skin: Without Skin · Frames per second: 30 · Keyframe reduction: none**.
   Tick **"In Place"** whenever the option exists (walks, runs, rifle run).
4. Save the files into `assets-src/mixamo/` using the names below.
5. Tell Claude "Mixamo files are in". Claude converts them with Blender and adds them to Aryan.

| Save as | Search on Mixamo for | Used for |
|---|---|---|
| [ ] `driving.fbx` | "Driving" | sitting in the car |
| [ ] `sitting.fbx` | "Sitting Idle" | chai stall, cutscenes |
| [ ] `enter_car.fbx` | "Entering Car" | car entry |
| [ ] `exit_car.fbx` | "Exiting Car" | car exit |
| [ ] `talking.fbx` | "Talking" | dialogue scenes |
| [ ] `texting.fbx` | "Texting While Standing" | phone UI |
| [ ] `hit_reaction.fbx` | "Hit Reaction" | melee (Phase 5) |
| [ ] `kick.fbx` | "Kicking" | melee (Phase 5) |
| [ ] `pistol_idle.fbx` | "Pistol Idle" | pistol (Phase 5–6) |
| [ ] `pistol_walk.fbx` | "Pistol Walk" | pistol |
| [ ] `pistol_shoot.fbx` | "Shooting" (pistol) | pistol |
| [ ] `rifle_idle.fbx` | "Rifle Idle" | AK-47 (Phase 6) |
| [ ] `rifle_run.fbx` | "Rifle Run" | AK-47 |
| [ ] `rifle_fire.fbx` | "Firing Rifle" | AK-47 |
| [ ] `female_walk.fbx` | "Female Walk" | women NPCs |

Mixamo's terms allow these animations in your game. Just don't redistribute the raw FBX files (`.fbx` is already git-ignored).

---

## 2. Female / extra character models ⭐ high priority
Right now every character (Shanaya, Pihu and Neelam too) uses one male body. That's the biggest visual gap.

1. Go to https://quaternius.com and look for free **CC0** human packs, e.g. *Ultimate Modular Women*, *Ultimate Modular Men* or *Universal Base Characters*.
2. Download the zip (they're hosted on Google Drive, which Claude can't download from automatically).
3. Put the zip in `assets-src/downloads/` and tell Claude the file name.
   - [ ] Female character pack downloaded
   - [ ] Optional: older men/women (for Vinod, Neelam), kids (street cricket)

Only use packs that say **CC0**. If a pack has another licence, tell Claude first.

---

## 3. Record Delhi sounds 🎙️
Use your phone's voice recorder. Each clip should be 30–60 seconds, with nobody talking right next to the phone and no music playing (copyright).

- [ ] Busy junction with lots of horns (Kamla Nagar / any chowk)
- [ ] Market in the evening: crowd murmur, shopkeepers calling out
- [ ] Chai stall: kettle, glasses clinking, chatter
- [ ] Vendors calling: "garam chai", "momos le lo", "sabzi wala"…
- [ ] Commuter motorcycle: start, idle, rev, ride past
- [ ] Auto-rickshaw: idle and drive past
- [ ] Bus horn and air brakes
- [ ] Scooter / bike horn up close
- [ ] Wedding band (if you pass a baraat)
- [ ] Temple bells (distant)
- [ ] Rain on a roof or tin sheet (for the monsoon mission, later)

Put the files in `assets-src/audio/` (any format: m4a/mp3/wav). You own these recordings, so there's no licence risk.

---

## 4. Test on a low-end laptop 💻
Your M4 Mac is much faster than most players' machines, so its numbers don't tell us much about them.

1. On the Mac: `cd web && npm run dev -- --host`
2. Note the "Network" address it prints (e.g. `http://192.168.1.5:5173`).
3. On an older laptop on the same Wi-Fi, open that address followed by `?q=low`.
4. Click to play and press **F3**. Note the **FPS** and **draw calls**: standing still, riding the bike on the main road, and in the car.
5. Repeat with `?q=medium`.
   - [ ] Low-end results sent to Claude (laptop model + numbers)

---

## 5. Playtest and give feedback 🎮
Play for 10 minutes and write down anything that feels wrong. Short notes are perfect:
"bike turns too sharply", "car too slow", "camera too close", "people walk too fast", "too much honking".
- [ ] Feedback round 1 sent

---

## 6. Reference photos (optional) 📸
Your own photos of shopfronts, signboards, autos, buses, wires, rooftops, chai stalls and gallis help the art direction.
They're references only, so real brand names in them don't matter: the game always uses fictional names.
Put them in `assets-src/reference/`.

---

## 7. Voices (optional, later) 🗣️
Friends recording Hinglish one-liners for pedestrians ("Oye, dekh ke!", "Bhaiya side!") would make the city feel alive.
Claude will prepare a script (list of lines) when we reach voice work. Nothing is needed yet.

---

## Decisions waiting on you

- [ ] **OpenStreetMap for real street layouts?** Today the map is an invented grid. Option: pull Kamla Nagar / North Campus street data from OpenStreetMap, simplify it, and generate the city from it.
  - **Pros:** a recognisable Delhi layout. Players from Delhi will know where they are.
  - **Cons:** real streets are irregular (harder to build and drive), and the data licence (ODbL) requires showing "© OpenStreetMap contributors" in the game credits; our derived map data must also stay under ODbL.
  - **Claude's suggestion:** keep the grid for the first missions and use OSM from Phase 6, when we build Old Delhi, Connaught Place and Hauz Khas.
- [ ] **Profanity default** for dialogue: Off / Mild / Full (GDD §26). Suggestion: default Mild, with Full as an option.
- [x] **Final game title:** GTA Delhi (decided 2026-11-21).

---

## How to run things (cheat sheet)

```
cd web
npm run dev          # play at http://localhost:5173  (add ?q=low / ?q=medium)
npm run smoke        # automated gameplay test (dev server must be running)
npm run build        # production build
```
In game: **F3** shows stats. Progress is tracked in `docs/CHECKLIST.md`; the design is in `docs/GDD.md`.
