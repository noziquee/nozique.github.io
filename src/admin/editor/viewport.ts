/** Where the canvas is looking: screen = stage * zoom + (x, y). */
export interface View {
  zoom: number;
  x: number;
  y: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/** Change the zoom while keeping the stage point under `anchor` (a screen point) where it is. */
export function zoomAround(view: View, nextZoom: number, anchor: Point): View {
  const zoom = clampZoom(nextZoom);
  const stageX = (anchor.x - view.x) / view.zoom;
  const stageY = (anchor.y - view.y) / view.zoom;
  return { zoom, x: anchor.x - stageX * zoom, y: anchor.y - stageY * zoom };
}

export function panBy(view: View, dx: number, dy: number): View {
  return { ...view, x: view.x + dx, y: view.y + dy };
}

/** Zoom so the whole design is visible (never above 100%) and centre it. */
export function fitView(viewport: Size, content: Size, padding = 40): View {
  const room = {
    width: Math.max(1, viewport.width - padding * 2),
    height: Math.max(1, viewport.height - padding * 2),
  };
  const zoom = clampZoom(Math.min(1, room.width / content.width, room.height / content.height));
  return {
    zoom,
    x: (viewport.width - content.width * zoom) / 2,
    y: (viewport.height - content.height * zoom) / 2,
  };
}

/** The zoom change for one mouse-wheel (or pinch) event. */
export function wheelZoomFactor(deltaY: number): number {
  return Math.exp(-deltaY * 0.002);
}

export function screenToStage(view: View, point: Point): Point {
  return { x: (point.x - view.x) / view.zoom, y: (point.y - view.y) / view.zoom };
}
