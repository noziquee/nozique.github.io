import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PROJECTS_CHANGED } from '../data/events';
import { listGroups } from '../data/groups';
import type { GroupWithCount } from '../data/groups';
import {
  deleteProject,
  listProjects,
  saveProjectOrder,
  setFeatured,
  setPublished,
} from '../data/projects';
import type { ProjectSummary } from '../data/projects';
import {
  NO_FILTERS,
  filterProjects,
  hasFilters,
  reorderWithinVisible,
} from '../data/projectFilter';
import type { ProjectFilters, StatusFilter } from '../data/projectFilter';
import { NEW_PROJECT_HREF, projectHref } from '../routing';
import { CategoryChips } from './CategoryChips';
import { ProjectCard, safeThumb } from './ProjectCard';
import { PublishControls } from '../ui/PublishControls';
import { EmptyState, ErrorMessage, Loading } from '../ui/states';

const VIEW_KEY = 'nozique.admin.projectsView';

function readView(): 'grid' | 'list' {
  try {
    return window.localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid';
  } catch {
    return 'grid';
  }
}

function saveView(view: 'grid' | 'list') {
  try {
    window.localStorage.setItem(VIEW_KEY, view);
  } catch {
    // Remembering the view is a convenience only.
  }
}

interface RowProps {
  project: ProjectSummary;
  categoryName: string;
  busy: boolean;
  onTogglePublished: () => void;
  onToggleFeatured: () => void;
  onDelete: () => void;
}

function ProjectRow({
  project: p,
  categoryName,
  busy,
  onTogglePublished,
  onToggleFeatured,
  onDelete,
}: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: p.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  const thumb = safeThumb(p.thumbnail);
  const imageLabel = `${p.imageCount} ${p.imageCount === 1 ? 'image' : 'images'}`;

  return (
    <li ref={setNodeRef} style={style} className="row">
      <button
        type="button"
        className="handle"
        aria-label={`Reorder ${p.title}`}
        title="Drag to reorder"
        disabled={busy}
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      {thumb ? (
        <img className="thumb" src={thumb} alt="" loading="lazy" />
      ) : (
        <span className="thumb thumb-empty" aria-hidden="true" />
      )}
      <span className="row-name">
        <a href={projectHref(p.id)}>{p.title}</a>
        <span className="muted row-sub">
          {categoryName}
          {p.year ? ` · ${p.year}` : ''} · {imageLabel}
        </span>
      </span>
      <PublishControls
        status={p.status}
        featured={p.featured}
        busy={busy}
        onTogglePublished={onTogglePublished}
        onToggleFeatured={onToggleFeatured}
      />
      <button type="button" className="danger" disabled={busy} onClick={onDelete}>
        Delete
      </button>
    </li>
  );
}

export function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [groups, setGroups] = useState<GroupWithCount[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProjectFilters>(NO_FILTERS);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'list'>(readView);
  const [menuId, setMenuId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const load = useCallback(async () => {
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

  useEffect(() => {
    const refresh = () => void load();
    window.addEventListener(PROJECTS_CHANGED, refresh);
    return () => window.removeEventListener(PROJECTS_CHANGED, refresh);
  }, [load]);

  useEffect(() => {
    if (!menuId) return;
    const close = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('.card-menu, .card-menu-btn')) setMenuId(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuId(null);
    };
    document.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuId]);

  const groupName = useMemo(() => new Map(groups.map((g) => [g.id, g.name])), [groups]);
  const visible = useMemo(() => filterProjects(projects, filters), [projects, filters]);

  /** Run a change, then refresh so the screen always matches the database. */
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setActionError(null);
    try {
      await action();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not save the change.');
    }
    await load();
    setBusy(false);
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const next = reorderWithinVisible(projects, visible, String(active.id), String(over.id));
    setProjects(next);
    void run(() => saveProjectOrder(next.map((p) => p.id)));
  }

  function onDelete(p: ProjectSummary) {
    setMenuId(null);
    const message =
      `Delete “${p.title}”? Its ${p.imageCount} ${p.imageCount === 1 ? 'image' : 'images'}` +
      ' and video files are deleted too. This cannot be undone.';
    if (window.confirm(message)) void run(() => deleteProject(p.id));
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
        published · Drag a project to change its order on your site.
      </p>

      <CategoryChips
        groups={groups}
        total={projects.length}
        uncategorized={projects.filter((p) => !p.group_id).length}
        active={filters.category}
        onSelect={(category) => setFilters({ ...filters, category })}
        onChanged={load}
      />

      <div className="filters">
        <input
          type="search"
          aria-label="Search projects"
          placeholder="Search by title"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
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
        <span className="view-switch" role="group" aria-label="View">
          {(['grid', 'list'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={view === mode}
              onClick={() => {
                setView(mode);
                saveView(mode);
              }}
            >
              {mode === 'grid' ? 'Grid' : 'List'}
            </button>
          ))}
        </span>
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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext
            items={visible.map((p) => p.id)}
            strategy={view === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}
          >
            <ul className={view === 'grid' ? 'card-grid' : 'list list-wide'}>
              {visible.map((p) => {
                const categoryName = (p.group_id && groupName.get(p.group_id)) || 'No category';
                const togglePublished = () => {
                  setMenuId(null);
                  void run(() => setPublished(p.id, p.status !== 'published'));
                };
                const toggleFeatured = () => {
                  setMenuId(null);
                  void run(() => setFeatured(p.id, !p.featured));
                };
                return view === 'grid' ? (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    categoryName={categoryName}
                    busy={busy}
                    menuOpen={menuId === p.id}
                    onToggleMenu={() => setMenuId(menuId === p.id ? null : p.id)}
                    onTogglePublished={togglePublished}
                    onToggleFeatured={toggleFeatured}
                    onDelete={() => onDelete(p)}
                  />
                ) : (
                  <ProjectRow
                    key={p.id}
                    project={p}
                    categoryName={categoryName}
                    busy={busy}
                    onTogglePublished={togglePublished}
                    onToggleFeatured={toggleFeatured}
                    onDelete={() => onDelete(p)}
                  />
                );
              })}
              {view === 'grid' && (
                <li className="card card-add">
                  <a href={NEW_PROJECT_HREF}>
                    <span className="card-add-plus">+</span>
                    <span>Add project</span>
                  </a>
                </li>
              )}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}
