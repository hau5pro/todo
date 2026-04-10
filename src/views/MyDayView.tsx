import { useEffect, useMemo } from 'react';
import { Sun, CalendarCheck, Clock } from 'lucide-react';
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

function sortByDueDateTime<T extends { due_date?: string | null; due_time?: string | null }>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    const dateCmp = a.due_date.localeCompare(b.due_date);
    if (dateCmp !== 0) return dateCmp;
    // Same date: tasks with a time come before tasks without
    if (a.due_time && !b.due_time) return -1;
    if (!a.due_time && b.due_time) return 1;
    if (a.due_time && b.due_time) return a.due_time.localeCompare(b.due_time);
    return 0;
  });
}

export function MyDayView() {
  const today = useMemo(() => getTodayString(), []);
  const todayLabel = useMemo(() => new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }), []);
  const { myDayOverdue, myDayToday, myDayHabits, myDayLoaded, loadMyDay, completeTask, advanceCyclicalTask } = useAppStore();
  const lists = useAppStore((s) => s.lists);
  const { listOrders, listGroupOrders } = useSettings();

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

  type HabitSection = {
    listId: string;
    listName: string;
    groupName: string | null;
    habits: typeof myDayHabits;
  };

  const habitSections = useMemo((): HabitSection[] => {
    const byList = new Map<string, typeof myDayHabits>();
    for (const h of myDayHabits) {
      const id = h.task.list_id;
      if (!byList.has(id)) byList.set(id, []);
      byList.get(id)!.push(h);
    }

    const sections: HabitSection[] = [];
    for (const [listId, habits] of byList) {
      const listName = lists.find((l) => l.id === listId)?.name ?? '';
      const ordered = applyOrder(habits, listOrders[listId] ?? [], (h) => h.task.id);

      const ungrouped = ordered.filter((h) => !h.task.group);
      const groupMap = new Map<string, typeof myDayHabits>();
      for (const h of ordered) {
        if (h.task.group) {
          if (!groupMap.has(h.task.group)) groupMap.set(h.task.group, []);
          groupMap.get(h.task.group)!.push(h);
        }
      }

      const savedGroupOrder = listGroupOrders[listId] ?? [];
      const allGroupNames = [
        ...savedGroupOrder.filter((g) => groupMap.has(g)),
        ...Array.from(groupMap.keys()).filter((g) => !savedGroupOrder.includes(g)),
      ];

      if (ungrouped.length > 0) {
        sections.push({ listId, listName, groupName: null, habits: ungrouped });
      }
      for (const groupName of allGroupNames) {
        sections.push({ listId, listName, groupName, habits: groupMap.get(groupName) ?? [] });
      }
    }
    return sections;
  }, [myDayHabits, listOrders, listGroupOrders, lists]);

  if (!myDayLoaded) return null;

  const hasAnything = myDayOverdue.length > 0 || myDayToday.length > 0 || myDayHabits.length > 0;

  const sortedOverdue = sortByDueDateTime(myDayOverdue);
  const sortedToday = sortByDueDateTime(myDayToday);

  return (
    <div>
      <motion.div variants={containerVariants} initial="hidden" animate="show">
      <motion.div variants={itemVariants} className="view-header">
        <div className="view-title-row">
          <span className="view-title-icon"><Sun size={20} /></span>
          <h1 className="view-title">My Day</h1>
        </div>
        <p className="view-subtitle">{todayLabel}</p>
      </motion.div>
      <div className="view-body">
      {!hasAnything && <motion.p variants={itemVariants} className="empty-state">Nothing due today.</motion.p>}
        {habitSections.length > 0 && (
          <motion.section variants={sectionVariants}>
            <div className="section-heading"><CalendarCheck size={ICON_SIZE} />Habits</div>
            {(() => {
              const multipleListsPresent = new Set(habitSections.map((s) => s.listId)).size > 1;
              let lastListId: string | null = null;
              return habitSections.map((section, i) => {
                const showListHeader = multipleListsPresent && section.listId !== lastListId;
                lastListId = section.listId;
                return (
                  <div key={`${section.listId}-${section.groupName ?? '__ungrouped__'}-${i}`}>
                    {showListHeader && (
                      <div className="my-day-list-label">{section.listName}</div>
                    )}
                    {section.groupName && (
                      <div className="my-day-group-label">{section.groupName}</div>
                    )}
                    {section.habits.map(({ task, completedToday, streak }) => (
                      <HabitItem
                        key={task.id}
                        title={task.title}
                        completedToday={completedToday}
                        streak={streak}
                        onToggle={() => handleHabitToggle(task.id)}
                      />
                    ))}
                  </div>
                );
              });
            })()}
          </motion.section>
        )}

        {myDayOverdue.length > 0 && (
          <motion.section variants={sectionVariants}>
            <div className="section-heading"><Clock size={ICON_SIZE} />Overdue</div>
            {sortedOverdue.map((task) => (
              <TaskItem
                key={task.id}
                title={task.title}
                completed={task.completed}
                dueDate={task.due_date}
                dueTime={task.due_time}
                today={today}
                onToggle={() => handleTaskToggle(task)}
              />
            ))}
          </motion.section>
        )}

        {myDayToday.length > 0 && (
          <motion.section variants={sectionVariants}>
            <div className="section-heading"><Sun size={ICON_SIZE} />Today</div>
            {sortedToday.map((task) => (
              <TaskItem
                key={task.id}
                title={task.title}
                completed={task.completed}
                dueDate={task.due_date}
                dueTime={task.due_time}
                today={today}
                onToggle={() => handleTaskToggle(task)}
              />
            ))}
          </motion.section>
        )}
      </div>
      </motion.div>

    </div>
  );
}
