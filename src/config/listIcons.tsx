import type { LucideIcon } from 'lucide-react';
import {
  List, ShoppingCart, CalendarCheck, Sparkles,
  Star, Heart, Bookmark, Flag, Tag,
  Package, CreditCard, Wallet,
  House, Car, Bike, Plane,
  Utensils, Coffee, Wine,
  Dumbbell, Trophy, CircleDot,
  BookOpen, GraduationCap, Briefcase,
  Laptop, Code,
  Camera, Music, Film,
  PawPrint, Leaf,
  Sun, Moon,
  Flame, Snowflake,
  Clock, Calendar,
  MapPin, Globe,
  Mail, Phone,
  Diamond, Crown,
  Wrench, Palette, Scissors,
  Gamepad2, StickyNote,
  HeartPulse, Smile,
  Bell, Rocket, Baby, Pill, TreePine,
} from 'lucide-react';
import { ICON_SIZE } from './constants';
import type { List as ListData } from '../types';

// Map from stored icon name string → Lucide component
export const ICON_MAP: Record<string, LucideIcon> = {
  Star, Heart, Bookmark, Flag, Tag,
  ShoppingCart, Package, CreditCard, Wallet,
  House, Car, Bike, Plane,
  Utensils, Coffee, Wine,
  Dumbbell, Trophy, CircleDot,
  BookOpen, GraduationCap, Briefcase,
  Laptop, Code,
  Camera, Music, Film,
  PawPrint, Leaf,
  Sun, Moon,
  Flame, Snowflake,
  Clock, Calendar,
  MapPin, Globe,
  Mail, Phone,
  Diamond, Crown,
  Wrench, Palette, Scissors,
  Gamepad2, StickyNote,
  HeartPulse, Smile,
  Bell, Rocket, Baby, Pill, TreePine,
  // Built-in list type icons (also selectable)
  List, CalendarCheck, Sparkles,
};

// Ordered list for the picker UI
export const PICKABLE_ICONS: string[] = [
  'List',
  'Star', 'Heart', 'Bookmark', 'Flag', 'Tag',
  'ShoppingCart', 'Package', 'CreditCard', 'Wallet',
  'House', 'Car', 'Bike', 'Plane',
  'Utensils', 'Coffee', 'Wine',
  'Dumbbell', 'Trophy', 'CircleDot',
  'BookOpen', 'GraduationCap', 'Briefcase',
  'Laptop', 'Code',
  'Camera', 'Music', 'Film',
  'PawPrint', 'Leaf',
  'Sun', 'Moon',
  'Flame', 'Snowflake',
  'Clock', 'Calendar',
  'MapPin', 'Globe',
  'Mail', 'Phone',
  'Diamond', 'Crown',
  'Wrench', 'Palette', 'Scissors',
  'Gamepad2', 'StickyNote',
  'HeartPulse', 'Smile',
  'Bell', 'Rocket', 'Baby', 'Pill', 'TreePine',
  'CalendarCheck', 'Sparkles',
];

export function getListIcon(list: Pick<ListData, 'name' | 'type' | 'icon'>, size?: number): React.ReactNode {
  const iconSize = size ?? ICON_SIZE;

  // Custom icon takes precedence
  if (list.icon) {
    const IconComp = ICON_MAP[list.icon];
    if (IconComp) return <IconComp size={iconSize} />;
  }

  // Name-based overrides
  const nameMap: Record<string, LucideIcon> = { Tasks: List, Chores: Sparkles };
  if (nameMap[list.name]) {
    const IconComp = nameMap[list.name];
    return <IconComp size={iconSize} />;
  }

  // Type-based defaults
  const typeMap: Partial<Record<string, LucideIcon>> = {
    shopping: ShoppingCart,
    daily: CalendarCheck,
  };
  const TypeIcon = typeMap[list.type];
  return TypeIcon ? <TypeIcon size={iconSize} /> : null;
}
