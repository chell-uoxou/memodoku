import { CAT_PATH } from '../ui/catPath';

/** バツ: 白の2本線。線幅はセル辺長の11%、端は丸く、26%だけ内側に余白 */
export function CrossGlyph() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden focusable="false">
      <g stroke="var(--mark)" strokeWidth="11" strokeLinecap="round" fill="none">
        <line x1="26" y1="26" x2="74" y2="74" />
        <line x1="74" y1="26" x2="26" y2="74" />
      </g>
    </svg>
  );
}

/**
 * 猫。領域色の上に直接乗るので、白の縁取りでどの色の上でも読めるようにしている。
 */
export function CatGlyph() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden focusable="false">
      <path
        d={CAT_PATH}
        fill="var(--ink)"
        stroke="var(--mark)"
        strokeWidth="6"
        strokeLinejoin="round"
        paintOrder="stroke"
      />
    </svg>
  );
}
