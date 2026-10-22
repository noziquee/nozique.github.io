interface Props {
  status: string;
  featured: boolean;
  busy: boolean;
  onTogglePublished: () => void;
  onToggleFeatured: () => void;
}

/** Two small toggle buttons: Published / Draft, and Featured. */
export function PublishControls({
  status,
  featured,
  busy,
  onTogglePublished,
  onToggleFeatured,
}: Props) {
  const live = status === 'published';
  return (
    <span className="publish-controls">
      <button
        type="button"
        className={`badge badge-btn badge-${live ? 'live' : 'draft'}`}
        aria-pressed={live}
        disabled={busy}
        title={live ? 'Visible on your site. Click to hide it.' : 'Hidden. Click to publish it.'}
        onClick={onTogglePublished}
      >
        {live ? 'Published' : 'Draft'}
      </button>
      <button
        type="button"
        className={`badge badge-btn${featured ? ' badge-featured' : ''}`}
        aria-pressed={featured}
        disabled={busy}
        title={featured ? 'Shown on the home page. Click to remove.' : 'Click to show on home.'}
        onClick={onToggleFeatured}
      >
        {featured ? '★ Featured' : '☆ Feature'}
      </button>
    </span>
  );
}
