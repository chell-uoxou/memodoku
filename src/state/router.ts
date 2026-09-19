/**
 * ハッシュフラグメントだけを使うルーター。
 *
 * パスを変えると静的ホスティング（GitHub Pages など）でリロード時に 404 になるが、
 * ハッシュならサーバーに送られないので、どこに置いても壊れない。
 * 共有URLの `#s=<payload>` とも同じ場所で共存させる。
 */
export type Route =
  | { kind: 'home' }
  | { kind: 'list' }
  | { kind: 'board'; boardId: string }
  | { kind: 'setup' }
  | { kind: 'memo'; memoSetId: string }
  | { kind: 'share'; payload: string };

export function hashFor(route: Route): string {
  switch (route.kind) {
    case 'home':
      return '';
    case 'list':
      return '#/memos';
    case 'board':
      return `#/memos/board/${route.boardId}`;
    case 'setup':
      return '#/new';
    case 'memo':
      return `#/memo/${route.memoSetId}`;
    case 'share':
      return `#s=${route.payload}`;
  }
}

export function parseHash(hash: string): Route {
  const share = hash.match(/[#&]s=([A-Za-z0-9_-]+)/);
  if (share) return { kind: 'share', payload: share[1] };

  const path = hash.replace(/^#/, '');
  if (path === '/memos') return { kind: 'list' };
  if (path === '/new') return { kind: 'setup' };

  const board = path.match(/^\/memos\/board\/([\w-]+)$/);
  if (board) return { kind: 'board', boardId: board[1] };

  const memo = path.match(/^\/memo\/([\w-]+)$/);
  if (memo) return { kind: 'memo', memoSetId: memo[1] };

  return { kind: 'home' };
}

/** 現在のパス（ハッシュを除いた部分）。ハッシュを書き換えるときに使う */
export function basePath(): string {
  return `${location.pathname}${location.search}`;
}

export function urlFor(route: Route): string {
  return `${basePath()}${hashFor(route)}`;
}
