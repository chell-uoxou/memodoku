import { describe, expect, it } from 'vitest';
import { uniqueName } from '../src/state/memoSet';

describe('uniqueName', () => {
  it('keeps the name when nothing collides', () => {
    expect(uniqueName('2026/09/20', [])).toBe('2026/09/20');
    expect(uniqueName('2026/09/20', ['2026/09/19'])).toBe('2026/09/20');
  });

  it('adds a running number on collision', () => {
    expect(uniqueName('2026/09/20', ['2026/09/20'])).toBe('2026/09/20 - 1');
    expect(uniqueName('2026/09/20', ['2026/09/20', '2026/09/20 - 1'])).toBe(
      '2026/09/20 - 2',
    );
  });

  it('fills a gap in the numbering', () => {
    expect(uniqueName('A', ['A', 'A - 2'])).toBe('A - 1');
  });

  it('counts from the root when the source is already numbered', () => {
    expect(uniqueName('A - 1', ['A', 'A - 1'])).toBe('A - 2');
    expect(uniqueName('A - 3', ['A - 3'])).toBe('A - 1');
  });

  it('leaves a name that only looks numbered alone when it is free', () => {
    expect(uniqueName('Level 62', ['Daily 9/19'])).toBe('Level 62');
  });
});
