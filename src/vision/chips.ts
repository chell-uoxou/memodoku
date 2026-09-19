import type { Bitmap, Component, Rect } from './bitmap';
import { connectedComponents } from './bitmap';
import { chroma, rgbToHex, rgbToLab, type Rgb } from './color';

export type Chip = {
  rect: Rect;
  color: string;
  /** ネコの顔になっている＝その色には既に猫が置かれている */
  solved: boolean;
};

/**
 * §5.2 盤面より上に等間隔で並ぶネコ型チップの列。
 *
 * 実機のスクショでは白いピルと背景のクリームがほぼ同じ明度で、白カードの矩形を
 * 取り出すのは当てにならなかった。代わりに「彩度があるか、ほぼ黒」の塊が
 * 横一列に等間隔で並んでいることを手がかりにする（黒は顔になったチップ）。
 * ルール説明カードの小さいマスはカード間の間隔が空くので等間隔判定で落ちる。
 */
export function findChips(bmp: Bitmap, board: Rect): Chip[] {
  const limit = board.y;
  if (limit <= 20) return [];

  const mask = new Uint8Array(bmp.width * bmp.height);
  for (let y = 0; y < limit; y++) {
    const row = y * bmp.width;
    for (let x = 0; x < bmp.width; x++) {
      const p = (row + x) * 4;
      const r = bmp.data[p];
      const g = bmp.data[p + 1];
      const b = bmp.data[p + 2];
      const lab = rgbToLab(r, g, b);
      // チップは白いピルの上に乗っているので「背景でもカードでもない」を拾う。
      // 淡いチップは彩度がしきい値を下回るため、盤面と同じマスクは使えない
      mask[row + x] = lab.L < 92 || chroma(lab) > 8 ? 1 : 0;
    }
  }

  const minSide = bmp.width * 0.015;
  const maxSide = bmp.width * 0.14;
  const comps = connectedComponents(mask, bmp.width, limit, 60).filter((c) => {
    const { w, h } = c.rect;
    if (w < minSide || h < minSide || w > maxSide || h > maxSide) return false;
    const aspect = w / h;
    return aspect > 0.5 && aspect < 2;
  });
  if (comps.length < 4) return [];

  let best: Component[] = [];
  let bestScore = 0;
  for (const seed of comps) {
    const row = comps
      .filter(
        (c) =>
          Math.abs(c.cy - seed.cy) < Math.max(4, seed.rect.h * 0.45) &&
          c.rect.h > seed.rect.h * 0.6 &&
          c.rect.h < seed.rect.h * 1.7,
      )
      .sort((a, b) => a.cx - b.cx);
    // 同じ高さに別のもの（たい焼きのピルなど）が並ぶので、
    // 間隔がそろっている連続区間だけを切り出す
    const group = longestUniformRun(row);
    const score = regularity(group);
    if (score > bestScore || (score === bestScore && group.length > best.length)) {
      bestScore = score;
      best = group;
    }
  }

  if (best.length < 4 || best.length > 15 || bestScore < 0.6) return [];
  return best.map((c) => {
    const { color, blackRatio } = chipStats(bmp, c.rect);
    return { rect: c.rect, color, solved: blackRatio >= 0.02 };
  });
}

/** 間隔が中央値から ±30% 以内で続く、最も長い連続区間 */
function longestUniformRun(row: Component[]): Component[] {
  if (row.length < 4) return row;
  const gaps = row.slice(1).map((c, i) => c.cx - row[i].cx);
  const median = gaps.slice().sort((a, b) => a - b)[Math.floor(gaps.length / 2)];
  if (median <= 0) return row;

  let best: Component[] = [];
  let start = 0;
  for (let i = 0; i <= gaps.length; i++) {
    const ok = i < gaps.length && Math.abs(gaps[i] - median) <= median * 0.3;
    if (!ok) {
      const run = row.slice(start, i + 1);
      if (run.length > best.length) best = run;
      start = i + 1;
    }
  }
  return best;
}

/** 等間隔かつ同じ大きさで並んでいるほど 1 に近い */
function regularity(group: Component[]): number {
  if (group.length < 4) return 0;
  const gaps = group.slice(1).map((c, i) => c.cx - group[i].cx);
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  if (mean <= 0) return 0;
  const cv =
    Math.sqrt(gaps.reduce((a, g) => a + (g - mean) ** 2, 0) / gaps.length) / mean;
  const widths = group.map((c) => c.rect.w);
  const wMean = widths.reduce((a, b) => a + b, 0) / widths.length;
  const wCv =
    Math.sqrt(widths.reduce((a, w) => a + (w - wMean) ** 2, 0) / widths.length) / wMean;
  return Math.max(0, 1 - cv * 3) * Math.max(0, 1 - wCv * 2);
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
      if (lab.L < 30) {
        black++;
        continue;
      }
      if (lab.L > 88 && chroma(lab) < 8) continue;
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
