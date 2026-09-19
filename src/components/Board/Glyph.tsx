/** バツ: 白の2本線。線幅はセル辺長の11%、端は丸く、26%だけ内側に余白 */
export function CrossGlyph() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden focusable="false">
      <g
        stroke="var(--mark)"
        strokeWidth="11"
        strokeLinecap="round"
        fill="none"
      >
        <line x1="26" y1="26" x2="74" y2="74" />
        <line x1="74" y1="26" x2="26" y2="74" />
      </g>
    </svg>
  );
}

/** 猫: 塗りつぶしの丸＋2つの三角の耳（ゲームのアートは持ち込まない） */
export function CatGlyph() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden focusable="false">
      <g fill="var(--ink)">
        <path d="M22 44 L26 16 L48 33 Z" />
        <path d="M78 44 L74 16 L52 33 Z" />
        <circle cx="50" cy="60" r="27" />
      </g>
    </svg>
  );
}
