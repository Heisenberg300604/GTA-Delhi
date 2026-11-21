# Asset Licence Log

Every external asset must be recorded here before it is committed.

| File | Source / author | Licence | Notes |
|---|---|---|---|
| `web/public/assets/characters/human.glb` | "Animated Human" by Quaternius — https://opengameart.org/content/animated-human-low-poly (zip, 5 MB, downloaded 2026-11-21) | CC0 1.0 (public domain) | Converted with `tools/blender/export_character.py`. 1,578 tris, 48-bone Mixamo-style skeleton. Clips: Idle, Walk, Run, Jump, Punch, Working, Death. Colours are replaced at runtime by generated palette textures (skin/eyes/hair/shirt/pants bands). Raw download kept locally in `assets-src/downloads/` (git-ignored, re-downloadable). Consider supporting the author: patreon.com/quaternius |
| Fonts: Anton, Inter, Noto Sans Devanagari | Google Fonts (loaded from fonts.googleapis.com by `web/src/style.css` and `tools/branding/brand.html`) | SIL Open Font License 1.1 | Not bundled in the repo. |
| `docs/media/logo.png`, `lockup.png`, `banner.jpg`, `tools/branding/emblem.svg` | Original, made for this project (`tools/branding/`) | Original | Banner background is an in-game screenshot. |
| `docs/media/screenshots/*.jpg` | Captured from the game by the headless playthrough tests | Original | — |
| Everything else | Procedurally generated in code (city, textures, signs, vehicles, audio) | Original | — |
