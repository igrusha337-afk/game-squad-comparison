import { useState } from 'react';
import { Rarity, UnitClass, UnitRole, UnitSubtype, Ability, Trait, Formation } from '@/data/types';
import { STAT_GROUPS } from '@/data/statGroups';
import { UnitRoleDef, TraitDef, AbilityDef } from '@/hooks/useAppData';
import Icon from '@/components/ui/icon';
import AvatarUpload from '@/components/AvatarUpload';
import { StarPicker } from '@/components/StarRating';
import GuideEditor from '@/components/GuideEditor';
import { GuideBlock } from '@/data/types';
import { UNIT_CLASSES, UNIT_SUBTYPES, RARITIES, RARITY_LABELS, DEFAULT_UNIT_STATS } from './adminConstants';

interface UnitFormData {
  name: string;
  class: UnitClass;
  roles: UnitRole[];
  rarity: Rarity;
  description: string;
  lore: string;
  avatar_url: string;
  stars: number;
  guide_upgrade: GuideBlock[];
  guide_gameplay: GuideBlock[];
  abilities: never[];
  stats: typeof DEFAULT_UNIT_STATS;
  formations: number[];
  subtype: UnitSubtype | '';
}

function getRawRoles(raw: unknown): UnitRole[] {
  if (Array.isArray(raw)) return raw as UnitRole[];
  if (typeof raw === 'string') return [raw as UnitRole];
  return ['Танк'];
}

export function UnitModal({ unit, onSave, onClose, availableRoles, availableFormations, availableTraits, availableAbilities }: {
  unit?: Record<string, unknown> | null;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
  availableRoles: UnitRoleDef[];
  availableFormations: Formation[];
  availableTraits: TraitDef[];
  availableAbilities: AbilityDef[];
}) {
  const editing = !!unit;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const rawAbilities = (unit?.abilities as unknown[]) || [];
  const rawTraits = (unit?.traits as unknown[]) || [];

  const initSelectedTraitIds = (): number[] => {
    if (!rawTraits.length) return [];
    return rawTraits
      .map(rt => {
        const name = typeof rt === 'string' ? rt : (rt as Trait).name;
        const found = availableTraits.find(at => at.name === name);
        return found ? found.id : null;
      })
      .filter((id): id is number => id !== null);
  };

  const initSelectedAbilityIds = (): number[] => {
    if (!editing || !rawAbilities.length) return [];
    return rawAbilities
      .map(ra => {
        const name = typeof ra === 'string' ? ra : (ra as Ability).name;
        const found = availableAbilities.find(a => a.name === name);
        return found ? found.id : null;
      })
      .filter((id): id is number => id !== null);
  };

  const [selectedTraitIds, setSelectedTraitIds] = useState<number[]>(initSelectedTraitIds);
  const [selectedAbilityIds, setSelectedAbilityIds] = useState<number[]>(initSelectedAbilityIds);
  const [traitSearch, setTraitSearch] = useState('');
  const [abilitySearch, setAbilitySearch] = useState('');
  const [form, setForm] = useState<UnitFormData>({
    name: (unit?.name as string) || '',
    class: (unit?.class as UnitClass) || 'Пехота',
    roles: getRawRoles(unit?.role),
    rarity: (unit?.rarity as Rarity) || 'common',
    description: (unit?.description as string) || '',
    lore: (unit?.lore as string) || '',
    avatar_url: (unit?.avatar_url as string) || '',
    stars: typeof unit?.stars === 'number' ? unit.stars as number : 0,
    guide_upgrade: Array.isArray(unit?.guide_upgrade) ? unit.guide_upgrade as GuideBlock[] : [],
    guide_gameplay: Array.isArray(unit?.guide_gameplay) ? unit.guide_gameplay as GuideBlock[] : [],
    abilities: [],
    stats: { ...DEFAULT_UNIT_STATS, ...((unit?.stats as Record<string, number>) || {}) },
    formations: Array.isArray(unit?.formations) ? (unit.formations as number[]) : [],
    subtype: (unit?.subtype as UnitSubtype | '') || '',
  });

  const set = (key: keyof UnitFormData, val: unknown) => setForm(f => ({ ...f, [key]: val }));
  const setStat = (key: string, val: string) => setForm(f => ({ ...f, stats: { ...f.stats, [key]: parseFloat(val) || 0 } }));

  const toggleRole = (r: UnitRole) => setForm(f => ({
    ...f,
    roles: f.roles.includes(r) ? f.roles.filter(x => x !== r) : [...f.roles, r],
  }));

  const toggleFormation = (id: number) => setForm(f => ({
    ...f,
    formations: f.formations.includes(id) ? f.formations.filter(x => x !== id) : [...f.formations, id],
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Поле "название" обязательно'); return; }
    if (form.roles.length === 0) { setError('Выберите хотя бы одну роль'); return; }
    setLoading(true);
    setError('');
    try {
      const abilities = selectedAbilityIds
        .map(id => availableAbilities.find(a => a.id === id))
        .filter(Boolean)
        .map(a => {
          const hasInfo = a!.description || Object.keys(a!.statModifiers || {}).length > 0 || Object.keys(a!.statModifiersEx || {}).length > 0;
          if (!hasInfo) return a!.name;
          return {
            name: a!.name,
            description: a!.description || undefined,
            statModifiers: Object.keys(a!.statModifiers || {}).length > 0 ? a!.statModifiers : undefined,
            statModifiersEx: Object.keys(a!.statModifiersEx || {}).length > 0 ? a!.statModifiersEx : undefined,
          };
        });
      const traits = selectedTraitIds
        .map(id => availableTraits.find(t => t.id === id))
        .filter(Boolean)
        .map(t => ({ name: t!.name, description: t!.description || undefined, color: t!.color }));
      await onSave({
        name: form.name.trim(), class: form.class, role: form.roles,
        rarity: form.rarity, description: form.description, lore: form.lore,
        avatar_url: form.avatar_url, stars: form.stars,
        guide_upgrade: form.guide_upgrade, guide_gameplay: form.guide_gameplay,
        abilities, traits, stats: form.stats, formations: form.formations, subtype: form.subtype,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 overflow-y-auto py-6">
      <div className="bg-card border border-border rounded-sm w-full max-w-2xl shadow-xl mx-4">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-sm font-semibold">{editing ? 'Редактировать отряд' : 'Добавить отряд'}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><Icon name="X" size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-sm bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
              <Icon name="AlertCircle" size={12} /> {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground block mb-1.5">Название *</label>
              <input type="text" value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} placeholder="Железная Стража" required />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Класс</label>
              <select value={form.class} onChange={e => { set('class', e.target.value); set('subtype', ''); }} className={inputCls}>
                {UNIT_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Редкость</label>
              <select value={form.rarity} onChange={e => set('rarity', e.target.value)} className={inputCls}>
                {RARITIES.map(r => <option key={r} value={r}>{RARITY_LABELS[r]}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground block mb-1.5">
                Подтип <span className="opacity-50 font-normal">(служебный, не виден игрокам — используется для фильтрации трактатов)</span>
              </label>
              <select value={form.subtype} onChange={e => set('subtype', e.target.value as UnitSubtype | '')} className={inputCls}>
                <option value="">— не задан —</option>
                {UNIT_SUBTYPES.filter(st => {
                  if (form.class === 'Пехота') return st.startsWith('Пехота');
                  if (form.class === 'Стрелки') return st.startsWith('Стрелковая');
                  if (form.class === 'Кавалерия') return st.startsWith('Кавалерия');
                  return false;
                }).map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground block mb-2">Роли (можно несколько)</label>
              <div className="flex flex-wrap gap-2">
                {availableRoles.map(r => (
                  <button key={r.id} type="button" onClick={() => toggleRole(r.name as UnitRole)}
                    title={r.description || undefined}
                    className={`px-3 py-1.5 text-xs rounded-sm border transition-colors ${form.roles.includes(r.name as UnitRole) ? 'bg-primary/10 border-primary text-primary' : 'border-border text-muted-foreground hover:border-foreground/40'}`}>
                    {r.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground block mb-2">Построения (можно несколько)</label>
              {availableFormations.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Нет доступных построений. Создайте их во вкладке «Построения».</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableFormations.map(f => {
                    const selected = form.formations.includes(f.id);
                    return (
                      <button key={f.id} type="button" onClick={() => toggleFormation(f.id)}
                        title={f.description || undefined}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-sm border transition-colors ${selected ? 'bg-primary/10 border-primary text-primary' : 'border-border text-muted-foreground hover:border-foreground/40'}`}>
                        {f.avatar_url && (
                          <img src={f.avatar_url} alt="" className="w-4 h-4 rounded-sm object-cover flex-shrink-0" />
                        )}
                        {f.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground block mb-1.5">Описание</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} className={inputCls + ' resize-none'} rows={2} />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground block mb-1.5">Хроника</label>
              <textarea value={form.lore} onChange={e => set('lore', e.target.value)} className={inputCls + ' resize-none'} rows={2} />
            </div>
            <div className="col-span-2">
              <AvatarUpload value={form.avatar_url} onChange={url => set('avatar_url', url)} aspectRatio="3/4" label="Аватар отряда (пропорции карточки)" folder="units" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground block mb-2">Звёзды отряда (0–5)</label>
              <StarPicker value={form.stars} onChange={v => set('stars', v)} />
            </div>
          </div>

          {/* Особенности */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs text-muted-foreground uppercase tracking-widest">Особенности</h4>
              {availableTraits.length > 0 && (
                <input
                  type="text"
                  value={traitSearch}
                  onChange={e => setTraitSearch(e.target.value)}
                  placeholder="Поиск..."
                  className="bg-background border border-border rounded-sm px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-36"
                />
              )}
            </div>
            {availableTraits.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Сначала создайте особенности в разделе «Особенности».</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableTraits.filter(t => t.name.toLowerCase().includes(traitSearch.toLowerCase())).map(t => {
                  const selected = selectedTraitIds.includes(t.id);
                  const colorCls = t.color === 'green'
                    ? selected ? 'bg-green-900/40 border-green-500 text-green-400' : 'border-green-500/30 text-green-400/60 hover:border-green-500 hover:text-green-400'
                    : t.color === 'red'
                    ? selected ? 'bg-red-900/40 border-red-500 text-red-400' : 'border-red-500/30 text-red-400/60 hover:border-red-500 hover:text-red-400'
                    : selected ? 'bg-muted border-foreground/40 text-foreground' : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground';
                  return (
                    <button key={t.id} type="button"
                      onClick={() => setSelectedTraitIds(prev => prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id])}
                      title={t.description || undefined}
                      className={`px-3 py-1.5 text-xs rounded-sm border transition-colors ${colorCls}`}>
                      {selected && <span className="mr-1">✓</span>}{t.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Умения */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs text-muted-foreground uppercase tracking-widest">Умения</h4>
              {availableAbilities.length > 0 && (
                <input
                  type="text"
                  value={abilitySearch}
                  onChange={e => setAbilitySearch(e.target.value)}
                  placeholder="Поиск..."
                  className="bg-background border border-border rounded-sm px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-36"
                />
              )}
            </div>
            {availableAbilities.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Сначала создайте умения в разделе «Умения».</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableAbilities.filter(a => a.name.toLowerCase().includes(abilitySearch.toLowerCase())).map(a => {
                  const selected = selectedAbilityIds.includes(a.id);
                  const hasMods = Object.keys(a.statModifiers || {}).length > 0 || Object.keys(a.statModifiersEx || {}).length > 0;
                  return (
                    <button key={a.id} type="button"
                      onClick={() => setSelectedAbilityIds(prev => prev.includes(a.id) ? prev.filter(id => id !== a.id) : [...prev, a.id])}
                      title={[a.description, a.adminComment ? `📝 ${a.adminComment}` : ''].filter(Boolean).join('\n\n') || undefined}
                      className={`px-3 py-1.5 text-xs rounded-sm border transition-colors flex items-center gap-1 ${
                        selected
                          ? hasMods ? 'bg-blue-900/30 border-blue-500 text-blue-300' : 'bg-primary/10 border-primary text-primary'
                          : 'border-border text-muted-foreground hover:border-foreground/40'
                      }`}>
                      {hasMods && <Icon name="Zap" size={9} className={selected ? 'text-blue-400' : 'text-muted-foreground'} />}
                      {selected && <span className="mr-0.5">✓</span>}{a.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Характеристики */}
          <div>
            <h4 className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Характеристики</h4>
            <div className="space-y-4">
              {STAT_GROUPS.map(group => (
                <div key={group.label}>
                  <div className={`flex items-center gap-1.5 mb-2 ${group.color}`}>
                    <Icon name={group.icon} size={12} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">{group.label}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {group.stats.map(({ key, label }) => (
                      <div key={key}>
                        <label className="text-[10px] text-muted-foreground block mb-1">{label}</label>
                        <input
                          type="number"
                          value={form.stats[key as keyof typeof DEFAULT_UNIT_STATS] ?? 0}
                          onChange={e => setStat(key, e.target.value)}
                          className={inputCls + ' font-mono-data'}
                          step="0.01"
                          min={-9999}
                          max={key === 'health' ? 200000 : 9999}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <GuideEditor label="Рекомендации по прокачке" value={form.guide_upgrade} onChange={v => set('guide_upgrade', v)} />
          <GuideEditor label="Рекомендации по игре" value={form.guide_gameplay} onChange={v => set('guide_gameplay', v)} />

          <div className="flex gap-3 justify-end pt-2 border-t border-border">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border rounded-sm hover:bg-muted transition-colors">Отмена</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {loading ? 'Сохраняем...' : (editing ? 'Сохранить' : 'Добавить')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}