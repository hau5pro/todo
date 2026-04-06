import { List, ShoppingCart, ArrowClockwise, CalendarCheck, Copy, Sparkle } from '@phosphor-icons/react';
import { ICON_SIZE } from './icons';
import type { List as ListData, ListType } from '../types';

const LIST_TYPE_ICONS: Partial<Record<ListType, React.ReactNode>> = {
  shopping: <ShoppingCart size={ICON_SIZE} weight="fill" />,
  cyclical: <ArrowClockwise size={ICON_SIZE} weight="fill" />,
  daily:    <CalendarCheck size={ICON_SIZE} weight="fill" />,
  template: <Copy size={ICON_SIZE} weight="fill" />,
};

const LIST_NAME_ICONS: Record<string, React.ReactNode> = {
  'Tasks':  <List size={ICON_SIZE} weight="fill" />,
  'Chores': <Sparkle size={ICON_SIZE} weight="fill" />,
};

export function getListIcon(list: Pick<ListData, 'name' | 'type'>): React.ReactNode {
  return LIST_NAME_ICONS[list.name] ?? LIST_TYPE_ICONS[list.type] ?? null;
}
