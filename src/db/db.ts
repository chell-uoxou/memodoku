import type { Board, MemoSet } from '../model/types';

/**
 * 保存先の名前。サービス名は Memodoku に変えたが、ここを変えると
 * 既に保存されているメモが見えなくなるのでそのままにしてある。
 */
const NAME = 'meowdoku-memo';
const VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('boards')) {
        db.createObjectStore('boards', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('memoSets')) {
        const store = db.createObjectStore('memoSets', { keyPath: 'id' });
        store.createIndex('boardId', 'boardId');
        store.createIndex('createdAt', 'createdAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function run<T>(
  store: 'boards' | 'memoSets',
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const req = fn(tx.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export const putBoard = (board: Board) => run('boards', 'readwrite', (s) => s.put(board));
export const getBoard = (id: string) =>
  run<Board | undefined>('boards', 'readonly', (s) => s.get(id));
export const allBoards = () => run<Board[]>('boards', 'readonly', (s) => s.getAll());

export const putMemoSet = (memoSet: MemoSet) =>
  run('memoSets', 'readwrite', (s) => s.put(memoSet));
export const getMemoSet = (id: string) =>
  run<MemoSet | undefined>('memoSets', 'readonly', (s) => s.get(id));
export const allMemoSets = () => run<MemoSet[]>('memoSets', 'readonly', (s) => s.getAll());
export const deleteMemoSet = (id: string) =>
  run('memoSets', 'readwrite', (s) => s.delete(id));

/** MemoSet を消したあと、紐づく MemoSet がなくなった Board も消す */
export async function deleteMemoSetAndOrphanBoard(id: string) {
  const memoSet = await getMemoSet(id);
  await deleteMemoSet(id);
  if (!memoSet) return;
  const rest = await allMemoSets();
  if (!rest.some((m) => m.boardId === memoSet.boardId)) {
    await run('boards', 'readwrite', (s) => s.delete(memoSet.boardId));
  }
}

/** 盤面と、それに紐づく MemoSet をまとめて消す */
export async function deleteBoardWithMemoSets(boardId: string) {
  const sets = await allMemoSets();
  for (const set of sets) {
    if (set.boardId === boardId) await deleteMemoSet(set.id);
  }
  await run('boards', 'readwrite', (s) => s.delete(boardId));
}
