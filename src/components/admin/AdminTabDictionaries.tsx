import { useState, useMemo } from 'react';
import { UnitRoleDef, TraitDef, AbilityDef, SpecialStatDef } from '@/hooks/useAppData';
import { Formation, TraitColor } from '@/data/types';
import Icon from '@/components/ui/icon';
import AvatarUpload from '@/components/AvatarUpload';
import { STAT_LABELS, DEFAULT_UNIT_STATS } from './AdminModals';
import { ALL_STATS } from '@/data/statGroups';
import { AdminSearchInput } from './AdminSearchInput';

const statOptions = Object.keys(DEFAULT_UNIT_STATS);
const statOptionsAll = ALL_STATS.map(s => s.key);

// ── Roles Tab ──
interface AdminTabRolesProps {
  roles: UnitRoleDef[];
  roleForm: { name: string; description: string };
  roleEditing: UnitRoleDef | null;
  roleLoading: boolean;
  onFormChange: (form: { name: string; description: string }) => void;
  onSave: () => void;
  onEdit: (role: UnitRoleDef) => void;
  onDelete: (role: UnitRoleDef) => void;
  onCancelEdit: () => void;
}

export function AdminTabRoles({ roles, roleForm, roleEditing, roleLoading, onFormChange, onSave, onEdit, onDelete, onCancelEdit }: AdminTabRolesProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter(r =>
      r.name.toLowerCase().includes(q) ||
      (r.description ?? '').toLowerCase().includes(q)
    );
  }, [roles, search]);

  return (
    <div className="max-w-xl">
      <div className="bg-card border border-border rounded-sm p-4 mb-4">
        <h4 className="text-xs text-muted-foreground uppercase tracking-widest mb-3">
          {roleEditing ? 'Редактировать роль' : 'Новая роль'}
        </h4>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Название *</label>
            <input type="text" value={roleForm.name} onChange={e => onFormChange({ ...roleForm, name: e.target.value })}
              className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Например: Осада" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Описание (для тултипа)</label>
            <textarea value={roleForm.description} onChange={e => onFormChange({ ...roleForm, description: e.target.value })}
              rows={2}
              className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              placeholder="Что умеет этот тип отряда..." />
          </div>
          <div className="flex gap-2">
            <button onClick={onSave} disabled={roleLoading || !roleForm.name.trim()}
              className="flex items-center gap-2 px-4 py-2 text-xs bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 disabled:opacity-50 transition-colors">
              <Icon name={roleLoading ? 'Loader' : (roleEditing ? 'Save' : 'Plus')} size={12} className={roleLoading ? 'animate-spin' : ''} />
              {roleEditing ? 'Сохранить' : 'Добавить'}
            </button>
            {roleEditing && (
              <button onClick={onCancelEdit} className="px-4 py-2 text-xs border border-border rounded-sm hover:bg-muted transition-colors">
                Отмена
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="mb-3">
        <AdminSearchInput value={search} onChange={setSearch} placeholder="Поиск по названию, описанию..." />
      </div>
      <div className="space-y-2">
        {filtered.map(role => (
          <div key={role.id} className="bg-card border border-border rounded-sm p-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground">{role.name}</div>
              {role.description && <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={() => onEdit(role)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-border rounded-sm hover:bg-muted transition-colors">
                <Icon name="Pencil" size={11} /> Изменить
              </button>
              <button onClick={() => onDelete(role)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-destructive/40 text-destructive rounded-sm hover:bg-destructive/10 transition-colors">
                <Icon name="Trash2" size={11} /> Удалить
              </button>
            </div>
          </div>
        ))}
        {roles.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Ролей пока нет</p>}
        {roles.length > 0 && filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Ничего не найдено</p>}
      </div>
    </div>
  );
}

// ── Formations Tab ──
interface AdminTabFormationsProps {
  formations: Formation[];
  formationForm: { name: string; description: string; avatar_url: string };
  formationEditing: Formation | null;
  formationLoading: boolean;
  onFormChange: (form: { name: string; description: string; avatar_url: string }) => void;
  onSave: () => void;
  onEdit: (f: Formation) => void;
  onDelete: (f: Formation) => void;
  onCancelEdit: () => void;
}

export function AdminTabFormations({ formations, formationForm, formationEditing, formationLoading, onFormChange, onSave, onEdit, onDelete, onCancelEdit }: AdminTabFormationsProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return formations;
    return formations.filter(f =>
      f.name.toLowerCase().includes(q) ||
      (f.description ?? '').toLowerCase().includes(q)
    );
  }, [formations, search]);

  return (
    <div className="max-w-xl">
      <div className="bg-card border border-border rounded-sm p-4 mb-4">
        <h4 className="text-xs text-muted-foreground uppercase tracking-widest mb-3">
          {formationEditing ? 'Редактировать построение' : 'Новое построение'}
        </h4>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Название *</label>
            <input type="text" value={formationForm.name} onChange={e => onFormChange({ ...formationForm, name: e.target.value })}
              className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Например: Черепаха" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Описание (для тултипа)</label>
            <textarea value={formationForm.description} onChange={e => onFormChange({ ...formationForm, description: e.target.value })}
              rows={3}
              className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              placeholder="Описание тактики и преимуществ построения..." />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Аватарка</label>
            <AvatarUpload value={formationForm.avatar_url} onChange={url => onFormChange({ ...formationForm, avatar_url: url })}
              aspectRatio="1/1" label="Иконка построения" folder="formations" />
          </div>
          <div className="flex gap-2">
            <button onClick={onSave} disabled={formationLoading || !formationForm.name.trim()}
              className="flex items-center gap-2 px-4 py-2 text-xs bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 disabled:opacity-50 transition-colors">
              <Icon name={formationLoading ? 'Loader' : (formationEditing ? 'Save' : 'Plus')} size={12} className={formationLoading ? 'animate-spin' : ''} />
              {formationEditing ? 'Сохранить' : 'Добавить'}
            </button>
            {formationEditing && (
              <button onClick={onCancelEdit} className="px-4 py-2 text-xs border border-border rounded-sm hover:bg-muted transition-colors">
                Отмена
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="mb-3">
        <AdminSearchInput value={search} onChange={setSearch} placeholder="Поиск по названию, описанию..." />
      </div>
      <div className="space-y-2">
        {filtered.map(f => (
          <div key={f.id} className="bg-card border border-border rounded-sm p-3 flex items-start gap-3">
            {f.avatar_url && <img src={f.avatar_url} alt={f.name} className="w-10 h-10 rounded-sm object-cover flex-shrink-0 border border-border" />}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground">{f.name}</div>
              {f.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{f.description}</p>}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={() => onEdit(f)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-border rounded-sm hover:bg-muted transition-colors">
                <Icon name="Pencil" size={11} /> Изменить
              </button>
              <button onClick={() => onDelete(f)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-destructive/40 text-destructive rounded-sm hover:bg-destructive/10 transition-colors">
                <Icon name="Trash2" size={11} /> Удалить
              </button>
            </div>
          </div>
        ))}
        {formations.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Построений пока нет</p>}
        {formations.length > 0 && filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Ничего не найдено</p>}
      </div>
    </div>
  );
}

// ── Traits Tab ──
interface AdminTabTraitsProps {
  traits: TraitDef[];
  traitForm: { name: string; description: string; adminComment: string; color: TraitColor };
  traitEditing: TraitDef | null;
  traitLoading: boolean;
  onFormChange: (form: { name: string; description: string; adminComment: string; color: TraitColor }) => void;
  onSave: () => void;
  onEdit: (t: TraitDef) => void;
  onDelete: (t: TraitDef) => void;
  onCancelEdit: () => void;
}

export function AdminTabTraits({ traits, traitForm, traitEditing, traitLoading, onFormChange, onSave, onEdit, onDelete, onCancelEdit }: AdminTabTraitsProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return traits;
    return traits.filter(t =>
      t.name.toLowerCase().includes(q) ||
      (t.description ?? '').toLowerCase().includes(q)
    );
  }, [traits, search]);

  return (
    <div className="max-w-xl">
      <div className="bg-card border border-border rounded-sm p-4 mb-4">
        <h4 className="text-xs text-muted-foreground uppercase tracking-widest mb-3">
          {traitEditing ? 'Редактировать особенность' : 'Новая особенность'}
        </h4>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Название *</label>
            <input type="text" value={traitForm.name} onChange={e => onFormChange({ ...traitForm, name: e.target.value })}
              className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Например: Бронированный" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Описание</label>
            <textarea value={traitForm.description} onChange={e => onFormChange({ ...traitForm, description: e.target.value })}
              rows={2}
              className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              placeholder="Что означает эта особенность..." />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Тип</label>
            <div className="flex gap-2">
              {(['green', 'gray', 'red'] as TraitColor[]).map(c => (
                <button key={c} type="button" onClick={() => onFormChange({ ...traitForm, color: c })}
                  className={`px-3 py-1.5 text-xs rounded-sm border transition-colors ${
                    traitForm.color === c
                      ? c === 'green' ? 'bg-green-900/30 border-green-500 text-green-400'
                        : c === 'red' ? 'bg-red-900/30 border-red-500 text-red-400'
                        : 'bg-muted border-foreground/40 text-foreground'
                      : 'border-border text-muted-foreground hover:border-foreground/40'
                  }`}>
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
            <textarea value={traitForm.adminComment} onChange={e => onFormChange({ ...traitForm, adminComment: e.target.value })}
              rows={2}
              className="w-full bg-amber-950/20 border border-amber-500/20 rounded-sm px-3 py-2 text-sm text-amber-200/80 focus:outline-none focus:ring-1 focus:ring-amber-500/40 resize-none placeholder:text-amber-500/30"
              placeholder="Пометки для себя: откуда взято, версия игры, источник..." />
          </div>
          <div className="flex gap-2">
            <button onClick={onSave} disabled={traitLoading || !traitForm.name.trim()}
              className="flex items-center gap-2 px-4 py-2 text-xs bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 disabled:opacity-50 transition-colors">
              <Icon name={traitLoading ? 'Loader' : (traitEditing ? 'Save' : 'Plus')} size={12} className={traitLoading ? 'animate-spin' : ''} />
              {traitEditing ? 'Сохранить' : 'Добавить'}
            </button>
            {traitEditing && (
              <button onClick={onCancelEdit} className="px-4 py-2 text-xs border border-border rounded-sm hover:bg-muted transition-colors">
                Отмена
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="mb-3">
        <AdminSearchInput value={search} onChange={setSearch} placeholder="Поиск по названию, описанию..." />
      </div>
      <div className="space-y-2">
        {filtered.map(t => (
          <div key={t.id} className="bg-card border border-border rounded-sm p-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${t.color === 'green' ? 'text-green-400' : t.color === 'red' ? 'text-red-400' : 'text-foreground'}`}>{t.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-sm ${t.color === 'green' ? 'bg-green-900/30 text-green-400' : t.color === 'red' ? 'bg-red-900/30 text-red-400' : 'bg-muted text-muted-foreground'}`}>
                  {t.color === 'green' ? 'Положительная' : t.color === 'red' ? 'Негативная' : 'Нейтральная'}
                </span>
              </div>
              {t.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t.description}</p>}
              {t.adminComment && (
                <p className="text-xs mt-1 flex items-start gap-1">
                  <Icon name="Lock" size={9} className="text-amber-500/60 mt-0.5 flex-shrink-0" />
                  <span className="text-amber-300/60 italic line-clamp-2">{t.adminComment}</span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={() => onEdit(t)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-border rounded-sm hover:bg-muted transition-colors">
                <Icon name="Pencil" size={11} /> Изменить
              </button>
              <button onClick={() => onDelete(t)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-destructive/40 text-destructive rounded-sm hover:bg-destructive/10 transition-colors">
                <Icon name="Trash2" size={11} /> Удалить
              </button>
            </div>
          </div>
        ))}
        {traits.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Особенностей пока нет</p>}
        {traits.length > 0 && filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Ничего не найдено</p>}
      </div>
    </div>
  );
}

// ── Abilities Tab ──
type AbilityFormState = {
  name: string;
  description: string;
  adminComment: string;
  modifiers: Record<string, { value: string; type: 'flat' | 'percent' }>;
  newModKey: string;
  newModVal: string;
  newModType: 'flat' | 'percent';
};

interface AdminTabAbilitiesProps {
  abilities: AbilityDef[];
  abilityForm: AbilityFormState;
  abilityEditing: AbilityDef | null;
  abilityLoading: boolean;
  onFormChange: (form: AbilityFormState) => void;
  onSave: () => void;
  onEdit: (a: AbilityDef) => void;
  onDelete: (a: AbilityDef) => void;
  onCancelEdit: () => void;
  onAddMod: () => void;
  onRemoveMod: (key: string) => void;
}

export function AdminTabAbilities({ abilities, abilityForm, abilityEditing, abilityLoading, onFormChange, onSave, onEdit, onDelete, onCancelEdit, onAddMod, onRemoveMod }: AdminTabAbilitiesProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return abilities;
    return abilities.filter(a =>
      a.name.toLowerCase().includes(q) ||
      (a.description ?? '').toLowerCase().includes(q)
    );
  }, [abilities, search]);

  return (
    <div className="max-w-xl">
      <div className="bg-card border border-border rounded-sm p-4 mb-4">
        <h4 className="text-xs text-muted-foreground uppercase tracking-widest mb-3">
          {abilityEditing ? 'Редактировать умение' : 'Новое умение'}
        </h4>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Название *</label>
            <input type="text" value={abilityForm.name} onChange={e => onFormChange({ ...abilityForm, name: e.target.value })}
              className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Например: Лес копий" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Описание</label>
            <textarea value={abilityForm.description} onChange={e => onFormChange({ ...abilityForm, description: e.target.value })}
              rows={3}
              className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              placeholder="Опишите механику умения..." />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5 flex items-center gap-1.5">
              <Icon name="Lock" size={10} className="text-amber-500/70" />
              <span>Заметка <span className="opacity-50">(только для вас)</span></span>
            </label>
            <textarea value={abilityForm.adminComment} onChange={e => onFormChange({ ...abilityForm, adminComment: e.target.value })}
              rows={2}
              className="w-full bg-amber-950/20 border border-amber-500/20 rounded-sm px-3 py-2 text-sm text-amber-200/80 focus:outline-none focus:ring-1 focus:ring-amber-500/40 resize-none placeholder:text-amber-500/30"
              placeholder="Пометки для себя: откуда взято, версия игры, источник..." />
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
                      <button type="button" onClick={() => onRemoveMod(key)} className="opacity-60 hover:opacity-100 ml-0.5"><Icon name="X" size={9} /></button>
                    </span>
                  );
                })}
              </div>
            )}
            <div className="flex gap-2">
              <select value={abilityForm.newModKey} onChange={e => onFormChange({ ...abilityForm, newModKey: e.target.value })}
                className="flex-1 bg-background border border-border rounded-sm px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                {statOptionsAll.map(s => <option key={s} value={s}>{STAT_LABELS[s] ?? s}</option>)}
              </select>
              <input type="number" value={abilityForm.newModVal} onChange={e => onFormChange({ ...abilityForm, newModVal: e.target.value })}
                className="w-20 bg-background border border-border rounded-sm px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="±знач." />
              <button type="button" onClick={() => onFormChange({ ...abilityForm, newModType: abilityForm.newModType === 'flat' ? 'percent' : 'flat' })}
                className={`px-2 py-1.5 text-xs rounded-sm border transition-colors ${abilityForm.newModType === 'percent' ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:border-foreground/40'}`}>
                {abilityForm.newModType === 'percent' ? '%' : '#'}
              </button>
              <button type="button" onClick={onAddMod} className="px-3 py-1.5 text-xs bg-muted border border-border rounded-sm hover:bg-muted/80 transition-colors whitespace-nowrap">
                + Добавить
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onSave} disabled={abilityLoading || !abilityForm.name.trim()}
              className="flex items-center gap-2 px-4 py-2 text-xs bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 disabled:opacity-50 transition-colors">
              <Icon name={abilityLoading ? 'Loader' : (abilityEditing ? 'Save' : 'Plus')} size={12} className={abilityLoading ? 'animate-spin' : ''} />
              {abilityEditing ? 'Сохранить' : 'Добавить'}
            </button>
            {abilityEditing && (
              <button onClick={onCancelEdit} className="px-4 py-2 text-xs border border-border rounded-sm hover:bg-muted transition-colors">
                Отмена
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="mb-3">
        <AdminSearchInput value={search} onChange={setSearch} placeholder="Поиск по названию, описанию..." />
      </div>
      <div className="space-y-2">
        {filtered.map(a => {
          const modCount = Object.keys(a.statModifiers || {}).length + Object.keys(a.statModifiersEx || {}).length;
          return (
            <div key={a.id} className="bg-card border border-border rounded-sm p-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-foreground">{a.name}</span>
                  {modCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-blue-900/30 text-blue-400 font-mono-data">{modCount} мод.</span>
                  )}
                </div>
                {a.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.description}</p>}
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
                <button onClick={() => onEdit(a)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-border rounded-sm hover:bg-muted transition-colors">
                  <Icon name="Pencil" size={11} /> Изменить
                </button>
                <button onClick={() => onDelete(a)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-destructive/40 text-destructive rounded-sm hover:bg-destructive/10 transition-colors">
                  <Icon name="Trash2" size={11} /> Удалить
                </button>
              </div>
            </div>
          );
        })}
        {abilities.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Умений пока нет</p>}
        {abilities.length > 0 && filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Ничего не найдено</p>}
      </div>
    </div>
  );
}

export type { AbilityFormState };
export { statOptions };

// ── Special Stats Tab ──
export interface SpecialStatForm {
  key: string;
  label: string;
  maxValue: string;
  sortOrder: string;
}

interface AdminTabSpecialStatsProps {
  specialStats: SpecialStatDef[];
  form: SpecialStatForm;
  editing: SpecialStatDef | null;
  loading: boolean;
  onFormChange: (form: SpecialStatForm) => void;
  onSave: () => void;
  onEdit: (s: SpecialStatDef) => void;
  onDelete: (s: SpecialStatDef) => void;
  onCancelEdit: () => void;
}

const inputCls = 'w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary';

export function AdminTabSpecialStats({ specialStats, form, editing, loading, onFormChange, onSave, onEdit, onDelete, onCancelEdit }: AdminTabSpecialStatsProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return specialStats;
    return specialStats.filter(s =>
      s.label.toLowerCase().includes(q) ||
      s.key.toLowerCase().includes(q)
    );
  }, [specialStats, search]);

  return (
    <div className="max-w-xl">
      <div className="bg-card border border-border rounded-sm p-4 mb-4">
        <h4 className="text-xs text-muted-foreground uppercase tracking-widest mb-3">
          {editing ? 'Редактировать характеристику' : 'Новая характеристика'}
        </h4>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">
                Ключ <span className="opacity-50">(camelCase, латиница)</span>
              </label>
              <input
                type="text"
                value={form.key}
                onChange={e => onFormChange({ ...form, key: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                disabled={!!editing}
                className={inputCls + (editing ? ' opacity-50 cursor-not-allowed' : '')}
                placeholder="shootingSpeed"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Название</label>
              <input type="text" value={form.label} onChange={e => onFormChange({ ...form, label: e.target.value })}
                className={inputCls} placeholder="Скорость стрельбы" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Максимум (для шкалы)</label>
              <input type="number" value={form.maxValue} onChange={e => onFormChange({ ...form, maxValue: e.target.value })}
                className={inputCls} placeholder="1000" min={1} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Порядок сортировки</label>
              <input type="number" value={form.sortOrder} onChange={e => onFormChange({ ...form, sortOrder: e.target.value })}
                className={inputCls} placeholder="0" />
            </div>
          </div>
          <div className="p-3 rounded-sm bg-purple-900/10 border border-purple-500/20 text-xs text-purple-300/70">
            Ключ используется в модификаторах трактатов. После создания ключ нельзя изменить.
          </div>
          <div className="flex gap-2">
            <button onClick={onSave} disabled={loading || !form.key.trim() || !form.label.trim()}
              className="flex items-center gap-2 px-4 py-2 text-xs bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 disabled:opacity-50 transition-colors">
              <Icon name={loading ? 'Loader' : (editing ? 'Save' : 'Plus')} size={12} className={loading ? 'animate-spin' : ''} />
              {editing ? 'Сохранить' : 'Добавить'}
            </button>
            {editing && (
              <button onClick={onCancelEdit} className="px-4 py-2 text-xs border border-border rounded-sm hover:bg-muted transition-colors">
                Отмена
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mb-3">
        <AdminSearchInput value={search} onChange={setSearch} placeholder="Поиск по названию, ключу..." />
      </div>

      <div className="space-y-2">
        {filtered.map(s => (
          <div key={s.id} className="bg-card border border-border rounded-sm p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-medium text-foreground">{s.label}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-purple-900/30 text-purple-400 font-mono-data">{s.key}</span>
              </div>
              <p className="text-xs text-muted-foreground">Макс: {s.maxValue} · Порядок: {s.sortOrder}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={() => onEdit(s)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-border rounded-sm hover:bg-muted transition-colors">
                <Icon name="Pencil" size={11} /> Изменить
              </button>
              <button onClick={() => onDelete(s)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-destructive/40 text-destructive rounded-sm hover:bg-destructive/10 transition-colors">
                <Icon name="Trash2" size={11} /> Удалить
              </button>
            </div>
          </div>
        ))}
        {specialStats.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Особых характеристик пока нет</p>}
        {specialStats.length > 0 && filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Ничего не найдено</p>}
      </div>
    </div>
  );
}