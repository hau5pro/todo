export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/** Format "HH:MM" → "9:00 AM" */
export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}
