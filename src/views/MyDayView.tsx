import { useEffect, useMemo, useState } from 'react';
import { Reorder } from 'framer-motion';
import { Sun, CalendarCheck, Clock } from '@phosphor-icons/react';
import { useAppStore } from '../store';
import { useSettings } from '../contexts/SettingsContext';
import { TaskItem } from '../components/TaskItem';
import { HabitItem } from '../components/HabitItem';
import { toggleHabitCompletion, getCompletionsForTask, calculateStreak } from '../db/habits';
import { ICON_SIZE } from '../config/icons';
import type { Task } from '../types';


function applyOrder(tasks: Task[], order: string[]): Task[] {
  if (order.length === 0) return tasks;
  const map = new Map(tasks.map((t) => [t.id, t]));
  const ordered = order.flatMap((id) => (map.has(id) ? [map.get(id)!] : []));
  const rest = tasks.filter((t) => !order.includes(t.id));
  return [...ordered, ...rest];
}

export function MyDayView() {
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const { myDayOverdue, myDayToday, myDayHabits, myDayLoaded, loadMyDay, completeTask, advanceCyclicalTask } = useAppStore();
  const { myDayOrder, setMyDayOrder } = useSettings();
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

  const orderedOverdue = applyOrder(myDayOverdue, myDayOrder);
  const orderedToday = applyOrder(myDayToday, myDayOrder);

  function handleReorder(reordered: Task[]) {
    // Merge the reordered section IDs back into the full order
    const reorderedIds = reordered.map((t) => t.id);
    const otherIds = myDayOrder.filter(
      (id) => !myDayOverdue.some((t) => t.id === id) && !myDayToday.some((t) => t.id === id)
    );
    setMyDayOrder([...reorderedIds, ...otherIds]);
  }

  return (
    <div>
      <div className="view-title-row">
        <span className="view-title-icon"><Sun size={ICON_SIZE} weight="fill" /></span>
        <h1 className="view-title">My Day</h1>
      </div>
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
          <Reorder.Group as="div" axis="y" values={orderedOverdue} onReorder={handleReorder}>
            {orderedOverdue.map((task) => (
              <Reorder.Item as="div" key={task.id} value={task}>
                <TaskItem
                  title={task.title}
                  completed={task.completed}
                  dueDate={task.due_date}
                  today={today}
                  onToggle={() => handleTaskToggle(task)}
                />
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </section>
      )}

      {myDayToday.length > 0 && (
        <section>
          <div className="section-heading"><Sun size={ICON_SIZE} weight="fill" />Today</div>
          <Reorder.Group as="div" axis="y" values={orderedToday} onReorder={handleReorder}>
            {orderedToday.map((task) => (
              <Reorder.Item as="div" key={task.id} value={task}>
                <TaskItem
                  title={task.title}
                  completed={task.completed}
                  dueDate={task.due_date}
                  today={today}
                  onToggle={() => handleTaskToggle(task)}
                />
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </section>
      )}

    </div>
  );
}
