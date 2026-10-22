import { getSupabase } from '../../shared/supabase/client';
import type { Row } from '../../shared/supabase/database.types';
import { filesToDelete } from './projectCleanup';
import { GALLERY_BUCKET } from './imageRules';
import type { ProjectValues } from './projectRules';
import { VIDEO_BUCKET } from './videoRules';

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

/** Published projects show on your site. Drafts are hidden from visitors. */
export async function setPublished(id: string, published: boolean): Promise<void> {
  const status = published ? 'published' : 'draft';
  const { error } = await getSupabase().from('posts').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Featured projects are the ones shown on the home page. */
export async function setFeatured(id: string, featured: boolean): Promise<void> {
  const { error } = await getSupabase().from('posts').update({ featured }).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Save the order shown on screen: the first id gets 0, the next 1, and so on. */
export async function saveProjectOrder(ids: readonly string[]): Promise<void> {
  const db = getSupabase();
  const results = await Promise.all(
    ids.map((id, index) => db.from('posts').update({ sort_order: index }).eq('id', id)),
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) throw new Error(failed.error.message);
}

/** Delete a project, its image rows, and the image and video files it uploaded. */
export async function deleteProject(id: string): Promise<void> {
  const db = getSupabase();
  const [images, post] = await Promise.all([
    db.from('post_images').select('url').eq('post_id', id),
    db.from('posts').select('video_url').eq('id', id).maybeSingle(),
  ]);
  if (images.error) throw new Error(images.error.message);
  if (post.error) throw new Error(post.error.message);

  const files = filesToDelete(
    images.data.map((image) => image.url),
    post.data?.video_url ?? null,
  );

  const rows = await db.from('post_images').delete().eq('post_id', id);
  if (rows.error) throw new Error(rows.error.message);
  const removed = await db.from('posts').delete().eq('id', id);
  if (removed.error) throw new Error(removed.error.message);

  // The project is gone. Clearing its files is best effort.
  if (files.images.length) await db.storage.from(GALLERY_BUCKET).remove(files.images);
  if (files.videos.length) await db.storage.from(VIDEO_BUCKET).remove(files.videos);
}
