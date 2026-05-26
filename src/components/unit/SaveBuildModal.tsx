import { useState } from 'react';
import { buildsApi } from '@/lib/api';
import { Treaty } from '@/data/types';
import Icon from '@/components/ui/icon';
import RarityBadge from '@/components/RarityBadge';

interface SaveBuildModalProps {
  unitId: string;
  unitName: string;
  treaties: Treaty[];
  onClose: () => void;
}

export default function SaveBuildModal({ unitId, unitName, treaties, onClose }: SaveBuildModalProps) {
  const [title, setTitle] = useState(`Сборка для ${unitName}`);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const shareUrl = savedId ? `${window.location.origin}/build/${savedId}` : '';

  const handleSave = async () => {
    if (!title.trim()) { setError('Укажите название сборки'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await buildsApi.create({
        unitId,
        treatyIds: treaties.map(t => t.id),
        title: title.trim(),
        description: description.trim(),
      });
      setSavedId(res.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inputCls = "w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
      <div className="bg-card border border-border rounded-sm w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Icon name="Bookmark" size={14} className="text-primary" />
            Сохранить сборку
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="X" size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Трактаты */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Трактаты в сборке ({treaties.length}):</p>
            <div className="flex flex-wrap gap-1.5">
              {treaties.map(t => (
                <div key={t.id} className={`flex items-center gap-1.5 border border-rarity-${t.rarity} rounded-sm px-2 py-1`}>
                  {t.avatar_url && <img src={t.avatar_url} alt="" className="w-4 h-4 rounded-sm object-cover" />}
                  <span className="text-xs text-foreground">{t.name}</span>
                  <RarityBadge rarity={t.rarity} />
                </div>
              ))}
            </div>
          </div>

          {!savedId ? (
            <>
              {error && (
                <div className="p-3 rounded-sm bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                  <Icon name="AlertCircle" size={12} /> {error}
                </div>
              )}
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Название *</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={inputCls} maxLength={200} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Описание (необязательно)</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  className={inputCls + ' resize-none'} rows={2} maxLength={500} />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={handleSave} disabled={saving || !title.trim()}
                  className="flex items-center gap-2 px-4 py-2 text-xs bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  <Icon name={saving ? 'Loader' : 'Bookmark'} size={12} className={saving ? 'animate-spin' : ''} />
                  {saving ? 'Сохраняем...' : 'Сохранить и получить ссылку'}
                </button>
                <button onClick={onClose} className="px-4 py-2 text-xs border border-border rounded-sm hover:bg-muted transition-colors">
                  Отмена
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-sm bg-green-900/20 border border-green-500/30 text-green-400 text-xs flex items-center gap-2">
                <Icon name="CheckCircle" size={12} /> Сборка сохранена! Поделитесь ссылкой:
              </div>
              <div className="flex gap-2">
                <input readOnly value={shareUrl} className={inputCls + ' text-xs font-mono'} onClick={e => (e.target as HTMLInputElement).select()} />
                <button onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs border border-border rounded-sm hover:bg-muted transition-colors whitespace-nowrap">
                  <Icon name={copied ? 'Check' : 'Copy'} size={12} className={copied ? 'text-green-400' : ''} />
                  {copied ? 'Скопировано!' : 'Копировать'}
                </button>
              </div>
              <button onClick={onClose} className="w-full px-4 py-2 text-xs border border-border rounded-sm hover:bg-muted transition-colors">
                Закрыть
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
