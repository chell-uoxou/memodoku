import type { ReactNode } from 'react';
import { useKeyboardInset } from '../../state/viewport';
import s from './ui.module.css';

export function IconButton({
  children,
  onClick,
  disabled,
  small,
  active,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  small?: boolean;
  /** トグルとして使うとき、有効なら色を反転させる */
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      className={`${s.iconBtn} ${small ? s.small : ''} ${active ? s.active : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={title}
      title={title}
    >
      {children}
    </button>
  );
}

export function Sheet({
  children,
  onClose,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  title?: string;
}) {
  const keyboard = useKeyboardInset();
  return (
    <>
      <div className={s.backdrop} onClick={onClose} />
      <div
        className={s.sheet}
        style={{
          bottom: keyboard,
          maxHeight: `calc(100dvh - ${keyboard + 24}px)`,
          paddingBottom: keyboard ? 18 : undefined,
        }}
      >
        {title && <div className={s.sheetTitle}>{title}</div>}
        {children}
      </div>
    </>
  );
}

export function ToggleRow({
  label,
  hint,
  badge,
  on,
  onToggle,
}: {
  label: string;
  hint?: string;
  /** 名前の横に出す小さなラベル（「ベータ」など） */
  badge?: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={s.row}>
      <span className={s.rowText}>
        <span className={s.rowLabel}>
          {label}
          {badge && <span className={s.badge}>{badge}</span>}
        </span>
        {hint && <span className={s.rowHint}>{hint}</span>}
      </span>
      <button className={s.switch} data-on={on} onClick={onToggle} aria-label={label}>
        <span className={s.knob} />
      </button>
    </div>
  );
}

export const ui = s;
