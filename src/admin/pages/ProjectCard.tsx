import { useEffect, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ProjectSummary } from '../data/projects';
import { projectHref } from '../routing';

/** Only show thumbnails that are real https addresses. */
export function safeThumb(url: string | null): string | null {
  return url && url.startsWith('https://') ? url : null;
}

interface Props {
  project: ProjectSummary;
  categoryName: string;
  busy: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onTogglePublished: () => void;
  onToggleFeatured: () => void;
  onDelete: () => void;
}

/** One square project card: thumbnail, title, category, badges and a ⋮ menu. */
export function ProjectCard({
  project: p,
  categoryName,
  busy,
  menuOpen,
  onToggleMenu,
  onTogglePublished,
  onToggleFeatured,
  onDelete,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: p.id,
    disabled: busy,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const thumb = safeThumb(p.thumbnail);
  const live = p.status === 'published';
  const imageLabel = `${p.imageCount} ${p.imageCount === 1 ? 'image' : 'images'}`;

  // A drag that ends over the link would otherwise also count as a click and open the project.
  const dragged = useRef(false);
  useEffect(() => {
    if (isDragging) {
      dragged.current = true;
      return;
    }
    const timer = setTimeout(() => {
      dragged.current = false;
    }, 0);
    return () => clearTimeout(timer);
  }, [isDragging]);

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="card"
      {...attributes}
      {...listeners}
      role="listitem"
    >
      <a
        className="card-link"
        href={projectHref(p.id)}
        draggable={false}
        onClick={(event) => {
          if (dragged.current) event.preventDefault();
        }}
      >
        <span className="card-media">
          {thumb ? (
            <img src={thumb} alt="" loading="lazy" draggable={false} />
          ) : (
            <span className="card-noimage">No image</span>
          )}
        </span>
        <span className="card-info">
          <span className="card-title">{p.title}</span>
          <span className="muted card-sub">
            {categoryName} · {imageLabel}
          </span>
        </span>
      </a>

      <span className="card-badges">
        {!live && <span className="card-badge">Draft</span>}
        {p.featured && <span className="card-badge card-badge-featured">★ Featured</span>}
      </span>

      <button
        type="button"
        className="card-menu-btn"
        aria-label={`${p.title} options`}
        aria-expanded={menuOpen}
        disabled={busy}
        onClick={onToggleMenu}
      >
        ⋮
      </button>
      {menuOpen && (
        <div className="card-menu" role="menu">
          <a role="menuitem" href={projectHref(p.id)}>
            Edit
          </a>
          <button type="button" role="menuitem" onClick={onTogglePublished}>
            {live ? 'Unpublish (make draft)' : 'Publish'}
          </button>
          <button type="button" role="menuitem" onClick={onToggleFeatured}>
            {p.featured ? 'Remove from featured' : 'Feature on home page'}
          </button>
          <button type="button" role="menuitem" className="danger" onClick={onDelete}>
            Delete
          </button>
        </div>
      )}
    </li>
  );
}
