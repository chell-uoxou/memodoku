import type { SetupInput } from '../components/Setup/Setup';
import { fallbackPalette } from '../model/board';
import { bitmapFromBlob } from './load';
import { headerRect, readLabel } from './ocr';
import { analyzeBitmap } from './parse';

/** スクリーンショット1枚から補正画面の初期値を作る */
export async function importScreenshot(blob: Blob): Promise<SetupInput | null> {
  const bmp = await bitmapFromBlob(blob);
  const parsed = analyzeBitmap(bmp);
  if (!parsed.n) return null;

  const chipsTop = parsed.debug.chips.length
    ? Math.min(...parsed.debug.chips.map((c) => c.rect.y))
    : null;
  const { label, kind } = parsed.debug.board
    ? await readLabel(bmp, headerRect(bmp, parsed.debug.board.y, chipsTop))
    : { label: null, kind: 'unknown' as const };

  return {
    n: parsed.n,
    regions: parsed.regions,
    palette: parsed.palette.length >= parsed.n ? parsed.palette : fallbackPalette(parsed.n),
    imported: parsed.imported,
    label,
    kind,
  };
}

/** クリップボードを直接読む（ボタンからの貼り付け用） */
export async function readClipboardImage(): Promise<Blob | null> {
  if (!navigator.clipboard?.read) return null;
  const items = await navigator.clipboard.read();
  for (const item of items) {
    const type = item.types.find((t) => t.startsWith('image/'));
    if (type) return await item.getType(type);
  }
  return null;
}

/** クリップボード・ドロップイベントから画像を1枚取り出す */
export function pickImage(source: DataTransfer | ClipboardEvent['clipboardData']): Blob | null {
  if (!source) return null;
  for (const item of Array.from(source.items ?? [])) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) return file;
    }
  }
  for (const file of Array.from(source.files ?? [])) {
    if (file.type.startsWith('image/')) return file;
  }
  return null;
}
