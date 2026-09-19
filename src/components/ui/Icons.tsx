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

export const GearIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2.6v2.2M12 19.2v2.2M21.4 12h-2.2M4.8 12H2.6M18.6 5.4l-1.6 1.6M7 17l-1.6 1.6M18.6 18.6 17 17M7 7 5.4 5.4" />
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

export const ListIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M4 6h16M4 12h16M4 18h16" />
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

export const ShareIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M12 15V3M8 7l4-4 4 4" />
    <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
  </svg>
);

export const CheckIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </svg>
);
