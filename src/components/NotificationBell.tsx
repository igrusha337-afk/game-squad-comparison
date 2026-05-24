import { useState, useEffect, useRef } from 'react';
import { forumApi } from '@/lib/api';
import Icon from '@/components/ui/icon';

interface Notification {
  id: number;
  message: string;
  link_topic_id: number | null;
  is_read: boolean;
  created_at: string;
}

interface Props {
  onOpenTopic?: (id: number) => void;
  onGoForum?: () => void;
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин. назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч. назад`;
  return new Date(iso).toLocaleDateString('ru');
}

export default function NotificationBell({ onOpenTopic, onGoForum }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const data = await forumApi.getNotifications();
      setItems(data.notifications || []);
    } catch { /* не авторизован — тихо */ }
  };

  useEffect(() => {
    load();
  }, []);

  // Закрываем по клику вне
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = items.filter(n => !n.is_read).length;

  const handleOpen = async () => {
    setOpen(v => !v);
    if (!open && unread > 0) {
      await forumApi.readNotifications();
      setItems(prev => prev.map(n => ({ ...n, is_read: true })));
    }
  };

  const handleClick = (n: Notification) => {
    setOpen(false);
    if (n.link_topic_id && onOpenTopic) {
      onGoForum?.();
      onOpenTopic(n.link_topic_id);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Уведомления"
      >
        <Icon name="Bell" size={16} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 bg-card border border-border rounded-sm shadow-xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Уведомления</span>
            {items.length > 0 && (
              <span className="text-[10px] text-muted-foreground">{items.length}</span>
            )}
          </div>
          {items.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              Уведомлений нет
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto scrollbar-thin">
              {items.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-3 py-2.5 border-b border-border/50 hover:bg-muted/50 transition-colors flex items-start gap-2 ${!n.is_read ? 'bg-primary/5' : ''}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${!n.is_read ? 'bg-primary' : 'bg-transparent'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground leading-snug">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(n.created_at)}</p>
                  </div>
                  {n.link_topic_id && <Icon name="ChevronRight" size={12} className="text-muted-foreground mt-0.5 flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}