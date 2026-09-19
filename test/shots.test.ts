import { describe, expect, it } from 'vitest';
import { loadShot } from './fixtures/load';
import { analyzeBitmap } from '../src/vision/parse';
import { parseLabel } from '../src/vision/ocr';
import { regionsConnected, validateBoard } from '../src/model/board';

/**
 * 実機スクショに対する期待盤面。目視で確認した内容をそのまま固定している。
 * 1枚目 = デイリー 10×10（猫2匹・広告バナーあり）
 * 2枚目 = レギュラー 7×7（Dynamic Island と通知バナーでヘッダが潰れている）
 */

// prettier-ignore
const DAILY_REGIONS = [
  1,1,4,4,4,5,6,6,6,6,
  1,1,1,4,4,5,5,6,0,0,
  1,1,4,4,5,5,0,0,0,0,
  2,1,1,1,5,3,3,3,0,0,
  2,2,1,7,5,3,0,0,0,0,
  2,2,2,7,0,3,3,3,0,0,
  2,2,2,2,0,3,0,0,0,0,
  2,0,0,0,0,0,0,0,0,0,
  8,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,9,
];

// prettier-ignore
const DAILY_MARKS = [
  1,0,0,0,0,0,0,0,0,1,
  1,0,0,0,0,0,0,0,0,1,
  1,0,0,0,0,0,0,0,0,1,
  1,0,0,0,0,0,0,0,0,1,
  1,0,1,0,1,0,0,0,0,1,
  1,0,1,0,1,0,0,0,0,1,
  1,0,0,0,0,0,0,0,0,1,
  1,0,0,0,0,0,0,0,0,1,
  2,1,1,1,1,1,1,1,1,1,
  1,1,1,1,1,1,1,1,1,2,
];

// prettier-ignore
const LEVEL_REGIONS = [
  0,0,0,0,0,0,1,
  0,0,0,0,0,2,1,
  0,0,0,0,3,2,1,
  0,0,0,4,3,2,1,
  0,5,6,4,3,2,1,
  0,5,6,4,3,2,1,
  5,5,6,4,3,2,1,
];

// prettier-ignore
const LEVEL_MARKS = [
  0,0,1,1,1,1,0,
  0,0,1,1,1,0,0,
  0,0,1,1,0,0,0,
  0,0,1,0,0,0,0,
  0,0,0,0,0,0,0,
  1,1,0,1,0,0,0,
  0,0,0,0,0,0,0,
];

describe('daily-10x10.jpg（デイリー・猫2匹・広告バナーあり）', () => {
  const out = analyzeBitmap(loadShot('daily-10x10.jpg'));

  it('reads a 10x10 grid with no warnings', () => {
    expect(out.n).toBe(10);
    expect(out.warnings).toEqual([]);
    expect(out.ok).toBe(true);
  });

  it('finds ten chips, two of them already solved', () => {
    expect(out.debug.chips).toHaveLength(10);
    expect(out.debug.chips.filter((c) => c.solved)).toHaveLength(2);
  });

  it('reads the regions', () => {
    expect(out.regions).toEqual(DAILY_REGIONS);
    expect(out.palette).toHaveLength(10);
    expect(validateBoard(DAILY_REGIONS, 10)).toEqual([]);
    expect(regionsConnected(DAILY_REGIONS, 10)).toBe(true);
  });

  it('reads the cats and crosses', () => {
    expect(out.imported).toEqual(DAILY_MARKS);
    expect(out.imported.filter((m) => m === 2)).toHaveLength(2);
    expect(out.imported.filter((m) => m === 1)).toHaveLength(38);
  });
});

describe('level62-7x7.jpg（レギュラー・ヘッダが通知バナーで潰れている）', () => {
  const out = analyzeBitmap(loadShot('level62-7x7.jpg'));

  it('reads a 7x7 grid with no warnings', () => {
    expect(out.n).toBe(7);
    expect(out.warnings).toEqual([]);
    expect(out.ok).toBe(true);
  });

  it('finds seven chips, none solved', () => {
    expect(out.debug.chips).toHaveLength(7);
    expect(out.debug.chips.filter((c) => c.solved)).toHaveLength(0);
  });

  it('reads the regions', () => {
    expect(out.regions).toEqual(LEVEL_REGIONS);
    expect(out.palette).toHaveLength(7);
    expect(validateBoard(LEVEL_REGIONS, 7)).toEqual([]);
  });

  it('reads the crosses and finds no cat', () => {
    expect(out.imported).toEqual(LEVEL_MARKS);
    expect(out.imported.filter((m) => m === 1)).toHaveLength(13);
    expect(out.imported.filter((m) => m === 2)).toHaveLength(0);
  });
});

describe('label parsing', () => {
  it('formats a daily date', () => {
    expect(parseLabel('09/19')).toEqual({ label: 'Daily 9/19', kind: 'daily' });
  });
  it('formats a regular level', () => {
    expect(parseLabel('62')).toEqual({ label: 'Level 62', kind: 'regular' });
  });
  it('gives no name rather than a wrong one', () => {
    for (const noise of ['', 'L62', '6/2/3', 'ゲームモード', '1248']) {
      expect(parseLabel(noise).label === null || noise === '1248').toBe(true);
    }
    expect(parseLabel('ゲームモード').label).toBeNull();
  });
});
