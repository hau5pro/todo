import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ICON_MAP, PICKABLE_ICONS } from '../config/listIcons';

interface IconPickerProps {
  currentIcon: string | null;
  anchorRect: DOMRect;
  onSelect: (icon: string | null) => void;
  onClose: () => void;
}

export function IconPicker({ currentIcon, anchorRect, onSelect, onClose }: IconPickerProps) {
  const pickerWidth = 248;
  const viewportWidth = window.innerWidth;
  const left = Math.min(anchorRect.left, viewportWidth - pickerWidth - 8);
  const top = anchorRect.bottom + 6;

  return createPortal(
    <>
      <div className="icon-picker-backdrop" onClick={onClose} />
      <motion.div
        className="icon-picker"
        style={{ top, left }}
        role="dialog"
        aria-label="Select icon"
        initial={{ opacity: 0, scale: 0.93, y: -6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: -6 }}
        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) onClose();
        }}
      >
        <div className="icon-picker-grid">
          {PICKABLE_ICONS.map((name) => {
            const IconComp = ICON_MAP[name];
            if (!IconComp) return null;
            return (
              <button
                key={name}
                className={`icon-picker-btn${currentIcon === name ? ' icon-picker-btn--active' : ''}`}
                onClick={() => { onSelect(name); onClose(); }}
                title={name}
                aria-label={name}
                aria-pressed={currentIcon === name}
              >
                <IconComp size={18} />
              </button>
            );
          })}
        </div>
      </motion.div>
    </>,
    document.body
  );
}
