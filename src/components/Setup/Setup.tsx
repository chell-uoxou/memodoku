import { useMemo, useRef, useState } from 'react';
import type { Board, BoardKind, Mark, Marks } from '../../model/types';
import {
  computeBoardId,
  disconnectedCells,
  emptyMarks,
  fallbackPalette,
} from '../../model/board';
import { violatingCats } from '../../model/rules';
import { Board as BoardView } from '../Board/Board';
import { IconButton } from '../ui';
import { BackIcon } from '../ui/Icons';
import s from './Setup.module.css';

export type SetupInput = {
  n: number;
  regions: (number | null)[];
  palette: string[];
  imported: Marks;
  label: string | null;
  kind: BoardKind;
};

export function blankSetup(n: number): SetupInput {
  return {
    n,
    regions: new Array(n * n).fill(null),
    palette: fallbackPalette(n),
    imported: emptyMarks(n),
    label: null,
    kind: 'unknown',
  };
}

const MIN_N = 4;
const MAX_N = 14;

export function Setup({
  input,
  onCancel,
  onDone,
}: {
  input: SetupInput;
  onCancel: () => void;
  onDone: (board: Board, imported: Marks) => void;
}) {
  const [n, setN] = useState(input.n);
  const [regions, setRegions] = useState<(number | null)[]>(input.regions);
  const [palette, setPalette] = useState(input.palette);
  const [imported, setImported] = useState<Marks>(input.imported);
  const [label, setLabel] = useState(input.label ?? '');
  const [selected, setSelected] = useState(0);
  const lastPaint = useRef<{ i: number; prev: number | null } | null>(null);

  const setSize = (next: number) => {
    if (next < MIN_N || next > MAX_N) return;
    // N を変えると領域は全リセットされ、手塗りになる
    setN(next);
    setRegions(new Array(next * next).fill(null));
    setPalette(fallbackPalette(next));
    setImported(emptyMarks(next));
    setSelected(0);
  };

  const paint = (i: number) => {
    lastPaint.current = { i, prev: regions[i] };
    setRegions((prev) => {
      if (prev[i] === selected) return prev;
      const next = prev.slice();
      next[i] = selected;
      return next;
    });
  };

  const cycleMark = (i: number) => {
    const revert = lastPaint.current;
    if (revert && revert.i === i) {
      setRegions((prev) => {
        const next = prev.slice();
        next[i] = revert.prev;
        return next;
      });
      lastPaint.current = null;
    }
    setImported((prev) => {
      const next = prev.slice() as Marks;
      next[i] = ((prev[i] + 1) % 3) as Mark;
      return next;
    });
  };

  const violations = useMemo(() => {
    const bad = disconnectedCells(regions, n);
    const filled = regions.map((r) => r ?? -1);
    for (const i of violatingCats(imported, filled, n)) bad.add(i);
    return bad;
  }, [regions, imported, n]);

  const unknownCount = regions.reduce<number>((a, r) => a + (r == null ? 1 : 0), 0);

  const finish = async () => {
    const filled = regions.map((r) => r ?? 0);
    const id = await computeBoardId(filled);
    const kind: BoardKind = label.startsWith('Daily')
      ? 'daily'
      : label.startsWith('Level')
        ? 'regular'
        : input.kind;
    onDone({ id, n, regions: filled, palette, label, kind }, imported);
  };

  return (
    <div className={s.root}>
      <div className={s.top}>
        <IconButton onClick={onCancel} title="戻る">
          <BackIcon />
        </IconButton>
        <input
          className={s.name}
          value={label}
          placeholder=""
          autoFocus={!input.label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <div className={s.stepper}>
          <button onClick={() => setSize(n - 1)} disabled={n <= MIN_N} aria-label="N −">
            −
          </button>
          <span>{n}</span>
          <button onClick={() => setSize(n + 1)} disabled={n >= MAX_N} aria-label="N ＋">
            ＋
          </button>
        </div>
      </div>

      <div className={s.boardArea}>
        <div className={s.boardBox}>
          <BoardView
            n={n}
            regions={regions}
            palette={palette}
            user={emptyMarks(n)}
            imported={imported}
            showImported
            violations={violations}
            onCellPaint={paint}
            onCellLongPress={cycleMark}
          />
        </div>
      </div>

      <div className={s.chips}>
        {palette.map((color, k) => (
          <button
            key={k}
            className={s.chip}
            data-on={k === selected}
            style={{ background: color }}
            onClick={() => setSelected(k)}
            aria-label={`領域 ${k + 1}`}
          />
        ))}
      </div>

      <div className={s.bottom}>
        <button className={s.done} onClick={finish} disabled={unknownCount > 0}>
          {unknownCount > 0 ? `${unknownCount}` : '完了'}
        </button>
      </div>
    </div>
  );
}
