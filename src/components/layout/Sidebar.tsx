import Icon from '@/components/ui/icon';
import { ShieldEmblem, OrnateDivider } from './SidebarDecorations';

type Page = 'catalog' | 'compare' | 'treaties' | 'houses' | 'forum' | 'guides' | 'game' | 'about' | 'auth' | 'admin' | 'profile' | 'messages';

const NAV_ITEMS: Array<{ id: Page; label: string; icon: string; adminOnly?: boolean; authOnly?: boolean; hidden?: boolean }> = [
  { id: 'catalog',  label: 'Каталог',    icon: 'LayoutGrid' },
  { id: 'compare',  label: 'Сравнение',  icon: 'Swords' },
  { id: 'treaties', label: 'Трактаты',   icon: 'ScrollText', hidden: true },
  { id: 'houses',   label: 'Дома CB',    icon: 'Shield' },
  { id: 'forum',    label: 'Форум',      icon: 'MessageSquare' },
  { id: 'guides',   label: 'Гайды',      icon: 'BookOpen' },
  { id: 'game',     label: 'Неадекватная игра', icon: 'Gamepad2' },
  { id: 'about',    label: 'О проекте',  icon: 'Info' },
  { id: 'admin',    label: 'Управление', icon: 'Settings', adminOnly: true },
];

interface SidebarProps {
  page: Page;
  detailUnitId: string | null;
  mobileMenuOpen: boolean;
  isAdmin: boolean;
  onNavigate: (p: Page) => void;
  onCloseMobile: () => void;
}

export default function Sidebar({ page, detailUnitId, mobileMenuOpen, isAdmin, onNavigate, onCloseMobile }: SidebarProps) {
  const visibleNav = NAV_ITEMS.filter(item =>
    !item.hidden && (!item.adminOnly || isAdmin) && (!item.authOnly)
  );

  return (
    <>
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex flex-col
          transition-transform duration-250
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0 lg:flex
        `}
        style={{
          width: '248px',
          background: 'linear-gradient(180deg, hsl(222 20% 8%) 0%, hsl(222 22% 5%) 100%)',
          borderRight: '1px solid hsl(222 14% 14%)',
          boxShadow: 'inset -1px 0 0 hsl(42 76% 50% / 0.08), 4px 0 24px hsl(222 40% 2% / 0.4)',
        }}
      >
        <div className="h-[3px] sidebar-top-accent" />

        <div className="px-5 py-6 flex items-center gap-3 relative">
          <div style={{ filter: 'drop-shadow(0 4px 12px hsl(42 76% 40% / 0.35))' }}>
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

        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto scrollbar-thin">
          {visibleNav.map(item => {
            const isActive = page === item.id && !detailUnitId;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
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
                  borderLeft: isActive ? '3px solid hsl(42 76% 58%)' : '3px solid transparent',
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
                    style={{ color: isActive ? 'hsl(42 80% 68%)' : 'hsl(222 8% 58%)' }}
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

        <div className="px-3 py-3 space-y-2">
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

        <div className="h-[3px] sidebar-top-accent" />
      </aside>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 lg:hidden"
          style={{ background: 'hsl(222 30% 3% / 0.85)', backdropFilter: 'blur(4px)' }}
          onClick={onCloseMobile}
        />
      )}
    </>
  );
}