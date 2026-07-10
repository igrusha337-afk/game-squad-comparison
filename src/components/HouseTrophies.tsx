import Icon from '@/components/ui/icon';

export interface Trophy {
  type: string;
  label: string;
  count: number;
}

const TROPHY_ICONS: Record<string, string> = {
  capital: 'Landmark',
  secondary_capital: 'Castle',
};

const TROPHY_COLORS: Record<string, string> = {
  capital: 'hsl(42 76% 58%)',
  secondary_capital: 'hsl(210 70% 62%)',
};

interface Props {
  trophies: Trophy[];
  size?: number;
}

export default function HouseTrophies({ trophies, size = 13 }: Props) {
  if (!trophies || trophies.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      {trophies.map(t => (
        <div key={t.type} title={t.label}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded-md"
          style={{
            background: `${(TROPHY_COLORS[t.type] || 'hsl(42 76% 58%)').replace(')', ' / 0.15)')}`,
            border: `1px solid ${(TROPHY_COLORS[t.type] || 'hsl(42 76% 58%)').replace(')', ' / 0.35)')}`,
          }}>
          <Icon name={TROPHY_ICONS[t.type] || 'Trophy'} size={size} style={{ color: TROPHY_COLORS[t.type] || 'hsl(42 76% 58%)' }} />
          {t.count > 1 && (
            <span className="text-[10px] font-bold" style={{ color: TROPHY_COLORS[t.type] || 'hsl(42 76% 58%)', fontFamily: 'Manrope, sans-serif' }}>
              {t.count}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
