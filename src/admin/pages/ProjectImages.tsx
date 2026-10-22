import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
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
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { addImage, listImages, removeImage, saveImageOrder, updateImageText } from '../data/images';
import type { ProjectImage } from '../data/images';
import { reorder, validateImageFile } from '../data/imageRules';
import { ErrorMessage, Loading } from '../ui/states';

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

function safeSrc(url: string): string | null {
  return url.startsWith('https://') ? url : null;
}

interface ThumbProps {
  image: ProjectImage;
  position: number;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

/** One square thumbnail. The first one is the project's thumbnail on the site. */
function ImageThumb({ image, position, selected, disabled, onSelect, onRemove }: ThumbProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
    disabled,
  });
  const src = safeSrc(image.url);
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`thumb-tile${selected ? ' selected' : ''}`}
      {...attributes}
      {...listeners}
      role="listitem"
    >
      <button
        type="button"
        className="thumb-tile-btn"
        aria-label={`Image ${position + 1}${position === 0 ? ' (thumbnail)' : ''}: edit text`}
        aria-pressed={selected}
        onClick={onSelect}
      >
        {src ? <img src={src} alt="" loading="lazy" draggable={false} /> : null}
      </button>
      {position === 0 && <span className="thumb-badge">Thumbnail</span>}
      <button
        type="button"
        className="thumb-remove"
        aria-label={`Remove image ${position + 1}`}
        title="Remove"
        disabled={disabled}
        onClick={onRemove}
      >
        ×
      </button>
    </li>
  );
}

interface DetailsProps {
  image: ProjectImage;
  onSaveText: (id: string, alt: string, caption: string) => void;
}

/** Alt text and caption for the selected image. Saved when you click out of a field. */
function ImageDetails({ image, onSaveText }: DetailsProps) {
  const [alt, setAlt] = useState(image.alt ?? '');
  const [caption, setCaption] = useState(image.caption ?? '');

  function saveIfChanged() {
    if (alt !== (image.alt ?? '') || caption !== (image.caption ?? '')) {
      onSaveText(image.id, alt, caption);
    }
  }

  return (
    <div className="image-details">
      <label htmlFor="img-alt">Alt text (describe the image)</label>
      <input
        id="img-alt"
        maxLength={200}
        value={alt}
        onChange={(e) => setAlt(e.target.value)}
        onBlur={saveIfChanged}
      />
      <label htmlFor="img-caption">Caption (optional)</label>
      <input
        id="img-caption"
        maxLength={300}
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        onBlur={saveIfChanged}
      />
    </div>
  );
}

export function ProjectImages({ postId }: { postId: string }) {
  const [images, setImages] = useState<ProjectImage[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const load = useCallback(async () => {
    try {
      setImages(await listImages(postId));
      setState('ready');
    } catch (error) {
      setLoadError(messageOf(error));
      setState('error');
    }
  }, [postId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = images.find((image) => image.id === selectedId) ?? null;

  async function upload(files: File[]) {
    if (files.length === 0 || busy) return;
    const found: string[] = [];
    const valid: File[] = [];
    for (const file of files) {
      const problem = validateImageFile(file);
      if (problem) found.push(problem);
      else valid.push(file);
    }
    setBusy(true);
    let order = images.reduce((max, image) => Math.max(max, image.sort_order), -1) + 1;
    for (const [index, file] of valid.entries()) {
      setProgress(`Uploading ${index + 1} of ${valid.length}: ${file.name}`);
      try {
        await addImage(postId, file, order);
        order += 1;
      } catch (error) {
        found.push(`${file.name}: ${messageOf(error)}`);
      }
    }
    setProblems(found);
    setProgress(null);
    await load();
    setBusy(false);
  }

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    void upload(files);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragOver(false);
    void upload(Array.from(event.dataTransfer.files));
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const next = reorder(images, String(active.id), String(over.id));
    setImages(next);
    setBusy(true);
    try {
      await saveImageOrder(next.map((image) => image.id));
      setProblems([]);
    } catch (error) {
      setProblems([messageOf(error)]);
    }
    await load();
    setBusy(false);
  }

  async function onSaveText(id: string, alt: string, caption: string) {
    try {
      await updateImageText(id, { alt, caption });
      setImages((list) =>
        list.map((image) =>
          image.id === id
            ? { ...image, alt: alt.trim() || null, caption: caption.trim() || null }
            : image,
        ),
      );
    } catch (error) {
      setProblems([messageOf(error)]);
    }
  }

  async function onRemove(image: ProjectImage) {
    if (!window.confirm('Remove this image from the project? The file is deleted too.')) return;
    setBusy(true);
    try {
      await removeImage(image);
      setProblems([]);
    } catch (error) {
      setProblems([messageOf(error)]);
    }
    await load();
    setBusy(false);
  }

  return (
    <section className="images">
      <h2>Images</h2>
      <p className="muted">
        The first image is the project’s thumbnail. Drag images to reorder them. Large images are
        resized and compressed automatically.
      </p>

      <div
        className={`dropzone${dragOver ? ' is-over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={onPick}
        />
        <button
          type="button"
          className="primary"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          + Add files
        </button>
        <span className="muted">or drop them here (JPG, PNG, WebP)</span>
      </div>

      {progress && (
        <p className="notice" role="status">
          {progress}
        </p>
      )}
      {problems.length > 0 && (
        <ul className="error" role="alert">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}

      {state === 'loading' && <Loading label="Loading images…" />}
      {state === 'error' && (
        <ErrorMessage title="Could not load images" onRetry={() => void load()}>
          {loadError}
        </ErrorMessage>
      )}
      {state === 'ready' && images.length === 0 && (
        <p className="muted">No images yet. Without one, the site shows a placeholder.</p>
      )}
      {state === 'ready' && images.length > 0 && (
        <>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={images.map((image) => image.id)} strategy={rectSortingStrategy}>
              <ul className="thumb-grid">
                {images.map((image, index) => (
                  <ImageThumb
                    key={image.id}
                    image={image}
                    position={index}
                    selected={image.id === selectedId}
                    disabled={busy}
                    onSelect={() => setSelectedId(image.id === selectedId ? null : image.id)}
                    onRemove={() => void onRemove(image)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
          {selected ? (
            <ImageDetails
              key={selected.id}
              image={selected}
              onSaveText={(id, alt, caption) => void onSaveText(id, alt, caption)}
            />
          ) : (
            <p className="muted">Click an image to edit its alt text and caption.</p>
          )}
        </>
      )}
    </section>
  );
}
