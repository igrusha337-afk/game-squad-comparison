export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type UnitClass = 'Пехота' | 'Кавалерия' | 'Стрелки' | 'Осадные';
export type UnitRole = 'Танк' | 'Борьба с кавалерией' | string;

export type UnitSubtype =
  | 'Пехота ближнего боя - баклер'
  | 'Пехота ближнего боя - большой щит'
  | 'Пехота ближнего боя - пики'
  | 'Пехота ближнего боя - дротики'
  | 'Пехота ближнего боя - особый'
  | 'Стрелковая пехота - лучники'
  | 'Стрелковая пехота - арбалетчики'
  | 'Стрелковая пехота - аркебузиры'
  | 'Стрелковая пехота - особый'
  | 'Кавалерия - копейщик'
  | 'Кавалерия - ближний бой'
  | 'Кавалерия - лучник'
  | 'Кавалерия - особый';

export function parseUnitSubtype(description: string): UnitSubtype | null {
  const d = description.toLowerCase().replace(/[–—]/g, '-').trim();
  if (d.startsWith('пехота ближнего боя')) {
    if (d.includes('баклер')) return 'Пехота ближнего боя - баклер';
    if (d.includes('большой щит')) return 'Пехота ближнего боя - большой щит';
    if (d.includes('пик')) return 'Пехота ближнего боя - пики';
    if (d.includes('дротик')) return 'Пехота ближнего боя - дротики';
    if (d.includes('особ')) return 'Пехота ближнего боя - особый';
  }
  if (d.startsWith('стрелковая пехота')) {
    if (d.includes('лучник')) return 'Стрелковая пехота - лучники';
    if (d.includes('арбалет')) return 'Стрелковая пехота - арбалетчики';
    if (d.includes('аркебуз')) return 'Стрелковая пехота - аркебузиры';
    if (d.includes('особ')) return 'Стрелковая пехота - особый';
  }
  if (d.startsWith('кавалерия')) {
    if (d.includes('копейщик') || d.includes('копейщики')) return 'Кавалерия - копейщик';
    if (d.includes('ближний бой')) return 'Кавалерия - ближний бой';
    if (d.includes('лучник')) return 'Кавалерия - лучник';
    if (d.includes('особ')) return 'Кавалерия - особый';
  }
  return null;
}

export type TraitColor = 'green' | 'gray' | 'red';

export interface Trait {
  name: string;
  description?: string;
  color?: TraitColor;
}

export interface UnitStats {
  // Основные
  health: number;           // Здоровье
  troops: number;           // Численность отряда
  leadership: number;       // Лидерство
  moveSpeed: number;        // Скорость движения
  rangeDistance: number;    // Дальность стрельбы
  ammo: number;             // Боезапас
  morale: number;           // Работоспособность / мораль

  // Атака
  piercingPenetration: number;  // Пробивание брони (проникающ.)
  slashingPenetration: number;  // Пробивание брони (рубящ.)
  bluntPenetration: number;     // Пробивание брони (дробящ.)
  piercingDamage: number;       // Проникающий урон
  slashingDamage: number;       // Рубящий урон
  bluntDamage: number;          // Дробящий урон

  // Защита
  piercingDefense: number;      // Защита (проникающ.)
  slashingDefense: number;      // Защита (рубящ.)
  bluntDefense: number;         // Защита (дробящ.)
  block: number;                // Блок
  blockRecovery: number;        // Восстановление показателя блока
}

export type StatModifierType = 'flat' | 'percent';

export interface StatModifierEntry {
  value: number;
  type: StatModifierType;
}

export interface TreatyCategory {
  id: number;
  name: string;
  description: string;
  sortOrder: number;
}

export interface Treaty {
  id: string;
  name: string;
  description: string;
  statModifiers: Partial<UnitStats>;
  statModifiersEx?: Partial<Record<keyof UnitStats, StatModifierEntry>>;
  compatibleClasses: UnitClass[];
  compatibleSubtypes?: UnitSubtype[];
  rarity: Rarity;
  avatar_url?: string;
  categoryId?: number | null;
}

export interface Ability {
  name: string;
  description?: string;
  statModifiers?: Partial<UnitStats>;
  statModifiersEx?: Partial<Record<keyof UnitStats, StatModifierEntry>>;
}

export type GuideBlockType = 'text' | 'image';

export interface GuideBlock {
  type: GuideBlockType;
  content: string;  // текст или URL изображения
}

export interface Formation {
  id: number;
  name: string;
  description: string;
  avatar_url: string;
}

export interface Unit {
  id: string;
  name: string;
  class: UnitClass;
  role: UnitRole | UnitRole[];
  rarity: Rarity;
  stats: UnitStats;
  description: string;
  lore: string;
  abilities: (string | Ability)[];
  traits?: Trait[];
  avatar_url?: string;
  stars?: number; // 0–5, шаг 0.5
  guide_upgrade?: GuideBlock[];
  guide_gameplay?: GuideBlock[];
  formations?: number[]; // массив ID построений
  subtype?: UnitSubtype | ''; // внутренний подтип, не отображается пользователям
}