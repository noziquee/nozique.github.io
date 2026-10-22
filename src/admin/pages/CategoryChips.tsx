import { useEffect, useState } from 'react';
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
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cleanGroupName, isDuplicateName, nextSortOrder } from '../data/groupRules';
import { createGroup, deleteGroup, renameGroup, saveGroupOrder } from '../data/groups';
import type { GroupWithCount } from '../data/groups';

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

interface ChipProps {
  group: GroupWithCount;
  active: boolean;
  menuOpen: boolean;
  disabled: boolean;
  onSelect: () => void;
  onToggleMenu: () => void;
  onRename: () => void;
  onDelete: () => void;
}

function GroupChip({
  group,
  active,
  menuOpen,
  disabled,
  onSelect,
  onToggleMenu,
  onRename,
  onDelete,
}: ChipProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: group.id,
    disabled,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`chip${active ? ' active' : ''}`}
      {...attributes}
      {...listeners}
    >
      <button type="button" className="chip-label" aria-pressed={active} onClick={onSelect}>
        {group.name} <span className="chip-count">{group.projectCount}</span>
      </button>
      <button
        type="button"
        className="chip-menu-btn"
        aria-label={`${group.name} options`}
        aria-expanded={menuOpen}
        disabled={disabled}
        onClick={onToggleMenu}
      >
        ⋮
      </button>
      {menuOpen && (
        <div className="chip-menu" role="menu">
          <button type="button" role="menuitem" onClick={onRename}>
            Rename
          </button>
          <button type="button" role="menuitem" className="danger" onClick={onDelete}>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

interface NameFormProps {
  initial: string;
  submitLabel: string;
  placeholder: string;
  busy: boolean;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

function NameForm({ initial, submitLabel, placeholder, busy, onSubmit, onCancel }: NameFormProps) {
  const [value, setValue] = useState(initial);
  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit(value);
  }
  return (
    <form className="chip-form" onSubmit={submit}>
      <input
        aria-label="Category name"
        placeholder={placeholder}
        value={value}
        maxLength={80}
        autoFocus
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onCancel();
        }}
      />
      <button type="submit" className="primary" disabled={busy}>
        {submitLabel}
      </button>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
    </form>
  );
}

interface Props {
  groups: GroupWithCount[];
  total: number;
  uncategorized: number;
  /** 'all', 'none' (no category) or a category id. */
  active: string;
  onSelect: (id: string) => void;
  /** Called after any change so the page can reload its data. */
  onChanged: () => Promise<void>;
}

/** The category filter bar: pick a category, and add, rename, delete or reorder them in place. */
export function CategoryChips({
  groups,
  total,
  uncategorized,
  active,
  onSelect,
  onChanged,
}: Props) {
  const [ordered, setOrdered] = useState(groups);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOrdered(groups);
  }, [groups]);

  useEffect(() => {
    if (!menuId) return;
    const close = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('.chip-menu, .chip-menu-btn')) setMenuId(null);
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /** Run a change, then reload. Returns true when it worked. */
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
    await onChanged();
    setBusy(false);
    return ok;
  }

  async function onAdd(raw: string) {
    const check = cleanGroupName(raw);
    if (!check.ok) return setError(check.error);
    if (isDuplicateName(check.name, ordered)) {
      return setError('A category with that name already exists.');
    }
    if (await run(() => createGroup(check.name, nextSortOrder(ordered)))) setAdding(false);
  }

  async function onRename(group: GroupWithCount, raw: string) {
    const check = cleanGroupName(raw);
    if (!check.ok) return setError(check.error);
    if (isDuplicateName(check.name, ordered, group.id)) {
      return setError('A category with that name already exists.');
    }
    if (check.name === group.name) return setRenamingId(null);
    if (await run(() => renameGroup(group.id, check.name))) setRenamingId(null);
  }

  async function onDelete(group: GroupWithCount) {
    setMenuId(null);
    const note =
      group.projectCount > 0
        ? ` Its ${group.projectCount} project(s) will stay but have no category.`
        : '';
    if (!window.confirm(`Delete the category "${group.name}"?${note}`)) return;
    if (await run(() => deleteGroup(group.id))) {
      if (active === group.id) onSelect('all');
    }
  }

  function onDragEnd(event: DragEndEvent) {
    const { active: dragged, over } = event;
    if (!over || dragged.id === over.id) return;
    const from = ordered.findIndex((group) => group.id === dragged.id);
    const to = ordered.findIndex((group) => group.id === over.id);
    if (from < 0 || to < 0) return;
    const next = arrayMove(ordered, from, to);
    setOrdered(next);
    void run(() => saveGroupOrder(next.map((group) => group.id)));
  }

  const editing = renamingId !== null || adding;

  return (
    <div className="chip-bar-wrap">
      <div className="chip-bar" role="group" aria-label="Categories">
        <div className={`chip${active === 'all' ? ' active' : ''}`}>
          <button
            type="button"
            className="chip-label"
            aria-pressed={active === 'all'}
            onClick={() => onSelect('all')}
          >
            All <span className="chip-count">{total}</span>
          </button>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext
            items={ordered.map((group) => group.id)}
            strategy={horizontalListSortingStrategy}
          >
            {ordered.map((group) =>
              renamingId === group.id ? (
                <NameForm
                  key={group.id}
                  initial={group.name}
                  submitLabel="Save"
                  placeholder="Category name"
                  busy={busy}
                  onSubmit={(name) => void onRename(group, name)}
                  onCancel={() => {
                    setRenamingId(null);
                    setError(null);
                  }}
                />
              ) : (
                <GroupChip
                  key={group.id}
                  group={group}
                  active={active === group.id}
                  menuOpen={menuId === group.id}
                  disabled={busy || editing}
                  onSelect={() => onSelect(group.id)}
                  onToggleMenu={() => setMenuId(menuId === group.id ? null : group.id)}
                  onRename={() => {
                    setMenuId(null);
                    setAdding(false);
                    setError(null);
                    setRenamingId(group.id);
                  }}
                  onDelete={() => void onDelete(group)}
                />
              ),
            )}
          </SortableContext>
        </DndContext>

        {(uncategorized > 0 || active === 'none') && (
          <div className={`chip${active === 'none' ? ' active' : ''}`}>
            <button
              type="button"
              className="chip-label"
              aria-pressed={active === 'none'}
              onClick={() => onSelect('none')}
            >
              No category <span className="chip-count">{uncategorized}</span>
            </button>
          </div>
        )}

        {adding ? (
          <NameForm
            initial=""
            submitLabel="Create"
            placeholder="Category name"
            busy={busy}
            onSubmit={(name) => void onAdd(name)}
            onCancel={() => {
              setAdding(false);
              setError(null);
            }}
          />
        ) : (
          <button
            type="button"
            className="chip chip-add"
            disabled={busy || renamingId !== null}
            onClick={() => {
              setError(null);
              setAdding(true);
            }}
          >
            + Add category
          </button>
        )}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
