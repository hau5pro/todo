import { useEffect, useMemo } from 'react';
import { Sun, CalendarCheck, Clock } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store';
import { useSettings } from '../contexts/SettingsContext';
import { TaskItem } from '../components/TaskItem';
import { HabitItem } from '../components/HabitItem';
import { toggleHabitCompletion } from '../db/habits';
import { requestSync } from '../sync/orchestrator';
import { ICON_SIZE } from '../config/constants';
import { ease } from '../utils/easing';
import { applyOrder } from '../utils/order';
import { getTodayString } from '../utils/date';

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.2, ease: ease.out } },
};
const sectionVariants = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.22, ease: ease.out } },
};
const containerVariants = {
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.03 } },
};

function sortByDueDate<T extends { due_date?: string | null }>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date.localeCompare(b.due_date);
  });
}

export function MyDayView() {
  const today = useMemo(() => getTodayString(), []);
  const todayLabel = useMemo(() => new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }), []);
  const { myDayOverdue, myDayToday, myDayHabits, myDayLoaded, loadMyDay, completeTask, advanceCyclicalTask } = useAppStore();
  const { listOrders } = useSettings();

  useEffect(() => { loadMyDay(); }, []);

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
    requestSync();
  }

  const orderedHabits = useMemo(() => {
    const byList = new Map<string, typeof myDayHabits>();
    for (const h of myDayHabits) {
      const id = h.task.list_id;
      if (!byList.has(id)) byList.set(id, []);
      byList.get(id)!.push(h);
    }
    const result: typeof myDayHabits = [];
    for (const [listId, habits] of byList) {
      result.push(...applyOrder(habits, listOrders[listId] ?? [], (h) => h.task.id));
    }
    return result;
  }, [myDayHabits, listOrders]);

  if (!myDayLoaded) return null;

  const hasAnything = myDayOverdue.length > 0 || myDayToday.length > 0 || myDayHabits.length > 0;

  const sortedOverdue = sortByDueDate(myDayOverdue);
  const sortedToday = sortByDueDate(myDayToday);

  return (
    <div>
      <motion.div variants={containerVariants} initial="hidden" animate="show">
      <motion.div variants={itemVariants} className="view-title-row">
        <span className="view-title-icon"><Sun size={20} weight="fill" /></span>
        <h1 className="view-title">My Day</h1>
      </motion.div>
      <motion.p variants={itemVariants} className="view-subtitle">{todayLabel}</motion.p>
      {!hasAnything && <motion.p variants={itemVariants} className="empty-state">Nothing due today.</motion.p>}
        {orderedHabits.length > 0 && (
          <motion.section variants={sectionVariants}>
            <div className="section-heading"><CalendarCheck size={ICON_SIZE} weight="fill" />Habits</div>
            {orderedHabits.map(({ task, completedToday, streak }) => (
              <HabitItem
                key={task.id}
                title={task.title}
                completedToday={completedToday}
                streak={streak}
                onToggle={() => handleHabitToggle(task.id)}
              />
            ))}
          </motion.section>
        )}

        {myDayOverdue.length > 0 && (
          <motion.section variants={sectionVariants}>
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
          </motion.section>
        )}

        {myDayToday.length > 0 && (
          <motion.section variants={sectionVariants}>
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
          </motion.section>
        )}
      </motion.div>

    </div>
  );
}
