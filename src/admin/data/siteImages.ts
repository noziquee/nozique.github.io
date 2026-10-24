import { getSupabase } from '../../shared/supabase/client';
import { processImage } from './imageProcessing';
import { SITE_BUCKET, validateImageFile } from './imageRules';

export interface UploadedImage {
  url: string;
  width: number;
  height: number;
  /** A starting alt text made from the file name. The admin should improve it. */
  alt: string;
}

/** A readable guess from a file name: "my-cool_drawing.png" becomes "my cool drawing". */
export function altFromFileName(name: string): string {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
}

/** Compress a picture and upload it for use in a website design. */
export async function uploadDesignImage(file: File): Promise<UploadedImage> {
  const problem = validateImageFile(file);
  if (problem) throw new Error(problem);
  const { blob, ext, width, height } = await processImage(file);
  const path = `designs/${crypto.randomUUID()}.${ext}`;
  const db = getSupabase();
  const upload = await db.storage
    .from(SITE_BUCKET)
    .upload(path, blob, { contentType: blob.type, cacheControl: '31536000' });
  if (upload.error) throw new Error(upload.error.message);
  const url = db.storage.from(SITE_BUCKET).getPublicUrl(path).data.publicUrl;
  return { url, width, height, alt: altFromFileName(file.name) };
}
