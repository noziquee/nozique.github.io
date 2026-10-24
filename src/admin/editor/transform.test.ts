import { describe, expect, it } from 'vitest';
import {
  MIN_SIZE,
  moveBox,
  normalizeAngle,
  panCrop,
  resizeBox,
  rotationFor,
} from './transform';
import type { Box } from './transform';

const box: Box = { x: 100, y: 100, width: 200, height: 100, rotation: 0 };

describe('moveBox', () => {
  it('moves by the given amount', () => {
    expect(moveBox(box, 10, -20)).toMatchObject({ x: 110, y: 80 });
  });

  it('only moves along the longer direction when constrained', () => {
    expect(moveBox(box, 30, 10, true)).toMatchObject({ x: 130, y: 100 });
    expect(moveBox(box, 5, -40, true)).toMatchObject({ x: 100, y: 60 });
  });

  it('stays inside the limits the design format allows', () => {
    expect(moveBox(box, 99999, -99999)).toMatchObject({ x: 10000, y: -5000 });
  });
});

describe('resizeBox', () => {
  it('drags the right edge and keeps the left edge', () => {
    expect(resizeBox(box, 'e', 20, 0)).toMatchObject({ x: 100, y: 100, width: 220, height: 100 });
  });

  it('drags the left edge and keeps the right edge', () => {
    const next = resizeBox(box, 'w', 20, 0);
    expect(next).toMatchObject({ x: 120, width: 180 });
    expect(next.x + next.width).toBe(box.x + box.width);
  });

  it('drags the top-left corner and keeps the bottom-right corner', () => {
    const next = resizeBox(box, 'nw', -10, -30);
    expect(next).toMatchObject({ x: 90, y: 70, width: 210, height: 130 });
    expect(next.x + next.width).toBe(300);
    expect(next.y + next.height).toBe(200);
  });

  it('keeps the shape when a corner is dragged with aspect lock', () => {
    const next = resizeBox(box, 'se', 100, 0, true);
    expect(next.width / next.height).toBeCloseTo(2);
    expect(next).toMatchObject({ x: 100, y: 100, width: 300, height: 150 });
  });

  it('ignores aspect lock on edge handles', () => {
    expect(resizeBox(box, 'e', 50, 0, true)).toMatchObject({ width: 250, height: 100 });
  });

  it('never gets smaller than the minimum size', () => {
    const next = resizeBox(box, 'e', -9999, 0);
    expect(next.width).toBe(MIN_SIZE);
  });

  it('works for a rotated element: the opposite edge does not move', () => {
    const turned: Box = { x: 0, y: 0, width: 100, height: 100, rotation: 90 };
    // After a 90 degree turn the "e" side points down, so dragging down by 20 grows it.
    const next = resizeBox(turned, 'e', 0, 20);
    expect(next.width).toBe(120);
    expect(next.x).toBeCloseTo(-10);
    expect(next.y).toBeCloseTo(10);
    // The "w" side faced up, at y = 0 (centre y 50 minus half the width 50), and must stay there.
    expect(next.y + next.height / 2 - next.width / 2).toBeCloseTo(0);
  });
});

describe('rotationFor', () => {
  const square: Box = { x: 0, y: 0, width: 100, height: 100, rotation: 0 };

  it('turns clockwise by the angle the pointer travels', () => {
    expect(rotationFor(square, { x: 50, y: 0 }, { x: 100, y: 50 })).toBe(90);
    expect(rotationFor(square, { x: 50, y: 0 }, { x: 0, y: 50 })).toBe(-90);
  });

  it('adds to the existing rotation', () => {
    expect(rotationFor({ ...square, rotation: 30 }, { x: 50, y: 0 }, { x: 100, y: 50 })).toBe(120);
  });

  it('snaps to 15 degrees when asked', () => {
    const turn = (20 * Math.PI) / 180;
    const to = { x: 50 + 50 * Math.sin(turn), y: 50 - 50 * Math.cos(turn) };
    expect(rotationFor(square, { x: 50, y: 0 }, to, true)).toBe(15);
  });
});

describe('normalizeAngle', () => {
  it('keeps angles between -180 and 180', () => {
    expect(normalizeAngle(270)).toBe(-90);
    expect(normalizeAngle(-270)).toBe(90);
    expect(normalizeAngle(180)).toBe(180);
    expect(normalizeAngle(720)).toBe(0);
  });
});

describe('panCrop', () => {
  const crop = { focusX: 50, focusY: 50, zoom: 1 };
  const frame = { width: 200, height: 100 };

  it('moves the focus the opposite way to the drag', () => {
    expect(panCrop(crop, 20, 0, frame)).toMatchObject({ focusX: 40, focusY: 50 });
    expect(panCrop(crop, 0, -10, frame)).toMatchObject({ focusX: 50, focusY: 60 });
  });

  it('moves more slowly when zoomed in', () => {
    expect(panCrop({ ...crop, zoom: 2 }, 20, 0, frame).focusX).toBe(45);
  });

  it('never leaves 0 to 100 and keeps the zoom', () => {
    const far = panCrop(crop, -99999, 99999, frame);
    expect(far).toEqual({ focusX: 100, focusY: 0, zoom: 1 });
  });
});
