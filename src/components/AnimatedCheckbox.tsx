import { motion } from 'framer-motion';

const ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

interface Props {
  checked: boolean;
  onChange: () => void;
  popping?: boolean;
}

export function AnimatedCheckbox({ checked, onChange, popping = false }: Props) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      className={`animated-checkbox${checked ? ' animated-checkbox--checked' : ''}${popping ? ' animated-checkbox--pop' : ''}`}
      onClick={(e) => { e.stopPropagation(); onChange(); }}
    >
      <svg width={22} height={22} viewBox="0 0 16 16" overflow="visible">
        {popping && (
          <circle cx="8" cy="8" r="7" className="animated-checkbox__ring" />
        )}
        <circle cx="8" cy="8" r="7" className="animated-checkbox__circle" />
        <motion.path
          d="M 3.5 8.5 L 6.5 11.5 L 12.5 5"
          fill="none"
          stroke="white"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        />
      </svg>

      {popping && ANGLES.map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const dist = 22 + (i % 2) * 8;
        return (
          <span
            key={angle}
            className="animated-checkbox__particle"
            style={{
              '--dx': `${Math.cos(rad) * dist}px`,
              '--dy': `${Math.sin(rad) * dist}px`,
              animationDelay: `${i * 15}ms`,
              width: i % 2 === 0 ? 5 : 4,
              height: i % 2 === 0 ? 5 : 4,
            } as React.CSSProperties}
          />
        );
      })}
    </button>
  );
}
