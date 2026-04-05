import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getListById } from '../db/lists';
import { ListView } from './ListView';
import { DailyView } from './DailyView';
import { TemplateView } from './TemplateView';
import type { List } from '../types';

export function ListRouter() {
  const { listId } = useParams<{ listId: string }>();
  const [list, setList] = useState<List | null>(null);

  useEffect(() => {
    getListById(listId!).then((l) => setList(l ?? null));
  }, [listId]);

  if (!list) return null;
  if (list.type === 'daily') return <DailyView />;
  if (list.type === 'template') return <TemplateView />;
  return <ListView />;
}
