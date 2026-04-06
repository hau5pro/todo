import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Pencil, Trash2, Check, X, ChevronDown, ChevronRight } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store';
import { useTaskDetail } from '../contexts/TaskDetailContext';
import { TaskItem } from '../components/TaskItem';
import { ICON_SIZE } from '../config/icons';

export function ListView() {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const list = useAppStore((s) => s.lists.find((l) => l.id === listId));
  const tasks = useAppStore((s) => s.tasksByList[listId!]);
  const loadTasks = useAppStore((s) => s.loadTasks);
  const { renameList, deleteList, addTask, completeTask, advanceCyclicalTask } = useAppStore();

  const { detail, open: openDetail, close: closeDetail } = useTaskDetail();

  const [newTitle, setNewTitle] = useState('');
  const [editingListName, setEditingListName] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [confirmDeleteList, setConfirmDeleteList] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const listNameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tasks === undefined) loadTasks(listId!);
  }, [listId]);

  useEffect(() => { closeDetail(); }, [listId]);

  if (!list || tasks === undefined) return null;

  const activeTasks = tasks.filter((t) => !t.completed && t.deleted_at === null);
  const completedTasks = tasks.filter((t) => t.completed && t.deleted_at === null);

  async function handleToggle(task: typeof tasks[0]) {
    if (list!.type === 'cyclical' && task.recurrence_interval) {
      await advanceCyclicalTask(task.id, listId!);
    } else {
      await completeTask(task.id, listId!, !task.completed);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await addTask(listId!, newTitle.trim());
    setNewTitle('');
  }

  function startEditListName() {
    setNewListName(list!.name);
    setEditingListName(true);
    setTimeout(() => listNameInputRef.current?.focus(), 0);
  }

  async function commitEditListName() {
    const name = newListName.trim();
    if (name && name !== list!.name) await renameList(listId!, name);
    setEditingListName(false);
  }

  async function executeDeleteList() {
    await deleteList(listId!);
    closeDetail();
    navigate('/');
  }

  function handleSelectTask(task: typeof tasks[0]) {
    if (detail?.task.id === task.id) {
      closeDetail();
    } else {
      openDetail({ task });
    }
  }

  return (
    <div>
      <div className="view-title-row">
        {editingListName ? (
          <>
            <input
              ref={listNameInputRef}
              className="view-title-input"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEditListName();
                if (e.key === 'Escape') setEditingListName(false);
              }}
            />
            <button className="view-title-action-btn" onClick={commitEditListName} title="Save"><Check size={ICON_SIZE} strokeWidth={2} /></button>
            <button className="view-title-action-btn" onClick={() => setEditingListName(false)} title="Cancel"><X size={ICON_SIZE} strokeWidth={2} /></button>
          </>
        ) : (
          <>
            <h1 className="view-title">{list.name}</h1>
            <span className="view-title-actions">
              <button className="view-title-action-btn" onClick={startEditListName} title="Rename list"><Pencil size={ICON_SIZE} strokeWidth={2} /></button>
              <button className="view-title-action-btn view-title-action-btn--danger" onClick={() => setConfirmDeleteList(true)} title="Delete list"><Trash2 size={ICON_SIZE} strokeWidth={2} /></button>
            </span>
          </>
        )}
      </div>

      <form onSubmit={handleAdd}>
        <input
          className="add-task-input"
          placeholder="+ Add task"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
      </form>

      <AnimatePresence>
        {activeTasks.map((task) => (
          <TaskItem
            key={task.id}
            title={task.title}
            completed={task.completed}
            dueDate={task.due_date}
            today={today}
            onToggle={() => handleToggle(task)}
            onSelect={() => handleSelectTask(task)}
            isSelected={detail?.task.id === task.id}
          />
        ))}
      </AnimatePresence>

      <section>
        <button className="section-collapse-btn" onClick={() => setShowCompleted((p) => !p)}>
          <span className="section-heading" style={{ margin: 0 }}>
            Completed{completedTasks.length > 0 ? ` (${completedTasks.length})` : ''}
          </span>
          {showCompleted
            ? <ChevronDown size={ICON_SIZE} strokeWidth={2} />
            : <ChevronRight size={ICON_SIZE} strokeWidth={2} />}
        </button>
        {showCompleted && completedTasks.map((task) => (
          <TaskItem
            key={task.id}
            title={task.title}
            completed={true}
            dueDate={task.due_date}
            today={today}
            onToggle={() => handleToggle(task)}
            onSelect={() => handleSelectTask(task)}
            isSelected={detail?.task.id === task.id}
          />
        ))}
      </section>

      {confirmDeleteList && (
        <div className="modal-backdrop" onClick={() => setConfirmDeleteList(false)}>
          <div className="modal-popup" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-popup__title">Delete "{list.name}"?</h3>
            <p className="modal-popup__body">This will permanently delete the list and all its tasks.</p>
            <div className="modal-popup__actions">
              <button className="btn-danger-sm" onClick={executeDeleteList}>Delete</button>
              <button className="btn-ghost-sm" onClick={() => setConfirmDeleteList(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
