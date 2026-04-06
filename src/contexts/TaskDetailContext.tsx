import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { Task } from '../types';

interface Detail {
  task: Task;
}

interface ContextValue {
  detail: Detail | null;
  open: (d: Detail) => void;
  close: () => void;
  updateTask: (t: Task) => void;
}

const Ctx = createContext<ContextValue | null>(null);

export function TaskDetailProvider({ children }: { children: React.ReactNode }) {
  const [detail, setDetail] = useState<Detail | null>(null);

  const open = useCallback((d: Detail) => setDetail(d), []);
  const close = useCallback(() => setDetail(null), []);
  const updateTask = useCallback((t: Task) => setDetail((prev) => prev ? { ...prev, task: t } : null), []);

  const value = useMemo(() => ({ detail, open, close, updateTask }), [detail, open, close, updateTask]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTaskDetail() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTaskDetail must be used within TaskDetailProvider');
  return ctx;
}
