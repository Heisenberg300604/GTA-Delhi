# GTA Delhi (codename Project Dilli)

An original, Delhi-inspired open-world browser game. **Source of truth: [docs/GDD.md](docs/GDD.md).** Progress: [docs/CHECKLIST.md](docs/CHECKLIST.md). The user's own to-do list: [docs/YOUR_TASKS.md](docs/YOUR_TASKS.md).

## Rules
- The game's title is **GTA Delhi** (the user's decision, 2026-11-21). Everything else is original: no Rockstar logos or logo/font style, characters, missions, maps, music or code. No real brands, colleges, gangs or people. Keep the non-affiliation disclaimer in README.md.
- Work phase by phase (GDD §23). Never break a working feature; run the smoke test after changes.
- Keep game logic out of React/UI. The engine never imports UI code; UI is updated through small methods/stores.
- Small modules, one responsibility each. Tuning values live in `web/src/config.ts`.
- Performance budgets (GDD §22): stay under ~150 draw calls on the "low" preset. Merge static geometry, instance repeated props.
- Every external asset is logged in `docs/ASSETS.md` with source and licence.
- Gang factions are defined by business, never by caste/religion/region. Profanity is tiered and toggleable; no slurs (GDD §26).

## Layout
- `web/`: the game (Vite + TypeScript + Three.js + Rapier).
  - `src/engine` loop/input/audio · `src/physics` Rapier wrapper · `src/world` procedural city + layout data
  - `src/player` on-foot controller + rig · `src/vehicles` bike · `src/camera` · `src/ui` HUD · `src/debug`
  - `src/story`: mission runtime (`MissionContext` primitives, `MissionManager`), cast, `missions/*` scripts
  - `src/save`: versioned localStorage save
  - `scripts/smoke.mjs`: headless gameplay test · `scripts/mission-mXX.mjs`: full mission playthroughs (both use installed Chrome via playwright-core)
- `tools/blender/`: headless Blender Python scripts for asset generation/conversion
- `tools/branding/`: logo/banner source (`brand.html`, `emblem.svg`); `node tools/branding/render.mjs` writes `docs/media/`
- `assets-src/`: source files (FBX/.blend); exported GLBs go to `web/public/assets/`

## Commands (run in `web/`)
- `npm run dev` (port 5173) · `npm run typecheck` · `npm run build` · `npm run smoke` · `npm run test:m01` · `npm run test:m02` (tests need the dev server running)
- Quality presets: `?q=low|medium|high`. F3 toggles stats.
