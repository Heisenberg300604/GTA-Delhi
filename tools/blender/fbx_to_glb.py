"""Convert a Mixamo (or any) FBX to GLB headlessly.

Usage:
  Blender -b --factory-startup -P tools/blender/fbx_to_glb.py -- input.fbx output.glb
"""
import sys
import bpy

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
if len(argv) < 2:
    raise SystemExit("usage: -- input.fbx output.glb")
src, dst = argv[0], argv[1]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=src, automatic_bone_orientation=True)
bpy.ops.export_scene.gltf(
    filepath=dst,
    export_format="GLB",
    export_yup=True,
    export_apply=True,
    export_animations=True,
    export_skins=True,
)
print(f"exported {dst}")
