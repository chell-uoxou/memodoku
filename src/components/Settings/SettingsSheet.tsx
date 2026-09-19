import { Sheet, ToggleRow } from '../ui';
import type { Settings } from '../../state/settings';
import { haptics } from '../../state/haptics';

export function SettingsSheet({
  settings,
  onToggle,
  onClose,
}: {
  settings: Settings;
  onToggle: (key: keyof Settings) => void;
  onClose: () => void;
}) {
  return (
    <Sheet onClose={onClose} title="設定">
      <ToggleRow
        label="自動除外"
        hint="猫を置いたら同じ行・列・色と8近傍を自動でバツで埋める"
        on={settings.autoExclude}
        onToggle={() => onToggle('autoExclude')}
      />
      <ToggleRow
        label="ルール違反の表示"
        hint="猫が行・列・色で重複、または隣り合ったセルの縁を赤くする"
        on={settings.showViolations}
        onToggle={() => onToggle('showViolations')}
      />
      <ToggleRow
        label="行・列ハイライト"
        hint="セルを長押ししている間だけ、その行と列を光らせる"
        on={settings.rowColHighlight}
        onToggle={() => onToggle('rowColHighlight')}
      />
      <ToggleRow
        label="触覚フィードバック"
        badge="ベータ"
        hint="印を置いたときやメモを切り替えたときに短く震える。端末によっては鳴らない"
        on={settings.haptics}
        onToggle={() => {
          // 入れたときだけ、どんな手応えか一度鳴らす
          if (!settings.haptics) haptics.test();
          onToggle('haptics');
        }}
      />
      <ToggleRow
        label="領域の境界線"
        hint="色の境目に白い線を引いて区切りを読みやすくする"
        on={settings.regionBoundaries}
        onToggle={() => onToggle('regionBoundaries')}
      />
    </Sheet>
  );
}
