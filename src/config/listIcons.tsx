import { List, ShoppingCart, ArrowClockwise, CalendarCheck, Sparkle } from '@phosphor-icons/react';
import { ICON_SIZE } from './icons';
import type { List as ListData, ListType } from '../types';

const LIST_TYPE_ICONS: Partial<Record<ListType, React.ReactNode>> = {
  shopping: <ShoppingCart size={ICON_SIZE} weight="fill" />,
  cyclical: <ArrowClockwise size={ICON_SIZE} weight="fill" />,
  daily:    <CalendarCheck size={ICON_SIZE} weight="fill" />,
};

const LIST_NAME_ICONS: Record<string, React.ReactNode> = {
  'Tasks':  <List size={ICON_SIZE} weight="fill" />,
  'Chores': <Sparkle size={ICON_SIZE} weight="fill" />,
};

export function getListIcon(list: Pick<ListData, 'name' | 'type'>, size?: number): React.ReactNode {
  if (size === undefined) {
    return LIST_NAME_ICONS[list.name] ?? LIST_TYPE_ICONS[list.type] ?? null;
  }
  const type = list.type as ListType;
  if (LIST_NAME_ICONS[list.name]) {
    const Icon = ({
      'Tasks': List, 'Chores': Sparkle,
    } as Record<string, React.ComponentType<{ size: number; weight: string }>>)[list.name];
    if (Icon) return <Icon size={size} weight="fill" />;
  }
  const TypeIcon = ({
    shopping: ShoppingCart, cyclical: ArrowClockwise, daily: CalendarCheck,
  } as Record<string, React.ComponentType<{ size: number; weight: string }>>)[type];
  return TypeIcon ? <TypeIcon size={size} weight="fill" /> : null;
}
