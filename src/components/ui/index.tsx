import type { ReactNode } from 'react';
import s from './ui.module.css';

export function IconButton({
  children,
  onClick,
  disabled,
  small,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  small?: boolean;
  title?: string;
}) {
  return (
    <button
      className={`${s.iconBtn} ${small ? s.small : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={title}
    >
      {children}
    </button>
  );
}

export function Sheet({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <>
      <div className={s.backdrop} onPointerDown={onClose} />
      <div className={s.sheet}>{children}</div>
    </>
  );
}

export function ToggleRow({
  label,
  on,
  onToggle,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={s.row}>
      <span>{label}</span>
      <button className={s.switch} data-on={on} onClick={onToggle} aria-label={label}>
        <span className={s.knob} />
      </button>
    </div>
  );
}

export const ui = s;
