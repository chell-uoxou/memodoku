import { Sheet, ToggleRow } from '../ui';
import type { Settings } from '../../state/settings';

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
    <Sheet onClose={onClose}>
      <ToggleRow
        label="自動除外"
        on={settings.autoExclude}
        onToggle={() => onToggle('autoExclude')}
      />
      <ToggleRow
        label="ルール違反の表示"
        on={settings.showViolations}
        onToggle={() => onToggle('showViolations')}
      />
      <ToggleRow
        label="行・列ハイライト"
        on={settings.rowColHighlight}
        onToggle={() => onToggle('rowColHighlight')}
      />
      <ToggleRow
        label="領域の境界線"
        on={settings.regionBoundaries}
        onToggle={() => onToggle('regionBoundaries')}
      />
    </Sheet>
  );
}
