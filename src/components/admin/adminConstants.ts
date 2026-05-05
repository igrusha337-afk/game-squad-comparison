import { Rarity, UnitClass } from '@/data/types';
import { ALL_STATS } from '@/data/statGroups';

export const UNIT_CLASSES: UnitClass[] = ['Пехота', 'Кавалерия', 'Стрелки', 'Осадные'];
export const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
export const RARITY_LABELS: Record<Rarity, string> = {
  common: 'Обычный',
  uncommon: 'Необычный',
  rare: 'Редкий',
  epic: 'Уникальный',
  legendary: 'Легендарный',
};

export const DEFAULT_UNIT_STATS = {
  health: 0, troops: 0, leadership: 0, moveSpeed: 0, rangeDistance: 0, ammo: 0, morale: 0,
  piercingPenetration: 0, slashingPenetration: 0, bluntPenetration: 0,
  piercingDamage: 0, slashingDamage: 0, bluntDamage: 0,
  piercingDefense: 0, slashingDefense: 0, bluntDefense: 0,
  block: 0, blockRecovery: 0,
};

export const STAT_LABELS: Partial<Record<string, string>> = Object.fromEntries(
  ALL_STATS.map(s => [s.key, s.label])
);
