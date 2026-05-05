import { Unit, Formation } from '@/data/types';
import { UnitRole } from '@/data/types';
import StarRating from '@/components/StarRating';
import RarityBadge from '@/components/RarityBadge';
import Icon from '@/components/ui/icon';
import RoleTooltip from '@/components/RoleTooltip';
import { CLASS_ICONS, TraitTag, FormationTag } from './UnitTags';

function getRoles(role: UnitRole | UnitRole[]): UnitRole[] {
  return Array.isArray(role) ? role : [role];
}

interface UnitHeaderProps {
  unit: Unit;
  unitFormations: Formation[];
}

export default function UnitHeader({ unit, unitFormations }: UnitHeaderProps) {
  const roles = getRoles(unit.role);
  const traits = unit.traits || [];

  return (
    <>
      {/* Header */}
      <div className={`bg-card border border-rarity-${unit.rarity} rounded-sm p-6`}>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-sm bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
            {unit.avatar_url ? (
              <img src={unit.avatar_url} alt={unit.name} className="w-full h-full object-cover" />
            ) : (
              <Icon name={CLASS_ICONS[unit.class] || 'Shield'} size={28} className="text-primary" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold text-foreground">{unit.name}</h1>
              {(unit.stars ?? 0) > 0 && <StarRating value={unit.stars ?? 0} size={16} />}
            </div>
            <div className="flex items-center flex-wrap gap-2 mt-1">
              <span className="text-sm text-muted-foreground">{unit.class}</span>
              <span className="text-muted-foreground">·</span>
              <span className="flex items-center gap-1 flex-wrap">
                {roles.map((role, i) => (
                  <RoleTooltip key={role} role={role} showDot={i > 0} size="md" />
                ))}
              </span>
              <span className="text-muted-foreground">·</span>
              <RarityBadge rarity={unit.rarity} size="md" />
            </div>
          </div>
        </div>
        <p className="text-sm text-foreground leading-relaxed mb-3">{unit.description}</p>
        {unit.lore && (
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Хроника</div>
            <p className="text-xs text-muted-foreground italic leading-relaxed border-l-2 border-primary/30 pl-3">{unit.lore}</p>
          </div>
        )}
      </div>

      {/* Особенности */}
      {traits.length > 0 && (
        <div className="bg-card border border-border rounded-sm p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2 uppercase tracking-widest">
            <Icon name="Star" size={14} className="text-primary" />
            Особенности
          </h2>
          <div className="flex flex-wrap gap-2">
            {traits.map((tr, i) => <TraitTag key={i} trait={tr} />)}
          </div>
        </div>
      )}

      {/* Построения */}
      {unitFormations.length > 0 && (
        <div className="bg-card border border-border rounded-sm p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2 uppercase tracking-widest">
            <Icon name="Shield" size={14} className="text-primary" />
            Построения
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {unitFormations.map(f => <FormationTag key={f.id} formation={f} />)}
          </div>
        </div>
      )}
    </>
  );
}
