export type ListType = 'general' | 'cyclical' | 'daily' | 'shopping' | 'template';

export const LIST_TYPE_LABELS: Record<ListType, string> = {
  general:  'general',
  cyclical: 'cycles',
  daily:    'daily',
  shopping: 'shopping',
  template: 'template',
};
export type RecurrenceUnit = 'days' | 'weeks' | 'months';

export interface List {
  id: string;
  name: string;
  type: ListType;
  updated_at: string;   // ISO timestamp
  deleted_at: string | null;
  pending_sync: boolean;
}

export interface Task {
  id: string;
  list_id: string;
  title: string;
  completed: boolean;
  due_date: string | null;             // 'YYYY-MM-DD', cyclical only
  recurrence_interval: number | null;  // cyclical only
  recurrence_unit: RecurrenceUnit | null; // cyclical only
  updated_at: string;
  deleted_at: string | null;
  pending_sync: boolean;
}

export interface HabitCompletion {
  id: string;
  task_id: string;
  date: string;          // 'YYYY-MM-DD'
  created_at: string;
  deleted_at: string | null;
  pending_sync: boolean;
}
