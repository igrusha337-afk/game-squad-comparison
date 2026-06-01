import { useUnits, useTreaties, useFormations } from '@/hooks/useAppData';
import { UnitStats } from '@/data/types';
import Icon from '@/components/ui/icon';
import { getAbilityObj } from '@/components/unit/UnitTags';
import UnitHeader from '@/components/unit/UnitHeader';
import UnitStatsPanel from '@/components/unit/UnitStatsPanel';
import UnitSidebar from '@/components/unit/UnitSidebar';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

interface UnitDetailPageProps {
  unitId: string;
  appliedTreaties: Record<string, string[]>;
  onBack: () => void;
  onApplyTreaty?: (unitId: string, treatyId: string) => void;
  onRemoveTreaty?: (unitId: string, treatyId: string) => void;
}

export default function UnitDetailPage({ unitId, appliedTreaties, onBack, onApplyTreaty, onRemoveTreaty }: UnitDetailPageProps) {
  const { units } = useUnits();
  const { treaties, categories } = useTreaties();
  const { formations: allFormations } = useFormations();

  const unit = units.find(u => u.id === unitId);

  useDocumentMeta({
    title: unit?.name,
    description: unit ? `${unit.name} — ${unit.description}` : undefined,
    image: unit?.avatar_url,
  });

  if (!unit) return null;

  const myTreatyIds = appliedTreaties[unit.id] || [];
  const myTreaties = treaties.filter(t => myTreatyIds.includes(t.id));

  const unitSubtype = unit.subtype || '';
  const availableTreaties = treaties.filter(t => {
    if (myTreatyIds.includes(t.id)) return false;
    // совместимость по конкретному ID отряда
    if (t.compatibleUnitIds && t.compatibleUnitIds.length > 0) {
      if (t.compatibleUnitIds.includes(unit.id)) return true;
      // список конкретных отрядов задан, но этот отряд не в нём
      // всё равно проверяем класс/подтип — трактат может быть одновременно для классов + отдельных отрядов
    }
    // совместимость по подтипу
    const subtypes = t.compatibleSubtypes;
    if (subtypes && subtypes.length > 0) {
      return unitSubtype ? subtypes.includes(unitSubtype as never) : false;
    }
    // совместимость по классу
    if (t.compatibleClasses && t.compatibleClasses.length > 0) {
      return t.compatibleClasses.includes(unit.class as never);
    }
    // нет ни классов, ни подтипов, ни конкретных отрядов — доступен всем
    if (!t.compatibleUnitIds || t.compatibleUnitIds.length === 0) return true;
    return false;
  });

  const activeAbilities = unit.abilities.filter(ab => {
    const obj = getAbilityObj(ab);
    return (obj?.statModifiers != null && Object.keys(obj.statModifiers).length > 0) ||
           (obj?.statModifiersEx != null && Object.keys(obj.statModifiersEx).length > 0);
  });

  const unitFormations = allFormations.filter(f => (unit.formations || []).includes(f.id));

  const myTreatiesForStats = myTreaties.map(t => ({
    id: t.id,
    statModifiers: t.statModifiers as Partial<Record<keyof UnitStats, number>>,
    statModifiersEx: t.statModifiersEx as Partial<Record<keyof UnitStats, { type: string; value: number }>>,
  }));

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <Icon name="ChevronLeft" size={16} />
        Назад к каталогу
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <UnitHeader unit={unit} unitFormations={unitFormations} />
          <UnitStatsPanel unit={unit} myTreaties={myTreatiesForStats} />
        </div>

        <UnitSidebar
          unit={unit}
          myTreaties={myTreaties}
          availableTreaties={availableTreaties}
          activeAbilities={activeAbilities}
          onApplyTreaty={onApplyTreaty}
          onRemoveTreaty={onRemoveTreaty}
          categories={categories}
        />
      </div>
    </div>
  );
}