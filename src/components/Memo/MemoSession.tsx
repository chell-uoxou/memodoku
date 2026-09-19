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
  onSave,
  onShare,
  onReset,
  saved,
  existingBoardName,
}: {
  board: Board;
  initialMemoSet: MemoSet;
  onBack: () => void;
  onChange?: (memoSet: MemoSet) => void;
  /** 保存シートの完了。未指定なら保存ボタンを出さない */
  onSave?: (memoSet: MemoSet, boardName: string, setName: string) => void;
  onShare?: (memoSet: MemoSet) => void;
  onReset?: boolean;
  saved?: boolean;
  /** 同じ Board.id が保存済みならその名前 */
  existingBoardName?: string;
}) {
  const store = useMemoSet(initialMemoSet, board.n, board.regions);
  const { settings, toggle } = useSettings();
  const [sheet, setSheet] = useState(false);
  const [saving, setSaving] = useState(false);

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
        onSave={onSave ? () => setSaving(true) : undefined}
        onShare={onShare ? () => onShare(store.memoSet) : undefined}
        onReset={onReset ? store.resetActive : undefined}
        saved={saved}
      />
      {sheet && (
        <SettingsSheet settings={settings} onToggle={toggle} onClose={() => setSheet(false)} />
      )}
      {saving && onSave && (
        <SaveSheet
          boardName={existingBoardName ?? board.label}
          setName={store.memoSet.name}
          existing={existingBoardName !== undefined}
          onClose={() => setSaving(false)}
          onSave={(boardName, setName) => {
            setSaving(false);
            onSave(store.memoSet, boardName, setName);
          }}
        />
      )}
    </>
  );
}
