export const VIDEO_BUCKET = 'project-videos';
export const VIDEO_TYPES = ['video/mp4', 'video/webm'];
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

/** Returns a message to show the user, or null when the file can be uploaded. */
export function validateVideoFile(file: {
  name: string;
  type: string;
  size: number;
}): string | null {
  if (!VIDEO_TYPES.includes(file.type)) {
    return `${file.name}: only MP4 and WebM videos are supported.`;
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return `${file.name}: the video is larger than ${MAX_VIDEO_BYTES / 1024 / 1024} MB. Compress it, or paste a link instead.`;
  }
  return null;
}

/** The site plays videos with a plain video player, so a link must point straight at the file. */
export function validateVideoLink(link: string): string | null {
  let url: URL;
  try {
    url = new URL(link.trim());
  } catch {
    return 'Enter a full web address, starting with https://';
  }
  if (url.protocol !== 'https:') return 'The link must start with https://';
  if (!/\.(mp4|webm)$/i.test(url.pathname)) {
    return 'The link must go straight to an .mp4 or .webm file. YouTube and Vimeo pages will not work.';
  }
  return null;
}

export function videoExtension(type: string): 'mp4' | 'webm' {
  return type === 'video/webm' ? 'webm' : 'mp4';
}
