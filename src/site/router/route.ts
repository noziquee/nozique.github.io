/** The pages of the public site. A project page is the "work" page with an id. */
export type PageName = 'home' | 'work' | 'about' | 'contact';

export interface Route {
  page: PageName;
  /** Project id, only present on a project page (#/work/<id>). */
  id?: string;
}

const PAGES: readonly string[] = ['work', 'about', 'contact'];

/**
 * Turn a location hash like "#/work/character-01" into a Route.
 * Unknown pages fall back to home; an unknown project id falls back to the work list.
 * Pass the list of known project ids so bad links never render an empty project page.
 */
export function parseHash(hash: string, knownIds: readonly string[] = []): Route {
  const path = hash.startsWith('#/') ? hash.slice(2) : '';
  const [segment = '', id = ''] = path.split('/');
  if (!PAGES.includes(segment)) return { page: 'home' };
  if (segment === 'work' && id && knownIds.includes(id)) return { page: 'work', id };
  return { page: segment as PageName };
}

/** The inverse of parseHash: build the hash for a route. */
export function toHash(route: Route): string {
  if (route.page === 'home') return '#/';
  return route.id ? `#/${route.page}/${route.id}` : `#/${route.page}`;
}

const SUFFIX = ' | Nozique';

/** The browser tab title for a route. `projectTitle` is used for project pages. */
export function pageTitle(route: Route, projectTitle?: string): string {
  if (route.id && projectTitle) return projectTitle + SUFFIX;
  if (route.page === 'home') return 'Illustration, 3D and Animation' + SUFFIX;
  return route.page.charAt(0).toUpperCase() + route.page.slice(1) + SUFFIX;
}
