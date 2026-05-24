import { useState, useEffect, useRef, useCallback } from 'react';
import { messagesApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import UserAvatar from '@/components/UserAvatar';
import Icon from '@/components/ui/icon';

interface Conversation {
  user_id: number;
  username: string;
  avatar_url: string;
  last_message: string;
  last_at: string;
  unread: number;
}

interface Message {
  id: number;
  sender_id: number;
  content: string;
  created_at: string;
  sender_username: string;
  sender_avatar: string;
}

interface OtherUser {
  id: number;
  username: string;
  avatar_url: string;
  bio: string;
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч`;
  return new Date(iso).toLocaleDateString('ru');
}

interface Props {
  initialUserId?: number | null;
  initialUsername?: string | null;
  onOpenProfile?: (userId: number) => void;
}

export default function MessagesPage({ initialUserId, initialUsername, onOpenProfile }: Props) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeUserId, setActiveUserId] = useState<number | null>(initialUserId || null);
  const [activeUsername, setActiveUsername] = useState<string | null>(initialUsername || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);


  const loadConversations = useCallback(async () => {
    try {
      const d = await messagesApi.getConversations();
      setConversations(d.conversations || []);
    } catch (_e) { /* ignore */ }
  }, []);

  const loadMessages = useCallback(async (uid: number) => {
    setLoading(true);
    try {
      const d = await messagesApi.getMessages(uid);
      setMessages(d.messages || []);
      setOtherUser(d.other_user || null);
      await messagesApi.markRead(uid);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!activeUserId) return;
    loadMessages(activeUserId);
  }, [activeUserId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openConv = (uid: number, username: string) => {
    setActiveUserId(uid);
    setActiveUsername(username);
    setMessages([]);
  };

  const handleSend = async () => {
    if (!activeUserId || !text.trim()) return;
    setSending(true);
    try {
      await messagesApi.send(activeUserId, text.trim());
      setText('');
      await loadMessages(activeUserId);
      await loadConversations();
    } finally {
      setSending(false);
    }
  };

  if (!user) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-sm" style={{ color: '#666', fontFamily: 'Manrope, sans-serif' }}>Войдите для доступа к сообщениям</p>
    </div>
  );

  return (
    <div className="flex h-full rounded-2xl overflow-hidden" style={{ border: '1px solid #c9a84c22', background: 'hsl(222 18% 7%)', minHeight: 500 }}>
      {/* Список диалогов */}
      <div className="flex flex-col border-r" style={{ width: 240, flexShrink: 0, borderColor: '#c9a84c22' }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: '#c9a84c22' }}>
          <span className="text-xs uppercase tracking-widest" style={{ color: '#c9a84c88', fontFamily: 'Manrope, sans-serif' }}>Сообщения</span>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {conversations.length === 0 && (
            <div className="p-4 text-center">
              <p className="text-xs" style={{ color: '#555', fontFamily: 'Manrope, sans-serif' }}>Нет диалогов</p>
              <p className="text-xs mt-1" style={{ color: '#444', fontFamily: 'Manrope, sans-serif' }}>Открой профиль любого пользователя и напиши ему</p>
            </div>
          )}
          {conversations.map(c => (
            <button key={c.user_id} onClick={() => openConv(c.user_id, c.username)}
              className="w-full flex items-center gap-3 px-3 py-3 transition-all text-left"
              style={{ background: activeUserId === c.user_id ? '#c9a84c12' : 'transparent', borderLeft: activeUserId === c.user_id ? '2px solid #c9a84c' : '2px solid transparent' }}>
              <div className="relative flex-shrink-0">
                <UserAvatar username={c.username} avatarUrl={c.avatar_url} size={36} />
                {c.unread > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
                    style={{ background: '#e05252', color: '#fff' }}>{c.unread}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate" style={{ color: '#eee', fontFamily: 'Manrope, sans-serif' }}>{c.username}</div>
                <div className="text-xs truncate" style={{ color: '#666', fontFamily: 'Manrope, sans-serif' }}>{c.last_message?.slice(0, 30)}</div>
              </div>
              <div className="text-[10px] flex-shrink-0" style={{ color: '#555', fontFamily: 'Manrope, sans-serif' }}>{timeAgo(c.last_at)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Чат */}
      <div className="flex-1 flex flex-col min-w-0">
        {!activeUserId ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: '#c9a84c15' }}>
              <Icon name="MessageCircle" size={28} style={{ color: '#c9a84c66' }} />
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: '#888', fontFamily: 'Manrope, sans-serif' }}>Выберите диалог</p>
            <p className="text-xs" style={{ color: '#555', fontFamily: 'Manrope, sans-serif' }}>или откройте профиль пользователя и напишите ему</p>
          </div>
        ) : (
          <>
            {/* Заголовок чата */}
            <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: '#c9a84c22' }}>
              <div
                className="cursor-pointer"
                onClick={() => otherUser && onOpenProfile && onOpenProfile(otherUser.id)}
              >
                <UserAvatar username={activeUsername || ''} avatarUrl={otherUser?.avatar_url} size={36} />
              </div>
              <div>
                <button
                  onClick={() => otherUser && onOpenProfile && onOpenProfile(otherUser.id)}
                  className="text-sm font-bold transition-colors"
                  style={{ color: '#eee', fontFamily: 'Manrope, sans-serif' }}
                >
                  {activeUsername}
                </button>
                {otherUser?.bio && (
                  <p className="text-xs truncate max-w-xs" style={{ color: '#666', fontFamily: 'Manrope, sans-serif' }}>{otherUser.bio.slice(0, 60)}</p>
                )}
              </div>
            </div>

            {/* Сообщения */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
              {loading && messages.length === 0 && (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#c9a84c44', borderTopColor: '#c9a84c' }} />
                </div>
              )}
              {messages.map(m => {
                const isMe = m.sender_id === user.id;
                return (
                  <div key={m.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!isMe && <UserAvatar username={m.sender_username} avatarUrl={m.sender_avatar} size={28} />}
                    <div className="max-w-xs">
                      <div className="px-3 py-2 rounded-xl text-sm"
                        style={{
                          background: isMe ? '#c9a84c22' : '#ffffff0d',
                          border: `1px solid ${isMe ? '#c9a84c44' : '#ffffff15'}`,
                          color: '#eee',
                          fontFamily: 'Manrope, sans-serif',
                          borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                        }}>
                        {m.content}
                      </div>
                      <div className={`text-[10px] mt-1 ${isMe ? 'text-right' : 'text-left'}`}
                        style={{ color: '#555', fontFamily: 'Manrope, sans-serif' }}>
                        {timeAgo(m.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Ввод */}
            <div className="p-3 border-t flex gap-2" style={{ borderColor: '#c9a84c22' }}>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Написать сообщение..."
                rows={1}
                maxLength={2000}
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none resize-none"
                style={{ background: '#ffffff08', border: '1px solid #c9a84c22', color: '#eee', fontFamily: 'Manrope, sans-serif', maxHeight: 120 }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                onFocus={e => (e.target.style.borderColor = '#c9a84c55')}
                onBlur={e => (e.target.style.borderColor = '#c9a84c22')}
              />
              <button onClick={handleSend} disabled={sending || !text.trim()}
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all self-end"
                style={{ background: text.trim() ? '#c9a84c' : '#ffffff0d', color: text.trim() ? '#1a1008' : '#555' }}>
                <Icon name="Send" size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}