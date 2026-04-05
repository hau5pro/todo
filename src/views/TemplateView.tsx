import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useList } from '../hooks/useList';
import { createList } from '../db/lists';
import { createTask } from '../db/tasks';

export function TemplateView() {
  const { listId } = useParams<{ listId: string }>();
  const { list, tasks, isLoading } = useList(listId!);
  const navigate = useNavigate();
  const [isDuplicating, setIsDuplicating] = useState(false);

  if (isLoading || !list) return null;

  async function handleDuplicate() {
    if (isDuplicating) return;
    setIsDuplicating(true);
    try {
      const newList = await createList(`${list!.name} (copy)`, 'general');
      await Promise.all(
        tasks.map((t) =>
          createTask(newList.id, t.title, {
            due_date: t.due_date ?? undefined,
            recurrence_interval: t.recurrence_interval ?? undefined,
            recurrence_unit: t.recurrence_unit ?? undefined,
          })
        )
      );
      navigate(`/list/${newList.id}`);
    } finally {
      setIsDuplicating(false);
    }
  }

  return (
    <div>
      <h1 className="view-title">{list.name}</h1>
      <button className="btn-duplicate" onClick={handleDuplicate} disabled={isDuplicating}>
        Use this template →
      </button>
      <div style={{ marginTop: '1rem' }}>
        {tasks.map((task) => (
          <div key={task.id} className="task-item">
            <span className="task-item__title">{task.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
