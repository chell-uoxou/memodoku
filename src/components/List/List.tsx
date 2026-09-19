import { useMemo, useRef, useState } from 'react';
import type { Board, MemoSet } from '../../model/types';
import { useStoredValue } from '../../state/settings';
import { IconButton, Sheet, ui } from '../ui';
import {
  BackIcon,
  CopyIcon,
  GridIcon,
  LinkIcon,
  ListIcon,
  MoreIcon,
  PencilIcon,
  TrashIcon,
} from '../ui/Icons';
import { Thumbnail } from './Thumbnail';
import s from './List.module.css';

const LONG_PRESS_MS = 450;

export type ListProps = {
  boards: Map<string, Board>;
  memoSets: MemoSet[];
  onOpen: (memoSet: MemoSet) => void;
  onRename: (id: string, memoName: string, boardName: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onCopyLink: (id: string) => void;
  /** メニューを開いた時点で共有URLを作らせる（iOS のジェスチャ制限対策） */
  onPrepareShare: (id: string) => void;
  onBack: () => void;
};

export function List({
  boards,
  memoSets,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
  onCopyLink,
  onPrepareShare,
  onBack,
}: ListProps) {
  const [mode, setMode] = useStoredValue<'list' | 'tile'>('meowdoku-memo:listMode', 'list');
  const [menu, setMenu] = useState<MemoSet | null>(null);
  const [renaming, setRenaming] = useState<MemoSet | null>(null);
  const longPress = useRef<number | null>(null);

  const sorted = useMemo(
    () => [...memoSets].sort((a, b) => b.createdAt - a.createdAt),
    [memoSets],
  );

  function clearPress() {
    if (longPress.current !== null) {
      clearTimeout(longPress.current);
      longPress.current = null;
    }
  }

  const openMenu = (set: MemoSet) => {
    onPrepareShare(set.id);
    setMenu(set);
  };

  const pressHandlers = (set: MemoSet) => ({
    onPointerDown: () => {
      clearPress();
      longPress.current = window.setTimeout(() => {
        longPress.current = null;
        navigator.vibrate?.(8);
        openMenu(set);
      }, LONG_PRESS_MS);
    },
    onPointerUp: clearPress,
    onPointerCancel: clearPress,
    onPointerLeave: clearPress,
    onClick: () => {
      if (menu) return;
      onOpen(set);
    },
  });

  const boardNameOf = (set: MemoSet) => boards.get(set.boardId)?.label || '名前なしの盤面';

  return (
    <div className={s.root}>
      <div className={s.top}>
        <IconButton small onClick={onBack} title="戻る">
          <BackIcon size={16} />
        </IconButton>
        <span className={s.title}>メモ一覧</span>
        <span className={s.spacer} />
        <IconButton
          small
          onClick={() => setMode(mode === 'list' ? 'tile' : 'list')}
          title={mode === 'list' ? 'サムネイル表示にする' : 'リスト表示にする'}
        >
          {mode === 'list' ? <GridIcon size={16} /> : <ListIcon size={16} />}
        </IconButton>
      </div>

      <div className={s.scroll}>
        {!sorted.length && (
          <div className={s.empty}>
            <span>
              まだメモがありません。
              <br />
              スクショを読み込むか、手動で盤面を作ってください。
            </span>
          </div>
        )}

        <div className={mode === 'list' ? s.list : s.grid}>
          {sorted.map((set) => {
            const board = boards.get(set.boardId);
            if (!board) return null;
            const sub = `${boardNameOf(set)} · ${set.memos.length}枚`;

            return mode === 'list' ? (
              <div key={set.id} className={s.row}>
                <button className={s.rowOpen} {...pressHandlers(set)}>
                  <Thumbnail board={board} marks={set.memos[0]?.user} size={40} />
                  <span className={s.rowMain}>
                    <span className={s.rowTitle}>{set.name}</span>
                    <span className={s.rowSub}>{sub}</span>
                  </span>
                </button>
                <span className={s.actions}>
                  <IconButton small onClick={() => setRenaming(set)} title="名前を変更">
                    <PencilIcon size={15} />
                  </IconButton>
                  <IconButton small onClick={() => onDuplicate(set.id)} title="複製">
                    <CopyIcon size={15} />
                  </IconButton>
                  <IconButton small onClick={() => openMenu(set)} title="その他">
                    <MoreIcon size={15} />
                  </IconButton>
                </span>
              </div>
            ) : (
              <div key={set.id} className={s.tile}>
                <button className={s.tileOpen} {...pressHandlers(set)}>
                  <Thumbnail board={board} marks={set.memos[0]?.user} />
                  <span className={s.tileTitle}>{set.name}</span>
                  <span className={s.tileSub}>{sub}</span>
                </button>
                <span className={s.tileActions}>
                  <IconButton small onClick={() => setRenaming(set)} title="名前を変更">
                    <PencilIcon size={15} />
                  </IconButton>
                  <IconButton small onClick={() => onDuplicate(set.id)} title="複製">
                    <CopyIcon size={15} />
                  </IconButton>
                  <IconButton small onClick={() => openMenu(set)} title="その他">
                    <MoreIcon size={15} />
                  </IconButton>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {menu && !renaming && (
        <Sheet onClose={() => setMenu(null)} title={menu.name}>
          <button className={s.menuBtn} onClick={() => setRenaming(menu)}>
            <PencilIcon size={17} />
            名前を変更
          </button>
          <button
            className={s.menuBtn}
            onClick={() => {
              onDuplicate(menu.id);
              setMenu(null);
            }}
          >
            <CopyIcon size={17} />
            複製
          </button>
          <button
            className={s.menuBtn}
            onClick={() => {
              onCopyLink(menu.id);
              setMenu(null);
            }}
          >
            <LinkIcon size={17} />
            共有リンクをコピー
          </button>
          <button
            className={`${s.menuBtn} ${s.danger}`}
            onClick={() => {
              if (window.confirm(`「${menu.name}」を削除しますか？`)) onDelete(menu.id);
              setMenu(null);
            }}
          >
            <TrashIcon size={17} />
            削除
          </button>
        </Sheet>
      )}

      {renaming && (
        <RenameSheet
          memoName={renaming.name}
          boardName={boards.get(renaming.boardId)?.label ?? ''}
          onClose={() => {
            setRenaming(null);
            setMenu(null);
          }}
          onDone={(memoName, boardName) => {
            onRename(renaming.id, memoName, boardName);
            setRenaming(null);
            setMenu(null);
          }}
        />
      )}
    </div>
  );
}

function RenameSheet({
  memoName,
  boardName,
  onClose,
  onDone,
}: {
  memoName: string;
  boardName: string;
  onClose: () => void;
  onDone: (memoName: string, boardName: string) => void;
}) {
  const [memo, setMemo] = useState(memoName);
  const [board, setBoard] = useState(boardName);

  return (
    <Sheet onClose={onClose} title="名前を変更">
      <div className={ui.fieldLabel}>メモ名</div>
      <input
        className={ui.field}
        value={memo}
        placeholder="例: 2026/09/19"
        onChange={(e) => setMemo(e.target.value)}
      />
      <div className={ui.fieldLabel} style={{ paddingTop: 14 }}>
        盤面名（ゲームのレベル名）
      </div>
      <input
        className={ui.field}
        value={board}
        placeholder="例: Level 62 / Daily 9/19"
        onChange={(e) => setBoard(e.target.value)}
      />
      <button
        className={ui.primary}
        onClick={() => onDone(memo.trim() || memoName, board.trim())}
      >
        保存
      </button>
    </Sheet>
  );
}
