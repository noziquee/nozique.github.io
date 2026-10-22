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
