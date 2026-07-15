import { useStreamers } from '@/hooks/useStreamers';
import Icon from '@/components/ui/icon';

function timeSince(iso: string) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'только что начал';
  if (diff < 3600) return `в эфире ${Math.floor(diff / 60)} мин`;
  const hours = Math.floor(diff / 3600);
  const mins = Math.floor((diff % 3600) / 60);
  return `в эфире ${hours} ч ${mins} мин`;
}

export default function StreamersPage() {
  const { streamers, loading } = useStreamers();
  const liveCount = streamers.filter(s => s.is_live).length;

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '2rem', fontWeight: 700, color: 'hsl(38 24% 94%)' }}>
          Стримеры
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Каналы стримеров сообщества Conqueror&apos;s Blade
          {liveCount > 0 && <span style={{ color: 'hsl(0 72% 60%)' }}> · {liveCount} {liveCount === 1 ? 'стример' : 'стримеров'} в эфире прямо сейчас</span>}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
          <Icon name="Loader" size={18} className="animate-spin mr-2" /> Загрузка...
        </div>
      ) : streamers.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Icon name="Twitch" size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Стримеров пока нет</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {streamers.map(s => (
            <a
              key={s.id}
              href={s.channel_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl overflow-hidden transition-all group"
              style={{
                background: 'hsl(222 18% 9%)',
                border: `1px solid ${s.is_live ? 'hsl(0 72% 55% / 0.5)' : 'hsl(222 14% 18%)'}`,
                boxShadow: s.is_live ? '0 0 20px hsl(0 72% 50% / 0.15)' : 'none',
              }}
            >
              <div className="relative aspect-video" style={{ background: 'hsl(222 20% 12%)' }}>
                {s.is_live && s.thumbnail_url ? (
                  <img src={s.thumbnail_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Icon name="Twitch" size={36} style={{ color: 'hsl(262 60% 60% / 0.3)' }} />
                  </div>
                )}
                {s.is_live && (
                  <span className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide"
                    style={{ background: 'hsl(0 72% 50%)', color: 'white' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    Live
                  </span>
                )}
                {s.is_live && s.viewer_count > 0 && (
                  <span className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold"
                    style={{ background: 'hsl(222 30% 6% / 0.8)', color: 'white' }}>
                    <Icon name="Eye" size={10} /> {s.viewer_count.toLocaleString('ru')}
                  </span>
                )}
              </div>
              <div className="p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
                  style={{ background: 'hsl(222 20% 14%)', border: `2px solid ${s.is_live ? 'hsl(0 72% 55%)' : 'hsl(222 14% 22%)'}` }}>
                  {s.avatar_url
                    ? <img src={s.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <Icon name="Twitch" size={16} style={{ color: 'hsl(262 60% 60%)' }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold group-hover:text-primary transition-colors" style={{ color: 'hsl(38 18% 90%)', fontFamily: 'Manrope, sans-serif' }}>
                    {s.display_name}
                  </div>
                  {s.is_live ? (
                    <>
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'hsl(222 8% 62%)', fontFamily: 'Manrope, sans-serif' }}>{s.title}</p>
                      <div className="flex items-center gap-2 text-[11px] mt-1" style={{ color: 'hsl(222 8% 48%)' }}>
                        {s.game_name && <span>{s.game_name}</span>}
                        {s.started_at && <span>· {timeSince(s.started_at)}</span>}
                      </div>
                    </>
                  ) : (
                    <p className="text-xs mt-0.5" style={{ color: 'hsl(222 8% 46%)', fontFamily: 'Manrope, sans-serif' }}>Сейчас офлайн</p>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}