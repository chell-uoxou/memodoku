import type { Bitmap, Component, Rect } from './bitmap';
import { connectedComponents } from './bitmap';
import { rgbToSv } from './color';

export const SAT_MIN = 0.18;
export const VAL_MIN = 0.25;

/** §5.1-2 彩度のあるセル色のマスク。背景のクリーム色・白カード・黒文字が落ちる */
export function saturationMask(bmp: Bitmap): Uint8Array {
  const out = new Uint8Array(bmp.width * bmp.height);
  const d = bmp.data;
  for (let i = 0, p = 0; i < out.length; i++, p += 4) {
    const [s, v] = rgbToSv(d[p], d[p + 1], d[p + 2]);
    out[i] = s > SAT_MIN && v > VAL_MIN ? 1 : 0;
  }
  return out;
}

/** 細いギャップで分断されたセルを1つの成分に繋ぐための膨張 */
export function dilate(mask: Uint8Array, width: number, height: number, r: number): Uint8Array {
  if (r <= 0) return mask;
  const tmp = new Uint8Array(mask.length);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      let on = 0;
      for (let k = -r; k <= r && !on; k++) {
        const xx = x + k;
        if (xx >= 0 && xx < width && mask[row + xx]) on = 1;
      }
      tmp[row + x] = on;
    }
  }
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let on = 0;
      for (let k = -r; k <= r && !on; k++) {
        const yy = y + k;
        if (yy >= 0 && yy < height && tmp[yy * width + x]) on = 1;
      }
      out[y * width + x] = on;
    }
  }
  return out;
}

/**
 * §5.1-3 盤面候補。アスペクト比 0.9〜1.1 かつ画像幅の 60% 以上の最大成分。
 * 候補が複数残ったら投影の周期性が最もきれいに出るものを採用する。
 */
export function findBoardRect(bmp: Bitmap, mask: Uint8Array): Rect | null {
  const r = Math.max(1, Math.round(Math.min(bmp.width, bmp.height) * 0.004));
  const closed = dilate(mask, bmp.width, bmp.height, r);
  const comps = connectedComponents(closed, bmp.width, bmp.height, 400).map((c) => ({
    ...c,
    // 膨張した分だけ縮めて元の盤面矩形に戻す
    rect: { x: c.rect.x + r, y: c.rect.y + r, w: c.rect.w - 2 * r, h: c.rect.h - 2 * r },
  }));
  const candidates = comps.filter((c) => {
    const aspect = c.rect.w / c.rect.h;
    return aspect >= 0.9 && aspect <= 1.1 && c.rect.w >= bmp.width * 0.6;
  });
  if (!candidates.length) return null;
  if (candidates.length === 1) return candidates[0].rect;

  let best = candidates[0];
  let bestScore = -Infinity;
  for (const c of candidates) {
    const score = periodicityScore(mask, bmp.width, c.rect);
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best.rect;
}

/** 低彩度の帯（セル間ギャップ）の列方向プロファイル */
export function gapProfile(
  mask: Uint8Array,
  imageWidth: number,
  rect: Rect,
  axis: 'x' | 'y',
): Float64Array {
  const len = axis === 'x' ? rect.w : rect.h;
  const other = axis === 'x' ? rect.h : rect.w;
  const out = new Float64Array(len);
  for (let a = 0; a < len; a++) {
    let gaps = 0;
    for (let b = 0; b < other; b++) {
      const x = axis === 'x' ? rect.x + a : rect.x + b;
      const y = axis === 'x' ? rect.y + b : rect.y + a;
      if (!mask[y * imageWidth + x]) gaps++;
    }
    out[a] = gaps / other;
  }
  return out;
}

/** 自己相関でピッチを推定する。返り値は画素単位のピッチ */
export function estimatePitch(profile: Float64Array, min: number, max: number): number | null {
  const n = profile.length;
  let mean = 0;
  for (const v of profile) mean += v;
  mean /= n;
  const centered = Float64Array.from(profile, (v) => v - mean);

  let bestLag = 0;
  let bestScore = 0;
  for (let lag = Math.max(2, Math.floor(min)); lag <= Math.floor(max); lag++) {
    let sum = 0;
    let count = 0;
    for (let i = 0; i + lag < n; i++) {
      sum += centered[i] * centered[i + lag];
      count++;
    }
    if (!count) continue;
    const score = sum / count;
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }
  return bestLag > 0 ? bestLag : null;
}

function periodicityScore(mask: Uint8Array, imageWidth: number, rect: Rect): number {
  const profile = gapProfile(mask, imageWidth, rect, 'x');
  const pitch = estimatePitch(profile, rect.w / 15, rect.w / 4);
  if (!pitch) return 0;
  const n = Math.round(rect.w / pitch);
  return n >= 4 && n <= 15 ? 1 / (1 + Math.abs(rect.w / pitch - n)) : 0;
}

/** 盤面矩形とピッチから N を求める。ギャップがほとんど無い盤面でも自己相関で拾える */
export function estimateN(mask: Uint8Array, imageWidth: number, rect: Rect): number | null {
  const scores = new Map<number, number>();
  for (const axis of ['x', 'y'] as const) {
    const size = axis === 'x' ? rect.w : rect.h;
    const pitch = estimatePitch(gapProfile(mask, imageWidth, rect, axis), size / 15, size / 4);
    if (!pitch) continue;
    const n = Math.round(size / pitch);
    if (n < 4 || n > 15) continue;
    scores.set(n, (scores.get(n) ?? 0) + 1 / (1 + Math.abs(size / pitch - n)));
  }
  let bestN: number | null = null;
  let best = 0;
  for (const [n, score] of scores) {
    if (score > best) {
      best = score;
      bestN = n;
    }
  }
  return bestN;
}

/** セル i の矩形（row-major） */
export function cellRect(board: Rect, n: number, index: number): Rect {
  const r = Math.floor(index / n);
  const c = index % n;
  const pitchX = board.w / n;
  const pitchY = board.h / n;
  return {
    x: Math.round(board.x + c * pitchX),
    y: Math.round(board.y + r * pitchY),
    w: Math.round(pitchX),
    h: Math.round(pitchY),
  };
}

export type { Component };
