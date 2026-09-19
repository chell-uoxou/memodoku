import { describe, expect, it } from 'vitest';
import { decodeShare, encodeShare } from '../src/share/codec';
import type { Board, Mark, MemoSet } from '../src/model/types';
import { computeBoardId, fallbackPalette } from '../src/model/board';

async function sample(n = 7): Promise<{ board: Board; memoSet: MemoSet }> {
  const regions = Array.from({ length: n * n }, (_, i) => Math.floor(i / n));
  const id = await computeBoardId(regions);
  const board: Board = {
    id,
    n,
    regions,
    palette: fallbackPalette(n),
    label: 'Level 62',
    kind: 'regular',
  };
  const user = new Array(n * n).fill(0) as Mark[];
  user[0] = 1;
  user[8] = 2;
  const memoSet: MemoSet = {
    id: 'set',
    boardId: id,
    name: '2026/09/19',
    imported: new Array(n * n).fill(0).map((_, i) => (i === 3 ? 2 : 0)) as Mark[],
    memos: [
      { id: 'a', showImported: false, user },
      { id: 'b', showImported: true, user: new Array(n * n).fill(0) as Mark[] },
    ],
    activeIndex: 0,
    createdAt: 1,
    updatedAt: 1,
  };
  return { board, memoSet };
}

describe('share codec', () => {
  it('round-trips a board and memo set', async () => {
    const { board, memoSet } = await sample();
    const payload = await encodeShare(board, memoSet);
    const out = await decodeShare(payload);
    expect(out).not.toBeNull();
    expect(out!.board.n).toBe(board.n);
    expect(out!.board.regions).toEqual(board.regions);
    expect(out!.board.palette).toEqual(board.palette);
    expect(out!.board.label).toBe('Level 62');
    expect(out!.board.kind).toBe('regular');
    expect(out!.board.id).toBe(board.id);
    expect(out!.memoSet.name).toBe('2026/09/19');
    expect(out!.memoSet.imported).toEqual(memoSet.imported);
    expect(out!.memoSet.memos.map((m) => m.user)).toEqual(memoSet.memos.map((m) => m.user));
    expect(out!.memoSet.memos.map((m) => m.showImported)).toEqual([false, true]);
  });

  it('keeps 11x11 with 5 memos short enough to paste', async () => {
    const n = 11;
    const regions = Array.from({ length: n * n }, (_, i) => Math.floor(i / n));
    const id = await computeBoardId(regions);
    const board: Board = {
      id,
      n,
      regions,
      palette: fallbackPalette(n),
      label: 'Level 62',
      kind: 'regular',
    };
    const memoSet: MemoSet = {
      id: 'set',
      boardId: id,
      name: '2026/09/19',
      imported: new Array(n * n).fill(0) as Mark[],
      memos: Array.from({ length: 5 }, (_, k) => ({
        id: `m${k}`,
        showImported: false,
        user: new Array(n * n).fill(0) as Mark[],
      })),
      activeIndex: 0,
      createdAt: 1,
      updatedAt: 1,
    };
    const payload = await encodeShare(board, memoSet);
    expect(payload.length).toBeLessThan(900);
  });

  it('rejects garbage', async () => {
    expect(await decodeShare('!!!!')).toBeNull();
    expect(await decodeShare('')).toBeNull();
  });
});
