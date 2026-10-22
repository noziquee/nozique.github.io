import { useCallback, useEffect, useMemo, useState } from 'react';
import { listGroups } from '../data/groups';
import type { Group } from '../data/groups';
import { listProjects } from '../data/projects';
import type { ProjectSummary } from '../data/projects';
import { NO_FILTERS, filterProjects, hasFilters } from '../data/projectFilter';
import type { ProjectFilters, StatusFilter } from '../data/projectFilter';
import { EmptyState, ErrorMessage, Loading } from '../ui/states';

/** Only show thumbnails that are real https addresses. */
function safeThumb(url: string | null): string | null {
  return url && url.startsWith('https://') ? url : null;
}

export function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProjectFilters>(NO_FILTERS);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const [p, g] = await Promise.all([listProjects(), listGroups()]);
      setProjects(p);
      setGroups(g);
      setStatus('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const groupName = useMemo(() => new Map(groups.map((g) => [g.id, g.name])), [groups]);
  const visible = useMemo(() => filterProjects(projects, filters), [projects, filters]);

  if (status === 'loading') return <Loading label="Loading projects…" />;
  if (status === 'error') {
    return (
      <ErrorMessage title="Could not load projects" onRetry={() => void load()}>
        {error}
      </ErrorMessage>
    );
  }

  return (
    <section>
      <h1>Projects</h1>
      <p className="muted">
        {projects.length} total · {projects.filter((p) => p.status === 'published').length}{' '}
        published
      </p>

      <div className="filters">
        <input
          type="search"
          aria-label="Search projects"
          placeholder="Search by title"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <select
          aria-label="Filter by category"
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        >
          <option value="all">All categories</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
          <option value="none">No category</option>
        </select>
        <select
          aria-label="Filter by status"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value as StatusFilter })}
        >
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        {hasFilters(filters) && (
          <button type="button" onClick={() => setFilters(NO_FILTERS)}>
            Clear
          </button>
        )}
      </div>

      {projects.length === 0 ? (
        <EmptyState title="No projects yet">Creating projects comes in step 4.3.</EmptyState>
      ) : visible.length === 0 ? (
        <EmptyState title="No projects match">Try clearing the filters.</EmptyState>
      ) : (
        <ul className="list">
          {visible.map((p) => {
            const thumb = safeThumb(p.thumbnail);
            return (
              <li key={p.id} className="row">
                {thumb ? (
                  <img className="thumb" src={thumb} alt="" loading="lazy" />
                ) : (
                  <span className="thumb thumb-empty" aria-hidden="true" />
                )}
                <span className="row-name">
                  {p.title}
                  <span className="muted row-sub">
                    {(p.group_id && groupName.get(p.group_id)) || 'No category'}
                    {p.year ? ` · ${p.year}` : ''} · {p.imageCount}{' '}
                    {p.imageCount === 1 ? 'image' : 'images'}
                  </span>
                </span>
                {p.featured && <span className="badge badge-featured">Featured</span>}
                <span className={`badge badge-${p.status === 'published' ? 'live' : 'draft'}`}>
                  {p.status === 'published' ? 'Published' : 'Draft'}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
