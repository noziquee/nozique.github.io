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
import type { Design, DesignElement } from '../../shared/design';
import { moveElementOnto } from './designOps';
import { applyField } from './fields';

interface RowProps {
  element: DesignElement;
  selected: boolean;
  onSelect: () => void;
  onToggle: (key: 'hidden' | 'locked') => void;
}

function LayerRow({ element, selected, onSelect, onToggle }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: element.id,
  });
  const label = element.name ?? element.id;
  const classes = ['layer-row', selected ? 'selected' : '', element.hidden ? 'dim' : ''];
  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className={classes.filter(Boolean).join(' ')}
    >
      <button
        type="button"
        className="drag-handle"
        aria-label={`Drag to reorder ${label}`}
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
      <button type="button" className="layer-name" aria-pressed={selected} onClick={onSelect}>
        {label} <span className="muted">{element.type}</span>
      </button>
      <button
        type="button"
        className="layer-toggle"
        aria-pressed={element.hidden}
        aria-label={element.hidden ? `Show ${label}` : `Hide ${label}`}
        title={element.hidden ? 'Hidden: click to show' : 'Visible: click to hide'}
        onClick={() => onToggle('hidden')}
      >
        {element.hidden ? '🚫' : '👁'}
      </button>
      <button
        type="button"
        className="layer-toggle"
        aria-pressed={element.locked}
        aria-label={element.locked ? `Unlock ${label}` : `Lock ${label}`}
        title={element.locked ? 'Locked: click to unlock' : 'Unlocked: click to lock'}
        onClick={() => onToggle('locked')}
      >
        {element.locked ? '🔒' : '🔓'}
      </button>
    </li>
  );
}

interface Props {
  design: Design;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (design: Design) => void;
}

/** All elements of the section, the one on top first. Select, hide, lock and drag to reorder. */
export function LayersPanel({ design, selectedId, onSelect, onChange }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  // The list in the design runs bottom to top; people expect the top layer first.
  const top = [...design.layouts.desktop.elements].reverse();

  function onDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    onChange(moveElementOnto(design, String(event.active.id), String(event.over.id)));
  }

  function toggle(element: DesignElement, key: 'hidden' | 'locked') {
    const result = applyField(design, element.id, { key }, !element[key]);
    if (result.ok) onChange(result.design);
  }

  return (
    <aside className="layers-panel" aria-label="Layers">
      <h2>Layers</h2>
      {top.length === 0 ? (
        <p className="muted">No elements yet. Add one from the left.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={top.map((e) => e.id)} strategy={verticalListSortingStrategy}>
            <ul className="layer-list">
              {top.map((element) => (
                <LayerRow
                  key={element.id}
                  element={element}
                  selected={element.id === selectedId}
                  onSelect={() => onSelect(element.id)}
                  onToggle={(key) => toggle(element, key)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </aside>
  );
}
