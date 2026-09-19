import { useEffect, useMemo, useState } from 'react';
import type { Board, BoardKind, Marks } from '../../model/types';
import {
  computeBoardId,
  disconnectedCells,
  emptyMarks,
  fallbackPalette,
  validateBoard,
} from '../../model/board';
import { violatingCats } from '../../model/rules';
import { confirmDiscard } from '../../state/unsaved';
import { Board as BoardView, type CellAction, type StrokePhase } from '../Board/Board';
import { IconButton } from '../ui';
import { BackIcon, BrushIcon, ImageIcon, RedoIcon, UndoIcon } from '../ui/Icons';
import s from './Setup.module.css';

export type SetupInput = {
  n: number;
  regions: (number | null)[];
  palette: string[];
  imported: Marks;
  label: string | null;
  kind: BoardKind;
  /** 読み込んだスクショの ObjectURL。読み取り結果と見比べるために保持する */
  imageUrl?: string;
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
const DEPTH = 100;

/** Undo の対象になる盤面の状態。レベル名は含めない（文字入力は打ち消さない） */
type Draft = {
  n: number;
  regions: (number | null)[];
  palette: string[];
  imported: Marks;
};

export function Setup({
  input,
  onCancel,
  onDone,
  onDirtyChange,
}: {
  input: SetupInput;
  onCancel: () => void;
  onDone: (board: Board, imported: Marks) => void;
  /** 未保存の編集があるかを親に伝える（離脱確認のため） */
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [draft, setDraft] = useState<Draft>({
    n: input.n,
    regions: input.regions,
    palette: input.palette,
    imported: input.imported,
  });
  const [past, setPast] = useState<Draft[]>([]);
  const [future, setFuture] = useState<Draft[]>([]);
  const [label, setLabel] = useState(input.label ?? '');
  /** 塗る色。'marks' のときはバツと猫を置くモードになる */
  const [tool, setTool] = useState<number | 'marks'>(0);
  const [showImage, setShowImage] = useState(false);

  const { n, regions, palette, imported } = draft;

  /** 1操作ぶんの区切り。ここから先の変更はまとめて1回の Undo で戻る */
  const commit = (next: Draft | ((prev: Draft) => Draft)) => {
    setPast((prev) => [...prev, draft].slice(-DEPTH));
    setFuture([]);
    setDraft(next);
  };

  const undo = () => {
    if (!past.length) return;
    setDraft(past[past.length - 1]);
    setPast(past.slice(0, -1));
    setFuture([...future, draft]);
  };

  const redo = () => {
    if (!future.length) return;
    setDraft(future[future.length - 1]);
    setFuture(future.slice(0, -1));
    setPast([...past, draft]);
  };

  // N を変えると領域は全リセットされ、手塗りになる（Undo で戻せる）
  const setSize = (next: number) => {
    if (next < MIN_N || next > MAX_N) return;
    commit({
      n: next,
      regions: new Array(next * next).fill(null),
      palette: fallbackPalette(next),
      imported: emptyMarks(next),
    });
    setTool(0);
  };

  const paint = (i: number, phase: StrokePhase) => {
    if (tool === 'marks') return;
    const apply = (prev: Draft): Draft => {
      if (prev.regions[i] === tool) return prev;
      const next = prev.regions.slice();
      next[i] = tool;
      return { ...prev, regions: next };
    };
    if (phase === 'start') commit(apply);
    else setDraft(apply);
  };

  /** バツ・猫モード。メモ画面と同じ操作（タップ・ダブルタップ・ドラッグ）で編集する */
  const strokeMarks = (actions: CellAction[], phase: StrokePhase) => {
    const apply = (prev: Draft): Draft => {
      const next = prev.imported.slice() as Marks;
      let changed = false;
      for (const a of actions) {
        if (next[a.i] === a.to) continue;
        next[a.i] = a.to;
        changed = true;
      }
      return changed ? { ...prev, imported: next } : prev;
    };
    if (phase === 'start') commit(apply);
    else setDraft(apply);
  };

  const dirty = past.length > 0 || label !== (input.label ?? '');
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const unknownCount = regions.reduce<number>((a, r) => a + (r == null ? 1 : 0), 0);

  const violations = useMemo(() => {
    const bad = disconnectedCells(regions, n);
    const filled = regions.map((r) => r ?? -1);
    for (const i of violatingCats(imported, filled, n)) bad.add(i);
    return bad;
  }, [regions, imported, n]);

  const ruleProblems = useMemo(() => {
    if (unknownCount > 0) return [];
    const filled = regions as number[];
    const out = validateBoard(filled, n);
    if (violatingCats(imported, filled, n).size) out.push('cat-rule');
    return out;
  }, [regions, imported, n, unknownCount]);

  const blocked = unknownCount > 0 || ruleProblems.length > 0;
  const doneLabel =
    unknownCount > 0 ? `残り ${unknownCount}` : ruleProblems.length ? 'ルール違反あり' : '完了';

  const finish = async () => {
    try {
      const filled = regions.map((r) => r ?? 0);
      const id = await computeBoardId(filled);
      const kind: BoardKind = label.startsWith('Daily')
        ? 'daily'
        : label.startsWith('Level')
          ? 'regular'
          : input.kind;
      onDone({ id, n, regions: filled, palette, label: label.trim(), kind }, imported);
    } catch (e) {
      console.error('盤面IDの計算に失敗しました', e);
    }
  };

  return (
    <div className={s.root}>
      <div className={s.top}>
        <IconButton
          onClick={() => {
            if (!dirty || confirmDiscard('作成中の盤面を破棄しますか？')) onCancel();
          }}
          small
          title="戻る"
        >
          <BackIcon size={16} />
        </IconButton>
        <span className={s.title}>{input.imageUrl ? '読み取り結果を確認' : '盤面を作成'}</span>
        <IconButton onClick={undo} disabled={!past.length} small title="元に戻す">
          <UndoIcon size={16} />
        </IconButton>
        <IconButton onClick={redo} disabled={!future.length} small title="やり直す">
          <RedoIcon size={16} />
        </IconButton>
      </div>

      <div className={s.fields}>
        <div className={s.field}>
          <div className={s.label}>盤面名（ゲームのレベル名）</div>
          <input
            className={s.name}
            value={label}
            placeholder="例: Level 62 / Daily 9/19"
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <div className={s.field} style={{ flex: 'none' }}>
          <div className={s.label}>盤面のサイズ</div>
          <div className={s.stepper}>
            <button onClick={() => setSize(n - 1)} disabled={n <= MIN_N} aria-label="小さくする">
              −
            </button>
            <span>{n}×{n}</span>
            <button onClick={() => setSize(n + 1)} disabled={n >= MAX_N} aria-label="大きくする">
              ＋
            </button>
          </div>
        </div>
      </div>

      <div className={s.boardArea}>
        <div className={s.boardBox}>
          {tool === 'marks' ? (
            <BoardView
              n={n}
              regions={regions}
              palette={palette}
              user={imported}
              imported={emptyMarks(n)}
              showImported={false}
              violations={violations}
              onStroke={strokeMarks}
            />
          ) : (
            <BoardView
              n={n}
              regions={regions}
              palette={palette}
              user={emptyMarks(n)}
              imported={imported}
              showImported
              violations={violations}
              onCellPaint={paint}
            />
          )}
        </div>
      </div>

      <div className={s.label}>
        {tool === 'marks'
          ? 'タップでバツ、もう一度タップで猫。ドラッグでまとめて置けます'
          : '色を選んでセルをなぞると塗れます'}
      </div>
      <div className={s.chips}>
        {palette.map((color, k) => (
          <button
            key={k}
            className={s.chip}
            data-on={k === tool}
            style={{ background: color }}
            onClick={() => setTool(k)}
            aria-label={`${k + 1} 色目で塗る`}
          />
        ))}
        <span className={s.chipDivider} />
        <button
          className={`${s.chip} ${s.markTool}`}
          data-on={tool === 'marks'}
          onClick={() => setTool('marks')}
          aria-label="バツと猫を置く"
        >
          <BrushIcon size={19} />
        </button>
      </div>

      <div className={s.bottom}>
        {input.imageUrl && (
          <button
            className={s.check}
            onClick={() => setShowImage((v) => !v)}
            aria-label="読み込んだ画像を確認"
          >
            <ImageIcon size={18} />
            画像を確認
          </button>
        )}
        <button className={s.done} onClick={finish} disabled={blocked}>
          {doneLabel}
        </button>
      </div>

      {showImage && input.imageUrl && (
        <div className={s.imageSheet} onPointerDown={() => setShowImage(false)}>
          <img src={input.imageUrl} alt="読み込んだスクリーンショット" draggable={false} />
          <div className={s.imageBottom}>
            <button className={s.check} onClick={() => setShowImage(false)}>
              <ImageIcon size={18} />
              画像を閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
