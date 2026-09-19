import type { Bitmap, Rect } from './bitmap';

export const MAX_EDGE = 1600;

/**
 * 画像を長辺 1600px に縮小して Bitmap にする。
 * 画像は一切アップロードせず、ObjectURL → Canvas で処理してすぐ破棄する。
 */
export async function bitmapFromBlob(blob: Blob): Promise<Bitmap> {
  const url = URL.createObjectURL(blob);
  try {
    const image = await loadImage(url);
    const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('no 2d context');
    ctx.drawImage(image, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    return { width, height, data: imageData.data };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image decode failed'));
    img.src = url;
  });
}

/** Bitmap の一部を Canvas に切り出す（OCR 用） */
export function cropToCanvas(bmp: Bitmap, rect: Rect): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const w = Math.max(1, Math.min(rect.w, bmp.width - rect.x));
  const h = Math.max(1, Math.min(rect.h, bmp.height - rect.y));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const out = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const src = ((rect.y + y) * bmp.width + (rect.x + x)) * 4;
      const dst = (y * w + x) * 4;
      out.data[dst] = bmp.data[src];
      out.data[dst + 1] = bmp.data[src + 1];
      out.data[dst + 2] = bmp.data[src + 2];
      out.data[dst + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  return canvas;
}
