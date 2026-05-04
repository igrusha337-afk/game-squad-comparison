import { useState, useEffect, useCallback } from 'react';
import { unitsApi, treatiesApi, seedApi, rolesApi, formationsApi, traitsApi, abilitiesApi, statsApi, forumApi, guidesApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useUnits, useTreaties, useRoles, useFormations, useTraits, useAbilities, UnitRoleDef, TraitDef, AbilityDef } from '@/hooks/useAppData';
import Icon from '@/components/ui/icon';
import RarityBadge from '@/components/RarityBadge';
import { Rarity, UnitClass, UnitRole, Ability, UnitStats, Trait, TraitColor, Formation } from '@/data/types';
import { ALL_STATS, STAT_GROUPS } from '@/data/statGroups';
import AvatarUpload from '@/components/AvatarUpload';
import { StarPicker } from '@/components/StarRating';
import GuideEditor from '@/components/GuideEditor';
import { GuideBlock } from '@/data/types';

type AdminTab = 'stats' | 'units' | 'treaties' | 'roles' | 'formations' | 'traits' | 'abilities' | 'moderation';

interface SiteStats {
  total_unique: number;
  total_views: number;
  today_unique: number;
  week_unique: number;
  month_unique: number;
  total_users: number;
  daily: { date: string; visitors: number }[];
}

const UNIT_CLASSES: UnitClass[] = ['Пехота', 'Кавалерия', 'Стрелки', 'Осадные'];
const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const RARITY_LABELS: Record<Rarity, string> = { common: 'Обычный', uncommon: 'Необычный', rare: 'Редкий', epic: 'Уникальный', legendary: 'Легендарный' };

const DEFAULT_UNIT_STATS = {
  health: 0, troops: 0, leadership: 0, moveSpeed: 0, rangeDistance: 0, ammo: 0, morale: 0,
  piercingPenetration: 0, slashingPenetration: 0, bluntPenetration: 0,
  piercingDamage: 0, slashingDamage: 0, bluntDamage: 0,
  piercingDefense: 0, slashingDefense: 0, bluntDefense: 0,
  block: 0, blockRecovery: 0,
};

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-sm text-sm shadow-lg border
      ${type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-600' : 'bg-destructive/10 border-destructive/30 text-destructive'}`}>
      <Icon name={type === 'success' ? 'CheckCircle' : 'AlertCircle'} size={14} />
      {message}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><Icon name="X" size={12} /></button>
    </div>
  );
}

function ConfirmModal({ name, type, onConfirm, onCancel }: { name: string; type: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
      <div className="bg-card border border-border rounded-sm p-6 w-full max-w-sm shadow-xl">
        <h3 className="text-sm font-semibold mb-3">Подтверждение удаления</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Вы уверены, что хотите удалить {type} <span className="text-foreground font-medium">«{name}»</span>?
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm border border-border rounded-sm hover:bg-muted transition-colors">
            Отмена
          </button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm bg-destructive text-destructive-foreground rounded-sm hover:bg-destructive/90 transition-colors">
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
}

// ───── Unit Form ─────
const statOptions = ALL_STATS.map(s => s.key);
const STAT_LABELS: Partial<Record<string, string>> = Object.fromEntries(ALL_STATS.map(s => [s.key, s.label]));

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
}

function getRawRoles(raw: unknown): UnitRole[] {
  if (Array.isArray(raw)) return raw as UnitRole[];
  if (typeof raw === 'string') return [raw as UnitRole];
  return ['Танк'];
}

function UnitModal({ unit, onSave, onClose, availableRoles, availableFormations, availableTraits, availableAbilities }: {
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

  // Матчим существующие traits отряда с глобальным справочником по имени
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

  // Матчим существующие abilities отряда с глобальным справочником по имени (только при редактировании)
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
        name: form.name.trim(),
        class: form.class,
        role: form.roles,
        rarity: form.rarity,
        description: form.description,
        lore: form.lore,
        avatar_url: form.avatar_url,
        stars: form.stars,
        guide_upgrade: form.guide_upgrade,
        guide_gameplay: form.guide_gameplay,
        abilities,
        traits,
        stats: form.stats,
        formations: form.formations,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
  const statKeys = Object.keys(DEFAULT_UNIT_STATS);

  const TRAIT_COLOR_LABELS: Record<TraitColor, string> = { green: 'Положительная', gray: 'Нейтральная', red: 'Негативная' };

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
              <select value={form.class} onChange={e => set('class', e.target.value)} className={inputCls}>
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
              <AvatarUpload
                value={form.avatar_url}
                onChange={url => set('avatar_url', url)}
                aspectRatio="3/4"
                label="Аватар отряда (пропорции карточки)"
                folder="units"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground block mb-2">Звёзды отряда (0–5)</label>
              <StarPicker value={form.stars} onChange={v => set('stars', v)} />
            </div>
          </div>

          {/* Особенности */}
          <div>
            <h4 className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Особенности</h4>
            {availableTraits.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Сначала создайте особенности в разделе «Особенности».</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableTraits.map(t => {
                  const selected = selectedTraitIds.includes(t.id);
                  const colorCls = t.color === 'green'
                    ? selected ? 'bg-green-900/40 border-green-500 text-green-400' : 'border-green-500/30 text-green-400/60 hover:border-green-500 hover:text-green-400'
                    : t.color === 'red'
                    ? selected ? 'bg-red-900/40 border-red-500 text-red-400' : 'border-red-500/30 text-red-400/60 hover:border-red-500 hover:text-red-400'
                    : selected ? 'bg-muted border-foreground/40 text-foreground' : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground';
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTraitIds(prev =>
                        prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id]
                      )}
                      title={t.description || undefined}
                      className={`px-3 py-1.5 text-xs rounded-sm border transition-colors ${colorCls}`}
                    >
                      {selected && <span className="mr-1">✓</span>}{t.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Умения */}
          <div>
            <h4 className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Умения</h4>
            {availableAbilities.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Сначала создайте умения в разделе «Умения».</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableAbilities.map(a => {
                  const selected = selectedAbilityIds.includes(a.id);
                  const hasMods = Object.keys(a.statModifiers || {}).length > 0 || Object.keys(a.statModifiersEx || {}).length > 0;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setSelectedAbilityIds(prev =>
                        prev.includes(a.id) ? prev.filter(id => id !== a.id) : [...prev, a.id]
                      )}
                      title={[a.description, a.adminComment ? `📝 ${a.adminComment}` : ''].filter(Boolean).join('\n\n') || undefined}
                      className={`px-3 py-1.5 text-xs rounded-sm border transition-colors flex items-center gap-1.5 ${
                        selected ? 'bg-primary/10 border-primary text-primary' : 'border-border text-muted-foreground hover:border-foreground/40'
                      }`}
                    >
                      {selected && <span>✓</span>}
                      {a.name}
                      {hasMods && <Icon name="Zap" size={9} className="opacity-60" />}
                      {a.adminComment && <Icon name="Lock" size={9} className="text-amber-500/60" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

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
                          max={key === 'health' ? 30000 : 9999}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <GuideEditor
            label="Рекомендации по прокачке"
            value={form.guide_upgrade}
            onChange={v => set('guide_upgrade', v)}
          />

          <GuideEditor
            label="Рекомендации по игре"
            value={form.guide_gameplay}
            onChange={v => set('guide_gameplay', v)}
          />

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

// ───── Treaty Form ─────
interface ModifierEntry {
  value: string;
  type: 'flat' | 'percent';
}

function initModifiers(treaty?: Record<string, unknown> | null): Record<string, ModifierEntry> {
  const ex = (treaty?.statModifiersEx as Record<string, { value: number; type: 'flat' | 'percent' }>) || {};
  const flat = (treaty?.statModifiers as Record<string, number>) || {};
  const result: Record<string, ModifierEntry> = {};
  for (const [k, v] of Object.entries(flat)) {
    result[k] = { value: String(v), type: 'flat' };
  }
  for (const [k, v] of Object.entries(ex)) {
    result[k] = { value: String(v.value), type: v.type };
  }
  return result;
}

function TreatyModal({ treaty, onSave, onClose }: {
  treaty?: Record<string, unknown> | null;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}) {
  const editing = !!treaty;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState((treaty?.name as string) || '');
  const [description, setDescription] = useState((treaty?.description as string) || '');
  const [rarity, setRarity] = useState<Rarity>((treaty?.rarity as Rarity) || 'common');
  const [classes, setClasses] = useState<UnitClass[]>((treaty?.compatibleClasses as UnitClass[]) || []);
  const [avatarUrl, setAvatarUrl] = useState((treaty?.avatar_url as string) || '');
  const [modifiers, setModifiers] = useState<Record<string, ModifierEntry>>(initModifiers(treaty));
  const [newModKey, setNewModKey] = useState('health');
  const [newModVal, setNewModVal] = useState('');
  const [newModType, setNewModType] = useState<'flat' | 'percent'>('flat');

  const inputCls = "w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary";

  const toggleClass = (cls: UnitClass) => {
    setClasses(prev => prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]);
  };

  const addModifier = () => {
    if (!newModVal) return;
    setModifiers(prev => ({ ...prev, [newModKey]: { value: newModVal, type: newModType } }));
    setNewModVal('');
  };

  const removeModifier = (key: string) => {
    setModifiers(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const toggleModType = (key: string) => {
    setModifiers(prev => ({
      ...prev,
      [key]: { ...prev[key], type: prev[key].type === 'flat' ? 'percent' : 'flat' }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Поле "название" обязательно'); return; }
    setLoading(true);
    setError('');
    try {
      const statModifiers: Record<string, number> = {};
      const statModifiersEx: Record<string, { value: number; type: string }> = {};
      for (const [k, entry] of Object.entries(modifiers)) {
        const n = parseFloat(entry.value);
        if (!isNaN(n)) {
          if (entry.type === 'percent') {
            statModifiersEx[k] = { value: n, type: 'percent' };
          } else {
            statModifiers[k] = n;
          }
        }
      }
      await onSave({ name: name.trim(), description, rarity, compatibleClasses: classes, statModifiers, statModifiersEx, avatar_url: avatarUrl });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  const statOptions = Object.keys(DEFAULT_UNIT_STATS);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 overflow-y-auto py-6">
      <div className="bg-card border border-border rounded-sm w-full max-w-lg shadow-xl mx-4">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-sm font-semibold">{editing ? 'Редактировать трактат' : 'Добавить трактат'}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><Icon name="X" size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-sm bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
              <Icon name="AlertCircle" size={12} /> {error}
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Название *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="Железная Дисциплина" required />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Описание</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className={inputCls + ' resize-none'} rows={3} />
          </div>
          <AvatarUpload
            value={avatarUrl}
            onChange={setAvatarUrl}
            aspectRatio="1/1"
            label="Аватар трактата"
            folder="treaties"
          />
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Редкость</label>
            <select value={rarity} onChange={e => setRarity(e.target.value as Rarity)} className={inputCls}>
              {RARITIES.map(r => <option key={r} value={r}>{RARITY_LABELS[r]}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-2">Совместимые классы</label>
            <div className="flex flex-wrap gap-2">
              {UNIT_CLASSES.map(cls => (
                <button
                  key={cls}
                  type="button"
                  onClick={() => toggleClass(cls)}
                  className={`px-3 py-1.5 text-xs rounded-sm border transition-colors ${
                    classes.includes(cls) ? 'bg-primary/10 border-primary text-primary' : 'border-border text-muted-foreground hover:border-foreground/40'
                  }`}
                >
                  {cls}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-2">Модификаторы характеристик</label>
            {Object.entries(modifiers).length > 0 && (
              <div className="space-y-1.5 mb-3">
                {Object.entries(modifiers).map(([key, entry]) => (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground font-mono-data flex-1 truncate">{STAT_LABELS[key] || key}</span>
                    <span className={`font-mono-data font-semibold ${parseFloat(entry.value) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {parseFloat(entry.value) >= 0 ? '+' : ''}{entry.value}{entry.type === 'percent' ? '%' : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleModType(key)}
                      className={`px-1.5 py-0.5 rounded-sm border text-[10px] transition-colors ${entry.type === 'percent' ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:border-foreground/40'}`}
                    >
                      {entry.type === 'percent' ? '%' : '#'}
                    </button>
                    <button type="button" onClick={() => removeModifier(key)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Icon name="X" size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <select value={newModKey} onChange={e => setNewModKey(e.target.value)} className="flex-1 bg-background border border-border rounded-sm px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                {statOptions.map(s => <option key={s} value={s}>{STAT_LABELS[s] || s}</option>)}
              </select>
              <input
                type="number"
                value={newModVal}
                onChange={e => setNewModVal(e.target.value)}
                className="w-20 bg-background border border-border rounded-sm px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="±знач."
              />
              <button
                type="button"
                onClick={() => setNewModType(t => t === 'flat' ? 'percent' : 'flat')}
                className={`px-2 py-1.5 text-xs rounded-sm border transition-colors ${newModType === 'percent' ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:border-foreground/40'}`}
              >
                {newModType === 'percent' ? '%' : '#'}
              </button>
              <button type="button" onClick={addModifier} className="px-3 py-1.5 text-xs bg-muted border border-border rounded-sm hover:bg-muted/80 transition-colors">
                + Добавить
              </button>
            </div>
          </div>
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

// ───── Main AdminPage ─────
export default function AdminPage() {
  const { user } = useAuth();
  const { invalidate: invalidateUnits } = useUnits();
  const { invalidate: invalidateTreaties } = useTreaties();
  const { roles, invalidate: invalidateRoles } = useRoles();
  const { formations, invalidate: invalidateFormations } = useFormations();
  const { traits, invalidate: invalidateTraits } = useTraits();
  const { abilities, invalidate: invalidateAbilities } = useAbilities();
  const [tab, setTab] = useState<AdminTab>('stats');
  const [siteStats, setSiteStats] = useState<SiteStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [units, setUnits] = useState<Record<string, unknown>[]>([]);
  const [treaties, setTreaties] = useState<Record<string, unknown>[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [seedLoading, setSeedLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string; kind: 'unit' | 'treaty' } | null>(null);
  const [unitModal, setUnitModal] = useState<{ open: boolean; unit?: Record<string, unknown> | null }>({ open: false });
  const [treatyModal, setTreatyModal] = useState<{ open: boolean; treaty?: Record<string, unknown> | null }>({ open: false });

  // Управление ролями
  const [roleForm, setRoleForm] = useState({ name: '', description: '' });
  const [roleEditing, setRoleEditing] = useState<UnitRoleDef | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);

  // Управление построениями
  const [formationForm, setFormationForm] = useState({ name: '', description: '', avatar_url: '' });
  const [formationEditing, setFormationEditing] = useState<Formation | null>(null);
  const [formationLoading, setFormationLoading] = useState(false);

  // Управление умениями
  const [abilityForm, setAbilityForm] = useState({ name: '', description: '', adminComment: '', modifiers: {} as Record<string, { value: string; type: 'flat' | 'percent' }>, newModKey: 'health', newModVal: '', newModType: 'flat' as 'flat' | 'percent' });
  const [abilityEditing, setAbilityEditing] = useState<AbilityDef | null>(null);
  const [abilityLoading, setAbilityLoading] = useState(false);

  // Управление особенностями
  const [traitForm, setTraitForm] = useState({ name: '', description: '', adminComment: '', color: 'gray' as TraitColor });
  const [traitEditing, setTraitEditing] = useState<TraitDef | null>(null);
  const [traitLoading, setTraitLoading] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [u, t] = await Promise.all([unitsApi.list(), treatiesApi.list()]);
      setUnits(u.units || []);
      setTreaties(t.treaties || []);
    } catch {
      showToast('Ошибка загрузки данных', 'error');
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (tab === 'stats') {
      setStatsLoading(true);
      statsApi.getStats().then(data => setSiteStats(data)).catch(() => {}).finally(() => setStatsLoading(false));
    }
    if (tab === 'moderation') {
      loadPending();
    }
  }, [tab]);

  // ── Модерация публикаций ──────────────────────────────────────────
  interface PendingTopic { id: number; title: string; content: string; author: string; author_id: number; created_at: string; }
  interface PendingGuide { id: number; title: string; author: string; author_id: number; created_at: string; }
  const [pendingTopics, setPendingTopics] = useState<PendingTopic[]>([]);
  const [pendingGuides, setPendingGuides] = useState<PendingGuide[]>([]);
  const [moderationLoading, setModerationLoading] = useState(false);
  const [expandedTopic, setExpandedTopic] = useState<number | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadPending = useCallback(async () => {
    setModerationLoading(true);
    try {
      const [t, g] = await Promise.all([forumApi.getPendingTopics(), guidesApi.getPendingGuides()]);
      setPendingTopics(t.topics || []);
      setPendingGuides(g.guides || []);
    } finally {
      setModerationLoading(false);
    }
  }, []);

  const handlePublishTopic = async (id: number, approve: boolean) => {
    const key = `topic-${id}`;
    if (processingId === key) return;
    setProcessingId(key);
    try {
      await forumApi.publishTopic(id, approve);
      showToast(approve ? 'Тема опубликована' : 'Тема отклонена');
      await loadPending();
    } finally {
      setProcessingId(null);
    }
  };

  const handlePublishGuide = async (id: number, approve: boolean) => {
    const key = `guide-${id}`;
    if (processingId === key) return;
    setProcessingId(key);
    try {
      await guidesApi.publishGuide(id, approve);
      showToast(approve ? 'Гайд опубликован' : 'Гайд отклонён');
      await loadPending();
    } finally {
      setProcessingId(null);
    }
  };

  const handleSeed = async () => {
    setSeedLoading(true);
    try {
      const res = await seedApi.run();
      const u = res.units as { inserted: number; skipped: number };
      const t = res.treaties as { inserted: number; skipped: number };
      showToast(`Импортировано: ${u.inserted} отрядов, ${t.inserted} трактатов`);
      await loadData();
      invalidateUnits();
      invalidateTreaties();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Ошибка импорта', 'error');
    } finally {
      setSeedLoading(false);
    }
  };

  const handleSaveUnit = async (data: Record<string, unknown>) => {
    if (unitModal.unit) {
      await unitsApi.update(unitModal.unit.id as string, data);
      showToast('Отряд успешно обновлён');
    } else {
      await unitsApi.create(data);
      showToast('Отряд успешно добавлен');
    }
    await loadData();
    invalidateUnits();
  };

  const handleSaveTreaty = async (data: Record<string, unknown>) => {
    if (treatyModal.treaty) {
      await treatiesApi.update(treatyModal.treaty.id as string, data);
      showToast('Трактат успешно обновлён');
    } else {
      await treatiesApi.create(data);
      showToast('Трактат успешно добавлен');
    }
    await loadData();
    invalidateTreaties();
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.kind === 'unit') {
        await unitsApi.delete(confirmDelete.id);
        showToast('Отряд успешно удалён');
        invalidateUnits();
      } else {
        await treatiesApi.delete(confirmDelete.id);
        showToast('Трактат успешно удалён');
        invalidateTreaties();
      }
      await loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Ошибка удаления', 'error');
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleSaveRole = async () => {
    if (!roleForm.name.trim()) return;
    setRoleLoading(true);
    try {
      if (roleEditing) {
        await rolesApi.update(roleEditing.id, { name: roleForm.name.trim(), description: roleForm.description.trim() });
        showToast('Роль обновлена');
      } else {
        await rolesApi.create({ name: roleForm.name.trim(), description: roleForm.description.trim() });
        showToast('Роль добавлена');
      }
      setRoleForm({ name: '', description: '' });
      setRoleEditing(null);
      invalidateRoles();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Ошибка сохранения роли', 'error');
    } finally {
      setRoleLoading(false);
    }
  };

  const handleDeleteRole = async (role: UnitRoleDef) => {
    setRoleLoading(true);
    try {
      await rolesApi.delete(role.id);
      showToast('Роль удалена');
      invalidateRoles();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Ошибка удаления роли', 'error');
    } finally {
      setRoleLoading(false);
    }
  };

  const startEditRole = (role: UnitRoleDef) => {
    setRoleEditing(role);
    setRoleForm({ name: role.name, description: role.description });
  };

  const handleSaveFormation = async () => {
    if (!formationForm.name.trim()) return;
    setFormationLoading(true);
    try {
      if (formationEditing) {
        await formationsApi.update(formationEditing.id, {
          name: formationForm.name.trim(),
          description: formationForm.description.trim(),
          avatar_url: formationForm.avatar_url.trim(),
        });
        showToast('Построение обновлено');
      } else {
        await formationsApi.create({
          name: formationForm.name.trim(),
          description: formationForm.description.trim(),
          avatar_url: formationForm.avatar_url.trim(),
        });
        showToast('Построение добавлено');
      }
      setFormationForm({ name: '', description: '', avatar_url: '' });
      setFormationEditing(null);
      invalidateFormations();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Ошибка сохранения', 'error');
    } finally {
      setFormationLoading(false);
    }
  };

  const handleDeleteFormation = async (f: Formation) => {
    setFormationLoading(true);
    try {
      await formationsApi.delete(f.id);
      showToast('Построение удалено');
      invalidateFormations();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Ошибка удаления', 'error');
    } finally {
      setFormationLoading(false);
    }
  };

  const startEditFormation = (f: Formation) => {
    setFormationEditing(f);
    setFormationForm({ name: f.name, description: f.description, avatar_url: f.avatar_url });
  };

  const handleSaveTrait = async () => {
    if (!traitForm.name.trim()) return;
    setTraitLoading(true);
    try {
      if (traitEditing) {
        await traitsApi.update(traitEditing.id, { name: traitForm.name.trim(), description: traitForm.description.trim(), adminComment: traitForm.adminComment.trim(), color: traitForm.color });
        showToast('Особенность обновлена');
      } else {
        await traitsApi.create({ name: traitForm.name.trim(), description: traitForm.description.trim(), adminComment: traitForm.adminComment.trim(), color: traitForm.color });
        showToast('Особенность добавлена');
      }
      setTraitForm({ name: '', description: '', adminComment: '', color: 'gray' });
      setTraitEditing(null);
      invalidateTraits();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Ошибка сохранения', 'error');
    } finally {
      setTraitLoading(false);
    }
  };

  const handleDeleteTrait = async (t: TraitDef) => {
    setTraitLoading(true);
    try {
      await traitsApi.delete(t.id);
      showToast('Особенность удалена');
      invalidateTraits();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Ошибка удаления', 'error');
    } finally {
      setTraitLoading(false);
    }
  };

  const startEditTrait = (t: TraitDef) => {
    setTraitEditing(t);
    setTraitForm({ name: t.name, description: t.description, adminComment: t.adminComment || '', color: t.color });
  };

  const handleSaveAbility = async () => {
    if (!abilityForm.name.trim()) return;
    setAbilityLoading(true);
    try {
      const statModifiers: Record<string, number> = {};
      const statModifiersEx: Record<string, { value: number; type: string }> = {};
      for (const [k, entry] of Object.entries(abilityForm.modifiers)) {
        const n = parseFloat(entry.value);
        if (!isNaN(n)) {
          if (entry.type === 'percent') statModifiersEx[k] = { value: n, type: 'percent' };
          else statModifiers[k] = n;
        }
      }
      if (abilityEditing) {
        await abilitiesApi.update(abilityEditing.id, { name: abilityForm.name.trim(), description: abilityForm.description.trim(), adminComment: abilityForm.adminComment.trim(), statModifiers, statModifiersEx });
        showToast('Умение обновлено');
      } else {
        await abilitiesApi.create({ name: abilityForm.name.trim(), description: abilityForm.description.trim(), adminComment: abilityForm.adminComment.trim(), statModifiers, statModifiersEx });
        showToast('Умение добавлено');
      }
      setAbilityForm({ name: '', description: '', adminComment: '', modifiers: {}, newModKey: 'health', newModVal: '', newModType: 'flat' });
      setAbilityEditing(null);
      invalidateAbilities();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Ошибка сохранения', 'error');
    } finally {
      setAbilityLoading(false);
    }
  };

  const handleDeleteAbility = async (a: AbilityDef) => {
    setAbilityLoading(true);
    try {
      await abilitiesApi.delete(a.id);
      showToast('Умение удалено');
      invalidateAbilities();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Ошибка удаления', 'error');
    } finally {
      setAbilityLoading(false);
    }
  };

  const startEditAbility = (a: AbilityDef) => {
    setAbilityEditing(a);
    const modifiers: Record<string, { value: string; type: 'flat' | 'percent' }> = {};
    for (const [k, v] of Object.entries(a.statModifiers || {})) {
      modifiers[k] = { value: String(v), type: 'flat' };
    }
    for (const [k, v] of Object.entries(a.statModifiersEx || {})) {
      modifiers[k] = { value: String(v.value), type: v.type as 'flat' | 'percent' };
    }
    setAbilityForm({ name: a.name, description: a.description, adminComment: a.adminComment || '', modifiers, newModKey: 'health', newModVal: '', newModType: 'flat' });
  };

  const addAbilityFormMod = () => {
    if (!abilityForm.newModVal) return;
    setAbilityForm(f => ({ ...f, modifiers: { ...f.modifiers, [f.newModKey]: { value: f.newModVal, type: f.newModType } }, newModVal: '' }));
  };

  const removeAbilityFormMod = (key: string) => {
    setAbilityForm(f => { const m = { ...f.modifiers }; delete m[key]; return { ...f, modifiers: m }; });
  };

  if (!user?.is_admin) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center space-y-3">
          <Icon name="ShieldOff" size={32} className="text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Доступ только для администраторов</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-base font-semibold text-foreground" style={{ fontFamily: 'Oswald, sans-serif', letterSpacing: '0.05em' }}>
            ПАНЕЛЬ УПРАВЛЕНИЯ
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Управление данными справочника</p>
        </div>
        <button
          onClick={handleSeed}
          disabled={seedLoading}
          className="flex items-center gap-2 px-3 py-2 text-xs border border-border rounded-sm hover:bg-muted disabled:opacity-50 transition-colors"
        >
          <Icon name={seedLoading ? 'Loader' : 'Download'} size={13} className={seedLoading ? 'animate-spin' : ''} />
          Импортировать базовые данные
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border flex-wrap">
        {(['stats', 'units', 'treaties', 'roles', 'formations', 'traits', 'abilities', 'moderation'] as AdminTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
              tab === t ? 'border-primary text-primary font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'stats' ? 'Статистика' : t === 'units' ? 'Отряды' : t === 'treaties' ? 'Трактаты' : t === 'roles' ? 'Роли' : t === 'formations' ? 'Построения' : t === 'traits' ? 'Особенности' : t === 'abilities' ? 'Умения' : (
              <span className="flex items-center gap-1.5">
                Публикации
                {(pendingTopics.length + pendingGuides.length) > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none"
                    style={{ background: 'hsl(355 72% 50%)', color: 'white' }}>
                    {pendingTopics.length + pendingGuides.length}
                  </span>
                )}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Stats Tab */}
      {tab === 'stats' && (
        <div>
          {statsLoading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Загрузка статистики...</div>
          ) : !siteStats ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Нет данных</div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: 'За сегодня', value: siteStats.today_unique, icon: 'CalendarDays' },
                  { label: 'За 7 дней', value: siteStats.week_unique, icon: 'TrendingUp' },
                  { label: 'За 30 дней', value: siteStats.month_unique, icon: 'BarChart2' },
                  { label: 'Всего уникальных', value: siteStats.total_unique, icon: 'Users' },
                  { label: 'Всего просмотров', value: siteStats.total_views, icon: 'Eye' },
                  { label: 'Зарегистрировано', value: siteStats.total_users, icon: 'UserCheck' },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="bg-card border border-border rounded-sm p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Icon name={icon as Parameters<typeof Icon>[0]['name']} size={14} />
                      <span className="text-xs">{label}</span>
                    </div>
                    <div className="text-2xl font-semibold text-foreground" style={{ fontFamily: 'Oswald, sans-serif' }}>{value}</div>
                  </div>
                ))}
              </div>

              {siteStats.daily.length > 0 && (
                <div className="bg-card border border-border rounded-sm p-4">
                  <div className="text-xs text-muted-foreground mb-4">Уникальные посетители за 30 дней</div>
                  <div className="flex items-end gap-1 h-24">
                    {(() => {
                      const max = Math.max(...siteStats.daily.map(d => d.visitors), 1);
                      return siteStats.daily.map(d => (
                        <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                          <div
                            className="w-full bg-primary/60 rounded-sm hover:bg-primary transition-colors"
                            style={{ height: `${(d.visitors / max) * 100}%`, minHeight: d.visitors > 0 ? '2px' : '0' }}
                          />
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-popover border border-border text-xs px-1.5 py-0.5 rounded hidden group-hover:block whitespace-nowrap z-10">
                            {d.date.slice(5)}: {d.visitors}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>{siteStats.daily[0]?.date.slice(5)}</span>
                    <span>{siteStats.daily[siteStats.daily.length - 1]?.date.slice(5)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Units Tab */}
      {tab === 'units' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-muted-foreground">{units.length} отрядов</span>
            <button
              onClick={() => setUnitModal({ open: true, unit: null })}
              className="flex items-center gap-2 px-3 py-2 text-xs bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 transition-colors"
            >
              <Icon name="Plus" size={13} /> Добавить отряд
            </button>
          </div>
          {loadingData ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Загрузка...</div>
          ) : units.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Отрядов пока нет</div>
          ) : (
            <div className="space-y-2">
              {units.map(unit => (
                <div key={unit.id as string} className="bg-card border border-border rounded-sm p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">{unit.name as string}</span>
                      <RarityBadge rarity={unit.rarity as Rarity} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{unit.class as string}</span>
                      <span>·</span>
                      <span>{unit.role as string}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setUnitModal({ open: true, unit })}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-sm hover:bg-muted transition-colors"
                    >
                      <Icon name="Pencil" size={11} /> Редактировать
                    </button>
                    <button
                      onClick={() => setConfirmDelete({ id: unit.id as string, name: unit.name as string, kind: 'unit' })}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-destructive/40 text-destructive rounded-sm hover:bg-destructive/10 transition-colors"
                    >
                      <Icon name="Trash2" size={11} /> Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Treaties Tab */}
      {tab === 'treaties' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-muted-foreground">{treaties.length} трактатов</span>
            <button
              onClick={() => setTreatyModal({ open: true, treaty: null })}
              className="flex items-center gap-2 px-3 py-2 text-xs bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 transition-colors"
            >
              <Icon name="Plus" size={13} /> Добавить трактат
            </button>
          </div>
          {loadingData ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Загрузка...</div>
          ) : treaties.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Трактатов пока нет</div>
          ) : (
            <div className="space-y-2">
              {treaties.map(treaty => (
                <div key={treaty.id as string} className="bg-card border border-border rounded-sm p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">{treaty.name as string}</span>
                      <RarityBadge rarity={treaty.rarity as Rarity} />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{treaty.description as string}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTreatyModal({ open: true, treaty })}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-sm hover:bg-muted transition-colors"
                    >
                      <Icon name="Pencil" size={11} /> Редактировать
                    </button>
                    <button
                      onClick={() => setConfirmDelete({ id: treaty.id as string, name: treaty.name as string, kind: 'treaty' })}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-destructive/40 text-destructive rounded-sm hover:bg-destructive/10 transition-colors"
                    >
                      <Icon name="Trash2" size={11} /> Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Roles Tab */}
      {tab === 'roles' && (
        <div className="max-w-xl">
          <div className="bg-card border border-border rounded-sm p-4 mb-4">
            <h4 className="text-xs text-muted-foreground uppercase tracking-widest mb-3">
              {roleEditing ? 'Редактировать роль' : 'Новая роль'}
            </h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Название *</label>
                <input
                  type="text"
                  value={roleForm.name}
                  onChange={e => setRoleForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Например: Осада"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Описание (для тултипа)</label>
                <textarea
                  value={roleForm.description}
                  onChange={e => setRoleForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  placeholder="Что умеет этот тип отряда..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveRole}
                  disabled={roleLoading || !roleForm.name.trim()}
                  className="flex items-center gap-2 px-4 py-2 text-xs bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  <Icon name={roleLoading ? 'Loader' : (roleEditing ? 'Save' : 'Plus')} size={12} className={roleLoading ? 'animate-spin' : ''} />
                  {roleEditing ? 'Сохранить' : 'Добавить'}
                </button>
                {roleEditing && (
                  <button
                    onClick={() => { setRoleEditing(null); setRoleForm({ name: '', description: '' }); }}
                    className="px-4 py-2 text-xs border border-border rounded-sm hover:bg-muted transition-colors"
                  >
                    Отмена
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {roles.map(role => (
              <div key={role.id} className="bg-card border border-border rounded-sm p-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{role.name}</div>
                  {role.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => startEditRole(role)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-border rounded-sm hover:bg-muted transition-colors"
                  >
                    <Icon name="Pencil" size={11} /> Изменить
                  </button>
                  <button
                    onClick={() => handleDeleteRole(role)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-destructive/40 text-destructive rounded-sm hover:bg-destructive/10 transition-colors"
                  >
                    <Icon name="Trash2" size={11} /> Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formations Tab */}
      {tab === 'formations' && (
        <div className="max-w-xl">
          <div className="bg-card border border-border rounded-sm p-4 mb-4">
            <h4 className="text-xs text-muted-foreground uppercase tracking-widest mb-3">
              {formationEditing ? 'Редактировать построение' : 'Новое построение'}
            </h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Название *</label>
                <input type="text" value={formationForm.name}
                  onChange={e => setFormationForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Например: Черепаха" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Описание (для тултипа)</label>
                <textarea value={formationForm.description}
                  onChange={e => setFormationForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  placeholder="Описание тактики и преимуществ построения..." />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Аватарка</label>
                <AvatarUpload
                  value={formationForm.avatar_url}
                  onChange={url => setFormationForm(f => ({ ...f, avatar_url: url }))}
                  aspectRatio="1/1"
                  label="Иконка построения"
                  folder="formations"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleSaveFormation}
                  disabled={formationLoading || !formationForm.name.trim()}
                  className="flex items-center gap-2 px-4 py-2 text-xs bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  <Icon name={formationLoading ? 'Loader' : (formationEditing ? 'Save' : 'Plus')} size={12} className={formationLoading ? 'animate-spin' : ''} />
                  {formationEditing ? 'Сохранить' : 'Добавить'}
                </button>
                {formationEditing && (
                  <button onClick={() => { setFormationEditing(null); setFormationForm({ name: '', description: '', avatar_url: '' }); }}
                    className="px-4 py-2 text-xs border border-border rounded-sm hover:bg-muted transition-colors">
                    Отмена
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {formations.map(f => (
              <div key={f.id} className="bg-card border border-border rounded-sm p-3 flex items-start gap-3">
                {f.avatar_url && (
                  <img src={f.avatar_url} alt={f.name} className="w-10 h-10 rounded-sm object-cover flex-shrink-0 border border-border" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{f.name}</div>
                  {f.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{f.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => startEditFormation(f)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-border rounded-sm hover:bg-muted transition-colors">
                    <Icon name="Pencil" size={11} /> Изменить
                  </button>
                  <button onClick={() => handleDeleteFormation(f)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-destructive/40 text-destructive rounded-sm hover:bg-destructive/10 transition-colors">
                    <Icon name="Trash2" size={11} /> Удалить
                  </button>
                </div>
              </div>
            ))}
            {formations.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Построений пока нет</p>
            )}
          </div>
        </div>
      )}

      {/* Traits Tab */}
      {tab === 'traits' && (
        <div className="max-w-xl">
          <div className="bg-card border border-border rounded-sm p-4 mb-4">
            <h4 className="text-xs text-muted-foreground uppercase tracking-widest mb-3">
              {traitEditing ? 'Редактировать особенность' : 'Новая особенность'}
            </h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Название *</label>
                <input
                  type="text"
                  value={traitForm.name}
                  onChange={e => setTraitForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Например: Бронированный"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Описание</label>
                <textarea
                  value={traitForm.description}
                  onChange={e => setTraitForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  placeholder="Что означает эта особенность..."
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Тип</label>
                <div className="flex gap-2">
                  {(['green', 'gray', 'red'] as TraitColor[]).map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setTraitForm(f => ({ ...f, color: c }))}
                      className={`px-3 py-1.5 text-xs rounded-sm border transition-colors ${
                        traitForm.color === c
                          ? c === 'green' ? 'bg-green-900/30 border-green-500 text-green-400'
                            : c === 'red' ? 'bg-red-900/30 border-red-500 text-red-400'
                            : 'bg-muted border-foreground/40 text-foreground'
                          : 'border-border text-muted-foreground hover:border-foreground/40'
                      }`}
                    >
                      {c === 'green' ? 'Положительная' : c === 'red' ? 'Негативная' : 'Нейтральная'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5 flex items-center gap-1.5">
                  <Icon name="Lock" size={10} className="text-amber-500/70" />
                  <span>Заметка <span className="opacity-50">(только для вас)</span></span>
                </label>
                <textarea
                  value={traitForm.adminComment}
                  onChange={e => setTraitForm(f => ({ ...f, adminComment: e.target.value }))}
                  rows={2}
                  className="w-full bg-amber-950/20 border border-amber-500/20 rounded-sm px-3 py-2 text-sm text-amber-200/80 focus:outline-none focus:ring-1 focus:ring-amber-500/40 resize-none placeholder:text-amber-500/30"
                  placeholder="Пометки для себя: откуда взято, версия игры, источник..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveTrait}
                  disabled={traitLoading || !traitForm.name.trim()}
                  className="flex items-center gap-2 px-4 py-2 text-xs bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  <Icon name={traitLoading ? 'Loader' : (traitEditing ? 'Save' : 'Plus')} size={12} className={traitLoading ? 'animate-spin' : ''} />
                  {traitEditing ? 'Сохранить' : 'Добавить'}
                </button>
                {traitEditing && (
                  <button
                    onClick={() => { setTraitEditing(null); setTraitForm({ name: '', description: '', adminComment: '', color: 'gray' }); }}
                    className="px-4 py-2 text-xs border border-border rounded-sm hover:bg-muted transition-colors"
                  >
                    Отмена
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {traits.map(t => (
              <div key={t.id} className="bg-card border border-border rounded-sm p-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${t.color === 'green' ? 'text-green-400' : t.color === 'red' ? 'text-red-400' : 'text-foreground'}`}>
                      {t.name}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-sm ${
                      t.color === 'green' ? 'bg-green-900/30 text-green-400' : t.color === 'red' ? 'bg-red-900/30 text-red-400' : 'bg-muted text-muted-foreground'
                    }`}>
                      {t.color === 'green' ? 'Положительная' : t.color === 'red' ? 'Негативная' : 'Нейтральная'}
                    </span>
                  </div>
                  {t.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t.description}</p>
                  )}
                  {t.adminComment && (
                    <p className="text-xs mt-1 flex items-start gap-1">
                      <Icon name="Lock" size={9} className="text-amber-500/60 mt-0.5 flex-shrink-0" />
                      <span className="text-amber-300/60 italic line-clamp-2">{t.adminComment}</span>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => startEditTrait(t)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-border rounded-sm hover:bg-muted transition-colors"
                  >
                    <Icon name="Pencil" size={11} /> Изменить
                  </button>
                  <button
                    onClick={() => handleDeleteTrait(t)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-destructive/40 text-destructive rounded-sm hover:bg-destructive/10 transition-colors"
                  >
                    <Icon name="Trash2" size={11} /> Удалить
                  </button>
                </div>
              </div>
            ))}
            {traits.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Особенностей пока нет</p>
            )}
          </div>
        </div>
      )}

      {/* Abilities Tab */}
      {tab === 'abilities' && (
        <div className="max-w-xl">
          <div className="bg-card border border-border rounded-sm p-4 mb-4">
            <h4 className="text-xs text-muted-foreground uppercase tracking-widest mb-3">
              {abilityEditing ? 'Редактировать умение' : 'Новое умение'}
            </h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Название *</label>
                <input
                  type="text"
                  value={abilityForm.name}
                  onChange={e => setAbilityForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Например: Лес копий"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Описание</label>
                <textarea
                  value={abilityForm.description}
                  onChange={e => setAbilityForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  placeholder="Опишите механику умения..."
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5 flex items-center gap-1.5">
                  <Icon name="Lock" size={10} className="text-amber-500/70" />
                  <span>Заметка <span className="opacity-50">(только для вас)</span></span>
                </label>
                <textarea
                  value={abilityForm.adminComment}
                  onChange={e => setAbilityForm(f => ({ ...f, adminComment: e.target.value }))}
                  rows={2}
                  className="w-full bg-amber-950/20 border border-amber-500/20 rounded-sm px-3 py-2 text-sm text-amber-200/80 focus:outline-none focus:ring-1 focus:ring-amber-500/40 resize-none placeholder:text-amber-500/30"
                  placeholder="Пометки для себя: откуда взято, версия игры, источник..."
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-2">Модификаторы характеристик <span className="opacity-50 text-xs">(необязательно)</span></label>
                {Object.entries(abilityForm.modifiers).length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {Object.entries(abilityForm.modifiers).map(([key, entry]) => {
                      const isPos = parseFloat(entry.value) >= 0;
                      return (
                        <span key={key} className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-sm font-mono-data ${isPos ? 'bg-blue-900/30 text-blue-400' : 'bg-orange-900/30 text-orange-400'}`}>
                          {STAT_LABELS[key] ?? key}: {isPos ? '+' : ''}{entry.value}{entry.type === 'percent' ? '%' : ''}
                          <button type="button" onClick={() => removeAbilityFormMod(key)} className="opacity-60 hover:opacity-100 ml-0.5"><Icon name="X" size={9} /></button>
                        </span>
                      );
                    })}
                  </div>
                )}
                <div className="flex gap-2">
                  <select value={abilityForm.newModKey} onChange={e => setAbilityForm(f => ({ ...f, newModKey: e.target.value }))} className="flex-1 bg-background border border-border rounded-sm px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                    {statOptions.map(s => <option key={s} value={s}>{STAT_LABELS[s] ?? s}</option>)}
                  </select>
                  <input
                    type="number"
                    value={abilityForm.newModVal}
                    onChange={e => setAbilityForm(f => ({ ...f, newModVal: e.target.value }))}
                    className="w-20 bg-background border border-border rounded-sm px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="±знач."
                  />
                  <button
                    type="button"
                    onClick={() => setAbilityForm(f => ({ ...f, newModType: f.newModType === 'flat' ? 'percent' : 'flat' }))}
                    className={`px-2 py-1.5 text-xs rounded-sm border transition-colors ${abilityForm.newModType === 'percent' ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:border-foreground/40'}`}
                  >
                    {abilityForm.newModType === 'percent' ? '%' : '#'}
                  </button>
                  <button type="button" onClick={addAbilityFormMod} className="px-3 py-1.5 text-xs bg-muted border border-border rounded-sm hover:bg-muted/80 transition-colors whitespace-nowrap">
                    + Добавить
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveAbility}
                  disabled={abilityLoading || !abilityForm.name.trim()}
                  className="flex items-center gap-2 px-4 py-2 text-xs bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  <Icon name={abilityLoading ? 'Loader' : (abilityEditing ? 'Save' : 'Plus')} size={12} className={abilityLoading ? 'animate-spin' : ''} />
                  {abilityEditing ? 'Сохранить' : 'Добавить'}
                </button>
                {abilityEditing && (
                  <button
                    onClick={() => { setAbilityEditing(null); setAbilityForm({ name: '', description: '', adminComment: '', modifiers: {}, newModKey: 'health', newModVal: '', newModType: 'flat' }); }}
                    className="px-4 py-2 text-xs border border-border rounded-sm hover:bg-muted transition-colors"
                  >
                    Отмена
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {abilities.map(a => {
              const modCount = Object.keys(a.statModifiers || {}).length + Object.keys(a.statModifiersEx || {}).length;
              return (
                <div key={a.id} className="bg-card border border-border rounded-sm p-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-foreground">{a.name}</span>
                      {modCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-blue-900/30 text-blue-400 font-mono-data">
                          {modCount} мод.
                        </span>
                      )}
                    </div>
                    {a.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.description}</p>
                    )}
                    {a.adminComment && (
                      <p className="text-xs mt-1 flex items-start gap-1">
                        <Icon name="Lock" size={9} className="text-amber-500/60 mt-0.5 flex-shrink-0" />
                        <span className="text-amber-300/60 italic line-clamp-2">{a.adminComment}</span>
                      </p>
                    )}
                    {modCount > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {Object.entries(a.statModifiers || {}).map(([k, v]) => (
                          <span key={k} className={`text-[10px] px-1 py-0.5 rounded-sm font-mono-data ${(v as number) >= 0 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                            {STAT_LABELS[k] ?? k}: {(v as number) >= 0 ? '+' : ''}{v as number}
                          </span>
                        ))}
                        {Object.entries(a.statModifiersEx || {}).map(([k, ex]) => {
                          const entry = ex as { value: number; type: string };
                          return (
                            <span key={k} className={`text-[10px] px-1 py-0.5 rounded-sm font-mono-data ${entry.value >= 0 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                              {STAT_LABELS[k] ?? k}: {entry.value >= 0 ? '+' : ''}{entry.value}{entry.type === 'percent' ? '%' : ''}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => startEditAbility(a)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-border rounded-sm hover:bg-muted transition-colors"
                    >
                      <Icon name="Pencil" size={11} /> Изменить
                    </button>
                    <button
                      onClick={() => handleDeleteAbility(a)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-destructive/40 text-destructive rounded-sm hover:bg-destructive/10 transition-colors"
                    >
                      <Icon name="Trash2" size={11} /> Удалить
                    </button>
                  </div>
                </div>
              );
            })}
            {abilities.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Умений пока нет</p>
            )}
          </div>
        </div>
      )}

      {/* Moderation Tab */}
      {tab === 'moderation' && (
        <div>
          {moderationLoading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Загрузка...</div>
          ) : (pendingTopics.length + pendingGuides.length) === 0 ? (
            <div className="py-16 text-center">
              <Icon name="CheckCircle" size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm text-muted-foreground">Нет публикаций на проверке</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Темы форума */}
              {pendingTopics.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon name="MessageSquare" size={14} className="text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Темы форума ({pendingTopics.length})
                    </span>
                  </div>
                  <div className="space-y-3">
                    {pendingTopics.map(topic => (
                      <div key={topic.id} className="bg-card border border-border rounded-sm overflow-hidden">
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-foreground mb-1">{topic.title}</div>
                              <div className="text-xs text-muted-foreground mb-2">
                                Автор: <span className="text-foreground">{topic.author}</span> · {new Date(topic.created_at).toLocaleDateString('ru')}
                              </div>
                              {expandedTopic === topic.id && (
                                <div className="text-xs text-muted-foreground leading-relaxed mt-2 mb-3 max-h-40 overflow-y-auto"
                                  dangerouslySetInnerHTML={{ __html: topic.content }} />
                              )}
                              <button onClick={() => setExpandedTopic(expandedTopic === topic.id ? null : topic.id)}
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                                <Icon name={expandedTopic === topic.id ? 'ChevronUp' : 'ChevronDown'} size={11} />
                                {expandedTopic === topic.id ? 'Свернуть' : 'Читать текст'}
                              </button>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <button onClick={() => handlePublishTopic(topic.id, true)}
                                disabled={processingId === `topic-${topic.id}`}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-sm font-semibold transition-all disabled:opacity-40"
                                style={{ background: 'hsl(150 48% 40% / 0.15)', border: '1px solid hsl(150 48% 40% / 0.4)', color: 'hsl(150 48% 60%)' }}>
                                <Icon name={processingId === `topic-${topic.id}` ? 'Loader' : 'Check'} size={12} className={processingId === `topic-${topic.id}` ? 'animate-spin' : ''} /> Одобрить
                              </button>
                              <button onClick={() => handlePublishTopic(topic.id, false)}
                                disabled={processingId === `topic-${topic.id}`}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-sm font-semibold transition-all disabled:opacity-40"
                                style={{ background: 'hsl(355 62% 40% / 0.15)', border: '1px solid hsl(355 62% 40% / 0.4)', color: 'hsl(355 72% 62%)' }}>
                                <Icon name="X" size={12} /> Отклонить
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Гайды */}
              {pendingGuides.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon name="BookOpen" size={14} className="text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Гайды ({pendingGuides.length})
                    </span>
                  </div>
                  <div className="space-y-3">
                    {pendingGuides.map(guide => (
                      <div key={guide.id} className="bg-card border border-border rounded-sm p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-foreground mb-1">{guide.title}</div>
                            <div className="text-xs text-muted-foreground">
                              Автор: <span className="text-foreground">{guide.author}</span> · {new Date(guide.created_at).toLocaleDateString('ru')}
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <button onClick={() => handlePublishGuide(guide.id, true)}
                              disabled={processingId === `guide-${guide.id}`}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-sm font-semibold transition-all disabled:opacity-40"
                              style={{ background: 'hsl(150 48% 40% / 0.15)', border: '1px solid hsl(150 48% 40% / 0.4)', color: 'hsl(150 48% 60%)' }}>
                              <Icon name={processingId === `guide-${guide.id}` ? 'Loader' : 'Check'} size={12} className={processingId === `guide-${guide.id}` ? 'animate-spin' : ''} /> Одобрить
                            </button>
                            <button onClick={() => handlePublishGuide(guide.id, false)}
                              disabled={processingId === `guide-${guide.id}`}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-sm font-semibold transition-all disabled:opacity-40"
                              style={{ background: 'hsl(355 62% 40% / 0.15)', border: '1px solid hsl(355 62% 40% / 0.4)', color: 'hsl(355 72% 62%)' }}>
                              <Icon name="X" size={12} /> Отклонить
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {unitModal.open && (
        <UnitModal unit={unitModal.unit} onSave={handleSaveUnit} onClose={() => setUnitModal({ open: false })} availableRoles={roles} availableFormations={formations} availableTraits={traits} availableAbilities={abilities} />
      )}
      {treatyModal.open && (
        <TreatyModal treaty={treatyModal.treaty} onSave={handleSaveTreaty} onClose={() => setTreatyModal({ open: false })} />
      )}
      {confirmDelete && (
        <ConfirmModal
          name={confirmDelete.name}
          type={confirmDelete.kind === 'unit' ? 'отряд' : 'трактат'}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}