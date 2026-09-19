import { flushSync } from 'react-dom';

/**
 * 'none' はアニメーションなしで即座に切り替える。
 * iOS Safari の戻るスワイプはブラウザ側が既に動きを見せているので、
 * そのあとに自前の遷移を重ねると一拍遅れて二重に再生されてしまう。
 */
export type NavDirection = 'push' | 'pop' | 'none';

type ViewTransition = {
  finished: Promise<void>;
  updateCallbackDone: Promise<void>;
};

type WithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => ViewTransition;
};

/**
 * 画面遷移を View Transitions API でアニメーションさせる。
 *
 * 進む（push）と戻る（pop）で向きが変わる。実際の動きは global.css の
 * `::view-transition-old(root)` / `::view-transition-new(root)` 側に書いてあり、
 * ここでは `html[data-nav]` を立てて向きを伝えるだけ。
 *
 * 遷移は「タブが裏に回っている」「前の遷移がまだ動いている」などの理由で
 * 中断されることがある（InvalidStateError）。中断されるとコールバックが
 * 呼ばれないまま終わるので、**必ず update が一度は走る**ように組んである。
 * 非対応ブラウザと「視差効果を減らす」設定のときも、そのまま切り替える。
 */
export function navigate(direction: NavDirection, update: () => void) {
  const doc = document as WithViewTransition;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canAnimate =
    direction !== 'none' &&
    typeof doc.startViewTransition === 'function' &&
    !reduceMotion &&
    document.visibilityState === 'visible';

  if (!canAnimate) {
    update();
    return;
  }

  const root = document.documentElement;
  let ran = false;
  const runOnce = () => {
    if (ran) return;
    ran = true;
    update();
  };
  const cleanup = () => {
    if (root.dataset.nav === direction) delete root.dataset.nav;
  };

  root.dataset.nav = direction;
  try {
    // startViewTransition は同期的に DOM が変わっている前提なので flushSync で確定させる
    const transition = doc.startViewTransition!(() => {
      ran = true;
      flushSync(update);
    });
    transition.updateCallbackDone.catch(runOnce);
    transition.finished.catch(() => {}).finally(cleanup);
  } catch {
    runOnce();
    cleanup();
  }
}
