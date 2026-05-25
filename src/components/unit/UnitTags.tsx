import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UnitStats, Ability, Trait, Formation } from '@/data/types';
import Icon from '@/components/ui/icon';

export const CLASS_ICONS: Record<string, string> = {
  'Пехота': 'Sword', 'Кавалерия': 'Zap', 'Стрелки': 'Crosshair', 'Осадные': 'Hammer',
};

export const STAT_LABEL_MAP: Partial<Record<keyof UnitStats, string>> = {
  health: 'Здоровье', troops: 'Численность', leadership: 'Лидерство',
  moveSpeed: 'Скорость', rangeDistance: 'Дальность', ammo: 'Боезапас', morale: 'Работосп.',
  piercingPenetration: 'Проб. (прон.)', slashingPenetration: 'Проб. (руб.)', bluntPenetration: 'Проб. (дроб.)',
  piercingDamage: 'Прон. урон', slashingDamage: 'Руб. урон', bluntDamage: 'Дроб. урон',
  piercingDefense: 'Защ. (прон.)', slashingDefense: 'Защ. (руб.)', bluntDefense: 'Защ. (дроб.)',
  block: 'Блок', blockRecovery: 'Восст. блока',
};

export function getAbilityObj(ab: string | Ability): Ability | null {
  if (typeof ab === 'string') return null;
  return ab;
}

export function getAbilityName(ab: string | Ability): string {
  return typeof ab === 'string' ? ab : ab.name;
}

// ── Тултип умения ──
function AbilityTooltip({ ability, anchorRef }: { ability: Ability; anchorRef: React.RefObject<HTMLSpanElement> }) {
  const hasModifiers =
    (ability.statModifiers != null && Object.keys(ability.statModifiers).length > 0) ||
    (ability.statModifiersEx != null && Object.keys(ability.statModifiersEx).length > 0);

  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const anchor = anchorRef.current;
    const tooltip = tooltipRef.current;
    if (!anchor || !tooltip) return;
    const rect = anchor.getBoundingClientRect();
    const tw = tooltip.offsetWidth;
    const th = tooltip.offsetHeight;
    const margin = 8;

    let left = rect.left + rect.width / 2 - tw / 2;
    let top = rect.top - th - margin;

    if (left < margin) left = margin;
    if (left + tw > window.innerWidth - margin) left = window.innerWidth - tw - margin;
    if (top < margin) top = rect.bottom + margin;

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }, [anchorRef]);

  return createPortal(
    <div
      ref={tooltipRef}
      style={{ position: 'fixed', zIndex: 9999, width: '224px' }}
      className="bg-card border border-border rounded-sm p-3 shadow-xl pointer-events-none"
    >
      <div className="text-xs font-semibold text-foreground mb-1">{ability.name}</div>
      {ability.description && (
        <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">{ability.description}</p>
      )}
      {hasModifiers && (
        <div className="flex flex-wrap gap-1 border-t border-border pt-2">
          {Object.entries(ability.statModifiers || {}).map(([stat, val]) => (
            <span key={stat} className={`font-mono-data text-[10px] px-1.5 py-0.5 rounded-sm ${(val || 0) > 0 ? 'bg-blue-900/30 text-blue-400' : 'bg-orange-900/30 text-orange-400'}`}>
              {STAT_LABEL_MAP[stat as keyof UnitStats] ?? stat}: {(val || 0) > 0 ? '+' : ''}{val}
            </span>
          ))}
          {Object.entries(ability.statModifiersEx || {}).map(([stat, entry]) => (
            <span key={`ex-${stat}`} className={`font-mono-data text-[10px] px-1.5 py-0.5 rounded-sm ${entry.value > 0 ? 'bg-blue-900/30 text-blue-400' : 'bg-orange-900/30 text-orange-400'}`}>
              {STAT_LABEL_MAP[stat as keyof UnitStats] ?? stat}: {entry.value > 0 ? '+' : ''}{entry.value}%
            </span>
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}

export function AbilityTag({ ab }: { ab: string | Ability }) {
  const [show, setShow] = useState(false);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const obj = getAbilityObj(ab);
  const name = getAbilityName(ab);
  const hasModifiers = obj && (
    (obj.statModifiers != null && Object.keys(obj.statModifiers).length > 0) ||
    (obj.statModifiersEx != null && Object.keys(obj.statModifiersEx).length > 0)
  );
  const hasInfo = obj && (obj.description || hasModifiers);

  return (
    <div className="relative inline-block">
      <span
        ref={anchorRef}
        onMouseEnter={() => hasInfo && setShow(true)}
        onMouseLeave={() => setShow(false)}
        className={`inline-flex items-center gap-1.5 border rounded-sm px-3 py-1.5 text-xs transition-colors select-none
          ${hasModifiers ? 'bg-blue-950/40 border-blue-500/40 text-blue-300 cursor-help'
            : hasInfo ? 'bg-muted border-border text-foreground cursor-help'
            : 'bg-muted border-border text-foreground'}`}
      >
        {hasModifiers && <Icon name="Zap" size={10} className="text-blue-400" />}
        {name}
        {hasInfo && <Icon name="Info" size={10} className="text-muted-foreground opacity-60" />}
      </span>
      {show && hasInfo && obj && <AbilityTooltip ability={obj} anchorRef={anchorRef} />}
    </div>
  );
}

// ── Тултип особенности (trait) ──
const TRAIT_STYLES: Record<string, string> = {
  green: 'bg-green-950/40 border-green-600/40 text-green-300',
  gray:  'bg-muted border-border text-muted-foreground',
  red:   'bg-red-950/40 border-red-600/40 text-red-300',
};

function TraitTooltip({ trait }: { trait: Trait }) {
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-52 bg-card border border-border rounded-sm p-3 shadow-xl pointer-events-none">
      <div className="text-xs font-semibold text-foreground mb-1">{trait.name}</div>
      {trait.description && (
        <p className="text-[11px] text-muted-foreground leading-relaxed">{trait.description}</p>
      )}
      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-border" />
    </div>
  );
}

export function TraitTag({ trait }: { trait: Trait }) {
  const [show, setShow] = useState(false);
  const color = trait.color || 'gray';
  const hasDesc = !!trait.description;

  return (
    <div className="relative inline-block">
      <span
        onMouseEnter={() => hasDesc && setShow(true)}
        onMouseLeave={() => setShow(false)}
        className={`inline-flex items-center gap-1.5 border rounded-sm px-3 py-1.5 text-xs font-medium transition-colors select-none ${TRAIT_STYLES[color]} ${hasDesc ? 'cursor-help' : ''}`}
      >
        {color === 'green' && <Icon name="TrendingUp" size={10} />}
        {color === 'red' && <Icon name="TrendingDown" size={10} />}
        {trait.name}
        {hasDesc && <Icon name="Info" size={10} className="opacity-50" />}
      </span>
      {show && hasDesc && <TraitTooltip trait={trait} />}
    </div>
  );
}

// ── Тег построения с тултипом (портал) ──
export function FormationTag({ formation }: { formation: Formation }) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
  }, [visible]);

  return (
    <>
      <div
        ref={ref}
        onMouseEnter={() => formation.description && setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        className="flex items-center gap-2 px-3 py-2 rounded-sm border border-border bg-muted/40 cursor-help transition-colors hover:border-primary/40"
      >
        {formation.avatar_url && (
          <img src={formation.avatar_url} alt={formation.name}
            className="w-8 h-8 rounded-sm object-cover flex-shrink-0 border border-border" />
        )}
        <div>
          <div className="text-xs font-semibold text-foreground" style={{ fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.04em' }}>
            {formation.name}
          </div>
          {formation.description && (
            <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <Icon name="Info" size={9} className="opacity-60" />
              <span>Наведи для описания</span>
            </div>
          )}
        </div>
      </div>
      {visible && formation.description && createPortal(
        <div style={{
          position: 'fixed', left: pos.x, top: pos.y,
          transform: 'translate(-50%, -100%)',
          zIndex: 9999, width: '240px', padding: '10px 14px',
          background: 'hsl(224 20% 9%)',
          border: '1px solid hsl(42 90% 52% / 0.35)',
          borderRadius: '3px',
          boxShadow: '0 12px 32px hsl(0 0% 0% / 0.6)',
          pointerEvents: 'none',
        }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.65rem', fontWeight: 600, color: 'hsl(42 90% 52%)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
            {formation.name}
          </div>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '0.8rem', lineHeight: 1.55, color: 'hsl(38 15% 72%)' }}>
            {formation.description}
          </div>
          <div style={{ position: 'absolute', bottom: '-6px', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid hsl(42 90% 52% / 0.35)' }} />
          <div style={{ position: 'absolute', bottom: '-4px', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid hsl(224 20% 9%)' }} />
        </div>,
        document.body
      )}
    </>
  );
}

// ── Секция руководства ──
export function GuideSection({ title, icon, blocks }: { title: string; icon: string; blocks: { type: string; content: string }[] }) {
  if (!blocks || blocks.length === 0) return null;
  return (
    <div className="bg-card border border-border rounded-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
        <Icon name={icon} size={14} className="text-primary" />
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-widest">{title}</h2>
      </div>
      <div className="p-5 space-y-4">
        {blocks.map((block, i) => (
          block.type === 'image' ? (
            <div key={i} className="rounded-sm overflow-hidden border border-border">
              <img src={block.content} alt="" className="w-full object-cover max-h-80" style={{ display: 'block' }} />
            </div>
          ) : (
            <p key={i} className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {block.content}
            </p>
          )
        ))}
      </div>
    </div>
  );
}