import { resolveStatLabel } from '@/components/unit/UnitTags';

interface Props {
  statKey: string;
  value: number;
  isPercent?: boolean;
  /** Цветовая схема: treaty (зелёный/красный) или ability (синий/оранжевый) */
  scheme?: 'treaty' | 'ability';
}

export default function TreatyModifierBadge({ statKey, value, isPercent, scheme = 'treaty' }: Props) {
  const { label, known } = resolveStatLabel(statKey);
  const positive = value > 0;

  const colorCls = scheme === 'ability'
    ? positive ? 'bg-blue-900/30 text-blue-400' : 'bg-orange-900/30 text-orange-400'
    : positive ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400';

  const display = `${positive ? '+' : ''}${value}${isPercent ? '%' : ''}`;

  return (
    <span
      className={`font-mono-data text-[10px] px-1.5 py-0.5 rounded-sm inline-flex items-center gap-1 ${colorCls} ${!known ? 'border border-dashed border-current/40' : ''}`}
      title={!known ? 'Специальный модификатор' : undefined}
    >
      {label}: {display}
      {!known && <span className="opacity-60 text-[8px] leading-none">✦</span>}
    </span>
  );
}
