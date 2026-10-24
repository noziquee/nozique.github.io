export const MAX_SIDE = 2400;
export const WEBP_QUALITY = 0.85;
export const MAX_INPUT_BYTES = 40 * 1024 * 1024;
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const GALLERY_BUCKET = 'gallery-images';

/** Scale a size down so its longer side is at most `max`. Never scales up. */
export function fitWithin(
  width: number,
  height: number,
  max: number = MAX_SIDE,
): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Returns a message to show the user, or null when the file can be uploaded. */
export function validateImageFile(file: {
  name: string;
  type: string;
  size: number;
}): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return `${file.name}: only JPG, PNG and WebP images are supported.`;
  }
  if (file.size > MAX_INPUT_BYTES) {
    return `${file.name}: the file is larger than ${MAX_INPUT_BYTES / 1024 / 1024} MB.`;
  }
  return null;
}

/** The file path inside a public bucket, from its public address. Null if not in that bucket. */
export function storagePathFromUrl(url: string, bucket: string = GALLERY_BUCKET): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const at = url.indexOf(marker);
  if (at < 0) return null;
  const path = decodeURIComponent(url.slice(at + marker.length).split('?')[0] ?? '');
  return path && !path.includes('..') ? path : null;
}

/** Move the item with id `activeId` to where `overId` is. Returns a new list. */
export function reorder<T extends { id: string }>(
  items: readonly T[],
  activeId: string,
  overId: string,
): T[] {
  const from = items.findIndex((item) => item.id === activeId);
  const to = items.findIndex((item) => item.id === overId);
  const next = [...items];
  if (from < 0 || to < 0 || from === to) return next;
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved as T);
  return next;
}
