import type { BoardKind } from '../model/types';
import type { Bitmap, Rect } from './bitmap';
import { cropToCanvas } from './load';

export type LabelResult = { label: string | null; kind: BoardKind };

const MIN_CONFIDENCE = 70;

/**
 * §5.5 レベル名の読み取り。tesseract.js は使うときだけ遅延ロードする。
 * どちらの形にもマッチしない・信頼度が低いときは名前を空にする（誤った名前を入れない）。
 */
export async function readLabel(bmp: Bitmap, rect: Rect): Promise<LabelResult> {
  try {
    const { recognize } = await import('tesseract.js');
    const canvas = cropToCanvas(bmp, rect);
    const { data } = await recognize(canvas, 'eng', undefined);
    const text = data.text.replace(/\s+/g, '');
    if (data.confidence < MIN_CONFIDENCE) return { label: null, kind: 'unknown' };
    return parseLabel(text);
  } catch {
    return { label: null, kind: 'unknown' };
  }
}

export function parseLabel(text: string): LabelResult {
  const daily = text.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (daily) {
    return { label: `Daily ${Number(daily[1])}/${Number(daily[2])}`, kind: 'daily' };
  }
  const regular = text.match(/^(\d{1,3})$/);
  if (regular) {
    return { label: `Level ${Number(regular[1])}`, kind: 'regular' };
  }
  return { label: null, kind: 'unknown' };
}

/** ヘッダのテキストがありそうな範囲。盤面より上、チップ列より上 */
export function headerRect(bmp: Bitmap, boardY: number, chipsTop: number | null): Rect {
  const bottom = Math.max(40, (chipsTop ?? boardY) - 10);
  const top = Math.round(bottom * 0.35);
  return { x: 0, y: top, w: bmp.width, h: Math.max(20, bottom - top) };
}
