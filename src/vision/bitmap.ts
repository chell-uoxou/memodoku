export type Bitmap = {
  width: number;
  height: number;
  /** RGBA、長さ width*height*4 */
  data: Uint8ClampedArray;
};

export type Rect = { x: number; y: number; w: number; h: number };

export function pixel(bmp: Bitmap, x: number, y: number): [number, number, number] {
  const i = (y * bmp.width + x) * 4;
  return [bmp.data[i], bmp.data[i + 1], bmp.data[i + 2]];
}

export type Component = {
  area: number;
  rect: Rect;
  /** 成分に属する画素の重心 */
  cx: number;
  cy: number;
};

/**
 * mask（0/1）の4近傍連結成分。面積の大きい順に返す。
 * 小さすぎる成分は minArea で切り捨てる。
 */
export function connectedComponents(
  mask: Uint8Array,
  width: number,
  height: number,
  minArea = 16,
): Component[] {
  const labels = new Int32Array(width * height).fill(-1);
  const out: Component[] = [];
  const stack: number[] = [];

  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || labels[start] !== -1) continue;
    labels[start] = out.length;
    stack.length = 0;
    stack.push(start);
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    let area = 0;
    let sumX = 0;
    let sumY = 0;

    while (stack.length) {
      const p = stack.pop()!;
      const x = p % width;
      const y = (p / width) | 0;
      area++;
      sumX += x;
      sumY += y;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      if (x > 0 && mask[p - 1] && labels[p - 1] === -1) {
        labels[p - 1] = out.length;
        stack.push(p - 1);
      }
      if (x < width - 1 && mask[p + 1] && labels[p + 1] === -1) {
        labels[p + 1] = out.length;
        stack.push(p + 1);
      }
      if (y > 0 && mask[p - width] && labels[p - width] === -1) {
        labels[p - width] = out.length;
        stack.push(p - width);
      }
      if (y < height - 1 && mask[p + width] && labels[p + width] === -1) {
        labels[p + width] = out.length;
        stack.push(p + width);
      }
    }

    if (area >= minArea) {
      out.push({
        area,
        rect: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
        cx: sumX / area,
        cy: sumY / area,
      });
    } else {
      // 捨てる場合もラベル番号を詰めない（labels は以降使わない）
      out.push({ area, rect: { x: minX, y: minY, w: 1, h: 1 }, cx: sumX / area, cy: sumY / area });
    }
  }

  return out.filter((c) => c.area >= minArea).sort((a, b) => b.area - a.area);
}
