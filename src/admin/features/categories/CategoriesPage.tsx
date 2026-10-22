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
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { EmptyState, ErrorMessage, Loading } from '../../ui/states';
import {
  createCategory,
  deleteCategory,
  listCategories,
  renameCategory,
  saveCategoryOrder,
} from './api';
import type { Category } from './api';
import { CategoryRow } from './CategoryRow';
import { moveById, nextSortOrder, validateCategoryName } from './logic';

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNameError, setNewNameError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const load = useCallback(async () => {
    try {
      setItems(await listCategories());
      setStatus('ready');
    } catch (error) {
      setLoadError(messageOf(error));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Run a change, then refresh the list. Shows any problem above the list. */
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setActionError(null);
    try {
      await action();
    } catch (error) {
      setActionError(messageOf(error));
    } finally {
      await load();
      setBusy(false);
    }
  }

  async function onAdd(event: FormEvent) {
    event.preventDefault();
    const problem = validateCategoryName(newName, items);
    if (problem) {
      setNewNameError(problem);
      return;
    }
    setNewNameError(null);
    await run(() => createCategory(newName, nextSortOrder(items)));
    setNewName('');
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const next = moveById(items, String(active.id), String(over.id));
    setItems(next);
    void run(() => saveCategoryOrder(next.map((item) => item.id)));
  }

  if (status === 'loading') return <Loading label="Loading categories…" />;
  if (status === 'error') {
    return (
      <ErrorMessage title="Could not load categories" onRetry={() => void load()}>
        {loadError}
      </ErrorMessage>
    );
  }

  return (
    <section>
      <h1>Categories</h1>
      <p className="muted">
        These are the filters on your Work page and the cards in the home carousel. Drag to
        reorder.
      </p>

      <form className="add-row" onSubmit={onAdd} noValidate>
        <input
          aria-label="New category name"
          placeholder="New category name"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
        />
        <button type="submit" className="primary" disabled={busy}>
          Add category
        </button>
      </form>
      {newNameError && <p className="error">{newNameError}</p>}
      {actionError && (
        <p className="error" role="alert">
          {actionError}
        </p>
      )}

      {items.length === 0 ? (
        <EmptyState title="No categories yet">Add your first category above.</EmptyState>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext
            items={items.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="rows">
              {items.map((item) => (
                <CategoryRow
                  key={item.id}
                  item={item}
                  all={items}
                  busy={busy}
                  onRename={(id, name) => run(() => renameCategory(id, name))}
                  onDelete={(id) => run(() => deleteCategory(id))}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}
