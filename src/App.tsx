import { useCallback, useEffect, useRef, useState } from 'react';
import type { Board, Marks, MemoSet } from './model/types';
import { blankSetup, Setup, type SetupInput } from './components/Setup/Setup';
import { MemoSession } from './components/Memo/MemoSession';
import { List } from './components/List/List';
import { Home } from './components/Home/Home';
import { formatToday, newId, newMemoSet, uniqueMemoName } from './state/memoSet';
import { suppressBrowserGestures } from './gestures';
import { emptyMarks } from './model/board';
import * as db from './db/db';
import { decodeShare, encodeShare, shareUrl } from './share/codec';
import { shareLink } from './share/send';
import { Toast } from './components/ui/Toast';
import { importScreenshot, pickImage, readClipboardImage } from './vision/import';
import { Busy } from './components/ui/Busy';
import { useBeforeUnload } from './state/unsaved';
import { navigate } from './state/navigation';
import { parseHash, urlFor, type Route } from './state/router';
import { confirmDiscard } from './state/unsaved';
import { blankSetup as blank } from './components/Setup/Setup';
import './styles/global.css';

type View =
  | { kind: 'home' }
  | { kind: 'list'; boardId: string | null }
  | { kind: 'setup'; input: SetupInput; id: string }
  | { kind: 'memo'; board: Board; memoSet: MemoSet }
  | { kind: 'share'; board: Board; memoSet: MemoSet };

/** 画面から、URL に載せるルートを取り出す */
function routeOf(view: View): Route {
  switch (view.kind) {
    case 'home':
      return { kind: 'home' };
    case 'list':
      return view.boardId ? { kind: 'board', boardId: view.boardId } : { kind: 'list' };
    case 'setup':
      return { kind: 'setup' };
    case 'memo':
      return { kind: 'memo', memoSetId: view.memoSet.id };
    case 'share':
      return { kind: 'home' }; // 共有ペイロードは別途 replaceState で扱う
  }
}

export default function App() {
  /**
   * 画面のスタック。末尾が今見ている画面。
   * ブラウザの履歴には深さだけを載せ、戻る操作が来たらここを削る。
   * URL はハッシュだけを書き換えるので、静的ホスティングのままで動く。
   */
  const [stack, setStack] = useState<View[]>([{ kind: 'home' }]);
  const view = stack[stack.length - 1];
  const stackRef = useRef(stack);
  stackRef.current = stack;
  const [boards, setBoards] = useState<Map<string, Board>>(new Map());
  const [memoSets, setMemoSets] = useState<MemoSet[]>([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const autosave = useRef<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const imageUrl = useRef<string | null>(null);
  const pending = useRef<MemoSet | null>(null);

  const [setupDirty, setSetupDirty] = useState(false);
  const setupDirtyRef = useRef(setupDirty);
  setupDirtyRef.current = setupDirty;

  /** 今の画面を離れてよいか。未保存なら確認する */
  const canLeave = useCallback((current: View) => {
    if (current.kind === 'setup' && setupDirtyRef.current) {
      return confirmDiscard('作成中の盤面を破棄しますか？');
    }
    return true;
  }, []);

  /** 1つ進む。履歴にも積むので、ブラウザの戻るとスワイプで戻れる */
  const push = useCallback((next: View) => {
    const depth = stackRef.current.length + 1;
    history.pushState({ depth }, '', urlFor(routeOf(next)));
    navigate('push', () => setStack((prev) => [...prev, next]));
  }, []);

  /** 今の画面を差し替える（進む・戻るではない） */
  const replace = useCallback((next: View) => {
    history.replaceState({ depth: stackRef.current.length }, '', urlFor(routeOf(next)));
    setStack((prev) => [...prev.slice(0, -1), next]);
  }, []);

  /**
   * 画面内の戻るボタンから履歴を戻したかどうか。
   * iOS Safari の戻るスワイプはブラウザ自身がページを動かすので、
   * そのうえに自前の遷移を重ねると一拍遅れて二重に見える。
   * 明示的に押されたときだけアニメーションさせる。
   */
  const backPressed = useRef(false);

  /** 1つ戻る。実体はブラウザの履歴を戻すだけで、popstate 側が画面を切り替える */
  const back = useCallback(() => {
    if (!canLeave(stackRef.current[stackRef.current.length - 1])) return;
    if (stackRef.current.length > 1) {
      backPressed.current = true;
      // popstate が来なかったときに取り残されないように戻しておく
      window.setTimeout(() => {
        backPressed.current = false;
      }, 600);
      history.back();
    } else {
      navigate('pop', () => setStack([{ kind: 'home' }]));
    }
  }, [canLeave]);

  // 未保存の変更があるあいだはタブを閉じる前に確認する
  useBeforeUnload(view.kind === 'setup' && setupDirty);

  useEffect(suppressBrowserGestures, []);

  /** 保存済みのメモと名前がぶつからないように連番を足す */
  const nextName = useCallback(async (base: string) => {
    const sets = await db.allMemoSets();
    return uniqueMemoName(base, sets.map((m) => m.name));
  }, []);

  const refresh = useCallback(async () => {
    const [b, m] = await Promise.all([db.allBoards(), db.allMemoSets()]);
    setBoards(new Map(b.map((x) => [x.id, x])));
    setMemoSets(m);
  }, []);

  // 起動時: URL のハッシュから画面を復元する
  useEffect(() => {
    let alive = true;
    void (async () => {
      const [boardList, sets] = await Promise.all([db.allBoards(), db.allMemoSets()]);
      if (!alive) return;
      const boardMap = new Map(boardList.map((b) => [b.id, b]));
      setBoards(boardMap);
      setMemoSets(sets);

      const route = parseHash(location.hash);
      if (route.kind === 'share') {
        const out = await decodeShare(route.payload);
        if (!alive) return;
        if (out) {
          setStack([{ kind: 'share', board: out.board, memoSet: out.memoSet }]);
          history.replaceState({ depth: 1 }, '', location.href);
          return;
        }
      }

      // 深い URL で開かれたときは、そこまでの履歴を積み直して戻れるようにする
      const restored: View[] = [{ kind: 'home' }];
      if (route.kind === 'list') restored.push({ kind: 'list', boardId: null });
      if (route.kind === 'board') {
        restored.push({ kind: 'list', boardId: null });
        if (boardMap.has(route.boardId)) {
          restored.push({ kind: 'list', boardId: route.boardId });
        }
      }
      if (route.kind === 'memo') {
        const set = sets.find((m) => m.id === route.memoSetId);
        const board = set && boardMap.get(set.boardId);
        restored.push({ kind: 'list', boardId: null });
        if (set && board) restored.push({ kind: 'memo', board, memoSet: set });
      }

      if (!alive) return;
      setStack(restored);
      history.replaceState({ depth: 1 }, '', urlFor(routeOf(restored[0])));
      for (let i = 1; i < restored.length; i++) {
        history.pushState({ depth: i + 1 }, '', urlFor(routeOf(restored[i])));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ブラウザの戻る / iOS のスワイプ
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const byButton = backPressed.current;
      backPressed.current = false;
      const depth = (e.state as { depth?: number } | null)?.depth ?? 1;
      const current = stackRef.current;
      if (depth >= current.length) return; // 進む方向は復元できないので何もしない

      if (!canLeave(current[current.length - 1])) {
        // 戻らせない。消えた履歴エントリを積み直して今の画面に留まる
        history.pushState({ depth: current.length }, '', urlFor(routeOf(current[current.length - 1])));
        return;
      }
      // スワイプで戻ったときはブラウザ側の動きに任せる
      navigate(byButton ? 'pop' : 'none', () => setStack(current.slice(0, depth)));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [canLeave]);

  /** 保存済みの MemoSet は変更から500msデバウンスでオートセーブ */
  const handleChange = useCallback(
    (memoSet: MemoSet) => {
      setStack((prev) => {
        const top = prev[prev.length - 1];
        if (top.kind !== 'memo') return prev;
        return [...prev.slice(0, -1), { ...top, memoSet }];
      });
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
      push(next);
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

  /**
   * 盤面の確認が終わった時点で保存してメモ画面へ。
   * 同じ形の盤面（Board.id が一致）が既にあれば、その記録にそのまま結びつける。
   * 色や名前は保存済みのものを正とし、名前を入力し直したときだけ上書きする。
   */
  const saveAndOpen = useCallback(
    async (board: Board, imported: Marks) => {
      const existing = boards.get(board.id);
      const merged: Board = existing
        ? { ...existing, label: board.label || existing.label }
        : board;
      const set = newMemoSet(merged, imported, await nextName(formatToday()));
      await db.putBoard(merged);
      await db.putMemoSet(set);
      await refresh();
      // 確認画面には戻らないので履歴も差し替える
      replace({ kind: 'memo', board: merged, memoSet: set });
    },
    [boards, refresh, replace, nextName],
  );

  /** 共有リンクから受け取ったものを自分の保存先に取り込む */
  const importShared = useCallback(
    async (board: Board, memoSet: MemoSet, boardName: string, setName: string) => {
      const existing = boards.get(board.id);
      const merged: Board = existing
        ? { ...existing, label: boardName || existing.label }
        : { ...board, label: boardName };
      const nextSet: MemoSet = {
        ...memoSet,
        name: await nextName(setName || formatToday()),
        updatedAt: Date.now(),
      };
      await db.putBoard(merged);
      await db.putMemoSet(nextSet);
      await refresh();
      replace({ kind: 'memo', board: merged, memoSet: nextSet });
    },
    [boards, refresh, replace],
  );

  /** 複製してそのまま開く */
  const duplicate = useCallback(
    async (id: string) => {
      const set = memoSets.find((m) => m.id === id);
      const board = set && boards.get(set.boardId);
      if (!set || !board) return;
      if (!window.confirm(`「${set.name}」を複製しますか？`)) return;
      const now = Date.now();
      const copy: MemoSet = {
        ...set,
        id: newId(),
        name: await nextName(set.name),
        memos: set.memos.map((m) => ({ ...m, id: newId(), user: m.user.slice() as Marks })),
        createdAt: now,
        updatedAt: now,
      };
      await db.putMemoSet(copy);
      await refresh();
      push({ kind: 'memo', board, memoSet: copy });
    },
    [memoSets, boards, refresh, push, nextName],
  );

  /** 盤面名だけを変える */
  const renameBoard = useCallback(
    async (boardId: string, name: string) => {
      const board = boards.get(boardId);
      if (!board || board.label === name) return;
      await db.putBoard({ ...board, label: name });
      await refresh();
      setStack((prev) =>
        prev.map((v) =>
          v.kind === 'memo' && v.board.id === boardId
            ? { ...v, board: { ...v.board, label: name } }
            : v,
        ),
      );
    },
    [boards, refresh],
  );

  /** その盤面で新しいメモを作って開く */
  const newMemoOnBoard = useCallback(
    async (boardId: string) => {
      const board = boards.get(boardId);
      if (!board) return;
      const set = newMemoSet(board, undefined, await nextName(formatToday()));
      await db.putMemoSet(set);
      await refresh();
      push({ kind: 'memo', board, memoSet: set });
    },
    [boards, refresh, push, nextName],
  );

  /**
   * 盤面をもとに新しい盤面を作る。
   * Board.id は領域の形から作るハッシュなので、そのまま複製しても同じ盤面に戻ってしまう。
   * 形を編集して初めて別の盤面になるので、作成画面をその盤面で開く。
   */
  const duplicateBoard = useCallback(
    (boardId: string) => {
      const board = boards.get(boardId);
      if (!board) return;
      push({
        kind: 'setup',
        id: newId(),
        input: {
          n: board.n,
          regions: [...board.regions],
          palette: [...board.palette],
          imported: emptyMarks(board.n),
          label: board.label,
          kind: board.kind,
        },
      });
    },
    [boards, push],
  );

  /** 盤面とそのメモをまとめて消す */
  const deleteBoard = useCallback(
    async (boardId: string) => {
      await db.deleteBoardWithMemoSets(boardId);
      await refresh();
      back();
    },
    [refresh, back],
  );

  /** 盤面名とメモ名の変更 */
  const rename = useCallback(
    async (id: string, memoName: string, boardName: string) => {
      const set = memoSets.find((m) => m.id === id);
      if (!set) return;
      const board = boards.get(set.boardId);
      await db.putMemoSet({ ...set, name: memoName, updatedAt: Date.now() });
      if (board && board.label !== boardName) await db.putBoard({ ...board, label: boardName });
      await refresh();
      setStack((prev) =>
        prev.map((v) =>
          v.kind === 'memo' && v.memoSet.id === id
            ? {
                ...v,
                memoSet: { ...v.memoSet, name: memoName },
                board: board ? { ...board, label: boardName } : v.board,
              }
            : v,
        ),
      );
    },
    [memoSets, boards, refresh],
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
          back();
        }}
        onDone={(board: Board, imported: Marks) => {
          dropImage();
          void saveAndOpen(board, imported);
        }}
      />
    );
  }

  if (view.kind === 'memo') {
    return (
      <MemoSession
        key={view.memoSet.id}
        board={view.board}
        initialMemoSet={view.memoSet}
        onBack={back}
        onChange={handleChange}
        onRename={(memoName, boardName) => void rename(view.memoSet.id, memoName, boardName)}
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
        onReset
        existingBoardName={existing?.label}
        onBack={() => {
          history.replaceState({ depth: 1 }, '', location.pathname);
          navigate('pop', () => setStack([{ kind: 'home' }]));
        }}
        onSave={(memoSet, boardName, setName) => {
          history.replaceState({ depth: 1 }, '', location.pathname);
          void importShared(view.board, memoSet, boardName, setName);
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
        onManual={() => push({ kind: 'setup', input: blankSetup(9), id: newId() })}
        onOpenList={() => push({ kind: 'list', boardId: null })}
      />
    );
  }

  return (
    <List
      boards={boards}
      memoSets={memoSets}
      onOpen={(set) => {
        const board = boards.get(set.boardId);
        if (board) push({ kind: 'memo', board, memoSet: set });
      }}
      onRename={(id, memoName, boardName) => void rename(id, memoName, boardName)}
      onDuplicate={(id) => void duplicate(id)}
      onDelete={(id) => void db.deleteMemoSetAndOrphanBoard(id).then(refresh)}
      onCopyLink={copyLink}
      onPrepareShare={(id) => {
        const set = memoSets.find((m) => m.id === id);
        const board = set && boards.get(set.boardId);
        if (set && board) prepareShare(board, set);
      }}
      onBack={back}
      openBoardId={view.kind === 'list' ? view.boardId : null}
      onOpenBoard={(boardId) => {
        if (boardId) push({ kind: 'list', boardId });
        else back();
      }}
      onRenameBoard={(boardId, name) => void renameBoard(boardId, name)}
      onNewMemo={(boardId) => void newMemoOnBoard(boardId)}
      onDuplicateBoard={duplicateBoard}
      onDeleteBoard={(boardId) => void deleteBoard(boardId)}
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
