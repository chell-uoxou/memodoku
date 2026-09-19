import { useCallback, useEffect, useState } from 'react';
import { setHapticsEnabled } from './haptics';

export type Settings = {
  autoExclude: boolean;
  showViolations: boolean;
  rowColHighlight: boolean;
  regionBoundaries: boolean;
  haptics: boolean;
};

/** §7.4 のトグルは全て既定 OFF。触覚だけは既定 ON にしている */
export const DEFAULT_SETTINGS: Settings = {
  autoExclude: false,
  showViolations: false,
  rowColHighlight: false,
  regionBoundaries: false,
  haptics: true,
};

const KEY = 'meowdoku-memo:settings';

function read(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(read);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      /* プライベートブラウズ等では無視 */
    }
    // どの画面から切り替えても即座に効くよう、モジュール側にも伝える
    setHapticsEnabled(settings.haptics);
  }, [settings]);

  const toggle = useCallback((key: keyof Settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return { settings, toggle };
}

/** 汎用の localStorage 値（一覧の表示形式など） */
export function useStoredValue<T extends string>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      return (localStorage.getItem(key) as T | null) ?? fallback;
    } catch {
      return fallback;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* 無視 */
    }
  }, [key, value]);
  return [value, setValue] as const;
}
