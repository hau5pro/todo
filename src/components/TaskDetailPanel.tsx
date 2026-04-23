import { useState, useEffect, useRef, useMemo } from 'react';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Calendar, Clock, Folder, X } from 'lucide-react';
import { useTaskDetail } from '../contexts/TaskDetailContext';
import { useAppStore } from '../store';
import { useSettings } from '../contexts/SettingsContext';
import { ICON_SIZE } from '../config/constants';
import { ease } from '../utils/easing';
import { focusLater } from '../utils/dom';
import { formatTime, getTodayString } from '../utils/date';
import { CalendarPicker } from './CalendarPicker';
import { RecurrencePicker } from './RecurrencePicker';
import type { Task, HabitSession } from '../types';
import { getSessionsForTaskDate, startSession, stopSession, updateSession, deleteSession } from '../db/sessions';

const EMPTY_TASKS: Task[] = [];

/** Parse numeric time input (e.g. "9", "930", "1430") → "HH:MM" or null. */
function parseTimeInput(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  let h: number, m: number;
  if (digits.length <= 2) {
    h = parseInt(digits, 10); m = 0;
  } else {
    h = parseInt(digits.slice(0, digits.length - 2), 10);
    m = parseInt(digits.slice(-2), 10);
  }
  if (h > 23 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatDueDate(date: string): string {
  const today = dayjs().format('YYYY-MM-DD');
  const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
  if (date === today) return 'Today';
  if (date === tomorrow) return 'Tomorrow';
  return dayjs(date).format('MMM D, YYYY');
}

/** Format an ISO timestamp as h:mm (e.g. "9:05", "14:30"). */
function formatSessionTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Elapsed time from startedAt to now, formatted as m:ss or h:mm:ss. */
function formatElapsed(startedAt: string): string {
  const secs = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Duration of a completed session, formatted as "17m" or "1h 5m". */
function sessionDuration(session: { started_at: string; ended_at: string }): string {
  const secs = Math.max(0, Math.floor(
    (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 1000,
  ));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${secs}s`;
}

/** Convert a local date string ('YYYY-MM-DD') + 'HH:MM' to an ISO timestamp. */
function timeOnDateToISO(date: string, hhmm: string): string {
  return new Date(`${date}T${hhmm}:00`).toISOString();
}

export function TaskDetailPanel() {
  const { detail, close, updateTask: updateCtx, notifySessionChange } = useTaskDetail();
  const renameTask = useAppStore((s) => s.renameTask);
  const removeTask = useAppStore((s) => s.removeTask);
  const updateTaskFields = useAppStore((s) => s.updateTaskFields);
  const moveTaskToGroup = useAppStore((s) => s.moveTaskToGroup);
  const listTasks = useAppStore((s) =>
    s.tasksByList[detail?.task.list_id ?? ''] ?? EMPTY_TASKS
  );
  const { listGroupOrders, setListGroupOrder } = useSettings();
  const isHabitTask = useAppStore((s) =>
    s.lists.find((l) => l.id === detail?.task.list_id)?.type === 'daily'
  );

  const [editTitle, setEditTitle] = useState('');
  const [timeInput, setTimeInput] = useState('');
  const [editingTime, setEditingTime] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(false);
  const [groupInput, setGroupInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [sessions, setSessions] = useState<HabitSession[]>([]);
  const [, setTimerTick] = useState(0);
  const [editingField, setEditingField] = useState<{ sessionId: string; field: 'start' | 'end' } | null>(null);
  const [fieldInput, setFieldInput] = useState('');
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const groupInputRef = useRef<HTMLInputElement>(null);
  const calRef = useRef<HTMLDivElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);
  const taskSnapshot = useRef<Task | undefined>(detail?.task);
  if (detail?.task) taskSnapshot.current = detail.task;
  const task = taskSnapshot.current;

  useEffect(() => {
    if (detail) {
      setEditTitle(detail.task.title);
      setGroupInput(detail.task.group ?? '');
      setNoteInput(detail.task.note ?? '');
      setCalOpen(false);
      setEditingTime(false);
      setEditingGroup(false);
      setShowSuggestions(false);
      setHighlightIdx(-1);
      focusLater(inputRef);
    }
  }, [detail?.task.id]);

  useEffect(() => {
    if (!calOpen) return;
    function handleClick(e: MouseEvent) {
      if (calRef.current && !calRef.current.contains(e.target as Node)) {
        setCalOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [calOpen]);

  useEffect(() => {
    if (!detail || !isHabitTask) { setSessions([]); return; }
    getSessionsForTaskDate(detail.task.id, getTodayString()).then(setSessions).catch(console.error);
  }, [detail?.task.id, isHabitTask]);

  useEffect(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    const active = sessions.find((s) => s.ended_at === null);
    if (active) {
      timerIntervalRef.current = setInterval(() => setTimerTick((t) => t + 1), 1000);
    } else {
      timerIntervalRef.current = null;
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [sessions]);

  // Existing groups for this list
  const existingGroups = useMemo(() => {
    return [...new Set(
      listTasks.filter((t) => t.group && !t.deleted_at).map((t) => t.group!)
    )];
  }, [listTasks]);

  const filteredGroups = useMemo(() => {
    const q = groupInput.trim().toLowerCase();
    if (!q) return existingGroups;
    return existingGroups.filter((g) => g.toLowerCase().includes(q));
  }, [existingGroups, groupInput]);

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
      ? { due_date: null, due_time: null, rrule: null }
      : { due_date: date };
    const updated = await updateTaskFields(task.id, task.list_id, fields);
    updateCtx(updated);
    if (date !== null) setCalOpen(false);
  }

  async function handleDueTimeChange(time: string | null) {
    if (!task) return;
    const updated = await updateTaskFields(task.id, task.list_id, { due_time: time });
    updateCtx(updated);
  }

  async function handleRRuleChange(rrule: string | null) {
    if (!task) return;
    const updated = await updateTaskFields(task.id, task.list_id, { rrule });
    updateCtx(updated);
  }

  async function commitGroup(overrideValue?: string) {
    if (!task) return;
    const newGroup = (overrideValue !== undefined ? overrideValue : groupInput).trim() || null;
    setShowSuggestions(false);
    setHighlightIdx(-1);
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

  async function commitNote() {
    if (!task) return;
    const note = noteInput.trim() || null;
    if (note === (task.note ?? null)) return;
    const updated = await updateTaskFields(task.id, task.list_id, { note });
    updateCtx(updated);
    setNoteInput(updated.note ?? '');
  }

  async function reloadSessions() {
    if (!task) return;
    const fresh = await getSessionsForTaskDate(task.id, getTodayString());
    setSessions(fresh);
    notifySessionChange();
  }

  async function handleTimerStart() {
    if (!task) return;
    await startSession(task.id, getTodayString());
    await reloadSessions();
  }

  async function handleTimerStop() {
    const active = sessions.find((s) => s.ended_at === null);
    if (!active) return;
    await stopSession(active.id);
    await reloadSessions();
  }

  function startEditingField(session: HabitSession, field: 'start' | 'end') {
    setEditingGroup(false);
    const activeSession = sessions.find((s) => s.ended_at === null);
    if (activeSession) return; // no editing while timer running
    setEditingField({ sessionId: session.id, field });
    setFieldInput(formatSessionTime(field === 'start' ? session.started_at : session.ended_at!));
  }

  async function commitFieldEdit(session: HabitSession) {
    if (!editingField || editingField.sessionId !== session.id) return;
    setEditingField(null);
    const hhmm = parseTimeInput(fieldInput);
    if (!hhmm) return;
    const newISO = timeOnDateToISO(session.date, hhmm);
    const newStartedAt = editingField.field === 'start' ? newISO : session.started_at;
    const newEndedAt = editingField.field === 'end' ? newISO : session.ended_at!;
    await updateSession(session.id, newStartedAt, newEndedAt);
    await reloadSessions();
  }

  async function handleSessionDelete(sessionId: string) {
    await deleteSession(sessionId);
    await reloadSessions();
  }

  async function executeDelete() {
    if (!task) return;
    await removeTask(task.id, task.list_id);
    close();
  }

  const dueDate = task.due_date ?? null;
  const dueTime = task.due_time ?? null;
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
        <button className="task-detail-close" onClick={close} aria-label="Close">
          ✕
        </button>
      </div>

      <div className="task-detail-panel__body">
        <input
          ref={inputRef}
          className="task-detail-title-input"
          aria-label="Task title"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') { setEditTitle(task.title); e.currentTarget.blur(); }
          }}
        />

        {/* Timer — habit tasks only */}
        {isHabitTask && (() => {
          const activeSession = sessions.find((s) => s.ended_at === null) ?? null;
          const totalSecs = sessions.reduce((sum, s) => {
            if (s.ended_at === null) {
              return sum + Math.floor((Date.now() - new Date(s.started_at).getTime()) / 1000);
            }
            return sum + Math.floor((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000);
          }, 0);
          const totalH = Math.floor(totalSecs / 3600);
          const totalM = Math.floor((totalSecs % 3600) / 60);
          const totalLabel = totalH > 0 ? `${totalH}h ${totalM}m` : totalM > 0 ? `${totalM}m` : `${totalSecs}s`;
          return (
            <div className="task-detail-section">
              <span className="task-detail-section__heading">Timer</span>
              <div className="habit-timer">
                <div className="habit-timer__clock">
                  <span className={`habit-timer__digits${activeSession ? ' habit-timer__digits--active' : ''}`}>
                    {activeSession ? formatElapsed(activeSession.started_at) : '0:00'}
                  </span>
                  {activeSession ? (
                    <button className="habit-timer__stop-btn" onClick={handleTimerStop}>
                      <span className="habit-timer__stop-square" /> Stop
                    </button>
                  ) : (
                    <button className="habit-timer__start-btn" onClick={handleTimerStart}>
                      <span className="habit-timer__start-tri" /> Start
                    </button>
                  )}
                </div>
                {sessions.some((s) => s.ended_at !== null) && (
                  <>
                    <div className="habit-timer__session-list">
                      {sessions.filter((s) => s.ended_at !== null).map((s) => {
                        const isActive = false;
                        const editStart = editingField?.sessionId === s.id && editingField.field === 'start';
                        const editEnd = editingField?.sessionId === s.id && editingField.field === 'end';
                        return (
                          <div
                            key={s.id}
                            className={`habit-timer__session-row${isActive ? ' habit-timer__session-row--active' : ''}`}
                          >
                            {editStart ? (
                              <input
                                className="habit-timer__time-input"
                                value={fieldInput}
                                onChange={(e) => setFieldInput(e.target.value)}
                                onBlur={() => commitFieldEdit(s)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') e.currentTarget.blur();
                                  if (e.key === 'Escape') setEditingField(null);
                                }}
                                autoFocus
                              />
                            ) : (
                              <span
                                className={`habit-timer__time${isActive ? ' habit-timer__time--active' : ''}`}
                                onClick={() => startEditingField(s, 'start')}
                              >
                                {formatSessionTime(s.started_at)}
                              </span>
                            )}
                            {!isActive && <span className="habit-timer__sep">–</span>}
                            {isActive ? null : editEnd ? (
                              <input
                                className="habit-timer__time-input"
                                value={fieldInput}
                                onChange={(e) => setFieldInput(e.target.value)}
                                onBlur={() => commitFieldEdit(s)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') e.currentTarget.blur();
                                  if (e.key === 'Escape') setEditingField(null);
                                }}
                                autoFocus
                              />
                            ) : (
                              <span
                                className="habit-timer__time"
                                onClick={() => startEditingField(s, 'end')}
                              >
                                {formatSessionTime(s.ended_at!)}
                              </span>
                            )}
                            <span className="habit-timer__duration">
                              {isActive ? formatElapsed(s.started_at) : sessionDuration(s as { started_at: string; ended_at: string })}
                            </span>
                            {!isActive && !activeSession && (
                              <button
                                className="habit-timer__delete"
                                onClick={() => handleSessionDelete(s.id)}
                                title="Delete session"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="habit-timer__total-row">
                      <span className="habit-timer__total-label">Total</span>
                      <span className="habit-timer__total-value">{totalLabel}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {/* Note */}
        <div className="task-detail-section">
          <span className="task-detail-section__heading">Note</span>
          <div className="task-detail-section__fields">
            <textarea
              className="task-detail-note-input"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              onBlur={commitNote}
              placeholder="Add a note…"
              rows={3}
            />
          </div>
        </div>

        {/* Schedule: due date + recurrence — hidden for habit tasks */}
        {!isHabitTask && (
          <div className="task-detail-section">
            <span className="task-detail-section__heading">Schedule</span>
            <div className="task-detail-section__fields">
              <div ref={calRef}>
                <button
                  type="button"
                  className={`task-detail-field-btn${dueDate ? ' task-detail-field-btn--set' : ''}`}
                  onClick={() => { setEditingTime(false); setCalOpen((o) => !o); }}
                  title={dueDate ? 'Change due date' : 'Set a due date'}
                >
                  <Calendar size={ICON_SIZE} />
                  <span>{dueDate ? formatDueDate(dueDate) : 'Add due date'}</span>
                </button>

                <AnimatePresence>
                  {calOpen && (
                    <motion.div
                      className="task-detail-calendar"
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      transition={{ duration: 0.18, ease: ease.out }}
                    >
                      <CalendarPicker value={dueDate} onChange={handleDueDateChange} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {dueDate && (
                <div
                  className={`task-detail-time-wrap${dueTime ? ' task-detail-time-wrap--set' : ''}`}
                  onClick={() => {
                    if (!editingTime) {
                      setCalOpen(false);
                      setTimeInput(dueTime ? dueTime.replace(':', '') : '900');
                      setEditingTime(true);
                      setTimeout(() => timeInputRef.current?.select(), 0);
                    }
                  }}
                >
                  <Clock size={ICON_SIZE} />
                  {editingTime ? (
                    <input
                      ref={timeInputRef}
                      type="text"
                      inputMode="numeric"
                      className="task-detail-time-input task-detail-time-input--set"
                      value={timeInput}
                      placeholder={dueTime ?? '900'}
                      onChange={(e) => setTimeInput(e.target.value)}
                      onBlur={() => {
                        const parsed = parseTimeInput(timeInput);
                        if (parsed) handleDueTimeChange(parsed);
                        setEditingTime(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                        if (e.key === 'Escape') { setEditingTime(false); }
                      }}
                    />
                  ) : dueTime ? (
                    <span className="task-detail-time-input task-detail-time-input--set">
                      {formatTime(dueTime)}
                    </span>
                  ) : (
                    <span className="task-detail-time-placeholder">9:00 AM</span>
                  )}
                  {dueTime && !editingTime && (
                    <button
                      className="task-detail-time-clear"
                      onClick={(e) => { e.stopPropagation(); handleDueTimeChange(null); }}
                      title="Remove time"
                    >
                      <X size={ICON_SIZE} />
                    </button>
                  )}
                </div>
              )}

              <RecurrencePicker
                value={rrule}
                dueDate={dueDate}
                onChange={handleRRuleChange}
              />
            </div>
          </div>
        )}

        {/* Organize: group */}
        <div className="task-detail-section">
          <span className="task-detail-section__heading">Organize</span>
          <div className="task-detail-section__fields">
          {editingGroup ? (
            <div className="task-detail-group-wrap">
              <div className="task-detail-group-edit">
                <Folder size={ICON_SIZE} style={{ color: 'var(--fg-muted)', flexShrink: 0 }} />
                <input
                  ref={groupInputRef}
                  className="task-detail-group-input"
                  value={groupInput}
                  onChange={(e) => {
                    setGroupInput(e.target.value);
                    setHighlightIdx(-1);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => {
                    setShowSuggestions(false);
                    commitGroup();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setHighlightIdx((i) => Math.min(i + 1, filteredGroups.length - 1));
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setHighlightIdx((i) => Math.max(i - 1, -1));
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      if (highlightIdx >= 0 && filteredGroups[highlightIdx]) {
                        setGroupInput(filteredGroups[highlightIdx]);
                        commitGroup(filteredGroups[highlightIdx]);
                      } else {
                        e.currentTarget.blur();
                      }
                    } else if (e.key === 'Escape') {
                      setGroupInput(task.group ?? '');
                      setShowSuggestions(false);
                      setEditingGroup(false);
                    }
                  }}
                  placeholder="Group name…"
                  autoFocus
                />
                {(currentGroup || groupInput) && (
                  <button
                    className="task-detail-group-clear"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setGroupInput('');
                    }}
                    title="Remove from group"
                  >
                    <X size={ICON_SIZE} />
                  </button>
                )}
              </div>
              {showSuggestions && filteredGroups.length > 0 && (
                <ul className="task-detail-group-suggestions">
                  {filteredGroups.map((g, i) => (
                    <li
                      key={g}
                      className={`task-detail-group-suggestion${i === highlightIdx ? ' task-detail-group-suggestion--active' : ''}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setGroupInput(g);
                        commitGroup(g);
                      }}
                    >
                      {g}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <button
              type="button"
              className={`task-detail-field-btn${currentGroup ? ' task-detail-field-btn--set' : ''}`}
              onClick={() => { setCalOpen(false); setEditingTime(false); setEditingGroup(true); setEditingField(null); focusLater(groupInputRef); }}
              title={currentGroup ? 'Change group' : 'Assign to a group'}
            >
              <Folder size={ICON_SIZE} />
              <span>{currentGroup ?? 'Add to group'}</span>
            </button>
          )}
          </div>
        </div>
      </div>

      <div className="task-detail-panel__footer">
        <button className="task-detail-delete-btn" onClick={executeDelete}>
          <Trash2 size={ICON_SIZE} />
          Delete task
        </button>
      </div>
    </motion.aside>
  );
}
