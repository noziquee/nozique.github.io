import { getSupabase } from '../../shared/supabase/client';
import type { Row } from '../../shared/supabase/database.types';

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
