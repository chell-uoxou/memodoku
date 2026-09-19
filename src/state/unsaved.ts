import { useEffect } from 'react';

/**
 * 未保存の変更があるあいだ、タブを閉じる・再読み込みするときに
 * ブラウザの確認ダイアログを出す。
 */
export function useBeforeUnload(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // 古いブラウザ向け。文言自体はブラウザが決める
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [active]);
}

/** 画面内の遷移で使う確認。OK なら true */
export function confirmDiscard(message = '保存していない変更があります。破棄しますか？') {
  return window.confirm(message);
}
