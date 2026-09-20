import { CAT_BOX, CAT_PATH, CAT_SCALE, CAT_STROKE } from '../ui/catPath';

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
 * バツと同じ 59x59 に収まるよう縮めて、セルの中央に置く。
 */
export function CatGlyph() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden focusable="false">
      <g
        transform={`translate(${CAT_BOX.cx} 50) scale(${CAT_SCALE}) translate(${-CAT_BOX.cx} ${-CAT_BOX.cy})`}
      >
        <path
          d={CAT_PATH}
          fill="var(--ink)"
          stroke="var(--mark)"
          strokeWidth={CAT_STROKE / CAT_SCALE}
          strokeLinejoin="round"
          paintOrder="stroke"
        />
      </g>
    </svg>
  );
}
