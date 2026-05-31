import { useState } from 'react';
import { Rarity, UnitClass, UnitSubtype, TreatyCategory } from '@/data/types';
import { SpecialStatDef, useUnits } from '@/hooks/useAppData';
import Icon from '@/components/ui/icon';
import AvatarUpload from '@/components/AvatarUpload';
import { UNIT_CLASSES, UNIT_SUBTYPES, SUBTYPE_CLASS, RARITIES, RARITY_LABELS, DEFAULT_UNIT_STATS, STAT_LABELS } from './adminConstants';

interface ModifierEntry {
  value: string;
  type: 'flat' | 'percent';
}

function initModifiers(treaty?: Record<string, unknown> | null): Record<string, ModifierEntry> {
  const ex = (treaty?.statModifiersEx as Record<string, { value: number; type: 'flat' | 'percent' }>) || {};
  const flat = (treaty?.statModifiers as Record<string, number>) || {};
  const result: Record<string, ModifierEntry> = {};
  for (const [k, v] of Object.entries(flat)) result[k] = { value: String(v), type: 'flat' };
  for (const [k, v] of Object.entries(ex)) result[k] = { value: String(v.value), type: v.type };
  return result;
}

export function TreatyModal({ treaty, onSave, onClose, categories = [], specialStats = [] }: {
  treaty?: Record<string, unknown> | null;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
  categories?: TreatyCategory[];
  specialStats?: SpecialStatDef[];
}) {
  const editing = !!treaty;
  const { units } = useUnits();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState((treaty?.name as string) || '');
  const [description, setDescription] = useState((treaty?.description as string) || '');
  const [rarity, setRarity] = useState<Rarity>((treaty?.rarity as Rarity) || 'common');
  const [classes, setClasses] = useState<UnitClass[]>((treaty?.compatibleClasses as UnitClass[]) || []);
  const [subtypes, setSubtypes] = useState<UnitSubtype[]>((treaty?.compatibleSubtypes as UnitSubtype[]) || []);
  const [unitIds, setUnitIds] = useState<string[]>((treaty?.compatibleUnitIds as string[]) || []);
  const [unitSearch, setUnitSearch] = useState('');
  const [showUnitPicker, setShowUnitPicker] = useState((treaty?.compatibleUnitIds as string[] || []).length > 0);
  const [avatarUrl, setAvatarUrl] = useState((treaty?.avatar_url as string) || '');
  const [categoryId, setCategoryId] = useState<number | null>((treaty?.categoryId as number | null) ?? null);
  const [modifiers, setModifiers] = useState<Record<string, ModifierEntry>>(initModifiers(treaty));
  const [newModKey, setNewModKey] = useState('health');
  const [newModVal, setNewModVal] = useState('');
  const [newModType, setNewModType] = useState<'flat' | 'percent'>('flat');

  const toggleUnit = (id: string) =>
    setUnitIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const filteredUnits = units.filter(u =>
    u.name.toLowerCase().includes(unitSearch.toLowerCase())
  );

  const inputCls = "w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
  const statOptions = Object.keys(DEFAULT_UNIT_STATS);

  const toggleClass = (cls: UnitClass) => {
    setClasses(prev => prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]);
    setSubtypes(prev => prev.filter(st => SUBTYPE_CLASS[st] !== cls || classes.includes(cls)));
  };
  const toggleSubtype = (st: UnitSubtype) => setSubtypes(prev => prev.includes(st) ? prev.filter(s => s !== st) : [...prev, st]);
  const addModifier = () => {
    if (!newModVal) return;
    setModifiers(prev => ({ ...prev, [newModKey]: { value: newModVal, type: newModType } }));
    setNewModVal('');
  };
  const removeModifier = (key: string) => setModifiers(prev => { const n = { ...prev }; delete n[key]; return n; });
  const toggleModType = (key: string) => setModifiers(prev => ({
    ...prev, [key]: { ...prev[key], type: prev[key].type === 'flat' ? 'percent' : 'flat' }
  }));

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
          if (entry.type === 'percent') statModifiersEx[k] = { value: n, type: 'percent' };
          else statModifiers[k] = n;
        }
      }
      await onSave({ name: name.trim(), description, rarity, compatibleClasses: classes, compatibleSubtypes: subtypes, compatibleUnitIds: unitIds, statModifiers, statModifiersEx, avatar_url: avatarUrl, categoryId });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

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
          <AvatarUpload value={avatarUrl} onChange={setAvatarUrl} aspectRatio="1/1" label="Аватар трактата" folder="treaties" />
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Редкость</label>
            <select value={rarity} onChange={e => setRarity(e.target.value as Rarity)} className={inputCls}>
              {RARITIES.map(r => <option key={r} value={r}>{RARITY_LABELS[r]}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Категория</label>
            <select value={categoryId ?? ''} onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : null)} className={inputCls}>
              <option value="">— без категории —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-2">Совместимые классы</label>
            <div className="flex flex-wrap gap-2">
              {UNIT_CLASSES.map(cls => (
                <button key={cls} type="button" onClick={() => toggleClass(cls)}
                  className={`px-3 py-1.5 text-xs rounded-sm border transition-colors ${classes.includes(cls) ? 'bg-primary/10 border-primary text-primary' : 'border-border text-muted-foreground hover:border-foreground/40'}`}>
                  {cls}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Совместимые подтипы <span className="opacity-50">(опционально — уточняет совместимость)</span></label>
            <div className="flex flex-wrap gap-1.5">
              {UNIT_SUBTYPES.map(st => {
                const cls = SUBTYPE_CLASS[st];
                const classActive = classes.length === 0 || classes.includes(cls);
                return (
                  <button key={st} type="button" onClick={() => toggleSubtype(st)}
                    disabled={!classActive}
                    className={`px-2.5 py-1 text-[11px] rounded-sm border transition-colors disabled:opacity-30 disabled:cursor-not-allowed
                      ${subtypes.includes(st) ? 'bg-primary/10 border-primary text-primary' : 'border-border text-muted-foreground hover:border-foreground/40'}`}>
                    {st}
                  </button>
                );
              })}
            </div>
            {subtypes.length > 0 && (
              <p className="text-[10px] text-muted-foreground mt-1.5">Выбрано: {subtypes.length} подтип(ов). Трактат будет доступен только для этих подтипов.</p>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-muted-foreground">
                Конкретные отряды
                <span className="ml-1.5 opacity-50">(дополнительно к классам/подтипам)</span>
              </label>
              <button type="button" onClick={() => setShowUnitPicker(v => !v)}
                className="text-[10px] text-primary hover:underline">
                {showUnitPicker ? 'Свернуть' : (unitIds.length > 0 ? `Изменить (${unitIds.length})` : '+ Добавить отряды')}
              </button>
            </div>
            {unitIds.length > 0 && !showUnitPicker && (
              <div className="flex flex-wrap gap-1">
                {unitIds.map(id => {
                  const u = units.find(x => x.id === id);
                  return u ? (
                    <span key={id} className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-sm bg-primary/10 border border-primary/30 text-primary">
                      {u.name}
                      <button type="button" onClick={() => toggleUnit(id)} className="opacity-60 hover:opacity-100"><Icon name="X" size={9} /></button>
                    </span>
                  ) : null;
                })}
              </div>
            )}
            {showUnitPicker && (
              <div className="border border-border rounded-sm overflow-hidden">
                <div className="p-2 border-b border-border bg-muted/30">
                  <input
                    type="text"
                    value={unitSearch}
                    onChange={e => setUnitSearch(e.target.value)}
                    placeholder="Поиск отряда..."
                    className="w-full bg-background border border-border rounded-sm px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-border">
                  {filteredUnits.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">Отряды не найдены</p>
                  )}
                  {filteredUnits.map(u => {
                    const selected = unitIds.includes(u.id);
                    return (
                      <button key={u.id} type="button" onClick={() => toggleUnit(u.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-muted/50 ${selected ? 'bg-primary/5' : ''}`}>
                        <div className={`w-3.5 h-3.5 rounded-sm border flex-shrink-0 flex items-center justify-center transition-colors ${selected ? 'bg-primary border-primary' : 'border-border'}`}>
                          {selected && <Icon name="Check" size={9} className="text-primary-foreground" />}
                        </div>
                        {u.avatar_url && (
                          <img src={u.avatar_url} alt="" className="w-5 h-5 rounded-sm object-cover flex-shrink-0 opacity-80" />
                        )}
                        <span className="text-xs text-foreground truncate flex-1">{u.name}</span>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">{u.class}</span>
                      </button>
                    );
                  })}
                </div>
                {unitIds.length > 0 && (
                  <div className="p-2 border-t border-border bg-muted/20 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">Выбрано: {unitIds.length}</span>
                    <button type="button" onClick={() => setUnitIds([])} className="text-[10px] text-destructive hover:underline">Очистить</button>
                  </div>
                )}
              </div>
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-2">Модификаторы характеристик</label>
            {Object.entries(modifiers).length > 0 && (
              <div className="space-y-1.5 mb-3">
                {Object.entries(modifiers).map(([key, entry]) => {
                  const specialLabel = specialStats.find(s => s.key === key)?.label;
                  const displayLabel = STAT_LABELS[key] || specialLabel || key;
                  const isSpecial = !STAT_LABELS[key] && !!specialLabel;
                  return (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <span className={`font-mono-data flex-1 truncate ${isSpecial ? 'text-purple-400' : 'text-muted-foreground'}`}>
                      {isSpecial && <span className="mr-1 opacity-60">✦</span>}{displayLabel}
                    </span>
                    <span className={`font-mono-data font-semibold ${parseFloat(entry.value) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {parseFloat(entry.value) >= 0 ? '+' : ''}{entry.value}{entry.type === 'percent' ? '%' : ''}
                    </span>
                    <button type="button" onClick={() => toggleModType(key)}
                      className={`px-1.5 py-0.5 rounded-sm border text-[10px] transition-colors ${entry.type === 'percent' ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:border-foreground/40'}`}>
                      {entry.type === 'percent' ? '%' : '#'}
                    </button>
                    <button type="button" onClick={() => removeModifier(key)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Icon name="X" size={12} />
                    </button>
                  </div>
                  );
                })}
              </div>
            )}
            <div className="flex gap-2">
              <select value={newModKey} onChange={e => setNewModKey(e.target.value)} className="flex-1 bg-background border border-border rounded-sm px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <optgroup label="Стандартные">
                  {statOptions.map(s => <option key={s} value={s}>{STAT_LABELS[s] || s}</option>)}
                </optgroup>
                {specialStats.length > 0 && (
                  <optgroup label="✦ Особые">
                    {specialStats.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </optgroup>
                )}
              </select>
              <input type="number" value={newModVal} onChange={e => setNewModVal(e.target.value)}
                className="w-20 bg-background border border-border rounded-sm px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="±знач." />
              <button type="button" onClick={() => setNewModType(t => t === 'flat' ? 'percent' : 'flat')}
                className={`px-2 py-1.5 text-xs rounded-sm border transition-colors ${newModType === 'percent' ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:border-foreground/40'}`}>
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