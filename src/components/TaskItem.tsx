import { useEffect, useRef, useState } from 'react';
import { AnimatedCheckbox } from './AnimatedCheckbox';
import { useSettings } from '../contexts/SettingsContext';
import { playComplete } from '../utils/sound';

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
  const isOverdue = dueDate && dueDate < today;
  const { soundEnabled } = useSettings();
  const [flashing, setFlashing] = useState(false);
  const prev = useRef(completed);

  useEffect(() => {
    if (completed && !prev.current) {
      setFlashing(true);
      if (soundEnabled) playComplete();
      const t = setTimeout(() => setFlashing(false), 600);
      return () => clearTimeout(t);
    }
    prev.current = completed;
  }, [completed, soundEnabled]);

  return (
    <div
      className={[
        'task-item',
        isSelected ? 'task-item--selected' : '',
        onSelect ? 'task-item--selectable' : '',
        flashing ? 'task-item--flash' : '',
      ].filter(Boolean).join(' ')}
      onClick={onSelect}
    >
      <AnimatedCheckbox checked={completed} onChange={onToggle} />
      <span className={`task-item__title${completed ? ' task-item__title--completed' : ''}`}>
        {title}
      </span>
      {dueDate && (
        <span className={`task-item__date${isOverdue ? ' task-item__date--overdue' : ''}`}>
          {isOverdue ? dueDate : 'today'}
        </span>
      )}
    </div>
  );
}
