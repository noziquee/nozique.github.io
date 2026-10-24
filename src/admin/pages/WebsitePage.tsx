import { useCallback, useEffect, useState } from 'react';
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
import { changedOrders, isDesignable, isLiveSection, reorderSections } from '../data/sectionRules';
import { sectionHref } from '../routing';
import { listSections, saveSectionOrder, setSectionEnabled } from '../data/siteSections';
import type { SectionSummary } from '../data/siteSections';
import { EmptyState, ErrorMessage, Loading } from '../ui/states';

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

interface RowProps {
  section: SectionSummary;
  busy: boolean;
  onToggle: (enabled: boolean) => void;
}

function SectionRow({ section, busy, onToggle }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.section_key,
    disabled: !section.reorderable || busy,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const classes = [
    'section-row',
    section.enabled ? '' : 'off',
    section.reorderable ? '' : 'pinned',
  ];
  return (
    <li ref={setNodeRef} style={style} className={classes.filter(Boolean).join(' ')}>
      {section.reorderable ? (
        <button
          type="button"
          className="drag-handle"
          aria-label={`Drag to move ${section.name}`}
          {...attributes}
          {...listeners}
        >
          ⋮⋮
        </button>
      ) : (
        <span className="drag-handle pinned-mark" aria-hidden="true">
          📌
        </span>
      )}
      <div className="section-main">
        <strong>{section.name}</strong>
        {!section.reorderable && <span className="badge">Pinned</span>}
        {section.hasDraft && <span className="badge badge-draft">Unpublished changes</span>}
        {!isLiveSection(section.section_key) && (
          <span className="muted row-sub">Not connected to the public site yet</span>
        )}
      </div>
      <label className="switch">
        <input
          type="checkbox"
          role="switch"
          checked={section.enabled}
          disabled={!section.reorderable || busy}
          aria-label={`Show ${section.name} on the site`}
          onChange={(event) => onToggle(event.target.checked)}
        />
        <span>{section.enabled ? 'Shown' : 'Hidden'}</span>
      </label>
      {isDesignable(section.section_key) ? (
        <a className="button" href={sectionHref(section.section_key)}>
          Edit
        </a>
      ) : (
        <button type="button" disabled title="This section is built in; visual editing comes later">
          Edit
        </button>
      )}
    </li>
  );
}

export function WebsitePage() {
  const [sections, setSections] = useState<SectionSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setSections(await listSections());
      setLoadError(null);
    } catch (problem) {
      setLoadError(messageOf(problem));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /** Run a save. If it fails, say so and reload what the database really has. */
  async function save(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (problem) {
      setError(messageOf(problem));
      await load();
    }
    setBusy(false);
  }

  async function onToggle(key: string, enabled: boolean) {
    setSections((current) =>
      current ? current.map((s) => (s.section_key === key ? { ...s, enabled } : s)) : current,
    );
    await save(() => setSectionEnabled(key, enabled));
  }

  async function onDragEnd(event: DragEndEvent) {
    if (!sections || !event.over || event.active.id === event.over.id) return;
    const next = reorderSections(sections, String(event.active.id), String(event.over.id));
    const updates = changedOrders(sections, next);
    if (updates.length === 0) return;
    setSections(next.map((section, index) => ({ ...section, sort_order: index })));
    await save(() => saveSectionOrder(updates));
  }

  if (loadError) {
    return (
      <section>
        <h1>Website</h1>
        <ErrorMessage onRetry={() => void load()}>{loadError}</ErrorMessage>
      </section>
    );
  }
  if (!sections) {
    return (
      <section>
        <h1>Website</h1>
        <Loading />
      </section>
    );
  }

  return (
    <section>
      <h1>Website</h1>
      <p className="muted">
        The sections of your home page, top to bottom. Drag to reorder; the header and footer stay
        where they are.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {sections.length === 0 ? (
        <EmptyState title="No sections found" />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(event) => void onDragEnd(event)}
        >
          <SortableContext
            items={sections.filter((s) => s.reorderable).map((s) => s.section_key)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="section-list">
              {sections.map((section) => (
                <SectionRow
                  key={section.section_key}
                  section={section}
                  busy={busy}
                  onToggle={(enabled) => void onToggle(section.section_key, enabled)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}
