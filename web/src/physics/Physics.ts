import RAPIER from '@dimforge/rapier3d-compat';

export { RAPIER };

/** Thin wrapper over the Rapier world: static collider helpers and queries. */
export class Physics {
  readonly world: RAPIER.World;

  private constructor() {
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  }

  static async create(): Promise<Physics> {
    await RAPIER.init();
    return new Physics();
  }

  step(dt: number) {
    this.world.timestep = dt;
    this.world.step();
  }

  addStaticBox(cx: number, cy: number, cz: number, hx: number, hy: number, hz: number, yaw = 0) {
    const desc = RAPIER.ColliderDesc.cuboid(hx, hy, hz).setTranslation(cx, cy, cz);
    if (yaw !== 0) desc.setRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) });
    return this.world.createCollider(desc);
  }

  addStaticCylinder(cx: number, cy: number, cz: number, halfHeight: number, radius: number) {
    return this.world.createCollider(
      RAPIER.ColliderDesc.cylinder(halfHeight, radius).setTranslation(cx, cy, cz),
    );
  }

  /** Distance to the first hit along a normalised direction, or null. */
  castRay(
    origin: { x: number; y: number; z: number },
    dir: { x: number; y: number; z: number },
    maxDist: number,
    include?: (c: RAPIER.Collider) => boolean,
  ): number | null {
    const ray = new RAPIER.Ray(origin, dir);
    const hit = this.world.castRay(ray, maxDist, true, undefined, undefined, undefined, undefined, include);
    return hit ? hit.timeOfImpact : null;
  }
}
