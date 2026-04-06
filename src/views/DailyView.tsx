import { useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useHabits } from '../hooks/useHabits';
import { useAppStore } from '../store';
import { useTaskDetail } from '../contexts/TaskDetailContext';
import { HabitItem } from '../components/HabitItem';
import { toggleHabitCompletion } from '../db/habits';
import { LIST_TYPE_LABELS } from '../types';
import { getListIcon } from '../config/listIcons';

export function DailyView() {
  const { listId } = useParams<{ listId: string }>();
  const list = useAppStore((s) => s.lists.find((l) => l.id === listId));
  const addTask = useAppStore((s) => s.addTask);
  const { rows, isLoading, reload, today } = useHabits(listId!);
  const [newTitle, setNewTitle] = useState('');

  const { detail, open: openDetail, close: closeDetail } = useTaskDetail();
  // Reload when the panel closes so renames and deletes are reflected
  const prevDetail = useRef(detail);
  useEffect(() => {
    if (prevDetail.current !== null && detail === null) reload();
    prevDetail.current = detail;
  }, [detail]);

  if (isLoading) return null;

  async function handleToggle(taskId: string) {
    await toggleHabitCompletion(taskId, today);
    reload();
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await addTask(listId!, newTitle.trim());
    setNewTitle('');
    reload();
  }

  return (
    <div>
      <h1 className="view-title">{list?.name ?? 'Habits'}</h1>
      <p className="view-subtitle">{list ? LIST_TYPE_LABELS[list.type] : 'daily'}</p>
      <form onSubmit={handleAdd}>
        <input
          className="add-task-input"
          placeholder="+ Add habit"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
      </form>
      {rows.map(({ task, completedToday, streak }) => (
        <HabitItem
          key={task.id}
          title={task.title}
          completedToday={completedToday}
          streak={streak}
          onToggle={() => handleToggle(task.id)}
          onSelect={() => detail?.task.id === task.id ? closeDetail() : openDetail({ task })}
          isSelected={detail?.task.id === task.id}
        />
      ))}
    </div>
  );
}
