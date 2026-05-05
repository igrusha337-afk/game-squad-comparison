import { useState } from 'react';
import { Unit, UnitStats, GuideBlock } from '@/data/types';
import { STAT_GROUPS } from '@/data/statGroups';
import StatBar from '@/components/StatBar';
import Icon from '@/components/ui/icon';
import { AbilityTag, getAbilityObj, GuideSection } from './UnitTags';

interface UnitStatsPanelProps {
  unit: Unit;
  myTreaties: { id: string; statModifiers: Partial<Record<keyof UnitStats, number>>; statModifiersEx?: Partial<Record<keyof UnitStats, { type: string; value: number }>> }[];
}

export default function UnitStatsPanel({ unit, myTreaties }: UnitStatsPanelProps) {
  const [activeGroup, setActiveGroup] = useState(0);

  const getTreatyBonus = (stat: keyof UnitStats) =>
    myTreaties.reduce((acc, t) => {
      const ex = t.statModifiersEx?.[stat];
      if (ex) return acc + (ex.type === 'percent' ? Math.round(unit.stats[stat] * ex.value / 100) : ex.value);
      return acc + (t.statModifiers[stat] || 0);
    }, 0);

  const getAbilityBonus = (stat: keyof UnitStats) =>
    unit.abilities.reduce((acc, ab) => {
      const obj = getAbilityObj(ab);
      if (!obj) return acc;
      const ex = obj.statModifiersEx?.[stat];
      if (ex) return acc + (ex.type === 'percent' ? Math.round(unit.stats[stat] * ex.value / 100) : ex.value);
      return acc + (obj.statModifiers?.[stat] || 0);
    }, 0);

  const statGroup = STAT_GROUPS[activeGroup];

  const activeAbilities = unit.abilities.filter(ab => {
    const obj = getAbilityObj(ab);
    return (obj?.statModifiers != null && Object.keys(obj.statModifiers).length > 0) ||
           (obj?.statModifiersEx != null && Object.keys(obj.statModifiersEx).length > 0);
  });

  return (
    <>
      {/* Stats tabs */}
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <div className="flex border-b border-border">
          {STAT_GROUPS.map((g, idx) => (
            <button key={g.label} onClick={() => setActiveGroup(idx)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium transition-all border-b-2 -mb-px ${activeGroup === idx ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              <Icon name={g.icon} size={13} className={activeGroup === idx ? g.color : ''} />
              {g.label}
            </button>
          ))}
          {(myTreaties.length > 0 || activeAbilities.length > 0) && (
            <div className="ml-auto flex items-center gap-3 px-4">
              {myTreaties.length > 0 && <span className="text-xs text-green-400 font-mono-data">+{myTreaties.length} трактатов</span>}
              {activeAbilities.length > 0 && (
                <span className="text-xs text-blue-400 font-mono-data flex items-center gap-1">
                  <Icon name="Zap" size={10} /> {activeAbilities.length} умений
                </span>
              )}
            </div>
          )}
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {statGroup.stats.map(({ key, label, max, unit: unitLabel }) => (
            <StatBar key={key} label={label} value={unit.stats[key]} max={max}
              bonus={getTreatyBonus(key)} abilityBonus={getAbilityBonus(key)} unitLabel={unitLabel} />
          ))}
        </div>

        {(myTreaties.length > 0 || activeAbilities.length > 0) && (
          <div className="px-5 pb-4 flex flex-wrap gap-3 border-t border-border pt-3">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> бонус трактата</span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> штраф трактата</span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> бонус умения</span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" /> штраф умения</span>
          </div>
        )}
      </div>

      {/* Умения */}
      <div className="bg-card border border-border rounded-sm p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2 uppercase tracking-widest">
          <Icon name="Wand2" size={14} className="text-primary" />
          Умения
        </h2>
        <div className="flex flex-wrap gap-2">
          {unit.abilities.map((ab, i) => <AbilityTag key={i} ab={ab} />)}
        </div>
      </div>

      <GuideSection
        title="Рекомендации по прокачке"
        icon="TrendingUp"
        blocks={(unit.guide_upgrade || []) as GuideBlock[]}
      />

      <GuideSection
        title="Рекомендации по игре"
        icon="Gamepad2"
        blocks={(unit.guide_gameplay || []) as GuideBlock[]}
      />
    </>
  );
}
