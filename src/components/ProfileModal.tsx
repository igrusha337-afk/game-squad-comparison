import { useState, useEffect } from 'react';
import { profileApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import UserAvatar from './UserAvatar';
import Icon from './ui/icon';

interface PublicUser {
  id: number;
  username: string;
  is_admin: boolean;
  avatar_url: string;
  bio: string;
  created_at: string;
}

interface Props {
  userId: number;
  onClose: () => void;
  onOpenMessages?: (userId: number, username: string) => void;
}

function timeJoined(iso: string) {
  return new Date(iso).toLocaleDateString('ru', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function ProfileModal({ userId, onClose, onOpenMessages }: Props) {
  const { user: me } = useAuth();
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    profileApi.getUser(userId)
      .then(d => setProfile(d.user))
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: 'hsl(222 18% 9%)', border: '1px solid #c9a84c33', boxShadow: '0 20px 60px #00000080' }}
      >
        {/* Шапка */}
        <div className="relative h-24"
          style={{ background: profile?.avatar_url ? `url(${profile.avatar_url}) center/cover` : 'linear-gradient(135deg, hsl(222 20% 14%), hsl(222 30% 10%))' }}>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent, hsl(222 18% 9%))' }} />
          <button onClick={onClose} className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: '#00000066', color: '#fff' }}>
            <Icon name="X" size={14} />
          </button>
        </div>

        <div className="px-6 pb-6 -mt-8 relative">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#c9a84c44', borderTopColor: '#c9a84c' }} />
            </div>
          ) : profile ? (
            <>
              {/* Аватар */}
              <div className="flex items-end justify-between mb-4">
                <UserAvatar username={profile.username} avatarUrl={profile.avatar_url} size={64} />
                {me && me.id !== profile.id && onOpenMessages && (
                  <button
                    onClick={() => { onOpenMessages(profile.id, profile.username); onClose(); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={{ background: '#c9a84c22', border: '1px solid #c9a84c55', color: '#c9a84c', fontFamily: 'Manrope, sans-serif' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#c9a84c33')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#c9a84c22')}
                  >
                    <Icon name="MessageCircle" size={15} />
                    Написать
                  </button>
                )}
              </div>

              {/* Имя и роль */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl font-bold" style={{ color: '#eee', fontFamily: '"Cinzel Decorative", serif' }}>
                    {profile.username}
                  </span>
                  {profile.is_admin && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: '#e0525222', border: '1px solid #e0525244', color: '#e05252', fontFamily: 'Manrope, sans-serif' }}>
                      Смотритель
                    </span>
                  )}
                </div>
                <div className="text-xs" style={{ color: '#666', fontFamily: 'Manrope, sans-serif' }}>
                  На сайте с {timeJoined(profile.created_at)}
                </div>
              </div>

              {/* О себе */}
              {profile.bio && (
                <div className="p-3 rounded-xl mb-2" style={{ background: '#ffffff08', border: '1px solid #ffffff10' }}>
                  <p className="text-sm leading-relaxed" style={{ color: '#ccc', fontFamily: 'Manrope, sans-serif', whiteSpace: 'pre-line' }}>
                    {profile.bio}
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="text-center py-6 text-sm" style={{ color: '#666' }}>Профиль не найден</p>
          )}
        </div>
      </div>
    </div>
  );
}