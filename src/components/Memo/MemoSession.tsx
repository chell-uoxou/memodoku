import { useEffect, useRef, useState } from 'react';
import type { Board, MemoSet } from '../../model/types';
import { useMemoSet } from '../../state/memoSet';
import { useSettings } from '../../state/settings';
import { SettingsSheet } from '../Settings/SettingsSheet';
import { SaveSheet } from '../Save/SaveSheet';
import { MemoScreen } from './MemoScreen';

/** 共有リンクから保存するときのメモ名の初期値 */
function sharedMemoName(name: string): string {
  const base = name.trim();
  if (!base) return 'Shared';
  return base.startsWith('Shared - ') ? base : `Shared - ${base}`;
}

export function MemoSession({
  board,
  initialMemoSet,
  onBack,
  onHome,
  onChange,
  onRename,
  onSave,
  onShare,
  onSaveImage,
  onReset,
  shared,
  existingBoardName,
}: {
  board: Board;
  initialMemoSet: MemoSet;
  onBack?: () => void;
  /** ヘッダのロゴから抜ける。読み込み時から変わっていれば dirty が true */
  onHome?: (dirty: boolean) => void;
  onChange?: (memoSet: MemoSet) => void;
  /** 保存済みのメモの名前を変える（鉛筆ボタン） */
  onRename?: (memoName: string, boardName: string) => void;
  /** 共有リンクから開いたものを自分の保存先に取り込む（保存ボタン） */
  onSave?: (memoSet: MemoSet, boardName: string, setName: string) => void;
  onShare?: (memoSet: MemoSet) => void;
  /** 盤面の画像を保存する */
  onSaveImage?: (memoSet: MemoSet) => void;
  onReset?: boolean;
  /** 共有リンクで開いた盤面 */
  shared?: boolean;
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
        onHome={onHome ? () => onHome(store.dirty) : undefined}
        onOpenSettings={() => setSheet(true)}
        onEdit={onRename ? () => setEditing(true) : undefined}
        onSave={onSave ? () => setEditing(true) : undefined}
        onShare={onShare ? () => onShare(store.memoSet) : undefined}
        onSaveImage={onSaveImage ? () => onSaveImage(store.memoSet) : undefined}
        onReset={onReset ? store.resetActive : undefined}
        shared={shared}
      />
      {sheet && (
        <SettingsSheet settings={settings} onToggle={toggle} onClose={() => setSheet(false)} />
      )}
      {editing && (
        <SaveSheet
          title={onSave ? '保存' : '名前を変更'}
          boardName={existingBoardName ?? board.label}
          setName={shared ? sharedMemoName(store.memoSet.name) : store.memoSet.name}
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
