import { useState } from 'react';
import { TreatyCategory } from '@/data/types';
import Icon from '@/components/ui/icon';

const inputCls = "w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary";

interface Props {
  categories: TreatyCategory[];
  loading: boolean;
  onCreate: (data: { name: string; description: string; sortOrder: number }) => Promise<void>;
  onUpdate: (id: number, data: { name: string; description: string; sortOrder: number }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export function AdminTabTreatyCategories({ categories, loading, onCreate, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState<TreatyCategory | null>(null);
  const [form, setForm] = useState({ name: '', description: '', sortOrder: 0 });
  const [saving, setSaving] = useState(false);

  const startEdit = (cat: TreatyCategory) => {
    setEditing(cat);
    setForm({ name: cat.name, description: cat.description, sortOrder: cat.sortOrder });
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm({ name: '', description: '', sortOrder: 0 });
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await onUpdate(editing.id, form);
      } else {
        await onCreate(form);
      }
      cancelEdit();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl">
      <div className="bg-card border border-border rounded-sm p-4 mb-4">
        <h4 className="text-xs text-muted-foreground uppercase tracking-widest mb-3">
          {editing ? 'Редактировать категорию' : 'Новая категория'}
        </h4>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Название *</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className={inputCls} placeholder="Например: Атака" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Описание</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2} className={inputCls + ' resize-none'} placeholder="Описание категории..." />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Порядок сортировки</label>
            <input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
              className={inputCls} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !form.name.trim()}
              className="flex items-center gap-2 px-4 py-2 text-xs bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 disabled:opacity-50 transition-colors">
              <Icon name={saving ? 'Loader' : (editing ? 'Save' : 'Plus')} size={12} className={saving ? 'animate-spin' : ''} />
              {editing ? 'Сохранить' : 'Добавить'}
            </button>
            {editing && (
              <button onClick={cancelEdit} className="px-4 py-2 text-xs border border-border rounded-sm hover:bg-muted transition-colors">
                Отмена
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-xs py-4">
          <Icon name="Loader" size={14} className="animate-spin" /> Загрузка...
        </div>
      ) : categories.length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-4">Категорий пока нет. Создайте первую.</p>
      ) : (
        <div className="space-y-2">
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center justify-between bg-card border border-border rounded-sm px-4 py-3">
              <div>
                <p className="text-sm font-medium">{cat.name}</p>
                {cat.description && <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>}
              </div>
              <div className="flex items-center gap-2 ml-4 shrink-0">
                <button onClick={() => startEdit(cat)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                  <Icon name="Pencil" size={13} />
                </button>
                <button onClick={() => onDelete(cat.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                  <Icon name="Trash2" size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
