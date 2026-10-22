import { useState } from 'react';
import type { FormEvent } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Category } from './api';
import { validateCategoryName } from './logic';

interface Props {
  item: Category;
  all: readonly Category[];
  busy: boolean;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function CategoryRow({ item, all, busy, onRename, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  async function save(event: FormEvent) {
    event.preventDefault();
    const problem = validateCategoryName(name, all, item.id);
    if (problem) {
      setError(problem);
      return;
    }
    await onRename(item.id, name);
    setEditing(false);
    setError(null);
  }

  function cancelEdit() {
    setEditing(false);
    setName(item.name);
    setError(null);
  }

  return (
    <li ref={setNodeRef} style={style} className="row">
      <button
        type="button"
        className="handle"
        aria-label={`Drag to reorder ${item.name}`}
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>

      {editing ? (
        <form className="row-main" onSubmit={save} noValidate>
          <input
            aria-label="Category name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
          />
          {error && <span className="error">{error}</span>}
          <button type="submit" className="primary" disabled={busy}>
            Save
          </button>
          <button type="button" onClick={cancelEdit}>
            Cancel
          </button>
        </form>
      ) : (
        <div className="row-main">
          <strong>{item.name}</strong>
          <span className="muted">
            {item.projectCount} {item.projectCount === 1 ? 'project' : 'projects'}
          </span>
          {confirming ? (
            <>
              <span className="error">
                {item.projectCount > 0
                  ? `Its ${item.projectCount} project(s) will become uncategorized.`
                  : 'Delete this category?'}
              </span>
              <button type="button" className="danger" disabled={busy} onClick={() => onDelete(item.id)}>
                Delete
              </button>
              <button type="button" onClick={() => setConfirming(false)}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button type="button" disabled={busy} onClick={() => setEditing(true)}>
                Rename
              </button>
              <button type="button" disabled={busy} onClick={() => setConfirming(true)}>
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </li>
  );
}
