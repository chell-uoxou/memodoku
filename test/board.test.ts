import { describe, expect, it } from 'vitest';
import {
  computeBoardId,
  disconnectedCells,
  normalizeRegions,
  regionsConnected,
  validateBoard,
} from '../src/model/board';
import { autoExcludeTargets, violatingCats } from '../src/model/rules';
import type { Mark } from '../src/model/types';

describe('regions', () => {
  it('normalizes colour order', () => {
    expect(normalizeRegions([3, 3, 7, 1])).toEqual([0, 0, 1, 2]);
  });

  it('gives the same board id regardless of colour order', async () => {
    const a = [2, 2, 5, 5];
    const b = [9, 9, 0, 0];
    expect(await computeBoardId(a)).toBe(await computeBoardId(b));
  });

  it('detects disconnected regions', () => {
    // 0 1 / 1 0  → どちらの領域も対角に分かれている
    const regions = [0, 1, 1, 0];
    expect(regionsConnected(regions, 2)).toBe(false);
    expect(disconnectedCells(regions, 2).size).toBe(2);
    expect(validateBoard(regions, 2)).toContain('region-connectivity');
  });

  it('accepts a well formed board', () => {
    const regions = [0, 0, 1, 1];
    expect(validateBoard(regions, 2)).toEqual([]);
  });
});

describe('rules', () => {
  const n = 4;
  const regions = Array.from({ length: 16 }, (_, i) => Math.floor(i / 4));

  it('flags cats sharing a row', () => {
    const marks = new Array(16).fill(0) as Mark[];
    marks[0] = 2;
    marks[2] = 2;
    expect([...violatingCats(marks, regions, n)].sort()).toEqual([0, 2]);
  });

  it('flags diagonally adjacent cats', () => {
    const marks = new Array(16).fill(0) as Mark[];
    marks[0] = 2;
    marks[5] = 2;
    expect([...violatingCats(marks, regions, n)].sort()).toEqual([0, 5]);
  });

  it('accepts a legal placement', () => {
    const marks = new Array(16).fill(0) as Mark[];
    marks[1] = 2; // row0 col1
    marks[6] = 2; // row1 col2 → 斜めに隣接
    expect(violatingCats(marks, regions, n).size).toBe(2);
    const ok = new Array(16).fill(0) as Mark[];
    ok[0] = 2; // row0 col0
    ok[7] = 2; // row1 col3 → 隣接しない
    expect(violatingCats(ok, regions, n).size).toBe(0);
  });

  it('auto-exclude covers row, column, region and neighbours', () => {
    const targets = new Set(autoExcludeTargets(5, regions, n));
    expect(targets.has(5)).toBe(false);
    for (const i of [4, 6, 7]) expect(targets.has(i)).toBe(true); // 行
    for (const i of [1, 9, 13]) expect(targets.has(i)).toBe(true); // 列
    for (const i of [0, 2, 8, 10]) expect(targets.has(i)).toBe(true); // 8近傍
  });
});
