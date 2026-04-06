import { Check } from 'lucide-react';
import { ACCENT_COLORS } from '../contexts/SettingsContext';
import type { AccentColor } from '../contexts/SettingsContext';

export function ColorSwatchPicker({ accent, onSelect }: { accent: AccentColor; onSelect: (c: AccentColor) => void }) {
  return (
    <div className="color-swatches">
      {ACCENT_COLORS.map((c) => (
        <button
          key={c.key}
          className={`color-swatch${accent === c.key ? ' color-swatch--selected' : ''}`}
          style={{ background: c.hex, '--swatch-hex': c.hex } as React.CSSProperties}
          onClick={() => onSelect(c.key)}
          title={c.label}
          aria-label={`${c.label} accent color`}
        >
          {accent === c.key && <Check size={11} strokeWidth={2.5} color="white" />}
        </button>
      ))}
    </div>
  );
}
