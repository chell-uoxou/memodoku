import type { Board, BoardKind, Marks } from './types';
import { EMPTY } from './types';

export function emptyMarks(n: number): Marks {
  return new Array(n * n).fill(EMPTY) as Marks;
}

export function rc(i: number, n: number): [number, number] {
  return [Math.floor(i / n), i % n];
}

export function idx(r: number, c: number, n: number): number {
  return r * n + c;
}

/** 4近傍 */
export function neighbors4(i: number, n: number): number[] {
  const [r, c] = rc(i, n);
  const out: number[] = [];
  if (r > 0) out.push(idx(r - 1, c, n));
  if (r < n - 1) out.push(idx(r + 1, c, n));
  if (c > 0) out.push(idx(r, c - 1, n));
  if (c < n - 1) out.push(idx(r, c + 1, n));
  return out;
}

/** 8近傍 */
export function neighbors8(i: number, n: number): number[] {
  const [r, c] = rc(i, n);
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
      out.push(idx(nr, nc, n));
    }
  }
  return out;
}

/**
 * regions を row-major に走査して初出順で 0,1,2… に振り直す。
 * 色の並び順が違う同じ盤面を同一視するための正規化。
 */
export function normalizeRegions(regions: number[]): number[] {
  const map = new Map<number, number>();
  const out = new Array<number>(regions.length);
  for (let i = 0; i < regions.length; i++) {
    const v = regions[i];
    let m = map.get(v);
    if (m === undefined) {
      m = map.size;
      map.set(v, m);
    }
    out[i] = m;
  }
  return out;
}

/** 正規化した regions の SHA-256 先頭16文字 */
export async function computeBoardId(regions: number[]): Promise<string> {
  const norm = normalizeRegions(regions);
  const bytes = new TextEncoder().encode(norm.join(','));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

/** 各領域が4近傍で連結しているか */
export function regionsConnected(regions: number[], n: number): boolean {
  const groups = new Map<number, number[]>();
  for (let i = 0; i < regions.length; i++) {
    const g = groups.get(regions[i]);
    if (g) g.push(i);
    else groups.set(regions[i], [i]);
  }
  for (const [region, cells] of groups) {
    const set = new Set(cells);
    const stack = [cells[0]];
    const seen = new Set<number>([cells[0]]);
    while (stack.length) {
      const cur = stack.pop()!;
      for (const nb of neighbors4(cur, n)) {
        if (set.has(nb) && !seen.has(nb) && regions[nb] === region) {
          seen.add(nb);
          stack.push(nb);
        }
      }
    }
    if (seen.size !== cells.length) return false;
  }
  return true;
}

/** §3 の不変条件。満たさない項目を文字列キーで返す */
export function validateBoard(regions: number[], n: number): string[] {
  const warnings: string[] = [];
  if (regions.length !== n * n) warnings.push('cell-count');
  const distinct = new Set(regions);
  if (distinct.size !== n) warnings.push('region-count');
  if (!regionsConnected(regions, n)) warnings.push('region-connectivity');
  return warnings;
}

export function makeBoard(
  id: string,
  n: number,
  regions: number[],
  palette: string[],
  label: string,
  kind: BoardKind,
): Board {
  return { id, n, regions, palette, label, kind };
}
