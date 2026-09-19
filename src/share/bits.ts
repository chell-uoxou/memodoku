export class BitWriter {
  private bytes: number[] = [];
  private cur = 0;
  private used = 0;

  write(value: number, width: number) {
    for (let k = width - 1; k >= 0; k--) {
      const bit = (value >> k) & 1;
      this.cur = (this.cur << 1) | bit;
      this.used++;
      if (this.used === 8) {
        this.bytes.push(this.cur);
        this.cur = 0;
        this.used = 0;
      }
    }
  }

  writeBytes(data: Uint8Array) {
    for (const b of data) this.write(b, 8);
  }

  finish(): Uint8Array {
    if (this.used > 0) {
      this.bytes.push(this.cur << (8 - this.used));
      this.cur = 0;
      this.used = 0;
    }
    return new Uint8Array(this.bytes);
  }
}

export class BitReader {
  private pos = 0;
  private data: Uint8Array;

  constructor(data: Uint8Array) {
    this.data = data;
  }

  read(width: number): number {
    let out = 0;
    for (let k = 0; k < width; k++) {
      const byte = this.data[this.pos >> 3] ?? 0;
      const bit = (byte >> (7 - (this.pos & 7))) & 1;
      out = (out << 1) | bit;
      this.pos++;
    }
    return out;
  }

  readBytes(count: number): Uint8Array {
    const out = new Uint8Array(count);
    for (let k = 0; k < count; k++) out[k] = this.read(8);
    return out;
  }
}

export function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(text: string): Uint8Array {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function deflate(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null;
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
