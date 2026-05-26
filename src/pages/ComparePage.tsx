import { useState } from 'react';
import { useUnits, useTreaties } from '@/hooks/useAppData';
import { STAT_GROUPS, ALL_STATS } from '@/data/statGroups';
import { Unit, UnitStats, Ability } from '@/data/types';
import RarityBadge from '@/components/RarityBadge';
import StarRating from '@/components/StarRating';
import Icon from '@/components/ui/icon';

interface ComparePageProps {
  appliedTreaties: Record<string, string[]>;
  onApply: (unitId: string, treatyId: string) => void;
  onRemove: (unitId: string, treatyId: string) => void;
}

function getAbilityBonus(unit: Unit, key: keyof UnitStats): number {
  const base = unit.stats[key];
  return unit.abilities.reduce((acc, ab) => {
    if (typeof ab === 'string') return acc;
    const a = ab as Ability;
    const ex = a.statModifiersEx?.[key];
    if (ex) return acc + (ex.type === 'percent' ? Math.round(base * ex.value / 100) : ex.value);
    return acc + (a.statModifiers?.[key] || 0);
  }, 0);
}

export default function ComparePage({ appliedTreaties, onApply, onRemove }: ComparePageProps) {
  const { units: UNITS, loading: unitsLoading } = useUnits();
  const { treaties: TREATIES, categories: CATEGORIES } = useTreaties();
  const [selected, setSelected] = useState<string[]>([]);
  const [picker, setPicker] = useState(false);
  const [treatyPanelUnit, setTreatyPanelUnit] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState(0);
  const [filterCategoryId, setFilterCategoryId] = useState<number | null>(null);

  const selectedUnits = UNITS.filter(u => selected.includes(u.id));

  const getTreatyBonus = (unit: Unit, key: keyof UnitStats) => {
    const ids = appliedTreaties[unit.id] || [];
    const base = unit.stats[key];
    return TREATIES.filter(t => ids.includes(t.id))
      .reduce((acc, t) => {
        const ex = t.statModifiersEx?.[key];
        if (ex) {
          return acc + (ex.type === 'percent' ? Math.round(base * ex.value / 100) : ex.value);
        }
        return acc + (t.statModifiers[key] || 0);
      }, 0);
  };

  const getTotal = (unit: Unit, key: keyof UnitStats) =>
    unit.stats[key] + getTreatyBonus(unit, key) + getAbilityBonus(unit, key);

  const getBest = (key: keyof UnitStats) => {
    if (selectedUnits.length < 2) return null;
    return Math.max(...selectedUnits.map(u => getTotal(u, key)));
  };

  const toggleUnit = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
    if (treatyPanelUnit === id) setTreatyPanelUnit(null);
  };

  const treatyPanelUnitObj = treatyPanelUnit ? UNITS.find(u => u.id === treatyPanelUnit) : null;

  const compatibleTreaties = treatyPanelUnitObj
    ? TREATIES.filter(t => {
        const unitSubtype = treatyPanelUnitObj.subtype || '';
        const subtypes = t.compatibleSubtypes;
        if (subtypes && subtypes.length > 0) {
          if (!unitSubtype || !subtypes.includes(unitSubtype as never)) return false;
        } else if (t.compatibleClasses.length > 0 && !t.compatibleClasses.includes(treatyPanelUnitObj.class)) {
          return false;
        }
        return true;
      })
    : [];

  const filteredTreaties = filterCategoryId !== null
    ? compatibleTreaties.filter(t => t.categoryId === filterCategoryId)
    : compatibleTreaties;

  const activeTreatyIds = treatyPanelUnit ? (appliedTreaties[treatyPanelUnit] || []) : [];
  const categoryName = (categoryId?: number | null) =>
    categoryId ? CATEGORIES.find(c => c.id === categoryId)?.name : undefined;

  const currentGroupStats = STAT_GROUPS[activeGroup].stats;

  if (unitsLoading) return (
    <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
      <Icon name="Loader" size={18} className="animate-spin mr-2" /> Загрузка...
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-foreground mb-1">Сравнение Отрядов</h1>
        <p className="text-muted-foreground text-sm">Выберите до 4 отрядов · Применяйте трактаты прямо здесь</p>
      </div>

      {/* Selector */}
      <div className="bg-card border border-border rounded-sm p-4 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          {selected.map(id => {
            const u = UNITS.find(x => x.id === id)!;
            const count = (appliedTreaties[id] || []).length;
            return (
              <div key={id} className={`flex items-center gap-2 bg-muted border border-rarity-${u.rarity} rounded-sm px-3 py-2`}>
                {u.avatar_url && (
                  <div className="w-5 h-5 rounded-sm overflow-hidden flex-shrink-0">
                    <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <span className="text-sm text-foreground">{u.name}</span>
                {(u.stars ?? 0) > 0 && <StarRating value={u.stars ?? 0} size={9} />}
                {count > 0 && (
                  <span className="text-[10px] font-mono-data bg-primary/20 text-primary rounded-sm px-1 py-0.5">+{count}</span>
                )}
                <button onClick={() => toggleUnit(id)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <Icon name="X" size={14} />
                </button>
              </div>
            );
          })}
          {selected.length < 4 && (
            <button
              onClick={() => setPicker(!picker)}
              className="flex items-center gap-2 bg-muted border border-dashed border-border rounded-sm px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
            >
              <Icon name="Plus" size={14} />
              Добавить отряд
            </button>
          )}
          {selected.length > 0 && (
            <button onClick={() => { setSelected([]); setTreatyPanelUnit(null); }} className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              <Icon name="Trash2" size={12} />
              Очистить
            </button>
          )}
        </div>

        {picker && (
          <div className="mt-3 border-t border-border pt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto scrollbar-thin">
            {UNITS.map(u => (
              <button
                key={u.id}
                onClick={() => { toggleUnit(u.id); if (selected.length + 1 >= 4) setPicker(false); }}
                disabled={selected.length >= 4 && !selected.includes(u.id)}
                className={`text-left px-3 py-2 rounded-sm border text-xs transition-all ${
                  selected.includes(u.id)
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-muted text-muted-foreground hover:border-primary/40 hover:text-foreground'
                } disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  {u.avatar_url && (
                    <div className="w-4 h-4 rounded-sm overflow-hidden flex-shrink-0">
                      <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <span className="font-medium truncate">{u.name}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] opacity-70">
                  <span>{u.class}</span>
                  {(u.stars ?? 0) > 0 && <StarRating value={u.stars ?? 0} size={8} />}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedUnits.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Icon name="GitCompare" size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Выберите отряды для сравнения</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-sm overflow-hidden">
            {/* Stat group tabs */}
            <div className="flex border-b border-border bg-muted/30">
              {STAT_GROUPS.map((g, idx) => (
                <button
                  key={g.label}
                  onClick={() => setActiveGroup(idx)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all border-b-2 -mb-px ${
                    activeGroup === idx
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon name={g.icon} size={12} className={activeGroup === idx ? g.color : ''} />
                  {g.label}
                </button>
              ))}
            </div>

            {/* Unit headers */}
            <div className="grid border-b border-border" style={{ gridTemplateColumns: `200px repeat(${selectedUnits.length}, 1fr)` }}>
              <div className="p-4 bg-muted/30" />
              {selectedUnits.map(u => {
                const treatyCount = (appliedTreaties[u.id] || []).length;
                const abilityCount = u.abilities.filter(ab => typeof ab !== 'string' && !!(ab as Ability).statModifiers && Object.keys((ab as Ability).statModifiers!).length > 0).length;
                const isActive = treatyPanelUnit === u.id;
                const roles = Array.isArray(u.role) ? u.role : [u.role];
                return (
                  <div key={u.id} className={`p-4 border-l border-border ${isActive ? 'bg-primary/5' : ''}`}>
                    {/* Аватар + название */}
                    <div className="flex items-center gap-2 mb-2">
                      {u.avatar_url ? (
                        <div className="w-10 h-10 rounded-sm overflow-hidden flex-shrink-0 bg-muted">
                          <img src={u.avatar_url} alt={u.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-sm bg-muted flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <RarityBadge rarity={u.rarity} />
                        <div className="font-semibold text-sm text-foreground leading-tight truncate">{u.name}</div>
                        {(u.stars ?? 0) > 0 && <StarRating value={u.stars ?? 0} size={10} className="mt-0.5" />}
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground mb-2">{u.class} · {roles.join(', ')}</div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => setTreatyPanelUnit(isActive ? null : u.id)}
                        className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-sm border transition-all ${
                          isActive
                            ? 'border-primary text-primary bg-primary/10'
                            : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                        }`}
                      >
                        <Icon name="ScrollText" size={10} />
                        Трактаты {treatyCount > 0 && <span className="font-mono-data">({treatyCount})</span>}
                      </button>
                      {abilityCount > 0 && (
                        <span className="flex items-center gap-1 text-[10px] text-blue-400 font-mono-data">
                          <Icon name="Zap" size={10} /> {abilityCount}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Легенда формата */}
            <div className="px-4 py-2 border-b border-border bg-muted/10 flex items-center gap-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-foreground/40 inline-block" /> базовые характеристики</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> +трактаты</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> +умения</span>
            </div>

            {/* Stat rows */}
            {currentGroupStats.map(({ key, label, max, unit: unitLabel }, idx) => {
              const best = getBest(key);
              return (
                <div
                  key={key}
                  className={`grid border-b border-border ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}
                  style={{ gridTemplateColumns: `200px repeat(${selectedUnits.length}, 1fr)` }}
                >
                  <div className="p-3 flex items-center border-r border-border">
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                  {selectedUnits.map(u => {
                    const base = u.stats[key];
                    const treatyBonus = getTreatyBonus(u, key);
                    const abilityBonus = getAbilityBonus(u, key);
                    const withTreaties = base + treatyBonus;
                    const withAbilities = base + abilityBonus;
                    const total = base + treatyBonus + abilityBonus;
                    const isBest = best !== null && total === best;
                    const pct = Math.min((total / max) * 100, 100);
                    const basePct = Math.min((base / max) * 100, 100);

                    return (
                      <div key={u.id} className={`p-3 border-l border-border ${isBest ? 'bg-primary/5' : ''}`}>
                        {/* Основное значение */}
                        <div className={`font-mono-data text-base font-semibold mb-1 ${isBest ? 'text-primary' : 'text-foreground'}`}>
                          {total}{unitLabel ? ` ${unitLabel}` : ''}
                          {isBest && selectedUnits.length > 1 && <span className="text-xs ml-1 opacity-60">▲</span>}
                        </div>

                        {/* Разбивка: база / с трактатами / с умениями */}
                        <div className="flex items-center gap-1 text-[10px] font-mono-data mb-1.5 flex-wrap">
                          <span className="text-muted-foreground">{base}</span>
                          {treatyBonus !== 0 && (
                            <>
                              <span className="text-muted-foreground/40">/</span>
                              <span className={treatyBonus > 0 ? 'text-green-400' : 'text-red-400'}>
                                {withTreaties}
                              </span>
                            </>
                          )}
                          {abilityBonus !== 0 && (
                            <>
                              <span className="text-muted-foreground/40">/</span>
                              <span className={abilityBonus > 0 ? 'text-blue-400' : 'text-orange-400'}>
                                {withAbilities}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Полоска */}
                        <div className="h-1 bg-border rounded-full overflow-hidden relative">
                          {/* База */}
                          <div
                            className="absolute top-0 left-0 h-full rounded-full bg-muted-foreground/40"
                            style={{ width: `${basePct}%` }}
                          />
                          {/* Трактаты */}
                          {treatyBonus > 0 && (
                            <div
                              className="absolute top-0 left-0 h-full rounded-full bg-green-500/50"
                              style={{ width: `${Math.min((withTreaties / max) * 100, 100)}%` }}
                            />
                          )}
                          {/* Умения */}
                          {abilityBonus > 0 && (
                            <div
                              className="absolute top-0 left-0 h-full rounded-full bg-blue-500/60"
                              style={{ width: `${pct}%` }}
                            />
                          )}
                          {/* Итог без бонусов */}
                          {treatyBonus === 0 && abilityBonus === 0 && (
                            <div
                              className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${pct}%`,
                                background: isBest ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'
                              }}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Treaty panel */}
          {treatyPanelUnit && treatyPanelUnitObj && (
            <div className="bg-card border border-primary/20 rounded-sm p-5 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Icon name="ScrollText" size={14} className="text-primary" />
                  Трактаты для «{treatyPanelUnitObj.name}»
                  <span className="text-xs text-muted-foreground font-normal">({treatyPanelUnitObj.class})</span>
                </h3>
                <button onClick={() => setTreatyPanelUnit(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <Icon name="X" size={14} />
                </button>
              </div>

              {CATEGORIES.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  <button
                    onClick={() => setFilterCategoryId(null)}
                    className={`px-2.5 py-1 text-[10px] rounded-sm border transition-colors ${filterCategoryId === null ? 'bg-primary/10 border-primary text-primary' : 'border-border text-muted-foreground hover:border-foreground/40'}`}>
                    Все
                  </button>
                  {CATEGORIES.map(c => (
                    <button key={c.id}
                      onClick={() => setFilterCategoryId(filterCategoryId === c.id ? null : c.id)}
                      className={`px-2.5 py-1 text-[10px] rounded-sm border transition-colors ${filterCategoryId === c.id ? 'bg-primary/10 border-primary text-primary' : 'border-border text-muted-foreground hover:border-foreground/40'}`}>
                      {c.name}
                    </button>
                  ))}
                </div>
              )}

              {compatibleTreaties.length === 0 ? (
                <p className="text-xs text-muted-foreground">Нет совместимых трактатов</p>
              ) : filteredTreaties.length === 0 ? (
                <p className="text-xs text-muted-foreground">Нет трактатов в этой категории</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredTreaties.map(t => {
                    const applied = activeTreatyIds.includes(t.id);
                    return (
                      <div
                        key={t.id}
                        className={`border rounded-sm p-3 transition-all border-rarity-${t.rarity} ${applied ? 'bg-primary/5' : 'bg-muted/20'}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {t.avatar_url && (
                              <div className="w-8 h-8 rounded-sm overflow-hidden flex-shrink-0 bg-muted">
                                <img src={t.avatar_url} alt={t.name} className="w-full h-full object-cover" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-foreground leading-tight mb-0.5 truncate">{t.name}</div>
                              <div className="flex items-center gap-1.5">
                                <RarityBadge rarity={t.rarity} />
                                {categoryName(t.categoryId) && (
                                  <span className="text-[10px] text-muted-foreground">{categoryName(t.categoryId)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => applied ? onRemove(treatyPanelUnit, t.id) : onApply(treatyPanelUnit, t.id)}
                            className={`flex-shrink-0 text-[10px] px-2 py-1 rounded-sm border transition-all flex items-center gap-1 ${
                              applied
                                ? 'border-red-500/40 text-red-400 hover:bg-red-900/20'
                                : 'border-primary/40 text-primary hover:bg-primary/10'
                            }`}
                          >
                            <Icon name={applied ? 'Minus' : 'Plus'} size={10} />
                            {applied ? 'Снять' : 'Взять'}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(t.statModifiers).map(([stat, val]) => {
                            const statDef = ALL_STATS.find(s => s.key === stat);
                            const shortLabel = statDef
                              ? statDef.label.length > 15 ? statDef.label.slice(0, 14) + '…' : statDef.label
                              : stat;
                            return (
                              <span
                                key={stat}
                                className={`font-mono-data text-[10px] px-1.5 py-0.5 rounded-sm ${(val || 0) > 0 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}
                              >
                                {shortLabel}: {(val || 0) > 0 ? '+' : ''}{val}
                              </span>
                            );
                          })}
                          {t.statModifiersEx && Object.entries(t.statModifiersEx).map(([stat, ex]) => {
                            const statDef = ALL_STATS.find(s => s.key === stat);
                            const shortLabel = statDef
                              ? statDef.label.length > 15 ? statDef.label.slice(0, 14) + '…' : statDef.label
                              : stat;
                            const val = ex.value;
                            const display = ex.type === 'percent' ? `${val > 0 ? '+' : ''}${val}%` : `${val > 0 ? '+' : ''}${val}`;
                            return (
                              <span
                                key={`ex-${stat}`}
                                className={`font-mono-data text-[10px] px-1.5 py-0.5 rounded-sm ${val > 0 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}
                              >
                                {shortLabel}: {display}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}