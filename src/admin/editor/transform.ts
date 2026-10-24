import type { Point } from './viewport';

export type Handle = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

/** An element's frame: top-left corner, size and rotation (degrees, clockwise). */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export const MIN_SIZE = 8;
const MAX_SIZE = 10000;
const MIN_POSITION = -5000;
const MAX_POSITION = 10000;
export const ROTATE_SNAP = 15;

/** Which sides a handle drags: -1 is the left/top side, +1 the right/bottom side. */
const SIGNS: Record<Handle, readonly [number, number]> = {
  n: [0, -1],
  ne: [1, -1],
  e: [1, 0],
  se: [1, 1],
  s: [0, 1],
  sw: [-1, 1],
  w: [-1, 0],
  nw: [-1, -1],
};

export function isCorner(handle: Handle): boolean {
  return handle.length === 2;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function turn(point: Point, degrees: number): Point {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return { x: point.x * cos - point.y * sin, y: point.x * sin + point.y * cos };
}

/** Keep an angle between -180 and 180 degrees. */
export function normalizeAngle(degrees: number): number {
  let angle = degrees % 360;
  if (angle > 180) angle -= 360;
  if (angle <= -180) angle += 360;
  return angle;
}

export function centreOf(box: Box): Point {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Move a box by (dx, dy). With `constrain` it only moves along the longer direction. */
export function moveBox(box: Box, dx: number, dy: number, constrain = false): Box {
  let moveX = dx;
  let moveY = dy;
  if (constrain) {
    if (Math.abs(dx) >= Math.abs(dy)) moveY = 0;
    else moveX = 0;
  }
  return {
    ...box,
    x: round1(clamp(box.x + moveX, MIN_POSITION, MAX_POSITION)),
    y: round1(clamp(box.y + moveY, MIN_POSITION, MAX_POSITION)),
  };
}

/**
 * Drag a handle by (dx, dy) on the canvas. The side or corner opposite the handle stays where
 * it is, also when the element is rotated. With `keepAspect`, corners keep the width : height
 * ratio.
 */
export function resizeBox(
  box: Box,
  handle: Handle,
  dx: number,
  dy: number,
  keepAspect = false,
): Box {
  const [signX, signY] = SIGNS[handle];
  const local = turn({ x: dx, y: dy }, -box.rotation);
  let width = signX === 0 ? box.width : box.width + signX * local.x;
  let height = signY === 0 ? box.height : box.height + signY * local.y;
  if (keepAspect && isCorner(handle)) {
    const factor = Math.max(width / box.width, height / box.height);
    width = box.width * factor;
    height = box.height * factor;
  }
  width = clamp(width, MIN_SIZE, MAX_SIZE);
  height = clamp(height, MIN_SIZE, MAX_SIZE);

  const shift = turn(
    { x: (signX * (width - box.width)) / 2, y: (signY * (height - box.height)) / 2 },
    box.rotation,
  );
  const centre = centreOf(box);
  return {
    ...box,
    width: round1(width),
    height: round1(height),
    x: round1(centre.x + shift.x - width / 2),
    y: round1(centre.y + shift.y - height / 2),
  };
}

/**
 * The new rotation when the pointer goes from `from` to `to` around the box's centre.
 * With `snap` the result is rounded to a multiple of 15 degrees.
 */
export function rotationFor(box: Box, from: Point, to: Point, snap = false): number {
  const centre = centreOf(box);
  const before = Math.atan2(from.y - centre.y, from.x - centre.x);
  const after = Math.atan2(to.y - centre.y, to.x - centre.x);
  let rotation = normalizeAngle(box.rotation + ((after - before) * 180) / Math.PI);
  if (snap) rotation = normalizeAngle(Math.round(rotation / ROTATE_SNAP) * ROTATE_SNAP);
  return round1(rotation);
}
