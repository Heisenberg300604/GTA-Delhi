"""Import a Quaternius/Mixamo-style FBX character, tidy it, export a game GLB.

- Renames actions to short names (Idle, Walk, Run, ...), drops empty/junk actions
- Gives the material a palette texture (so the GLB looks right on its own)
- Exports GLB with skin + all actions

Usage:
  Blender -b --factory-startup -P tools/blender/export_character.py -- in.fbx palette.png out.glb
"""
import sys
import bpy

src, palette, dst = sys.argv[sys.argv.index("--") + 1:][:3]
KEEP = {"Idle", "Walk", "Run", "Jump", "Punch", "Working", "Death"}

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=src, automatic_bone_orientation=True)

arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
mesh = next(o for o in bpy.data.objects if o.type == "MESH")
arm.name = "Character"
mesh.name = "CharacterMesh"

# --- actions: short names, keep only the useful ones
for act in list(bpy.data.actions):
    short = act.name.split("|")[-1]
    if short in KEEP:
        act.name = short
        act.use_fake_user = True
    else:
        bpy.data.actions.remove(act)

# push every action onto its own NLA track so the exporter sees all of them
arm.animation_data_create()
for act in bpy.data.actions:
    track = arm.animation_data.nla_tracks.new()
    track.name = act.name
    strip = track.strips.new(act.name, int(act.frame_range[0]), act)
    if hasattr(strip, "action_slot") and act.slots:
        strip.action_slot = act.slots[0]
arm.animation_data.action = None

# --- material with the palette texture (nearest filtering suits palette textures)
mat = mesh.data.materials[0]
mat.use_nodes = True
nodes, links = mat.node_tree.nodes, mat.node_tree.links
bsdf = next(n for n in nodes if n.type == "BSDF_PRINCIPLED")
tex = nodes.new("ShaderNodeTexImage")
tex.image = bpy.data.images.load(palette)
tex.interpolation = "Closest"
links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
bsdf.inputs["Roughness"].default_value = 0.9
mat.name = "CharacterPalette"

bpy.ops.export_scene.gltf(
    filepath=dst,
    export_format="GLB",
    export_yup=True,
    export_skins=True,
    export_animations=True,
    export_animation_mode="NLA_TRACKS",
    export_nla_strips_merged_animation_name="",
    export_force_sampling=True,
    export_image_format="AUTO",
)
print("EXPORTED", dst, "actions:", [a.name for a in bpy.data.actions])
