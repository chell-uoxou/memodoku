import { describe, expect, it } from 'vitest';
import { uniqueMemoName } from '../src/state/memoSet';

describe('uniqueMemoName', () => {
  it('keeps the name when nothing collides', () => {
    expect(uniqueMemoName('2026/09/20', [])).toBe('2026/09/20');
    expect(uniqueMemoName('2026/09/20', ['2026/09/19'])).toBe('2026/09/20');
  });

  it('adds a running number on collision', () => {
    expect(uniqueMemoName('2026/09/20', ['2026/09/20'])).toBe('2026/09/20 - 1');
    expect(uniqueMemoName('2026/09/20', ['2026/09/20', '2026/09/20 - 1'])).toBe(
      '2026/09/20 - 2',
    );
  });

  it('fills a gap in the numbering', () => {
    expect(uniqueMemoName('A', ['A', 'A - 2'])).toBe('A - 1');
  });

  it('counts from the root when the source is already numbered', () => {
    expect(uniqueMemoName('A - 1', ['A', 'A - 1'])).toBe('A - 2');
    expect(uniqueMemoName('A - 3', ['A - 3'])).toBe('A - 1');
  });

  it('leaves a name that only looks numbered alone when it is free', () => {
    expect(uniqueMemoName('Level 62', ['Daily 9/19'])).toBe('Level 62');
  });
});
