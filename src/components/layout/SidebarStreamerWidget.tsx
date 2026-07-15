import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { useStreamers } from '@/hooks/useStreamers';

const ROTATE_INTERVAL = 15000;

interface Props {
  onOpenStreamers: () => void;
}

/**
 * Компактный виджет внизу сайдбара: раз в 15 секунд переключается на следующего
 * добавленного стримера по кругу, подсвечивая тех, кто сейчас в эфире.
 */
export default function SidebarStreamerWidget({ onOpenStreamers }: Props) {
  const { streamers } = useStreamers();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (streamers.length <= 1) return;
    const timer = setInterval(() => {
      setIndex(prev => (prev + 1) % streamers.length);
    }, ROTATE_INTERVAL);
    return () => clearInterval(timer);
  }, [streamers.length]);

  if (streamers.length === 0) return null;

  const current = streamers[index % streamers.length];

  return (
    <button
      onClick={onOpenStreamers}
      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all text-left"
      style={{
        background: current.is_live ? 'hsl(0 72% 50% / 0.08)' : 'hsl(222 14% 12%)',
        border: `1px solid ${current.is_live ? 'hsl(0 72% 55% / 0.35)' : 'hsl(222 14% 18%)'}`,
      }}
    >
      <div className="relative flex-shrink-0 w-8 h-8 rounded-full overflow-hidden flex items-center justify-center"
        style={{ background: 'hsl(222 20% 14%)', border: `1.5px solid ${current.is_live ? 'hsl(0 72% 55%)' : 'hsl(222 14% 22%)'}` }}>
        {current.avatar_url
          ? <img src={current.avatar_url} alt="" className="w-full h-full object-cover" />
          : <Icon name="Twitch" size={13} style={{ color: 'hsl(262 60% 60%)' }} />}
        {current.is_live && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full animate-pulse"
            style={{ background: 'hsl(0 72% 55%)', border: '1.5px solid hsl(222 20% 8%)' }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold truncate" style={{ fontFamily: 'Manrope, sans-serif', color: current.is_live ? 'hsl(0 72% 68%)' : 'hsl(222 10% 62%)' }}>
          {current.display_name}
        </div>
        <div className="text-[10px] truncate" style={{ fontFamily: 'Manrope, sans-serif', color: 'hsl(222 8% 46%)' }}>
          {current.is_live ? `live · ${current.viewer_count.toLocaleString('ru')} зрителей` : 'офлайн'}
        </div>
      </div>
    </button>
  );
}
