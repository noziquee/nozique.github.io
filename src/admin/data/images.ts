import { getSupabase } from '../../shared/supabase/client';
import type { Row } from '../../shared/supabase/database.types';
import { processImage } from './imageProcessing';
import { GALLERY_BUCKET, storagePathFromUrl } from './imageRules';

export type ProjectImage = Row<'post_images'>;

export async function listImages(postId: string): Promise<ProjectImage[]> {
  const { data, error } = await getSupabase()
    .from('post_images')
    .select('*')
    .eq('post_id', postId)
    .order('sort_order')
    .order('created_at');
  if (error) throw new Error(error.message);
  return data;
}

/** Compress one file, upload it, and add it at the end of the project's images. */
export async function addImage(postId: string, file: File, sortOrder: number): Promise<void> {
  const db = getSupabase();
  const { blob, ext } = await processImage(file);
  const path = `${postId}/${crypto.randomUUID()}.${ext}`;

  const upload = await db.storage
    .from(GALLERY_BUCKET)
    .upload(path, blob, { contentType: blob.type, cacheControl: '31536000' });
  if (upload.error) throw new Error(upload.error.message);

  const url = db.storage.from(GALLERY_BUCKET).getPublicUrl(path).data.publicUrl;
  const alt = file.name
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim();
  const insert = await db
    .from('post_images')
    .insert({ post_id: postId, url, sort_order: sortOrder, alt });
  if (insert.error) {
    await db.storage.from(GALLERY_BUCKET).remove([path]);
    throw new Error(insert.error.message);
  }
}

export async function updateImageText(
  id: string,
  values: { alt: string; caption: string },
): Promise<void> {
  const { error } = await getSupabase()
    .from('post_images')
    .update({ alt: values.alt.trim() || null, caption: values.caption.trim() || null })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/** Save the order shown on screen: the first id gets 0, the next 1, and so on. */
export async function saveImageOrder(ids: readonly string[]): Promise<void> {
  const db = getSupabase();
  const results = await Promise.all(
    ids.map((id, index) => db.from('post_images').update({ sort_order: index }).eq('id', id)),
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) throw new Error(failed.error.message);
}

/** Remove the image from the project and delete its file from storage. */
export async function removeImage(image: ProjectImage): Promise<void> {
  const db = getSupabase();
  const { error } = await db.from('post_images').delete().eq('id', image.id);
  if (error) throw new Error(error.message);
  const path = storagePathFromUrl(image.url);
  if (path) await db.storage.from(GALLERY_BUCKET).remove([path]);
}
