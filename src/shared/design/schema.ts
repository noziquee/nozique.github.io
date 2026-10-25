import { z } from 'zod';

/** The version written into every new design. Raise it (and add a migration) when the format changes. */
export const CURRENT_DESIGN_VERSION = 1;

export const LIMITS = {
  maxElementsPerLayout: 500,
  maxTextLength: 5000,
  minLayoutWidth: 200,
  maxLayoutWidth: 3000,
} as const;

const num = (min: number, max: number) => z.number().finite().min(min).max(max);

/** Letters, digits, dash and underscore only, so an id is always safe in HTML and CSS. */
const idSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{1,64}$/, 'must be 1 to 64 letters, digits, "-" or "_"');

/**
 * A colour: hex (#rgb, #rgba, #rrggbb, #rrggbbaa), rgb()/rgba(), "transparent", or a named
 * colour token like var(--red). Nothing else gets through, so a design can never smuggle in
 * url(...) or other CSS.
 */
const COLOR_PATTERN =
  /^(?:#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|transparent|var\(--[a-z0-9-]{1,40}\)|rgba?\(\s*[0-9.%\s,/]{1,40}\))$/;
export const colorSchema = z
  .string()
  .regex(COLOR_PATTERN, 'must be a colour like #e8281e, rgb(0, 0, 0) or var(--red)');

/** A font family: a font token like var(--font-display), or a plain font name. */
const fontFamilySchema = z
  .string()
  .regex(/^(?:var\(--[a-z0-9-]{1,40}\)|[A-Za-z0-9][A-Za-z0-9 -]{0,59})$/, 'must be a font name');

const positionSchema = z.object({ x: num(-5000, 10000), y: num(-5000, 10000) }).strict();
const sizeSchema = z.object({ width: num(1, 10000), height: num(1, 10000) }).strict();

/** What every element has, whatever its type. */
const baseFields = {
  id: idSchema,
  name: z.string().max(80).optional(),
  position: positionSchema,
  size: sizeSchema,
  rotation: num(-360, 360).default(0),
  opacity: num(0, 1).default(1),
  hidden: z.boolean().default(false),
  locked: z.boolean().default(false),
};

export const textElementSchema = z
  .object({
    ...baseFields,
    type: z.literal('text'),
    content: z.object({ text: z.string().max(LIMITS.maxTextLength) }).strict(),
    style: z
      .object({
        fontFamily: fontFamilySchema,
        fontSize: num(1, 400),
        fontWeight: z.number().int().min(100).max(900).multipleOf(100).default(400),
        italic: z.boolean().default(false),
        underline: z.boolean().default(false),
        align: z.enum(['left', 'center', 'right', 'justify']).default('left'),
        lineHeight: num(0.5, 4).default(1.2),
        letterSpacing: num(-10, 50).default(0),
        color: colorSchema,
      })
      .strict(),
  })
  .strict();

export const shapeElementSchema = z
  .object({
    ...baseFields,
    type: z.literal('shape'),
    shape: z.enum(['rect', 'ellipse']).default('rect'),
    style: z
      .object({
        fill: colorSchema,
        stroke: colorSchema.optional(),
        strokeWidth: num(0, 100).default(0),
        radius: num(0, 1000).default(0),
      })
      .strict(),
  })
  .strict();

/** An image address: https only, so never data:, javascript: or http: addresses. */
const imageUrlSchema = z
  .string()
  .max(2000)
  .url()
  .refine((value) => value.startsWith('https://'), 'must start with https://');

export const imageElementSchema = z
  .object({
    ...baseFields,
    type: z.literal('image'),
    content: z.object({ src: imageUrlSchema, alt: z.string().max(300) }).strict(),
    style: z
      .object({
        fit: z.enum(['cover', 'contain', 'fill']).default('cover'),
        radius: num(0, 1000).default(0),
        /** Which part of the picture stays in view, as a percentage (50, 50 is the middle). */
        focusX: num(0, 100).default(50),
        focusY: num(0, 100).default(50),
        /** Crop zoom: 1 shows the whole picture, 2 shows the middle half. */
        zoom: num(1, 5).default(1),
      })
      .strict(),
  })
  .strict();

/**
 * Where a link may go: this site's own pages (#/work), a web address (https only), an email or
 * a phone number. Nothing else gets through, so a design can never contain a javascript: or
 * data: link. An empty value means "no link".
 */
const LINK_PATTERN =
  /^(?:https:\/\/[^\s"'<>]{1,1900}|mailto:[^\s"'<>]{3,200}|tel:\+?[0-9 ()-]{3,30}|#\/[A-Za-z0-9/_-]{0,100}|#[A-Za-z0-9_-]{1,100})$/;
export const linkSchema = z
  .string()
  .max(2000)
  .refine(
    (value) => value === '' || LINK_PATTERN.test(value),
    'must be a link like https://example.com, #/work, mailto:you@example.com or tel:+63... (or empty)',
  );

export const buttonElementSchema = z
  .object({
    ...baseFields,
    type: z.literal('button'),
    content: z
      .object({
        label: z.string().min(1).max(100),
        href: linkSchema.default(''),
        /** Open web addresses in a new tab. */
        newTab: z.boolean().default(false),
      })
      .strict(),
    style: z
      .object({
        fontFamily: fontFamilySchema,
        fontSize: num(1, 200),
        fontWeight: z.number().int().min(100).max(900).multipleOf(100).default(700),
        letterSpacing: num(-10, 50).default(0),
        color: colorSchema,
        fill: colorSchema,
        borderColor: colorSchema.optional(),
        borderWidth: num(0, 50).default(0),
        radius: num(0, 1000).default(0),
        /** Colours while the pointer is over the button. Empty = no change. */
        hoverFill: colorSchema.optional(),
        hoverColor: colorSchema.optional(),
      })
      .strict(),
  })
  .strict();

/** Every element type the format knows. New types are added here, one per step. */
export const elementSchema = z.discriminatedUnion('type', [
  textElementSchema,
  shapeElementSchema,
  imageElementSchema,
  buttonElementSchema,
]);

export const layoutSchema = z
  .object({
    width: num(LIMITS.minLayoutWidth, LIMITS.maxLayoutWidth),
    height: num(50, 20000),
    background: colorSchema.optional(),
    elements: z.array(elementSchema).max(LIMITS.maxElementsPerLayout),
  })
  .strict()
  .superRefine((layout, context) => {
    const seen = new Set<string>();
    layout.elements.forEach((element, index) => {
      if (seen.has(element.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['elements', index, 'id'],
          message: `the id "${element.id}" is used more than once`,
        });
      }
      seen.add(element.id);
    });
  });

/**
 * One section's design: a desktop layout and, optionally, a separate phone layout.
 * Without a phone layout the renderer stacks the desktop elements automatically.
 */
export const designSchema = z
  .object({
    version: z.literal(CURRENT_DESIGN_VERSION),
    layouts: z.object({ desktop: layoutSchema, mobile: layoutSchema.optional() }).strict(),
  })
  .strict();
