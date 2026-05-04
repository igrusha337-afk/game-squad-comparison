import { useState, useEffect, useCallback, useRef } from 'react';
import { guidesApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import RichEditor from '@/components/RichEditor';
import UserAvatar from '@/components/UserAvatar';
import Icon from '@/components/ui/icon';

interface Guide {
  id: number;
  title: string;
  content: string;
  author_id: number;
  author: string;
  author_avatar: string;
  cover_url: string;
  views: number;
  likes: number;
  dislikes: number;
  user_vote: number | null;
  created_at: string;
  updated_at: string;
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
  return new Date(iso).toLocaleDateString('ru', { day: '2-digit', month: 'long', year: 'numeric' });
}

interface Props {
  guideId: number;
  onBack: () => void;
  onOpenProfile?: (userId: number) => void;
}

export default function GuideDetailPage({ guideId, onBack, onOpenProfile }: Props) {
  const { user } = useAuth();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [voting, setVoting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const videoRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await guidesApi.getGuide(guideId);
      setGuide(d.guide);
    } finally {
      setLoading(false);
    }
  }, [guideId]);

  useEffect(() => { load(); }, [load]);

  const handleVote = async (vote: 1 | -1) => {
    if (!user || voting) return;
    setVoting(true);
    try {
      await guidesApi.vote(guideId, vote);
      await load();
    } finally {
      setVoting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return;
    setSaving(true);
    try {
      await guidesApi.update(guideId, { title: editTitle, content: editContent });
      setEditing(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) { alert('Выберите видео файл'); return; }
    if (file.size > 30 * 1024 * 1024) { alert('Видео должно быть не более 30 МБ'); return; }
    setUploadingFile(true);
    try {
      const base64 = await fileToBase64(file);
      const res = await guidesApi.uploadFile(base64, file.type, file.name);
      alert(`Видео загружено: ${res.url}\n\nСкопируйте ссылку и вставьте в редактор как HTML: <video src="${res.url}" controls style="max-width:100%"></video>`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
      <Icon name="Loader" size={18} className="animate-spin mr-2" /> Загрузка...
    </div>
  );
  if (!guide) return (
    <div className="text-center py-20 text-muted-foreground text-sm">Гайд не найден</div>
  );

  const canEdit = user && (user.id === guide.author_id || user.is_admin);

  return (
    <div className="max-w-4xl">
      <button onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <Icon name="ChevronLeft" size={16} /> Назад к гайдам
      </button>

      {/* Обложка */}
      {guide.cover_url && !editing && (
        <div className="h-48 w-full rounded-sm overflow-hidden mb-4">
          <img src={guide.cover_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Карточка гайда */}
      {editing ? (
        <div className="bg-card border border-primary/30 rounded-sm p-5 mb-4">
          <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)}
            className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary mb-3" />
          {/* Загрузка видео в редакторе */}
          <div className="flex items-center gap-2 mb-2">
            <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
            <button type="button" onClick={() => videoRef.current?.click()}
              disabled={uploadingFile}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-sm hover:bg-muted transition-colors disabled:opacity-50">
              <Icon name={uploadingFile ? 'Loader' : 'Video'} size={12} className={uploadingFile ? 'animate-spin' : ''} />
              {uploadingFile ? 'Загрузка...' : 'Загрузить видео (до 30 МБ)'}
            </button>
            <span className="text-[10px] text-muted-foreground">Фото вставляйте через панель редактора</span>
          </div>
          <RichEditor value={editContent} onChange={setEditContent} minHeight={400} />
          <div className="flex gap-2 justify-end mt-3">
            <button type="button" onClick={() => setEditing(false)}
              className="px-3 py-1.5 text-xs border border-border rounded-sm hover:bg-muted transition-colors">Отмена</button>
            <button type="button" onClick={handleSaveEdit} disabled={saving}
              className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {saving ? 'Сохраняю...' : 'Сохранить'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-sm p-5 mb-6">
          {/* Автор + мета */}
          <div className="flex items-start gap-3 mb-4">
            <div className="flex-shrink-0 cursor-pointer" onClick={() => onOpenProfile?.(guide.author_id)}>
              <UserAvatar username={guide.author} avatarUrl={guide.author_avatar} size={44} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold text-foreground leading-snug mb-1">{guide.title}</h1>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                <button className="font-medium hover:text-foreground transition-colors"
                  onClick={() => onOpenProfile?.(guide.author_id)}>
                  {guide.author}
                </button>
                <span className="flex items-center gap-1"><Icon name="Clock" size={10} /> {timeAgo(guide.created_at)}</span>
                <span className="flex items-center gap-1"><Icon name="Eye" size={10} /> {guide.views} просмотров</span>
              </div>
            </div>
            {canEdit && (
              <button onClick={() => { setEditTitle(guide.title); setEditContent(guide.content); setEditing(true); }}
                className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
                title="Редактировать">
                <Icon name="Pencil" size={13} />
              </button>
            )}
          </div>

          {/* Контент */}
          <div
            className="forum-content text-sm text-foreground leading-relaxed"
            dangerouslySetInnerHTML={{ __html: guide.content }}
          />

          {/* Лайки */}
          <div className="flex items-center gap-3 mt-6 pt-4 border-t border-border">
            <span className="text-xs text-muted-foreground mr-1">Оценить:</span>
            <button
              onClick={() => handleVote(1)}
              disabled={voting || !user}
              className={`flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium transition-all disabled:opacity-50 ${
                guide.user_vote === 1
                  ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border'
              }`}>
              <Icon name="ThumbsUp" size={15} /> {guide.likes}
            </button>
            <button
              onClick={() => handleVote(-1)}
              disabled={voting || !user}
              className={`flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium transition-all disabled:opacity-50 ${
                guide.user_vote === -1
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border'
              }`}>
              <Icon name="ThumbsDown" size={15} /> {guide.dislikes}
            </button>
            {!user && <span className="text-xs text-muted-foreground">Войдите, чтобы оценить</span>}
          </div>
        </div>
      )}
    </div>
  );
}
