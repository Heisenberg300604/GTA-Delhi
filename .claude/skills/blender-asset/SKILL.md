---
name: blender-asset
description: Create, convert or optimise 3D assets for RING ROAD with headless Blender (5.3 at /Applications/Blender.app). Use for generating low-poly vehicles/props from Python, converting Mixamo FBX characters/animations to GLB, and exporting game-ready GLBs.
---

# Blender asset pipeline (headless)

Blender binary: `/Applications/Blender.app/Contents/MacOS/Blender`

## Generate or convert
- Run a script without opening the UI:
  `"/Applications/Blender.app/Contents/MacOS/Blender" -b --factory-startup -P tools/blender/<script>.py -- <args>`
- Scripts live in `tools/blender/`. Source files go in `assets-src/`, exported GLBs in `web/public/assets/<category>/`.
- `tools/blender/fbx_to_glb.py <in.fbx> <out.glb>`: Mixamo FBX → GLB (keeps skin + animations).

## Game-ready rules (GDD §18–19, §22)
- Style: low-poly, flat or vertex colours, at most one 512–1024 px texture (atlas) per asset.
- Budgets: vehicle ≤ 3k tris, prop ≤ 500 tris, character ≤ 5k tris with a Mixamo-compatible skeleton.
- Units: metres. +Y up. Vehicles face +Z with the origin at ground level between the wheels.
- Name the parts the code expects: bike `steer`, `frontWheel`, `rearWheel`, `riderMount`; car `wheel_FL/FR/RL/RR`, `door_L/R`.
- Export: glTF binary (.glb), apply modifiers, +Y up, include animations only when needed.
- Optimise after export: `npx @gltf-transform/cli optimize in.glb out.glb --compress meshopt --texture-compress webp`.
- Log every asset (source, author, licence) in `docs/ASSETS.md`. Never import assets with unclear licences.
