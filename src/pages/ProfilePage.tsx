import { useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { profileApi } from '@/lib/api';
import UserAvatar from '@/components/UserAvatar';
import Icon from '@/components/ui/icon';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface Props {
  onOpenMessages?: (userId: number, username: string) => void;
}

export default function ProfilePage({ onOpenMessages }: Props) {
  const { user, loading: authLoading, updateUser } = useAuth();
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [coverUrl, setCoverUrl] = useState(user?.cover_url || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<{ data: string; type: string } | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<{ data: string; type: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  if (authLoading) return null;
  if (!user) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-sm" style={{ color: '#666', fontFamily: 'Manrope, sans-serif' }}>Войдите, чтобы открыть профиль</p>
    </div>
  );

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    setAvatarPreview(base64);
    setAvatarFile({ data: base64, type: file.type });
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    setCoverPreview(base64);
    setCoverFile({ data: base64, type: file.type });
  };

  const handleSave = async () => {
    setSaving(true); setError(''); setSaved(false);
    try {
      const payload: Parameters<typeof profileApi.updateProfile>[0] = { bio };
      if (avatarFile) {
        payload.avatar_file = avatarFile.data;
        payload.avatar_content_type = avatarFile.type;
      }
      if (coverFile) {
        payload.cover_file = coverFile.data;
        payload.cover_content_type = coverFile.type;
      }
      const res = await profileApi.updateProfile(payload);
      const newAvatarUrl = res.avatar_url ?? avatarUrl;
      const newCoverUrl = res.cover_url ?? coverUrl;
      setAvatarUrl(newAvatarUrl);
      setCoverUrl(newCoverUrl);
      setAvatarFile(null); setAvatarPreview(null);
      setCoverFile(null); setCoverPreview(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      updateUser({ avatar_url: newAvatarUrl, bio, cover_url: newCoverUrl });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const currentAvatar = avatarPreview || avatarUrl || user.avatar_url;
  const currentCover = coverPreview || coverUrl || user.cover_url;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Заголовок */}
      <div>
        <h1 className="text-2xl font-black mb-1" style={{ fontFamily: '"Cinzel Decorative", serif', color: '#f0c060' }}>
          Мой профиль
        </h1>
        <p className="text-sm" style={{ color: '#666', fontFamily: 'Manrope, sans-serif' }}>
          Настройте аватар, обложку и расскажите о себе — это увидят все участники
        </p>
      </div>

      {/* Обложка */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'hsl(222 18% 9%)', border: '1px solid #c9a84c22' }}>
        <div className="relative h-36 group" style={{
          background: currentCover ? `url(${currentCover}) center/cover` : 'linear-gradient(135deg, hsl(222 20% 14%), hsl(222 30% 10%))',
        }}>
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(0,0,0,0.4)' }}>
            <button
              onClick={() => coverRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: '#c9a84c22', border: '1px solid #c9a84c88', color: '#f0c060', fontFamily: 'Manrope, sans-serif' }}
            >
              <Icon name="ImagePlus" size={15} />
              {currentCover ? 'Изменить обложку' : 'Добавить обложку'}
            </button>
          </div>
        </div>
        <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
        <div className="px-5 py-3 flex items-center justify-between">
          <span className="text-xs uppercase tracking-widest" style={{ color: '#c9a84c88', fontFamily: 'Manrope, sans-serif' }}>Обложка профиля</span>
          {currentCover && (
            <button onClick={() => coverRef.current?.click()}
              className="flex items-center gap-1.5 text-xs transition-colors"
              style={{ color: '#c9a84c', fontFamily: 'Manrope, sans-serif' }}>
              <Icon name="Upload" size={12} /> Заменить
            </button>
          )}
        </div>
      </div>

      {/* Аватар */}
      <div className="rounded-2xl p-6" style={{ background: 'hsl(222 18% 9%)', border: '1px solid #c9a84c22' }}>
        <div className="text-xs uppercase tracking-widest mb-4" style={{ color: '#c9a84c88', fontFamily: 'Manrope, sans-serif' }}>Аватар</div>
        <div className="flex items-center gap-5">
          <UserAvatar username={user.username} avatarUrl={currentAvatar} size={80} />
          <div className="flex-1">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all mb-2"
              style={{ background: '#c9a84c22', border: '1px solid #c9a84c55', color: '#c9a84c', fontFamily: 'Manrope, sans-serif' }}
            >
              <Icon name="Upload" size={15} />
              {currentAvatar ? 'Заменить фото' : 'Загрузить фото'}
            </button>
            <p className="text-xs" style={{ color: '#555', fontFamily: 'Manrope, sans-serif' }}>
              JPG, PNG, WebP · максимум 5 МБ
            </p>
            {avatarPreview && (
              <p className="text-xs mt-1" style={{ color: '#7eb87e', fontFamily: 'Manrope, sans-serif' }}>
                ✓ Новое фото выбрано — нажми «Сохранить»
              </p>
            )}
          </div>
        </div>
      </div>

      {/* О себе */}
      <div className="rounded-2xl p-6" style={{ background: 'hsl(222 18% 9%)', border: '1px solid #c9a84c22' }}>
        <div className="text-xs uppercase tracking-widest mb-3" style={{ color: '#c9a84c88', fontFamily: 'Manrope, sans-serif' }}>О себе</div>
        <textarea
          value={bio}
          onChange={e => setBio(e.target.value)}
          maxLength={500}
          rows={4}
          placeholder="Расскажи о себе — это увидят другие пользователи в твоём профиле..."
          className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none transition-all"
          style={{
            background: '#ffffff08', border: '1px solid #c9a84c22', color: '#eee',
            fontFamily: 'Manrope, sans-serif',
          }}
          onFocus={e => (e.target.style.borderColor = '#c9a84c55')}
          onBlur={e => (e.target.style.borderColor = '#c9a84c22')}
        />
        <div className="text-right text-xs mt-1" style={{ color: '#555', fontFamily: 'Manrope, sans-serif' }}>
          {bio.length}/500
        </div>
      </div>

      {/* Информация аккаунта */}
      <div className="rounded-2xl p-6" style={{ background: 'hsl(222 18% 9%)', border: '1px solid #ffffff0d' }}>
        <div className="text-xs uppercase tracking-widest mb-4" style={{ color: '#888', fontFamily: 'Manrope, sans-serif' }}>Аккаунт</div>
        <div className="space-y-3">
          {[
            { label: 'Имя', value: user.username, icon: 'User' },
            { label: 'Email', value: user.email, icon: 'Mail' },
            { label: 'Роль', value: user.is_admin ? 'Смотритель (Администратор)' : 'Воевода', icon: 'Shield' },
          ].map(row => (
            <div key={row.label} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: '#ffffff08' }}>
                <Icon name={row.icon as 'User'} size={14} style={{ color: '#888' }} />
              </div>
              <div>
                <div className="text-xs" style={{ color: '#666', fontFamily: 'Manrope, sans-serif' }}>{row.label}</div>
                <div className="text-sm" style={{ color: '#ccc', fontFamily: 'Manrope, sans-serif' }}>{row.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ошибка */}
      {error && (
        <div className="px-4 py-3 rounded-xl text-sm" style={{ background: '#e0525215', border: '1px solid #e0525244', color: '#e05252', fontFamily: 'Manrope, sans-serif' }}>
          {error}
        </div>
      )}

      {/* Кнопка сохранить */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3.5 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2"
        style={{
          background: saving ? '#8b6020' : 'linear-gradient(135deg, #c9a84c, #8b6020)',
          color: '#1a1008', fontFamily: '"Cinzel Decorative", serif',
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? (
          <><div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#1a100844', borderTopColor: '#1a1008' }} /> Сохранение...</>
        ) : saved ? (
          <><Icon name="Check" size={16} /> Сохранено!</>
        ) : (
          <><Icon name="Save" size={16} /> Сохранить изменения</>
        )}
      </button>
    </div>
  );
}
