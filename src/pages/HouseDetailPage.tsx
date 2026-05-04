import { useState, useEffect, useCallback, useRef } from 'react';
import { housesApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import UserAvatar from '@/components/UserAvatar';
import Icon from '@/components/ui/icon';

const SERVERS = [
  'EU1 Crystal Sea', 'EU2 Pantheon Warhall', 'EU3',
  'EU4 Legion Warhall', 'EU5 Balguksa', 'EU6 Terracotta Vanguard',
  'EU7 Ferrea Corona', 'EU8 Iron Dawn',
];

interface HouseDetail {
  id: number;
  name: string;
  emblem_url: string;
  short_desc: string;
  description: string;
  video_url: string;
  server: string;
  owner_id: number;
  owner: string;
  rating_points: number;
  member_count: number;
  created_at: string;
  photos: { id: number; photo_url: string }[];
  members: { id: number; username: string; avatar_url: string; house_name: string }[];
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
  houseId: number;
  onBack: () => void;
  onOpenProfile?: (userId: number) => void;
}

export default function HouseDetailPage({ houseId, onBack, onOpenProfile }: Props) {
  const { user, updateUser } = useAuth();
  const [house, setHouse] = useState<HouseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [desc, setDesc] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const videoRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await housesApi.getHouse(houseId);
      setHouse(d.house);
      setDesc(d.house.description || '');
    } finally {
      setLoading(false);
    }
  }, [houseId]);

  useEffect(() => { load(); }, [load]);

  const isOwner = user && house && user.id === house.owner_id;
  const isMember = user && user.house_id === houseId;
  const canManage = !!(isOwner || user?.is_admin);

  const handleJoin = async () => {
    if (!user || isMember) return;
    setJoining(true);
    try {
      await housesApi.join(houseId);
      updateUser({ house_id: houseId, house_name: house?.name || '' });
      await load();
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm('Покинуть дом?')) return;
    setLeaving(true);
    try {
      await housesApi.leave();
      updateUser({ house_id: null, house_name: '' });
      await load();
    } finally {
      setLeaving(false);
    }
  };

  const handleSaveDesc = async () => {
    setSaving(true);
    try {
      await housesApi.update(houseId, { description: desc });
      setEditingDesc(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) { alert('Выберите видео файл'); return; }
    if (file.size > 100 * 1024 * 1024) { alert('Видео должно быть не более 100 МБ'); return; }
    setUploadingVideo(true);
    try {
      const base64 = await fileToBase64(file);
      await housesApi.update(houseId, { video_file: base64, video_content_type: file.type });
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setUploadingVideo(false);
      e.target.value = '';
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const base64 = await fileToBase64(file);
      await housesApi.update(houseId, { photo_file: base64, photo_content_type: file.type });
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
      <Icon name="Loader" size={18} className="animate-spin mr-2" /> Загрузка...
    </div>
  );
  if (!house) return (
    <div className="text-center py-20 text-muted-foreground text-sm">Дом не найден</div>
  );

  return (
    <div className="max-w-4xl">
      <button onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <Icon name="ChevronLeft" size={16} /> Назад к домам
      </button>

      {/* Шапка дома */}
      <div className="rounded-2xl overflow-hidden mb-5" style={{ background: 'hsl(222 18% 9%)', border: '1px solid hsl(42 76% 50% / 0.2)' }}>
        <div className="p-6">
          <div className="flex items-start gap-5">
            {/* Герб */}
            <div className="w-20 h-20 rounded-2xl flex-shrink-0 overflow-hidden flex items-center justify-center"
              style={{ background: 'hsl(222 20% 14%)', border: '2px solid hsl(42 76% 50% / 0.3)' }}>
              {house.emblem_url
                ? <img src={house.emblem_url} alt="" className="w-full h-full object-cover" />
                : <Icon name="Shield" size={32} style={{ color: 'hsl(42 76% 50% / 0.5)' }} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '2rem', fontWeight: 700, color: 'hsl(38 24% 94%)', lineHeight: 1.1 }}>
                    {house.name}
                  </h1>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    {house.server && (
                      <span className="text-xs px-2 py-0.5 rounded-md" style={{ background: 'hsl(210 78% 50% / 0.15)', color: 'hsl(210 78% 68%)', border: '1px solid hsl(210 78% 50% / 0.2)', fontFamily: 'Manrope, sans-serif' }}>
                        {house.server}
                      </span>
                    )}
                    <span className="text-xs" style={{ color: 'hsl(222 8% 54%)', fontFamily: 'Manrope, sans-serif' }}>
                      Основал <button className="hover:text-foreground transition-colors font-medium" onClick={() => onOpenProfile?.(house.owner_id)}>{house.owner}</button>
                    </span>
                  </div>
                  {house.short_desc && (
                    <p className="text-sm mt-2" style={{ color: 'hsl(222 8% 64%)', fontFamily: 'Manrope, sans-serif' }}>{house.short_desc}</p>
                  )}
                </div>
                {/* Рейтинг */}
                <div className="flex-shrink-0 text-right">
                  <div className="text-2xl font-bold" style={{ color: 'hsl(42 76% 62%)', fontFamily: '"Cormorant Garamond", serif' }}>
                    {house.rating_points.toLocaleString('ru')}
                  </div>
                  <div className="text-xs" style={{ color: 'hsl(222 8% 50%)', fontFamily: 'Manrope, sans-serif' }}>баллов рейтинга</div>
                </div>
              </div>
              {/* Кнопки */}
              <div className="flex gap-2 mt-4 flex-wrap">
                {user && !isMember && !isOwner && (
                  <button onClick={handleJoin} disabled={joining}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all"
                    style={{ background: 'linear-gradient(135deg, hsl(42 76% 52%), hsl(30 64% 38%))', color: 'hsl(222 30% 10%)', fontFamily: 'Manrope, sans-serif' }}>
                    {joining ? <><Icon name="Loader" size={13} className="animate-spin" /> Вступаю...</> : <><Icon name="UserPlus" size={14} /> Вступить</>}
                  </button>
                )}
                {isMember && !isOwner && (
                  <button onClick={handleLeave} disabled={leaving}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                    style={{ background: 'hsl(222 20% 12%)', border: '1px solid hsl(222 14% 22%)', color: 'hsl(222 8% 58%)', fontFamily: 'Manrope, sans-serif' }}>
                    {leaving ? 'Покидаю...' : <><Icon name="LogOut" size={14} /> Покинуть</>}
                  </button>
                )}
                <div className="flex items-center gap-1.5 text-xs" style={{ color: 'hsl(222 8% 52%)', fontFamily: 'Manrope, sans-serif' }}>
                  <Icon name="Users" size={13} /> {house.member_count} участников
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Описание */}
      <div className="rounded-2xl p-5 mb-5" style={{ background: 'hsl(222 18% 9%)', border: '1px solid hsl(222 14% 18%)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'hsl(42 50% 54%)', fontFamily: 'Manrope, sans-serif' }}>О доме</span>
          {canManage && !editingDesc && (
            <button onClick={() => setEditingDesc(true)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Icon name="Pencil" size={11} /> Редактировать
            </button>
          )}
        </div>
        {editingDesc ? (
          <div>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} maxLength={1000} rows={5}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none transition-all"
              style={{ background: 'hsl(222 20% 12%)', border: '1px solid hsl(222 14% 22%)', color: 'hsl(38 18% 90%)', fontFamily: 'Manrope, sans-serif' }}
              onFocus={e => e.target.style.borderColor = 'hsl(42 76% 50% / 0.6)'}
              onBlur={e => e.target.style.borderColor = 'hsl(222 14% 22%)'} />
            <div className="flex justify-between items-center mt-2">
              <span className="text-[11px]" style={{ color: 'hsl(222 8% 44%)', fontFamily: 'Manrope, sans-serif' }}>{desc.length}/1000</span>
              <div className="flex gap-2">
                <button onClick={() => { setEditingDesc(false); setDesc(house.description || ''); }}
                  className="px-3 py-1.5 rounded-lg text-xs" style={{ border: '1px solid hsl(222 14% 22%)', color: 'hsl(222 8% 58%)', fontFamily: 'Manrope, sans-serif' }}>
                  Отмена
                </button>
                <button onClick={handleSaveDesc} disabled={saving}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                  style={{ background: 'hsl(42 76% 50% / 0.2)', border: '1px solid hsl(42 76% 50% / 0.4)', color: 'hsl(42 76% 68%)', fontFamily: 'Manrope, sans-serif' }}>
                  {saving ? 'Сохраняю...' : 'Сохранить'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-relaxed" style={{ color: house.description ? 'hsl(222 8% 68%)' : 'hsl(222 8% 40%)', fontFamily: 'Manrope, sans-serif', whiteSpace: 'pre-line' }}>
            {house.description || (canManage ? 'Нажмите «Редактировать» чтобы добавить описание...' : 'Описание не добавлено')}
          </p>
        )}
      </div>

      {/* Видео */}
      <div className="rounded-2xl p-5 mb-5" style={{ background: 'hsl(222 18% 9%)', border: '1px solid hsl(222 14% 18%)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'hsl(42 50% 54%)', fontFamily: 'Manrope, sans-serif' }}>Видео дома</span>
          {canManage && (
            <>
              <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
              <button onClick={() => videoRef.current?.click()} disabled={uploadingVideo}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
                <Icon name={uploadingVideo ? 'Loader' : 'Upload'} size={11} className={uploadingVideo ? 'animate-spin' : ''} />
                {uploadingVideo ? 'Загрузка...' : (house.video_url ? 'Заменить видео' : 'Загрузить видео')}
              </button>
            </>
          )}
        </div>
        {house.video_url ? (
          <video src={house.video_url} controls className="w-full rounded-xl" style={{ maxHeight: '320px' }} />
        ) : (
          <p className="text-sm" style={{ color: 'hsl(222 8% 40%)', fontFamily: 'Manrope, sans-serif' }}>
            {canManage ? 'Загрузите видео о вашем доме (до 100 МБ)' : 'Видео не добавлено'}
          </p>
        )}
      </div>

      {/* Фото галерея */}
      {(house.photos.length > 0 || canManage) && (
        <div className="rounded-2xl p-5 mb-5" style={{ background: 'hsl(222 18% 9%)', border: '1px solid hsl(222 14% 18%)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'hsl(42 50% 54%)', fontFamily: 'Manrope, sans-serif' }}>Фото</span>
            {canManage && (
              <>
                <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                <button onClick={() => photoRef.current?.click()} disabled={uploadingPhoto}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
                  <Icon name={uploadingPhoto ? 'Loader' : 'ImagePlus'} size={11} className={uploadingPhoto ? 'animate-spin' : ''} />
                  {uploadingPhoto ? 'Загрузка...' : 'Добавить фото'}
                </button>
              </>
            )}
          </div>
          {house.photos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {house.photos.map(p => (
                <div key={p.id} className="aspect-video rounded-xl overflow-hidden">
                  <img src={p.photo_url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'hsl(222 8% 40%)', fontFamily: 'Manrope, sans-serif' }}>Добавьте фото вашего дома</p>
          )}
        </div>
      )}

      {/* Участники */}
      <div className="rounded-2xl p-5" style={{ background: 'hsl(222 18% 9%)', border: '1px solid hsl(222 14% 18%)' }}>
        <div className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'hsl(42 50% 54%)', fontFamily: 'Manrope, sans-serif' }}>
          Участники ({house.member_count})
        </div>
        {house.members.length === 0 ? (
          <p className="text-sm" style={{ color: 'hsl(222 8% 44%)', fontFamily: 'Manrope, sans-serif' }}>Участников пока нет</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {house.members.map(m => (
              <button key={m.id} onClick={() => onOpenProfile?.(m.id)}
                className="flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                style={{ background: 'hsl(222 20% 11%)', border: '1px solid hsl(222 14% 18%)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'hsl(42 76% 50% / 0.25)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'hsl(222 14% 18%)'; }}>
                <UserAvatar username={m.username} avatarUrl={m.avatar_url} size={36} />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: 'hsl(38 18% 88%)', fontFamily: 'Manrope, sans-serif' }}>
                    {m.username}
                    {m.id === house.owner_id && <span className="ml-1 text-[10px]" style={{ color: 'hsl(42 76% 62%)' }}>👑</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
