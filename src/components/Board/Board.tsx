import { useCallback, useMemo, useRef, useState } from 'react';
import type { Mark, Marks } from '../../model/types';
import { CAT, CROSS, EMPTY } from '../../model/types';
import { idx, rc } from '../../model/board';
import { CatGlyph, CrossGlyph } from './Glyph';
import s from './Board.module.css';

export type CellAction = { i: number; to: Mark };
export type StrokePhase = 'start' | 'extend';

const CAT_PROMOTE_MS = 300;
const LONG_PRESS_MS = 300;

export type BoardProps = {
  n: number;
  regions: (number | null)[];
  palette: string[];
  user: Marks;
  imported: Marks;
  showImported: boolean;
  violations?: Set<number>;
  showBoundaries?: boolean;
  rowColHighlight?: boolean;
  /** false にすると入力を受け付けない（サムネイル等） */
  interactive?: boolean;
  onStroke?: (actions: CellAction[], phase: StrokePhase) => void;
  /** 補正UI用。セルを長押しではなくタップしたときに呼ばれる（onStroke の代わり） */
  onCellPaint?: (i: number) => void;
  onCellLongPress?: (i: number) => void;
};

type Gesture = {
  mode: 'paint' | 'erase' | 'none';
  visited: Set<number>;
};

export function Board({
  n,
  regions,
  palette,
  user,
  imported,
  showImported,
  violations,
  showBoundaries = false,
  rowColHighlight = false,
  interactive = true,
  onStroke,
  onCellPaint,
  onCellLongPress,
}: BoardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const lastCross = useRef<{ i: number; t: number } | null>(null);
  const longPress = useRef<number | null>(null);
  const [highlight, setHighlight] = useState<number | null>(null);

  /** ドラッグ中のセル判定は elementFromPoint ではなく BBox とピッチから計算する */
  const cellAt = useCallback(
    (clientX: number, clientY: number): number | null => {
      const el = ref.current;
      if (!el) return null;
      const box = el.getBoundingClientRect();
      const x = clientX - box.left;
      const y = clientY - box.top;
      if (x < 0 || y < 0 || x > box.width || y > box.height) return null;
      const pitchX = box.width / n;
      const pitchY = box.height / n;
      const c = Math.min(n - 1, Math.max(0, Math.floor(x / pitchX)));
      const r = Math.min(n - 1, Math.max(0, Math.floor(y / pitchY)));
      return idx(r, c, n);
    },
    [n],
  );

  const locked = useCallback(
    (i: number) => showImported && imported[i] !== EMPTY,
    [showImported, imported],
  );

  const clearLongPress = () => {
    if (longPress.current !== null) {
      clearTimeout(longPress.current);
      longPress.current = null;
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const i = cellAt(e.clientX, e.clientY);
    if (i === null) return;
    e.currentTarget.setPointerCapture(e.pointerId);

    if (onCellLongPress) {
      longPress.current = window.setTimeout(() => {
        longPress.current = null;
        gesture.current = null;
        onCellLongPress(i);
      }, LONG_PRESS_MS);
    } else if (rowColHighlight) {
      longPress.current = window.setTimeout(() => {
        longPress.current = null;
        setHighlight(i);
      }, LONG_PRESS_MS);
    }

    if (onCellPaint) {
      gesture.current = { mode: 'paint', visited: new Set([i]) };
      onCellPaint(i);
      return;
    }

    if (locked(i) || !onStroke) {
      gesture.current = { mode: 'none', visited: new Set([i]) };
      return;
    }

    const m = user[i];
    const now = performance.now();
    let action: CellAction;
    let mode: Gesture['mode'];

    if (m === CAT) {
      action = { i, to: EMPTY };
      mode = 'erase';
      lastCross.current = null;
    } else if (m === CROSS) {
      const recent =
        lastCross.current &&
        lastCross.current.i === i &&
        now - lastCross.current.t <= CAT_PROMOTE_MS;
      if (recent) {
        action = { i, to: CAT };
        mode = 'none';
        lastCross.current = null;
      } else {
        action = { i, to: EMPTY };
        mode = 'erase';
        lastCross.current = null;
      }
    } else {
      action = { i, to: CROSS };
      mode = 'paint';
      lastCross.current = { i, t: now };
    }

    gesture.current = { mode, visited: new Set([i]) };
    onStroke([action], 'start');
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g) return;
    const i = cellAt(e.clientX, e.clientY);
    if (i === null || g.visited.has(i)) return;
    clearLongPress();
    g.visited.add(i);

    if (onCellPaint) {
      onCellPaint(i);
      return;
    }
    if (g.mode === 'none' || !onStroke) return;
    if (locked(i)) return;

    const m = user[i];
    if (g.mode === 'paint' && m === EMPTY) onStroke([{ i, to: CROSS }], 'extend');
    else if (g.mode === 'erase' && m === CROSS) onStroke([{ i, to: EMPTY }], 'extend');
    // 猫のセルは飛ばす
  };

  const endGesture = () => {
    clearLongPress();
    gesture.current = null;
    setHighlight(null);
  };

  const boundaryShadows = useMemo(() => {
    if (!showBoundaries) return null;
    const out: (string | undefined)[] = new Array(n * n);
    for (let i = 0; i < n * n; i++) {
      const [r, c] = rc(i, n);
      const parts: string[] = [];
      if (r === 0 || regions[idx(r - 1, c, n)] !== regions[i]) parts.push('inset 0 1.5px 0 #fff');
      if (r === n - 1 || regions[idx(r + 1, c, n)] !== regions[i])
        parts.push('inset 0 -1.5px 0 #fff');
      if (c === 0 || regions[idx(r, c - 1, n)] !== regions[i]) parts.push('inset 1.5px 0 0 #fff');
      if (c === n - 1 || regions[idx(r, c + 1, n)] !== regions[i])
        parts.push('inset -1.5px 0 0 #fff');
      out[i] = parts.length ? parts.join(',') : undefined;
    }
    return out;
  }, [showBoundaries, regions, n]);

  const hlRow = highlight === null ? -1 : Math.floor(highlight / n);
  const hlCol = highlight === null ? -1 : highlight % n;

  return (
    <div
      ref={ref}
      className={s.wrap}
      style={{ ['--n' as string]: n }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
    >
      {Array.from({ length: n * n }, (_, i) => {
        const region = regions[i];
        const im = imported[i];
        const uv = user[i];
        const showImportedHere = showImported && im !== EMPTY;
        const mark: Mark = showImportedHere ? im : uv;
        const [r, c] = rc(i, n);
        const cls = [s.cell];
        if (mark === CAT) cls.push(s.cat);
        if (region === null || region === undefined) cls.push(s.unknown);
        if (violations?.has(i)) cls.push(s.violation);
        if (highlight !== null && (r === hlRow || c === hlCol)) cls.push(s.highlight);

        return (
          <div
            key={i}
            className={cls.join(' ')}
            style={{
              background: region == null ? undefined : palette[region],
              boxShadow: boundaryShadows?.[i],
            }}
          >
            {mark !== EMPTY && (
              <div
                className={`${s.fade} ${showImportedHere ? s.imported : ''}`}
                style={{ width: '100%', height: '100%' }}
              >
                {mark === CROSS ? <CrossGlyph /> : <CatGlyph />}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
