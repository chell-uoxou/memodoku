/**
 * PWA アイコンを PNG で書き出す。
 * 猫のシルエットは src/components/ui/catPath.ts と同じ形を使いたいので、
 * ベジエを折れ線に落としてからスキャンラインで塗る。
 *
 *   node scripts/make-icons.mjs
 */
import { writeFileSync } from 'node:fs';
import zlib from 'node:zlib';

// catPath.ts と同じ形（viewBox 0 0 100 100）
const CAT = [
  ['M', 50, 90],
  ['C', 27, 90, 12, 75, 12, 55],
  ['L', 12, 8],
  ['L', 36, 32],
  ['C', 40, 29, 45, 28, 50, 28],
  ['C', 55, 28, 60, 29, 64, 32],
  ['L', 88, 8],
  ['L', 88, 55],
  ['C', 88, 75, 73, 90, 50, 90],
];

const BG = [0xf6, 0xef, 0xe7];
const TILE = [0xf0, 0xa8, 0x68];
const INK = [0x6e, 0x4b, 0x3a];

function flatten() {
  const pts = [];
  let cur = [0, 0];
  for (const [cmd, ...a] of CAT) {
    if (cmd === 'M') {
      cur = [a[0], a[1]];
      pts.push(cur);
    } else if (cmd === 'L') {
      cur = [a[0], a[1]];
      pts.push(cur);
    } else {
      const [x1, y1, x2, y2, x, y] = a;
      for (let k = 1; k <= 24; k++) {
        const t = k / 24;
        const u = 1 - t;
        pts.push([
          u ** 3 * cur[0] + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t ** 3 * x,
          u ** 3 * cur[1] + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t ** 3 * y,
        ]);
      }
      cur = [x, y];
    }
  }
  return pts;
}

function render(size) {
  const px = new Uint8Array(size * size * 4);
  const set = (x, y, c) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const p = (y * size + x) * 4;
    px[p] = c[0];
    px[p + 1] = c[1];
    px[p + 2] = c[2];
    px[p + 3] = 255;
  };

  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) set(x, y, BG);

  // 角丸のタイル
  const inset = size * 0.1;
  const r = size * 0.22;
  for (let y = Math.round(inset); y < size - inset; y++) {
    for (let x = Math.round(inset); x < size - inset; x++) {
      const dx = Math.max(inset + r - x, x - (size - inset - r), 0);
      const dy = Math.max(inset + r - y, y - (size - inset - r), 0);
      if (dx * dx + dy * dy <= r * r) set(x, y, TILE);
    }
  }

  // 猫。4x スーパーサンプリングして縁をならす
  const poly = flatten();
  const scale = size * 0.6;
  const ox = size * 0.2;
  const oy = size * 0.2;
  const pts = poly.map(([x, y]) => [ox + (x / 100) * scale, oy + (y / 100) * scale]);
  const ss = 4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let hits = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          if (inside(pts, x + (sx + 0.5) / ss, y + (sy + 0.5) / ss)) hits++;
        }
      }
      if (!hits) continue;
      const a = hits / (ss * ss);
      const p = (y * size + x) * 4;
      for (let k = 0; k < 3; k++) px[p + k] = Math.round(px[p + k] * (1 - a) + INK[k] * a);
    }
  }
  return png(px, size);
}

function inside(pts, x, y) {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

function png(px, size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    Buffer.from(px.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
}

let table = null;
function crc32(buf) {
  if (!table) {
    table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let c = -1;
  for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}

writeFileSync('public/icon-192.png', render(192));
writeFileSync('public/icon-512.png', render(512));
console.log('wrote public/icon-192.png, public/icon-512.png');
