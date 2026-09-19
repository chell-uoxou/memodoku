import { flushSync } from 'react-dom';

export type NavDirection = 'push' | 'pop';

type WithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> };
};

/**
 * 画面遷移を View Transitions API でアニメーションさせる。
 *
 * 進む（push）と戻る（pop）で向きが変わる。実際の動きは global.css の
 * `::view-transition-old(root)` / `::view-transition-new(root)` 側に書いてあり、
 * ここでは `html[data-nav]` を立てて向きを伝えるだけ。
 *
 * 非対応ブラウザと「視差効果を減らす」設定のときは、そのまま切り替える。
 */
export function navigate(direction: NavDirection, update: () => void) {
  const doc = document as WithViewTransition;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion || typeof doc.startViewTransition !== 'function') {
    update();
    return;
  }

  const root = document.documentElement;
  root.dataset.nav = direction;
  // startViewTransition は同期的に DOM が変わっている前提なので flushSync で確定させる
  const transition = doc.startViewTransition(() => flushSync(update));
  void transition.finished.finally(() => {
    delete root.dataset.nav;
  });
}
