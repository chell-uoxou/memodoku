import type { Bitmap, Rect } from './bitmap';
import { chroma, ciede2000, rgbToHex, rgbToLab, type Rgb } from './color';
import type { Mark } from '../model/types';
import { CAT, CROSS, EMPTY } from '../model/types';

const X_TEMPLATE = buildXTemplate(16);

/** セル内側 70%（中央 40% を除いたドーナツ）から領域色を取る */
export function sampleRegionColor(bmp: Bitmap, rect: Rect): string | null {
  const bins = new Map<number, { count: number; sum: [number, number, number] }>();
  const inner = insetRect(rect, 0.15);
  const holeX0 = rect.x + rect.w * 0.3;
  const holeX1 = rect.x + rect.w * 0.7;
  const holeY0 = rect.y + rect.h * 0.3;
  const holeY1 = rect.y + rect.h * 0.7;

  for (let y = inner.y; y < inner.y + inner.h; y++) {
    if (y < 0 || y >= bmp.height) continue;
    for (let x = inner.x; x < inner.x + inner.w; x++) {
      if (x < 0 || x >= bmp.width) continue;
      if (x >= holeX0 && x < holeX1 && y >= holeY0 && y < holeY1) continue;
      const p = (y * bmp.width + x) * 4;
      const rgb: Rgb = [bmp.data[p], bmp.data[p + 1], bmp.data[p + 2]];
      const lab = rgbToLab(rgb[0], rgb[1], rgb[2]);
      if (lab.L > 88 && chroma(lab) < 8) continue; // ほぼ白
      if (lab.L < 25) continue; // ほぼ黒
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
  if (!top) return null;
  return rgbToHex([top.sum[0] / top.count, top.sum[1] / top.count, top.sum[2] / top.count]);
}

export const MAX_DELTA_E = 12;

/** パレットへ最近傍マッチ。ΔE > 12 なら不明 */
export function matchPalette(hex: string, palette: string[]): number | null {
  const lab = rgbToLab(...hexToTuple(hex));
  let best = -1;
  let bestD = Infinity;
  palette.forEach((p, k) => {
    const d = ciede2000(lab, rgbToLab(...hexToTuple(p)));
    if (d < bestD) {
      bestD = d;
      best = k;
    }
  });
  return bestD <= MAX_DELTA_E ? best : null;
}

export type CellSignals = {
  /** どちらもセル全体の面積に対する比。サンプルはセル内側70%だけから取る */
  blackRatio: number;
  whiteRatio: number;
  clusters: number;
  xCorrelation: number;
};

/** §5.4 色やテンプレート一致ではなく構造で判定する */
export function cellSignals(bmp: Bitmap, rect: Rect): CellSignals {
  const inner = insetRect(rect, 0.15);
  const cellArea = Math.max(1, rect.w * rect.h);
  let black = 0;
  let white = 0;
  const bins = new Set<number>();
  const grid = new Float64Array(16 * 16);
  const counts = new Float64Array(16 * 16);

  for (let y = inner.y; y < inner.y + inner.h; y++) {
    if (y < 0 || y >= bmp.height) continue;
    for (let x = inner.x; x < inner.x + inner.w; x++) {
      if (x < 0 || x >= bmp.width) continue;
      const p = (y * bmp.width + x) * 4;
      const r = bmp.data[p];
      const g = bmp.data[p + 1];
      const b = bmp.data[p + 2];
      const lab = rgbToLab(r, g, b);
      const isWhite = lab.L > 88 && chroma(lab) < 8;
      const isBlack = lab.L < 25;
      if (isBlack) black++;
      if (isWhite) white++;
      bins.add(((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5));

      const gx = Math.min(15, Math.floor(((x - inner.x) / inner.w) * 16));
      const gy = Math.min(15, Math.floor(((y - inner.y) / inner.h) * 16));
      grid[gy * 16 + gx] += isWhite ? 1 : 0;
      counts[gy * 16 + gx]++;
    }
  }

  for (let i = 0; i < grid.length; i++) grid[i] = counts[i] ? grid[i] / counts[i] : 0;

  return {
    blackRatio: black / cellArea,
    whiteRatio: white / cellArea,
    clusters: bins.size,
    xCorrelation: correlate(grid, X_TEMPLATE),
  };
}

export const X_CORRELATION_MIN = 0.6;

export function classifyMark(signals: CellSignals): Mark {
  if (signals.blackRatio >= 0.02 && signals.clusters >= 3) return CAT;
  if (
    signals.blackRatio < 0.02 &&
    signals.whiteRatio >= 0.03 &&
    signals.whiteRatio <= 0.18 &&
    signals.xCorrelation > X_CORRELATION_MIN
  ) {
    return CROSS;
  }
  return EMPTY;
}

function insetRect(rect: Rect, ratio: number): Rect {
  return {
    x: Math.round(rect.x + rect.w * ratio),
    y: Math.round(rect.y + rect.h * ratio),
    w: Math.round(rect.w * (1 - ratio * 2)),
    h: Math.round(rect.h * (1 - ratio * 2)),
  };
}

function buildXTemplate(size: number): Float64Array {
  const out = new Float64Array(size * size);
  const band = size * 0.12;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inset = size * 0.18;
      const inside = x >= inset && x < size - inset && y >= inset && y < size - inset;
      const d1 = Math.abs(x - y) / Math.SQRT2;
      const d2 = Math.abs(x + y - (size - 1)) / Math.SQRT2;
      out[y * size + x] = inside && Math.min(d1, d2) <= band ? 1 : 0;
    }
  }
  return out;
}

/** ピアソンの相関係数 */
function correlate(a: Float64Array, b: Float64Array): number {
  const n = a.length;
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < n; i++) {
    ma += a[i];
    mb += b[i];
  }
  ma /= n;
  mb /= n;
  let num = 0;
  let da = 0;
  let dbb = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] - ma;
    const y = b[i] - mb;
    num += x * y;
    da += x * x;
    dbb += y * y;
  }
  const den = Math.sqrt(da * dbb);
  return den === 0 ? 0 : num / den;
}

function hexToTuple(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const v = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
