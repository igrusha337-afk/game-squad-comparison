import { useState, useEffect, useCallback, useRef } from 'react';
import { housesApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import UserAvatar from '@/components/UserAvatar';
import Icon from '@/components/ui/icon';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { resizeImageToBase64 } from '@/lib/imageResize';
import ImageLightbox from '@/components/ImageLightbox';
import HouseTrophies, { Trophy } from '@/components/HouseTrophies';
import { HOUSE_ROLES } from '@/lib/api';
import { SOCIAL_META } from '@/data/socialMeta';
import SocialIcon from '@/components/SocialIcon';
import { getVideoEmbed } from '@/lib/videoEmbed';

const SERVERS = [
  'EU1 Crystal Sea', 'EU2 Pantheon Warhall', 'EU3',
  'EU4 Legion Warhall', 'EU5 Balguksa', 'EU6 Terracotta Vanguard',
  'EU7 Ferrea Corona', 'EU8 Iron Dawn',
];

interface SocialLink {
  url: string;
  visible: boolean;
}

interface HouseDetail {
  id: number;
  name: string;
  emblem_url: string;
  short_desc: string;
  description: string;
  server: string;
  owner_id: number;
  owner: string;
  rating_points: number;
  member_count: number;
  created_at: string;
  videos: { id: number; video_url: string; title: string }[];
  photos: { id: number; photo_url: string }[];
  members: { id: number; username: string; avatar_url: string; house_name: string; house_role: string; house_role_label: string }[];
  audio: { id: number; audio_url: string; title: string }[];
  socials: Record<'telegram' | 'discord' | 'vk' | 'youtube' | 'rutube' | 'twitch', SocialLink>;
  trophies: Trophy[];
}

const ASSIGNABLE_ROLES = ['diplomat', 'marshal', 'lord', 'knight'] as const;

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

  useDocumentMeta({
    title: house ? `Дом ${house.name}` : undefined,
    description: house ? `${house.name} — ${house.short_desc || 'Дом в Хоругви'}. Сервер: ${house.server}. Участников: ${house.member_count}.` : undefined,
    image: house?.emblem_url || undefined,
  });
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [desc, setDesc] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [addingVideo, setAddingVideo] = useState(false);
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [kickingId, setKickingId] = useState<number | null>(null);
  const [editingHeader, setEditingHeader] = useState(false);
  const [headerName, setHeaderName] = useState('');
  const [headerShortDesc, setHeaderShortDesc] = useState('');
  const [headerServer, setHeaderServer] = useState('');
  const [headerEmblem, setHeaderEmblem] = useState<{ data: string; type: string } | null>(null);
  const [savingHeader, setSavingHeader] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [editingSocials, setEditingSocials] = useState(false);
  const [socialsForm, setSocialsForm] = useState<Record<string, { url: string; visible: boolean }>>({});
  const [savingSocials, setSavingSocials] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [changingRoleId, setChangingRoleId] = useState<number | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const headerEmblemRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await housesApi.getHouse(houseId);
      setHouse(d.house);
      setDesc(d.house.description || '');
      setHeaderName(d.house.name || '');
      setHeaderShortDesc(d.house.short_desc || '');
      setHeaderServer(d.house.server || '');
      if (d.house.socials) {
        const s: Record<string, { url: string; visible: boolean }> = {};
        for (const key of Object.keys(d.house.socials)) {
          s[key] = { url: d.house.socials[key].url, visible: d.house.socials[key].visible };
        }
        setSocialsForm(s);
      }
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

  const handleHeaderEmblemChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Выберите файл изображения'); e.target.value = ''; return; }
    try {
      const { data, type } = await resizeImageToBase64(file);
      setHeaderEmblem({ data, type });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Не удалось обработать изображение');
    } finally {
      e.target.value = '';
    }
  };

  const handleSaveHeader = async () => {
    if (!headerName.trim()) { alert('Укажите название дома'); return; }
    if (!headerServer.trim()) { alert('Укажите сервер'); return; }
    setSavingHeader(true);
    try {
      const payload: Parameters<typeof housesApi.update>[1] = {
        name: headerName.trim(),
        short_desc: headerShortDesc.trim(),
        server: headerServer.trim(),
      };
      if (headerEmblem) { payload.emblem_file = headerEmblem.data; payload.emblem_content_type = headerEmblem.type; }
      await housesApi.update(houseId, payload);
      if (isOwner) updateUser({ house_name: headerName.trim() });
      setEditingHeader(false);
      setHeaderEmblem(null);
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSavingHeader(false);
    }
  };

  const handleTransferOwnership = async (memberId: number, username: string) => {
    if (!confirm(`Передать права главы дома участнику ${username}? Вы станете обычным участником.`)) return;
    setTransferring(true);
    try {
      await housesApi.transferOwnership(houseId, memberId);
      if (isOwner) updateUser({});
      setShowTransfer(false);
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ошибка передачи прав');
    } finally {
      setTransferring(false);
    }
  };

  const handleSaveSocials = async () => {
    setSavingSocials(true);
    try {
      const payload: Record<string, string | boolean> = {};
      for (const key of Object.keys(socialsForm)) {
        payload[`${key}_url`] = socialsForm[key].url.trim();
        payload[`${key}_visible`] = socialsForm[key].visible;
      }
      await housesApi.update(houseId, payload);
      setEditingSocials(false);
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSavingSocials(false);
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

  const handleDeleteHouse = async () => {
    if (!confirm('Удалить дом безвозвратно? Это действие нельзя отменить.')) return;
    setDeleting(true);
    try {
      await housesApi.deleteHouse(houseId);
      if (isOwner) updateUser({ house_id: null, house_name: '' });
      onBack();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ошибка удаления');
      setDeleting(false);
    }
  };

  const handleChangeRole = async (memberId: number, role: string) => {
    setChangingRoleId(memberId);
    try {
      await housesApi.setMemberRole(houseId, memberId, role);
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ошибка назначения роли');
    } finally {
      setChangingRoleId(null);
    }
  };

  const handleKickMember = async (memberId: number, username: string) => {
    if (!confirm(`Исключить ${username} из дома?`)) return;
    setKickingId(memberId);
    try {
      await housesApi.kickMember(houseId, memberId);
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ошибка исключения');
    } finally {
      setKickingId(null);
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) { alert('Выберите аудио файл'); return; }
    if (file.size > 25 * 1024 * 1024) { alert('Аудио должно быть не более 25 МБ'); return; }
    setUploadingAudio(true);
    try {
      const base64 = await fileToBase64(file);
      await housesApi.uploadAudio(houseId, { audio_file: base64, audio_content_type: file.type, title: file.name });
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setUploadingAudio(false);
      e.target.value = '';
    }
  };

  const handleDeleteAudio = async (audioId: number) => {
    if (!confirm('Удалить аудиофайл?')) return;
    try {
      await housesApi.deleteAudio(audioId);
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ошибка удаления');
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

  const handleAddVideo = async () => {
    const url = videoUrlInput.trim();
    if (!url) { alert('Вставьте ссылку на видео'); return; }
    if (getVideoEmbed(url).type !== 'iframe') {
      alert('Поддерживаются только ссылки на YouTube, VK Видео, Rutube или Twitch');
      return;
    }
    setAddingVideo(true);
    try {
      await housesApi.addVideo(houseId, { video_url: url });
      setVideoUrlInput('');
      setShowVideoForm(false);
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ошибка добавления видео');
    } finally {
      setAddingVideo(false);
    }
  };

  const handleDeleteVideo = async (videoId: number) => {
    if (!confirm('Удалить видео?')) return;
    try {
      await housesApi.deleteVideo(videoId);
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Выберите файл изображения'); e.target.value = ''; return; }
    setUploadingPhoto(true);
    try {
      const { data, type } = await resizeImageToBase64(file);
      await housesApi.update(houseId, { photo_file: data, photo_content_type: type });
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleDeletePhoto = async (photoId: number) => {
    if (!confirm('Удалить фото?')) return;
    try {
      await housesApi.deletePhoto(photoId);
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ошибка удаления');
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
          {editingHeader ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center"
                  style={{ background: 'hsl(222 20% 14%)', border: '2px dashed hsl(42 76% 50% / 0.3)' }}>
                  {headerEmblem
                    ? <img src={headerEmblem.data} alt="" className="w-full h-full object-cover" />
                    : house.emblem_url
                      ? <img src={house.emblem_url} alt="" className="w-full h-full object-cover" />
                      : <Icon name="Shield" size={28} style={{ color: 'hsl(42 76% 50% / 0.4)' }} />}
                </div>
                <div>
                  <input ref={headerEmblemRef} type="file" accept="image/*" className="hidden" onChange={handleHeaderEmblemChange} />
                  <button type="button" onClick={() => headerEmblemRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold mb-1"
                    style={{ background: 'hsl(222 20% 14%)', border: '1px solid hsl(222 14% 22%)', color: 'hsl(42 50% 58%)', fontFamily: 'Manrope, sans-serif' }}>
                    <Icon name="Upload" size={12} /> Заменить герб
                  </button>
                  <p className="text-[11px]" style={{ color: 'hsl(222 8% 44%)', fontFamily: 'Manrope, sans-serif' }}>JPG, PNG, WebP · до 5 МБ</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'hsl(42 50% 54%)', fontFamily: 'Manrope, sans-serif' }}>Название дома</label>
                <input type="text" value={headerName} onChange={e => setHeaderName(e.target.value)} maxLength={100}
                  className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
                  style={{ background: 'hsl(222 20% 12%)', border: '1px solid hsl(222 14% 22%)', color: 'hsl(38 18% 90%)', fontFamily: 'Manrope, sans-serif' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'hsl(42 50% 54%)', fontFamily: 'Manrope, sans-serif' }}>Краткое описание</label>
                <textarea value={headerShortDesc} onChange={e => setHeaderShortDesc(e.target.value)} maxLength={200} rows={3}
                  className="w-full rounded-xl px-4 py-2.5 text-sm outline-none resize-none"
                  style={{ background: 'hsl(222 20% 12%)', border: '1px solid hsl(222 14% 22%)', color: 'hsl(38 18% 90%)', fontFamily: 'Manrope, sans-serif' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'hsl(42 50% 54%)', fontFamily: 'Manrope, sans-serif' }}>Сервер</label>
                <select value={headerServer} onChange={e => setHeaderServer(e.target.value)}
                  className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
                  style={{ background: 'hsl(222 20% 12%)', border: '1px solid hsl(222 14% 22%)', color: 'hsl(38 18% 90%)', fontFamily: 'Manrope, sans-serif' }}>
                  {SERVERS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setEditingHeader(false); setHeaderEmblem(null); setHeaderName(house.name); setHeaderShortDesc(house.short_desc); setHeaderServer(house.server); }}
                  className="px-4 py-2 rounded-xl text-sm" style={{ border: '1px solid hsl(222 14% 22%)', color: 'hsl(222 8% 58%)', fontFamily: 'Manrope, sans-serif' }}>
                  Отмена
                </button>
                <button onClick={handleSaveHeader} disabled={savingHeader}
                  className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                  style={{ background: 'hsl(42 76% 50% / 0.2)', border: '1px solid hsl(42 76% 50% / 0.4)', color: 'hsl(42 76% 68%)', fontFamily: 'Manrope, sans-serif' }}>
                  {savingHeader ? 'Сохраняю...' : 'Сохранить'}
                </button>
              </div>
            </div>
          ) : (
          <div className="flex items-start gap-5">
            {/* Герб */}
            <div onClick={() => house.emblem_url && setLightboxPhoto(house.emblem_url)}
              className="w-20 h-20 rounded-2xl flex-shrink-0 overflow-hidden flex items-center justify-center"
              style={{ background: 'hsl(222 20% 14%)', border: '2px solid hsl(42 76% 50% / 0.3)', cursor: house.emblem_url ? 'pointer' : 'default' }}>
              {house.emblem_url
                ? <img src={house.emblem_url} alt="" className="w-full h-full object-cover" />
                : <Icon name="Shield" size={32} style={{ color: 'hsl(42 76% 50% / 0.5)' }} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '2rem', fontWeight: 700, color: 'hsl(38 24% 94%)', lineHeight: 1.1 }}>
                      {house.name}
                    </h1>
                    {canManage && (
                      <button onClick={() => setEditingHeader(true)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                        title="Редактировать шапку">
                        <Icon name="Pencil" size={13} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    {house.server && (
                      <span className="text-xs px-2 py-0.5 rounded-md" style={{ background: 'hsl(210 78% 50% / 0.15)', color: 'hsl(210 78% 68%)', border: '1px solid hsl(210 78% 50% / 0.2)', fontFamily: 'Manrope, sans-serif' }}>
                        {house.server}
                      </span>
                    )}
                    {house.trophies && house.trophies.length > 0 && <HouseTrophies trophies={house.trophies} size={14} />}
                    <span className="text-xs" style={{ color: 'hsl(222 8% 54%)', fontFamily: 'Manrope, sans-serif' }}>
                      Основал <button className="hover:text-foreground transition-colors font-medium" onClick={() => onOpenProfile?.(house.owner_id)}>{house.owner}</button>
                    </span>
                  </div>
                  {house.short_desc && (
                    <p className="text-sm mt-2" style={{ color: 'hsl(222 8% 64%)', fontFamily: 'Manrope, sans-serif', whiteSpace: 'pre-line' }}>{house.short_desc}</p>
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
                {canManage && house.member_count > 1 && (
                  <button onClick={() => setShowTransfer(v => !v)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                    style={{ background: 'hsl(42 76% 50% / 0.1)', border: '1px solid hsl(42 76% 50% / 0.3)', color: 'hsl(42 70% 62%)', fontFamily: 'Manrope, sans-serif' }}>
                    <Icon name="Crown" size={14} /> Передать главенство
                  </button>
                )}
                {canManage && (
                  <button onClick={handleDeleteHouse} disabled={deleting}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                    style={{ background: 'hsl(355 62% 30% / 0.15)', border: '1px solid hsl(355 62% 44% / 0.35)', color: 'hsl(355 72% 68%)', fontFamily: 'Manrope, sans-serif' }}>
                    {deleting ? 'Удаляю...' : <><Icon name="Trash2" size={14} /> Удалить дом</>}
                  </button>
                )}
                <div className="flex items-center gap-1.5 text-xs" style={{ color: 'hsl(222 8% 52%)', fontFamily: 'Manrope, sans-serif' }}>
                  <Icon name="Users" size={13} /> {house.member_count} участников
                </div>
              </div>
              {showTransfer && (
                <div className="mt-3 p-3 rounded-xl" style={{ background: 'hsl(222 20% 11%)', border: '1px solid hsl(222 14% 18%)' }}>
                  <div className="text-xs font-semibold mb-2" style={{ color: 'hsl(222 8% 60%)', fontFamily: 'Manrope, sans-serif' }}>Выберите нового главу дома:</div>
                  <div className="flex flex-col gap-1.5">
                    {house.members.filter(m => m.id !== house.owner_id).length === 0 ? (
                      <span className="text-xs" style={{ color: 'hsl(222 8% 44%)' }}>Нет других участников</span>
                    ) : house.members.filter(m => m.id !== house.owner_id).map(m => (
                      <button key={m.id} onClick={() => handleTransferOwnership(m.id, m.username)} disabled={transferring}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-left disabled:opacity-50 transition-colors"
                        style={{ background: 'hsl(222 20% 14%)', color: 'hsl(38 18% 88%)', fontFamily: 'Manrope, sans-serif' }}>
                        <UserAvatar username={m.username} avatarUrl={m.avatar_url} size={22} />
                        {m.username}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          )}
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
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'hsl(42 50% 54%)', fontFamily: 'Manrope, sans-serif' }}>
            Видео дома {house.videos.length > 0 && `(${house.videos.length})`}
          </span>
          {canManage && !showVideoForm && (
            <button onClick={() => setShowVideoForm(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Icon name="Plus" size={11} />
              Добавить видео
            </button>
          )}
        </div>
        {showVideoForm && (
          <div className="flex items-center gap-2 mb-3">
            <input type="url" autoFocus placeholder="Ссылка на YouTube, VK Видео, Rutube или Twitch"
              value={videoUrlInput} onChange={e => setVideoUrlInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddVideo(); }}
              className="flex-1 min-w-0 rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: 'hsl(222 20% 12%)', border: '1px solid hsl(222 14% 22%)', color: 'hsl(38 18% 90%)', fontFamily: 'Manrope, sans-serif' }} />
            <button onClick={handleAddVideo} disabled={addingVideo}
              className="px-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-50 flex-shrink-0"
              style={{ background: 'hsl(42 76% 50% / 0.2)', border: '1px solid hsl(42 76% 50% / 0.4)', color: 'hsl(42 76% 68%)', fontFamily: 'Manrope, sans-serif' }}>
              {addingVideo ? 'Добавляю...' : 'Добавить'}
            </button>
            <button onClick={() => { setShowVideoForm(false); setVideoUrlInput(''); }}
              className="p-2 rounded-xl flex-shrink-0" style={{ border: '1px solid hsl(222 14% 22%)', color: 'hsl(222 8% 58%)' }}>
              <Icon name="X" size={14} />
            </button>
          </div>
        )}
        {house.videos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {house.videos.map(v => {
              const embed = getVideoEmbed(v.video_url);
              return (
                <div key={v.id} className="relative group">
                  {embed.type === 'iframe' ? (
                    <div className="rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
                      <iframe src={embed.embedUrl} className="w-full h-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                        allowFullScreen loading="lazy" style={{ border: 'none' }} />
                    </div>
                  ) : (
                    <a href={v.video_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 rounded-xl text-sm"
                      style={{ background: 'hsl(222 20% 12%)', border: '1px solid hsl(222 14% 22%)', color: 'hsl(38 18% 90%)' }}>
                      <Icon name="ExternalLink" size={14} /> Открыть видео
                    </a>
                  )}
                  {canManage && (
                    <button onClick={() => handleDeleteVideo(v.id)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'hsl(222 30% 6% / 0.85)' }}
                      title="Удалить видео">
                      <Icon name="Trash2" size={14} style={{ color: 'hsl(355 62% 58%)' }} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          !showVideoForm && (
            <p className="text-sm" style={{ color: 'hsl(222 8% 40%)', fontFamily: 'Manrope, sans-serif' }}>
              {canManage ? 'Добавьте ссылку на видео о вашем доме (YouTube, VK Видео, Rutube, Twitch)' : 'Видео не добавлено'}
            </p>
          )
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
                <div key={p.id} className="relative group aspect-video rounded-xl overflow-hidden">
                  <img src={p.photo_url} alt="" onClick={() => setLightboxPhoto(p.photo_url)}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer" />
                  {canManage && (
                    <button onClick={() => handleDeletePhoto(p.id)}
                      className="absolute top-1.5 right-1.5 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'hsl(222 30% 6% / 0.85)' }}
                      title="Удалить фото">
                      <Icon name="Trash2" size={13} style={{ color: 'hsl(355 62% 58%)' }} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'hsl(222 8% 40%)', fontFamily: 'Manrope, sans-serif' }}>Добавьте фото вашего дома</p>
          )}
        </div>
      )}

      {lightboxPhoto && <ImageLightbox src={lightboxPhoto} onClose={() => setLightboxPhoto(null)} />}

      {/* Соцсети */}
      {(canManage || SOCIAL_META.some(s => house.socials?.[s.key]?.visible && house.socials?.[s.key]?.url)) && (
        <div className="rounded-2xl p-5 mb-5" style={{ background: 'hsl(222 18% 9%)', border: '1px solid hsl(222 14% 18%)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'hsl(42 50% 54%)', fontFamily: 'Manrope, sans-serif' }}>Соцсети</span>
            {canManage && !editingSocials && (
              <button onClick={() => setEditingSocials(true)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Icon name="Pencil" size={11} /> Редактировать
              </button>
            )}
          </div>
          {editingSocials ? (
            <div className="space-y-3">
              {SOCIAL_META.map(s => (
                <div key={s.key} className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${s.color.replace(')', ' / 0.15)')}` }}>
                    <SocialIcon meta={s} size={18} />
                  </div>
                  <input type="url" placeholder={`Ссылка на ${s.label}`}
                    value={socialsForm[s.key]?.url ?? ''}
                    onChange={e => setSocialsForm(prev => ({ ...prev, [s.key]: { ...prev[s.key], url: e.target.value, visible: prev[s.key]?.visible ?? true } }))}
                    className="flex-1 min-w-0 rounded-xl px-3 py-2 text-sm outline-none"
                    style={{ background: 'hsl(222 20% 12%)', border: '1px solid hsl(222 14% 22%)', color: 'hsl(38 18% 90%)', fontFamily: 'Manrope, sans-serif' }} />
                  <label className="flex items-center gap-1.5 text-xs flex-shrink-0" style={{ color: 'hsl(222 8% 58%)', fontFamily: 'Manrope, sans-serif' }}>
                    <input type="checkbox" checked={socialsForm[s.key]?.visible ?? true}
                      onChange={e => setSocialsForm(prev => ({ ...prev, [s.key]: { ...prev[s.key], url: prev[s.key]?.url ?? '', visible: e.target.checked } }))} />
                    Показывать
                  </label>
                </div>
              ))}
              <div className="flex gap-2 justify-end pt-1">
                <button onClick={() => setEditingSocials(false)}
                  className="px-3 py-1.5 rounded-lg text-xs" style={{ border: '1px solid hsl(222 14% 22%)', color: 'hsl(222 8% 58%)', fontFamily: 'Manrope, sans-serif' }}>
                  Отмена
                </button>
                <button onClick={handleSaveSocials} disabled={savingSocials}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                  style={{ background: 'hsl(42 76% 50% / 0.2)', border: '1px solid hsl(42 76% 50% / 0.4)', color: 'hsl(42 76% 68%)', fontFamily: 'Manrope, sans-serif' }}>
                  {savingSocials ? 'Сохраняю...' : 'Сохранить'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {SOCIAL_META.filter(s => house.socials?.[s.key]?.visible && house.socials?.[s.key]?.url).map(s => (
                <a key={s.key} href={house.socials[s.key].url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{ background: `${s.color.replace(')', ' / 0.12)')}`, border: `1px solid ${s.color.replace(')', ' / 0.3)')}`, color: s.color, fontFamily: 'Manrope, sans-serif' }}>
                  <SocialIcon meta={s} size={18} /> {s.label}
                </a>
              ))}
              {SOCIAL_META.every(s => !(house.socials?.[s.key]?.visible && house.socials?.[s.key]?.url)) && (
                <p className="text-sm" style={{ color: 'hsl(222 8% 40%)', fontFamily: 'Manrope, sans-serif' }}>Ссылки на соцсети не добавлены</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Аудио */}
      <div className="rounded-2xl p-5 mb-5" style={{ background: 'hsl(222 18% 9%)', border: '1px solid hsl(222 14% 18%)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'hsl(42 50% 54%)', fontFamily: 'Manrope, sans-serif' }}>Аудио</span>
          {canManage && (
            <>
              <input ref={audioRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
              <button onClick={() => audioRef.current?.click()} disabled={uploadingAudio}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
                <Icon name={uploadingAudio ? 'Loader' : 'Music'} size={11} className={uploadingAudio ? 'animate-spin' : ''} />
                {uploadingAudio ? 'Загрузка...' : 'Добавить аудио (до 25 МБ)'}
              </button>
            </>
          )}
        </div>
        {house.audio.length > 0 ? (
          <div className="space-y-2">
            {house.audio.map(a => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'hsl(222 20% 11%)', border: '1px solid hsl(222 14% 18%)' }}>
                <div className="flex-1 min-w-0">
                  {a.title && (
                    <div className="text-xs truncate mb-1" style={{ color: 'hsl(222 8% 60%)', fontFamily: 'Manrope, sans-serif' }}>{a.title}</div>
                  )}
                  <audio src={a.audio_url} controls className="w-full h-9" />
                </div>
                {canManage && (
                  <button onClick={() => handleDeleteAudio(a.id)} className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                    <Icon name="Trash2" size={14} style={{ color: 'hsl(355 62% 58%)' }} />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'hsl(222 8% 40%)', fontFamily: 'Manrope, sans-serif' }}>
            {canManage ? 'Загрузите аудио вашего дома (до 25 МБ)' : 'Аудио не добавлено'}
          </p>
        )}
      </div>

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
              <div key={m.id}
                className="flex items-center gap-3 p-3 rounded-xl transition-all"
                style={{ background: 'hsl(222 20% 11%)', border: '1px solid hsl(222 14% 18%)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'hsl(42 76% 50% / 0.25)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'hsl(222 14% 18%)'; }}>
                <button onClick={() => onOpenProfile?.(m.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  <UserAvatar username={m.username} avatarUrl={m.avatar_url} size={36} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: 'hsl(38 18% 88%)', fontFamily: 'Manrope, sans-serif' }}>
                      {m.username}
                      {m.id === house.owner_id && <span className="ml-1 text-[10px]" style={{ color: 'hsl(42 76% 62%)' }}>👑</span>}
                    </div>
                    {m.house_role_label && (
                      <div className="text-[11px] truncate" style={{ color: 'hsl(42 50% 54%)', fontFamily: 'Manrope, sans-serif' }}>
                        {m.house_role_label}
                      </div>
                    )}
                  </div>
                </button>
                {canManage && m.id !== house.owner_id && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <select value={m.house_role || 'knight'} disabled={changingRoleId === m.id}
                      onClick={e => e.stopPropagation()}
                      onChange={e => handleChangeRole(m.id, e.target.value)}
                      className="text-[11px] rounded-lg px-1.5 py-1 outline-none disabled:opacity-50"
                      style={{ background: 'hsl(222 20% 14%)', border: '1px solid hsl(222 14% 22%)', color: 'hsl(222 8% 62%)', fontFamily: 'Manrope, sans-serif' }}>
                      {ASSIGNABLE_ROLES.map(r => <option key={r} value={r}>{HOUSE_ROLES[r]}</option>)}
                    </select>
                    <button onClick={() => handleKickMember(m.id, m.username)} disabled={kickingId === m.id}
                      className="p-1.5 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
                      title="Исключить из дома">
                      <Icon name={kickingId === m.id ? 'Loader' : 'UserX'} size={14} className={kickingId === m.id ? 'animate-spin' : ''} style={{ color: 'hsl(355 62% 58%)' }} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}