import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import jpeg from 'jpeg-js';
import type { Bitmap } from '../../src/vision/bitmap';
import { MAX_EDGE } from '../../src/vision/load';

/** 実機スクショ（JPEG）を読み、ブラウザ側と同じく長辺 1600px に縮小する */
export function loadShot(name: string): Bitmap {
  const path = fileURLToPath(new URL(`./shots/${name}`, import.meta.url));
  const raw = jpeg.decode(readFileSync(path), { useTArray: true, formatAsRGBA: true });
  return downscale(
    { width: raw.width, height: raw.height, data: new Uint8ClampedArray(raw.data) },
    MAX_EDGE,
  );
}

/** ブラウザの drawImage 相当。ボックスフィルタで平均を取る */
export function downscale(bmp: Bitmap, maxEdge: number): Bitmap {
  const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
  if (scale === 1) return bmp;
  const width = Math.max(1, Math.round(bmp.width * scale));
  const height = Math.max(1, Math.round(bmp.height * scale));
  const data = new Uint8ClampedArray(width * height * 4);
  const sx = bmp.width / width;
  const sy = bmp.height / height;

  for (let y = 0; y < height; y++) {
    const y0 = Math.floor(y * sy);
    const y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy));
    for (let x = 0; x < width; x++) {
      const x0 = Math.floor(x * sx);
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx));
      let r = 0;
      let g = 0;
      let b = 0;
      let count = 0;
      for (let yy = y0; yy < y1 && yy < bmp.height; yy++) {
        for (let xx = x0; xx < x1 && xx < bmp.width; xx++) {
          const p = (yy * bmp.width + xx) * 4;
          r += bmp.data[p];
          g += bmp.data[p + 1];
          b += bmp.data[p + 2];
          count++;
        }
      }
      const q = (y * width + x) * 4;
      data[q] = r / count;
      data[q + 1] = g / count;
      data[q + 2] = b / count;
      data[q + 3] = 255;
    }
  }
  return { width, height, data };
}
