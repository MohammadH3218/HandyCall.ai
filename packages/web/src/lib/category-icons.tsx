/**
 * category-icons.tsx
 *
 * Single source of truth for service category icons used across:
 *  - CategoryCard (marketing homepage + /categories page)
 *  - home-services.ts constants
 *
 * All icons come from @tabler/icons-react — the project's single icon library.
 * Do NOT use emoji or add a second icon package just for categories.
 */

import React from 'react';
import {
  IconWind,
  IconDroplet,
  IconBolt,
  IconSparkles,
  IconCar,
  IconTool,
  IconTruck,
  IconBug,
  IconPalette,
  IconHammer,
  IconLeaf,
  IconSettings,
  IconGridDots,
  IconShieldCheck,
  IconDoor,
  IconBath,
  IconDroplets,
  IconHome,
  IconWindow,
  IconFilter,
  IconBabyCarriage,
  IconBook,
  IconSteeringWheel,
  IconWifi,
  IconStethoscope,
  IconWash,
  IconCamera,
  IconBarbell,
} from '@tabler/icons-react';

export type CategoryIconSlug =
  | 'ac-repair'
  | 'plumbing'
  | 'electrical'
  | 'cleaning'
  | 'car-washing'
  | 'appliance-repair'
  | 'moving'
  | 'pest-control'
  | 'painting'
  | 'carpentry'
  | 'landscaping'
  | 'handyman'
  | 'tile-flooring'
  | 'security'
  | 'doors-windows'
  | 'bathroom'
  | 'pool-service'
  | 'roofing'
  | 'curtains-blinds'
  | 'sanitation'
  | 'nanny-childcare'
  | 'private-tutoring'
  | 'driver-services'
  | 'network-it'
  | 'healthcare-home'
  | 'laundry-ironing'
  | 'photography-video'
  | 'personal-training';

interface IconConfig {
  Icon: React.ComponentType<{ className?: string; stroke?: number }>;
  bg: string;
  color: string;
}

export const CATEGORY_ICON_MAP: Record<CategoryIconSlug, IconConfig> = {
  'ac-repair':       { Icon: IconWind,         bg: 'bg-blue-100',    color: 'text-blue-600' },
  'plumbing':        { Icon: IconDroplet,       bg: 'bg-sky-100',     color: 'text-sky-600' },
  'electrical':      { Icon: IconBolt,          bg: 'bg-amber-100',   color: 'text-amber-600' },
  'cleaning':        { Icon: IconSparkles,      bg: 'bg-violet-100',  color: 'text-violet-600' },
  'car-washing':     { Icon: IconCar,           bg: 'bg-cyan-100',    color: 'text-cyan-600' },
  'appliance-repair':{ Icon: IconTool,          bg: 'bg-orange-100',  color: 'text-orange-600' },
  'moving':          { Icon: IconTruck,         bg: 'bg-emerald-100', color: 'text-emerald-600' },
  'pest-control':    { Icon: IconBug,           bg: 'bg-red-100',     color: 'text-red-500' },
  'painting':        { Icon: IconPalette,       bg: 'bg-pink-100',    color: 'text-pink-600' },
  'carpentry':       { Icon: IconHammer,        bg: 'bg-amber-100',   color: 'text-amber-700' },
  'landscaping':     { Icon: IconLeaf,          bg: 'bg-green-100',   color: 'text-green-600' },
  'handyman':        { Icon: IconSettings,       bg: 'bg-slate-100',   color: 'text-slate-600' },
  'tile-flooring':   { Icon: IconGridDots,      bg: 'bg-stone-100',   color: 'text-stone-600' },
  'security':        { Icon: IconShieldCheck,   bg: 'bg-blue-100',    color: 'text-blue-700' },
  'doors-windows':   { Icon: IconDoor,          bg: 'bg-slate-100',   color: 'text-slate-600' },
  'bathroom':        { Icon: IconBath,          bg: 'bg-sky-100',     color: 'text-sky-500' },
  'pool-service':    { Icon: IconDroplets,      bg: 'bg-cyan-100',    color: 'text-cyan-700' },
  'roofing':         { Icon: IconHome,          bg: 'bg-slate-100',   color: 'text-slate-700' },
  'curtains-blinds':   { Icon: IconWindow,         bg: 'bg-indigo-100',  color: 'text-indigo-600' },
  'sanitation':        { Icon: IconFilter,         bg: 'bg-teal-100',    color: 'text-teal-600' },
  'nanny-childcare':   { Icon: IconBabyCarriage,   bg: 'bg-rose-100',    color: 'text-rose-500' },
  'private-tutoring':  { Icon: IconBook,           bg: 'bg-indigo-100',  color: 'text-indigo-600' },
  'driver-services':   { Icon: IconSteeringWheel,  bg: 'bg-slate-100',   color: 'text-slate-700' },
  'network-it':        { Icon: IconWifi,           bg: 'bg-blue-100',    color: 'text-blue-600' },
  'healthcare-home':   { Icon: IconStethoscope,    bg: 'bg-red-100',     color: 'text-red-600' },
  'laundry-ironing':   { Icon: IconWash,           bg: 'bg-sky-100',     color: 'text-sky-600' },
  'photography-video': { Icon: IconCamera,         bg: 'bg-amber-100',   color: 'text-amber-600' },
  'personal-training': { Icon: IconBarbell,        bg: 'bg-emerald-100', color: 'text-emerald-600' },
};

/** Renders the icon element for a given category slug, ready to drop into CategoryCard */
export function CategoryIcon({
  slug,
  size = 24,
  strokeWidth = 1.8,
}: {
  slug: CategoryIconSlug;
  size?: number;
  strokeWidth?: number;
}) {
  const config = CATEGORY_ICON_MAP[slug];
  if (!config) return null;
  const { Icon, bg, color } = config;
  return (
    <div className={`flex items-center justify-center rounded-xl ${bg}`} style={{ width: size * 2, height: size * 2 }}>
      <Icon className={`${color}`} style={{ width: size, height: size }} stroke={strokeWidth} />
    </div>
  );
}
