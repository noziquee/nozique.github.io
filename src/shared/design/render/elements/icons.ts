import type { ICON_NAMES } from '../../schema';

export type IconName = (typeof ICON_NAMES)[number];

/** One drawing instruction of an icon. Only these fixed shapes can ever be drawn. */
export interface IconPart {
  tag: 'path' | 'rect' | 'circle' | 'line' | 'polyline' | 'polygon';
  attrs: Readonly<Record<string, string>>;
}

const path = (d: string): IconPart => ({ tag: 'path', attrs: { d } });
const polyline = (points: string): IconPart => ({ tag: 'polyline', attrs: { points } });
const polygon = (points: string): IconPart => ({ tag: 'polygon', attrs: { points } });
const circle = (cx: number, cy: number, r: number): IconPart => ({
  tag: 'circle',
  attrs: { cx: String(cx), cy: String(cy), r: String(r) },
});
const line = (x1: number, y1: number, x2: number, y2: number): IconPart => ({
  tag: 'line',
  attrs: { x1: String(x1), y1: String(y1), x2: String(x2), y2: String(y2) },
});
const rect = (x: number, y: number, width: number, height: number, rx = 0): IconPart => ({
  tag: 'rect',
  attrs: { x: String(x), y: String(y), width: String(width), height: String(height), rx: String(rx) },
});

/**
 * Icon artwork on a 24 x 24 grid, drawn as outlines in the current text colour. The drawings
 * follow the Feather icon set (MIT licence, https://feathericons.com). The names are the list
 * in the design format, so every icon a design may use has artwork here.
 */
export const ICON_ARTWORK: Record<IconName, readonly IconPart[]> = {
  instagram: [
    rect(2, 2, 20, 20, 5),
    path('M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z'),
    line(17.5, 6.5, 17.51, 6.5),
  ],
  youtube: [
    path(
      'M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z',
    ),
    polygon('9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02'),
  ],
  facebook: [path('M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z')],
  x: [line(4, 4, 20, 20), line(20, 4, 4, 20)],
  linkedin: [
    path('M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z'),
    rect(2, 9, 4, 12),
    circle(4, 4, 2),
  ],
  github: [
    path(
      'M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22',
    ),
  ],
  mail: [
    path('M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z'),
    polyline('22,6 12,13 2,6'),
  ],
  link: [
    path('M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'),
    path('M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'),
  ],
  globe: [
    circle(12, 12, 10),
    line(2, 12, 22, 12),
    path('M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'),
  ],
  arrow: [line(5, 12, 19, 12), polyline('12 5 19 12 12 19')],
};
