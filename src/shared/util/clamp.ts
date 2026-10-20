/** Keep a number inside [min, max]. Used by the editor for sizes, opacity, etc. */
export function clamp(value: number, min: number, max: number): number {
  if (min > max) [min, max] = [max, min];
  return Math.min(max, Math.max(min, value));
}
