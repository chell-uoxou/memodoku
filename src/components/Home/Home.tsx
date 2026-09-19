import {
  CatMarkIcon,
  ChevronRightIcon,
  ClipboardIcon,
  ClockIcon,
  ImageIcon,
  PencilIcon,
} from '../ui/Icons';
import s from './Home.module.css';

export function Home({
  memoSetCount,
  onImport,
  onPaste,
  onManual,
  onOpenList,
}: {
  memoSetCount: number;
  onImport: () => void;
  onPaste: () => void;
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
          <div className={s.title}>memodoku</div>
          <div className={s.tagline}>Meowdokuの盤面を読み込み、メモ、共有</div>
        </span>
      </div>

      <button className={s.primary} onClick={onImport}>
        <ImageIcon size={26} />
        <span className={s.primaryLabel}>スクショから盤面を読み込み</span>
      </button>

      <button className={s.secondary} onClick={onPaste}>
        <ClipboardIcon />
        <span className={s.grow}>クリップボードから読み込み</span>
        <span className={s.chevron}>
          <ChevronRightIcon size={17} />
        </span>
      </button>

      <div className={s.or}>または</div>

      <button className={s.secondary} onClick={onManual}>
        <PencilIcon />
        <span className={s.grow}>手動で盤面を作成</span>
        <span className={s.chevron}>
          <ChevronRightIcon size={17} />
        </span>
      </button>

      <button className={s.secondary} onClick={onOpenList}>
        <ClockIcon />
        <span className={s.grow}>過去のメモを見る</span>
        <span className={s.count}>{memoSetCount}</span>
        <span className={s.chevron}>
          <ChevronRightIcon size={17} />
        </span>
      </button>
    </div>
  );
}
