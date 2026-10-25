import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { registerBuiltInElements, renderDesign } from '../../shared/design/render';
import type { Design } from '../../shared/design';
import { findElement, updateElement, updateImageStyle } from './designOps';
import { moveBox, panCrop, resizeBox, rotationFor } from './transform';
import type { Box, CropStyle, Handle } from './transform';
import { fitView, panBy, screenToStage, wheelZoomFactor, zoomAround } from './viewport';
import type { Point, View } from './viewport';

interface Props {
  design: Design;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Called many times while dragging, with the design as it looks right now. */
  onChange: (design: Design, group?: string) => void;
  /** Called when the Delete or Backspace key is pressed on the canvas. */
  onDelete: () => void;
  /** The picture being cropped (dragged inside its frame), if any. */
  cropId: string | null;
  onCrop: (id: string | null) => void;
}

type Mode = 'pan' | 'move' | 'resize' | 'rotate' | 'crop';

interface Gesture {
  mode: Mode;
  start: Point;
  view: View;
  /** The element being changed, and how it looked when the drag began. */
  elementId: string | null;
  origin: Box | null;
  handle: Handle | null;
  moved: boolean;
  /** Names this drag, so all its steps undo together. */
  group: string;
  /** How a picture was cropped when a crop drag began. */
  crop?: CropStyle;
}

const CLICK_SLOP = 4;
const RESIZE_HANDLES: readonly Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const HANDLE_SPOT: Record<Handle, { left: string; top: string; cursor: string }> = {
  nw: { left: '0%', top: '0%', cursor: 'nwse-resize' },
  n: { left: '50%', top: '0%', cursor: 'ns-resize' },
  ne: { left: '100%', top: '0%', cursor: 'nesw-resize' },
  e: { left: '100%', top: '50%', cursor: 'ew-resize' },
  se: { left: '100%', top: '100%', cursor: 'nwse-resize' },
  s: { left: '50%', top: '100%', cursor: 'ns-resize' },
  sw: { left: '0%', top: '100%', cursor: 'nesw-resize' },
  w: { left: '0%', top: '50%', cursor: 'ew-resize' },
};

interface Framed {
  position: Point;
  size: { width: number; height: number };
  rotation: number;
}

function boxOf(element: Framed): Box {
  return {
    x: element.position.x,
    y: element.position.y,
    width: element.size.width,
    height: element.size.height,
    rotation: element.rotation,
  };
}

/**
 * The editing canvas: draws the design with the same renderer as the public site, lets you
 * zoom (Ctrl + scroll, pinch or the buttons) and pan (scroll, or drag the empty background),
 * and select one element by clicking it.
 */
export function Canvas({
  design,
  selectedId,
  onSelect,
  onChange,
  onDelete,
  cropId,
  onCrop,
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const fitted = useRef(false);
  const drags = useRef(0);
  const [view, setView] = useState<View>({ zoom: 1, x: 40, y: 40 });
  const [panning, setPanning] = useState(false);
  const layout = design.layouts.desktop;

  // Draw the design. The renderer owns everything inside the content box.
  useEffect(() => {
    registerBuiltInElements();
    const content = contentRef.current;
    if (!content) return;
    content.replaceChildren(renderDesign(design, { layout: 'desktop', includeHidden: true }));
  }, [design]);

  const fit = useCallback(() => {
    const box = viewportRef.current;
    if (!box) return;
    const size = { width: box.clientWidth, height: box.clientHeight };
    setView(fitView(size, { width: layout.width, height: layout.height }));
  }, [layout.width, layout.height]);

  // Fit the design to the window once the canvas has a size.
  useEffect(() => {
    const box = viewportRef.current;
    if (!box || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      if (!fitted.current && box.clientWidth > 0 && box.clientHeight > 0) {
        fitted.current = true;
        fit();
      }
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, [fit]);

  // Wheel: Ctrl/Cmd + scroll (and trackpad pinch) zooms, plain scroll pans. This needs a native
  // listener because React's wheel events cannot cancel the browser's own page zoom.
  useEffect(() => {
    const found = viewportRef.current;
    if (!found) return;
    const box: HTMLDivElement = found;
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const rect = box.getBoundingClientRect();
      const anchor = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      if (event.ctrlKey || event.metaKey) {
        const factor = wheelZoomFactor(event.deltaY);
        setView((current) => zoomAround(current, current.zoom * factor, anchor));
      } else {
        setView((current) => panBy(current, -event.deltaX, -event.deltaY));
      }
    }
    box.addEventListener('wheel', onWheel, { passive: false });
    return () => box.removeEventListener('wheel', onWheel);
  }, []);

  function zoomBy(factor: number) {
    const box = viewportRef.current;
    if (!box) return;
    const centre = { x: box.clientWidth / 2, y: box.clientHeight / 2 };
    setView((current) => zoomAround(current, current.zoom * factor, centre));
  }

  function actualSize() {
    const box = viewportRef.current;
    if (!box) return;
    const centre = { x: box.clientWidth / 2, y: box.clientHeight / 2 };
    setView((current) => zoomAround(current, 1, centre));
  }

  /** A pointer position (in window coordinates) as a point on the design. */
  function stagePoint(clientX: number, clientY: number, at: View): Point {
    const rect = viewportRef.current?.getBoundingClientRect();
    const left = rect?.left ?? 0;
    const top = rect?.top ?? 0;
    return screenToStage(at, { x: clientX - left, y: clientY - top });
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 && event.button !== 1) return;
    const target = event.target as HTMLElement;
    const handleName = target.closest<HTMLElement>('[data-handle]')?.dataset.handle;
    const hitId = target.closest<HTMLElement>('[data-element-id]')?.dataset.elementId ?? null;
    drags.current += 1;
    const group = `drag-${drags.current}`;
    const base = { start: { x: event.clientX, y: event.clientY }, view, moved: false, group };

    let next: Gesture = { ...base, mode: 'pan', elementId: null, origin: null, handle: null };
    const selectedElement = selectedId ? findElement(design, selectedId) : undefined;
    const hitElement = hitId ? findElement(design, hitId) : undefined;
    const cropped = cropId ? findElement(design, cropId) : undefined;

    if (cropId && event.button === 0 && hitElement?.id === cropId && cropped?.type === 'image') {
      // In crop mode, dragging the picture moves it inside its frame.
      next = {
        ...base,
        mode: 'crop',
        elementId: cropped.id,
        origin: boxOf(cropped),
        handle: null,
        crop: {
          focusX: cropped.style.focusX,
          focusY: cropped.style.focusY,
          zoom: cropped.style.zoom,
        },
      };
    } else if (event.button === 0 && handleName && selectedElement && !selectedElement.locked) {
      const isRotate = handleName === 'rotate';
      next = {
        ...base,
        mode: isRotate ? 'rotate' : 'resize',
        elementId: selectedElement.id,
        origin: boxOf(selectedElement),
        handle: isRotate ? null : (handleName as Handle),
      };
    } else if (event.button === 0 && hitElement) {
      if (cropId) onCrop(null);
      if (hitElement.id !== selectedId) onSelect(hitElement.id);
      next = {
        ...base,
        mode: hitElement.locked ? 'pan' : 'move',
        elementId: hitElement.id,
        origin: boxOf(hitElement),
        handle: null,
      };
    }
    if (cropId && next.mode === 'pan' && event.button === 0) onCrop(null);
    gesture.current = next;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g) return;
    const dx = event.clientX - g.start.x;
    const dy = event.clientY - g.start.y;
    if (!g.moved && Math.hypot(dx, dy) > CLICK_SLOP) {
      g.moved = true;
      if (g.mode === 'pan') setPanning(true);
    }
    if (!g.moved) return;

    if (g.mode === 'pan') {
      setView(panBy(g.view, dx, dy));
      return;
    }
    if (!g.elementId || !g.origin) return;
    const stageDx = dx / g.view.zoom;
    const stageDy = dy / g.view.zoom;

    if (g.mode === 'crop' && g.crop) {
      // Turn the drag into the picture's own (rotated) directions before moving the crop.
      const angle = (g.origin.rotation * Math.PI) / 180;
      const localX = stageDx * Math.cos(angle) + stageDy * Math.sin(angle);
      const localY = -stageDx * Math.sin(angle) + stageDy * Math.cos(angle);
      const next = panCrop(g.crop, localX, localY, g.origin);
      const patch = { focusX: next.focusX, focusY: next.focusY };
      onChange(updateImageStyle(design, g.elementId, patch), g.group);
    } else if (g.mode === 'move') {
      const next = moveBox(g.origin, stageDx, stageDy, event.shiftKey);
      onChange(updateElement(design, g.elementId, { position: { x: next.x, y: next.y } }), g.group);
    } else if (g.mode === 'resize' && g.handle) {
      const next = resizeBox(g.origin, g.handle, stageDx, stageDy, event.shiftKey);
      onChange(
        updateElement(design, g.elementId, {
          position: { x: next.x, y: next.y },
          size: { width: next.width, height: next.height },
        }),
        g.group,
      );
    } else if (g.mode === 'rotate') {
      const from = stagePoint(g.start.x, g.start.y, g.view);
      const to = stagePoint(event.clientX, event.clientY, g.view);
      const rotation = rotationFor(g.origin, from, to, event.shiftKey);
      onChange(updateElement(design, g.elementId, { rotation }), g.group);
    }
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    gesture.current = null;
    setPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    // A click on empty space (no drag) clears the selection.
    if (g && !g.moved && g.mode === 'pan' && !g.elementId && event.button === 0) onSelect(null);
  }

  const selected = selectedId
    ? layout.elements.find((element) => element.id === selectedId)
    : undefined;
  const cropElement = cropId ? findElement(design, cropId) : undefined;
  const cropping = cropElement?.type === 'image' && cropElement.id === selected?.id;

  function zoomPicture(factor: number) {
    if (cropElement?.type !== 'image') return;
    const zoom = Math.round(Math.min(5, Math.max(1, cropElement.style.zoom * factor)) * 100) / 100;
    onChange(updateImageStyle(design, cropElement.id, { zoom }), `crop-zoom-${cropElement.id}`);
  }

  /** Double-clicking a picture starts crop mode: drag the picture inside its frame. */
  function onDoubleClick(event: ReactMouseEvent<HTMLDivElement>) {
    // While a drag is captured, the browser reports the canvas itself as the target of the
    // click, so find the picture under the pointer by position instead.
    const hit = document
      .elementsFromPoint(event.clientX, event.clientY)
      .map((node) => node.closest<HTMLElement>('[data-element-id]'))
      .find((node) => node !== null);
    const id = hit?.dataset.elementId;
    const element = id ? findElement(design, id) : undefined;
    if (element?.type === 'image' && !element.locked && element.style.fit !== 'fill') {
      onSelect(element.id);
      onCrop(element.id);
    }
  }

  return (
    <div className="canvas">
      <div className="canvas-toolbar" role="toolbar" aria-label="Canvas view">
        <button type="button" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.25)}>
          −
        </button>
        <span className="canvas-zoom" aria-live="polite">
          {Math.round(view.zoom * 100)}%
        </span>
        <button type="button" aria-label="Zoom in" onClick={() => zoomBy(1.25)}>
          +
        </button>
        <button type="button" onClick={fit}>
          Fit
        </button>
        <button type="button" onClick={actualSize}>
          100%
        </button>
        {cropping ? (
          <>
            <span className="canvas-crop-note">Crop: drag the picture · zoom it</span>
            <button
              type="button"
              aria-label="Zoom picture out"
              onClick={() => zoomPicture(1 / 1.2)}
            >
              −
            </button>
            <button type="button" aria-label="Zoom picture in" onClick={() => zoomPicture(1.2)}>
              +
            </button>
            <button type="button" className="primary" onClick={() => onCrop(null)}>
              Done
            </button>
          </>
        ) : (
          <span className="muted canvas-hint">
            Ctrl + scroll: zoom · Shift: constrain · Double-click a picture to crop
          </span>
        )}
      </div>
      <div
        ref={viewportRef}
        className={`canvas-viewport${panning ? ' panning' : ''}`}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            if (cropId) onCrop(null);
            else onSelect(null);
          }
          if (event.key === 'Delete' || event.key === 'Backspace') {
            event.preventDefault();
            onDelete();
          }
        }}
      >
        <div
          className="canvas-stage"
          style={{
            width: layout.width,
            height: layout.height,
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
          }}
        >
          <div ref={contentRef} className="canvas-content" />
          {selected && (
            <div
              className={`canvas-selection${cropping ? ' cropping' : ''}`}
              style={{
                left: selected.position.x,
                top: selected.position.y,
                width: selected.size.width,
                height: selected.size.height,
                transform: selected.rotation ? `rotate(${selected.rotation}deg)` : undefined,
                outlineWidth: 2 / view.zoom,
              }}
            >
              {!selected.locked && !cropping && (
                <>
                  {RESIZE_HANDLES.map((handle) => (
                    <span
                      key={handle}
                      className="canvas-handle"
                      data-handle={handle}
                      style={{
                        ...HANDLE_SPOT[handle],
                        width: 10 / view.zoom,
                        height: 10 / view.zoom,
                        borderWidth: 1.5 / view.zoom,
                      }}
                    />
                  ))}
                  <span
                    className="canvas-handle rotate"
                    data-handle="rotate"
                    style={{
                      left: '50%',
                      top: -28 / view.zoom,
                      width: 12 / view.zoom,
                      height: 12 / view.zoom,
                      borderWidth: 1.5 / view.zoom,
                    }}
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
