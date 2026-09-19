import { useEffect, useRef, useState } from 'react';
import type { Board, MemoSet } from '../../model/types';
import { useMemoSet } from '../../state/memoSet';
import { useSettings } from '../../state/settings';
import { SettingsSheet } from '../Settings/SettingsSheet';
import { MemoScreen } from './MemoScreen';

export function MemoSession({
  board,
  initialMemoSet,
  onBack,
  onChange,
  onSave,
  onShare,
  saved,
}: {
  board: Board;
  initialMemoSet: MemoSet;
  onBack: () => void;
  onChange?: (memoSet: MemoSet) => void;
  onSave?: (memoSet: MemoSet) => void;
  onShare?: (memoSet: MemoSet) => void;
  saved?: boolean;
}) {
  const store = useMemoSet(initialMemoSet, board.n, board.regions);
  const { settings, toggle } = useSettings();
  const [sheet, setSheet] = useState(false);

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
        onSave={onSave ? () => onSave(store.memoSet) : undefined}
        onShare={onShare ? () => onShare(store.memoSet) : undefined}
        saved={saved}
      />
      {sheet && (
        <SettingsSheet settings={settings} onToggle={toggle} onClose={() => setSheet(false)} />
      )}
    </>
  );
}
