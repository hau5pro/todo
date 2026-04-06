import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Trash2 } from 'lucide-react';
import { useTaskDetail } from '../contexts/TaskDetailContext';
import { useAppStore } from '../store';
import { ICON_SIZE } from '../config/icons';
import { ease } from '../utils/easing';
import { focusLater } from '../utils/dom';
import type { Task } from '../types';

export function TaskDetailPanel() {
  const { detail, close, updateTask: updateCtx } = useTaskDetail();
  const renameTask = useAppStore((s) => s.renameTask);
  const removeTask = useAppStore((s) => s.removeTask);
  const [editTitle, setEditTitle] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Snapshot the task so the component keeps rendering during the exit animation
  // (context clears detail immediately, which would cause return null before exit plays)
  const taskSnapshot = useRef<Task | undefined>(detail?.task);
  if (detail?.task) taskSnapshot.current = detail.task;
  const task = taskSnapshot.current;

  useEffect(() => {
    if (detail) {
      setEditTitle(detail.task.title);
      setConfirmDelete(false);
      focusLater(inputRef);
    }
  }, [detail?.task.id]);

  // Guard after all hooks — task is always defined when mounted via AnimatePresence
  if (!task) return null;

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
    <motion.aside
      className="task-detail-panel"
      initial={{ clipPath: 'inset(0 0 0 100%)' }}
      animate={{ clipPath: 'inset(0 0 0 0%)' }}
      exit={{ clipPath: 'inset(0 0 0 100%)', transition: { duration: 0.16, ease: ease.in } }}
      transition={{ duration: 0.28, ease: ease.bounce }}
    >
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
    </motion.aside>
  );
}
