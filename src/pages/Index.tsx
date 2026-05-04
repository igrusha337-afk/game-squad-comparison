import { useState, useEffect, useRef } from 'react';
import Icon from '@/components/ui/icon';
import { useAuth } from '@/context/AuthContext';
import CatalogPage from './CatalogPage';
import ComparePage from './ComparePage';
import TreatiesPage from './TreatiesPage';
import UnitDetailPage from './UnitDetailPage';
import AboutPage from './AboutPage';
import AuthPage from './AuthPage';
import AdminPage from './AdminPage';
import ForumPage from './ForumPage';
import TopicPage from './TopicPage';
import WhamPage from './WhamPage';
import ProfilePage from './ProfilePage';
import PublicProfilePage from './PublicProfilePage';
import MessagesPage from './MessagesPage';
import GuidesPage from './GuidesPage';
import GuideDetailPage from './GuideDetailPage';
import NotificationBell from '@/components/NotificationBell';

type Page = 'catalog' | 'compare' | 'treaties' | 'forum' | 'guides' | 'game' | 'about' | 'auth' | 'admin' | 'profile' | 'messages';

const NAV_ITEMS: Array<{ id: Page; label: string; icon: string; adminOnly?: boolean; authOnly?: boolean }> = [
  { id: 'catalog',  label: 'Каталог',    icon: 'LayoutGrid' },
  { id: 'compare',  label: 'Сравнение',  icon: 'Swords' },
  { id: 'treaties', label: 'Трактаты',   icon: 'ScrollText' },
  { id: 'forum',    label: 'Форум',      icon: 'MessageSquare' },
  { id: 'guides',   label: 'Гайды',      icon: 'BookOpen' },
  { id: 'game',     label: 'Неадекватная игра', icon: 'Gamepad2' },
  { id: 'about',    label: 'О проекте',  icon: 'Info' },
  { id: 'admin',    label: 'Управление', icon: 'Settings', adminOnly: true },
];

/* Эмблема «Между двух эпох»: рыцарский щит с золотым шевроном
   и рубиновым крестом, в богатой градиентной заливке. */
function ShieldEmblem({ size = 34 }: { size?: number }) {
  const id = 'sh-' + size;
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="hsl(222 16% 18%)" />
          <stop offset="100%" stopColor="hsl(222 20% 9%)" />
        </linearGradient>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"  stopColor="hsl(48 80% 72%)" />
          <stop offset="55%" stopColor="hsl(42 76% 54%)" />
          <stop offset="100%" stopColor="hsl(30 64% 40%)" />
        </linearGradient>
        <linearGradient id={`${id}-blood`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="hsl(355 72% 56%)" />
          <stop offset="100%" stopColor="hsl(350 62% 38%)" />
        </linearGradient>
      </defs>
      <path
        d="M18 2 L32 6 V17 C32 25 23.5 31 18 33 C12.5 31 4 25 4 17 V6 L18 2 Z"
        fill={`url(#${id}-body)`}
        stroke={`url(#${id}-gold)`}
        strokeWidth="1.5"
      />
      {/* Шеврон */}
      <path d="M8 16 L18 10 L28 16" stroke={`url(#${id}-gold)`} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* Крест */}
      <path d="M18 14 V27 M13 20 H23" stroke={`url(#${id}-blood)`} strokeWidth="2.2" strokeLinecap="round" />
      {/* Блик */}
      <path d="M6 9 L16 4" stroke="hsl(42 76% 70% / 0.35)" strokeWidth="0.8" strokeLinecap="round" />
      {/* Заклёпки золотые */}
      <circle cx="18" cy="5.5" r="1.1" fill="hsl(42 76% 58%)" />
      <circle cx="8"  cy="7.5" r="1"   fill="hsl(42 76% 58%)" />
      <circle cx="28" cy="7.5" r="1"   fill="hsl(42 76% 58%)" />
    </svg>
  );
}

/* Разделитель: градиентная линия + золотой ромб */
function OrnateDivider() {
  return (
    <div className="px-5 py-2.5">
      <div className="flex items-center gap-2.5">
        <div
          className="flex-1 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, hsl(42 76% 58% / 0.5), transparent)',
          }}
        />
        <span
          className="w-[6px] h-[6px] rotate-45"
          style={{
            background: 'linear-gradient(135deg, hsl(48 80% 72%), hsl(32 64% 40%))',
            boxShadow: '0 0 6px hsl(42 76% 58% / 0.6)',
          }}
        />
        <div
          className="flex-1 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, hsl(42 76% 58% / 0.5), transparent)',
          }}
        />
      </div>
    </div>
  );
}

export default function Index() {
  const { user, loading: authLoading, logout } = useAuth();
  const [page, setPage] = useState<Page>('catalog');
  const [detailUnitId, setDetailUnitId] = useState<string | null>(null);
  const [forumTopicId, setForumTopicId] = useState<number | null>(null);
  const [publicProfileUserId, setPublicProfileUserId] = useState<number | null>(null);
  const [messagesWithUser, setMessagesWithUser] = useState<{ id: number; username: string } | null>(null);
  const [guideDetailId, setGuideDetailId] = useState<number | null>(null);
  const [appliedTreaties, setAppliedTreaties] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('companion_treaties');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    localStorage.setItem('companion_treaties', JSON.stringify(appliedTreaties));
  }, [appliedTreaties]);

  useEffect(() => {
    if (detailUnitId) mainRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [detailUnitId]);

  const handleApplyTreaty = (unitId: string, treatyId: string) => {
    setAppliedTreaties(prev => ({
      ...prev,
      [unitId]: [...(prev[unitId] || []), treatyId],
    }));
  };

  const handleRemoveTreaty = (unitId: string, treatyId: string) => {
    setAppliedTreaties(prev => ({
      ...prev,
      [unitId]: (prev[unitId] || []).filter(id => id !== treatyId),
    }));
  };

  const openPublicProfile = (userId: number) => {
    setPublicProfileUserId(userId);
    setDetailUnitId(null);
    setForumTopicId(null);
    mainRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  };

  const openMessages = (userId: number, username: string) => {
    setMessagesWithUser({ id: userId, username });
    setPage('messages');
    setDetailUnitId(null);
    setForumTopicId(null);
    setPublicProfileUserId(null);
    setMobileMenuOpen(false);
  };

  const navigateTo = (p: Page) => {
    setPage(p);
    setDetailUnitId(null);
    setForumTopicId(null);
    setPublicProfileUserId(null);
    setGuideDetailId(null);
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    setPage('catalog');
    setMobileMenuOpen(false);
  };

  const visibleNav = NAV_ITEMS.filter(item =>
    (!item.adminOnly || user?.is_admin) && (!item.authOnly || !!user)
  );
  const currentLabel = page === 'auth' ? 'Вход' : page === 'admin' ? 'Управление' : NAV_ITEMS.find(n => n.id === page)?.label;

  return (
    <div className="h-screen bg-background flex overflow-hidden">

      {/* ── Сайдбар ─────────────────────────────────────────── */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 flex flex-col
        transition-transform duration-250
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:flex
      `}
        style={{
          width: '248px',
          background:
            'linear-gradient(180deg, hsl(222 20% 8%) 0%, hsl(222 22% 5%) 100%)',
          borderRight: '1px solid hsl(222 14% 14%)',
          boxShadow:
            'inset -1px 0 0 hsl(42 76% 50% / 0.08), 4px 0 24px hsl(222 40% 2% / 0.4)',
        }}
      >
        {/* Золотая планка сверху */}
        <div className="h-[3px] sidebar-top-accent" />

        {/* ── Бренд ─ */}
        <div className="px-5 py-6 flex items-center gap-3 relative">
          <div
            className="relative"
            style={{
              filter: 'drop-shadow(0 4px 12px hsl(42 76% 40% / 0.35))',
            }}
          >
            <ShieldEmblem size={40} />
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="leading-none text-gradient-gold"
              style={{
                fontFamily: '"Cinzel Decorative", serif',
                fontSize: '1.35rem',
                fontWeight: 900,
                letterSpacing: '0.04em',
              }}
            >
              Хоругвь
            </div>
            <div
              className="mt-1.5 uppercase"
              style={{
                fontFamily: '"Manrope", sans-serif',
                fontSize: '0.6rem',
                fontWeight: 600,
                color: 'hsl(42 40% 60% / 0.8)',
                letterSpacing: '0.25em',
              }}
            >
              Каталог · MMXXVI
            </div>
          </div>
        </div>

        <OrnateDivider />

        {/* ── Навигация — современная с активной заливкой ─ */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto scrollbar-thin">
          {visibleNav.map(item => {
            const isActive = page === item.id && !detailUnitId;
            return (
              <button
                key={item.id}
                onClick={() => navigateTo(item.id)}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 relative group overflow-hidden"
                style={{
                  fontFamily: '"Manrope", sans-serif',
                  fontSize: '0.92rem',
                  fontWeight: isActive ? 700 : 500,
                  letterSpacing: '0.01em',
                  color: isActive ? 'hsl(42 76% 72%)' : 'hsl(222 10% 62%)',
                  background: isActive
                    ? 'linear-gradient(90deg, hsl(42 76% 50% / 0.16) 0%, hsl(42 76% 50% / 0.04) 60%, transparent 100%)'
                    : 'transparent',
                  borderRadius: '10px',
                  borderLeft: isActive
                    ? '3px solid hsl(42 76% 58%)'
                    : '3px solid transparent',
                  transition: 'all 0.22s ease',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'hsl(222 14% 14%)';
                    e.currentTarget.style.color = 'hsl(38 18% 90%)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'hsl(222 10% 62%)';
                  }
                }}
              >
                <span
                  className="flex items-center justify-center w-7 h-7 rounded-md"
                  style={{
                    background: isActive
                      ? 'linear-gradient(135deg, hsl(42 76% 50% / 0.25), hsl(42 76% 40% / 0.1))'
                      : 'hsl(222 14% 12%)',
                    border: isActive
                      ? '1px solid hsl(42 76% 58% / 0.4)'
                      : '1px solid hsl(222 14% 18%)',
                  }}
                >
                  <Icon
                    name={item.icon}
                    size={15}
                    style={{
                      color: isActive ? 'hsl(42 80% 68%)' : 'hsl(222 8% 58%)',
                    }}
                  />
                </span>
                <span className="relative">{item.label}</span>
                {isActive && (
                  <span
                    className="ml-auto w-[6px] h-[6px] rotate-45"
                    style={{
                      background: 'linear-gradient(135deg, hsl(48 80% 72%), hsl(32 64% 40%))',
                      boxShadow: '0 0 6px hsl(42 76% 58% / 0.6)',
                    }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        <OrnateDivider />

        {/* Клеймо + статус */}
        <div className="px-3 py-3 space-y-2">
          {/* Клеймо */}
          <div className="pt-3 flex items-center justify-between">
            <div
              className="font-mono-data uppercase"
              style={{ color: 'hsl(222 8% 34%)', fontSize: '0.6rem', letterSpacing: '0.22em' }}
            >
              v·1.1.0
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="w-1 h-1 rounded-full"
                style={{ background: 'hsl(150 48% 50%)', boxShadow: '0 0 6px hsl(150 48% 50%)' }}
              />
              <span
                className="uppercase"
                style={{
                  fontFamily: '"Manrope", sans-serif',
                  fontSize: '0.58rem',
                  fontWeight: 600,
                  color: 'hsl(150 32% 52%)',
                  letterSpacing: '0.18em',
                }}
              >
                в строю
              </span>
            </div>
          </div>
        </div>

        {/* Золотая планка снизу */}
        <div className="h-[3px] sidebar-top-accent" />
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 lg:hidden"
          style={{ background: 'hsl(222 30% 3% / 0.85)', backdropFilter: 'blur(4px)' }}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ── Основной контент ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* ── Топ-бар ─ */}
        <header
          className="h-16 flex items-center px-4 lg:px-8 gap-4 relative"
          style={{
            background:
              'linear-gradient(180deg, hsl(222 18% 9%) 0%, hsl(222 20% 6%) 100%)',
            borderBottom: '1px solid hsl(222 14% 16%)',
            boxShadow:
              'inset 0 -1px 0 hsl(42 76% 50% / 0.06), 0 4px 20px hsl(222 40% 2% / 0.3)',
          }}
        >
          {/* Золотая нить снизу */}
          <div
            className="absolute left-0 right-0 bottom-0 h-px"
            style={{
              background:
                'linear-gradient(90deg, transparent, hsl(42 76% 58% / 0.5) 30%, hsl(42 76% 58%) 50%, hsl(42 76% 58% / 0.5) 70%, transparent)',
            }}
          />

          {/* Мобильное меню */}
          <button
            className="lg:hidden p-2 rounded-lg transition-all"
            style={{
              color: 'hsl(222 10% 62%)',
              background: 'hsl(222 14% 14%)',
              border: '1px solid hsl(222 14% 18%)',
            }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'hsl(42 76% 68%)';
              e.currentTarget.style.borderColor = 'hsl(42 76% 50% / 0.5)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'hsl(222 10% 62%)';
              e.currentTarget.style.borderColor = 'hsl(222 14% 18%)';
            }}
          >
            <Icon name="Menu" size={18} />
          </button>

          {/* Хлебные крошки */}
          <div className="flex items-center gap-3">
            <span
              className="w-2 h-2 rotate-45"
              style={{
                background: 'linear-gradient(135deg, hsl(48 80% 72%), hsl(32 64% 40%))',
                boxShadow: '0 0 8px hsl(42 76% 58% / 0.6)',
              }}
            />
            <button
              className="transition-colors"
              style={{
                fontFamily: '"Cormorant Garamond", serif',
                fontSize: '1.25rem',
                fontWeight: 600,
                color: 'hsl(38 22% 90%)',
                letterSpacing: '0.005em',
              }}
              onClick={() => { setPage('catalog'); setDetailUnitId(null); setForumTopicId(null); }}
              onMouseEnter={e => (e.currentTarget.style.color = 'hsl(42 76% 72%)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'hsl(38 22% 90%)')}
            >
              {currentLabel}
            </button>
            {detailUnitId && (
              <>
                <Icon name="ChevronRight" size={16} style={{ color: 'hsl(42 76% 50% / 0.5)' }} />
                <span
                  className="italic"
                  style={{
                    fontFamily: '"Cormorant Garamond", serif',
                    fontSize: '1.1rem',
                    color: 'hsl(222 10% 62%)',
                  }}
                >
                  подробности отряда
                </span>
              </>
            )}
            {page === 'forum' && forumTopicId && (
              <>
                <Icon name="ChevronRight" size={16} style={{ color: 'hsl(42 76% 50% / 0.5)' }} />
                <span
                  className="italic"
                  style={{
                    fontFamily: '"Cormorant Garamond", serif',
                    fontSize: '1.1rem',
                    color: 'hsl(222 10% 62%)',
                  }}
                >
                  обсуждение
                </span>
              </>
            )}
          </div>

          {/* Правая часть — аккаунт + уведомления */}
          <div className="ml-auto flex items-center gap-2">
            {user && (
              <>
                <button
                  onClick={() => navigateTo('messages')}
                  className="p-1.5 rounded-lg transition-all relative"
                  title="Сообщения"
                  style={{
                    color: page === 'messages' ? 'hsl(42 76% 68%)' : 'hsl(222 10% 58%)',
                    border: `1px solid ${page === 'messages' ? 'hsl(42 76% 50% / 0.4)' : 'hsl(222 14% 18%)'}`,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'hsl(42 76% 68%)'; e.currentTarget.style.borderColor = 'hsl(42 76% 50% / 0.4)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = page === 'messages' ? 'hsl(42 76% 68%)' : 'hsl(222 10% 58%)'; e.currentTarget.style.borderColor = page === 'messages' ? 'hsl(42 76% 50% / 0.4)' : 'hsl(222 14% 18%)'; }}
                >
                  <Icon name="Mail" size={16} />
                </button>
                <NotificationBell
                  onGoForum={() => navigateTo('forum')}
                  onOpenTopic={id => { navigateTo('forum'); setForumTopicId(id); }}
                />
              </>
            )}
            {!authLoading && (
              user ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigateTo('profile')}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all"
                    style={{
                      background: 'hsl(222 16% 12%)',
                      border: '1px solid hsl(42 76% 50% / 0.2)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'hsl(42 76% 50% / 0.5)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'hsl(42 76% 50% / 0.2)'; }}
                  >
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-6 h-6 rounded-md object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, hsl(48 80% 68%) 0%, hsl(32 64% 40%) 100%)' }}>
                        <Icon name="User" size={12} style={{ color: 'hsl(222 30% 10%)' }} />
                      </div>
                    )}
                    <span style={{ fontFamily: '"Manrope", sans-serif', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(38 24% 92%)' }}>
                      {user.username}
                    </span>
                    {user.is_admin && (
                      <span style={{ fontSize: '0.58rem', color: 'hsl(355 72% 68%)', fontWeight: 700 }}>✦</span>
                    )}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 rounded-lg transition-all"
                    title="Выйти"
                    style={{ color: 'hsl(222 10% 58%)', border: '1px solid hsl(222 14% 18%)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'hsl(355 72% 68%)'; e.currentTarget.style.borderColor = 'hsl(355 62% 40%)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'hsl(222 10% 58%)'; e.currentTarget.style.borderColor = 'hsl(222 14% 18%)'; }}
                  >
                    <Icon name="LogOut" size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => navigateTo('auth')}
                  className="btn-primary"
                  style={{ padding: '0.4rem 1rem', fontSize: '0.82rem' }}
                >
                  <Icon name="LogIn" size={14} />
                  Войти
                </button>
              )
            )}
          </div>
        </header>

        {/* ── Контент страниц ─ */}
        <main ref={mainRef} className="flex-1 p-4 lg:p-8 overflow-auto scrollbar-thin">
          {publicProfileUserId ? (
            <PublicProfilePage
              userId={publicProfileUserId}
              onBack={() => setPublicProfileUserId(null)}
              onOpenMessages={openMessages}
            />
          ) : detailUnitId ? (
            <UnitDetailPage
              unitId={detailUnitId}
              appliedTreaties={appliedTreaties}
              onBack={() => setDetailUnitId(null)}
              onApplyTreaty={handleApplyTreaty}
              onRemoveTreaty={handleRemoveTreaty}
            />
          ) : page === 'catalog' ? (
            <CatalogPage onSelectUnit={setDetailUnitId} onGoGuides={() => navigateTo('guides')} />
          ) : page === 'compare' ? (
            <ComparePage
              appliedTreaties={appliedTreaties}
              onApply={handleApplyTreaty}
              onRemove={handleRemoveTreaty}
            />
          ) : page === 'treaties' ? (
            <TreatiesPage
              appliedTreaties={appliedTreaties}
              onApply={handleApplyTreaty}
              onRemove={handleRemoveTreaty}
            />
          ) : page === 'forum' ? (
            forumTopicId ? (
              <TopicPage
                topicId={forumTopicId}
                onBack={() => setForumTopicId(null)}
                onOpenProfile={openPublicProfile}
                onOpenMessages={openMessages}
              />
            ) : (
              <ForumPage
                onOpenTopic={setForumTopicId}
                onOpenProfile={openPublicProfile}
              />
            )
          ) : page === 'game' ? (
            <WhamPage />
          ) : page === 'about' ? (
            <AboutPage />
          ) : page === 'auth' ? (
            <AuthPage onSuccess={() => setPage('catalog')} />
          ) : page === 'admin' ? (
            <AdminPage />
          ) : page === 'guides' ? (
            guideDetailId ? (
              <GuideDetailPage
                guideId={guideDetailId}
                onBack={() => setGuideDetailId(null)}
                onOpenProfile={openPublicProfile}
              />
            ) : (
              <GuidesPage
                onOpenGuide={id => { setGuideDetailId(id); mainRef.current?.scrollTo({ top: 0, behavior: 'instant' }); }}
                onOpenProfile={openPublicProfile}
              />
            )
          ) : page === 'profile' ? (
            <ProfilePage onOpenMessages={openMessages} />
          ) : page === 'messages' ? (
            <MessagesPage
              initialUserId={messagesWithUser?.id}
              initialUsername={messagesWithUser?.username}
              onOpenProfile={openPublicProfile}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}