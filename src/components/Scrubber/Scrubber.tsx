import { useCallback, useEffect, useRef, useState } from 'react';
import type { Memo } from '../../model/types';
import s from './Scrubber.module.css';

const ITEM = 40;
const GAP = 6;
const PITCH = ITEM + GAP;
const LONG_PRESS_MS = 450;

export type ScrubberProps = {
  memos: Memo[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onDuplicate: (index: number) => void;
  onDelete: (index: number) => void;
  /**
   * 点を付けるメモの id。渡さなければ点は出ない。
   * 共有リンクで開いた盤面で「共有されたものと違う」ことを示すためだけに使う。
   */
  markChanged?: Set<string>;
};

export function Scrubber({
  memos,
  activeIndex,
  onSelect,
  onAdd,
  onDuplicate,
  onDelete,
  markChanged,
}: ScrubberProps) {
  const track = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [menu, setMenu] = useState<number | null>(null);
  const longPress = useRef<number | null>(null);
  const programmatic = useRef(false);
  const lastReported = useRef(activeIndex);

  /** scroll イベントで座標から中央を算出する（IntersectionObserver は遅延が出る） */
  const handleScroll = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const x = el.scrollLeft;
    setOffset(x);
    const index = Math.min(memos.length - 1, Math.max(0, Math.round(x / PITCH)));
    if (index !== lastReported.current) {
      lastReported.current = index;
      navigator.vibrate?.(5);
      onSelect(index);
    }
  }, [memos.length, onSelect]);

  // 外部から activeIndex が変わったら（メモ追加など）そこへスクロールする
  useEffect(() => {
    if (activeIndex === lastReported.current) return;
    const el = track.current;
    if (!el) return;
    lastReported.current = activeIndex;
    programmatic.current = true;
    el.scrollTo({ left: activeIndex * PITCH, behavior: 'smooth' });
  }, [activeIndex]);

  const clearLongPress = () => {
    if (longPress.current !== null) {
      clearTimeout(longPress.current);
      longPress.current = null;
    }
  };

  const itemStyle = (k: number) => {
    const d = Math.min(2.4, Math.abs(k - offset / PITCH));
    return {
      transform: `scale(${(1.25 - d * 0.14).toFixed(3)})`,
      opacity: (1 - d * 0.26).toFixed(3),
    };
  };

  return (
    <div className={s.root}>
      <div className={s.frame} />
      <div ref={track} className={s.track} onScroll={handleScroll}>
        {memos.map((memo, k) => (
          <button
            key={memo.id}
            className={s.item}
            style={itemStyle(k)}
            onPointerDown={() => {
              clearLongPress();
              longPress.current = window.setTimeout(() => {
                longPress.current = null;
                navigator.vibrate?.(8);
                setMenu(k);
              }, LONG_PRESS_MS);
            }}
            onPointerUp={clearLongPress}
            onPointerCancel={clearLongPress}
            onPointerLeave={clearLongPress}
            onClick={() => {
              if (menu !== null) return;
              track.current?.scrollTo({ left: k * PITCH, behavior: 'smooth' });
            }}
          >
            {k + 1}
            {markChanged?.has(memo.id) && <span className={s.dot} />}
          </button>
        ))}
        <button className={`${s.item} ${s.add}`} onClick={onAdd}>
          +
        </button>
      </div>
      {menu !== null && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 4 }}
            onClick={() => setMenu(null)}
          />
          <div className={s.menu}>
            <button
              onClick={() => {
                onDuplicate(menu);
                setMenu(null);
              }}
            >
              複製
            </button>
            <button
              disabled={memos.length < 2}
              onClick={() => {
                onDelete(menu);
                setMenu(null);
              }}
            >
              削除
            </button>
          </div>
        </>
      )}
    </div>
  );
}
