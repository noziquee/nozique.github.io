import { isAnimation } from './categories';
import type { SiteData } from './types';

/**
 * The shape the old page modules (src/site/legacy) expect. This adapter disappears as
 * each page is rewritten against the typed Project model in steps 2.3 to 2.6.
 */
export interface LegacyProject {
  id: string;
  t: string;
  c: string;
  y: number;
  tl: string;
  s: number;
  f: 0 | 1;
  r: string;
  d: string;
  img: string;
  alt: string;
  gallery: { src: string; alt: string; caption: string }[];
  video: string;
  role: string;
  an: boolean;
}

/** Replace the contents of the legacy project list and category map in place. */
export function applyToLegacy(
  data: SiteData,
  projects: LegacyProject[],
  categories: Record<string, string>,
): void {
  projects.length = 0;
  for (const p of data.projects) {
    projects.push({
      id: p.id,
      t: p.title,
      c: p.category,
      y: p.year,
      tl: p.tools,
      s: p.seed,
      f: p.featured ? 1 : 0,
      r: p.aspect,
      d: p.description,
      img: p.cover?.src ?? '',
      alt: p.cover?.alt ?? '',
      gallery: p.gallery,
      video: p.video,
      role: p.role,
      an: isAnimation(p.category),
    });
  }
  for (const key of Object.keys(categories)) delete categories[key];
  for (const category of data.categories) categories[category.key] = category.label;
}
