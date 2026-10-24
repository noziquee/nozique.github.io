import { describe, expect, it } from 'vitest';
import {
  MAX_ZOOM,
  MIN_ZOOM,
  clampZoom,
  fitView,
  panBy,
  screenToStage,
  wheelZoomFactor,
  zoomAround,
} from './viewport';

describe('zoomAround', () => {
  it('keeps the point under the cursor still', () => {
    const view = { zoom: 1, x: 50, y: 20 };
    const anchor = { x: 300, y: 200 };
    const before = screenToStage(view, anchor);
    const after = screenToStage(zoomAround(view, 2, anchor), anchor);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it('never goes past the zoom limits', () => {
    const view = { zoom: 1, x: 0, y: 0 };
    expect(zoomAround(view, 99, { x: 0, y: 0 }).zoom).toBe(MAX_ZOOM);
    expect(zoomAround(view, 0, { x: 0, y: 0 }).zoom).toBe(MIN_ZOOM);
    expect(clampZoom(1)).toBe(1);
  });
});

describe('fitView', () => {
  it('shrinks a big design to fit and centres it', () => {
    const view = fitView({ width: 1000, height: 600 }, { width: 2000, height: 500 }, 0);
    expect(view.zoom).toBeCloseTo(0.5);
    expect(view.x).toBeCloseTo(0);
    expect(view.y).toBeCloseTo((600 - 250) / 2);
  });

  it('does not enlarge a small design past 100%', () => {
    const view = fitView({ width: 1000, height: 800 }, { width: 200, height: 100 });
    expect(view.zoom).toBe(1);
    expect(view.x).toBeCloseTo(400);
  });

  it('copes with a tiny viewport', () => {
    const view = fitView({ width: 10, height: 10 }, { width: 1200, height: 600 });
    expect(view.zoom).toBeGreaterThanOrEqual(MIN_ZOOM);
  });
});

describe('panBy and wheelZoomFactor', () => {
  it('moves the view', () => {
    expect(panBy({ zoom: 2, x: 1, y: 2 }, 10, -5)).toEqual({ zoom: 2, x: 11, y: -3 });
  });

  it('zooms in when scrolling up and out when scrolling down', () => {
    expect(wheelZoomFactor(-100)).toBeGreaterThan(1);
    expect(wheelZoomFactor(100)).toBeLessThan(1);
    expect(wheelZoomFactor(0)).toBe(1);
  });
});
