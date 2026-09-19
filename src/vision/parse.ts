import type { BoardKind, Mark, Marks } from '../model/types';
import { CAT, CROSS, EMPTY } from '../model/types';
import type { Bitmap, Rect } from './bitmap';
import { cellSignals, classifyMark, matchPalette, sampleRegionColor } from './cells';
import { findChips, type Chip } from './chips';
import { cellRect, estimateN, findBoardRect, saturationMask } from './grid';
import { resolveUnknownRegions } from './regions';
import { neighbors8 } from '../model/board';

export type ParseResult = {
  ok: boolean;
  n: number;
  regions: (number | null)[];
  palette: string[];
  imported: Marks;
  label: string | null;
  kind: BoardKind;
  warnings: string[];
};

export type ParseDebug = {
  board: Rect | null;
  chips: Chip[];
};

/** §5 スクリーンショット読み取り。UI に依存しない */
export function analyzeBitmap(bmp: Bitmap): ParseResult & { debug: ParseDebug } {
  const warnings: string[] = [];
  const mask = saturationMask(bmp);
  const board = findBoardRect(bmp, mask);

  if (!board) {
    return {
      ok: false,
      n: 0,
      regions: [],
      palette: [],
      imported: [],
      label: null,
      kind: 'unknown',
      warnings: ['board-not-found'],
      debug: { board: null, chips: [] },
    };
  }

  const chips = findChips(bmp, mask, board);
  const fromPitch = estimateN(mask, bmp.width, board);
  // §5.2 チップ数と食い違ったらチップ数を優先する
  const n = chips.length >= 4 ? chips.length : (fromPitch ?? 0);
  if (!n) {
    return {
      ok: false,
      n: 0,
      regions: [],
      palette: [],
      imported: [],
      label: null,
      kind: 'unknown',
      warnings: ['grid-size-unknown'],
      debug: { board, chips },
    };
  }
  if (fromPitch && chips.length >= 4 && fromPitch !== chips.length) warnings.push('n-mismatch');
  if (chips.length < 4) warnings.push('chips-not-found');

  const palette = chips.length >= 4 ? chips.map((c) => c.color) : inferPalette(bmp, board, n);

  const regions: (number | null)[] = new Array(n * n).fill(null);
  const imported: Marks = new Array(n * n).fill(EMPTY) as Marks;
  const catCells: number[] = [];

  for (let i = 0; i < n * n; i++) {
    const rect = cellRect(board, n, i);
    const mark = classifyMark(cellSignals(bmp, rect));
    imported[i] = mark;
    if (mark === CAT) {
      // 猫セルの背景はハイライトで塗り替わっているので領域は不明のまま
      catCells.push(i);
      continue;
    }
    const color = sampleRegionColor(bmp, rect);
    regions[i] = color ? matchPalette(color, palette) : null;
  }

  const solvedRegions = chips.flatMap((c, k) => (c.solved ? [k] : []));
  const resolved = resolveUnknownRegions(regions, n, palette.length, catCells, solvedRegions);

  if (resolved.some((r) => r == null)) warnings.push('unknown-cells');
  if (new Set(resolved.filter((r) => r != null)).size !== n) warnings.push('region-count');
  warnings.push(...validateImported(imported, n));

  return {
    ok: warnings.length === 0,
    n,
    regions: resolved,
    palette,
    imported,
    label: null,
    kind: 'unknown',
    warnings,
    debug: { board, chips },
  };
}

/** §3 インポートした猫の検証 */
function validateImported(imported: Marks, n: number): string[] {
  const out: string[] = [];
  const cats = imported.flatMap((m, i) => (m === CAT ? [i] : []));
  if (cats.length > n) out.push('too-many-cats');
  const rows = new Set<number>();
  const cols = new Set<number>();
  for (const i of cats) {
    const r = Math.floor(i / n);
    const c = i % n;
    if (rows.has(r) || cols.has(c)) {
      out.push('cat-duplicate');
      break;
    }
    rows.add(r);
    cols.add(c);
  }
  const set = new Set(cats);
  for (const i of cats) {
    if (neighbors8(i, n).some((nb) => set.has(nb))) {
      out.push('cat-adjacent');
      break;
    }
  }
  return out;
}

/** チップ列が取れなかったときに、セル色そのものからパレットを起こす */
function inferPalette(bmp: Bitmap, board: Rect, n: number): string[] {
  const colors: string[] = [];
  for (let i = 0; i < n * n; i++) {
    const color = sampleRegionColor(bmp, cellRect(board, n, i));
    if (!color) continue;
    if (!colors.some((c) => matchPalette(color, [c]) !== null)) colors.push(color);
    if (colors.length >= n) break;
  }
  return colors;
}

export { CAT, CROSS, EMPTY };
export type { Mark };
