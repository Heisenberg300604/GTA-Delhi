export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Frame-rate independent exponential smoothing. */
export const damp = (a: number, b: number, lambda: number, dt: number) =>
  lerp(a, b, 1 - Math.exp(-lambda * dt));

export function wrapAngle(a: number): number {
  a = (a + Math.PI) % (Math.PI * 2);
  if (a < 0) a += Math.PI * 2;
  return a - Math.PI;
}

export const lerpAngle = (a: number, b: number, t: number) => a + wrapAngle(b - a) * t;
export const dampAngle = (a: number, b: number, lambda: number, dt: number) =>
  lerpAngle(a, b, 1 - Math.exp(-lambda * dt));
