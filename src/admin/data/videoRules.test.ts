import { describe, expect, it } from 'vitest';
import { storagePathFromUrl } from './imageRules';
import { validateVideoFile, validateVideoLink, videoExtension, VIDEO_BUCKET } from './videoRules';

describe('validateVideoFile', () => {
  const file = { name: 'a.mp4', type: 'video/mp4', size: 1000 };
  it('accepts MP4 and WebM', () => {
    expect(validateVideoFile(file)).toBeNull();
    expect(validateVideoFile({ ...file, type: 'video/webm' })).toBeNull();
  });
  it('rejects other formats and big files', () => {
    expect(validateVideoFile({ ...file, type: 'video/quicktime' })).toContain('MP4 and WebM');
    expect(validateVideoFile({ ...file, size: 60 * 1024 * 1024 })).toContain('50 MB');
  });
});

describe('validateVideoLink', () => {
  it('accepts direct https links to video files', () => {
    expect(validateVideoLink('https://example.com/clips/a.mp4')).toBeNull();
    expect(validateVideoLink(' https://example.com/a.WEBM?x=1 ')).toBeNull();
  });
  it('rejects anything else', () => {
    expect(validateVideoLink('not a link')).toContain('https://');
    expect(validateVideoLink('http://example.com/a.mp4')).toContain('https://');
    expect(validateVideoLink('https://www.youtube.com/watch?v=abc')).toContain('.mp4');
    expect(validateVideoLink('javascript:alert(1)')).not.toBeNull();
  });
});

describe('video helpers', () => {
  it('picks the file extension from the type', () => {
    expect(videoExtension('video/webm')).toBe('webm');
    expect(videoExtension('video/mp4')).toBe('mp4');
  });
  it('finds the storage path in the videos bucket', () => {
    const url = 'https://x.supabase.co/storage/v1/object/public/project-videos/p1/v.mp4';
    expect(storagePathFromUrl(url, VIDEO_BUCKET)).toBe('p1/v.mp4');
    expect(storagePathFromUrl('https://example.com/v.mp4', VIDEO_BUCKET)).toBeNull();
  });
});
