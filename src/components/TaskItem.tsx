import { useState, memo } from 'react';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';
import { AnimatedCheckbox } from './AnimatedCheckbox';
import { useSettings } from '../contexts/SettingsContext';
import { playComplete, hapticComplete } from '../utils/sound';
import { formatTime } from '../utils/date';

interface Props {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string | null;
  dueTime?: string | null;
  today: string;
  onToggle?: (id: string) => void;
  onSelect?: () => void;
  isSelected?: boolean;
}

export const TaskItem = memo(function TaskItem({ id, title, completed, dueDate, dueTime, today, onToggle, onSelect, isSelected }: Props) {
  const isOverdue  = dueDate && dueDate < today;
  const isTomorrow = dueDate === dayjs(today).add(1, 'day').format('YYYY-MM-DD');

  function dueDateLabel(): string {
    if (!dueDate) return '';
    let label = '';
    if (dueDate === today) label = 'today';
    else if (isTomorrow) label = 'tomorrow';
    else label = dayjs(dueDate).format('MMM D, YYYY');
    if (dueTime) label += ` · ${formatTime(dueTime)}`;
    return label;
  }
  const { soundEnabled, soundStyle, hapticEnabled } = useSettings();
  const [popping, setPopping] = useState(false);

  function handleToggle() {
    if (!onToggle) return;
    if (!completed) {
      if (soundEnabled) playComplete(soundStyle);
      if (hapticEnabled) hapticComplete();
      setPopping(true);
      setTimeout(() => setPopping(false), 250);
      onToggle(id);
    } else {
      onToggle(id);
    }
  }

  return (
    <motion.div
      className={[
        'task-item',
        isSelected ? 'task-item--selected' : '',
        onSelect ? 'task-item--selectable' : '',
        !onToggle ? 'task-item--no-toggle' : '',
      ].filter(Boolean).join(' ')}
      tabIndex={0}
      data-nav-row
      onClick={onSelect}
    >
      <AnimatedCheckbox checked={completed} onChange={handleToggle} popping={popping} />
      <span className="task-item__title-wrap" data-tooltip={title}>
        <span className={`task-item__title${completed ? ' task-item__title--completed' : ''}`}>
          {title}
        </span>
      </span>
      {dueDate && (
        <span className={`task-item__date${isOverdue ? ' task-item__date--overdue' : ''}`}>
          {dueDateLabel()}
        </span>
      )}
    </motion.div>
  );
});
