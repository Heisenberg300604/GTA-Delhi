"""Print armature, actions, mesh stats and dimensions of an FBX.

Usage: Blender -b --factory-startup -P tools/blender/inspect_fbx.py -- input.fbx
"""
import sys
import bpy

src = sys.argv[sys.argv.index("--") + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=src, automatic_bone_orientation=True)

for ob in bpy.data.objects:
    print(f"OBJECT {ob.name} type={ob.type} dims={tuple(round(d, 3) for d in ob.dimensions)} scale={tuple(round(s, 3) for s in ob.scale)} rot={tuple(round(r, 3) for r in ob.rotation_euler)}")
    if ob.type == "MESH":
        me = ob.data
        tris = sum(len(p.vertices) - 2 for p in me.polygons)
        print(f"  verts={len(me.vertices)} tris={tris} uv_layers={[u.name for u in me.uv_layers]} materials={[m.name for m in me.materials if m]}")
        print(f"  vertex_groups={len(ob.vertex_groups)}")
    if ob.type == "ARMATURE":
        print(f"  bones={len(ob.data.bones)}: {[b.name for b in ob.data.bones]}")
for a in bpy.data.actions:
    print(f"ACTION {a.name} frames={tuple(round(f) for f in a.frame_range)}")
for m in bpy.data.materials:
    imgs = [n.image.filepath for n in (m.node_tree.nodes if m.use_nodes else []) if n.type == "TEX_IMAGE" and n.image]
    print(f"MATERIAL {m.name} images={imgs}")
