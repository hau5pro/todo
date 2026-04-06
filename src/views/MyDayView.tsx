import { useEffect, useMemo, useState } from 'react';
import { Sun, CalendarCheck, Clock } from '@phosphor-icons/react';
import { useAppStore } from '../store';
import { TaskItem } from '../components/TaskItem';
import { HabitItem } from '../components/HabitItem';
import { toggleHabitCompletion, getCompletionsForTask, calculateStreak } from '../db/habits';
import { ICON_SIZE } from '../config/icons';

function sortByDueDate<T extends { due_date?: string | null }>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date.localeCompare(b.due_date);
  });
}

export function MyDayView() {
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayLabel = useMemo(() => new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }), []);
  const { myDayOverdue, myDayToday, myDayHabits, myDayLoaded, loadMyDay, completeTask, advanceCyclicalTask } = useAppStore();
  const [streaks, setStreaks] = useState<Map<string, number>>(new Map());

  useEffect(() => { loadMyDay(); }, []);

  useEffect(() => {
    if (myDayHabits.length === 0) return;
    Promise.all(
      myDayHabits.map(async ({ task }) => {
        const completions = await getCompletionsForTask(task.id);
        return [task.id, calculateStreak(completions, task.id, today)] as const;
      })
    ).then((entries) => setStreaks(new Map(entries)));
  }, [myDayHabits, today]);

  async function handleTaskToggle(task: typeof myDayOverdue[0]) {
    if (task.recurrence_interval) {
      await advanceCyclicalTask(task.id, task.list_id);
    } else {
      await completeTask(task.id, task.list_id, !task.completed);
    }
  }

  async function handleHabitToggle(taskId: string) {
    await toggleHabitCompletion(taskId, today);
    loadMyDay();
  }

  if (!myDayLoaded) return null;

  const hasAnything = myDayOverdue.length > 0 || myDayToday.length > 0 || myDayHabits.length > 0;

  const sortedOverdue = sortByDueDate(myDayOverdue);
  const sortedToday = sortByDueDate(myDayToday);

  return (
    <div>
      <div className="view-title-row">
        <span className="view-title-icon"><Sun size={ICON_SIZE} weight="fill" /></span>
        <h1 className="view-title">My Day</h1>
      </div>
      <p className="view-subtitle">{todayLabel}</p>
      {!hasAnything && <p className="empty-state">Nothing due today.</p>}

      {myDayHabits.length > 0 && (
        <section>
          <div className="section-heading"><CalendarCheck size={ICON_SIZE} weight="fill" />Habits</div>
          {myDayHabits.map(({ task, completedToday }) => (
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

      {myDayOverdue.length > 0 && (
        <section>
          <div className="section-heading"><Clock size={ICON_SIZE} weight="fill" />Overdue</div>
          {sortedOverdue.map((task) => (
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

      {myDayToday.length > 0 && (
        <section>
          <div className="section-heading"><Sun size={ICON_SIZE} weight="fill" />Today</div>
          {sortedToday.map((task) => (
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

    </div>
  );
}
