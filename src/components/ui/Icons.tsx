import { CAT_PATH } from './catPath';

type P = { size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export const UndoIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h9a7 7 0 0 1 0 14h-3" />
  </svg>
);

export const RedoIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="m15 14 5-5-5-5" />
    <path d="M20 9h-9a7 7 0 0 0 0 14h3" />
  </svg>
);

export const EyeIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const EyeOffIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
    <path d="m4 20 16-16" />
  </svg>
);

/** 設定。トグルが並ぶシートを開くのでスライダーの形にしている */
export const SettingsIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
    <circle cx="16" cy="7" r="2.3" />
    <circle cx="8" cy="17" r="2.3" />
  </svg>
);

export const SaveIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M5 4h11l3 3v13H5z" />
    <path d="M8 4v5h7V4M8 20v-6h8v6" />
  </svg>
);

export const BackIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="m14 5-7 7 7 7" />
  </svg>
);

export const PlusIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const ImageIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <circle cx="8.5" cy="9.5" r="1.6" />
    <path d="m4 18 5-5 4 3.5 3-2.5 4 4" />
  </svg>
);

/** リスト表示。ハンバーガーメニューと区別できるよう行頭にマークを置く */
export const ListIcon = ({ size = 18 }: P) => (
  <svg {...base(size)} strokeWidth={1.9}>
    <rect x="3" y="4.5" width="4" height="4" rx="1.2" />
    <rect x="3" y="15.5" width="4" height="4" rx="1.2" />
    <path d="M10.5 6.5H21M10.5 17.5H21" />
  </svg>
);

export const MoreIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);

export const GridIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <rect x="4" y="4" width="7" height="7" rx="2" />
    <rect x="13" y="4" width="7" height="7" rx="2" />
    <rect x="4" y="13" width="7" height="7" rx="2" />
    <rect x="13" y="13" width="7" height="7" rx="2" />
  </svg>
);

export const FolderIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </svg>
);

/** 盤面グループ表示が有効なときのアイコン（開いたフォルダ） */
export const FolderOpenIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M3 18V7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V11" />
    <path d="m3 18 2.6-6.2A2 2 0 0 1 7.4 10.5H22l-2.6 6.2a2 2 0 0 1-1.8 1.3H5a2 2 0 0 1-2-2z" />
  </svg>
);

/** ホーム画面などで使う猫のマーク */
export const CatMarkIcon = ({ size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="currentColor" aria-hidden>
    <path d={CAT_PATH} />
  </svg>
);

export const ClockIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5.2l3.2 2" />
  </svg>
);

export const PencilIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17z" />
    <path d="m14.5 6.5 3 3" />
  </svg>
);

export const TrashIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
  </svg>
);

export const CopyIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <rect x="9" y="9" width="11" height="11" rx="2.5" />
    <path d="M15 5.5A2.5 2.5 0 0 0 12.5 4H6a2 2 0 0 0-2 2v6.5A2.5 2.5 0 0 0 6.5 15" />
  </svg>
);

export const LinkIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 0 0-5.7-5.7l-1.3 1.3" />
    <path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.6 2.6a4 4 0 1 0 5.7 5.7l1.3-1.3" />
  </svg>
);

export const ShareIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M12 15V3M8 7l4-4 4 4" />
    <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
  </svg>
);

export const ChevronRightIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="m9.5 5 7 7-7 7" />
  </svg>
);

export const ClipboardIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <rect x="5" y="4" width="14" height="17" rx="2.5" />
    <path d="M9 4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V6H9z" />
  </svg>
);

export const BrushIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17z" />
    <path d="m14.5 6.5 3 3" />
  </svg>
);

export const DownloadIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M12 3v11M8 10.5l4 4 4-4" />
    <path d="M5 20h14" />
  </svg>
);

export const CheckIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </svg>
);
