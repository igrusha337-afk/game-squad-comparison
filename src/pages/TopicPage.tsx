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
}
interface Post {
  id: number; topic_id: number; content: string;
  author_id: number; author: string;
  is_hidden: boolean; created_at: string; updated_at: string;
  author_avatar?: string; author_house_name?: string;
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин. назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч. назад`;
  return new Date(iso).toLocaleDateString('ru', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface TopicPageProps {
  topicId: number;
  onBack: () => void;
  onOpenProfile?: (userId: number) => void;
  onOpenMessages?: (userId: number, username: string) => void;
}

export default function TopicPage({ topicId, onBack, onOpenProfile, onOpenMessages }: TopicPageProps) {
  const { user } = useAuth();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyError, setReplyError] = useState('');

  const [editingTopic, setEditingTopic] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editTopicContent, setEditTopicContent] = useState('');

  const [editingPost, setEditingPost] = useState<number | null>(null);
  const [editPostContent, setEditPostContent] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await forumApi.getTopic(topicId);
      setTopic(data.topic);
      setPosts(data.posts || []);
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => { load(); }, [load]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    const stripped = reply.replace(/<[^>]+>/g, '').trim();
    if (!stripped) { setReplyError('Напишите текст ответа'); return; }
    setSubmitting(true); setReplyError('');
    try {
      await forumApi.createPost(topicId, reply);
      setReply('');
      await load();
    } catch (err: unknown) {
      setReplyError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditTopic = async () => {
    await forumApi.editTopic(topicId, editTitle, editTopicContent);
    setEditingTopic(false);
    await load();
  };

  const handleEditPost = async (postId: number) => {
    await forumApi.editPost(postId, editPostContent);
    setEditingPost(null);
    await load();
  };

  const handlePin = async () => {
    await forumApi.pinTopic(topicId);
    await load();
  };

  const handleLock = async () => {
    await forumApi.lockTopic(topicId);
    await load();
  };

  const handleHidePost = async (postId: number) => {
    await forumApi.hidePost(postId);
    await load();
  };

  const handleDeleteTopic = async () => {
    if (!confirm('Удалить тему? Это действие нельзя отменить.')) return;
    await forumApi.deleteTopic(topicId);
    onBack();
  };

  const canEditTopic = user && topic && (user.id === topic.author_id || user.is_admin);
  const canReply = user && topic && !topic.is_locked;

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
      <Icon name="Loader" size={18} className="animate-spin mr-2" /> Загрузка...
    </div>
  );

  if (!topic) return (
    <div className="text-center py-20 text-muted-foreground">
      <p className="text-sm">Тема не найдена</p>
    </div>
  );

  return (
    <div className="max-w-4xl">
      {/* Назад */}
      <button onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <Icon name="ChevronLeft" size={16} /> Назад к форуму
      </button>

      {/* Заголовок темы */}
      {editingTopic ? (
        <div className="bg-card border border-primary/30 rounded-sm p-5 mb-4">
          <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)}
            className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary mb-3" />
          <RichEditor value={editTopicContent} onChange={setEditTopicContent} minHeight={120} />
          <div className="flex gap-2 justify-end mt-3">
            <button type="button" onClick={() => setEditingTopic(false)}
              className="px-3 py-1.5 text-xs border border-border rounded-sm hover:bg-muted transition-colors">Отмена</button>
            <button type="button" onClick={handleEditTopic}
              className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 transition-colors">Сохранить</button>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-sm p-5 mb-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="flex-shrink-0 cursor-pointer" onClick={() => onOpenProfile?.(topic.author_id)}>
              <UserAvatar username={topic.author} avatarUrl={topic.author_avatar} size={44} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {topic.is_pinned && (
                  <span className="flex items-center gap-1 text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-sm">
                    <Icon name="Pin" size={9} /> Закреплено
                  </span>
                )}
                {topic.is_locked && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-sm">
                    <Icon name="Lock" size={9} /> Тема закрыта
                  </span>
                )}
              </div>
              <h1 className="text-xl font-semibold text-foreground leading-snug">{topic.title}</h1>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1 flex-wrap">
                <button className="font-medium hover:text-foreground transition-colors"
                  onClick={() => onOpenProfile?.(topic.author_id)}>
                  {topic.author}{topic.author_house_name && <span style={{ color: 'hsl(42 76% 58%)' }}> [{topic.author_house_name}]</span>}
                </button>
                <span className="flex items-center gap-1"><Icon name="Clock" size={10} /> {timeAgo(topic.created_at)}</span>
                <span className="flex items-center gap-1"><Icon name="Eye" size={10} /> {topic.views} просмотров</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {canEditTopic && (
                <button onClick={() => { setEditTitle(topic.title); setEditTopicContent(topic.content); setEditingTopic(true); }}
                  className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Редактировать">
                  <Icon name="Pencil" size={13} />
                </button>
              )}
              {user?.is_admin && (
                <>
                  <button onClick={handlePin}
                    className={`p-1.5 rounded-sm transition-colors ${topic.is_pinned ? 'text-primary hover:bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                    title={topic.is_pinned ? 'Открепить' : 'Закрепить'}>
                    <Icon name="Pin" size={13} />
                  </button>
                  <button onClick={handleLock}
                    className={`p-1.5 rounded-sm transition-colors ${topic.is_locked ? 'text-yellow-400 hover:bg-yellow-900/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                    title={topic.is_locked ? 'Открыть тему' : 'Закрыть тему'}>
                    <Icon name={topic.is_locked ? 'Unlock' : 'Lock'} size={13} />
                  </button>
                  <button onClick={handleDeleteTopic}
                    className="p-1.5 rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Удалить тему">
                    <Icon name="Trash2" size={13} />
                  </button>
                </>
              )}
            </div>
          </div>
          {/* Контент темы */}
          <div
            className="forum-content text-sm text-foreground leading-relaxed"
            dangerouslySetInnerHTML={{ __html: topic.content }}
          />
        </div>
      )}

      {/* Разделитель */}
      {posts.length > 0 && (
        <div className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
          <Icon name="MessageCircle" size={12} />
          {posts.length} {posts.length === 1 ? 'ответ' : posts.length < 5 ? 'ответа' : 'ответов'}
        </div>
      )}

      {/* Посты */}
      <div className="space-y-3 mb-6">
        {posts.map((post, idx) => {
          const canEdit = user && (user.id === post.author_id || user.is_admin);
          const isEditing = editingPost === post.id;
          return (
            <div key={post.id}
              className="bg-card border border-border rounded-sm p-4 group">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 cursor-pointer" onClick={() => onOpenProfile?.(post.author_id)}>
                  <UserAvatar username={post.author} avatarUrl={post.author_avatar} size={32} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <button className="text-xs font-medium text-foreground hover:text-primary transition-colors"
                        onClick={() => onOpenProfile?.(post.author_id)}>
                        {post.author}{post.author_house_name && <span style={{ color: 'hsl(42 76% 58%)' }}> [{post.author_house_name}]</span>}
                      </button>
                      <span className="text-[10px] text-muted-foreground">{timeAgo(post.created_at)}</span>
                      {post.updated_at !== post.created_at && (
                        <span className="text-[10px] text-muted-foreground italic">(изменено)</span>
                      )}
                      <span className="text-[10px] text-muted-foreground/40">#{idx + 1}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canEdit && !isEditing && (
                        <button onClick={() => { setEditingPost(post.id); setEditPostContent(post.content); }}
                          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                          <Icon name="Pencil" size={12} />
                        </button>
                      )}
                      {user?.is_admin && (
                        <button onClick={() => handleHidePost(post.id)}
                          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Скрыть пост">
                          <Icon name="EyeOff" size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                  {isEditing ? (
                    <div>
                      <RichEditor value={editPostContent} onChange={setEditPostContent} minHeight={80} />
                      <div className="flex gap-2 mt-2 justify-end">
                        <button type="button" onClick={() => setEditingPost(null)}
                          className="px-3 py-1 text-xs border border-border rounded-sm hover:bg-muted transition-colors">Отмена</button>
                        <button type="button" onClick={() => handleEditPost(post.id)}
                          className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 transition-colors">Сохранить</button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="forum-content text-sm text-foreground leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: post.content }}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Форма ответа */}
      {canReply ? (
        <div className="bg-card border border-border rounded-sm p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Icon name="Reply" size={14} className="text-primary" /> Написать ответ
          </h3>
          <form onSubmit={handleReply} className="space-y-3">
            {replyError && (
              <div className="p-2 bg-destructive/10 border border-destructive/30 text-destructive text-xs rounded-sm">
                {replyError}
              </div>
            )}
            <RichEditor value={reply} onChange={setReply} placeholder="Ваш ответ..." minHeight={120} />
            <div className="flex justify-end">
              <button type="submit" disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {submitting ? <><Icon name="Loader" size={13} className="animate-spin" /> Отправляю...</> : <><Icon name="Send" size={13} /> Отправить</>}
              </button>
            </div>
          </form>
        </div>
      ) : !user ? (
        <div className="bg-card border border-border rounded-sm p-4 text-sm text-muted-foreground flex items-center gap-3">
          <Icon name="LogIn" size={16} /> Войдите, чтобы ответить
        </div>
      ) : topic.is_locked ? (
        <div className="bg-card border border-border rounded-sm p-4 text-sm text-muted-foreground flex items-center gap-3">
          <Icon name="Lock" size={16} /> Тема закрыта для новых ответов
        </div>
      ) : null}
    </div>
  );
}