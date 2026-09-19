import type { Board, Marks } from '../../model/types';
import { CAT, CROSS } from '../../model/types';

/** 一覧用のサムネイル。盤面を SVG で簡略描画する */
export function Thumbnail({
  board,
  marks,
  size = 100,
}: {
  board: Board;
  marks?: Marks;
  size?: number;
}) {
  const n = board.n;
  const gap = 0.06;
  const pitch = 1;
  const cell = pitch - gap;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${n} ${n}`}
      style={{ display: 'block', borderRadius: 10 }}
    >
      {board.regions.map((region, i) => {
        const x = (i % n) + gap / 2;
        const y = Math.floor(i / n) + gap / 2;
        const mark = marks?.[i];
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={cell}
              height={cell}
              rx={cell * 0.16}
              fill={mark === CAT ? 'var(--accent)' : board.palette[region]}
            />
            {mark === CAT && (
              <circle cx={x + cell / 2} cy={y + cell / 2} r={cell * 0.28} fill="var(--ink)" />
            )}
            {mark === CROSS && (
              <g stroke="#fff" strokeWidth={cell * 0.11} strokeLinecap="round">
                <line
                  x1={x + cell * 0.28}
                  y1={y + cell * 0.28}
                  x2={x + cell * 0.72}
                  y2={y + cell * 0.72}
                />
                <line
                  x1={x + cell * 0.72}
                  y1={y + cell * 0.28}
                  x2={x + cell * 0.28}
                  y2={y + cell * 0.72}
                />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
