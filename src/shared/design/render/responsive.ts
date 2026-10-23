import type { Design, DesignElement, Layout, LayoutName } from '../types';

export const PHONE_WIDTH = 390;
/** At or below this width the phone layout is used. */
export const DEFAULT_BREAKPOINT = 700;

interface StackOptions {
  width?: number;
  margin?: number;
  gap?: number;
}

const BACKDROP_PADDING = 16;

const area = (element: DesignElement) => element.size.width * element.size.height;

function centerInside(outer: DesignElement, inner: DesignElement): boolean {
  const cx = inner.position.x + inner.size.width / 2;
  const cy = inner.position.y + inner.size.height / 2;
  return (
    cx >= outer.position.x &&
    cx <= outer.position.x + outer.size.width &&
    cy >= outer.position.y &&
    cy <= outer.position.y + outer.size.height
  );
}

/** Reading order: top to bottom, then left to right. */
const readingOrder = (a: DesignElement, b: DesignElement) =>
  a.position.y - b.position.y || a.position.x - b.position.x;

/**
 * Place elements one under another inside a column. Returns the placed copies and the y of the
 * bottom edge of the last one.
 */
function stack(
  items: DesignElement[],
  left: number,
  columnWidth: number,
  top: number,
  gap: number,
): { placed: DesignElement[]; bottom: number } {
  let y = top;
  let bottom = top;
  const placed = items.map((element) => {
    const fitted = Math.min(element.size.width, columnWidth);
    const scale = fitted / element.size.width;
    const height =
      element.type === 'text'
        ? element.size.height
        : Math.max(1, Math.round(element.size.height * scale));
    const centered = element.type !== 'text' && fitted < columnWidth;
    const x = centered ? left + Math.round((columnWidth - fitted) / 2) : left;
    const copy = { ...element, position: { x, y }, size: { width: Math.round(fitted), height } };
    bottom = y + height;
    y = bottom + gap;
    return copy;
  });
  return { placed, bottom };
}

/**
 * Make a phone layout from a desktop one by stacking the elements in a single column, top to
 * bottom in reading order. It is a starting point: you can replace it with a hand-made phone
 * layout at any time.
 * - Wide elements shrink to fit the column (shapes keep their proportions, text keeps its
 *   height); narrow shapes are centered; hidden elements stay hidden.
 * - A shape that sits behind other elements (a card behind its text, say) stays behind them: the
 *   elements on top are stacked inside it and the shape grows to wrap them.
 */
export function deriveMobileLayout(desktop: Layout, options: StackOptions = {}): Layout {
  const width = options.width ?? PHONE_WIDTH;
  const margin = options.margin ?? 16;
  const gap = options.gap ?? 16;
  const column = width - margin * 2;

  const visible = desktop.elements.filter((element) => !element.hidden);
  const hidden = desktop.elements.filter((element) => element.hidden);

  // For each element, the largest shape that has its center inside it (if any).
  const container = new Map<string, DesignElement>();
  for (const element of visible) {
    const candidates = visible.filter(
      (other) =>
        other.type === 'shape' &&
        other.id !== element.id &&
        area(other) > area(element) &&
        centerInside(other, element),
    );
    const largest = candidates.sort((a, b) => area(b) - area(a))[0];
    if (largest) container.set(element.id, largest);
  }
  // A shape that is itself inside another shape is just one of that shape's children.
  const backdrops = new Set(
    [...container.values()].filter((shape) => !container.has(shape.id)).map((shape) => shape.id),
  );

  type Unit = { lead: DesignElement; backdrop?: DesignElement; children: DesignElement[] };
  const units: Unit[] = [];
  for (const element of visible) {
    const owner = container.get(element.id);
    if (owner && backdrops.has(owner.id)) continue;
    if (backdrops.has(element.id)) {
      const children = visible.filter((other) => container.get(other.id)?.id === element.id);
      units.push({ lead: element, backdrop: element, children: children.sort(readingOrder) });
    } else {
      units.push({ lead: element, children: [] });
    }
  }
  units.sort((a, b) => readingOrder(a.lead, b.lead));

  const output: DesignElement[] = [];
  let cursor = margin;
  let lastBottom = margin;
  for (const unit of units) {
    if (unit.backdrop) {
      const inner = stack(
        unit.children,
        margin + BACKDROP_PADDING,
        column - BACKDROP_PADDING * 2,
        cursor + BACKDROP_PADDING,
        gap,
      );
      const height = inner.bottom - cursor + BACKDROP_PADDING;
      output.push({
        ...unit.backdrop,
        position: { x: margin, y: cursor },
        size: { width: column, height },
      });
      output.push(...inner.placed);
      lastBottom = cursor + height;
    } else {
      const single = stack([unit.lead], margin, column, cursor, gap);
      output.push(...single.placed);
      lastBottom = single.bottom;
    }
    cursor = lastBottom + gap;
  }

  const height = Math.max(50, units.length > 0 ? lastBottom + margin : 50);
  return {
    width,
    height,
    ...(desktop.background ? { background: desktop.background } : {}),
    elements: [...output, ...hidden],
  };
}

/** The layout to draw: the phone one if asked for (made automatically if there is none). */
export function pickLayout(
  design: Design,
  name: LayoutName,
): { name: LayoutName; layout: Layout; derived: boolean } {
  if (name === 'mobile') {
    if (design.layouts.mobile) return { name, layout: design.layouts.mobile, derived: false };
    return { name, layout: deriveMobileLayout(design.layouts.desktop), derived: true };
  }
  return { name: 'desktop', layout: design.layouts.desktop, derived: false };
}

/** Which layout suits a host of this width. */
export function chooseLayoutName(
  hostWidth: number,
  breakpoint: number = DEFAULT_BREAKPOINT,
): LayoutName {
  return hostWidth > 0 && hostWidth <= breakpoint ? 'mobile' : 'desktop';
}

/** How much to shrink a layout so it fits the host. Layouts are never enlarged. */
export function scaleFor(hostWidth: number, layoutWidth: number): number {
  if (!(hostWidth > 0) || !(layoutWidth > 0)) return 1;
  return Math.min(1, hostWidth / layoutWidth);
}
