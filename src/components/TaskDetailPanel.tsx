import { useState, useEffect, useRef } from 'react';
import { X, Trash2 } from 'lucide-react';
import { useTaskDetail } from '../contexts/TaskDetailContext';
import { useAppStore } from '../store';
import { ICON_SIZE } from '../config/icons';

export function TaskDetailPanel() {
  const { detail, close, updateTask: updateCtx } = useTaskDetail();
  const renameTask = useAppStore((s) => s.renameTask);
  const removeTask = useAppStore((s) => s.removeTask);
  const [editTitle, setEditTitle] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (detail) {
      setEditTitle(detail.task.title);
      setConfirmDelete(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [detail?.task.id]);

  if (!detail) return null;
  const { task } = detail;

  async function commitTitle() {
    const t = editTitle.trim();
    if (!t || t === task.title) return;
    const updated = await renameTask(task.id, task.list_id, t);
    updateCtx(updated);
  }

  async function executeDelete() {
    await removeTask(task.id, task.list_id);
    close();
  }

  return (
    <aside className="task-detail-panel">
      <div className="task-detail-panel__header">
        <button className="task-detail-close" onClick={close} title="Close">
          <X size={ICON_SIZE} strokeWidth={2} />
        </button>
      </div>

      <div className="task-detail-panel__body">
        <input
          ref={inputRef}
          className="task-detail-title-input"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') { setEditTitle(task.title); e.currentTarget.blur(); }
          }}
        />
      </div>

      <div className="task-detail-panel__footer">
        {confirmDelete ? (
          <div className="task-detail-delete-confirm">
            <p>Delete this task?</p>
            <div className="task-detail-delete-confirm__actions">
              <button className="btn-danger-sm" onClick={executeDelete}>Delete</button>
              <button className="btn-ghost-sm" onClick={() => setConfirmDelete(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button className="task-detail-delete-btn" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={ICON_SIZE} strokeWidth={2} />
            Delete task
          </button>
        )}
      </div>
    </aside>
  );
}
