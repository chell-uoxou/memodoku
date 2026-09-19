import type { Bitmap, Rect } from './bitmap';
import { connectedComponents } from './bitmap';
import { rgbToHex, rgbToLab, type Rgb } from './color';

export type Chip = {
  rect: Rect;
  color: string;
  /** ネコの顔になっている＝その色には既に猫が置かれている */
  solved: boolean;
};

/**
 * §5.2 盤面より上にある、等間隔に並ぶ彩度のあるシルエット列を探す。
 * チップ数 = N であり、5.1 の推定より強い制約として使う。
 */
export function findChips(bmp: Bitmap, mask: Uint8Array, board: Rect): Chip[] {
  const above = new Uint8Array(mask.length);
  const limit = board.y;
  if (limit <= 4) return [];
  for (let y = 0; y < limit; y++) {
    const row = y * bmp.width;
    for (let x = 0; x < bmp.width; x++) above[row + x] = mask[row + x];
  }

  const comps = connectedComponents(above, bmp.width, limit, 40).filter(
    (c) => c.rect.w < board.w / 3 && c.rect.h < limit,
  );
  if (comps.length < 4) return [];

  // 同じ高さ・同じ大きさで横に並ぶものを束ねる
  let best: typeof comps = [];
  for (const seed of comps) {
    const group = comps
      .filter(
        (c) =>
          Math.abs(c.cy - seed.cy) < Math.max(6, seed.rect.h * 0.5) &&
          c.rect.h > seed.rect.h * 0.6 &&
          c.rect.h < seed.rect.h * 1.6,
      )
      .sort((a, b) => a.rect.x - b.rect.x);
    if (group.length > best.length) best = group;
  }
  if (best.length < 4) return [];

  // 等間隔になっていない外れを落とす
  const gaps = best.slice(1).map((c, i) => c.cx - best[i].cx);
  const median = gaps.slice().sort((a, b) => a - b)[Math.floor(gaps.length / 2)];
  const kept = best.filter((c, i) => {
    if (i === 0 || i === best.length - 1) return true;
    const left = c.cx - best[i - 1].cx;
    const right = best[i + 1].cx - c.cx;
    return Math.abs(left - median) < median * 0.6 || Math.abs(right - median) < median * 0.6;
  });

  return kept.map((c) => {
    const { color, blackRatio } = chipStats(bmp, c.rect);
    return { rect: c.rect, color, solved: blackRatio >= 0.02 };
  });
}

function chipStats(bmp: Bitmap, rect: Rect): { color: string; blackRatio: number } {
  const bins = new Map<number, { count: number; sum: [number, number, number] }>();
  let black = 0;
  let total = 0;
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    for (let x = rect.x; x < rect.x + rect.w; x++) {
      const p = (y * bmp.width + x) * 4;
      const rgb: Rgb = [bmp.data[p], bmp.data[p + 1], bmp.data[p + 2]];
      total++;
      const lab = rgbToLab(rgb[0], rgb[1], rgb[2]);
      if (lab.L < 25) {
        black++;
        continue;
      }
      if (lab.L > 88 && Math.hypot(lab.a, lab.b) < 8) continue;
      const key = ((rgb[0] >> 4) << 8) | ((rgb[1] >> 4) << 4) | (rgb[2] >> 4);
      const bin = bins.get(key);
      if (bin) {
        bin.count++;
        bin.sum[0] += rgb[0];
        bin.sum[1] += rgb[1];
        bin.sum[2] += rgb[2];
      } else {
        bins.set(key, { count: 1, sum: [...rgb] });
      }
    }
  }
  let top: { count: number; sum: [number, number, number] } | null = null;
  for (const bin of bins.values()) if (!top || bin.count > top.count) top = bin;
  const color = top
    ? rgbToHex([top.sum[0] / top.count, top.sum[1] / top.count, top.sum[2] / top.count])
    : '#cccccc';
  return { color, blackRatio: total ? black / total : 0 };
}
