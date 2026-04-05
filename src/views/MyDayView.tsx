import { useMyDay } from '../hooks/useMyDay';
import { TaskItem } from '../components/TaskItem';
import { HabitItem } from '../components/HabitItem';
import { setTaskCompleted, advanceCyclicalTask } from '../db/tasks';
import { toggleHabitCompletion, getCompletionsForTask, calculateStreak } from '../db/habits';
import { useState, useEffect, useMemo } from 'react';
import type { Task } from '../types';

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function MyDayView() {
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const { overdue, today: todayTasks, habits, isLoading, reload } = useMyDay();
  const [streaks, setStreaks] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (habits.length === 0) return;
    Promise.all(
      habits.map(async ({ task }) => {
        const completions = await getCompletionsForTask(task.id);
        return [task.id, calculateStreak(completions, task.id, today)] as const;
      })
    ).then((entries) => setStreaks(new Map(entries)));
  }, [habits, today]);

  async function handleTaskToggle(task: Task) {
    if (task.recurrence_interval) {
      await advanceCyclicalTask(task.id);
    } else {
      await setTaskCompleted(task.id, !task.completed);
    }
    reload();
  }

  async function handleHabitToggle(taskId: string) {
    await toggleHabitCompletion(taskId, today);
    reload();
  }

  if (isLoading) return null;

  const hasAnything = overdue.length > 0 || todayTasks.length > 0 || habits.length > 0;

  return (
    <div>
      <h1 className="view-title">My Day — {formatDate(new Date())}</h1>
      {!hasAnything && <p className="empty-state">Nothing due today.</p>}

      {overdue.length > 0 && (
        <section>
          <div className="section-heading">Overdue</div>
          {overdue.map((task) => (
            <TaskItem
              key={task.id}
              title={task.title}
              completed={task.completed}
              dueDate={task.due_date}
              today={today}
              onToggle={() => handleTaskToggle(task)}
            />
          ))}
        </section>
      )}

      {todayTasks.length > 0 && (
        <section>
          <div className="section-heading">Today</div>
          {todayTasks.map((task) => (
            <TaskItem
              key={task.id}
              title={task.title}
              completed={task.completed}
              dueDate={task.due_date}
              today={today}
              onToggle={() => handleTaskToggle(task)}
            />
          ))}
        </section>
      )}

      {habits.length > 0 && (
        <section>
          <div className="section-heading">Habits</div>
          {habits.map(({ task, completedToday }) => (
            <HabitItem
              key={task.id}
              title={task.title}
              completedToday={completedToday}
              streak={streaks.get(task.id) ?? 0}
              onToggle={() => handleHabitToggle(task.id)}
            />
          ))}
        </section>
      )}
    </div>
  );
}
