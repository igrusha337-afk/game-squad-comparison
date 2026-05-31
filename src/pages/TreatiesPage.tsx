import { useState } from 'react';
import { useUnits, useTreaties, useSpecialStats } from '@/hooks/useAppData';
import { Treaty, Unit, UnitStats } from '@/data/types';
import RarityBadge from '@/components/RarityBadge';
import Icon from '@/components/ui/icon';
import { resolveStatLabel, formatModValue } from '@/lib/statLabel';

function calcModifierValue(treaty: Treaty, key: string, baseStats?: UnitStats): number {
  const ex = treaty.statModifiersEx?.[key as keyof UnitStats];
  if (ex) {
    if (ex.type === 'percent' && baseStats) {
      return Math.round((baseStats[key as keyof UnitStats] as number) * ex.value / 100);
    }
    return ex.value;
  }
  return (treaty.statModifiers[key as keyof UnitStats] as number) || 0;
}



interface TreatiesPageProps {
  appliedTreaties: Record<string, string[]>;
  onApply: (unitId: string, treatyId: string) => void;
  onRemove: (unitId: string, treatyId: string) => void;
}

export default function TreatiesPage({ appliedTreaties, onApply, onRemove }: TreatiesPageProps) {
  const { units: UNITS, loading: unitsLoading } = useUnits();
  const { treaties: TREATIES, categories: CATEGORIES, loading: treatiesLoading } = useTreaties();
  const { specialStats } = useSpecialStats();
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [filterCategoryId, setFilterCategoryId] = useState<number | null>(null);

  const unit = UNITS.find(u => u.id === selectedUnit);
  const unitTreatyIds = selectedUnit ? (appliedTreaties[selectedUnit] || []) : [];
  const unitSubtype = unit?.subtype || '';

  const compatibleTreaties = unit
    ? TREATIES.filter(t => {
        const subtypes = t.compatibleSubtypes;
        if (subtypes && subtypes.length > 0) {
          if (!unitSubtype || !subtypes.includes(unitSubtype as never)) return false;
        } else if (t.compatibleClasses.length > 0 && !t.compatibleClasses.includes(unit.class)) {
          return false;
        }
        if (filterCategoryId !== null && t.categoryId !== filterCategoryId) return false;
        return true;
      })
    : [];

  const getStatBonuses = (unitId: string) => {
    const ids = appliedTreaties[unitId] || [];
    return ids.length;
  };

  if (unitsLoading || treatiesLoading) return (
    <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
      <Icon name="Loader" size={18} className="animate-spin mr-2" /> Загрузка...
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-foreground mb-1">Трактаты</h1>
        <p className="text-muted-foreground text-sm">Применяйте трактаты к отрядам и наблюдайте за изменением характеристик</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Unit selector */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Выберите отряд</h2>
          <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-thin pr-1">
            {UNITS.map(u => {
              const count = getStatBonuses(u.id);
              return (
                <button
                  key={u.id}
                  onClick={() => setSelectedUnit(u.id)}
                  className={`w-full text-left p-3 rounded-sm border transition-all ${
                    selectedUnit === u.id
                      ? `border-primary bg-primary/5`
                      : `border-border bg-card hover:border-primary/30`
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${selectedUnit === u.id ? 'text-foreground' : 'text-foreground'}`}>
                      {u.name}
                    </span>
                    {count > 0 && (
                      <span className="text-[10px] font-mono-data bg-primary/20 text-primary rounded-sm px-1.5 py-0.5">
                        +{count}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{u.class}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Treaties panel */}
        <div className="lg:col-span-2">
          {!unit ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Icon name="ScrollText" size={40} className="text-muted-foreground opacity-30 mb-3" />
              <p className="text-sm text-muted-foreground">Выберите отряд слева для управления трактатами</p>
            </div>
          ) : (
            <div>
              <div className={`bg-card border border-rarity-${unit.rarity} rounded-sm p-4 mb-4`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{unit.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{unit.class}</span>
                      <RarityBadge rarity={unit.rarity} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Трактатов</div>
                    <div className="font-mono-data text-2xl text-primary">{unitTreatyIds.length}</div>
                  </div>
                </div>

                {/* Current bonuses summary */}
                {unitTreatyIds.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="text-xs text-muted-foreground mb-2">Суммарные бонусы:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {(() => {
                        const totals: Record<string, number> = {};
                        TREATIES.filter(t => unitTreatyIds.includes(t.id)).forEach(t => {
                          const allKeys = new Set([
                            ...Object.keys(t.statModifiers),
                            ...Object.keys(t.statModifiersEx || {}),
                          ]);
                          allKeys.forEach(k => {
                            totals[k] = (totals[k] || 0) + calcModifierValue(t, k, unit?.stats);
                          });
                        });
                        return Object.entries(totals).map(([stat, val]) => {
                          const label = resolveStatLabel(stat, specialStats);
                          if (!label) return null;
                          return (
                            <span
                              key={stat}
                              className={`font-mono-data text-[10px] px-2 py-1 rounded-sm ${val > 0 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}
                            >
                              {label}: {formatModValue(val, false)}
                            </span>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                  Доступные трактаты ({compatibleTreaties.length})
                </h3>
              </div>

              {CATEGORIES.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <button
                    onClick={() => setFilterCategoryId(null)}
                    className={`px-3 py-1 text-xs rounded-sm border transition-colors ${filterCategoryId === null ? 'bg-primary/10 border-primary text-primary' : 'border-border text-muted-foreground hover:border-foreground/40'}`}>
                    Все
                  </button>
                  {CATEGORIES.map(c => (
                    <button key={c.id}
                      onClick={() => setFilterCategoryId(filterCategoryId === c.id ? null : c.id)}
                      className={`px-3 py-1 text-xs rounded-sm border transition-colors ${filterCategoryId === c.id ? 'bg-primary/10 border-primary text-primary' : 'border-border text-muted-foreground hover:border-foreground/40'}`}>
                      {c.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid gap-3">
                {compatibleTreaties.map(t => {
                  const applied = unitTreatyIds.includes(t.id);
                  return (
                    <div
                      key={t.id}
                      className={`bg-card border rounded-sm p-4 transition-all border-rarity-${t.rarity} ${applied ? 'bg-primary/5' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        {t.avatar_url && (
                          <div className="w-10 h-10 rounded-sm overflow-hidden flex-shrink-0 bg-muted">
                            <img src={t.avatar_url} alt={t.name} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium text-sm text-foreground">{t.name}</span>
                            <RarityBadge rarity={t.rarity} />
                            {t.categoryId && CATEGORIES.find(c => c.id === t.categoryId) && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-sm border border-border text-muted-foreground">
                                {CATEGORIES.find(c => c.id === t.categoryId)!.name}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{t.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(t.statModifiers || {}).map(([stat, val]) => {
                              const label = resolveStatLabel(stat, specialStats);
                              if (!label) return null;
                              const v = val as number;
                              return (
                                <span key={stat} className={`font-mono-data text-[10px] px-1.5 py-0.5 rounded-sm ${v > 0 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                                  {label}: {formatModValue(v, false)}
                                </span>
                              );
                            })}
                            {Object.entries(t.statModifiersEx || {}).map(([stat, entry]) => {
                              const label = resolveStatLabel(stat, specialStats);
                              if (!label) return null;
                              return (
                                <span key={`ex-${stat}`} className={`font-mono-data text-[10px] px-1.5 py-0.5 rounded-sm ${entry.value > 0 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                                  {label}: {formatModValue(entry.value, true)}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        <button
                          onClick={() => applied ? onRemove(unit.id, t.id) : onApply(unit.id, t.id)}
                          className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-sm border transition-all flex items-center gap-1.5 ${
                            applied
                              ? 'border-red-500/40 text-red-400 hover:bg-red-900/20'
                              : 'border-primary/40 text-primary hover:bg-primary/10'
                          }`}
                        >
                          <Icon name={applied ? 'X' : 'Plus'} size={12} />
                          {applied ? 'Снять' : 'Применить'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}