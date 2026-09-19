import type { BoardKind, Marks } from '../model/types';
import { CAT, EMPTY } from '../model/types';
import type { Bitmap, Rect } from './bitmap';
import { cellSignals, classifyMark, matchPalette, MAX_DELTA_E, sampleRegionColor } from './cells';
import { ciede2000, rgbToLab } from './color';
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

const EMPTY_RESULT = (warnings: string[], debug: ParseDebug) => ({
  ok: false,
  n: 0,
  regions: [] as (number | null)[],
  palette: [] as string[],
  imported: [] as Marks,
  label: null,
  kind: 'unknown' as const,
  warnings,
  debug,
});

/** §5 スクリーンショット読み取り。UI に依存しない */
export function analyzeBitmap(bmp: Bitmap): ParseResult & { debug: ParseDebug } {
  const warnings: string[] = [];
  const mask = saturationMask(bmp);
  const board = findBoardRect(bmp, mask);
  if (!board) return EMPTY_RESULT(['board-not-found'], { board: null, chips: [] });

  const chips = findChips(bmp, board);
  const fromPitch = estimateN(mask, bmp.width, board);
  // §5.2 チップ数は強い制約なので、はっきり列として取れたときは優先する
  const n = chips.length >= 4 ? chips.length : (fromPitch ?? 0);
  if (!n) return EMPTY_RESULT(['grid-size-unknown'], { board, chips });
  if (fromPitch && chips.length >= 4 && fromPitch !== chips.length) warnings.push('n-mismatch');
  if (chips.length < 4) warnings.push('chips-not-found');

  // セルの判定を先に済ませる。猫セルの背景は領域色ではないので色は使わない
  const imported: Marks = new Array(n * n).fill(EMPTY) as Marks;
  const colors: (string | null)[] = new Array(n * n).fill(null);
  const catCells: number[] = [];
  for (let i = 0; i < n * n; i++) {
    const rect = cellRect(board, n, i);
    const mark = classifyMark(cellSignals(bmp, rect));
    imported[i] = mark;
    if (mark === CAT) catCells.push(i);
    colors[i] = sampleRegionColor(bmp, rect);
  }

  // パレットは猫以外のセル色から起こす。チップは顔になっていると色を持たないため
  const palette = clusterColors(colors.filter((c, i) => c && imported[i] !== CAT) as string[]);
  const regions: (number | null)[] = new Array(n * n).fill(null);
  for (let i = 0; i < n * n; i++) {
    if (imported[i] === CAT || !colors[i]) continue;
    regions[i] = matchPalette(colors[i]!, palette);
  }

  const known = new Set(regions.filter((r): r is number => r != null));
  // 既知の領域数 + 不明セル数 = N なら、不明セルはそれぞれ単独の領域にしかなり得ない
  const unknown = regions.flatMap((r, i) => (r == null ? [i] : []));
  if (known.size + unknown.length === n && unknown.length > 0) {
    for (const i of unknown) {
      const color = colors[i];
      regions[i] = palette.length;
      palette.push(color ?? '#cccccc');
    }
  }

  const solvedRegions = solvedPaletteIndices(chips, palette);
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

/**
 * 顔になっているチップは色を持たないので、色を持つチップを近い順にパレットへ
 * 1対1で割り当て、余ったパレット番号が「既に猫が置かれている領域」になる。
 */
function solvedPaletteIndices(chips: Chip[], palette: string[]): number[] {
  if (!chips.length || chips.length !== palette.length) return [];
  if (!chips.some((c) => c.solved)) return [];
  const labs = palette.map((p) => rgbToLab(...toRgb(p)));
  const taken = new Set<number>();
  const pairs: { chip: number; slot: number; d: number }[] = [];
  chips.forEach((chip, k) => {
    if (chip.solved) return;
    const lab = rgbToLab(...toRgb(chip.color));
    labs.forEach((p, slot) => pairs.push({ chip: k, slot, d: ciede2000(lab, p) }));
  });
  pairs.sort((a, b) => a.d - b.d);
  const usedChips = new Set<number>();
  for (const pair of pairs) {
    if (usedChips.has(pair.chip) || taken.has(pair.slot)) continue;
    usedChips.add(pair.chip);
    taken.add(pair.slot);
  }
  return palette.map((_, k) => k).filter((k) => !taken.has(k));
}

/** 近い色をまとめて、出現数の多い順に並べたパレットを作る */
function clusterColors(colors: string[]): string[] {
  const clusters: { hex: string; lab: ReturnType<typeof rgbToLab>; count: number }[] = [];
  for (const hex of colors) {
    const lab = rgbToLab(...toRgb(hex));
    const hit = clusters.find((c) => ciede2000(c.lab, lab) <= MAX_DELTA_E);
    if (hit) hit.count++;
    else clusters.push({ hex, lab, count: 1 });
  }
  return clusters.sort((a, b) => b.count - a.count).map((c) => c.hex);
}

function toRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.replace('#', ''), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
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
