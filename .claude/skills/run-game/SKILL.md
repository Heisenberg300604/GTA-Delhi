---
name: run-game
description: Launch the GTA Delhi web game, run the headless gameplay smoke test, and review screenshots. Use after any gameplay, world or rendering change, or when asked to run/test/screenshot the game.
---

# Run & verify the game

1. Typecheck: `cd web && npm run typecheck`. Fix all errors first.
2. Make sure the dev server is up: `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/`.
   If not 200, start it in the background: `cd web && npx vite --port 5173 --strictPort` (run_in_background).
3. Run the smoke test, writing screenshots to the session scratchpad:
   `cd web && node scripts/smoke.mjs <scratchpad>/smoke`
   It drives walking, running, jumping, mounting, riding, steering, braking, dismounting and a wall crash,
   prints PASS/FAIL lines plus the F3 stats (FPS, draw calls, triangles), and fails on any console error.
4. Read the PNG screenshots in the output folder and check them visually (spawn, on bike, riding, final).
5. Compare stats with the GDD §22 budgets (draw calls ≤150 low / ≤400 high).
6. Story changes: also run `node scripts/mission-m01.mjs <scratchpad>/m1` (full M1 playthrough; screenshots are taken per speaker).
   New missions get their own `scripts/mission-mXX.mjs` in the same style.
7. When adding a feature, add a check for it to `web/scripts/smoke.mjs`.

## Probing internals
`window.__game` is exposed in the page. One-off probes (e.g. tracing a controller per tick) can be written as
`web/scripts/_probe.mjs` (so `playwright-core` resolves from `web/node_modules`) and deleted afterwards.

## Notes
- Headless Chrome is launched with `--use-angle=metal --ignore-gpu-blocklist` for real GPU rendering on macOS.
- The M4 dev Mac is far faster than the low-end target. Also test `?q=low` and, when possible, real low-end hardware.
