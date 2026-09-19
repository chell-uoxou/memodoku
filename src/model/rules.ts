import type { Marks } from './types';
import { CAT } from './types';
import { neighbors8, rc } from './board';

/**
 * ルール違反している猫セルの index 集合。
 * 行・列・領域の重複、および8近傍での隣接。
 */
export function violatingCats(marks: Marks, regions: number[], n: number): Set<number> {
  const bad = new Set<number>();
  const rows = new Map<number, number[]>();
  const cols = new Map<number, number[]>();
  const regs = new Map<number, number[]>();

  const cats: number[] = [];
  for (let i = 0; i < marks.length; i++) {
    if (marks[i] !== CAT) continue;
    cats.push(i);
    const [r, c] = rc(i, n);
    push(rows, r, i);
    push(cols, c, i);
    push(regs, regions[i], i);
  }

  for (const group of [rows, cols, regs]) {
    for (const cells of group.values()) {
      if (cells.length > 1) for (const i of cells) bad.add(i);
    }
  }

  const catSet = new Set(cats);
  for (const i of cats) {
    for (const nb of neighbors8(i, n)) {
      if (catSet.has(nb)) {
        bad.add(i);
        bad.add(nb);
      }
    }
  }
  return bad;
}

function push(map: Map<number, number[]>, key: number, value: number) {
  const g = map.get(key);
  if (g) g.push(value);
  else map.set(key, [value]);
}

/**
 * 猫を置いたセルから、自動でバツを置くべきセルの index を返す。
 * 同じ行・列・領域・8近傍。呼び出し側で「空のセルだけ」に絞る。
 */
export function autoExcludeTargets(i: number, regions: number[], n: number): number[] {
  const [r, c] = rc(i, n);
  const out = new Set<number>();
  for (let k = 0; k < n; k++) {
    out.add(r * n + k);
    out.add(k * n + c);
  }
  const region = regions[i];
  for (let k = 0; k < regions.length; k++) {
    if (regions[k] === region) out.add(k);
  }
  for (const nb of neighbors8(i, n)) out.add(nb);
  out.delete(i);
  return [...out];
}
