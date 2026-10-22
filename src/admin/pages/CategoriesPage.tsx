import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
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
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createGroup, deleteGroup, listGroups, renameGroup, saveGroupOrder } from '../data/groups';
import type { GroupWithCount } from '../data/groups';
import { cleanGroupName, isDuplicateName, nextSortOrder } from '../data/groupRules';
import { EmptyState, ErrorMessage, Loading } from '../ui/states';

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

interface RowProps {
  group: GroupWithCount;
  editing: boolean;
  disabled: boolean;
  onStartRename: () => void;
  onCancelRename: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}

function CategoryRow({
  group,
  editing,
  disabled,
  onStartRename,
  onCancelRename,
  onRename,
  onDelete,
}: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: group.id,
  });
  const [draft, setDraft] = useState(group.name);
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  function submit(event: FormEvent) {
    event.preventDefault();
    onRename(draft);
  }

  return (
    <li ref={setNodeRef} style={style} className="row">
      <button
        type="button"
        className="handle"
        aria-label={`Reorder ${group.name}`}
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      {editing ? (
        <form className="row-edit" onSubmit={submit}>
          <input
            aria-label="Category name"
            value={draft}
            maxLength={80}
            autoFocus
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit" className="primary" disabled={disabled}>
            Save
          </button>
          <button type="button" onClick={onCancelRename}>
            Cancel
          </button>
        </form>
      ) : (
        <>
          <span className="row-name">{group.name}</span>
          <span className="muted row-count">
            {group.projectCount} {group.projectCount === 1 ? 'project' : 'projects'}
          </span>
          <button type="button" disabled={disabled} onClick={onStartRename}>
            Rename
          </button>
          <button type="button" className="danger" disabled={disabled} onClick={onDelete}>
            Delete
          </button>
        </>
      )}
    </li>
  );
}

export function CategoriesPage() {
  const [groups, setGroups] = useState<GroupWithCount[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const load = useCallback(async () => {
    try {
      setGroups(await listGroups());
      setError(null);
    } catch (problem) {
      setError(messageOf(problem));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Run a change, then reload so the screen always matches the database. */
  async function run(action: () => Promise<void>): Promise<boolean> {
    setBusy(true);
    setError(null);
    let ok = true;
    try {
      await action();
    } catch (problem) {
      setError(messageOf(problem));
      ok = false;
    }
    await load();
    setBusy(false);
    return ok;
  }

  async function onAdd(event: FormEvent) {
    event.preventDefault();
    const check = cleanGroupName(newName);
    if (!check.ok) return setError(check.error);
    if (isDuplicateName(check.name, groups ?? [])) {
      return setError('A category with that name already exists.');
    }
    const ok = await run(() => createGroup(check.name, nextSortOrder(groups ?? [])));
    if (ok) setNewName('');
  }

  async function onRename(group: GroupWithCount, raw: string) {
    const check = cleanGroupName(raw);
    if (!check.ok) return setError(check.error);
    if (isDuplicateName(check.name, groups ?? [], group.id)) {
      return setError('A category with that name already exists.');
    }
    if (check.name === group.name) return setEditingId(null);
    const ok = await run(() => renameGroup(group.id, check.name));
    if (ok) setEditingId(null);
  }

  async function onDelete(group: GroupWithCount) {
    const note =
      group.projectCount > 0
        ? ` Its ${group.projectCount} project(s) will stay but have no category.`
        : '';
    if (!window.confirm(`Delete the category "${group.name}"?${note}`)) return;
    await run(() => deleteGroup(group.id));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !groups) return;
    const from = groups.findIndex((group) => group.id === active.id);
    const to = groups.findIndex((group) => group.id === over.id);
    if (from < 0 || to < 0) return;
    const next = arrayMove(groups, from, to);
    setGroups(next);
    void run(() => saveGroupOrder(next.map((group) => group.id)));
  }

  return (
    <section>
      <h1>Categories</h1>
      <p className="muted">
        The categories visitors can filter by. Drag the handle to change their order on the site.
      </p>

      <form className="add-row" onSubmit={(event) => void onAdd(event)}>
        <input
          aria-label="New category name"
          placeholder="New category name"
          value={newName}
          maxLength={80}
          onChange={(event) => setNewName(event.target.value)}
        />
        <button type="submit" className="primary" disabled={busy}>
          Add category
        </button>
      </form>

      {error && groups && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {!groups && !error && <Loading />}
      {!groups && error && <ErrorMessage onRetry={() => void load()}>{error}</ErrorMessage>}
      {groups && groups.length === 0 && (
        <EmptyState title="No categories yet">Add your first category above.</EmptyState>
      )}
      {groups && groups.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext
            items={groups.map((group) => group.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="list">
              {groups.map((group) => (
                <CategoryRow
                  key={group.id}
                  group={group}
                  editing={editingId === group.id}
                  disabled={busy}
                  onStartRename={() => setEditingId(group.id)}
                  onCancelRename={() => setEditingId(null)}
                  onRename={(name) => void onRename(group, name)}
                  onDelete={() => void onDelete(group)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}
