import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo, useRef } from 'react';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { useList } from '../hooks/useList';
import { TaskItem } from '../components/TaskItem';
import { createTask, setTaskCompleted, advanceCyclicalTask, softDeleteTask, updateTask } from '../db/tasks';
import { updateList, deleteList } from '../db/lists';
import type { Task } from '../types';

export function ListView() {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const { list, tasks, isLoading, reload } = useList(listId!);
  const [newTitle, setNewTitle] = useState('');
  const [editingListName, setEditingListName] = useState(false);
  const [newListName, setNewListName] = useState('');
  const listNameInputRef = useRef<HTMLInputElement>(null);

  if (isLoading || !list) return null;

  // Shopping: show soft-deleted items as recent history; others: show active only
  const activeTasks = tasks.filter((t) => !t.completed && t.deleted_at === null);
  const recentCompleted = list.type === 'shopping'
    ? tasks.filter((t) => t.deleted_at !== null)
    : [];

  async function handleToggle(task: Task) {
    if (list!.type === 'cyclical' && task.recurrence_interval) {
      await advanceCyclicalTask(task.id);
    } else if (list!.type === 'shopping') {
      await softDeleteTask(task.id);
    } else {
      await setTaskCompleted(task.id, !task.completed);
    }
    reload();
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await createTask(listId!, newTitle.trim());
    setNewTitle('');
    reload();
  }

  function startEditListName() {
    setNewListName(list!.name);
    setEditingListName(true);
    setTimeout(() => listNameInputRef.current?.focus(), 0);
  }

  async function commitEditListName() {
    const name = newListName.trim();
    if (name && name !== list!.name) {
      await updateList(listId!, { name });
      reload();
    }
    setEditingListName(false);
  }

  function cancelEditListName() {
    setEditingListName(false);
  }

  async function handleDeleteList() {
    if (!confirm(`Delete "${list!.name}" and all its tasks?`)) return;
    await deleteList(listId!);
    navigate('/');
  }

  async function handleRenameTask(task: Task, title: string) {
    await updateTask(task.id, { title });
    reload();
  }

  async function handleDeleteTask(task: Task) {
    await softDeleteTask(task.id);
    reload();
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
                if (e.key === 'Escape') cancelEditListName();
              }}
            />
            <button className="view-title-action-btn" onClick={commitEditListName} title="Save"><Check size={15} strokeWidth={2} /></button>
            <button className="view-title-action-btn" onClick={cancelEditListName} title="Cancel"><X size={15} strokeWidth={2} /></button>
          </>
        ) : (
          <>
            <h1 className="view-title">{list.name}</h1>
            <span className="view-title-actions">
              <button className="view-title-action-btn" onClick={startEditListName} title="Rename list"><Pencil size={14} strokeWidth={1.75} /></button>
              <button className="view-title-action-btn view-title-action-btn--danger" onClick={handleDeleteList} title="Delete list"><Trash2 size={14} strokeWidth={1.75} /></button>
            </span>
          </>
        )}
      </div>

      {activeTasks.map((task) => (
        <TaskItem
          key={task.id}
          title={task.title}
          completed={task.completed}
          dueDate={task.due_date}
          today={today}
          onToggle={() => handleToggle(task)}
          onRename={(newTitle) => handleRenameTask(task, newTitle)}
          onDelete={() => handleDeleteTask(task)}
        />
      ))}

      <form onSubmit={handleAdd}>
        <input
          className="add-task-input"
          placeholder="+ Add task"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
      </form>

      {recentCompleted.length > 0 && (
        <section>
          <div className="section-heading">Recently completed</div>
          {recentCompleted.map((task) => (
            <TaskItem
              key={task.id}
              title={task.title}
              completed={true}
              today={today}
              onToggle={() => {}}
            />
          ))}
        </section>
      )}
    </div>
  );
}
