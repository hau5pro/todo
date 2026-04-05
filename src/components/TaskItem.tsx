interface Props {
  title: string;
  completed: boolean;
  dueDate?: string | null;
  today: string;
  onToggle: () => void;
}

export function TaskItem({ title, completed, dueDate, today, onToggle }: Props) {
  const isOverdue = dueDate && dueDate < today;

  return (
    <div className="task-item">
      <input type="checkbox" checked={completed} onChange={onToggle} />
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
