import { jsx as _jsx } from "react/jsx-runtime";
import { Check } from 'lucide-react';
import { ACCENT_COLORS } from '../contexts/SettingsContext';
export function ColorSwatchPicker({ accent, onSelect }) {
    return (_jsx("div", { className: "color-swatches", children: ACCENT_COLORS.map((c) => (_jsx("button", { className: `color-swatch${accent === c.key ? ' color-swatch--selected' : ''}`, style: { background: c.hex, '--swatch-hex': c.hex }, onClick: () => onSelect(c.key), title: c.label, "aria-label": `${c.label} accent color`, children: accent === c.key && _jsx(Check, { size: 11, strokeWidth: 2.5, color: "white" }) }, c.key))) }));
}
