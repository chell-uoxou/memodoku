import { useCallback, useEffect, useRef, useState } from 'react';
import type { Board, Marks, MemoSet } from './model/types';
import { blankSetup, Setup, type SetupInput } from './components/Setup/Setup';
import { MemoSession } from './components/Memo/MemoSession';
import { List } from './components/List/List';
import { Home } from './components/Home/Home';
import { formatToday, newId, newMemoSet } from './state/memoSet';
import { suppressBrowserGestures } from './gestures';
import * as db from './db/db';
import { decodeShare, encodeShare, readSharePayload, shareUrl } from './share/codec';
import { importScreenshot, pickImage } from './vision/import';
import { blankSetup as blank } from './components/Setup/Setup';
import './styles/global.css';

type View =
  | { kind: 'home' }
  | { kind: 'list' }
  | { kind: 'setup'; input: SetupInput }
  | { kind: 'memo'; board: Board; memoSet: MemoSet; saved: boolean }
  | { kind: 'share'; board: Board; memoSet: MemoSet };

export default function App() {
  const [view, setView] = useState<View>({ kind: 'home' });
  const [boards, setBoards] = useState<Map<string, Board>>(new Map());
  const [memoSets, setMemoSets] = useState<MemoSet[]>([]);
  const autosave = useRef<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(suppressBrowserGestures, []);

  const refresh = useCallback(async () => {
    const [b, m] = await Promise.all([db.allBoards(), db.allMemoSets()]);
    setBoards(new Map(b.map((x) => [x.id, x])));
    setMemoSets(m);
  }, []);

  useEffect(() => {
    void refresh();
    const payload = readSharePayload();
    if (!payload) return;
    void decodeShare(payload).then((out) => {
      if (out) setView({ kind: 'share', board: out.board, memoSet: out.memoSet });
    });
  }, [refresh]);

  /** 保存済みの MemoSet は変更から500msデバウンスでオートセーブ */
  const handleChange = useCallback(
    (memoSet: MemoSet) => {
      setView((prev) =>
        prev.kind === 'memo' ? { ...prev, memoSet } : prev,
      );
      if (autosave.current !== null) clearTimeout(autosave.current);
      autosave.current = window.setTimeout(() => {
        autosave.current = null;
        void db.getMemoSet(memoSet.id).then((existing) => {
          if (!existing) return; // まだ保存していないセットはオートセーブしない
          void db.putMemoSet(memoSet).then(refresh);
        });
      }, 500);
    },
    [refresh],
  );

  /** §5 スクリーンショットから補正画面へ。読めなければ空の盤面を出す */
  const handleImage = useCallback(async (blob: Blob) => {
    const input = await importScreenshot(blob).catch(() => null);
    setView({ kind: 'setup', input: input ?? blank(9) });
  }, []);

  // ファイル選択・ドラッグ&ドロップ・クリップボード貼り付けの3経路
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const blob = pickImage(e.clipboardData);
      if (!blob) return;
      e.preventDefault();
      void handleImage(blob);
    };
    const onDrop = (e: DragEvent) => {
      const blob = pickImage(e.dataTransfer);
      if (!blob) return;
      e.preventDefault();
      void handleImage(blob);
    };
    const onDragOver = (e: DragEvent) => e.preventDefault();
    document.addEventListener('paste', onPaste);
    document.addEventListener('drop', onDrop);
    document.addEventListener('dragover', onDragOver);
    return () => {
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('drop', onDrop);
      document.removeEventListener('dragover', onDragOver);
    };
  }, [handleImage]);

  const saveNow = useCallback(
    async (board: Board, memoSet: MemoSet, boardName: string, setName: string) => {
      const next: Board = { ...board, label: boardName };
      const nextSet: MemoSet = { ...memoSet, name: setName, updatedAt: Date.now() };
      await db.putBoard(next);
      await db.putMemoSet(nextSet);
      await refresh();
      setView({ kind: 'memo', board: next, memoSet: nextSet, saved: true });
    },
    [refresh],
  );

  const copyLink = useCallback(
    async (id: string) => {
      const set = memoSets.find((m) => m.id === id);
      if (!set) return;
      const board = boards.get(set.boardId);
      if (!board) return;
      const payload = await encodeShare(board, set);
      try {
        await navigator.clipboard.writeText(shareUrl(payload));
        navigator.vibrate?.(8);
      } catch {
        /* クリップボードが使えない環境では何もしない */
      }
    },
    [memoSets, boards],
  );

  if (view.kind === 'setup') {
    return (
      <Setup
        input={view.input}
        onCancel={() => setView({ kind: 'home' })}
        onDone={(board: Board, imported: Marks) => {
          const existing = boards.get(board.id);
          const merged = existing ? { ...board, label: existing.label } : board;
          setView({
            kind: 'memo',
            board: merged,
            memoSet: newMemoSet(merged, imported),
            saved: false,
          });
        }}
      />
    );
  }

  if (view.kind === 'memo') {
    const existing = boards.get(view.board.id);
    return (
      <MemoSession
        key={view.memoSet.id}
        board={view.board}
        initialMemoSet={view.memoSet}
        saved={view.saved}
        existingBoardName={existing?.label}
        onBack={() => setView({ kind: 'list' })}
        onChange={handleChange}
        onSave={(memoSet, boardName, setName) =>
          void saveNow(view.board, memoSet, boardName, setName)
        }
        onShare={(memoSet) =>
          void encodeShare(view.board, memoSet).then(async (payload) => {
            try {
              await navigator.clipboard.writeText(shareUrl(payload));
              navigator.vibrate?.(8);
            } catch {
              /* 無視 */
            }
          })
        }
      />
    );
  }

  if (view.kind === 'share') {
    const existing = boards.get(view.board.id);
    return (
      <MemoSession
        key={view.memoSet.id}
        board={view.board}
        initialMemoSet={view.memoSet}
        saved={false}
        onReset
        existingBoardName={existing?.label}
        onBack={() => {
          history.replaceState(null, '', location.pathname);
          setView({ kind: 'home' });
        }}
        onSave={(memoSet, boardName, setName) => {
          history.replaceState(null, '', location.pathname);
          void saveNow(view.board, memoSet, boardName, setName);
        }}
      />
    );
  }

  if (view.kind === 'home') {
    return (
      <>
        <ImagePicker inputRef={fileInput} onPick={handleImage} />
        <Home
          memoSetCount={memoSets.length}
          onImport={() => fileInput.current?.click()}
          onManual={() => setView({ kind: 'setup', input: blankSetup(9) })}
          onOpenList={() => setView({ kind: 'list' })}
        />
      </>
    );
  }

  return (
    <>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void handleImage(file);
        }}
      />
    <List
      boards={boards}
      memoSets={memoSets}
      onOpen={(set) => {
        const board = boards.get(set.boardId);
        if (board) setView({ kind: 'memo', board, memoSet: set, saved: true });
      }}
      onNew={() => setView({ kind: 'setup', input: blankSetup(9) })}
      onImport={() => fileInput.current?.click()}
      onRename={(id, name) => {
        const set = memoSets.find((m) => m.id === id);
        if (!set) return;
        void db.putMemoSet({ ...set, name, updatedAt: Date.now() }).then(refresh);
      }}
      onDuplicate={(id) => {
        const set = memoSets.find((m) => m.id === id);
        if (!set) return;
        const now = Date.now();
        void db
          .putMemoSet({
            ...set,
            id: newId(),
            name: `${set.name} · ${formatToday(now)}`,
            memos: set.memos.map((m) => ({ ...m, id: newId(), user: m.user.slice() as Marks })),
            createdAt: now,
            updatedAt: now,
          })
          .then(refresh);
      }}
      onDelete={(id) => void db.deleteMemoSetAndOrphanBoard(id).then(refresh)}
      onCopyLink={(id) => void copyLink(id)}
      onBack={() => setView({ kind: 'home' })}
    />
    </>
  );
}

function ImagePicker({
  inputRef,
  onPick,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPick: (blob: Blob) => void;
}) {
  return (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      style={{ display: 'none' }}
      onChange={(e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (file) onPick(file);
      }}
    />
  );
}
