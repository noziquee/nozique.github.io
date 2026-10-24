import { parseDesign } from '../../shared/design';
import type { Design, ElementType } from '../../shared/design';

export interface Option {
  value: string;
  label: string;
}

interface Base {
  /** Where the value lives on the element, like "style.fontSize". */
  key: string;
  label: string;
}

/**
 * One editable property of an element. The properties panel is built from these descriptions,
 * so a new element type only needs a list of fields, not its own panel code.
 */
export type FieldSpec =
  | (Base & { kind: 'number'; step: number })
  | (Base & { kind: 'text'; multiline?: boolean; optional?: boolean })
  | (Base & { kind: 'colour'; optional?: boolean })
  | (Base & { kind: 'select'; options: readonly Option[]; numeric?: boolean })
  | (Base & { kind: 'toggle' })
  /** A picture: shows a button that uploads a new file and stores its address. */
  | (Base & { kind: 'image' });

export interface FieldGroup {
  title: string;
  /** Show the fields two to a row (for short numbers). */
  grid?: boolean;
  fields: readonly FieldSpec[];
}

export type FieldValue = string | number | boolean | undefined;

export const FONT_OPTIONS: readonly Option[] = [
  { value: 'Archivo', label: 'Archivo' },
  { value: 'Instrument Sans', label: 'Instrument Sans' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Courier New', label: 'Courier New' },
];

const WEIGHT_OPTIONS: readonly Option[] = [100, 200, 300, 400, 500, 600, 700, 800, 900].map(
  (weight) => ({ value: String(weight), label: String(weight) }),
);

const ALIGN_OPTIONS: readonly Option[] = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Centre' },
  { value: 'right', label: 'Right' },
  { value: 'justify', label: 'Justify' },
];

const SHAPE_OPTIONS: readonly Option[] = [
  { value: 'rect', label: 'Rectangle' },
  { value: 'ellipse', label: 'Ellipse' },
];

/** Fields every element has. */
export const COMMON_GROUPS: readonly FieldGroup[] = [
  {
    title: 'Position and size',
    grid: true,
    fields: [
      { kind: 'number', key: 'position.x', label: 'X', step: 1 },
      { kind: 'number', key: 'position.y', label: 'Y', step: 1 },
      { kind: 'number', key: 'size.width', label: 'Width', step: 1 },
      { kind: 'number', key: 'size.height', label: 'Height', step: 1 },
      { kind: 'number', key: 'rotation', label: 'Rotation (°)', step: 1 },
      { kind: 'number', key: 'opacity', label: 'Opacity (0 to 1)', step: 0.05 },
    ],
  },
];

/** The extra fields of each element type. A new type adds its entry here. */
export const TYPE_GROUPS: Record<ElementType, readonly FieldGroup[]> = {
  text: [
    {
      title: 'Text',
      fields: [{ kind: 'text', key: 'content.text', label: 'Text', multiline: true }],
    },
    {
      title: 'Style',
      grid: true,
      fields: [
        { kind: 'select', key: 'style.fontFamily', label: 'Font', options: FONT_OPTIONS },
        {
          kind: 'select',
          key: 'style.fontWeight',
          label: 'Weight',
          options: WEIGHT_OPTIONS,
          numeric: true,
        },
        { kind: 'number', key: 'style.fontSize', label: 'Size', step: 1 },
        { kind: 'number', key: 'style.lineHeight', label: 'Line height', step: 0.05 },
        { kind: 'number', key: 'style.letterSpacing', label: 'Letter spacing', step: 0.5 },
        { kind: 'select', key: 'style.align', label: 'Align', options: ALIGN_OPTIONS },
        { kind: 'toggle', key: 'style.italic', label: 'Italic' },
        { kind: 'toggle', key: 'style.underline', label: 'Underline' },
        { kind: 'colour', key: 'style.color', label: 'Colour' },
      ],
    },
  ],
  image: [
    {
      title: 'Picture',
      fields: [
        { kind: 'image', key: 'content.src', label: 'Picture' },
        { kind: 'text', key: 'content.alt', label: 'Alt text (describe the picture)' },
      ],
    },
    {
      title: 'Display',
      grid: true,
      fields: [
        { kind: 'select', key: 'style.fit', label: 'Fit', options: FIT_OPTIONS },
        { kind: 'number', key: 'style.radius', label: 'Corner radius', step: 1 },
      ],
    },
    {
      title: 'Crop',
      grid: true,
      fields: [
        { kind: 'number', key: 'style.zoom', label: 'Zoom (1 to 5)', step: 0.1 },
        { kind: 'number', key: 'style.focusX', label: 'Left to right (%)', step: 1 },
        { kind: 'number', key: 'style.focusY', label: 'Top to bottom (%)', step: 1 },
      ],
    },
  ],
  shape: [
    {
      title: 'Shape',
      grid: true,
      fields: [
        { kind: 'select', key: 'shape', label: 'Shape', options: SHAPE_OPTIONS },
        { kind: 'number', key: 'style.radius', label: 'Corner radius', step: 1 },
        { kind: 'colour', key: 'style.fill', label: 'Fill' },
        { kind: 'colour', key: 'style.stroke', label: 'Outline colour', optional: true },
        { kind: 'number', key: 'style.strokeWidth', label: 'Outline width', step: 1 },
      ],
    },
  ],
};

const FIT_OPTIONS: readonly Option[] = [
  { value: 'cover', label: 'Fill the frame (crops)' },
  { value: 'contain', label: 'Show all (may leave gaps)' },
  { value: 'fill', label: 'Stretch' },
];

export const NAME_FIELD: FieldSpec = {
  kind: 'text',
  key: 'name',
  label: 'Name',
  optional: true,
};

/** Read the value at a path like "style.fontSize". */
export function getAt(source: unknown, path: string): unknown {
  let current: unknown = source;
  for (const part of path.split('.')) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/** A copy of `source` with the value at `path` replaced. An undefined value removes the key. */
export function setAt<T>(source: T, path: string, value: unknown): T {
  const [head = '', ...rest] = path.split('.');
  const record = source as Record<string, unknown>;
  const others = Object.entries(record).filter(([key]) => key !== head);
  const kept = Object.fromEntries(others);
  if (rest.length === 0) return (value === undefined ? kept : { ...kept, [head]: value }) as T;
  const child = setAt(record[head] ?? {}, rest.join('.'), value);
  return { ...kept, [head]: child } as T;
}

export type ApplyResult = { ok: true; design: Design } | { ok: false; error: string };

function plainMessage(error: string | undefined): string {
  if (!error) return 'That value is not allowed.';
  const at = error.indexOf(': ');
  return at >= 0 ? error.slice(at + 2) : error;
}

/**
 * Set one property of one element and check the whole design is still valid. A value the
 * design format does not allow is refused with a readable message, never stored.
 */
export function applyField(
  design: Design,
  id: string,
  spec: Pick<FieldSpec, 'key'>,
  value: FieldValue,
): ApplyResult {
  const { desktop } = design.layouts;
  const index = desktop.elements.findIndex((element) => element.id === id);
  const current = desktop.elements[index];
  if (!current) return { ok: false, error: 'That element no longer exists.' };
  const elements = desktop.elements.map((element, position) =>
    position === index ? setAt(current, spec.key, value) : element,
  );
  const next: Design = {
    ...design,
    layouts: { ...design.layouts, desktop: { ...desktop, elements } },
  };
  const checked = parseDesign(next);
  if (!checked.ok) return { ok: false, error: plainMessage(checked.errors[0]) };
  return { ok: true, design: next };
}
