declare const __APP_VERSION__: string;

export type ListType = 'general' | 'daily' | 'shopping';

export const LIST_TYPE_LABELS: Record<ListType, string> = {
  general:  'general',
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
  icon: string | null;
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
  completed_at: string | null;         // ISO timestamp set when completed, cleared on uncomplete
  due_date: string | null;             // 'YYYY-MM-DD'
  due_time: string | null;             // 'HH:MM' (24-hour)
  recurrence_interval: number | null;
  recurrence_unit: RecurrenceUnit | null;
  rrule: string | null;                // task-level recurrence, e.g. 'FREQ=WEEKLY;INTERVAL=1;BYDAY=MO'
  group: string | null;                // optional group/section name within the list
  note: string | null;                 // free-form note or duration hint
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

export interface HabitSession {
  id: string;
  task_id: string;
  date: string;         // 'YYYY-MM-DD' — local date the session was started
  started_at: string;   // ISO timestamp
  ended_at: string | null;  // null while running
  deleted_at: string | null;
  pending_sync: boolean;
}
