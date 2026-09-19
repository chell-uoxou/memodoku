/**
 * 触覚フィードバック。
 *
 * - Android / デスクトップ: Vibration API
 * - iOS Safari: `navigator.vibrate` が無いので、`<input type="checkbox" switch>` を
 *   そのラベル経由で click する（iOS 17.4 以降でシステムの触覚が鳴る）
 *
 * **要素は `display: none` にしない。** 描画されていない要素を click しても
 * iOS は触覚を出さない。画面に出したくないので、大きさを持たせたまま
 * 透明にして操作を素通りさせる。
 */
const SETTINGS_KEY = 'meowdoku-memo:settings';

type Strength = 'light' | 'medium' | 'heavy';

/** Vibration API 用の長さ（ms） */
const PATTERN: Record<Strength, number | number[]> = {
  light: 8,
  medium: 16,
  heavy: [24, 28, 24],
};

/** iOS の switch は強さを変えられないので、強いときは短く2回鳴らす */
const TICKS: Record<Strength, number> = { light: 1, medium: 1, heavy: 2 };
const TICK_GAP_MS = 55;

let enabled = readInitial();
let lever: HTMLLabelElement | null = null;

function readInitial(): boolean {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return true; // 既定はON
    const parsed = JSON.parse(raw) as { haptics?: boolean };
    return parsed.haptics ?? true;
  } catch {
    return true;
  }
}

export function setHapticsEnabled(on: boolean) {
  enabled = on;
}

export function hapticsEnabled(): boolean {
  return enabled;
}

function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

function ensureLever(): HTMLLabelElement | null {
  if (lever?.isConnected) return lever;
  if (typeof document === 'undefined' || !document.body) return null;

  const label = document.createElement('label');
  label.setAttribute('aria-hidden', 'true');
  Object.assign(label.style, {
    position: 'fixed',
    left: '0px',
    bottom: '0px',
    width: '28px',
    height: '18px',
    opacity: '0',
    // 指には触れさせない。描画はされているので触覚だけ鳴る
    pointerEvents: 'none',
    zIndex: '-1',
    margin: '0',
    padding: '0',
  });

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  input.tabIndex = -1;
  Object.assign(input.style, {
    appearance: 'auto',
    width: '100%',
    height: '100%',
    margin: '0',
  });

  label.appendChild(input);
  document.body.appendChild(label);
  lever = label;
  return lever;
}

function fire(strength: Strength) {
  if (!enabled) return;
  try {
    if (canVibrate()) {
      navigator.vibrate(PATTERN[strength]);
      return;
    }
    const el = ensureLever();
    if (!el) return;
    el.click();
    for (let k = 1; k < TICKS[strength]; k++) {
      window.setTimeout(() => el.click(), TICK_GAP_MS * k);
    }
  } catch {
    /* 触覚が出せなくても操作は続けられるので握りつぶす */
  }
}

export const haptics = {
  /** バツを置く・消す */
  mark: () => fire('light'),
  /** 猫を置く。バツより強く */
  cat: () => fire('heavy'),
  /** メモの切り替え */
  select: () => fire('light'),
  /** 長押しでメニューが出た、リンクをコピーしたなど */
  notice: () => fire('medium'),
  /** 設定から手応えを確かめる */
  test: () => fire('heavy'),
};
