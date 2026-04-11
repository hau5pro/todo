import type { LucideIcon } from 'lucide-react';
import {
  List, ClipboardList, ShoppingCart, CalendarCheck, Sparkles, BrushCleaning,
  Star, Heart, Bookmark, Flag, Tag,
  Package, CreditCard, Wallet,
  House, Car, Bike, Plane,
  Utensils, Coffee, Wine,
  Apple, Pizza, Beer, IceCream2, Cookie, Sandwich,
  Dumbbell, Trophy, CircleDot,
  Activity, Brain, Stethoscope,
  BookOpen, GraduationCap, Briefcase,
  Laptop, Code,
  Camera, Music, Film,
  Tv, Headphones, Mic, Radio,
  PawPrint, Leaf,
  Flower2, Mountain, Cloud, Waves, Wind,
  Sun, Moon,
  Flame, Snowflake,
  Clock, Calendar,
  MapPin, Globe,
  Mail, Phone,
  Users, CircleUser,
  Diamond, Crown,
  TrendingUp, PiggyBank, BarChart2, DollarSign,
  Sofa, Bed, Bath,
  Wrench, Palette, Scissors, Hammer, Paintbrush,
  Gamepad2, StickyNote,
  HeartPulse, Smile,
  Bell, Rocket, Baby, Pill, TreePine,
  Gift, Zap,
} from 'lucide-react';
import { ICON_SIZE } from './constants';
import type { List as ListData } from '../types';

// Map from stored icon name string → Lucide component
export const ICON_MAP: Record<string, LucideIcon> = {
  Star, Heart, Bookmark, Flag, Tag,
  ShoppingCart, Package, CreditCard, Wallet,
  House, Car, Bike, Plane,
  Utensils, Coffee, Wine, Apple, Pizza, Beer, IceCream2, Cookie, Sandwich,
  Dumbbell, Trophy, CircleDot,
  Activity, Brain, Stethoscope,
  BookOpen, GraduationCap, Briefcase,
  Laptop, Code,
  Camera, Music, Film, Tv, Headphones, Mic, Radio,
  PawPrint, Leaf, Flower2, Mountain, Cloud, Waves, Wind,
  Sun, Moon,
  Flame, Snowflake,
  Clock, Calendar,
  MapPin, Globe,
  Mail, Phone,
  Users, CircleUser,
  Diamond, Crown,
  TrendingUp, PiggyBank, BarChart2, DollarSign,
  Sofa, Bed, Bath,
  Wrench, Palette, Scissors, Hammer, Paintbrush,
  Gamepad2, StickyNote,
  HeartPulse, Smile,
  Bell, Rocket, Baby, Pill, TreePine,
  Gift, Zap,
  // Built-in list type icons (also selectable)
  List, CalendarCheck, Sparkles, BrushCleaning,
};

// Ordered list for the picker UI
export const PICKABLE_ICONS: string[] = [
  'List',
  'Star', 'Heart', 'Bookmark', 'Flag', 'Tag',
  'Bell', 'Gift', 'Zap', 'Sparkles',
  'ShoppingCart', 'Package', 'CreditCard', 'Wallet',
  'TrendingUp', 'PiggyBank', 'BarChart2', 'DollarSign',
  'House', 'Sofa', 'Bed', 'Bath',
  'Car', 'Bike', 'Plane',
  'Utensils', 'Coffee', 'Wine', 'Beer',
  'Apple', 'Pizza', 'Cookie', 'Sandwich', 'IceCream2',
  'Dumbbell', 'Trophy', 'CircleDot', 'Activity',
  'HeartPulse', 'Brain', 'Stethoscope', 'Pill',
  'BookOpen', 'GraduationCap', 'Briefcase',
  'Laptop', 'Code',
  'Camera', 'Music', 'Film', 'Tv', 'Headphones', 'Mic', 'Radio',
  'Gamepad2', 'StickyNote',
  'PawPrint', 'Leaf', 'Flower2', 'TreePine',
  'Mountain', 'Cloud', 'Waves', 'Wind',
  'Sun', 'Moon', 'Flame', 'Snowflake',
  'Clock', 'Calendar', 'CalendarCheck',
  'MapPin', 'Globe',
  'Mail', 'Phone',
  'Users', 'CircleUser', 'Baby',
  'Diamond', 'Crown',
  'Wrench', 'Hammer', 'BrushCleaning', 'Palette', 'Paintbrush', 'Scissors',
  'Smile', 'Rocket',
];

export function getListIcon(list: Pick<ListData, 'name' | 'type' | 'icon'>, size?: number): React.ReactNode {
  const iconSize = size ?? ICON_SIZE;

  // Custom icon takes precedence
  if (list.icon) {
    const IconComp = ICON_MAP[list.icon];
    if (IconComp) return <IconComp size={iconSize} />;
  }

  // Name-based overrides
  const nameMap: Record<string, LucideIcon> = { Tasks: ClipboardList, Chores: BrushCleaning };
  if (nameMap[list.name]) {
    const IconComp = nameMap[list.name];
    return <IconComp size={iconSize} />;
  }

  // Type-based defaults
  const typeMap: Partial<Record<string, LucideIcon>> = {
    shopping: ShoppingCart,
    daily: Flame,
  };
  const TypeIcon = typeMap[list.type];
  return TypeIcon ? <TypeIcon size={iconSize} /> : null;
}
