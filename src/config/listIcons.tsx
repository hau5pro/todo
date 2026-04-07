import type { Icon } from '@phosphor-icons/react';
import {
  List, ShoppingCart, CalendarCheck, Sparkle,
  Star, Heart, Bookmark, Flag, Tag,
  Package, CreditCard, Wallet,
  House, Car, Bicycle, Airplane,
  ForkKnife, Coffee, Wine,
  Barbell, Trophy, SoccerBall,
  Books, GraduationCap, Briefcase,
  Laptop, Code,
  Camera, MusicNote, FilmStrip,
  PawPrint, Leaf,
  Sun, Moon,
  Fire, Snowflake,
  Clock, CalendarBlank,
  MapPin, Globe,
  Envelope, Phone,
  Diamond, Crown,
  Wrench, Palette, Scissors,
  GameController, Note,
  Heartbeat, Smiley,
  Bell, Rocket, Baby, Pill, Tree,
} from '@phosphor-icons/react';
import { ICON_SIZE } from './constants';
import type { List as ListData } from '../types';

// Map from stored icon name string → Phosphor component
export const ICON_MAP: Record<string, Icon> = {
  Star, Heart, Bookmark, Flag, Tag,
  ShoppingCart, Package, CreditCard, Wallet,
  House, Car, Bicycle, Airplane,
  ForkKnife, Coffee, Wine,
  Barbell, Trophy, SoccerBall,
  Books, GraduationCap, Briefcase,
  Laptop, Code,
  Camera, MusicNote, FilmStrip,
  PawPrint, Leaf,
  Sun, Moon,
  Fire, Snowflake,
  Clock, CalendarBlank,
  MapPin, Globe,
  Envelope, Phone,
  Diamond, Crown,
  Wrench, Palette, Scissors,
  GameController, Note,
  Heartbeat, Smiley,
  Bell, Rocket, Baby, Pill, Tree,
  // Built-in list type icons (also selectable)
  List, CalendarCheck, Sparkle,
};

// Ordered list for the picker UI
export const PICKABLE_ICONS: string[] = [
  'List',
  'Star', 'Heart', 'Bookmark', 'Flag', 'Tag',
  'ShoppingCart', 'Package', 'CreditCard', 'Wallet',
  'House', 'Car', 'Bicycle', 'Airplane',
  'ForkKnife', 'Coffee', 'Wine',
  'Barbell', 'Trophy', 'SoccerBall',
  'Books', 'GraduationCap', 'Briefcase',
  'Laptop', 'Code',
  'Camera', 'MusicNote', 'FilmStrip',
  'PawPrint', 'Leaf',
  'Sun', 'Moon',
  'Fire', 'Snowflake',
  'Clock', 'CalendarBlank',
  'MapPin', 'Globe',
  'Envelope', 'Phone',
  'Diamond', 'Crown',
  'Wrench', 'Palette', 'Scissors',
  'GameController', 'Note',
  'Heartbeat', 'Smiley',
  'Bell', 'Rocket', 'Baby', 'Pill', 'Tree',
  'CalendarCheck', 'Sparkle',
];

export function getListIcon(list: Pick<ListData, 'name' | 'type' | 'icon'>, size?: number): React.ReactNode {
  const iconSize = size ?? ICON_SIZE;

  // Custom icon takes precedence
  if (list.icon) {
    const IconComp = ICON_MAP[list.icon];
    if (IconComp) return <IconComp size={iconSize} weight="fill" />;
  }

  // Name-based overrides
  const nameMap: Record<string, Icon> = { Tasks: List, Chores: Sparkle };
  if (nameMap[list.name]) {
    const IconComp = nameMap[list.name];
    return <IconComp size={iconSize} weight="fill" />;
  }

  // Type-based defaults
  const typeMap: Partial<Record<string, Icon>> = {
    shopping: ShoppingCart,
    daily: CalendarCheck,
  };
  const TypeIcon = typeMap[list.type];
  return TypeIcon ? <TypeIcon size={iconSize} weight="fill" /> : null;
}
