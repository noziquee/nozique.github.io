/**
 * Sections the public site obeys: on/off for all of them, order for the home page ones.
 * (About and Contact also switch their menu links.) A section outside this list would show a
 * "not connected" note in the admin.
 */
export const LIVE_SECTION_KEYS: readonly string[] = [
  'hero',
  'categories',
  'gallery',
  'about',
  'contact',
];

export function isLiveSection(key: string): boolean {
  return LIVE_SECTION_KEYS.includes(key);
}

interface Orderable {
  section_key: string;
  reorderable: boolean;
  sort_order: number;
}

/**
 * Move the section `activeKey` to where `overKey` is. Only sections that may be reordered take
 * part; pinned ones (header, footer) keep their exact places.
 */
export function reorderSections<T extends Orderable>(
  all: readonly T[],
  activeKey: string,
  overKey: string,
): T[] {
  const movable = all.filter((section) => section.reorderable);
  const from = movable.findIndex((section) => section.section_key === activeKey);
  const to = movable.findIndex((section) => section.section_key === overKey);
  if (from < 0 || to < 0 || from === to) return [...all];
  const moved = [...movable];
  const [item] = moved.splice(from, 1);
  moved.splice(to, 0, item as T);
  let cursor = 0;
  return all.map((section) => (section.reorderable ? (moved[cursor++] as T) : section));
}

/** The sort numbers that must be saved so the database matches `after` (0, 1, 2, ...). */
export function changedOrders(
  before: readonly Orderable[],
  after: readonly Orderable[],
): { key: string; sortOrder: number }[] {
  const old = new Map(before.map((section) => [section.section_key, section.sort_order]));
  return after
    .map((section, index) => ({ key: section.section_key, sortOrder: index }))
    .filter((update) => old.get(update.key) !== update.sortOrder);
}

/** Sections whose public version can be drawn from a design, so the visual editor may open them. */
export const DESIGNABLE_SECTION_KEYS: readonly string[] = ['hero'];

export function isDesignable(key: string): boolean {
  return DESIGNABLE_SECTION_KEYS.includes(key);
}
