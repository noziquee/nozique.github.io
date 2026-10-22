import { getSupabase } from '../../shared/supabase/client';
import type { Row } from '../../shared/supabase/database.types';
import type { ProjectValues } from './projectRules';

export type ProjectSummary = Row<'posts'> & {
  /** First image, used as the thumbnail. */
  thumbnail: string | null;
  imageCount: number;
};

export async function listProjects(): Promise<ProjectSummary[]> {
  const db = getSupabase();
  const [posts, images] = await Promise.all([
    db.from('posts').select('*').order('sort_order', { nullsFirst: false }).order('created_at'),
    db.from('post_images').select('post_id, url, sort_order').order('sort_order'),
  ]);
  if (posts.error) throw new Error(posts.error.message);
  if (images.error) throw new Error(images.error.message);

  const first = new Map<string, string>();
  const counts = new Map<string, number>();
  for (const image of images.data) {
    if (!first.has(image.post_id)) first.set(image.post_id, image.url);
    counts.set(image.post_id, (counts.get(image.post_id) ?? 0) + 1);
  }
  return posts.data.map((post) => ({
    ...post,
    thumbnail: first.get(post.id) ?? null,
    imageCount: counts.get(post.id) ?? 0,
  }));
}

export async function getProject(id: string): Promise<Row<'posts'> | null> {
  const { data, error } = await getSupabase().from('posts').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** New projects start as drafts, so nothing appears on the site until you publish. */
export async function createProject(values: ProjectValues, slug: string): Promise<string> {
  const db = getSupabase();
  const last = await db
    .from('posts')
    .select('sort_order')
    .order('sort_order', { ascending: false, nullsFirst: false })
    .limit(1);
  if (last.error) throw new Error(last.error.message);
  const sortOrder = (last.data[0]?.sort_order ?? -1) + 1;

  const { data, error } = await db
    .from('posts')
    .insert({ ...values, slug, status: 'draft', sort_order: sortOrder })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function updateProject(id: string, values: ProjectValues): Promise<void> {
  const { error } = await getSupabase().from('posts').update(values).eq('id', id);
  if (error) throw new Error(error.message);
}
