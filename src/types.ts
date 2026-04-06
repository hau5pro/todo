export type ListType = 'general' | 'cyclical' | 'daily' | 'shopping';

export const LIST_TYPE_LABELS: Record<ListType, string> = {
  general:  'general',
  cyclical: 'cycles',
  daily:    'daily',
  shopping: 'shopping',
};
export type RecurrenceUnit = 'days' | 'weeks' | 'months';

export interface ListFolder {
  id: string;
  name: string;
  updated_at: string;
  deleted_at: string | null;
  pending_sync: boolean;
}

export interface List {
  id: string;
  name: string;
  type: ListType;
  folder_id: string | null;
  updated_at: string;   // ISO timestamp
  deleted_at: string | null;
  pending_sync: boolean;
}

export interface Task {
  id: string;
  list_id: string;
  title: string;
  completed: boolean;
  due_date: string | null;             // 'YYYY-MM-DD'
  recurrence_interval: number | null;  // cyclical list only
  recurrence_unit: RecurrenceUnit | null; // cyclical list only
  rrule: string | null;                // task-level recurrence, e.g. 'FREQ=WEEKLY;INTERVAL=1;BYDAY=MO'
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
