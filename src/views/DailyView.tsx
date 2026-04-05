import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useHabits } from '../hooks/useHabits';
import { useList } from '../hooks/useList';
import { HabitItem } from '../components/HabitItem';
import { toggleHabitCompletion } from '../db/habits';
import { createTask } from '../db/tasks';

export function DailyView() {
  const { listId } = useParams<{ listId: string }>();
  const { list } = useList(listId!);
  const { rows, isLoading, reload, today } = useHabits(listId!);
  const [newTitle, setNewTitle] = useState('');

  if (isLoading) return null;

  async function handleToggle(taskId: string) {
    await toggleHabitCompletion(taskId, today);
    reload();
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await createTask(listId!, newTitle.trim());
    setNewTitle('');
    reload();
  }

  return (
    <div>
      <h1 className="view-title">{list?.name ?? 'Habits'}</h1>
      {rows.map(({ task, completedToday, streak }) => (
        <HabitItem
          key={task.id}
          title={task.title}
          completedToday={completedToday}
          streak={streak}
          onToggle={() => handleToggle(task.id)}
        />
      ))}
      <form onSubmit={handleAdd}>
        <input
          className="add-task-input"
          placeholder="+ Add habit"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
      </form>
    </div>
  );
}
