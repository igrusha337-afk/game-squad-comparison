import { useState, useEffect, useCallback, useRef } from 'react';
import { guidesApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import RichEditor from '@/components/RichEditor';
import UserAvatar from '@/components/UserAvatar';
import Icon from '@/components/ui/icon';

interface Guide {
  id: number;
  title: string;
  author_id: number;
  author: string;
  author_avatar: string;
  cover_url: string;
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
  const [coverFile, setCoverFile] = useState<{ data: string; type: string } | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const coverRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await guidesApi.list();
      setGuides(d.guides || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    setCoverPreview(base64);
    setCoverFile({ data: base64, type: file.type });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Укажите заголовок'); return; }
    const stripped = content.replace(/<[^>]+>/g, '').trim();
    if (!stripped) { setError('Напишите содержимое гайда'); return; }
    setSubmitting(true); setError('');
    try {
      const payload: Parameters<typeof guidesApi.create>[0] = { title: title.trim(), content };
      if (coverFile) { payload.cover_file = coverFile.data; payload.cover_content_type = coverFile.type; }
      const res = await guidesApi.create(payload);
      setShowForm(false); setTitle(''); setContent(''); setCoverFile(null); setCoverPreview(null);
      await load();
      onOpenGuide(res.guide_id);
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
      await load();
    } catch { /* ignore */ }
  };

  return (
    <div className="max-w-4xl">
      {/* Шапка */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground mb-1">Гайды</h1>
          <p className="text-muted-foreground text-sm">Руководства и советы от игроков сообщества</p>
        </div>
        {user && !showForm && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-sm hover:bg-primary/90 transition-colors">
            <Icon name="Plus" size={14} /> Написать гайд
          </button>
        )}
      </div>

      {/* Форма создания */}
      {showForm && (
        <div className="bg-card border border-primary/30 rounded-sm p-5 mb-6">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Icon name="PenLine" size={14} className="text-primary" /> Новый гайд
          </h2>
          <form onSubmit={handleCreate} className="space-y-3">
            {error && (
              <div className="p-2 bg-destructive/10 border border-destructive/30 text-destructive text-xs rounded-sm flex items-center gap-2">
                <Icon name="AlertCircle" size={12} /> {error}
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Заголовок *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Название гайда..."
                className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Содержимое * (поддерживается вставка фото и видео)</label>
              <RichEditor value={content} onChange={setContent} placeholder="Напишите подробный гайд..." minHeight={300} />
            </div>
            {/* Обложка */}
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Обложка (необязательно)</label>
              <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => coverRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs border border-border rounded-sm hover:bg-muted transition-colors">
                  <Icon name="Image" size={12} /> {coverPreview ? 'Заменить' : 'Загрузить обложку'}
                </button>
                {coverPreview && (
                  <>
                    <img src={coverPreview} alt="" className="h-8 w-14 object-cover rounded-sm" />
                    <button type="button" onClick={() => { setCoverPreview(null); setCoverFile(null); }}
                      className="text-xs text-muted-foreground hover:text-destructive">удалить</button>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => { setShowForm(false); setTitle(''); setContent(''); setError(''); setCoverFile(null); setCoverPreview(null); }}
                className="px-4 py-2 text-sm border border-border rounded-sm hover:bg-muted transition-colors">
                Отмена
              </button>
              <button type="submit" disabled={submitting}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2">
                {submitting ? <><Icon name="Loader" size={13} className="animate-spin" /> Публикую...</> : 'Опубликовать'}
              </button>
            </div>
          </form>
        </div>
      )}

      {!user && (
        <div className="bg-card border border-border rounded-sm p-4 mb-6 text-sm text-muted-foreground flex items-center gap-3">
          <Icon name="LogIn" size={16} />
          Войдите, чтобы писать гайды и оставлять оценки
        </div>
      )}

      {/* Список гайдов */}
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
        <div className="space-y-3">
          {guides.map(g => (
            <div key={g.id}
              onClick={() => onOpenGuide(g.id)}
              className="bg-card border border-border rounded-sm cursor-pointer hover:border-primary/40 transition-all group overflow-hidden">
              {g.cover_url && (
                <div className="h-32 w-full overflow-hidden">
                  <img src={g.cover_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
              )}
              <div className="p-4 flex gap-3">
                <div className="flex-shrink-0" onClick={e => { e.stopPropagation(); onOpenProfile?.(g.author_id); }}>
                  <UserAvatar username={g.author} avatarUrl={g.author_avatar} size={40} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors leading-tight mb-1 truncate">
                    {g.title}
                  </h3>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <button className="font-medium hover:text-foreground transition-colors"
                      onClick={e => { e.stopPropagation(); onOpenProfile?.(g.author_id); }}>
                      {g.author}
                    </button>
                    <span className="flex items-center gap-1"><Icon name="Clock" size={10} /> {timeAgo(g.created_at)}</span>
                    <span className="flex items-center gap-1"><Icon name="Eye" size={10} /> {g.views}</span>
                  </div>
                </div>
                {/* Лайки */}
                <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={e => handleVote(e, g.id, 1)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-sm text-xs transition-colors ${g.user_vote === 1 ? 'bg-green-500/20 text-green-400' : 'hover:bg-muted text-muted-foreground'}`}>
                    <Icon name="ThumbsUp" size={12} /> {g.likes}
                  </button>
                  <button
                    onClick={e => handleVote(e, g.id, -1)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-sm text-xs transition-colors ${g.user_vote === -1 ? 'bg-red-500/20 text-red-400' : 'hover:bg-muted text-muted-foreground'}`}>
                    <Icon name="ThumbsDown" size={12} /> {g.dislikes}
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
