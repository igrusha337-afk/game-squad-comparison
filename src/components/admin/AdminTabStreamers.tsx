import { useState, useEffect, useCallback } from 'react';
import { streamersApi } from '@/lib/api';
import Icon from '@/components/ui/icon';

interface AdminStreamer {
  id: number;
  twitch_login: string;
  display_name: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export function AdminTabStreamers() {
  const [streamers, setStreamers] = useState<AdminStreamer[]>([]);
  const [loading, setLoading] = useState(true);
  const [login, setLogin] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await streamersApi.adminList();
      setStreamers(d.streamers || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    const cleanLogin = login.trim().replace(/^https?:\/\/(www\.)?twitch\.tv\//i, '').replace(/\/$/, '');
    if (!cleanLogin) { setError('Укажите логин или ссылку на канал'); return; }
    setAdding(true); setError('');
    try {
      await streamersApi.add(cleanLogin, displayName.trim() || undefined);
      setLogin(''); setDisplayName('');
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка добавления');
    } finally {
      setAdding(false);
    }
  };

  const handleToggleActive = async (s: AdminStreamer) => {
    setBusyId(s.id);
    try {
      await streamersApi.update(s.id, { is_active: !s.is_active });
      setStreamers(prev => prev.map(x => x.id === s.id ? { ...x, is_active: !x.is_active } : x));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (s: AdminStreamer) => {
    if (!confirm(`Удалить стримера ${s.display_name}?`)) return;
    setBusyId(s.id);
    try {
      await streamersApi.delete(s.id);
      setStreamers(prev => prev.filter(x => x.id !== s.id));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-xl">
      <p className="text-xs text-muted-foreground mb-4">
        Добавляйте Twitch-каналы стримеров сообщества. Их живой статус подтягивается автоматически с Twitch
        и отображается на сайте (шапка, сайдбар, каталог, страница «Стримеры»).
      </p>

      <div className="bg-card border border-border rounded-sm p-4 mb-4">
        <h4 className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Добавить стримера</h4>
        {error && (
          <div className="mb-3 p-2 bg-destructive/10 border border-destructive/30 text-destructive text-xs rounded-sm">{error}</div>
        )}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Логин или ссылка на канал Twitch *</label>
            <input type="text" value={login} onChange={e => setLogin(e.target.value)}
              className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground"
              placeholder="twitch.tv/username или username" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Отображаемое имя</label>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
              className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground"
              placeholder="Необязательно — по умолчанию логин" />
          </div>
          <button onClick={handleAdd} disabled={adding || !login.trim()}
            className="flex items-center gap-2 px-4 py-2 text-xs bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 disabled:opacity-50">
            <Icon name={adding ? 'Loader' : 'Plus'} size={12} className={adding ? 'animate-spin' : ''} />
            Добавить
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
          <Icon name="Loader" size={18} className="animate-spin mr-2" /> Загрузка...
        </div>
      ) : streamers.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Стримеров пока нет</p>
      ) : (
        <div className="space-y-2">
          {streamers.map(s => (
            <div key={s.id} className="flex items-center gap-3 bg-card border border-border rounded-sm p-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">{s.display_name}</div>
                <a href={`https://twitch.tv/${s.twitch_login}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  twitch.tv/{s.twitch_login}
                </a>
              </div>
              <button onClick={() => handleToggleActive(s)} disabled={busyId === s.id}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-sm border transition-colors disabled:opacity-50 ${s.is_active ? 'border-green-500/40 text-green-500 hover:bg-green-500/10' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                <Icon name={s.is_active ? 'Eye' : 'EyeOff'} size={11} />
                {s.is_active ? 'Показывается' : 'Скрыт'}
              </button>
              <button onClick={() => handleDelete(s)} disabled={busyId === s.id}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-destructive/40 text-destructive rounded-sm hover:bg-destructive/10 disabled:opacity-50">
                <Icon name="Trash2" size={11} /> Удалить
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
