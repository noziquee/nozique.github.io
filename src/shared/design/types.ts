import type { z } from 'zod';
import type {
  designSchema,
  elementSchema,
  imageElementSchema,
  layoutSchema,
  shapeElementSchema,
  textElementSchema,
} from './schema';

export type Design = z.infer<typeof designSchema>;
export type Layout = z.infer<typeof layoutSchema>;
export type DesignElement = z.infer<typeof elementSchema>;
export type TextElement = z.infer<typeof textElementSchema>;
export type ShapeElement = z.infer<typeof shapeElementSchema>;
export type ImageElement = z.infer<typeof imageElementSchema>;
export type ElementType = DesignElement['type'];
export type LayoutName = keyof Design['layouts'];
