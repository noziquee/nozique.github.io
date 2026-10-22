import type { NoziqueClient } from '../../shared/supabase/client';
import { DEFAULT_CATEGORIES } from './categories';
import { mapRows } from './mapping';
import { PLACEHOLDER_PROJECTS } from './placeholders';
import type { SiteData } from './types';

type DbClient = Pick<NoziqueClient, 'from'>;

/** The built-in sample content, used while the database has no published projects. */
export function placeholderData(): SiteData {
  return {
    projects: PLACEHOLDER_PROJECTS.map((project) => ({ ...project })),
    categories: DEFAULT_CATEGORIES.map((category) => ({ ...category })),
    source: 'placeholder',
  };
}

/** Read categories, published projects and their images. Throws if the database errors. */
export async function fetchSiteData(client: DbClient): Promise<SiteData> {
  const [groups, posts, images] = await Promise.all([
    client.from('groups').select('*').order('sort_order', { nullsFirst: false }),
    client
      .from('posts')
      .select('*')
      .eq('status', 'published')
      .order('sort_order', { nullsFirst: false })
      .order('created_at', { ascending: false }),
    client.from('post_images').select('*').order('sort_order'),
  ]);
  const error = groups.error ?? posts.error ?? images.error;
  if (error) throw new Error(error.message);
  return mapRows(groups.data ?? [], posts.data ?? [], images.data ?? []);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out loading site data')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (reason: unknown) => {
        clearTimeout(timer);
        reject(reason);
      },
    );
  });
}

/**
 * Load what the public site shows. Never throws: if the database is empty, slow,
 * unreachable or not configured, the sample content is shown instead.
 */
export async function loadSiteData(getClient: () => DbClient, timeoutMs = 4000): Promise<SiteData> {
  try {
    const data = await withTimeout(fetchSiteData(getClient()), timeoutMs);
    return data.projects.length > 0 ? data : placeholderData();
  } catch {
    return placeholderData();
  }
}
