import { useState } from 'react';
import { Pencil, Trash2, Check, X } from 'lucide-react';

interface Props {
  title: string;
  completed: boolean;
  dueDate?: string | null;
  today: string;
  onToggle: () => void;
  onRename?: (newTitle: string) => void;
  onDelete?: () => void;
}

export function TaskItem({ title, completed, dueDate, today, onToggle, onRename, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const isOverdue = dueDate && dueDate < today;

  function startEdit() {
    setEditTitle(title);
    setEditing(true);
  }

  function commitEdit() {
    const t = editTitle.trim();
    if (t && t !== title) onRename?.(t);
    setEditing(false);
  }

  function cancelEdit() {
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="task-item">
        <input type="checkbox" checked={completed} onChange={onToggle} />
        <input
          className="task-item__edit-input"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit();
            if (e.key === 'Escape') cancelEdit();
          }}
          autoFocus
        />
        <button className="task-item__action-btn" onClick={commitEdit} title="Save"><Check size={13} strokeWidth={2} /></button>
        <button className="task-item__action-btn" onClick={cancelEdit} title="Cancel"><X size={13} strokeWidth={2} /></button>
      </div>
    );
  }

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
      {(onRename || onDelete) && (
        <span className="task-item__actions">
          {onRename && (
            <button className="task-item__action-btn" onClick={startEdit} title="Rename">
              <Pencil size={12} strokeWidth={1.75} />
            </button>
          )}
          {onDelete && (
            <button className="task-item__action-btn task-item__action-btn--danger" onClick={onDelete} title="Delete">
              <Trash2 size={12} strokeWidth={1.75} />
            </button>
          )}
        </span>
      )}
    </div>
  );
}
