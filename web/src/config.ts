/** Central tuning values. Gameplay feel lives here, not scattered through the code. */

export type Quality = 'low' | 'medium' | 'high';

export const PHYSICS_HZ = 60;
export const FIXED_DT = 1 / PHYSICS_HZ;
export const WORLD_SEED = 1947;

export const PLAYER = {
  radius: 0.32,
  halfHeight: 0.53, // capsule: total height = 2 * (halfHeight + radius) ≈ 1.7 m
  walkSpeed: 2.6,
  runSpeed: 6.6,
  groundAccel: 28,
  airAccel: 6,
  jumpSpeed: 6.4,
  gravity: 20,
  turnSpeed: 12,
  stepHeight: 0.35,
};

export const BIKE = {
  name: 'Vayu Spark 125',
  maxSpeed: 23, // m/s ≈ 83 km/h
  reverseMax: 3.5,
  accel: 8.5,
  brake: 18,
  coastDrag: 1.4,
  airDrag: 0.012,
  handbrake: 11,
  wheelbase: 1.3,
  maxSteerLow: 0.6,
  maxSteerHigh: 0.075,
  steerRate: 5,
  maxLean: 0.55,
  gravity: 20,
  mountDistance: 2.6,
  dismountMaxSpeed: 4,
  collider: { radius: 0.36, halfLength: 0.62 },
};

export const CAR = {
  name: 'Sitara Pari',
  maxSpeed: 31, // ≈ 112 km/h
  reverseMax: 7,
  accel: 7.5,
  brake: 15,
  coastDrag: 1.1,
  airDrag: 0.004,
  handbrake: 5,
  wheelbase: 2.4,
  maxSteerLow: 0.62,
  maxSteerHigh: 0.11,
  steerRate: 4.5,
  grip: 9,
  driftGrip: 1.3,
  clearance: 0.22,
  half: { x: 0.83, y: 0.45, z: 1.85 },
  mountDistance: 3.4,
  exitMaxSpeed: 3,
  color: '#7d1f1f',
};

export const CAMERA = {
  fov: 62,
  fovBoost: 12,
  distanceFoot: 4.2,
  distanceBike: 5.8,
  heightFoot: 1.55,
  heightBike: 1.45,
  distanceCar: 7.2,
  heightCar: 1.9,
  sensitivity: 0.0022,
  minPitch: -0.35,
  maxPitch: 1.2,
  autoAlignDelay: 1.1,
};

export const QUALITY_PRESETS: Record<
  Quality,
  { pixelRatio: number; antialias: boolean; shadows: boolean; shadowMap: number; pedestrians: number; traffic: number; nearPedestrians: number }
> = {
  low: { pixelRatio: 0.75, antialias: false, shadows: false, shadowMap: 1024, pedestrians: 22, traffic: 8, nearPedestrians: 4 },
  medium: { pixelRatio: 1, antialias: true, shadows: true, shadowMap: 1024, pedestrians: 40, traffic: 14, nearPedestrians: 8 },
  high: { pixelRatio: Math.min(window.devicePixelRatio, 2), antialias: true, shadows: true, shadowMap: 2048, pedestrians: 60, traffic: 22, nearPedestrians: 12 },
};
