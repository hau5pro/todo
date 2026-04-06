import { useState } from 'react';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';
import { AnimatedCheckbox } from './AnimatedCheckbox';
import { useSettings } from '../contexts/SettingsContext';
import { playComplete } from '../utils/sound';
import { ease } from '../utils/easing';

interface Props {
  title: string;
  completed: boolean;
  dueDate?: string | null;
  today: string;
  onToggle: () => void;
  onSelect?: () => void;
  isSelected?: boolean;
}

export function TaskItem({ title, completed, dueDate, today, onToggle, onSelect, isSelected }: Props) {
  const isOverdue  = dueDate && dueDate < today;
  const isTomorrow = dueDate === dayjs(today).add(1, 'day').format('YYYY-MM-DD');

  function dueDateLabel(): string {
    if (!dueDate) return '';
    if (dueDate === today) return 'today';
    if (isTomorrow) return 'tomorrow';
    return dayjs(dueDate).format('MMM D, YYYY');
  }
  const { soundEnabled, soundStyle } = useSettings();
  const [flashing, setFlashing] = useState(false);
  const [popping, setPopping] = useState(false);

  function handleToggle() {
    if (!completed) {
      if (soundEnabled) playComplete(soundStyle);
      setFlashing(true);
      setPopping(true);
      setTimeout(() => { setFlashing(false); setPopping(false); }, 650);
    }
    onToggle();
  }

  return (
    <motion.div
      className={[
        'task-item',
        isSelected ? 'task-item--selected' : '',
        onSelect ? 'task-item--selectable' : '',
        flashing ? 'task-item--flash' : '',
      ].filter(Boolean).join(' ')}
      style={{ clipPath: 'inset(0% 0% 0% 0% round 8px)' }}
      onClick={onSelect}
      exit={{ clipPath: 'inset(100% 0% 0% 0% round 8px)', y: 10, transition: { duration: 0.36, ease: ease.wipe } }}
    >
      <AnimatedCheckbox checked={completed} onChange={handleToggle} popping={popping} />
      <span className={`task-item__title${completed ? ' task-item__title--completed' : ''}`}>
        {title}
      </span>
      {dueDate && (
        <span className={`task-item__date${isOverdue ? ' task-item__date--overdue' : ''}`}>
          {dueDateLabel()}
        </span>
      )}
    </motion.div>
  );
}
