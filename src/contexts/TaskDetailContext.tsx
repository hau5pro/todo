import { createContext, useContext, useState } from 'react';
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

  return (
    <Ctx.Provider value={{
      detail,
      open: (d) => setDetail(d),
      close: () => setDetail(null),
      updateTask: (t) => setDetail((prev) => prev ? { ...prev, task: t } : null),
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTaskDetail() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTaskDetail must be used within TaskDetailProvider');
  return ctx;
}
