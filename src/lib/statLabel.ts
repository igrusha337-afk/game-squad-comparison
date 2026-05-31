import { UnitStats } from '@/data/types';
import { STAT_LABEL_MAP } from '@/components/unit/UnitTags';
import { SpecialStatDef } from '@/hooks/useAppData';

/**
 * Возвращает человекочитаемое название стата.
 * Сначала ищет в стандартных (STAT_LABEL_MAP), потом в особых (specialStats).
 * Если не нашёл — возвращает null (чтобы вызывающий код мог скрыть/заменить).
 */
export function resolveStatLabel(
  key: string,
  specialStats: SpecialStatDef[] = []
): string | null {
  const standard = STAT_LABEL_MAP[key as keyof UnitStats];
  if (standard) return standard;
  const special = specialStats.find(s => s.key === key);
  if (special) return special.label;
  return null;
}

/**
 * Форматирует значение модификатора для отображения: +23 / -5 / +10%
 */
export function formatModValue(value: number, isPercent: boolean): string {
  return `${value > 0 ? '+' : ''}${value}${isPercent ? '%' : ''}`;
}
