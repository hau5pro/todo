interface Props {
  title: string;
  completedToday: boolean;
  streak: number;
  onToggle: () => void;
}

export function HabitItem({ title, completedToday, streak, onToggle }: Props) {
  return (
    <div className="habit-item">
      <input type="checkbox" checked={completedToday} onChange={onToggle} />
      <span>{title}</span>
      {streak > 0 && <span className="habit-item__streak">🔥 {streak}</span>}
    </div>
  );
}
