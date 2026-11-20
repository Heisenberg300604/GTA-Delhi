/**
 * District data for the first playable slice (a compressed, fictional take on
 * Kamla Nagar / Shakti Nagar). Later this becomes a JSON file produced by a
 * top-down map editor; the generator code won't need to change.
 */

export interface Road {
  /** 'x' = road runs east-west (center is a z coordinate); 'z' = runs north-south (center is x). */
  axis: 'x' | 'z';
  center: number;
  width: number;
  name: string;
  median?: boolean;
}

export interface Block {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  kind: 'market' | 'park';
}

export const MAP_HALF = 140;
export const SIDEWALK = 4;
export const KERB = 0.15;

export const ROADS: Road[] = [
  { axis: 'x', center: -95, width: 9, name: 'Roop Nagar Road' },
  { axis: 'x', center: -40, width: 9, name: 'Ghanta Ghar Road' },
  { axis: 'x', center: 0, width: 16, name: 'Kamla Nagar Main Road', median: true },
  { axis: 'x', center: 45, width: 9, name: 'Chhatra Marg' },
  { axis: 'x', center: 100, width: 9, name: 'Ridge Road' },
  { axis: 'z', center: -100, width: 9, name: 'Shakti Nagar Lane' },
  { axis: 'z', center: -45, width: 9, name: 'Bazaar Lane' },
  { axis: 'z', center: 0, width: 12, name: 'Campus Road' },
  { axis: 'z', center: 50, width: 9, name: 'Hudson Lane' },
  { axis: 'z', center: 105, width: 9, name: 'Vijay Nagar Road' },
];

export const PARK_POINT = { x: 25, z: -20 };

function intervals(roads: Road[]): [number, number][] {
  const sorted = [...roads].sort((a, b) => a.center - b.center);
  const out: [number, number][] = [];
  let start = -MAP_HALF;
  for (const r of sorted) {
    out.push([start, r.center - r.width / 2]);
    start = r.center + r.width / 2;
  }
  out.push([start, MAP_HALF]);
  return out;
}

export function computeBlocks(): Block[] {
  const xs = intervals(ROADS.filter((r) => r.axis === 'z'));
  const zs = intervals(ROADS.filter((r) => r.axis === 'x'));
  const blocks: Block[] = [];
  for (const [x0, x1] of xs) {
    for (const [z0, z1] of zs) {
      const isPark = PARK_POINT.x > x0 && PARK_POINT.x < x1 && PARK_POINT.z > z0 && PARK_POINT.z < z1;
      blocks.push({ x0, x1, z0, z1, kind: isPark ? 'park' : 'market' });
    }
  }
  return blocks;
}

/** Roads crossing a given road, as [min, max] intervals along its length. */
export function crossings(road: Road, margin = 0): [number, number][] {
  return ROADS.filter((r) => r.axis !== road.axis)
    .map((r): [number, number] => [r.center - r.width / 2 - margin, r.center + r.width / 2 + margin])
    .sort((a, b) => a[0] - b[0]);
}

export function inCrossing(road: Road, t: number, margin = 0): boolean {
  return crossings(road, margin).some(([a, b]) => t > a && t < b);
}

/** Converts (along-road t, across-road offset) into world x/z. */
export function roadPoint(road: Road, t: number, offset: number): { x: number; z: number } {
  return road.axis === 'x' ? { x: t, z: road.center + offset } : { x: road.center + offset, z: t };
}

export const SPAWN = {
  player: { x: -32.5, z: 9.6, facing: Math.PI / 2 },
  bike: { x: -26.5, z: 6.3, heading: -Math.PI / 2 },
  cameraYaw: -Math.PI / 2,
};
