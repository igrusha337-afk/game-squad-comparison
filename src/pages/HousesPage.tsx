import { useState, useEffect, useCallback, useRef } from 'react';
import { housesApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Icon from '@/components/ui/icon';

const SERVERS = [
  'EU1 Crystal Sea', 'EU2 Pantheon Warhall', 'EU3',
  'EU4 Legion Warhall', 'EU5 Balguksa', 'EU6 Terracotta Vanguard',
  'EU7 Ferrea Corona', 'EU8 Iron Dawn',
];

interface House {
  id: number;
  name: string;
  emblem_url: string;
  short_desc: string;
  server: string;
  owner_id: number;
  owner: string;
  rating_points: number;
  member_count: number;
  created_at: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface Props {
  onOpenHouse: (id: number) => void;
  onOpenProfile?: (userId: number) => void;
}

export default function HousesPage({ onOpenHouse, onOpenProfile }: Props) {
  const { user, updateUser } = useAuth();
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [server, setServer] = useState(SERVERS[0]);
  const [emblemFile, setEmblemFile] = useState<{ data: string; type: string } | null>(null);
  const [emblemPreview, setEmblemPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const emblemRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await housesApi.list();
      setHouses(d.houses || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleEmblemChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    setEmblemPreview(base64);
    setEmblemFile({ data: base64, type: file.type });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Укажите название дома'); return; }
    if (!shortDesc.trim()) { setError('Добавьте краткое описание'); return; }
    setSubmitting(true); setError('');
    try {
      const payload: Parameters<typeof housesApi.create>[0] = { name: name.trim(), short_desc: shortDesc.trim(), server };
      if (emblemFile) { payload.emblem_file = emblemFile.data; payload.emblem_content_type = emblemFile.type; }
      const res = await housesApi.create(payload);
      setShowForm(false); setName(''); setShortDesc(''); setEmblemFile(null); setEmblemPreview(null);
      updateUser({ house_id: res.house_id, house_name: name.trim() });
      await load();
      onOpenHouse(res.house_id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSubmitting(false);
    }
  };

  const medal = (rank: number) => {
    if (rank === 1) return { icon: '🥇', color: 'hsl(42 76% 62%)' };
    if (rank === 2) return { icon: '🥈', color: 'hsl(220 10% 72%)' };
    if (rank === 3) return { icon: '🥉', color: 'hsl(22 60% 58%)' };
    return null;
  };

  const userHasHouse = !!(user?.house_id);
  const canCreate = user && !userHasHouse;

  return (
    <div className="max-w-4xl">
      {/* Шапка */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '2.2rem', fontWeight: 700, color: 'hsl(38 24% 94%)' }}>
            Дома CB
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Боевые братства и их рейтинг активности</p>
        </div>
        {canCreate && !showForm && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'hsl(42 76% 50% / 0.15)', border: '1px solid hsl(42 76% 50% / 0.4)', color: 'hsl(42 76% 68%)', fontFamily: 'Manrope, sans-serif' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'hsl(42 76% 50% / 0.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'hsl(42 76% 50% / 0.15)'; }}>
            <Icon name="Plus" size={15} /> Создать дом
          </button>
        )}
      </div>

      {/* Текущий дом пользователя */}
      {user?.house_id && (
        <div className="mb-4 px-4 py-3 rounded-xl flex items-center gap-3"
          style={{ background: 'hsl(42 76% 50% / 0.08)', border: '1px solid hsl(42 76% 50% / 0.25)' }}>
          <Icon name="Shield" size={16} style={{ color: 'hsl(42 76% 62%)' }} />
          <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: '0.88rem', color: 'hsl(38 18% 80%)' }}>
            Вы состоите в доме <strong style={{ color: 'hsl(42 76% 68%)' }}>[{user.house_name}]</strong>
          </span>
        </div>
      )}

      {/* Форма создания */}
      {showForm && (
        <div className="mb-6 rounded-2xl overflow-hidden" style={{ background: 'hsl(222 18% 9%)', border: '1px solid hsl(42 76% 50% / 0.25)', boxShadow: '0 8px 32px hsl(222 40% 2% / 0.5)' }}>
          <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid hsl(222 14% 16%)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'hsl(42 76% 50% / 0.15)', border: '1px solid hsl(42 76% 50% / 0.3)' }}>
              <Icon name="Shield" size={15} style={{ color: 'hsl(42 76% 68%)' }} />
            </div>
            <span style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.2rem', fontWeight: 600, color: 'hsl(38 24% 92%)' }}>Создать дом</span>
          </div>
          <form onSubmit={handleCreate} className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-xl text-sm flex items-center gap-2"
                style={{ background: 'hsl(355 62% 30% / 0.2)', border: '1px solid hsl(355 62% 44% / 0.4)', color: 'hsl(355 72% 68%)', fontFamily: 'Manrope, sans-serif' }}>
                <Icon name="AlertCircle" size={14} /> {error}
              </div>
            )}
            {/* Герб */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
                style={{ background: emblemPreview ? undefined : 'hsl(222 20% 14%)', border: '2px dashed hsl(42 76% 50% / 0.3)' }}>
                {emblemPreview
                  ? <img src={emblemPreview} alt="" className="w-full h-full object-cover" />
                  : <Icon name="Shield" size={22} style={{ color: 'hsl(42 76% 50% / 0.4)' }} />}
              </div>
              <div>
                <input ref={emblemRef} type="file" accept="image/*" className="hidden" onChange={handleEmblemChange} />
                <button type="button" onClick={() => emblemRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold mb-1"
                  style={{ background: 'hsl(222 20% 14%)', border: '1px solid hsl(222 14% 22%)', color: 'hsl(42 50% 58%)', fontFamily: 'Manrope, sans-serif' }}>
                  <Icon name="Upload" size={12} /> {emblemPreview ? 'Заменить герб' : 'Загрузить герб'}
                </button>
                <p className="text-[11px]" style={{ color: 'hsl(222 8% 44%)', fontFamily: 'Manrope, sans-serif' }}>JPG, PNG, WebP · до 5 МБ</p>
              </div>
            </div>
            {/* Название */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'hsl(42 50% 54%)', fontFamily: 'Manrope, sans-serif' }}>Название дома</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} maxLength={100}
                placeholder="Название вашего дома..."
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{ background: 'hsl(222 20% 12%)', border: '1px solid hsl(222 14% 22%)', color: 'hsl(38 18% 90%)', fontFamily: 'Manrope, sans-serif' }}
                onFocus={e => e.target.style.borderColor = 'hsl(42 76% 50% / 0.6)'}
                onBlur={e => e.target.style.borderColor = 'hsl(222 14% 22%)'} />
            </div>
            {/* Краткое описание */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'hsl(42 50% 54%)', fontFamily: 'Manrope, sans-serif' }}>
                Краткое описание <span style={{ color: 'hsl(222 8% 44%)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(до 200 символов)</span>
              </label>
              <textarea value={shortDesc} onChange={e => setShortDesc(e.target.value)} maxLength={200} rows={3}
                placeholder="Коротко о доме..."
                className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none transition-all"
                style={{ background: 'hsl(222 20% 12%)', border: '1px solid hsl(222 14% 22%)', color: 'hsl(38 18% 90%)', fontFamily: 'Manrope, sans-serif' }}
                onFocus={e => e.target.style.borderColor = 'hsl(42 76% 50% / 0.6)'}
                onBlur={e => e.target.style.borderColor = 'hsl(222 14% 22%)'} />
              <div className="text-right text-[11px] mt-1" style={{ color: 'hsl(222 8% 44%)', fontFamily: 'Manrope, sans-serif' }}>{shortDesc.length}/200</div>
            </div>
            {/* Сервер */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'hsl(42 50% 54%)', fontFamily: 'Manrope, sans-serif' }}>Сервер</label>
              <select value={server} onChange={e => setServer(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ background: 'hsl(222 20% 12%)', border: '1px solid hsl(222 14% 22%)', color: 'hsl(38 18% 90%)', fontFamily: 'Manrope, sans-serif' }}>
                {SERVERS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex gap-3 justify-end pt-1">
              <button type="button" onClick={() => { setShowForm(false); setError(''); setEmblemFile(null); setEmblemPreview(null); }}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'transparent', border: '1px solid hsl(222 14% 22%)', color: 'hsl(222 10% 58%)', fontFamily: 'Manrope, sans-serif' }}>
                Отмена
              </button>
              <button type="submit" disabled={submitting}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, hsl(42 76% 52%), hsl(30 64% 38%))', color: 'hsl(222 30% 10%)', fontFamily: 'Manrope, sans-serif' }}>
                {submitting ? <><Icon name="Loader" size={13} className="animate-spin" /> Создаю...</> : <><Icon name="Shield" size={13} /> Основать дом</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {!user && (
        <div className="rounded-xl p-4 mb-6 text-sm flex items-center gap-3"
          style={{ background: 'hsl(222 18% 9%)', border: '1px solid hsl(222 14% 18%)', color: 'hsl(222 8% 58%)', fontFamily: 'Manrope, sans-serif' }}>
          <Icon name="LogIn" size={16} />
          Войдите, чтобы создать дом или вступить в него
        </div>
      )}

      {/* Список домов */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
          <Icon name="Loader" size={18} className="animate-spin mr-2" /> Загрузка...
        </div>
      ) : houses.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Icon name="Shield" size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Домов пока нет. Основайте первый!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {houses.map((h, idx) => {
            const m = medal(idx + 1);
            return (
              <div key={h.id} onClick={() => onOpenHouse(h.id)}
                className="cursor-pointer rounded-2xl transition-all group"
                style={{ background: 'hsl(222 18% 9%)', border: `1px solid ${idx === 0 ? 'hsl(42 76% 50% / 0.35)' : 'hsl(222 14% 16%)'}` }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'hsl(42 76% 50% / 0.3)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = idx === 0 ? 'hsl(42 76% 50% / 0.35)' : 'hsl(222 14% 16%)'; }}>
                <div className="flex items-center gap-4 p-4">
                  {/* Место */}
                  <div className="w-8 text-center flex-shrink-0">
                    {m ? (
                      <span className="text-xl">{m.icon}</span>
                    ) : (
                      <span className="text-sm font-bold" style={{ color: 'hsl(222 8% 44%)', fontFamily: 'Manrope, sans-serif' }}>#{idx + 1}</span>
                    )}
                  </div>
                  {/* Герб */}
                  <div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
                    style={{ background: 'hsl(222 20% 14%)', border: '1px solid hsl(222 14% 22%)' }}>
                    {h.emblem_url
                      ? <img src={h.emblem_url} alt="" className="w-full h-full object-cover" />
                      : <Icon name="Shield" size={24} style={{ color: 'hsl(42 76% 50% / 0.4)' }} />}
                  </div>
                  {/* Инфо */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <h3 className="font-bold text-sm group-hover:text-primary transition-colors" style={{ color: 'hsl(38 18% 92%)', fontFamily: '"Cormorant Garamond", serif', fontSize: '1.1rem' }}>
                        {h.name}
                      </h3>
                      {h.server && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: 'hsl(210 78% 50% / 0.15)', color: 'hsl(210 78% 68%)', border: '1px solid hsl(210 78% 50% / 0.2)', fontFamily: 'Manrope, sans-serif' }}>
                          {h.server}
                        </span>
                      )}
                    </div>
                    {h.short_desc && (
                      <p className="text-xs leading-relaxed line-clamp-1" style={{ color: 'hsl(222 8% 58%)', fontFamily: 'Manrope, sans-serif' }}>{h.short_desc}</p>
                    )}
                    <div className="flex items-center gap-3 text-[11px] mt-1" style={{ color: 'hsl(222 8% 46%)' }}>
                      <span className="flex items-center gap-1">
                        <button onClick={e => { e.stopPropagation(); onOpenProfile?.(h.owner_id); }} className="hover:text-foreground transition-colors font-medium">
                          {h.owner}
                        </button>
                      </span>
                      <span className="flex items-center gap-1"><Icon name="Users" size={10} /> {h.member_count} участников</span>
                    </div>
                  </div>
                  {/* Рейтинг */}
                  <div className="flex-shrink-0 text-right">
                    <div className="font-bold text-lg" style={{ color: 'hsl(42 76% 62%)', fontFamily: '"Cormorant Garamond", serif' }}>
                      {h.rating_points.toLocaleString('ru')}
                    </div>
                    <div className="text-[10px]" style={{ color: 'hsl(222 8% 46%)', fontFamily: 'Manrope, sans-serif' }}>баллов</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
