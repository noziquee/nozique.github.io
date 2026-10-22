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

export type ProjectRoute = { kind: 'new' } | { kind: 'edit'; id: string };

/** "#/projects/new" or "#/projects/<id>" open the project editor. Anything else returns null. */
export function parseProjectRoute(hash: string): ProjectRoute | null {
  const [page, second] = hash.replace(/^#\/?/, '').split('/');
  if (page !== 'projects' || !second) return null;
  if (second === 'new') return { kind: 'new' };
  return /^[0-9a-f-]{36}$/i.test(second) ? { kind: 'edit', id: second } : null;
}

export const NEW_PROJECT_HREF = '#/projects/new';

export function projectHref(id: string): string {
  return `#/projects/${id}`;
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

/** The project editor the address bar points at, or null when showing the list. */
export function useProjectRoute(): ProjectRoute | null {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return parseProjectRoute(hash);
}
