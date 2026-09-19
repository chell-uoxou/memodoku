export type Mark = 0 | 1 | 2; // 0=空 1=バツ 2=猫
export type Marks = Mark[]; // 長さ N*N、row-major

export const EMPTY = 0 as const;
export const CROSS = 1 as const;
export const CAT = 2 as const;

export type BoardKind = 'regular' | 'daily' | 'unknown';

export type Board = {
  id: string; // regions を正規化したハッシュ
  n: number;
  regions: number[]; // 長さ N*N、値は 0..N-1
  palette: string[]; // 領域色 hex、index は regions の値と対応
  label: string;
  kind: BoardKind;
};

export type Memo = {
  id: string;
  showImported: boolean; // 既定 false
  user: Marks;
};

export type MemoSet = {
  id: string;
  boardId: string;
  name: string;
  imported: Marks; // スクショから読んだ猫とバツ（セット共通・不変）
  memos: Memo[];
  activeIndex: number;
  createdAt: number;
  updatedAt: number;
};
