import type { ReactNode } from 'react';

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <p className="state" role="status">
      {label}
    </p>
  );
}

export function ErrorMessage({
  title = 'Something went wrong',
  children,
  onRetry,
}: {
  title?: string;
  children?: ReactNode;
  onRetry?: () => void;
}) {
  return (
    <div className="state" role="alert">
      <h2>{title}</h2>
      {children && <p className="error">{children}</p>}
      {onRetry && (
        <button type="button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="state empty">
      <h2>{title}</h2>
      {children && <p className="muted">{children}</p>}
    </div>
  );
}
