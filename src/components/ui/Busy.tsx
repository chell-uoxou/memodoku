import s from './ui.module.css';

/** 処理中の覆い。スクショの解析中に出す */
export function Busy({ label }: { label: string }) {
  return (
    <div className={s.busy}>
      <div className={s.busyCard}>
        <span className={s.spinner} />
        <span>{label}</span>
      </div>
    </div>
  );
}
