export type StatusFilter = 'all' | 'published' | 'draft';

export interface Filterable {
  title: string;
  status: string;
  group_id: string | null;
}

export interface ProjectFilters {
  /** Group id, 'none' for projects without a category, or 'all'. */
  category: string;
  status: StatusFilter;
  search: string;
}

export const NO_FILTERS: ProjectFilters = { category: 'all', status: 'all', search: '' };

export function filterProjects<T extends Filterable>(items: readonly T[], f: ProjectFilters): T[] {
  const q = f.search.trim().toLowerCase();
  return items.filter((item) => {
    if (f.status !== 'all' && item.status !== f.status) return false;
    if (f.category === 'none' && item.group_id) return false;
    if (f.category !== 'all' && f.category !== 'none' && item.group_id !== f.category) return false;
    return !q || item.title.toLowerCase().includes(q);
  });
}

export function hasFilters(f: ProjectFilters): boolean {
  return f.category !== 'all' || f.status !== 'all' || f.search.trim() !== '';
}

/**
 * Move the project `activeId` to where `overId` is, but only among the projects currently
 * shown. Projects that are filtered out keep their exact places in the full list.
 */
export function reorderWithinVisible<T extends { id: string }>(
  all: readonly T[],
  visible: readonly T[],
  activeId: string,
  overId: string,
): T[] {
  const from = visible.findIndex((item) => item.id === activeId);
  const to = visible.findIndex((item) => item.id === overId);
  if (from < 0 || to < 0 || from === to) return [...all];
  const moved = [...visible];
  const [item] = moved.splice(from, 1);
  moved.splice(to, 0, item as T);
  const shown = new Set(visible.map((entry) => entry.id));
  let cursor = 0;
  return all.map((entry) => (shown.has(entry.id) ? (moved[cursor++] as T) : entry));
}
