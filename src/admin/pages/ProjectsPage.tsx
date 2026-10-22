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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
import { NO_FILTERS, filterProjects, hasFilters } from '../data/projectFilter';
import type { ProjectFilters, StatusFilter } from '../data/projectFilter';
import { reorder } from '../data/imageRules';
import { NEW_PROJECT_HREF, projectHref } from '../routing';
import { CategoryChips } from './CategoryChips';
import { PublishControls } from '../ui/PublishControls';
import { EmptyState, ErrorMessage, Loading } from '../ui/states';

/** Only show thumbnails that are real https addresses. */
function safeThumb(url: string | null): string | null {
  return url && url.startsWith('https://') ? url : null;
}

interface RowProps {
  project: ProjectSummary;
  categoryName: string;
  busy: boolean;
  canReorder: boolean;
  onTogglePublished: () => void;
  onToggleFeatured: () => void;
  onDelete: () => void;
}

function ProjectRow({
  project: p,
  categoryName,
  busy,
  canReorder,
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
        title={canReorder ? 'Drag to reorder' : 'Clear the filters to reorder'}
        disabled={busy || !canReorder}
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

  const groupName = useMemo(() => new Map(groups.map((g) => [g.id, g.name])), [groups]);
  const visible = useMemo(() => filterProjects(projects, filters), [projects, filters]);
  const canReorder = !hasFilters(filters);

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
    if (!over || active.id === over.id || !canReorder) return;
    const next = reorder(projects, String(active.id), String(over.id));
    setProjects(next);
    void run(() => saveProjectOrder(next.map((p) => p.id)));
  }

  function onDelete(p: ProjectSummary) {
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
        published · Drag the handle to change the order on your site.
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
          <SortableContext items={visible.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <ul className="list list-wide">
              {visible.map((p) => (
                <ProjectRow
                  key={p.id}
                  project={p}
                  categoryName={(p.group_id && groupName.get(p.group_id)) || 'No category'}
                  busy={busy}
                  canReorder={canReorder}
                  onTogglePublished={() => {
                    const publish = p.status !== 'published';
                    void run(() => setPublished(p.id, publish));
                  }}
                  onToggleFeatured={() => void run(() => setFeatured(p.id, !p.featured))}
                  onDelete={() => onDelete(p)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}
