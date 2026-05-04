import { useState, useEffect } from 'react';
import { profileApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import UserAvatar from '@/components/UserAvatar';
import Icon from '@/components/ui/icon';

interface PublicUser {
  id: number;
  username: string;
  is_admin: boolean;
  avatar_url: string;
  cover_url: string;
  bio: string;
  created_at: string;
  house_id?: number | null;
  house_name?: string;
}

interface Props {
  userId: number;
  onBack: () => void;
  onOpenMessages?: (userId: number, username: string) => void;
}

function timeJoined(iso: string) {
  return new Date(iso).toLocaleDateString('ru', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function PublicProfilePage({ userId, onBack, onOpenMessages }: Props) {
  const { user: me } = useAuth();
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    profileApi.getUser(userId)
      .then(d => setProfile(d.user))
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <div className="max-w-xl mx-auto">
      <button onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <Icon name="ChevronLeft" size={16} /> Назад
      </button>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: '#c9a84c44', borderTopColor: '#c9a84c' }} />
        </div>
      ) : !profile ? (
        <div className="text-center py-20 text-muted-foreground text-sm">Профиль не найден</div>
      ) : (
        <div className="space-y-5">
          {/* Шапка с баннером */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'hsl(222 18% 9%)', border: '1px solid #c9a84c22' }}>
            <div className="h-36 relative" style={{
              background: profile.cover_url
                ? `url(${profile.cover_url}) center/cover`
                : 'linear-gradient(135deg, hsl(222 20% 14%), hsl(222 30% 10%))',
            }}>
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, hsl(222 18% 9%))' }} />
            </div>
            <div className="px-6 pb-6 -mt-10 relative flex items-end justify-between gap-4">
              <UserAvatar username={profile.username} avatarUrl={profile.avatar_url} size={72} />
              {me && me.id !== profile.id && onOpenMessages && (
                <button
                  onClick={() => onOpenMessages(profile.id, profile.username)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all mb-1"
                  style={{ background: '#c9a84c22', border: '1px solid #c9a84c55', color: '#c9a84c', fontFamily: 'Manrope, sans-serif' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#c9a84c33')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#c9a84c22')}
                >
                  <Icon name="MessageCircle" size={15} />
                  Написать
                </button>
              )}
            </div>
          </div>

          {/* Имя и роль */}
          <div className="rounded-2xl p-6" style={{ background: 'hsl(222 18% 9%)', border: '1px solid #c9a84c22' }}>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-2xl font-bold" style={{ fontFamily: '"Cinzel Decorative", serif', color: '#f0c060' }}>
                {profile.username}
              </h1>
              {profile.house_name && (
                <span className="text-sm font-semibold" style={{ color: 'hsl(42 76% 58%)', fontFamily: 'Manrope, sans-serif' }}>
                  [{profile.house_name}]
                </span>
              )}
              {profile.is_admin && (
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: '#e0525222', border: '1px solid #e0525244', color: '#e05252', fontFamily: 'Manrope, sans-serif' }}>
                  Смотритель
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs" style={{ color: '#666', fontFamily: 'Manrope, sans-serif' }}>
              <Icon name="Calendar" size={12} />
              На сайте с {timeJoined(profile.created_at)}
            </div>
          </div>

          {/* О себе */}
          {profile.bio && (
            <div className="rounded-2xl p-6" style={{ background: 'hsl(222 18% 9%)', border: '1px solid #ffffff0d' }}>
              <div className="text-xs uppercase tracking-widest mb-3" style={{ color: '#c9a84c88', fontFamily: 'Manrope, sans-serif' }}>О себе</div>
              <p className="text-sm leading-relaxed" style={{ color: '#ccc', fontFamily: 'Manrope, sans-serif', whiteSpace: 'pre-line' }}>
                {profile.bio}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}