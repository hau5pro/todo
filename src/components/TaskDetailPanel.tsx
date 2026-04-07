import { useState, useEffect, useRef, useMemo } from 'react';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';
import { Trash, CalendarBlank, FolderSimple, X } from '@phosphor-icons/react';
import { useTaskDetail } from '../contexts/TaskDetailContext';
import { useAppStore } from '../store';
import { useSettings } from '../contexts/SettingsContext';
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
  const moveTaskToGroup = useAppStore((s) => s.moveTaskToGroup);
  const listTasks = useAppStore((s) =>
    detail ? (s.tasksByList[detail.task.list_id] ?? []) : []
  );
  const { listGroupOrders, setListGroupOrder } = useSettings();

  const [editTitle, setEditTitle] = useState('');
  const [calOpen, setCalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(false);
  const [groupInput, setGroupInput] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const groupInputRef = useRef<HTMLInputElement>(null);
  const taskSnapshot = useRef<Task | undefined>(detail?.task);
  if (detail?.task) taskSnapshot.current = detail.task;
  const task = taskSnapshot.current;

  useEffect(() => {
    if (detail) {
      setEditTitle(detail.task.title);
      setGroupInput(detail.task.group ?? '');
      setCalOpen(false);
      setEditingGroup(false);
      focusLater(inputRef);
    }
  }, [detail?.task.id]);

  // Existing groups for this list (for datalist suggestions)
  const existingGroups = useMemo(() => {
    return [...new Set(
      listTasks.filter((t) => t.group && !t.deleted_at).map((t) => t.group!)
    )];
  }, [listTasks]);

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

  async function commitGroup() {
    if (!task) return;
    const newGroup = groupInput.trim() || null;
    if (newGroup !== task.group) {
      const updated = await moveTaskToGroup(task.id, task.list_id, newGroup);
      updateCtx(updated);
      // Auto-add new group to ordering
      if (newGroup) {
        const current = listGroupOrders[task.list_id] ?? [];
        if (!current.includes(newGroup)) {
          setListGroupOrder(task.list_id, [...current, newGroup]);
        }
      }
    }
    setEditingGroup(false);
  }

  async function executeDelete() {
    if (!task) return;
    await removeTask(task.id, task.list_id);
    close();
  }

  const dueDate = task.due_date ?? null;
  const rrule = task.rrule ?? null;
  const currentGroup = task.group ?? null;

  return (
    <motion.aside
      className="task-detail-panel"
      initial={{ clipPath: 'inset(0 0 0 100%)' }}
      animate={{ clipPath: 'inset(0 0 0 0%)' }}
      exit={{ clipPath: 'inset(0 0 0 100%)', transition: { duration: 0.16, ease: ease.in } }}
      transition={{ duration: 0.26, ease: ease.snap }}
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

        {/* Group */}
        <div className="task-detail-section">
          {editingGroup ? (
            <div className="task-detail-group-edit">
              <FolderSimple size={14} weight="fill" style={{ color: 'var(--fg-muted)', flexShrink: 0 }} />
              <input
                ref={groupInputRef}
                list="group-suggestions"
                className="task-detail-group-input"
                value={groupInput}
                onChange={(e) => setGroupInput(e.target.value)}
                onBlur={commitGroup}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                  if (e.key === 'Escape') {
                    setGroupInput(task.group ?? '');
                    setEditingGroup(false);
                  }
                }}
                placeholder="Group name…"
                autoFocus
              />
              {currentGroup && (
                <button
                  className="task-detail-group-clear"
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent input blur before click
                    setGroupInput('');
                  }}
                  title="Remove from group"
                >
                  <X size={12} weight="bold" />
                </button>
              )}
              <datalist id="group-suggestions">
                {existingGroups.map((g) => <option key={g} value={g} />)}
              </datalist>
            </div>
          ) : (
            <button
              type="button"
              className={`task-detail-field-btn${currentGroup ? ' task-detail-field-btn--set' : ''}`}
              onClick={() => { setEditingGroup(true); focusLater(groupInputRef); }}
            >
              <FolderSimple size={14} weight="fill" />
              <span>{currentGroup ?? 'Add to group'}</span>
            </button>
          )}
        </div>

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
        <button className="task-detail-delete-btn" onClick={executeDelete}>
          <Trash size={ICON_SIZE} weight="fill" />
          Delete task
        </button>
      </div>
    </motion.aside>
  );
}
