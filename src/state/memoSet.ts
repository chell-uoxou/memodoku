import { useCallback, useMemo, useRef, useState } from 'react';
import type { Board, Mark, Marks, Memo, MemoSet } from '../model/types';
import { CAT, EMPTY, CROSS } from '../model/types';
import { emptyMarks } from '../model/board';
import { autoExcludeTargets } from '../model/rules';
import { haptics } from './haptics';
import type { CellAction, StrokePhase } from '../components/Board/Board';

export type Change = { i: number; from: Mark; to: Mark };
type History = { undo: Change[][]; redo: Change[][] };

const DEPTH = 100;

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function newMemo(n: number): Memo {
  return { id: newId(), showImported: false, user: emptyMarks(n) };
}

export function newMemoSet(board: Board, imported?: Marks, name?: string): MemoSet {
  const now = Date.now();
  return {
    id: newId(),
    boardId: board.id,
    name: name ?? formatToday(now),
    imported: imported ?? emptyMarks(board.n),
    memos: [newMemo(board.n)],
    activeIndex: 0,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 同じ名前が既にあれば " - 1", " - 2" と連番を足す。メモ名にも盤面名にも使う。
 * ぶつかったときだけ末尾の連番を落として根っこから数え直すので、
 * 「A - 1」を複製すると「A - 1 - 1」ではなく「A - 2」になる。
 */
export function uniqueName(base: string, existing: Iterable<string>): string {
  const taken = new Set(existing);
  if (!taken.has(base)) return base;
  // ぶつかったときだけ、末尾の連番を落として根っこから数え直す
  const root = base.replace(/ - \d+$/, '').trim() || base;
  for (let i = 1; ; i++) {
    const candidate = `${root} - ${i}`;
    if (!taken.has(candidate)) return candidate;
  }
}

export function formatToday(t = Date.now()): string {
  const d = new Date(t);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())}`;
}

export function useMemoSet(initial: MemoSet, n: number, regions: number[]) {
  const [memoSet, setMemoSet] = useState<MemoSet>(initial);
  const initialRef = useRef(initial);
  const histories = useRef(new Map<string, History>());
  const [, bump] = useState(0);

  const active = memoSet.memos[memoSet.activeIndex];

  const history = useCallback((memoId: string): History => {
    let h = histories.current.get(memoId);
    if (!h) {
      h = { undo: [], redo: [] };
      histories.current.set(memoId, h);
    }
    return h;
  }, []);

  const writeMemo = useCallback(
    (memoId: string, mutate: (memo: Memo) => Memo) => {
      setMemoSet((prev) => ({
        ...prev,
        memos: prev.memos.map((m) => (m.id === memoId ? mutate(m) : m)),
        updatedAt: Date.now(),
      }));
    },
    [],
  );

  /** changes を user に適用した新しい Marks */
  const applyChanges = (user: Marks, changes: Change[], reverse = false): Marks => {
    const next = user.slice() as Marks;
    for (const ch of changes) next[ch.i] = reverse ? ch.from : ch.to;
    return next;
  };

  const onStroke = useCallback(
    (actions: CellAction[], phase: StrokePhase, autoExclude: boolean) => {
      const memo = memoSet.memos[memoSet.activeIndex];
      const changes: Change[] = [];
      const user = memo.user;
      const staged = new Map<number, Mark>();
      const valueAt = (i: number) => staged.get(i) ?? user[i];

      for (const a of actions) {
        const from = valueAt(a.i);
        if (from === a.to) continue;
        // 印を付けるたびに手応えを返す。猫はバツより強く
        if (a.to === CAT) haptics.cat();
        else haptics.mark();
        changes.push({ i: a.i, from, to: a.to });
        staged.set(a.i, a.to);

        // §7.4 自動除外: 猫を置いたとき同じ行・列・色・8近傍を空セルに限りバツで埋める
        if (autoExclude && a.to === CAT) {
          for (const t of autoExcludeTargets(a.i, regions, n)) {
            if (valueAt(t) !== EMPTY) continue;
            changes.push({ i: t, from: EMPTY, to: CROSS });
            staged.set(t, CROSS);
          }
        }
      }
      if (!changes.length) return;

      const h = history(memo.id);
      if (phase === 'start') {
        h.undo.push(changes);
        if (h.undo.length > DEPTH) h.undo.shift();
        h.redo.length = 0;
      } else {
        const top = h.undo[h.undo.length - 1];
        if (top) top.push(...changes);
        else h.undo.push(changes);
      }
      writeMemo(memo.id, (m) => ({ ...m, user: applyChanges(m.user, changes) }));
      bump((x) => x + 1);
    },
    [memoSet, regions, n, history, writeMemo],
  );

  const undo = useCallback(() => {
    const memo = memoSet.memos[memoSet.activeIndex];
    const h = history(memo.id);
    const changes = h.undo.pop();
    if (!changes) return;
    h.redo.push(changes);
    writeMemo(memo.id, (m) => ({ ...m, user: applyChanges(m.user, changes, true) }));
    bump((x) => x + 1);
  }, [memoSet, history, writeMemo]);

  const redo = useCallback(() => {
    const memo = memoSet.memos[memoSet.activeIndex];
    const h = history(memo.id);
    const changes = h.redo.pop();
    if (!changes) return;
    h.undo.push(changes);
    writeMemo(memo.id, (m) => ({ ...m, user: applyChanges(m.user, changes) }));
    bump((x) => x + 1);
  }, [memoSet, history, writeMemo]);

  /**
   * 読み込んだ時点から中身が変わっているメモの id。
   * 共有リンクで開いたときに「共有されたものと違う」ことを示すために使う。
   */
  const changedIds = useMemo(() => {
    const base = new Map(initialRef.current.memos.map((m) => [m.id, m.user]));
    const out = new Set<string>();
    for (const memo of memoSet.memos) {
      const before = base.get(memo.id);
      if (!before) {
        if (memo.user.some((m) => m !== EMPTY)) out.add(memo.id);
        continue;
      }
      if (before.length !== memo.user.length || before.some((v, i) => v !== memo.user[i])) {
        out.add(memo.id);
      }
    }
    return out;
  }, [memoSet]);

  const canUndo = history(active.id).undo.length > 0;
  const canRedo = history(active.id).redo.length > 0;

  const toggleImported = useCallback(() => {
    writeMemo(active.id, (m) => ({ ...m, showImported: !m.showImported }));
  }, [active.id, writeMemo]);

  const setActiveIndex = useCallback((i: number) => {
    setMemoSet((prev) =>
      prev.activeIndex === i ? prev : { ...prev, activeIndex: i },
    );
  }, []);

  const addMemo = useCallback(() => {
    setMemoSet((prev) => ({
      ...prev,
      memos: [...prev.memos, newMemo(n)],
      activeIndex: prev.memos.length,
      updatedAt: Date.now(),
    }));
  }, [n]);

  const duplicateMemo = useCallback((index: number) => {
    setMemoSet((prev) => {
      const src = prev.memos[index];
      const copy: Memo = { ...src, id: newId(), user: src.user.slice() as Marks };
      const memos = [...prev.memos];
      memos.splice(index + 1, 0, copy);
      return { ...prev, memos, activeIndex: index + 1, updatedAt: Date.now() };
    });
  }, []);

  const deleteMemo = useCallback((index: number) => {
    setMemoSet((prev) => {
      if (prev.memos.length <= 1) return prev;
      const memos = prev.memos.filter((_, k) => k !== index);
      const activeIndex = Math.min(prev.activeIndex, memos.length - 1);
      return { ...prev, memos, activeIndex, updatedAt: Date.now() };
    });
  }, []);

  /** §11.3 共有ページのリセット。今見ているメモだけを初期状態に戻す */
  const resetActive = useCallback(() => {
    const index = memoSet.activeIndex;
    const memo = memoSet.memos[index];
    const source = initialRef.current.memos[index];
    const target = (source ? source.user.slice() : emptyMarks(n)) as Marks;
    const changes: Change[] = [];
    for (let i = 0; i < target.length; i++) {
      if (memo.user[i] !== target[i]) changes.push({ i, from: memo.user[i], to: target[i] });
    }
    if (!changes.length) return;
    const h = history(memo.id);
    h.undo.push(changes);
    h.redo.length = 0;
    writeMemo(memo.id, (m) => ({ ...m, user: target }));
    bump((x) => x + 1);
  }, [memoSet, n, history, writeMemo]);

  const api = useMemo(
    () => ({
      memoSet,
      setMemoSet,
      active,
      onStroke,
      undo,
      redo,
      canUndo,
      canRedo,
      changedIds,
      toggleImported,
      setActiveIndex,
      addMemo,
      duplicateMemo,
      deleteMemo,
      resetActive,
    }),
    [
      memoSet,
      active,
      onStroke,
      undo,
      redo,
      canUndo,
      canRedo,
      changedIds,
      toggleImported,
      setActiveIndex,
      addMemo,
      duplicateMemo,
      deleteMemo,
      resetActive,
    ],
  );

  return api;
}
