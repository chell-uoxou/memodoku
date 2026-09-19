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
