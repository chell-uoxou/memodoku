import { WebHaptics } from 'web-haptics';

/**
 * 触覚フィードバック。
 *
 * Android などは `navigator.vibrate`、iOS Safari は vibrate が無いので
 * web-haptics が中で `<input type="checkbox" switch>` のラベルを叩く方式に切り替える。
 * どちらも使えない環境では何も起きない。
 */
const SETTINGS_KEY = 'meowdoku-memo:settings';

let engine: WebHaptics | null = null;
let enabled = readInitial();

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

function fire(preset: 'selection' | 'light' | 'medium' | 'heavy') {
  if (!enabled || typeof window === 'undefined') return;
  try {
    engine ??= new WebHaptics();
    void engine.trigger(preset).catch(() => undefined);
  } catch {
    /* 触覚が出せなくても操作は続けられるので握りつぶす */
  }
}

export const haptics = {
  /** バツを置く・消す */
  mark: () => fire('selection'),
  /** 猫を置く。バツより強く */
  cat: () => fire('heavy'),
  /** メモの切り替え */
  select: () => fire('light'),
  /** 長押しでメニューが出た、リンクをコピーしたなど */
  notice: () => fire('medium'),
};
