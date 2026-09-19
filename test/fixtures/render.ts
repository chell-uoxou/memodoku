import type { Bitmap } from '../../src/vision/bitmap';
import type { Mark } from '../../src/model/types';

export type FixtureSpec = {
  n: number;
  /** 長さ n*n、値は 0..n-1 */
  regions: number[];
  palette: string[];
  /** 長さ n*n、0=空 1=バツ 2=猫 */
  marks: Mark[];
  width?: number;
  height?: number;
  /** セル間のギャップ（px）。0 にすると実機のようにほぼ隙間なしになる */
  gap?: number;
  /** 上部のチップ列を描くか */
  chips?: boolean;
  /** 通知バナーでヘッダが潰れている状況 */
  banner?: boolean;
};

const BG: Rgb = [246, 239, 231];
const CARD: Rgb = [255, 255, 255];
const ACCENT: Rgb = [240, 168, 104];
const DARK: Rgb = [42, 30, 24];
const PINK: Rgb = [235, 140, 150];

type Rgb = [number, number, number];

/** テスト用に Meowdoku 風のスクリーンショットを合成する */
export function renderFixture(spec: FixtureSpec): Bitmap {
  const width = spec.width ?? 750;
  const height = spec.height ?? 1334;
  const gap = spec.gap ?? 2;
  const data = new Uint8ClampedArray(width * height * 4);
  const bmp: Bitmap = { width, height, data };
  fill(bmp, { x: 0, y: 0, w: width, h: height }, BG);

  // ヘッダ（レベル名の白カード）
  if (spec.banner) {
    fill(bmp, { x: 0, y: 0, w: width, h: 120 }, [30, 30, 34]);
  } else {
    roundFill(bmp, { x: 60, y: 90, w: width - 120, h: 120 }, CARD, 24);
  }

  const n = spec.n;
  const boardX = 40;
  const boardY = 420;
  const boardW = width - 80;
  const pitch = boardW / n;

  // 上部のネコ型チップ列
  if (spec.chips !== false) {
    const chipSize = Math.min(44, (boardW - 20) / n - 8);
    const step = chipSize + 10;
    const total = step * n - 10;
    const startX = (width - total) / 2;
    const y = boardY - 120;
    roundFill(
      bmp,
      { x: startX - 22, y: y - 16, w: total + 44, h: chipSize + 32 },
      CARD,
      (chipSize + 32) / 2,
    );
    const solved = new Set(
      spec.marks.flatMap((m, i) => (m === 2 ? [spec.regions[i]] : [])),
    );
    for (let k = 0; k < n; k++) {
      const rect = { x: Math.round(startX + k * step), y, w: chipSize, h: chipSize };
      catSilhouette(bmp, rect, hex(spec.palette[k]), solved.has(k));
    }
  }

  // 盤面
  for (let i = 0; i < n * n; i++) {
    const r = Math.floor(i / n);
    const c = i % n;
    const rect = {
      x: Math.round(boardX + c * pitch + gap / 2),
      y: Math.round(boardY + r * pitch + gap / 2),
      w: Math.round(pitch - gap),
      h: Math.round(pitch - gap),
    };
    const mark = spec.marks[i];
    const base: Rgb = mark === 2 ? ACCENT : hex(spec.palette[spec.regions[i]]);
    roundFill(bmp, rect, base, rect.w * 0.12);
    if (mark === 1) drawCross(bmp, rect);
    if (mark === 2) drawCat(bmp, rect);
  }

  // 下部のボタン
  roundFill(bmp, { x: 120, y: height - 180, w: 200, h: 90 }, [120, 200, 120], 24);
  roundFill(bmp, { x: width - 320, y: height - 180, w: 200, h: 90 }, [230, 200, 90], 24);

  return bmp;
}

function hex(value: string): Rgb {
  const h = value.replace('#', '');
  const v = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function put(bmp: Bitmap, x: number, y: number, rgb: Rgb) {
  if (x < 0 || y < 0 || x >= bmp.width || y >= bmp.height) return;
  const p = (y * bmp.width + x) * 4;
  bmp.data[p] = rgb[0];
  bmp.data[p + 1] = rgb[1];
  bmp.data[p + 2] = rgb[2];
  bmp.data[p + 3] = 255;
}

function fill(bmp: Bitmap, rect: { x: number; y: number; w: number; h: number }, rgb: Rgb) {
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    for (let x = rect.x; x < rect.x + rect.w; x++) put(bmp, x, y, rgb);
  }
}

function roundFill(
  bmp: Bitmap,
  rect: { x: number; y: number; w: number; h: number },
  rgb: Rgb,
  radius: number,
) {
  const r = Math.min(radius, rect.w / 2, rect.h / 2);
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    for (let x = rect.x; x < rect.x + rect.w; x++) {
      const dx = Math.max(rect.x + r - x, x - (rect.x + rect.w - 1 - r), 0);
      const dy = Math.max(rect.y + r - y, y - (rect.y + rect.h - 1 - r), 0);
      if (dx * dx + dy * dy > r * r) continue;
      put(bmp, x, y, rgb);
    }
  }
}

function drawCross(bmp: Bitmap, rect: { x: number; y: number; w: number; h: number }) {
  const inset = rect.w * 0.26;
  const half = (rect.w * 0.11) / 2;
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    for (let x = rect.x; x < rect.x + rect.w; x++) {
      const lx = x - rect.x;
      const ly = y - rect.y;
      if (lx < inset || lx > rect.w - inset || ly < inset || ly > rect.h - inset) continue;
      const d1 = Math.abs(lx - ly) / Math.SQRT2;
      const d2 = Math.abs(lx + ly - (rect.w - 1)) / Math.SQRT2;
      if (Math.min(d1, d2) <= half) put(bmp, x, y, CARD);
    }
  }
}

function drawCat(bmp: Bitmap, rect: { x: number; y: number; w: number; h: number }) {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h * 0.58;
  const r = rect.w * 0.27;
  disc(bmp, cx, cy, r, DARK);
  triangle(bmp, rect, DARK);
  // 目と鼻（色クラスタを増やす）
  disc(bmp, cx - r * 0.38, cy - r * 0.2, r * 0.13, CARD);
  disc(bmp, cx + r * 0.38, cy - r * 0.2, r * 0.13, CARD);
  disc(bmp, cx, cy + r * 0.15, r * 0.11, PINK);
}

function catSilhouette(
  bmp: Bitmap,
  rect: { x: number; y: number; w: number; h: number },
  rgb: Rgb,
  solved: boolean,
) {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h * 0.58;
  const r = rect.w * 0.32;
  disc(bmp, cx, cy, r, rgb);
  triangle(bmp, rect, rgb);
  if (solved) {
    disc(bmp, cx - r * 0.36, cy - r * 0.15, r * 0.14, DARK);
    disc(bmp, cx + r * 0.36, cy - r * 0.15, r * 0.14, DARK);
    disc(bmp, cx, cy + r * 0.2, r * 0.12, DARK);
  }
}

function disc(bmp: Bitmap, cx: number, cy: number, r: number, rgb: Rgb) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) put(bmp, x, y, rgb);
    }
  }
}

function triangle(
  bmp: Bitmap,
  rect: { x: number; y: number; w: number; h: number },
  rgb: Rgb,
) {
  const earH = rect.h * 0.3;
  for (let k = 0; k < 2; k++) {
    const baseX = rect.x + (k === 0 ? rect.w * 0.2 : rect.w * 0.56);
    for (let y = 0; y < earH; y++) {
      const half = ((earH - y) / earH) * (rect.w * 0.12);
      const midX = baseX + rect.w * 0.12;
      for (let x = Math.round(midX - half); x <= Math.round(midX + half); x++) {
        put(bmp, x, Math.round(rect.y + rect.h * 0.22 + y), rgb);
      }
    }
  }
}
