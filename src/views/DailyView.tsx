import { useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Reorder } from 'framer-motion';
import { useHabits } from '../hooks/useHabits';
import { useAppStore } from '../store';
import { useTaskDetail } from '../contexts/TaskDetailContext';
import { useSettings } from '../contexts/SettingsContext';
import { HabitItem } from '../components/HabitItem';
import { toggleHabitCompletion } from '../db/habits';
import { LIST_TYPE_LABELS } from '../types';
import { getListIcon } from '../config/listIcons';
import type { Task } from '../types';

function applyOrder<T extends { task: Task }>(rows: T[], order: string[]): T[] {
  if (order.length === 0) return rows;
  const map = new Map(rows.map((r) => [r.task.id, r]));
  const ordered = order.flatMap((id) => (map.has(id) ? [map.get(id)!] : []));
  const rest = rows.filter((r) => !order.includes(r.task.id));
  return [...ordered, ...rest];
}

export function DailyView() {
  const { listId } = useParams<{ listId: string }>();
  const list = useAppStore((s) => s.lists.find((l) => l.id === listId));
  const addTask = useAppStore((s) => s.addTask);
  const { rows, isLoading, reload, today } = useHabits(listId!);
  const [newTitle, setNewTitle] = useState('');

  const { detail, open: openDetail, close: closeDetail } = useTaskDetail();
  const { listOrders, setListOrder } = useSettings();
  // Reload when the panel closes so renames and deletes are reflected
  const prevDetail = useRef(detail);
  useEffect(() => {
    if (prevDetail.current !== null && detail === null) reload();
    prevDetail.current = detail;
  }, [detail]);

  if (isLoading) return null;

  const orderedRows = applyOrder(rows, listOrders[listId!] ?? []);

  function handleReorder(reordered: typeof rows) {
    setListOrder(listId!, reordered.map((r) => r.task.id));
  }

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
      <div className="view-title-row">
        {list && getListIcon(list) && <span className="view-title-icon">{getListIcon(list)}</span>}
        <h1 className="view-title">{list?.name ?? 'Habits'}</h1>
      </div>
      <p className="view-subtitle">{list ? LIST_TYPE_LABELS[list.type] : 'daily'}</p>
      <form onSubmit={handleAdd}>
        <input
          className="add-task-input"
          placeholder="+ Add habit"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
      </form>
      <Reorder.Group as="div" axis="y" values={orderedRows} onReorder={handleReorder}>
        {orderedRows.map((row) => (
          <Reorder.Item as="div" key={row.task.id} value={row}>
            <HabitItem
              title={row.task.title}
              completedToday={row.completedToday}
              streak={row.streak}
              onToggle={() => handleToggle(row.task.id)}
              onSelect={() => detail?.task.id === row.task.id ? closeDetail() : openDetail({ task: row.task })}
              isSelected={detail?.task.id === row.task.id}
            />
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  );
}
