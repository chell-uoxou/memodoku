import type { Board, Marks } from '../model/types';
import { CAT, CROSS } from '../model/types';
import { CAT_PATH } from '../components/ui/catPath';

const BG = '#F6EFE7';
const INK = '#6E4B3A';
const MARK = '#FFFFFF';

/**
 * 盤面を PNG にする。共有のときにリンクと一緒に送るため。
 * 見た目は盤面の描画に合わせる（角丸のセル・白のバツ・猫のシルエット）。
 */
export async function renderBoardPng(
  board: Board,
  marks: Marks,
  size = 880,
): Promise<Blob | null> {
  try {
    const pad = Math.round(size * 0.045);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, size, size);

    const inner = size - pad * 2;
    const n = board.n;
    const gap = (inner * 0.04) / n;
    const cell = (inner - gap * (n - 1)) / n;
    const radius = cell * 0.12;

    for (let i = 0; i < n * n; i++) {
      const r = Math.floor(i / n);
      const c = i % n;
      const x = pad + c * (cell + gap);
      const y = pad + r * (cell + gap);

      ctx.fillStyle = board.palette[board.regions[i]] ?? '#cccccc';
      roundRect(ctx, x, y, cell, cell, radius);
      ctx.fill();

      if (marks[i] === CROSS) {
        ctx.strokeStyle = MARK;
        ctx.lineWidth = cell * 0.11;
        ctx.lineCap = 'round';
        const inset = cell * 0.26;
        ctx.beginPath();
        ctx.moveTo(x + inset, y + inset);
        ctx.lineTo(x + cell - inset, y + cell - inset);
        ctx.moveTo(x + cell - inset, y + inset);
        ctx.lineTo(x + inset, y + cell - inset);
        ctx.stroke();
      } else if (marks[i] === CAT) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(cell / 100, cell / 100);
        const path = new Path2D(CAT_PATH);
        ctx.strokeStyle = MARK;
        ctx.lineWidth = 6;
        ctx.lineJoin = 'round';
        ctx.stroke(path);
        ctx.fillStyle = INK;
        ctx.fill(path);
        ctx.restore();
      }
    }

    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((blob) => resolve(blob), 'image/png'),
    );
  } catch {
    return null;
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * 保存する画像のファイル名。「盤面名_メモ名_何枚目.png」。
 * ファイル名に使えない文字は落とす（"2026/09/20" → "20260920"）。
 */
export function boardImageName(boardLabel: string, memoName: string, page: number): string {
  const names = [boardLabel, memoName].map(fileSafe).filter(Boolean);
  const parts = [...(names.length ? names : ['memodoku']), fileSafe(String(page))];
  return `${parts.filter(Boolean).join('_')}.png`;
}

function fileSafe(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').trim();
}
