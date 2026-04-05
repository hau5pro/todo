import { useParams } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { useList } from '../hooks/useList';
import { TaskItem } from '../components/TaskItem';
import { createTask, setTaskCompleted, advanceCyclicalTask, softDeleteTask } from '../db/tasks';
import type { Task } from '../types';

export function ListView() {
  const { listId } = useParams<{ listId: string }>();
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const { list, tasks, isLoading, reload } = useList(listId!);
  const [newTitle, setNewTitle] = useState('');

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

  return (
    <div>
      <h1 className="view-title">{list.name}</h1>

      {activeTasks.map((task) => (
        <TaskItem
          key={task.id}
          title={task.title}
          completed={task.completed}
          dueDate={task.due_date}
          today={today}
          onToggle={() => handleToggle(task)}
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
