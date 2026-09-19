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
  LinkIcon,
  ListIcon,
  MoreIcon,
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
  onRename: (id: string, memoName: string, boardName: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onCopyLink: (id: string) => void;
  /** メニューを開いた時点で共有URLを作らせる（iOS のジェスチャ制限対策） */
  onPrepareShare: (id: string) => void;
  onBack: () => void;
  /** 開いている盤面グループ。履歴と連動させるため親が持つ */
  openBoardId: string | null;
  onOpenBoard: (boardId: string | null) => void;
  onRenameBoard: (boardId: string, name: string) => void;
  onNewMemo: (boardId: string) => void;
  /** 盤面をもとに新しい盤面を作る（作成画面が開く） */
  onDuplicateBoard: (boardId: string) => void;
  onDeleteBoard: (boardId: string) => void;
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
  openBoardId,
  onOpenBoard,
  onRenameBoard,
  onNewMemo,
  onDuplicateBoard,
  onDeleteBoard,
}: ListProps) {
  const [mode, setMode] = useStoredValue<'list' | 'tile'>('meowdoku-memo:listMode', 'list');
  const [grouped, setGrouped] = useStoredValue<'flat' | 'board'>(
    'meowdoku-memo:listGroup',
    'flat',
  );
  const [menu, setMenu] = useState<MemoSet | null>(null);
  const [renaming, setRenaming] = useState<MemoSet | null>(null);
  const [renamingBoard, setRenamingBoard] = useState<Board | null>(null);
  const [boardMenu, setBoardMenu] = useState<Board | null>(null);
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

  const boardNameOf = (boardId: string) => boards.get(boardId)?.label || '名前なしの盤面';

  const confirmDeleteBoard = (board: Board) => {
    const count = byBoard.get(board.id)?.length ?? 0;
    if (window.confirm(`「${boardNameOf(board.id)}」とメモ ${count} 件をすべて削除しますか？`)) {
      onDeleteBoard(board.id);
    }
  };

  const boardPressHandlers = (board: Board) => ({
    onPointerDown: () => {
      clearPress();
      longPress.current = window.setTimeout(() => {
        longPress.current = null;
        navigator.vibrate?.(8);
        setBoardMenu(board);
      }, LONG_PRESS_MS);
    },
    onPointerUp: clearPress,
    onPointerCancel: clearPress,
    onPointerLeave: clearPress,
    onClick: () => {
      if (boardMenu) return;
      onOpenBoard(board.id);
    },
  });

  const openBoard = openBoardId ? boards.get(openBoardId) : undefined;
  const visible = openBoardId ? (byBoard.get(openBoardId) ?? []) : sorted;
  const showFolders = grouped === 'board' && !openBoardId;

  const actions = (set: MemoSet) => (
    <>
      <IconButton small onClick={() => setRenaming(set)} title="名前を変更">
        <PencilIcon size={15} />
      </IconButton>
      <IconButton small onClick={() => onDuplicate(set.id)} title="複製">
        <CopyIcon size={15} />
      </IconButton>
      <IconButton small onClick={() => openMenu(set)} title="その他">
        <MoreIcon size={15} />
      </IconButton>
    </>
  );

  return (
    <div className={s.root}>
      <div className={s.top}>
        <IconButton small onClick={() => (openBoardId ? onOpenBoard(null) : onBack())} title="戻る">
          <BackIcon size={16} />
        </IconButton>
        <span className={s.title}>
          {openBoard
            ? (openBoard.label || '名前なしの盤面')
            : grouped === 'board'
              ? '盤面一覧'
              : 'メモ一覧'}
        </span>
        <span className={s.spacer} />

        {openBoard ? (
          // 盤面を開いているあいだは、その盤面そのものへの操作を出す
          <>
            <IconButton
              small
              onClick={() => setRenamingBoard(openBoard)}
              title="盤面名を変更"
            >
              <PencilIcon size={16} />
            </IconButton>
            <IconButton
              small
              onClick={() => onDuplicateBoard(openBoard.id)}
              title="この盤面をもとに新しい盤面を作る"
            >
              <CopyIcon size={16} />
            </IconButton>
            <IconButton small onClick={() => onNewMemo(openBoard.id)} title="この盤面で新しいメモ">
              <PlusIcon size={16} />
            </IconButton>
            <IconButton small onClick={() => confirmDeleteBoard(openBoard)} title="盤面を削除">
              <TrashIcon size={16} />
            </IconButton>
          </>
        ) : (
          <button
            className={s.groupToggle}
            data-on={grouped === 'board'}
            onClick={() => setGrouped(grouped === 'flat' ? 'board' : 'flat')}
          >
            {grouped === 'board' ? <FolderOpenIcon size={15} /> : <FolderIcon size={15} />}
            盤面でグループ化
          </button>
        )}

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
          {showFolders
            ? [...byBoard.entries()].map(([boardId, sets]) => {
                const board = boards.get(boardId);
                if (!board) return null;
                const thumb = <Thumbnail board={board} marks={sets[0]?.memos[0]?.user} />;
                return mode === 'list' ? (
                  <button key={boardId} className={s.row} {...boardPressHandlers(board)}>
                    <Thumbnail board={board} marks={sets[0]?.memos[0]?.user} size={40} />
                    <span className={s.rowMain}>
                      <span className={s.rowTitle}>{boardNameOf(boardId)}</span>
                      <span className={s.rowSub}>メモ {sets.length} 件</span>
                    </span>
                    <span className={s.chevron}>
                      <ChevronRightIcon size={16} />
                    </span>
                  </button>
                ) : (
                  <button key={boardId} className={s.tile} {...boardPressHandlers(board)}>
                    {thumb}
                    <span className={s.tileTitle}>{boardNameOf(boardId)}</span>
                    <span className={s.tileSub}>メモ {sets.length} 件</span>
                  </button>
                );
              })
            : visible.map((set) => {
                const board = boards.get(set.boardId);
                if (!board) return null;
                const sub = `${boardNameOf(set.boardId)} · ${set.memos.length}枚`;

                return mode === 'list' ? (
                  <div key={set.id} className={s.row}>
                    <button className={s.rowOpen} {...pressHandlers(set)}>
                      <Thumbnail board={board} marks={set.memos[0]?.user} size={40} />
                      <span className={s.rowMain}>
                        <span className={s.rowTitle}>{set.name}</span>
                        <span className={s.rowSub}>{sub}</span>
                      </span>
                    </button>
                    <span className={s.actions}>{actions(set)}</span>
                  </div>
                ) : (
                  <div key={set.id} className={s.tile}>
                    <button className={s.tileOpen} {...pressHandlers(set)}>
                      <Thumbnail board={board} marks={set.memos[0]?.user} />
                      <span className={s.tileTitle}>{set.name}</span>
                      <span className={s.tileSub}>{sub}</span>
                    </button>
                    <span className={s.tileActions}>{actions(set)}</span>
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

      {boardMenu && !renamingBoard && (
        <Sheet onClose={() => setBoardMenu(null)} title={boardNameOf(boardMenu.id)}>
          <button className={s.menuBtn} onClick={() => setRenamingBoard(boardMenu)}>
            <PencilIcon size={17} />
            盤面名を変更
          </button>
          <button
            className={s.menuBtn}
            onClick={() => {
              onDuplicateBoard(boardMenu.id);
              setBoardMenu(null);
            }}
          >
            <CopyIcon size={17} />
            複製（作成画面が開きます）
          </button>
          <button
            className={s.menuBtn}
            onClick={() => {
              onNewMemo(boardMenu.id);
              setBoardMenu(null);
            }}
          >
            <PlusIcon size={17} />
            この盤面で新しいメモ
          </button>
          <button
            className={`${s.menuBtn} ${s.danger}`}
            onClick={() => {
              confirmDeleteBoard(boardMenu);
              setBoardMenu(null);
            }}
          >
            <TrashIcon size={17} />
            削除
          </button>
        </Sheet>
      )}

      {renamingBoard && (
        <BoardNameSheet
          name={renamingBoard.label}
          onClose={() => {
            setRenamingBoard(null);
            setBoardMenu(null);
          }}
          onDone={(name) => {
            onRenameBoard(renamingBoard.id, name);
            setRenamingBoard(null);
            setBoardMenu(null);
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

function BoardNameSheet({
  name,
  onClose,
  onDone,
}: {
  name: string;
  onClose: () => void;
  onDone: (name: string) => void;
}) {
  const [value, setValue] = useState(name);
  return (
    <Sheet onClose={onClose} title="盤面名を変更">
      <div className={ui.fieldLabel}>盤面名（ゲームのレベル名）</div>
      <input
        className={ui.field}
        value={value}
        placeholder="例: Level 62 / Daily 9/19"
        onChange={(e) => setValue(e.target.value)}
      />
      <button className={ui.primary} onClick={() => onDone(value.trim())}>
        保存
      </button>
    </Sheet>
  );
}
