/**
 * Box-based layouts for the greybox vehicle roster. Shared by traffic
 * (instanced) and the player's car (regular meshes). All original designs.
 * Local space: facing +Z, origin on the ground at the vehicle centre.
 */

export type PartName = 'body' | 'cabin' | 'roof' | 'wheel' | 'headlight' | 'taillight';
export type VehicleKind = 'hatch' | 'sedan' | 'auto' | 'bus';

export interface PartBox {
  part: PartName;
  x: number; y: number; z: number;
  sx: number; sy: number; sz: number;
}

export interface VehicleType {
  kind: VehicleKind;
  name: string;
  half: { x: number; y: number; z: number }; // collider half extents
  cruise: [number, number]; // m/s range
  wheelRadius: number;
  parts: PartBox[];
  bodyColors: string[];
  roofColor?: string; // defaults to body colour
  cabinColor: string;
}

const box = (part: PartName, x: number, y: number, z: number, sx: number, sy: number, sz: number): PartBox =>
  ({ part, x, y, z, sx, sy, sz });

const wheels = (x: number, z: number, r: number, w = 0.22): PartBox[] =>
  [[-x, z], [x, z], [-x, -z], [x, -z]].map(([wx, wz]) => box('wheel', wx, r, wz, w, r * 2, r * 2));

const lights = (x: number, y: number, z: number): PartBox[] => [
  box('headlight', -x, y, z, 0.32, 0.14, 0.05), box('headlight', x, y, z, 0.32, 0.14, 0.05),
  box('taillight', -x, y + 0.05, -z, 0.28, 0.14, 0.05), box('taillight', x, y + 0.05, -z, 0.28, 0.14, 0.05),
];

export const VEHICLE_TYPES: Record<VehicleKind, VehicleType> = {
  hatch: {
    kind: 'hatch', name: 'Sitara Pari',
    half: { x: 0.83, y: 0.75, z: 1.85 }, cruise: [8, 12.5], wheelRadius: 0.31,
    parts: [
      box('body', 0, 0.62, 0, 1.65, 0.7, 3.7),
      box('cabin', 0, 1.2, -0.2, 1.5, 0.52, 1.95),
      box('roof', 0, 1.48, -0.25, 1.46, 0.06, 1.8),
      ...wheels(0.74, 1.18, 0.31),
      ...lights(0.55, 0.72, 1.86),
    ],
    bodyColors: ['#f2f2f2', '#c0c4c8', '#8a1c1c', '#1d3c8f', '#d7ccc8', '#b3261e', '#2b2b2b'],
    cabinColor: '#26303a',
  },
  sedan: {
    kind: 'sedan', name: 'Sitara Shaan',
    half: { x: 0.88, y: 0.75, z: 2.2 }, cruise: [9, 13.5], wheelRadius: 0.32,
    parts: [
      box('body', 0, 0.63, 0, 1.75, 0.68, 4.4),
      box('cabin', 0, 1.2, -0.25, 1.55, 0.52, 2.2),
      box('roof', 0, 1.48, -0.25, 1.5, 0.06, 2.0),
      ...wheels(0.79, 1.4, 0.32),
      ...lights(0.6, 0.72, 2.21),
    ],
    bodyColors: ['#ffffff', '#9aa0a6', '#2b2b2b', '#5b3a29', '#1b4d3e', '#6d7b8d'],
    cabinColor: '#222b33',
  },
  auto: {
    kind: 'auto', name: 'Gati Teen-Pahiya',
    half: { x: 0.68, y: 0.9, z: 1.35 }, cruise: [7, 10], wheelRadius: 0.24,
    parts: [
      box('body', 0, 0.5, 0.05, 1.3, 0.5, 2.6),
      box('cabin', 0, 1.22, -0.2, 1.28, 0.95, 1.9),
      box('roof', 0, 1.74, -0.15, 1.36, 0.1, 2.15),
      box('wheel', 0, 0.24, 1.0, 0.16, 0.48, 0.48),
      box('wheel', -0.62, 0.24, -0.8, 0.16, 0.48, 0.48),
      box('wheel', 0.62, 0.24, -0.8, 0.16, 0.48, 0.48),
      box('wheel', 0, 0.24, -0.8, 0, 0, 0), // unused 4th wheel slot
      box('headlight', 0, 0.85, 1.36, 0.26, 0.2, 0.05),
      box('headlight', 0, 0.85, 1.36, 0, 0, 0),
      box('taillight', -0.5, 0.6, -1.21, 0.18, 0.12, 0.05),
      box('taillight', 0.5, 0.6, -1.21, 0.18, 0.12, 0.05),
    ],
    bodyColors: ['#2e7d32', '#388e3c', '#1b5e20'],
    roofColor: '#f5c518',
    cabinColor: '#1a1a1a',
  },
  bus: {
    kind: 'bus', name: 'DTS Cluster Bus',
    half: { x: 1.28, y: 1.5, z: 5.5 }, cruise: [8, 10.5], wheelRadius: 0.5,
    parts: [
      box('body', 0, 1.0, 0, 2.5, 1.3, 11),
      box('cabin', 0, 2.1, 0, 2.52, 0.9, 10.6),
      box('roof', 0, 2.7, 0, 2.5, 0.3, 10.9),
      ...wheels(1.1, 3.7, 0.5, 0.32),
      ...lights(0.9, 0.75, 5.51),
    ],
    bodyColors: ['#2e7d32', '#e65100', '#c62828'],
    roofColor: '#efe6d2',
    cabinColor: '#1e2a33',
  },
};

export const PARTS_PER_VEHICLE: Record<PartName, number> = {
  body: 1, cabin: 1, roof: 1, wheel: 4, headlight: 2, taillight: 2,
};
