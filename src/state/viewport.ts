import { useEffect, useState } from 'react';

/**
 * ソフトウェアキーボードが占めている高さ。
 * iOS Safari はキーボードが出てもレイアウトビューポートが縮まないので、
 * position:fixed のシートがキーボードの裏に隠れてしまう。
 * visualViewport との差分をシートの下余白に足して回避する。
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      setInset(Math.max(0, Math.round(window.innerHeight - (vv.height + vv.offsetTop))));
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return inset;
}
