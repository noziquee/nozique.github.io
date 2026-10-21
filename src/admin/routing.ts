import { useSyncExternalStore } from 'react';

export type AdminPage = 'projects' | 'website' | 'settings';

export const ADMIN_PAGES: readonly { id: AdminPage; label: string }[] = [
  { id: 'projects', label: 'Projects' },
  { id: 'website', label: 'Website' },
  { id: 'settings', label: 'Settings' },
];

/** Turn a hash like "#/website" into an admin page. Unknown hashes open Projects. */
export function parseAdminHash(hash: string): AdminPage {
  const name = hash.replace(/^#\/?/, '').split('/')[0];
  const page = ADMIN_PAGES.find((p) => p.id === name);
  return page ? page.id : 'projects';
}

export function adminHref(page: AdminPage): string {
  return `#/${page}`;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

/** The admin page the address bar currently points at. */
export function useAdminPage(): AdminPage {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return parseAdminHash(hash);
}
