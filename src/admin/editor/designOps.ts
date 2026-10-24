import { LIMITS } from '../../shared/design';
import type {
  Design,
  DesignElement,
  ImageElement,
  ShapeElement,
  TextElement,
} from '../../shared/design';

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
        elements: desktop.elements.map((element): DesignElement =>
          element.id === id ? { ...element, ...patch } : element,
        ),
      },
    },
  };
}

export function findElement(design: Design, id: string): DesignElement | undefined {
  return design.layouts.desktop.elements.find((element) => element.id === id);
}

export type NewElementKind = 'text' | 'rectangle' | 'ellipse';

/** The biggest a newly added picture is on the canvas. */
const NEW_IMAGE_BOX = { width: 480, height: 360 };

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

export type StackStep = 'forward' | 'backward' | 'front' | 'back';

function withElements(design: Design, elements: DesignElement[]): Design {
  const { desktop } = design.layouts;
  return { ...design, layouts: { ...design.layouts, desktop: { ...desktop, elements } } };
}

/** Move the element at `from` so it ends up at `to` (everything between shifts by one). */
function moved(elements: readonly DesignElement[], from: number, to: number): DesignElement[] {
  const next = [...elements];
  const [item] = next.splice(from, 1);
  if (item) next.splice(to, 0, item);
  return next;
}

/** Where an element would go for a step, or null when it is already there. */
function stepTarget(index: number, count: number, step: StackStep): number | null {
  const target = {
    forward: index + 1,
    backward: index - 1,
    front: count - 1,
    back: 0,
  }[step];
  return target === index || target < 0 || target >= count ? null : target;
}

/** True when the element can move that way in the stack (later elements sit on top). */
export function canStep(design: Design, id: string, step: StackStep): boolean {
  const { elements } = design.layouts.desktop;
  const index = elements.findIndex((element) => element.id === id);
  return index >= 0 && stepTarget(index, elements.length, step) !== null;
}

/** Bring an element forward or send it backward, one step or all the way. */
export function stepElement(design: Design, id: string, step: StackStep): Design {
  const { elements } = design.layouts.desktop;
  const index = elements.findIndex((element) => element.id === id);
  if (index < 0) return design;
  const target = stepTarget(index, elements.length, step);
  return target === null ? design : withElements(design, moved(elements, index, target));
}

/** Drag-and-drop: put `activeId` where `overId` is in the stack. */
export function moveElementOnto(design: Design, activeId: string, overId: string): Design {
  const { elements } = design.layouts.desktop;
  const from = elements.findIndex((element) => element.id === activeId);
  const to = elements.findIndex((element) => element.id === overId);
  if (from < 0 || to < 0 || from === to) return design;
  return withElements(design, moved(elements, from, to));
}

export interface NewImage {
  src: string;
  alt: string;
  /** The picture's own size, used to give the new element the right proportions. */
  width: number;
  height: number;
}

/** Add a picture on top of the others, as big as fits in a 480 x 360 box, keeping its shape. */
export function addImageElement(design: Design, image: NewImage): AddResult {
  const { elements } = design.layouts.desktop;
  if (elements.length >= LIMITS.maxElementsPerLayout) {
    const error = `A section can have at most ${LIMITS.maxElementsPerLayout} elements.`;
    return { ok: false, error };
  }
  const scale = Math.min(
    NEW_IMAGE_BOX.width / Math.max(1, image.width),
    NEW_IMAGE_BOX.height / Math.max(1, image.height),
  );
  const width = Math.max(20, Math.round(image.width * scale));
  const height = Math.max(20, Math.round(image.height * scale));
  const id = uniqueId(design, 'image');
  const element: ImageElement = {
    ...common(design, id, width, height),
    type: 'image',
    name: 'Image',
    content: { src: image.src, alt: image.alt },
    style: { fit: 'cover', radius: 0, focusX: 50, focusY: 50, zoom: 1 },
  };
  const { desktop } = design.layouts;
  const next: Design = {
    ...design,
    layouts: { ...design.layouts, desktop: { ...desktop, elements: [...elements, element] } },
  };
  return { ok: true, design: next, id };
}

/** Change the crop or fit of a picture element. Other elements are left alone. */
export function updateImageStyle(
  design: Design,
  id: string,
  patch: Partial<ImageElement['style']>,
): Design {
  const { desktop } = design.layouts;
  return withElements(
    design,
    desktop.elements.map(
      (element): DesignElement =>
        element.id === id && element.type === 'image'
          ? { ...element, style: { ...element.style, ...patch } }
          : element,
    ),
  );
}
