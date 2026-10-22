import { useCallback, useEffect, useMemo, useState } from 'react';
import { listGroups } from '../data/groups';
import type { Group } from '../data/groups';
import { listProjects, setFeatured, setPublished } from '../data/projects';
import type { ProjectSummary } from '../data/projects';
import { NO_FILTERS, filterProjects, hasFilters } from '../data/projectFilter';
import type { ProjectFilters, StatusFilter } from '../data/projectFilter';
import { NEW_PROJECT_HREF, projectHref } from '../routing';
import { PublishControls } from '../ui/PublishControls';
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
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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

  async function change(
    id: string,
    patch: Partial<Pick<ProjectSummary, 'status' | 'featured'>>,
    save: () => Promise<void>,
  ) {
    setBusyId(id);
    setActionError(null);
    try {
      await save();
      setProjects((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not save the change.');
    }
    setBusyId(null);
  }

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
      <div className="page-head">
        <h1>Projects</h1>
        <a className="button primary" href={NEW_PROJECT_HREF}>
          New project
        </a>
      </div>
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

      {actionError && (
        <p className="error" role="alert">
          {actionError}
        </p>
      )}

      {projects.length === 0 ? (
        <EmptyState title="No projects yet">
          Click “New project” to add your first one.
        </EmptyState>
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
                  <a href={projectHref(p.id)}>{p.title}</a>
                  <span className="muted row-sub">
                    {(p.group_id && groupName.get(p.group_id)) || 'No category'}
                    {p.year ? ` · ${p.year}` : ''} · {p.imageCount}{' '}
                    {p.imageCount === 1 ? 'image' : 'images'}
                  </span>
                </span>
                <PublishControls
                  status={p.status}
                  featured={p.featured}
                  busy={busyId === p.id}
                  onTogglePublished={() => {
                    const publish = p.status !== 'published';
                    void change(p.id, { status: publish ? 'published' : 'draft' }, () =>
                      setPublished(p.id, publish),
                    );
                  }}
                  onToggleFeatured={() =>
                    void change(p.id, { featured: !p.featured }, () =>
                      setFeatured(p.id, !p.featured),
                    )
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
