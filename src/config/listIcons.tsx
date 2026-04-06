import { List, ShoppingCart, RefreshCw, CalendarCheck, Copy, Sparkles } from 'lucide-react';
import { ICON_SIZE } from './icons';
import type { List as ListData, ListType } from '../types';

const LIST_TYPE_ICONS: Record<ListType, React.ReactNode> = {
  general:  <List size={ICON_SIZE} strokeWidth={1.75} />,
  shopping: <ShoppingCart size={ICON_SIZE} strokeWidth={1.75} />,
  cyclical: <RefreshCw size={ICON_SIZE} strokeWidth={1.75} />,
  daily:    <CalendarCheck size={ICON_SIZE} strokeWidth={1.75} />,
  template: <Copy size={ICON_SIZE} strokeWidth={1.75} />,
};

const LIST_NAME_ICONS: Record<string, React.ReactNode> = {
  'Chores': <Sparkles size={ICON_SIZE} strokeWidth={1.75} />,
};

export function getListIcon(list: Pick<ListData, 'name' | 'type'>): React.ReactNode {
  return LIST_NAME_ICONS[list.name] ?? LIST_TYPE_ICONS[list.type];
}
