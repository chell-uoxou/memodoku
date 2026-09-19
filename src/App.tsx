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
import { shareLink } from './share/send';
import { Toast } from './components/ui/Toast';
import { importScreenshot, pickImage, readClipboardImage } from './vision/import';
import { Busy } from './components/ui/Busy';
import { useBeforeUnload } from './state/unsaved';
import { navigate } from './state/navigation';
import { blankSetup as blank } from './components/Setup/Setup';
import './styles/global.css';

type View =
  | { kind: 'home' }
  | { kind: 'list' }
  | { kind: 'setup'; input: SetupInput; id: string }
  | { kind: 'memo'; board: Board; memoSet: MemoSet; saved: boolean }
  | { kind: 'share'; board: Board; memoSet: MemoSet };

export default function App() {
  const [view, setView] = useState<View>({ kind: 'home' });
  const [boards, setBoards] = useState<Map<string, Board>>(new Map());
  const [memoSets, setMemoSets] = useState<MemoSet[]>([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const autosave = useRef<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const imageUrl = useRef<string | null>(null);
  const pending = useRef<MemoSet | null>(null);

  const [setupDirty, setSetupDirty] = useState(false);

  // 未保存の変更があるあいだはタブを閉じる前に確認する
  useBeforeUnload(
    view.kind === 'memo' ? !view.saved : view.kind === 'setup' ? setupDirty : false,
  );

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
      pending.current = memoSet;
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
    setBusy(true);
    // 解析はメインスレッドを塞ぐので、先にスピナーを描かせる
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    try {
      const input = await importScreenshot(blob).catch(() => null);
      if (imageUrl.current) URL.revokeObjectURL(imageUrl.current);
      imageUrl.current = URL.createObjectURL(blob);
      const next = {
        kind: 'setup' as const,
        input: { ...(input ?? blank(9)), imageUrl: imageUrl.current },
        id: newId(),
      };
      navigate('push', () => setView(next));
    } finally {
      setBusy(false);
    }
  }, []);

  const dropImage = useCallback(() => {
    if (!imageUrl.current) return;
    URL.revokeObjectURL(imageUrl.current);
    imageUrl.current = null;
  }, []);

  const handlePaste = useCallback(async () => {
    try {
      const blob = await readClipboardImage();
      if (blob) await handleImage(blob);
      else window.alert('クリップボードに画像がありません。');
    } catch {
      window.alert('クリップボードを読み取れませんでした。');
    }
  }, [handleImage]);

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

  // デバウンス中の変更を取りこぼさないよう、離脱時に書き出す
  useEffect(() => {
    const flush = () => {
      const memoSet = pending.current;
      if (!memoSet) return;
      void db.getMemoSet(memoSet.id).then((existing) => {
        if (existing) void db.putMemoSet(memoSet);
      });
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', flush);
    };
  }, []);

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

  /**
   * 共有URLの先読み。iOS では共有シートもクリップボードも
   * タップと同じタスクで呼ぶ必要があるので、押される前に作っておく。
   */
  const shareCache = useRef(new Map<string, string>());

  const prepareShare = useCallback((board: Board, memoSet: MemoSet) => {
    const key = `${memoSet.id}:${memoSet.updatedAt}`;
    if (shareCache.current.has(key)) return;
    void encodeShare(board, memoSet).then((payload) => {
      shareCache.current.set(key, shareUrl(payload));
      if (shareCache.current.size > 20) {
        shareCache.current.delete(shareCache.current.keys().next().value!);
      }
    });
  }, []);

  const share = useCallback((board: Board, memoSet: MemoSet) => {
    const url = shareCache.current.get(`${memoSet.id}:${memoSet.updatedAt}`);
    if (!url) {
      setToast('共有リンクを準備しています');
      void encodeShare(board, memoSet).then((payload) => {
        shareCache.current.set(`${memoSet.id}:${memoSet.updatedAt}`, shareUrl(payload));
      });
      return;
    }
    void shareLink(url, memoSet.name).then((message) => {
      if (!message) return;
      navigator.vibrate?.(8);
      setToast(message);
    });
  }, []);

  const copyLink = useCallback(
    (id: string) => {
      const set = memoSets.find((m) => m.id === id);
      if (!set) return;
      const board = boards.get(set.boardId);
      if (board) share(board, set);
    },
    [memoSets, boards, share],
  );

  // 書き込みのたびに作り直さないよう、少し待ってから先読みする
  useEffect(() => {
    if (view.kind !== 'memo' && view.kind !== 'share') return;
    const { board, memoSet } = view;
    const id = window.setTimeout(() => prepareShare(board, memoSet), 400);
    return () => clearTimeout(id);
  }, [view, prepareShare]);

  const screen = (() => {
  if (view.kind === 'setup') {
    return (
      <Setup
        key={view.id}
        input={view.input}
        onDirtyChange={setSetupDirty}
        onCancel={() => {
          dropImage();
          navigate('pop', () => setView({ kind: 'home' }));
        }}
        onDone={(board: Board, imported: Marks) => {
          dropImage();
          const existing = boards.get(board.id);
          const merged = existing ? { ...board, label: existing.label } : board;
          navigate('push', () =>
            setView({
              kind: 'memo',
              board: merged,
              memoSet: newMemoSet(merged, imported),
              saved: false,
            }),
          );
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
        onBack={() => navigate('pop', () => setView({ kind: 'list' }))}
        onChange={handleChange}
        onSave={(memoSet, boardName, setName) =>
          void saveNow(view.board, memoSet, boardName, setName)
        }
        onShare={(memoSet) => share(view.board, memoSet)}
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
          navigate('pop', () => setView({ kind: 'home' }));
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
      <Home
        memoSetCount={memoSets.length}
        onImport={() => fileInput.current?.click()}
        onPaste={() => void handlePaste()}
        onManual={() =>
          navigate('push', () =>
            setView({ kind: 'setup', input: blankSetup(9), id: newId() }),
          )
        }
        onOpenList={() => navigate('push', () => setView({ kind: 'list' }))}
      />
    );
  }

  return (
    <List
      boards={boards}
      memoSets={memoSets}
      onOpen={(set) => {
        const board = boards.get(set.boardId);
        if (board) {
          navigate('push', () => setView({ kind: 'memo', board, memoSet: set, saved: true }));
        }
      }}
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
      onCopyLink={copyLink}
      onPrepareShare={(id) => {
        const set = memoSets.find((m) => m.id === id);
        const board = set && boards.get(set.boardId);
        if (set && board) prepareShare(board, set);
      }}
      onBack={() => navigate('pop', () => setView({ kind: 'home' }))}
    />
  );
  })();

  return (
    <>
      <ImagePicker inputRef={fileInput} onPick={handleImage} />
      {screen}
      {busy && <Busy label="スクショを読み取っています" />}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
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
