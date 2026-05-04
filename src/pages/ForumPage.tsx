import { useState, useEffect, useCallback } from 'react';
import { forumApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import RichEditor from '@/components/RichEditor';
import UserAvatar from '@/components/UserAvatar';
import Icon from '@/components/ui/icon';

interface Topic {
  id: number; title: string; content: string;
  author_id: number; author: string; author_avatar?: string; author_house_name?: string;
  views: number; is_pinned: boolean; is_locked: boolean;
  created_at: string; updated_at: string; post_count: number;
  likes: number; dislikes: number; user_vote: number | null;
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин. назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч. назад`;
  return new Date(iso).toLocaleDateString('ru');
}

interface ForumPageProps {
  onOpenTopic: (id: number) => void;
  onOpenProfile?: (userId: number) => void;
}

export default function ForumPage({ onOpenTopic, onOpenProfile }: ForumPageProps) {
  const { user } = useAuth();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleVote = async (e: React.MouseEvent, topicId: number, vote: 1 | -1) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await forumApi.voteTopic(topicId, vote);
      const data = await forumApi.getTopics();
      setTopics(data.topics || []);
    } catch { /* ignore */ }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await forumApi.getTopics();
      setTopics(data.topics || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Укажите заголовок'); return; }
    const stripped = content.replace(/<[^>]+>/g, '').trim();
    if (!stripped) { setError('Напишите содержимое темы'); return; }
    setSubmitting(true); setError('');
    try {
      const res = await forumApi.createTopic(title.trim(), content);
      setShowForm(false); setTitle(''); setContent('');
      await load();
      onOpenTopic(res.topic_id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl">
      {/* Шапка */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '2rem', fontWeight: 700, color: 'hsl(38 24% 94%)' }}>Форум</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Обсуждения, стратегии и советы сообщества</p>
        </div>
        {user && !showForm && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'hsl(42 76% 50% / 0.15)', border: '1px solid hsl(42 76% 50% / 0.4)', color: 'hsl(42 76% 68%)', fontFamily: 'Manrope, sans-serif' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'hsl(42 76% 50% / 0.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'hsl(42 76% 50% / 0.15)'; }}>
            <Icon name="Plus" size={15} /> Новая тема
          </button>
        )}
      </div>

      {/* Форма создания темы — современный дизайн */}
      {showForm && (
        <div className="mb-6 rounded-2xl overflow-hidden" style={{ background: 'hsl(222 18% 9%)', border: '1px solid hsl(42 76% 50% / 0.25)', boxShadow: '0 8px 32px hsl(222 40% 2% / 0.5)' }}>
          <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid hsl(222 14% 16%)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'hsl(42 76% 50% / 0.15)', border: '1px solid hsl(42 76% 50% / 0.3)' }}>
              <Icon name="PenLine" size={15} style={{ color: 'hsl(42 76% 68%)' }} />
            </div>
            <span style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.2rem', fontWeight: 600, color: 'hsl(38 24% 92%)' }}>Новая тема</span>
          </div>
          <form onSubmit={handleCreate} className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-xl text-sm flex items-center gap-2" style={{ background: 'hsl(355 62% 30% / 0.2)', border: '1px solid hsl(355 62% 44% / 0.4)', color: 'hsl(355 72% 68%)', fontFamily: 'Manrope, sans-serif' }}>
                <Icon name="AlertCircle" size={14} /> {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'hsl(42 50% 54%)', fontFamily: 'Manrope, sans-serif' }}>Заголовок</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="О чём хотите поговорить?"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{ background: 'hsl(222 20% 12%)', border: '1px solid hsl(222 14% 22%)', color: 'hsl(38 18% 90%)', fontFamily: 'Manrope, sans-serif' }}
                onFocus={e => e.target.style.borderColor = 'hsl(42 76% 50% / 0.6)'}
                onBlur={e => e.target.style.borderColor = 'hsl(222 14% 22%)'} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'hsl(42 50% 54%)', fontFamily: 'Manrope, sans-serif' }}>Содержимое</label>
              <RichEditor value={content} onChange={setContent} placeholder="Опишите тему подробно..." minHeight={180} />
            </div>
            <div className="flex gap-3 justify-end pt-1">
              <button type="button" onClick={() => { setShowForm(false); setTitle(''); setContent(''); setError(''); }}
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
          Войдите, чтобы создавать темы и участвовать в обсуждениях
        </div>
      )}

      {/* Список тем */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
          <Icon name="Loader" size={18} className="animate-spin mr-2" /> Загрузка...
        </div>
      ) : topics.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Icon name="MessageSquare" size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Тем пока нет. Будьте первым!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {topics.map(t => (
            <div key={t.id} onClick={() => onOpenTopic(t.id)}
              className={`cursor-pointer rounded-xl transition-all group overflow-hidden`}
              style={{ background: 'hsl(222 18% 9%)', border: `1px solid ${t.is_pinned ? 'hsl(42 76% 50% / 0.3)' : 'hsl(222 14% 16%)'}` }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = t.is_pinned ? 'hsl(42 76% 50% / 0.5)' : 'hsl(42 76% 50% / 0.2)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = t.is_pinned ? 'hsl(42 76% 50% / 0.3)' : 'hsl(222 14% 16%)'; }}>
              <div className="flex items-center gap-3 p-4">
                <div className="flex-shrink-0" onClick={e => { e.stopPropagation(); onOpenProfile?.(t.author_id); }}>
                  <UserAvatar username={t.author} avatarUrl={t.author_avatar} size={42} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    {t.is_pinned && (
                      <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-semibold" style={{ background: 'hsl(42 76% 50% / 0.15)', color: 'hsl(42 76% 64%)', border: '1px solid hsl(42 76% 50% / 0.2)' }}>
                        <Icon name="Pin" size={8} /> Закреплено
                      </span>
                    )}
                    {t.is_locked && (
                      <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: 'hsl(222 14% 16%)', color: 'hsl(222 8% 52%)' }}>
                        <Icon name="Lock" size={8} /> Закрыто
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm leading-tight truncate group-hover:text-primary transition-colors" style={{ color: 'hsl(38 18% 90%)', fontFamily: 'Manrope, sans-serif' }}>
                    {t.title}
                  </h3>
                  <div className="flex items-center gap-3 text-[11px] mt-0.5" style={{ color: 'hsl(222 8% 52%)' }}>
                    <button className="font-medium hover:text-foreground transition-colors"
                      onClick={e => { e.stopPropagation(); onOpenProfile?.(t.author_id); }}>
                      {t.author}{t.author_house_name && <span style={{ color: 'hsl(42 76% 58%)' }}> [{t.author_house_name}]</span>}
                    </button>
                    <span>{timeAgo(t.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <button onClick={e => handleVote(e, t.id, 1)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all"
                    style={{ background: t.user_vote === 1 ? 'hsl(150 48% 40% / 0.2)' : 'hsl(222 14% 14%)', color: t.user_vote === 1 ? 'hsl(150 48% 60%)' : 'hsl(222 8% 52%)', border: `1px solid ${t.user_vote === 1 ? 'hsl(150 48% 40% / 0.4)' : 'hsl(222 14% 20%)'}` }}>
                    <Icon name="ThumbsUp" size={11} /> {t.likes}
                  </button>
                  <button onClick={e => handleVote(e, t.id, -1)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all"
                    style={{ background: t.user_vote === -1 ? 'hsl(355 62% 40% / 0.2)' : 'hsl(222 14% 14%)', color: t.user_vote === -1 ? 'hsl(355 72% 62%)' : 'hsl(222 8% 52%)', border: `1px solid ${t.user_vote === -1 ? 'hsl(355 62% 40% / 0.4)' : 'hsl(222 14% 20%)'}` }}>
                    <Icon name="ThumbsDown" size={11} /> {t.dislikes}
                  </button>
                  <span className="flex items-center gap-1 text-[11px]" style={{ color: 'hsl(222 8% 46%)' }}><Icon name="MessageCircle" size={11} /> {t.post_count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}