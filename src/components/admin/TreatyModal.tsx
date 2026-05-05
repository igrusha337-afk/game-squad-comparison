import { useState } from 'react';
import { Rarity, UnitClass } from '@/data/types';
import Icon from '@/components/ui/icon';
import AvatarUpload from '@/components/AvatarUpload';
import { UNIT_CLASSES, RARITIES, RARITY_LABELS, DEFAULT_UNIT_STATS, STAT_LABELS } from './adminConstants';

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

export function TreatyModal({ treaty, onSave, onClose }: {
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
  const statOptions = Object.keys(DEFAULT_UNIT_STATS);

  const toggleClass = (cls: UnitClass) => setClasses(prev => prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]);
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
      await onSave({ name: name.trim(), description, rarity, compatibleClasses: classes, statModifiers, statModifiersEx, avatar_url: avatarUrl });
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
            <label className="text-xs text-muted-foreground block mb-2">Модификаторы характеристик</label>
            {Object.entries(modifiers).length > 0 && (
              <div className="space-y-1.5 mb-3">
                {Object.entries(modifiers).map(([key, entry]) => (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground font-mono-data flex-1 truncate">{STAT_LABELS[key] || key}</span>
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
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <select value={newModKey} onChange={e => setNewModKey(e.target.value)} className="flex-1 bg-background border border-border rounded-sm px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                {statOptions.map(s => <option key={s} value={s}>{STAT_LABELS[s] || s}</option>)}
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
