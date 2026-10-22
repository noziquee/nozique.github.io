import { MAX_SIDE, WEBP_QUALITY, fitWithin } from './imageRules';

export interface ProcessedImage {
  blob: Blob;
  ext: 'webp' | 'jpg';
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Shrink a photo to at most 2400 px on its long side and save it as WebP (JPG if unsupported). */
export async function processImage(file: File): Promise<ProcessedImage> {
  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_SIDE);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Your browser could not prepare the image.');
    context.drawImage(bitmap, 0, 0, width, height);

    const webp = await toBlob(canvas, 'image/webp', WEBP_QUALITY);
    if (webp && webp.type === 'image/webp') return { blob: webp, ext: 'webp' };

    // Older browsers cannot write WebP. JPG has no transparency, so paint white behind it.
    context.globalCompositeOperation = 'destination-over';
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    const jpg = await toBlob(canvas, 'image/jpeg', 0.88);
    if (!jpg) throw new Error('Your browser could not compress the image.');
    return { blob: jpg, ext: 'jpg' };
  } finally {
    bitmap.close();
  }
}
