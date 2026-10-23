import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { registerBuiltInElements, renderDesign } from '../../shared/design/render';
import type { Design } from '../../shared/design';
import { fitView, panBy, wheelZoomFactor, zoomAround } from './viewport';
import type { Point, View } from './viewport';

interface Props {
  design: Design;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

interface Gesture {
  start: Point;
  view: View;
  elementId: string | null;
  panning: boolean;
  moved: boolean;
}

const CLICK_SLOP = 4;

/**
 * The editing canvas: draws the design with the same renderer as the public site, lets you
 * zoom (Ctrl + scroll, pinch or the buttons) and pan (scroll, or drag the empty background),
 * and select one element by clicking it.
 */
export function Canvas({ design, selectedId, onSelect }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const fitted = useRef(false);
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

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 && event.button !== 1) return;
    const hit = (event.target as HTMLElement).closest<HTMLElement>('[data-element-id]');
    const elementId = hit?.dataset.elementId ?? null;
    gesture.current = {
      start: { x: event.clientX, y: event.clientY },
      view,
      elementId,
      panning: elementId === null || event.button === 1,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g) return;
    const dx = event.clientX - g.start.x;
    const dy = event.clientY - g.start.y;
    if (!g.moved && Math.hypot(dx, dy) > CLICK_SLOP) {
      g.moved = true;
      if (g.panning) setPanning(true);
    }
    if (g.moved && g.panning) setView(panBy(g.view, dx, dy));
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    gesture.current = null;
    setPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (g && !g.moved && event.button === 0) onSelect(g.elementId);
  }

  const selected = selectedId
    ? layout.elements.find((element) => element.id === selectedId)
    : undefined;

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
        <span className="muted canvas-hint">Ctrl + scroll to zoom, drag background to move</span>
      </div>
      <div
        ref={viewportRef}
        className={`canvas-viewport${panning ? ' panning' : ''}`}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onSelect(null);
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
              className="canvas-selection"
              style={{
                left: selected.position.x,
                top: selected.position.y,
                width: selected.size.width,
                height: selected.size.height,
                transform: selected.rotation ? `rotate(${selected.rotation}deg)` : undefined,
                outlineWidth: 2 / view.zoom,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
