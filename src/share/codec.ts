import type { Board, BoardKind, Mark, Marks, Memo, MemoSet } from '../model/types';
import { computeBoardId } from '../model/board';
import { newId, formatToday } from '../state/memoSet';
import { BitReader, BitWriter, deflate, fromBase64Url, inflate, toBase64Url } from './bits';

const VERSION = 1;
const COMPRESSED = 0x80;
const KINDS: BoardKind[] = ['regular', 'daily', 'unknown'];
const MAX_MEMOS = 31;

/**
 * §11.2 のビットパック。パレットは仕様の一覧に無いが、
 * 共有先で色が変わってしまうので領域数×3バイトだけ末尾に足している。
 */
export async function encodeShare(board: Board, memoSet: MemoSet): Promise<string> {
  const w = new BitWriter();
  const n = board.n;
  const cells = n * n;
  const memos = memoSet.memos.slice(0, MAX_MEMOS);

  w.write(VERSION, 8);
  w.write(n, 4);
  w.write(Math.max(0, KINDS.indexOf(board.kind)), 2);
  for (let i = 0; i < cells; i++) w.write(board.regions[i] & 15, 4);
  for (let i = 0; i < cells; i++) w.write(memoSet.imported[i] & 3, 2);
  w.write(memos.length, 5);
  for (const memo of memos) {
    w.write(memo.showImported ? 1 : 0, 1);
    for (let i = 0; i < cells; i++) w.write(memo.user[i] & 3, 2);
  }
  writeText(w, board.label);
  writeText(w, memoSet.name);
  const regionCount = new Set(board.regions).size;
  for (let k = 0; k < regionCount; k++) {
    const rgb = hexToRgb(board.palette[k] ?? '#cccccc');
    w.write(rgb[0], 8);
    w.write(rgb[1], 8);
    w.write(rgb[2], 8);
  }

  const raw = w.finish();
  const body = raw.subarray(1);
  const packed = await deflate(body);
  if (packed && packed.length < body.length) {
    const out = new Uint8Array(packed.length + 1);
    out[0] = VERSION | COMPRESSED;
    out.set(packed, 1);
    return toBase64Url(out);
  }
  return toBase64Url(raw);
}

export async function decodeShare(
  payload: string,
): Promise<{ board: Board; memoSet: MemoSet } | null> {
  try {
    const bytes = fromBase64Url(payload);
    if (!bytes.length) return null;
    const header = bytes[0];
    if ((header & 0x7f) !== VERSION) return null;
    const body =
      header & COMPRESSED ? await inflate(bytes.subarray(1)) : bytes.subarray(1);

    const r = new BitReader(body);
    const n = r.read(4);
    if (n < 2 || n > 15) return null;
    const kind = KINDS[r.read(2)] ?? 'unknown';
    const cells = n * n;

    const regions: number[] = [];
    for (let i = 0; i < cells; i++) regions.push(r.read(4));
    const imported: Marks = [];
    for (let i = 0; i < cells; i++) imported.push(r.read(2) as Mark);
    const count = r.read(5);
    const memos: Memo[] = [];
    for (let k = 0; k < count; k++) {
      const showImported = r.read(1) === 1;
      const user: Marks = [];
      for (let i = 0; i < cells; i++) user.push(r.read(2) as Mark);
      memos.push({ id: newId(), showImported, user });
    }
    const label = readText(r);
    const name = readText(r);
    const regionCount = new Set(regions).size;
    const palette: string[] = [];
    for (let k = 0; k < regionCount; k++) {
      palette.push(rgbToHex(r.read(8), r.read(8), r.read(8)));
    }

    const id = await computeBoardId(regions);
    const now = Date.now();
    return {
      board: { id, n, regions, palette, label, kind },
      memoSet: {
        id: newId(),
        boardId: id,
        name: name || formatToday(now),
        imported,
        memos: memos.length ? memos : [{ id: newId(), showImported: false, user: imported.map(() => 0 as Mark) }],
        activeIndex: 0,
        createdAt: now,
        updatedAt: now,
      },
    };
  } catch {
    return null;
  }
}

function writeText(w: BitWriter, text: string) {
  const bytes = new TextEncoder().encode(text).subarray(0, 255);
  w.write(bytes.length, 8);
  w.writeBytes(bytes);
}

function readText(r: BitReader): string {
  const len = r.read(8);
  return new TextDecoder().decode(r.readBytes(len));
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const v = parseInt(full.slice(0, 6), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

export function shareUrl(payload: string): string {
  const base = `${location.origin}${location.pathname}`;
  return `${base}#s=${payload}`;
}

export function readSharePayload(): string | null {
  const m = location.hash.match(/[#&]s=([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}
