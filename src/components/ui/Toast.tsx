import { useEffect } from 'react';
import s from './ui.module.css';

/** 画面下に短く出す通知 */
export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const id = window.setTimeout(onDone, 2200);
    return () => clearTimeout(id);
  }, [message, onDone]);

  return <div className={s.toast}>{message}</div>;
}
