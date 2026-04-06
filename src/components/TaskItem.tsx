import { ICON_SIZE } from '../config/icons';

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

  return (
    <div
      className={`task-item${isSelected ? ' task-item--selected' : ''}${onSelect ? ' task-item--selectable' : ''}`}
      onClick={onSelect}
    >
      <input
        type="checkbox"
        checked={completed}
        onChange={onToggle}
        onClick={(e) => e.stopPropagation()}
        style={{ width: ICON_SIZE, height: ICON_SIZE, flexShrink: 0 }}
      />
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
