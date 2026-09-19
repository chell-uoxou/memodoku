import { describe, expect, it } from 'vitest';
import { renderFixture } from './fixtures/render';
import { analyzeBitmap } from '../src/vision/parse';
import { findBoardRect, saturationMask, estimateN } from '../src/vision/grid';
import { ciede2000, rgbToLab } from '../src/vision/color';
import type { Mark } from '../src/model/types';
import { normalizeRegions } from '../src/model/board';

const PALETTE = [
  '#e07a5f',
  '#a7c957',
  '#5fa8d3',
  '#b07bd6',
  '#e5b93c',
  '#5cbf9e',
  '#d96ba0',
];

/** 行ごとに1領域の N×N 盤面 */
function rowRegions(n: number): number[] {
  return Array.from({ length: n * n }, (_, i) => Math.floor(i / n));
}

describe('grid detection', () => {
  for (const n of [5, 7, 10]) {
    it(`finds a ${n}x${n} board`, () => {
      const bmp = renderFixture({
        n,
        regions: rowRegions(n),
        palette: PALETTE.slice(0, n).concat(PALETTE).slice(0, n),
        marks: new Array(n * n).fill(0) as Mark[],
      });
      const mask = saturationMask(bmp);
      const rect = findBoardRect(bmp, mask);
      expect(rect).not.toBeNull();
      expect(rect!.w / rect!.h).toBeGreaterThan(0.95);
      expect(rect!.w / rect!.h).toBeLessThan(1.05);
      expect(estimateN(mask, bmp.width, rect!)).toBe(n);
    });
  }

  it('still finds the board when cells touch with no gap', () => {
    const n = 7;
    const bmp = renderFixture({
      n,
      regions: rowRegions(n),
      palette: PALETTE.slice(0, n),
      marks: new Array(n * n).fill(0) as Mark[],
      gap: 0,
    });
    const rect = findBoardRect(bmp, saturationMask(bmp));
    expect(rect).not.toBeNull();
  });
});

describe('analyzeBitmap', () => {
  const n = 7;
  const regions = rowRegions(n);
  const palette = PALETTE.slice(0, n);

  it('reads regions, crosses and cats', () => {
    const marks = new Array(n * n).fill(0) as Mark[];
    marks[1] = 2; // row0 col1 に猫
    marks[3] = 1; // バツ
    marks[10] = 1;
    marks[16] = 2; // row2 col2 に猫
    const bmp = renderFixture({ n, regions, palette, marks });
    const out = analyzeBitmap(bmp);

    expect(out.n).toBe(n);
    expect(out.imported).toEqual(marks);
    // パレットの並び順は出現頻度で決まるので、区切り方が同じかどうかで見る
    expect(normalizeRegions(out.regions as number[])).toEqual(normalizeRegions(regions));
    expect(out.palette).toHaveLength(n);
    // パレットはセル色から起こすので並び順はチップ順とは限らない。集合として見る
    for (const want of palette) {
      const nearest = Math.min(
        ...out.palette.map((got) => ciede2000(rgbToLab(...hex(got)), rgbToLab(...hex(want)))),
      );
      expect(nearest).toBeLessThan(6);
    }
  });

  it('leaves the board clean when the screenshot has no marks', () => {
    const bmp = renderFixture({
      n,
      regions,
      palette,
      marks: new Array(n * n).fill(0) as Mark[],
    });
    const out = analyzeBitmap(bmp);
    expect(out.imported.every((m) => m === 0)).toBe(true);
    expect(normalizeRegions(out.regions as number[])).toEqual(normalizeRegions(regions));
    expect(out.warnings).toEqual([]);
    expect(out.ok).toBe(true);
  });

  it('recovers the region under a cat from its neighbours', () => {
    const marks = new Array(n * n).fill(0) as Mark[];
    marks[n * 3 + 3] = 2; // 領域3の真ん中に猫
    const bmp = renderFixture({ n, regions, palette, marks });
    const out = analyzeBitmap(bmp);
    expect(out.regions.some((r) => r == null)).toBe(false);
    // 猫のセルが同じ行の他のセルと同じ領域に収まっていること
    expect(out.regions[n * 3 + 3]).toBe(out.regions[n * 3]);
  });

  it('handles a 10x10 board', () => {
    const n10 = 10;
    const palette10 = [
      ...PALETTE,
      '#8c6ad6',
      '#3f9e6f',
      '#c2703a',
    ];
    const marks = new Array(n10 * n10).fill(0) as Mark[];
    marks[5] = 1;
    marks[23] = 2;
    const bmp = renderFixture({
      n: n10,
      regions: rowRegions(n10),
      palette: palette10,
      marks,
    });
    const out = analyzeBitmap(bmp);
    expect(out.n).toBe(n10);
    expect(out.imported[5]).toBe(1);
    expect(out.imported[23]).toBe(2);
  });

  it('reports a warning instead of guessing when there is no board', () => {
    const bmp = {
      width: 200,
      height: 200,
      data: new Uint8ClampedArray(200 * 200 * 4).fill(240),
    };
    const out = analyzeBitmap(bmp);
    expect(out.ok).toBe(false);
    expect(out.warnings).toContain('board-not-found');
  });
});

function hex(value: string): [number, number, number] {
  const h = value.replace('#', '');
  const v = parseInt(h, 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
