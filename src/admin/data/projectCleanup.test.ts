import { describe, expect, it } from 'vitest';
import { filesToDelete } from './projectCleanup';

const base = 'https://x.supabase.co/storage/v1/object/public/';

describe('filesToDelete', () => {
  it('lists our own image and video files', () => {
    const result = filesToDelete(
      [`${base}gallery-images/p/a.webp`, `${base}gallery-images/p/b.webp`],
      `${base}project-videos/p/v.mp4`,
    );
    expect(result).toEqual({ images: ['p/a.webp', 'p/b.webp'], videos: ['p/v.mp4'] });
  });
  it('skips files that are not ours', () => {
    const result = filesToDelete(['https://example.com/a.png'], 'https://example.com/v.mp4');
    expect(result).toEqual({ images: [], videos: [] });
  });
  it('handles a project with no video', () => {
    expect(filesToDelete([], null)).toEqual({ images: [], videos: [] });
  });
});
