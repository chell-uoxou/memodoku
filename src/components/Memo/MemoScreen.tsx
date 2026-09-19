import { useEffect, useMemo, useRef, useState } from 'react';
import type { Board, MemoSet } from '../../model/types';
import { violatingCats } from '../../model/rules';
import { Board as BoardView } from '../Board/Board';
import { Scrubber } from '../Scrubber/Scrubber';
import { IconButton } from '../ui';
import {
  BackIcon,
  EyeIcon,
  EyeOffIcon,
  SettingsIcon,
  RedoIcon,
  ShareIcon,
  UndoIcon,
} from '../ui/Icons';
import type { Settings } from '../../state/settings';
import { useMemoSet } from '../../state/memoSet';
import s from './Memo.module.css';

export type MemoScreenProps = {
  board: Board;
  store: ReturnType<typeof useMemoSet>;
  settings: Settings;
  onBack: () => void;
  onOpenSettings: () => void;
  onSave?: () => void;
  onShare?: () => void;
  onReset?: () => void;
  saved?: boolean;
  /** MemoSet は表示用（store.memoSet と同じ） */
  memoSet: MemoSet;
};

export function MemoScreen({
  board,
  store,
  settings,
  onBack,
  onOpenSettings,
  onSave,
  onShare,
  onReset,
  saved,
  memoSet,
}: MemoScreenProps) {
  const { active } = store;
  const [confirmReset, setConfirmReset] = useState(false);
  const resetTimer = useRef<number | null>(null);

  // 3秒触らなければ元のラベルに戻る
  useEffect(() => {
    if (!confirmReset) return;
    resetTimer.current = window.setTimeout(() => setConfirmReset(false), 3000);
    return () => {
      if (resetTimer.current !== null) clearTimeout(resetTimer.current);
    };
  }, [confirmReset]);

  const effective = useMemo(() => {
    if (!active.showImported) return active.user;
    return active.user.map((u, i) => memoSet.imported[i] || u);
  }, [active, memoSet.imported]);

  const violations = useMemo(
    () => (settings.showViolations ? violatingCats(effective, board.regions, board.n) : undefined),
    [settings.showViolations, effective, board.regions, board.n],
  );

  return (
    <div className={s.root}>
      <div className={s.top}>
        <IconButton onClick={onBack} small title="戻る">
          <BackIcon size={16} />
        </IconButton>
        <span className={s.label}>
          {memoSet.name}
          <span className={s.sub}>
            {board.label || '名前なしの盤面'} · {board.n}×{board.n} ·{' '}
            {memoSet.activeIndex + 1}/{memoSet.memos.length}枚
          </span>
        </span>
        {!saved && onSave && (
          <button className={s.save} onClick={onSave}>
            保存
          </button>
        )}
      </div>

      <div className={s.tools}>
        <IconButton onClick={store.undo} disabled={!store.canUndo} small title="元に戻す">
          <UndoIcon size={16} />
        </IconButton>
        <IconButton onClick={store.redo} disabled={!store.canRedo} small title="やり直す">
          <RedoIcon size={16} />
        </IconButton>
        <span className={s.grow} />
        {onReset && (
          <button
            className={s.reset}
            onClick={() => {
              if (confirmReset) {
                onReset();
                setConfirmReset(false);
              } else {
                setConfirmReset(true);
              }
            }}
          >
            {confirmReset ? '本当に？' : 'リセット'}
          </button>
        )}
        <IconButton
          onClick={store.toggleImported}
          small
          active={active.showImported}
          title={active.showImported ? 'スクショの内容を隠す' : 'スクショの内容を表示'}
        >
          {active.showImported ? <EyeIcon size={16} /> : <EyeOffIcon size={16} />}
        </IconButton>
        {onShare && (
          <IconButton onClick={onShare} small title="共有リンクをコピー">
            <ShareIcon size={16} />
          </IconButton>
        )}
        <IconButton onClick={onOpenSettings} small title="設定">
          <SettingsIcon size={16} />
        </IconButton>
      </div>

      <div className={s.boardArea}>
        <div className={s.boardBox}>
          <BoardView
            n={board.n}
            regions={board.regions}
            palette={board.palette}
            user={active.user}
            imported={memoSet.imported}
            showImported={active.showImported}
            violations={violations}
            showBoundaries={settings.regionBoundaries}
            rowColHighlight={settings.rowColHighlight}
            onStroke={(actions, phase) => store.onStroke(actions, phase, settings.autoExclude)}
          />
        </div>
      </div>

      <div className={s.hint}>
        タップでバツ、もう一度タップで猫。ドラッグでまとめて塗れます
      </div>

      <Scrubber
        memos={memoSet.memos}
        activeIndex={memoSet.activeIndex}
        onSelect={store.setActiveIndex}
        onAdd={store.addMemo}
        onDuplicate={store.duplicateMemo}
        onDelete={store.deleteMemo}
      />
    </div>
  );
}
