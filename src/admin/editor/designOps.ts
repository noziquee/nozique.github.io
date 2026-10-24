import { LIMITS } from '../../shared/design';
import type { Design, DesignElement, ShapeElement, TextElement } from '../../shared/design';

export interface ElementPatch {
  position?: DesignElement['position'];
  size?: DesignElement['size'];
  rotation?: number;
}

/** A copy of the design with one desktop element changed. Unknown ids change nothing. */
export function updateElement(design: Design, id: string, patch: ElementPatch): Design {
  const { desktop } = design.layouts;
  return {
    ...design,
    layouts: {
      ...design.layouts,
      desktop: {
        ...desktop,
        elements: desktop.elements.map(
          (element): DesignElement => (element.id === id ? { ...element, ...patch } : element),
        ),
      },
    },
  };
}

export function findElement(design: Design, id: string): DesignElement | undefined {
  return design.layouts.desktop.elements.find((element) => element.id === id);
}

export type NewElementKind = 'text' | 'rectangle' | 'ellipse';

export type AddResult = { ok: true; design: Design; id: string } | { ok: false; error: string };

/** The brand red: easy to see on both dark and light backgrounds. */
const NEW_COLOUR = '#e8281e';

/** The first id like "text-1", "text-2", ... that no element uses yet. */
export function uniqueId(design: Design, prefix: string): string {
  const used = new Set(design.layouts.desktop.elements.map((element) => element.id));
  let number = 1;
  while (used.has(`${prefix}-${number}`)) number += 1;
  return `${prefix}-${number}`;
}

function common(design: Design, id: string, width: number, height: number) {
  const layout = design.layouts.desktop;
  // Each new element sits a little off the previous one so a pile of them can be told apart.
  const nudge = (layout.elements.length % 6) * 24;
  return {
    id,
    position: {
      x: Math.round(Math.max(0, (layout.width - width) / 2) + nudge),
      y: Math.round(Math.max(0, (layout.height - height) / 2) + nudge),
    },
    size: { width, height },
    rotation: 0,
    opacity: 1,
    hidden: false,
    locked: false,
  };
}

function newText(design: Design, id: string): TextElement {
  return {
    ...common(design, id, 320, 80),
    type: 'text',
    name: 'Text',
    content: { text: 'New text' },
    style: {
      fontFamily: 'Archivo',
      fontSize: 48,
      fontWeight: 700,
      italic: false,
      underline: false,
      align: 'left',
      lineHeight: 1.2,
      letterSpacing: 0,
      color: NEW_COLOUR,
    },
  };
}

function newShape(design: Design, id: string, kind: 'rectangle' | 'ellipse'): ShapeElement {
  const rectangle = kind === 'rectangle';
  return {
    ...common(design, id, rectangle ? 240 : 200, rectangle ? 160 : 200),
    type: 'shape',
    name: rectangle ? 'Rectangle' : 'Ellipse',
    shape: rectangle ? 'rect' : 'ellipse',
    style: { fill: NEW_COLOUR, strokeWidth: 0, radius: 0 },
  };
}

/** Add a new element on top of the others, in the middle of the desktop layout. */
export function addElement(design: Design, kind: NewElementKind): AddResult {
  const { elements } = design.layouts.desktop;
  if (elements.length >= LIMITS.maxElementsPerLayout) {
    const error = `A section can have at most ${LIMITS.maxElementsPerLayout} elements.`;
    return { ok: false, error };
  }
  const id = uniqueId(design, kind);
  const element = kind === 'text' ? newText(design, id) : newShape(design, id, kind);
  const { desktop } = design.layouts;
  const next: Design = {
    ...design,
    layouts: { ...design.layouts, desktop: { ...desktop, elements: [...elements, element] } },
  };
  return { ok: true, design: next, id };
}

/** A copy of the design without the element. Unknown ids change nothing. */
export function deleteElement(design: Design, id: string): Design {
  const { desktop } = design.layouts;
  return {
    ...design,
    layouts: {
      ...design.layouts,
      desktop: { ...desktop, elements: desktop.elements.filter((element) => element.id !== id) },
    },
  };
}
