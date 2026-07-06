import { UnitStats } from './types';

export interface StatDef {
  key: keyof UnitStats;
  label: string;
  max: number;
  unit?: string;
}

export interface StatGroup {
  label: string;
  icon: string;
  color: string;
  stats: StatDef[];
}

export const STAT_GROUPS: StatGroup[] = [
  {
    label: 'Основные',
    icon: 'Shield',
    color: 'text-blue-400',
    stats: [
      { key: 'health',        label: 'Здоровье',          max: 200000 },
      { key: 'troops',        label: 'Численность',        max: 3000 },
      { key: 'leadership',    label: 'Лидерство',          max: 3000 },
      { key: 'moveSpeed',     label: 'Скорость движения',  max: 3000 },
      { key: 'rangeDistance', label: 'Дальность стрельбы', max: 3000 },
      { key: 'ammo',          label: 'Боезапас',           max: 3000 },
      { key: 'morale',        label: 'Работоспособность',  max: 3000 },
    ],
  },
  {
    label: 'Атака',
    icon: 'Swords',
    color: 'text-red-400',
    stats: [
      { key: 'piercingPenetration', label: 'Пробивание (проникающ.)', max: 3000 },
      { key: 'slashingPenetration', label: 'Пробивание (рубящ.)',      max: 3000 },
      { key: 'bluntPenetration',    label: 'Пробивание (дробящ.)',     max: 3000 },
      { key: 'piercingDamage',      label: 'Проникающий урон',         max: 3000 },
      { key: 'slashingDamage',      label: 'Рубящий урон',             max: 3000 },
      { key: 'bluntDamage',         label: 'Дробящий урон',            max: 3000 },
    ],
  },
  {
    label: 'Защита',
    icon: 'ShieldCheck',
    color: 'text-green-400',
    stats: [
      { key: 'piercingDefense', label: 'Защита (проникающ.)', max: 3000 },
      { key: 'slashingDefense', label: 'Защита (рубящ.)',      max: 3000 },
      { key: 'bluntDefense',    label: 'Защита (дробящ.)',     max: 3000 },
      { key: 'block',           label: 'Блок',                 max: 3000 },
      { key: 'blockRecovery',   label: 'Восстановление блока', max: 3000 },
    ],
  },
];

// Flat list for compare table
export const ALL_STATS: StatDef[] = STAT_GROUPS.flatMap(g => g.stats);

// Short labels for cards
export const CARD_STATS: StatDef[] = [
  { key: 'health',         label: 'Здоровье',        max: 200000 },
  { key: 'piercingDamage', label: 'Прон. урон',      max: 3000 },
  { key: 'slashingDamage', label: 'Руб. урон',       max: 3000 },
  { key: 'bluntDamage',    label: 'Дроб. урон',      max: 3000 },
  { key: 'rangeDistance',  label: 'Дальность',       max: 3000 },
  { key: 'ammo',           label: 'Боезапас',        max: 3000 },
];