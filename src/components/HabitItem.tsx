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
          🔥 {streak}
        </span>
      )}
    </div>
  );
}
