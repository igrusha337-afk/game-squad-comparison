import { useState, useEffect, useCallback, useRef } from 'react';
import { guidesApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/cache';
import RichEditor from '@/components/RichEditor';
import UserAvatar from '@/components/UserAvatar';
import Icon from '@/components/ui/icon';

interface Guide {
  id: number;
  title: string;
  author_id: number;
  author: string;
  author_avatar: string;
  guide_avatar_url: string;
  views: number;
  likes: number;
  dislikes: number;
  user_vote: number | null;
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

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин. назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч. назад`;
  return new Date(iso).toLocaleDateString('ru', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface Props {
  onOpenGuide: (id: number) => void;
  onOpenProfile?: (userId: number) => void;
}

export default function GuidesPage({ onOpenGuide, onOpenProfile }: Props) {
  const { user } = useAuth();
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [avatarFile, setAvatarFile] = useState<{ data: string; type: string } | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [pendingNotice, setPendingNotice] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (force = false) => {
    const cached = cacheGet<Guide[]>('guides');
    if (cached && !force) { setGuides(cached); setLoading(false); return; }
    setLoading(true);
    try {
      const d = await guidesApi.list();
      const list = d.guides || [];
      cacheSet('guides', list);
      setGuides(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    setAvatarPreview(base64);
    setAvatarFile({ data: base64, type: file.type });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Укажите заголовок'); return; }
    const stripped = content.replace(/<[^>]+>/g, '').trim();
    if (!stripped) { setError('Напишите содержимое гайда'); return; }
    setSubmitting(true); setError('');
    try {
      const payload: Parameters<typeof guidesApi.create>[0] = { title: title.trim(), content };
      if (avatarFile) { payload.avatar_file = avatarFile.data; payload.avatar_content_type = avatarFile.type; }
      await guidesApi.create(payload);
      cacheInvalidate('guides');
      setShowForm(false); setTitle(''); setContent(''); setAvatarFile(null); setAvatarPreview(null);
      setPendingNotice(true);
      setTimeout(() => setPendingNotice(false), 6000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (e: React.MouseEvent, guideId: number, vote: 1 | -1) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await guidesApi.vote(guideId, vote);
      cacheInvalidate('guides');
      await load(true);
    } catch { /* ignore */ }
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '2rem', fontWeight: 700, color: 'hsl(38 24% 94%)' }}>Гайды</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Руководства и советы от игроков сообщества</p>
        </div>
        {user && !showForm && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'hsl(42 76% 50% / 0.15)', border: '1px solid hsl(42 76% 50% / 0.4)', color: 'hsl(42 76% 68%)', fontFamily: 'Manrope, sans-serif' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'hsl(42 76% 50% / 0.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'hsl(42 76% 50% / 0.15)'; }}>
            <Icon name="Plus" size={15} /> Написать гайд
          </button>
        )}
      </div>

      {/* Уведомление об отправке на проверку */}
      {pendingNotice && (
        <div className="mb-5 px-5 py-4 rounded-2xl flex items-start gap-3"
          style={{ background: 'hsl(42 76% 50% / 0.1)', border: '1px solid hsl(42 76% 50% / 0.35)' }}>
          <Icon name="Clock" size={18} style={{ color: 'hsl(42 76% 62%)', flexShrink: 0, marginTop: 1 }} />
          <div>
            <div className="font-semibold text-sm mb-0.5" style={{ color: 'hsl(42 76% 72%)', fontFamily: 'Manrope, sans-serif' }}>
              Гайд отправлен на проверку
            </div>
            <div className="text-xs" style={{ color: 'hsl(42 40% 58%)', fontFamily: 'Manrope, sans-serif' }}>
              Модератор рассмотрит его и опубликует в ближайшее время
            </div>
          </div>
          <button onClick={() => setPendingNotice(false)} className="ml-auto" style={{ color: 'hsl(42 40% 52%)' }}>
            <Icon name="X" size={14} />
          </button>
        </div>
      )}

      {/* Форма создания — современный дизайн */}
      {showForm && (
        <div className="mb-6 rounded-2xl overflow-hidden" style={{ background: 'hsl(222 18% 9%)', border: '1px solid hsl(42 76% 50% / 0.25)', boxShadow: '0 8px 32px hsl(222 40% 2% / 0.5)' }}>
          <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid hsl(222 14% 16%)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'hsl(42 76% 50% / 0.15)', border: '1px solid hsl(42 76% 50% / 0.3)' }}>
              <Icon name="BookOpen" size={15} style={{ color: 'hsl(42 76% 68%)' }} />
            </div>
            <span style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.2rem', fontWeight: 600, color: 'hsl(38 24% 92%)' }}>Новый гайд</span>
          </div>
          <form onSubmit={handleCreate} className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-xl text-sm flex items-center gap-2" style={{ background: 'hsl(355 62% 30% / 0.2)', border: '1px solid hsl(355 62% 44% / 0.4)', color: 'hsl(355 72% 68%)', fontFamily: 'Manrope, sans-serif' }}>
                <Icon name="AlertCircle" size={14} /> {error}
              </div>
            )}
            {/* Аватар гайда */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
                style={{ background: avatarPreview ? undefined : 'hsl(222 20% 14%)', border: '2px dashed hsl(42 76% 50% / 0.3)' }}>
                {avatarPreview
                  ? <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                  : <Icon name="Image" size={20} style={{ color: 'hsl(42 76% 50% / 0.4)' }} />}
              </div>
              <div>
                <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                <button type="button" onClick={() => avatarRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all mb-1"
                  style={{ background: 'hsl(222 20% 14%)', border: '1px solid hsl(222 14% 22%)', color: 'hsl(42 50% 58%)', fontFamily: 'Manrope, sans-serif' }}>
                  <Icon name="Upload" size={12} /> {avatarPreview ? 'Заменить аватар' : 'Загрузить аватар гайда'}
                </button>
                <p className="text-[11px]" style={{ color: 'hsl(222 8% 44%)', fontFamily: 'Manrope, sans-serif' }}>JPG, PNG, WebP · до 5 МБ</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'hsl(42 50% 54%)', fontFamily: 'Manrope, sans-serif' }}>Заголовок</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Название гайда..."
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{ background: 'hsl(222 20% 12%)', border: '1px solid hsl(222 14% 22%)', color: 'hsl(38 18% 90%)', fontFamily: 'Manrope, sans-serif' }}
                onFocus={e => e.target.style.borderColor = 'hsl(42 76% 50% / 0.6)'}
                onBlur={e => e.target.style.borderColor = 'hsl(222 14% 22%)'} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'hsl(42 50% 54%)', fontFamily: 'Manrope, sans-serif' }}>Содержимое <span style={{ color: 'hsl(222 8% 44%)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(поддерживаются фото и видео)</span></label>
              <RichEditor value={content} onChange={setContent} placeholder="Напишите подробный гайд..." minHeight={300} />
            </div>
            <div className="flex gap-3 justify-end pt-1">
              <button type="button" onClick={() => { setShowForm(false); setTitle(''); setContent(''); setError(''); setAvatarFile(null); setAvatarPreview(null); }}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: 'transparent', border: '1px solid hsl(222 14% 22%)', color: 'hsl(222 10% 58%)', fontFamily: 'Manrope, sans-serif' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'hsl(222 14% 34%)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'hsl(222 14% 22%)'}>
                Отмена
              </button>
              <button type="submit" disabled={submitting}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, hsl(42 76% 52%), hsl(30 64% 38%))', color: 'hsl(222 30% 10%)', fontFamily: 'Manrope, sans-serif' }}>
                {submitting ? <><Icon name="Loader" size={13} className="animate-spin" /> Публикую...</> : <><Icon name="Send" size={13} /> Опубликовать</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {!user && (
        <div className="rounded-xl p-4 mb-6 text-sm flex items-center gap-3" style={{ background: 'hsl(222 18% 9%)', border: '1px solid hsl(222 14% 18%)', color: 'hsl(222 8% 58%)', fontFamily: 'Manrope, sans-serif' }}>
          <Icon name="LogIn" size={16} />
          Войдите, чтобы писать гайды и оставлять оценки
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
          <Icon name="Loader" size={18} className="animate-spin mr-2" /> Загрузка...
        </div>
      ) : guides.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Icon name="BookOpen" size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Гайдов пока нет. Будьте первым!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {guides.map(g => (
            <div key={g.id} onClick={() => onOpenGuide(g.id)}
              className="cursor-pointer rounded-xl transition-all group"
              style={{ background: 'hsl(222 18% 9%)', border: '1px solid hsl(222 14% 16%)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'hsl(42 76% 50% / 0.25)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'hsl(222 14% 16%)'; }}>
              <div className="p-4 flex items-center gap-3">
                {/* Аватар гайда или автора */}
                <div className="flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden"
                  style={{ background: 'hsl(222 20% 14%)', border: '1px solid hsl(222 14% 20%)' }}
                  onClick={e => { e.stopPropagation(); onOpenProfile?.(g.author_id); }}>
                  {g.guide_avatar_url
                    ? <img src={g.guide_avatar_url} alt="" className="w-full h-full object-cover" />
                    : <UserAvatar username={g.author} avatarUrl={g.author_avatar} size={48} />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm leading-tight truncate group-hover:text-primary transition-colors mb-0.5"
                    style={{ color: 'hsl(38 18% 90%)', fontFamily: 'Manrope, sans-serif' }}>
                    {g.title}
                  </h3>
                  <div className="flex items-center gap-3 text-[11px]" style={{ color: 'hsl(222 8% 52%)' }}>
                    <button className="font-medium hover:text-foreground transition-colors"
                      onClick={e => { e.stopPropagation(); onOpenProfile?.(g.author_id); }}>{g.author}</button>
                    <span>{timeAgo(g.created_at)}</span>
                    <span className="flex items-center gap-1"><Icon name="Eye" size={10} /> {g.views}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <button onClick={e => handleVote(e, g.id, 1)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all"
                    style={{ background: g.user_vote === 1 ? 'hsl(150 48% 40% / 0.2)' : 'hsl(222 14% 14%)', color: g.user_vote === 1 ? 'hsl(150 48% 60%)' : 'hsl(222 8% 52%)', border: `1px solid ${g.user_vote === 1 ? 'hsl(150 48% 40% / 0.4)' : 'hsl(222 14% 20%)'}` }}>
                    <Icon name="ThumbsUp" size={11} /> {g.likes}
                  </button>
                  <button onClick={e => handleVote(e, g.id, -1)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all"
                    style={{ background: g.user_vote === -1 ? 'hsl(355 62% 40% / 0.2)' : 'hsl(222 14% 14%)', color: g.user_vote === -1 ? 'hsl(355 72% 62%)' : 'hsl(222 8% 52%)', border: `1px solid ${g.user_vote === -1 ? 'hsl(355 62% 40% / 0.4)' : 'hsl(222 14% 20%)'}` }}>
                    <Icon name="ThumbsDown" size={11} /> {g.dislikes}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}