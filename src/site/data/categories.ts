import type { Category } from './types';

/** The five starter categories, used when the database has none. */
export const DEFAULT_CATEGORIES: readonly Category[] = [
  { key: 'illustration', label: 'Illustration' },
  { key: '3d', label: '3D / Blender' },
  { key: 'anim2d', label: '2D Animation' },
  { key: 'anim3d', label: '3D Animation' },
  { key: 'character', label: 'Character Design' },
];

const KNOWN: Record<string, string> = {
  illustration: 'illustration',
  '3d / blender': '3d',
  '2d animation': 'anim2d',
  '3d animation': 'anim3d',
  'character design': 'character',
};

/** Turn a category name from the database into a stable key. */
export function categoryKey(name: string): string {
  const lower = name.trim().toLowerCase();
  const known = KNOWN[lower];
  if (known) return known;
  const slug = lower.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'other';
}

/** True for categories whose projects are animations (they show a Play tag and video). */
export function isAnimation(key: string): boolean {
  return key === 'anim2d' || key === 'anim3d';
}
