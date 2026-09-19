import { describe, expect, it } from 'vitest';
import { boardImageName } from '../src/share/image';

describe('boardImageName', () => {
  it('joins the board name, memo name and page number', () => {
    expect(boardImageName('Level 62', 'Shared - 2026/09/20 - 1', 4)).toBe(
      'Level 62_Shared - 20260920 - 1_4.png',
    );
  });

  it('drops characters a filename cannot hold', () => {
    expect(boardImageName('A/B:C', 'D*E?F', 1)).toBe('ABC_DEF_1.png');
  });

  it('falls back to the app name when both names are empty', () => {
    expect(boardImageName('', '', 4)).toBe('memodoku_4.png');
    expect(boardImageName('   ', '/', 1)).toBe('memodoku_1.png');
  });

  it('skips empty parts', () => {
    expect(boardImageName('', '2026/09/20', 2)).toBe('20260920_2.png');
    expect(boardImageName('Level 62', '', 1)).toBe('Level 62_1.png');
  });
});
