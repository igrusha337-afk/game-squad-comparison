import { useState } from 'react';
import { Unit, UnitStats, UnitSubtype } from '@/data/types';
import { Treaty } from '@/data/types';
import RarityBadge from '@/components/RarityBadge';
import Icon from '@/components/ui/icon';
import { STAT_LABEL_MAP, getAbilityObj } from './UnitTags';

interface UnitSidebarProps {
  unit: Unit;
  myTreaties: Treaty[];
  availableTreaties: Treaty[];
  activeAbilities: (string | import('@/data/types').Ability)[];
  onApplyTreaty?: (unitId: string, treatyId: string) => void;
  onRemoveTreaty?: (unitId: string, treatyId: string) => void;
}

export default function UnitSidebar({
  unit,
  myTreaties,
  availableTreaties,
  activeAbilities,
  onApplyTreaty,
  onRemoveTreaty,
}: UnitSidebarProps) {
  const [showAvailable, setShowAvailable] = useState(false);

  const unitSubtype: UnitSubtype | null = (unit.subtype as UnitSubtype) || null;

  const isTreatyCompatible = (t: Treaty) => {
    const subtypes = t.compatibleSubtypes;
    if (subtypes && subtypes.length > 0) {
      return unitSubtype ? subtypes.includes(unitSubtype) : false;
    }
    if (t.compatibleClasses && t.compatibleClasses.length > 0) {
      return t.compatibleClasses.includes(unit.class);
    }
    return true;
  };

  const filteredAvailable = availableTreaties.filter(isTreatyCompatible);

  return (
    <div className="space-y-4">
      {/* Экономика */}
      <div className="bg-card border border-border rounded-sm p-5">
        <h2 className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-widest">Экономика</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Icon name="Users" size={12} /> Численность</span>
            <span className="font-mono-data text-sm text-foreground">{unit.stats.troops}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Icon name="Crown" size={12} /> Лидерство</span>
            <span className="font-mono-data text-sm text-foreground">{unit.stats.leadership}</span>
          </div>
        </div>
      </div>

      {/* Трактаты */}
      <div className="bg-card border border-border rounded-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Трактаты</h2>
          {onApplyTreaty && filteredAvailable.length > 0 && (
            <button
              onClick={() => setShowAvailable(v => !v)}
              className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest transition-colors px-2 py-1 rounded-sm"
              style={{
                color: showAvailable ? 'hsl(42 76% 68%)' : 'hsl(222 8% 55%)',
                background: showAvailable ? 'hsl(42 76% 50% / 0.12)' : 'hsl(222 14% 14%)',
                border: showAvailable ? '1px solid hsl(42 76% 50% / 0.35)' : '1px solid hsl(222 14% 20%)',
              }}
            >
              <Icon name={showAvailable ? 'ChevronUp' : 'Plus'} size={10} />
              {showAvailable ? 'Свернуть' : 'Добавить'}
            </button>
          )}
        </div>

        {/* Применённые трактаты */}
        {myTreaties.length === 0 && !showAvailable ? (
          <p className="text-xs text-muted-foreground">Трактаты не применены</p>
        ) : (
          <div className="space-y-2">
            {myTreaties.map(t => (
              <div key={t.id} className={`border border-rarity-${t.rarity} rounded-sm p-3`}>
                <div className="flex items-center gap-2 mb-2">
                  {t.avatar_url && (
                    <div className="w-7 h-7 rounded-sm overflow-hidden flex-shrink-0 bg-muted">
                      <img src={t.avatar_url} alt={t.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <span className="text-xs font-medium text-foreground flex-1">{t.name}</span>
                  <RarityBadge rarity={t.rarity} />
                  {onRemoveTreaty && (
                    <button
                      onClick={() => onRemoveTreaty(unit.id, t.id)}
                      className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-sm transition-colors"
                      style={{ color: 'hsl(355 72% 60%)', background: 'hsl(355 72% 20% / 0.2)', border: '1px solid hsl(355 72% 40% / 0.3)' }}
                      title="Снять трактат"
                    >
                      <Icon name="X" size={10} />
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(t.statModifiers || {}).map(([stat, val]) => (
                    <span key={stat} className={`font-mono-data text-[10px] px-1.5 py-0.5 rounded-sm ${(val || 0) > 0 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                      {STAT_LABEL_MAP[stat as keyof UnitStats] ?? stat}: {(val || 0) > 0 ? '+' : ''}{val}
                    </span>
                  ))}
                  {Object.entries(t.statModifiersEx || {}).map(([stat, entry]) => (
                    <span key={`ex-${stat}`} className={`font-mono-data text-[10px] px-1.5 py-0.5 rounded-sm ${entry.value > 0 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                      {STAT_LABEL_MAP[stat as keyof UnitStats] ?? stat}: {entry.value > 0 ? '+' : ''}{entry.value}%
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Доступные трактаты */}
        {showAvailable && filteredAvailable.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 border-t border-border pt-3">
              Доступные{unitSubtype && <span className="ml-1 opacity-60">· {unitSubtype}</span>}
            </div>
            {filteredAvailable.map(t => (
              <div key={t.id} className="border border-border rounded-sm p-3 opacity-80 hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-2 mb-1.5">
                  {t.avatar_url && (
                    <div className="w-7 h-7 rounded-sm overflow-hidden flex-shrink-0 bg-muted">
                      <img src={t.avatar_url} alt={t.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <span className="text-xs font-medium text-foreground flex-1">{t.name}</span>
                  <RarityBadge rarity={t.rarity} />
                  {onApplyTreaty && (
                    <button
                      onClick={() => onApplyTreaty(unit.id, t.id)}
                      className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-sm transition-colors"
                      style={{ color: 'hsl(150 48% 60%)', background: 'hsl(150 48% 20% / 0.2)', border: '1px solid hsl(150 48% 40% / 0.3)' }}
                      title="Применить трактат"
                    >
                      <Icon name="Plus" size={10} />
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(t.statModifiers || {}).map(([stat, val]) => (
                    <span key={stat} className={`font-mono-data text-[10px] px-1.5 py-0.5 rounded-sm ${(val || 0) > 0 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                      {STAT_LABEL_MAP[stat as keyof UnitStats] ?? stat}: {(val || 0) > 0 ? '+' : ''}{val}
                    </span>
                  ))}
                  {Object.entries(t.statModifiersEx || {}).map(([stat, entry]) => (
                    <span key={`ex-${stat}`} className={`font-mono-data text-[10px] px-1.5 py-0.5 rounded-sm ${entry.value > 0 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                      {STAT_LABEL_MAP[stat as keyof UnitStats] ?? stat}: {entry.value > 0 ? '+' : ''}{entry.value}%
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Бонусы умений */}
      {activeAbilities.length > 0 && (
        <div className="bg-card border border-blue-500/20 rounded-sm p-5">
          <h2 className="text-xs font-semibold text-blue-400 mb-4 uppercase tracking-widest flex items-center gap-1.5">
            <Icon name="Zap" size={12} /> Бонусы умений
          </h2>
          <div className="space-y-3">
            {activeAbilities.map((ab, i) => {
              const obj = getAbilityObj(ab)!;
              return (
                <div key={i} className="border border-blue-500/20 rounded-sm p-3">
                  <div className="text-xs font-medium text-foreground mb-1.5">{obj.name}</div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(obj.statModifiers || {}).map(([stat, val]) => (
                      <span key={stat} className={`font-mono-data text-[10px] px-1.5 py-0.5 rounded-sm ${(val || 0) > 0 ? 'bg-blue-900/30 text-blue-400' : 'bg-orange-900/30 text-orange-400'}`}>
                        {STAT_LABEL_MAP[stat as keyof UnitStats] ?? stat}: {(val || 0) > 0 ? '+' : ''}{val}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}