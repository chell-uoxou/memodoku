import { CatMarkIcon, ClockIcon, ImageIcon, PencilIcon } from '../ui/Icons';
import s from './Home.module.css';

export function Home({
  memoSetCount,
  onImport,
  onManual,
  onOpenList,
}: {
  memoSetCount: number;
  onImport: () => void;
  onManual: () => void;
  onOpenList: () => void;
}) {
  return (
    <div className={s.root}>
      <div className={s.brand}>
        <span className={s.mark}>
          <CatMarkIcon size={28} />
        </span>
        <span>
          <div className={s.title}>Meowdoku Memo</div>
          <div className={s.tagline}>ゲームでは置けないぶんのバツも置けるメモ帳</div>
        </span>
      </div>

      <button className={s.primary} onClick={onImport}>
        <ImageIcon size={26} />
        <span className={s.primaryLabel}>スクショから盤面を読み込み</span>
        <span className={s.primaryHint}>貼り付け・ドラッグ&amp;ドロップでも読み込めます</span>
      </button>

      <div className={s.or}>または</div>

      <button className={s.secondary} onClick={onManual}>
        <PencilIcon />
        <span className={s.grow}>手動で盤面を作成</span>
        <span className={s.chevron}>›</span>
      </button>

      <button className={s.secondary} onClick={onOpenList}>
        <ClockIcon />
        <span className={s.grow}>過去のメモを見る</span>
        <span className={s.count}>{memoSetCount}</span>
        <span className={s.chevron}>›</span>
      </button>
    </div>
  );
}
