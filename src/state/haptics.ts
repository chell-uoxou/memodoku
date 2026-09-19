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
/** 指を離してから click を待つ時間 */
const CLICK_WAIT_MS = 380;

let enabled = readInitial();
let lever: HTMLLabelElement | null = null;

/**
 * 指が画面に触れている最中か。
 *
 * iOS は pointerdown の処理の中で switch を叩いても鳴らない（次のタスクに逃がしても同じ）。
 * 確実に鳴るのは「本物の click イベントの中で叩いたとき」なので、なぞっている最中に
 * 要求された手応えは次の click まで持ち越す。
 * click が来ないジェスチャ（ドラッグ、長押し、指が少し動いたタップ）もあるので、
 * 指を離してしばらく click が来なければ、そのときは駄目元で鳴らしにいく。
 */
let pointerDown = false;
let pending: Strength | null = null;
let expiry: number | null = null;

if (typeof document !== 'undefined') {
  document.addEventListener(
    'pointerdown',
    () => {
      pointerDown = true;
      // 前のジェスチャの持ち越しは捨てる
      pending = null;
    },
    { capture: true, passive: true },
  );
  const release = () => {
    pointerDown = false;
    if (expiry !== null) clearTimeout(expiry);
    // Safari は click を最大 350ms ほど遅らせることがあるので、それを待ってから諦める
    expiry = window.setTimeout(() => {
      const strength = pending;
      pending = null;
      if (strength) playTicks(strength);
    }, CLICK_WAIT_MS);
  };
  document.addEventListener('pointerup', release, { capture: true, passive: true });
  document.addEventListener('pointercancel', release, { capture: true, passive: true });
  document.addEventListener(
    'click',
    () => {
      if (!pending) return;
      if (expiry !== null) clearTimeout(expiry);
      const strength = pending;
      pending = null;
      playTicks(strength);
    },
    { capture: true, passive: true },
  );
}

function readInitial(): boolean {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return false; // 既定はOFF
    const parsed = JSON.parse(raw) as { haptics?: boolean };
    return parsed.haptics ?? false;
  } catch {
    return false;
  }
}

export function setHapticsEnabled(on: boolean) {
  enabled = on;
  // 初回だけ生成が遅れて鳴らない、ということが無いよう先に作っておく
  if (on && !canVibrate()) ensureLever();
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

function playTicks(strength: Strength) {
  const el = ensureLever();
  if (!el) return;
  el.click();
  for (let k = 1; k < TICKS[strength]; k++) {
    window.setTimeout(() => el.click(), TICK_GAP_MS * k);
  }
}

function fire(strength: Strength) {
  if (!enabled) return;
  try {
    if (canVibrate()) {
      navigator.vibrate(PATTERN[strength]);
      return;
    }
    if (pointerDown) {
      // 指を離したあとの click で鳴らす。強い方を優先する
      if (pending !== 'heavy') pending = strength;
      return;
    }
    playTicks(strength);
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
