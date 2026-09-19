import { describe, expect, it } from 'vitest';
import { sha256 } from '../src/model/sha256';

const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');

describe('sha256 fallback', () => {
  it('matches crypto.subtle for the strings we hash', async () => {
    const samples = [
      '',
      'abc',
      '0,0,1,1',
      Array.from({ length: 144 }, (_, i) => i % 12).join(','),
      'あ'.repeat(200),
    ];
    for (const s of samples) {
      const bytes = new TextEncoder().encode(s);
      const want = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
      expect(hex(sha256(bytes))).toBe(hex(want));
    }
  });
});
