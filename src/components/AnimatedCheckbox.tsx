import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface Props {
  checked: boolean;
  onChange: () => void;
}

export function AnimatedCheckbox({ checked, onChange }: Props) {
  const [popped, setPopped] = useState(false);
  const prev = useRef(checked);

  useEffect(() => {
    if (checked && !prev.current) {
      setPopped(true);
      const t = setTimeout(() => setPopped(false), 400);
      return () => clearTimeout(t);
    }
    prev.current = checked;
  }, [checked]);

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      className={`animated-checkbox${checked ? ' animated-checkbox--checked' : ''}${popped ? ' animated-checkbox--pop' : ''}`}
      onClick={(e) => { e.stopPropagation(); onChange(); }}
    >
      <svg width={22} height={22} viewBox="0 0 16 16" overflow="visible">
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
    </button>
  );
}
