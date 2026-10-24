import { GALLERY_BUCKET, storagePathFromUrl } from './imageRules';
import { VIDEO_BUCKET } from './videoRules';

/** The stored files that belong to a project. Links to other websites are never included. */
export function filesToDelete(
  imageUrls: readonly string[],
  videoUrl: string | null,
): { images: string[]; videos: string[] } {
  const images = imageUrls
    .map((url) => storagePathFromUrl(url, GALLERY_BUCKET))
    .filter((path): path is string => path !== null);
  const video = videoUrl ? storagePathFromUrl(videoUrl, VIDEO_BUCKET) : null;
  return { images, videos: video ? [video] : [] };
}
