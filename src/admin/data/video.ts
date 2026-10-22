import { getSupabase } from '../../shared/supabase/client';
import { storagePathFromUrl } from './imageRules';
import { VIDEO_BUCKET, videoExtension } from './videoRules';

async function setVideoUrl(postId: string, url: string | null): Promise<void> {
  const { error } = await getSupabase().from('posts').update({ video_url: url }).eq('id', postId);
  if (error) throw new Error(error.message);
}

/** Delete the old file, but only when it is one we uploaded. Links to other sites are left alone. */
async function deleteOwnFile(url: string | null): Promise<void> {
  const path = url ? storagePathFromUrl(url, VIDEO_BUCKET) : null;
  if (path) await getSupabase().storage.from(VIDEO_BUCKET).remove([path]);
}

export async function getVideoUrl(postId: string): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from('posts')
    .select('video_url')
    .eq('id', postId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.video_url ?? null;
}

export async function uploadVideo(
  postId: string,
  file: File,
  previousUrl: string | null,
): Promise<string> {
  const db = getSupabase();
  const path = `${postId}/${crypto.randomUUID()}.${videoExtension(file.type)}`;
  const upload = await db.storage
    .from(VIDEO_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: '31536000' });
  if (upload.error) throw new Error(upload.error.message);

  const url = db.storage.from(VIDEO_BUCKET).getPublicUrl(path).data.publicUrl;
  try {
    await setVideoUrl(postId, url);
  } catch (error) {
    await db.storage.from(VIDEO_BUCKET).remove([path]);
    throw error;
  }
  await deleteOwnFile(previousUrl);
  return url;
}

export async function saveVideoLink(
  postId: string,
  link: string,
  previousUrl: string | null,
): Promise<string> {
  const url = link.trim();
  await setVideoUrl(postId, url);
  await deleteOwnFile(previousUrl);
  return url;
}

export async function removeVideo(postId: string, previousUrl: string | null): Promise<void> {
  await setVideoUrl(postId, null);
  await deleteOwnFile(previousUrl);
}
