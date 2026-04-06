import { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';
import { Trash, CalendarBlank } from '@phosphor-icons/react';
import { useTaskDetail } from '../contexts/TaskDetailContext';
import { useAppStore } from '../store';
import { ICON_SIZE } from '../config/icons';
import { ease } from '../utils/easing';
import { focusLater } from '../utils/dom';
import { CalendarPicker } from './CalendarPicker';
import { RecurrencePicker } from './RecurrencePicker';
import type { Task } from '../types';

function formatDueDate(date: string): string {
  const today = dayjs().format('YYYY-MM-DD');
  const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
  if (date === today) return 'Today';
  if (date === tomorrow) return 'Tomorrow';
  return dayjs(date).format('MMM D, YYYY');
}

export function TaskDetailPanel() {
  const { detail, close, updateTask: updateCtx } = useTaskDetail();
  const renameTask = useAppStore((s) => s.renameTask);
  const removeTask = useAppStore((s) => s.removeTask);
  const updateTaskFields = useAppStore((s) => s.updateTaskFields);

  const [editTitle, setEditTitle] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [calOpen, setCalOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const taskSnapshot = useRef<Task | undefined>(detail?.task);
  if (detail?.task) taskSnapshot.current = detail.task;
  const task = taskSnapshot.current;

  useEffect(() => {
    if (detail) {
      setEditTitle(detail.task.title);
      setConfirmDelete(false);
      setCalOpen(false);
      focusLater(inputRef);
    }
  }, [detail?.task.id]);


  if (!task) return null;

  async function commitTitle() {
    if (!task) return;
    const t = editTitle.trim();
    if (!t || t === task.title) return;
    const updated = await renameTask(task.id, task.list_id, t);
    updateCtx(updated);
  }

  async function handleDueDateChange(date: string | null) {
    if (!task) return;
    // Clearing due date also clears rrule
    const fields = date === null
      ? { due_date: null, rrule: null }
      : { due_date: date };
    const updated = await updateTaskFields(task.id, task.list_id, fields);
    updateCtx(updated);
    if (date !== null) setCalOpen(false);
  }

  async function handleRRuleChange(rrule: string | null) {
    if (!task) return;
    const updated = await updateTaskFields(task.id, task.list_id, { rrule });
    updateCtx(updated);
  }

  async function executeDelete() {
    if (!task) return;
    await removeTask(task.id, task.list_id);
    close();
  }

  const dueDate = task.due_date ?? null;
  const rrule = task.rrule ?? null;

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
          ✕
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

        {/* Due date */}
        <div className="task-detail-section">
          <button
            type="button"
            className={`task-detail-field-btn${dueDate ? ' task-detail-field-btn--set' : ''}`}
            onClick={() => setCalOpen((o) => !o)}
          >
            <CalendarBlank size={14} weight="fill" />
            <span>{dueDate ? formatDueDate(dueDate) : 'Add due date'}</span>
          </button>

          {calOpen && (
            <div className="task-detail-calendar">
              <CalendarPicker value={dueDate} onChange={handleDueDateChange} />
            </div>
          )}
        </div>

        {/* Recurrence */}
        <div className="task-detail-section">
          <RecurrencePicker
            value={rrule}
            dueDate={dueDate}
            onChange={handleRRuleChange}
          />
        </div>
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
            <Trash size={ICON_SIZE} weight="fill" />
            Delete task
          </button>
        )}
      </div>
    </motion.aside>
  );
}
