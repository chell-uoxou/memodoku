import { neighbors4, regionsConnected } from '../model/board';

/**
 * §5.4 猫セルなどで不明になった領域を、推測せずに決まるものだけ埋める。
 * 決まらなければ null のまま残して補正UIへ回す。
 */
export function resolveUnknownRegions(
  regions: (number | null)[],
  n: number,
  paletteSize: number,
  catCells: number[],
  /** チップがネコの顔になっている＝既に猫が置かれている領域 */
  solvedRegions: number[],
): (number | null)[] {
  const out = regions.slice();

  // 1. 未割り当ての色が1つ、不明セルも1つならそれを割り当てる
  const step1 = () => {
    const used = new Set(out.filter((r): r is number => r != null));
    const free = [];
    for (let k = 0; k < paletteSize; k++) if (!used.has(k)) free.push(k);
    const unknown = out.flatMap((r, i) => (r == null ? [i] : []));
    if (free.length === 1 && unknown.length === 1) {
      out[unknown[0]] = free[0];
      return true;
    }
    return false;
  };

  // 2. 4近傍の既知領域の候補が1つだけならそれを採用する
  const step2 = () => {
    let changed = false;
    for (let i = 0; i < out.length; i++) {
      if (out[i] != null) continue;
      const candidates = new Set<number>();
      for (const nb of neighbors4(i, n)) {
        const r = out[nb];
        if (r != null) candidates.add(r);
      }
      if (candidates.size !== 1) continue;
      const only = [...candidates][0];
      const trial = out.slice();
      trial[i] = only;
      if (keepsConnectivity(trial, n)) {
        out[i] = only;
        changed = true;
      }
    }
    return changed;
  };

  // 3. 猫が置かれている色の集合と、割り当て済みの猫の色を照合して残りを埋める
  const step3 = () => {
    if (!solvedRegions.length) return false;
    const assignedCatRegions = new Set(
      catCells.map((i) => out[i]).filter((r): r is number => r != null),
    );
    const remaining = solvedRegions.filter((r) => !assignedCatRegions.has(r));
    if (!remaining.length) return false;
    const unknownCats = catCells.filter((i) => out[i] == null);

    let changed = false;
    for (const i of unknownCats) {
      const near = new Set<number>();
      for (const nb of neighbors4(i, n)) {
        const r = out[nb];
        if (r != null) near.add(r);
      }
      // 4近傍の色と、まだ猫の付いていない「顔チップ」の色の積を取る
      const candidates = near.size
        ? remaining.filter((r) => near.has(r))
        : remaining.slice();
      if (candidates.length === 1) {
        out[i] = candidates[0];
        changed = true;
        return true; // remaining を作り直したいので一度抜ける
      }
    }
    return changed;
  };

  let progress = true;
  while (progress) {
    progress = step1() || step2() || step3();
  }
  return out;
}

/** null を含んだまま、既知部分だけで連結性が壊れていないかを見る */
function keepsConnectivity(regions: (number | null)[], n: number): boolean {
  const known = regions.map((r) => (r == null ? -1 : r));
  const groups = new Set(known.filter((r) => r >= 0));
  for (const g of groups) {
    const cells = known.flatMap((r, i) => (r === g ? [i] : []));
    // 不明セルを経由してもよいので、既知セル同士が直接連結かだけを見る
    if (!componentOf(cells, known, n, g)) return false;
  }
  return true;
}

function componentOf(cells: number[], known: number[], n: number, region: number): boolean {
  if (cells.length <= 1) return true;
  const set = new Set(cells);
  const seen = new Set([cells[0]]);
  const stack = [cells[0]];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const nb of neighbors4(cur, n)) {
      if (set.has(nb) && !seen.has(nb) && known[nb] === region) {
        seen.add(nb);
        stack.push(nb);
      }
    }
  }
  return seen.size === cells.length;
}

export { regionsConnected };
