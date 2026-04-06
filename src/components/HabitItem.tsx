import { useState } from 'react';
import { AnimatedCheckbox } from './AnimatedCheckbox';
import { useSettings } from '../contexts/SettingsContext';
import { playComplete } from '../utils/sound';

interface Props {
  title: string;
  completedToday: boolean;
  streak: number;
  onToggle: () => void;
  onSelect?: () => void;
  isSelected?: boolean;
}

export function HabitItem({ title, completedToday, streak, onToggle, onSelect, isSelected }: Props) {
  const { soundEnabled, soundStyle } = useSettings();
  const [flashing, setFlashing] = useState(false);
  const [popping, setPopping] = useState(false);

  function handleToggle() {
    if (!completedToday) {
      if (soundEnabled) playComplete(soundStyle);
      setFlashing(true);
      setPopping(true);
      setTimeout(() => { setFlashing(false); setPopping(false); }, 650);
    }
    onToggle();
  }

  return (
    <div
      className={[
        'habit-item',
        isSelected ? 'habit-item--selected' : '',
        onSelect ? 'habit-item--selectable' : '',
        flashing ? 'habit-item--flash' : '',
      ].filter(Boolean).join(' ')}
      tabIndex={0}
      data-nav-row
      onClick={onSelect}
    >
      <AnimatedCheckbox
        checked={completedToday}
        onChange={handleToggle}
        popping={popping}
        variant="habit"
        streak={streak}
      />
      <span className={`habit-item__title${completedToday ? ' habit-item__title--completed' : ''}`}>
        {title}
      </span>
      {streak > 0 && (
        <span className={`habit-item__streak${streak >= 7 ? ' habit-item__streak--hot' : ''}`}>
          <svg className="habit-item__streak-flame" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2C9.5 6 8 8.5 9 11c-1.5-1-2-2.5-1.5-4C5 9 3.5 12 5 15c1 2 3 3.5 5.5 3.9V20h3v-1.1C16 18.5 18 17 19 15c1.5-3 0-6-2.5-8-.5 1.5-1 2.5-2 3 1-2 .5-5-2.5-8z"/>
          </svg>
          {streak}
        </span>
      )}
    </div>
  );
}
