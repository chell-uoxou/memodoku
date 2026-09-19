import { useMemo, useRef, useState } from 'react';
import type { Board, MemoSet } from '../../model/types';
import { useStoredValue } from '../../state/settings';
import { IconButton, Sheet, ui } from '../ui';
import {
  BackIcon,
  ChevronRightIcon,
  CopyIcon,
  FolderIcon,
  FolderOpenIcon,
  GridIcon,
  ImageIcon,
  LinkIcon,
  ListIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from '../ui/Icons';
import { Thumbnail } from './Thumbnail';
import s from './List.module.css';

const LONG_PRESS_MS = 450;

export type ListProps = {
  boards: Map<string, Board>;
  memoSets: MemoSet[];
  onOpen: (memoSet: MemoSet) => void;
  onNew: () => void;
  onImport: () => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onCopyLink: (id: string) => void;
  onBack: () => void;
};

export function List({
  boards,
  memoSets,
  onOpen,
  onNew,
  onImport,
  onRename,
  onDuplicate,
  onDelete,
  onCopyLink,
  onBack,
}: ListProps) {
  const [mode, setMode] = useStoredValue<'list' | 'tile'>('meowdoku-memo:listMode', 'list');
  const [grouped, setGrouped] = useStoredValue<'flat' | 'board'>(
    'meowdoku-memo:listGroup',
    'flat',
  );
  const [openBoard, setOpenBoard] = useState<string | null>(null);
  const [menu, setMenu] = useState<MemoSet | null>(null);
  const [renaming, setRenaming] = useState<MemoSet | null>(null);
  const longPress = useRef<number | null>(null);

  const sorted = useMemo(
    () => [...memoSets].sort((a, b) => b.createdAt - a.createdAt),
    [memoSets],
  );

  const byBoard = useMemo(() => {
    const map = new Map<string, MemoSet[]>();
    for (const set of sorted) {
      const g = map.get(set.boardId);
      if (g) g.push(set);
      else map.set(set.boardId, [set]);
    }
    return map;
  }, [sorted]);

  const pressHandlers = (set: MemoSet) => ({
    onPointerDown: () => {
      clearPress();
      longPress.current = window.setTimeout(() => {
        longPress.current = null;
        navigator.vibrate?.(8);
        setMenu(set);
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

  function clearPress() {
    if (longPress.current !== null) {
      clearTimeout(longPress.current);
      longPress.current = null;
    }
  }

  const visible =
    grouped === 'board' && openBoard ? (byBoard.get(openBoard) ?? []) : sorted;

  const showBoardFolders = grouped === 'board' && !openBoard;

  return (
    <div className={s.root}>
      <div className={s.top}>
        <IconButton
          small
          onClick={() => (openBoard ? setOpenBoard(null) : onBack())}
          title="戻る"
        >
          <BackIcon size={16} />
        </IconButton>
        <span className={s.title}>
          {openBoard ? (boards.get(openBoard)?.label ?? '盤面') : 'メモ一覧'}
        </span>
        <span className={s.spacer} />
        <IconButton
          small
          active={grouped === 'board'}
          onClick={() => {
            setOpenBoard(null);
            setGrouped(grouped === 'flat' ? 'board' : 'flat');
          }}
          title={grouped === 'board' ? '盤面ごとの表示を解除' : '盤面ごとにまとめる'}
        >
          {grouped === 'board' ? <FolderOpenIcon size={16} /> : <FolderIcon size={16} />}
        </IconButton>
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
        {showBoardFolders ? (
          <div className={mode === 'list' ? s.list : s.grid}>
            {[...byBoard.entries()].map(([boardId, sets]) => {
              const board = boards.get(boardId);
              if (!board) return null;
              return mode === 'list' ? (
                <button key={boardId} className={s.row} onClick={() => setOpenBoard(boardId)}>
                  <Thumbnail board={board} marks={sets[0]?.memos[0]?.user} size={40} />
                  <span className={s.rowMain}>
                    <span className={s.rowTitle}>{board.label || '名前なしの盤面'}</span>
                    <span className={s.rowSub}>メモセット {sets.length} 件</span>
                  </span>
                  <span className={s.chevron}>
                    <ChevronRightIcon size={16} />
                  </span>
                </button>
              ) : (
                <button key={boardId} className={s.tile} onClick={() => setOpenBoard(boardId)}>
                  <Thumbnail board={board} marks={sets[0]?.memos[0]?.user} />
                  <span className={s.tileTitle}>{board.label || '名前なしの盤面'}</span>
                  <span className={s.tileSub}>{sets.length} 件</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className={mode === 'list' ? s.list : s.grid}>
            {visible.map((set) => {
              const board = boards.get(set.boardId);
              if (!board) return null;
              return mode === 'list' ? (
                <button key={set.id} className={s.row} {...pressHandlers(set)}>
                  <Thumbnail board={board} marks={set.memos[0]?.user} size={40} />
                  <span className={s.rowMain}>
                    <span className={s.rowTitle}>{set.name}</span>
                    <span className={s.rowSub}>
                      {board.label || '名前なしの盤面'} · メモ {set.memos.length} 枚
                    </span>
                  </span>
                </button>
              ) : (
                <button key={set.id} className={s.tile} {...pressHandlers(set)}>
                  <Thumbnail board={board} marks={set.memos[0]?.user} />
                  <span className={s.tileTitle}>{set.name}</span>
                  <span className={s.tileSub}>
                    {board.label || '名前なしの盤面'} · {set.memos.length} 枚
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {menu && !renaming && (
        <Sheet onClose={() => setMenu(null)} title={menu.name}>
          <button className={s.menuBtn} onClick={() => setRenaming(menu)}>
            <PencilIcon size={17} />
            メモセット名を変更
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
            className={s.menuBtn}
            onClick={() => {
              onDelete(menu.id);
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
          initial={renaming.name}
          onClose={() => {
            setRenaming(null);
            setMenu(null);
          }}
          onDone={(name) => {
            onRename(renaming.id, name);
            setRenaming(null);
            setMenu(null);
          }}
        />
      )}

      <Fab onNew={onNew} onImport={onImport} />
    </div>
  );
}

function RenameSheet({
  initial,
  onClose,
  onDone,
}: {
  initial: string;
  onClose: () => void;
  onDone: (name: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <Sheet onClose={onClose} title="メモセット名を変更">
      <div className={s.fieldLabel}>メモセット名</div>
      <input
        className={ui.field}
        value={value}
        autoFocus
        placeholder="例: 2026/09/19 の1回目"
        onChange={(e) => setValue(e.target.value)}
      />
      <button className={ui.primary} onClick={() => onDone(value.trim() || initial)}>
        保存
      </button>
    </Sheet>
  );
}

function Fab({ onNew, onImport }: { onNew: () => void; onImport: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        right: 18,
        bottom: 'calc(18px + env(safe-area-inset-bottom))',
        display: 'flex',
        gap: 10,
      }}
    >
      <IconButton onClick={onNew} title="手動で盤面を作成">
        <PlusIcon />
      </IconButton>
      <IconButton onClick={onImport} title="スクショから盤面を読み込み">
        <ImageIcon />
      </IconButton>
    </div>
  );
}
