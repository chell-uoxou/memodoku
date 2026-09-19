import { useEffect, useRef, useState } from 'react';
import type { Board, MemoSet } from '../../model/types';
import { useMemoSet } from '../../state/memoSet';
import { useSettings } from '../../state/settings';
import { SettingsSheet } from '../Settings/SettingsSheet';
import { SaveSheet } from '../Save/SaveSheet';
import { MemoScreen } from './MemoScreen';

export function MemoSession({
  board,
  initialMemoSet,
  onBack,
  onChange,
  onRename,
  onSave,
  onShare,
  onReset,
  existingBoardName,
}: {
  board: Board;
  initialMemoSet: MemoSet;
  onBack?: () => void;
  onChange?: (memoSet: MemoSet) => void;
  /** 保存済みのメモの名前を変える（鉛筆ボタン） */
  onRename?: (memoName: string, boardName: string) => void;
  /** 共有リンクから開いたものを自分の保存先に取り込む（保存ボタン） */
  onSave?: (memoSet: MemoSet, boardName: string, setName: string) => void;
  onShare?: (memoSet: MemoSet) => void;
  onReset?: boolean;
  /** 同じ形の盤面が保存済みならその名前 */
  existingBoardName?: string;
}) {
  const store = useMemoSet(initialMemoSet, board.n, board.regions);
  const { settings, toggle } = useSettings();
  const [sheet, setSheet] = useState(false);
  const [editing, setEditing] = useState(false);

  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  useEffect(() => {
    changeRef.current?.(store.memoSet);
  }, [store.memoSet]);

  return (
    <>
      <MemoScreen
        board={board}
        store={store}
        memoSet={store.memoSet}
        settings={settings}
        onBack={onBack}
        onOpenSettings={() => setSheet(true)}
        onEdit={onRename ? () => setEditing(true) : undefined}
        onSave={onSave ? () => setEditing(true) : undefined}
        onShare={onShare ? () => onShare(store.memoSet) : undefined}
        onReset={onReset ? store.resetActive : undefined}
      />
      {sheet && (
        <SettingsSheet settings={settings} onToggle={toggle} onClose={() => setSheet(false)} />
      )}
      {editing && (
        <SaveSheet
          title={onSave ? '保存' : '名前を変更'}
          boardName={existingBoardName ?? board.label}
          setName={store.memoSet.name}
          existing={existingBoardName !== undefined}
          onClose={() => setEditing(false)}
          onSubmit={(boardName, setName) => {
            setEditing(false);
            if (onSave) onSave(store.memoSet, boardName, setName);
            else onRename?.(setName, boardName);
          }}
        />
      )}
    </>
  );
}
