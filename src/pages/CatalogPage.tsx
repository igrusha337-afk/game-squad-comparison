import { useState, useMemo } from 'react';
import { useUnits } from '@/hooks/useAppData';
import { UnitClass, Rarity } from '@/data/types';
import UnitCard from '@/components/UnitCard';
import Icon from '@/components/ui/icon';
import { useStreamers } from '@/hooks/useStreamers';

const CLASSES: UnitClass[] = ['Пехота', 'Кавалерия', 'Стрелки', 'Осадные'];
const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const RARITY_LABELS: Record<Rarity, string> = {
  common: 'Обычный',
  uncommon: 'Необычный',
  rare: 'Редкий',
  epic: 'Уникальный',
  legendary: 'Легендарный',
};

const CLASS_META: Record<UnitClass, { icon: string; hue: string }> = {
  'Пехота':     { icon: 'Sword',     hue: '220 10% 60%' },
  'Кавалерия':  { icon: 'Zap',       hue: '42 76% 58%'  },
  'Стрелки':    { icon: 'Crosshair', hue: '150 48% 50%' },
  'Осадные':    { icon: 'Hammer',    hue: '18 84% 58%'  },
};

interface CatalogPageProps {
  onSelectUnit: (id: string) => void;
  onGoGuides?: () => void;
  onGoStreamers?: () => void;
}

export default function CatalogPage({ onSelectUnit, onGoGuides, onGoStreamers }: CatalogPageProps) {
  const { units: UNITS, loading } = useUnits();
  const { liveStreamers } = useStreamers();

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState<UnitClass | ''>('');
  const [rarityFilter, setRarityFilter] = useState<Rarity | ''>('');
  const [sortBy, setSortBy] = useState<
    'name' | 'leadership' | 'stars' | 'rarity'
  >('rarity');

  const RARITY_ORDER: Record<string, number> = {
    legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1,
  };

  const filtered = useMemo(() => {
    return UNITS.filter(u => {
      if (search && !u.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (classFilter && u.class !== classFilter) return false;
      if (rarityFilter && u.rarity !== rarityFilter) return false;
      return true;
    }).sort((a, b) => {
      if (sortBy === 'rarity') return (RARITY_ORDER[b.rarity] ?? 0) - (RARITY_ORDER[a.rarity] ?? 0);
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'ru');
      if (sortBy === 'leadership') return b.stats.leadership - a.stats.leadership;
      if (sortBy === 'stars') return (b.stars ?? 0) - (a.stars ?? 0);
      return 0;
    });
  }, [search, classFilter, rarityFilter, sortBy, UNITS]);

  const clearFilters = () => {
    setSearch('');
    setClassFilter('');
    setRarityFilter('');
  };

  const hasFilters = search || classFilter || rarityFilter;

  /* статистика */
  const classCounts = useMemo(() => {
    const m: Record<string, number> = {};
    UNITS.forEach(u => (m[u.class] = (m[u.class] ?? 0) + 1));
    return m;
  }, [UNITS]);

  const legendaryCount = useMemo(
    () => UNITS.filter(u => u.rarity === 'legendary').length,
    [UNITS],
  );

  if (loading)
    return (
      <div className="flex items-center justify-center py-28">
        <div className="flex items-center gap-3">
          <Icon name="Loader" size={20} className="animate-spin" style={{ color: 'hsl(42 76% 58%)' }} />
          <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.15rem', fontStyle: 'italic', color: 'hsl(222 10% 62%)' }}>
            загружаем каталог…
          </span>
        </div>
      </div>
    );

  const selectStyle: React.CSSProperties = {
    fontFamily: 'Manrope, sans-serif',
    fontSize: '0.86rem',
    fontWeight: 500,
    color: 'hsl(38 18% 86%)',
    background: 'hsl(222 16% 12%)',
    border: '1px solid hsl(222 14% 20%)',
    padding: '0.55rem 0.85rem',
    borderRadius: '8px',
    outline: 'none',
    cursor: 'pointer',
  };

  return (
    <div className="max-w-[1400px] mx-auto animate-fade-in">
      {/* ═════ АКТИВНЫЕ СТРИМЫ ═════ */}
      {liveStreamers.length > 0 && (
        <button
          onClick={onGoStreamers}
          className="w-full mb-6 flex items-center gap-3 px-5 py-3.5 rounded-2xl transition-all text-left"
          style={{
            background: 'linear-gradient(90deg, hsl(0 72% 50% / 0.1), hsl(0 72% 50% / 0.03))',
            border: '1px solid hsl(0 72% 55% / 0.4)',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'hsl(0 72% 60% / 0.7)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'hsl(0 72% 55% / 0.4)'; }}
        >
          <span className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ background: 'hsl(0 72% 55%)' }} />
          <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: '0.85rem', fontWeight: 700, color: 'hsl(0 72% 68%)' }}>
            Сейчас в эфире:
          </span>
          <span className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            {liveStreamers.slice(0, 5).map(s => (
              <span key={s.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                style={{ background: 'hsl(222 20% 10%)', border: '1px solid hsl(222 14% 20%)' }}>
                <Icon name="Twitch" size={11} style={{ color: 'hsl(262 60% 65%)' }} />
                <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: '0.78rem', color: 'hsl(38 18% 88%)' }}>{s.display_name}</span>
              </span>
            ))}
            {liveStreamers.length > 5 && (
              <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: '0.78rem', color: 'hsl(222 8% 54%)' }}>
                +{liveStreamers.length - 5} ещё
              </span>
            )}
          </span>
          <Icon name="ChevronRight" size={16} className="flex-shrink-0" style={{ color: 'hsl(0 72% 60%)' }} />
        </button>
      )}

      {/* ═════ HERO ═════ */}
      <section className="mb-10 relative">
        {/* Декоративные световые пятна */}
        <div
          className="absolute -top-10 left-1/4 w-96 h-96 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, hsl(42 76% 50% / 0.12) 0%, transparent 60%)',
            filter: 'blur(40px)',
          }}
        />
        <div
          className="absolute top-10 right-1/4 w-80 h-80 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, hsl(354 62% 44% / 0.1) 0%, transparent 60%)',
            filter: 'blur(40px)',
          }}
        />

        <div className="relative">
          {/* Эпиграф */}
          <div className="flex items-center justify-center gap-3 mb-5">
            <span className="h-px w-10 bg-primary/40" />
            <span
              className="uppercase font-mono-data"
              style={{
                fontSize: '0.68rem',
                letterSpacing: '0.38em',
                color: 'hsl(42 76% 58%)',
              }}
            >
              ◆ MMXXVI · глава I ◆
            </span>
            <span className="h-px w-10 bg-primary/40" />
          </div>

          {/* Большой заголовок */}
          <h1
            className="text-center"
            style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 'clamp(2.8rem, 6.5vw, 5.2rem)',
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              color: 'hsl(38 24% 94%)',
            }}
          >
            Каталог{' '}
            <span className="text-gradient-gold" style={{ fontStyle: 'italic' }}>
              отрядов
            </span>
          </h1>

          <p
            className="text-center mt-5 max-w-2xl mx-auto"
            style={{
              fontFamily: 'Manrope, sans-serif',
              fontSize: '1.02rem',
              color: 'hsl(222 8% 62%)',
              lineHeight: 1.6,
            }}
          >
            Полный реестр рот, хоругвей и дружин с характеристиками, умениями и возможностью
            применить трактаты. Выбирай героев, сравнивай их и строй идеальное войско.
          </p>

          {/* Быстрая статистика */}
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <StatChip
              icon="Users"
              label="Всего отрядов"
              value={UNITS.length}
              hue="42 76% 58%"
            />
            <StatChip
              icon="Flame"
              label="Легендарных"
              value={legendaryCount}
              hue="18 84% 58%"
            />
            {(Object.keys(classCounts) as UnitClass[]).slice(0, 4).map(cls => (
              <StatChip
                key={cls}
                icon={CLASS_META[cls]?.icon ?? 'Shield'}
                label={cls}
                value={classCounts[cls]}
                hue={CLASS_META[cls]?.hue ?? '222 10% 60%'}
              />
            ))}
          </div>

          {/* Кнопка перехода в Гайды */}
          {onGoGuides && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={onGoGuides}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all"
                style={{
                  background: 'hsl(42 76% 50% / 0.1)',
                  border: '1px solid hsl(42 76% 50% / 0.35)',
                  fontFamily: '"Manrope", sans-serif',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: 'hsl(42 76% 68%)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'hsl(42 76% 50% / 0.18)'; e.currentTarget.style.borderColor = 'hsl(42 76% 50% / 0.6)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'hsl(42 76% 50% / 0.1)'; e.currentTarget.style.borderColor = 'hsl(42 76% 50% / 0.35)'; }}
              >Гайды по игре - Отряды/Экономика и многое другое</button>
            </div>
          )}
        </div>
      </section>

      {/* ═════ ПАНЕЛЬ ФИЛЬТРОВ ═════ */}
      <div
        className="mb-8 relative overflow-hidden"
        style={{
          background:
            'linear-gradient(180deg, hsl(222 16% 12%) 0%, hsl(222 18% 8%) 100%)',
          border: '1px solid hsl(222 14% 18%)',
          borderRadius: '16px',
          boxShadow:
            'inset 0 1px 0 hsl(42 30% 40% / 0.06), 0 12px 28px hsl(222 40% 2% / 0.4)',
        }}
      >
        {/* Золотая лента сверху */}
        <div
          className="h-[2px] w-full"
          style={{
            background:
              'linear-gradient(90deg, transparent, hsl(42 76% 58% / 0.6) 50%, transparent)',
          }}
        />

        <div className="p-5 lg:p-6 space-y-4">
          {/* Поиск */}
          <div className="relative">
            <Icon
              name="Search"
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2"
              style={{ color: 'hsl(42 76% 58%)' }}
            />
            <input
              type="text"
              placeholder="Найти отряд по названию…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full input-rich"
              style={{
                padding: '0.9rem 1rem 0.9rem 3rem',
                fontSize: '1rem',
                fontWeight: 500,
              }}
            />
          </div>

          {/* Фильтры */}
          <div className="flex flex-wrap items-center gap-2.5">
            <FilterLabel>Класс</FilterLabel>
            <select
              value={classFilter}
              onChange={e => setClassFilter(e.target.value as UnitClass | '')}
              style={selectStyle}
            >
              <option value="">Все</option>
              {CLASSES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <FilterLabel>Ранг</FilterLabel>
            <select
              value={rarityFilter}
              onChange={e => setRarityFilter(e.target.value as Rarity | '')}
              style={selectStyle}
            >
              <option value="">Любой</option>
              {RARITIES.map(r => (
                <option key={r} value={r}>{RARITY_LABELS[r]}</option>
              ))}
            </select>

            <div className="ml-auto flex items-center gap-2">
              <FilterLabel>Сортировка</FilterLabel>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as typeof sortBy)}
                style={selectStyle}
              >
                <option value="rarity">По редкости</option>
                <option value="name">По названию</option>
                <option value="stars">По рейтингу</option>
                <option value="leadership">По лидерству</option>
              </select>

              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="btn-ghost"
                  style={{ padding: '0.55rem 0.9rem', fontSize: '0.78rem' }}
                >
                  <Icon name="X" size={14} />
                  Сбросить
                </button>
              )}
            </div>
          </div>

          {/* Счётчик результатов */}
          <div
            className="flex items-center gap-2 pt-1"
            style={{
              fontFamily: 'Manrope, sans-serif',
              fontSize: '0.78rem',
              color: 'hsl(222 8% 56%)',
            }}
          >
            <span
              className="font-mono-data font-semibold px-2 py-0.5 rounded"
              style={{
                background: 'hsl(42 76% 50% / 0.12)',
                color: 'hsl(42 76% 68%)',
                border: '1px solid hsl(42 76% 50% / 0.3)',
              }}
            >
              {filtered.length}
            </span>
            найдено из {UNITS.length}
          </div>
        </div>
      </div>

      {/* ═════ СЕТКА ═════ */}
      {filtered.length === 0 ? (
        <div
          className="text-center py-24 rounded-2xl"
          style={{
            background:
              'linear-gradient(180deg, hsl(222 16% 10%) 0%, hsl(222 18% 7%) 100%)',
            border: '1px dashed hsl(222 14% 22%)',
          }}
        >
          <div
            className="w-20 h-20 mx-auto mb-5 rounded-2xl flex items-center justify-center"
            style={{
              background:
                'linear-gradient(135deg, hsl(222 14% 14%) 0%, hsl(222 18% 10%) 100%)',
              border: '1px solid hsl(222 14% 20%)',
            }}
          >
            <Icon name="SearchX" size={36} style={{ color: 'hsl(42 76% 58% / 0.65)' }} />
          </div>
          <h3
            style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: '1.8rem',
              fontWeight: 600,
              color: 'hsl(38 22% 88%)',
            }}
          >
            Ничего не найдено
          </h3>
          <p
            className="mt-2"
            style={{
              fontFamily: 'Manrope, sans-serif',
              fontSize: '0.92rem',
              color: 'hsl(222 8% 58%)',
            }}
          >
            Попробуйте изменить фильтры или поисковый запрос.
          </p>
          {hasFilters && (
            <button onClick={clearFilters} className="btn-primary mt-6">
              <Icon name="X" size={15} />
              Сбросить фильтры
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((unit, i) => (
            <div
              key={unit.id}
              className="animate-slide-up"
              style={{ animationDelay: `${Math.min(i * 25, 500)}ms`, opacity: 0 }}
            >
              <UnitCard unit={unit} onClick={() => onSelectUnit(unit.id)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Вспомогательные компоненты ─── */

function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="uppercase"
      style={{
        fontFamily: 'Manrope, sans-serif',
        fontSize: '0.64rem',
        fontWeight: 700,
        letterSpacing: '0.18em',
        color: 'hsl(42 40% 58%)',
      }}
    >
      {children}
    </span>
  );
}

function StatChip({
  icon,
  label,
  value,
  hue,
}: {
  icon: string;
  label: string;
  value: number;
  hue: string;
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all"
      style={{
        background: `linear-gradient(135deg, hsl(${hue} / 0.12) 0%, hsl(222 16% 10%) 100%)`,
        border: `1px solid hsl(${hue} / 0.35)`,
        boxShadow: `inset 0 1px 0 hsl(${hue} / 0.15), 0 4px 12px hsl(222 40% 2% / 0.3)`,
      }}
    >
      <span
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{
          background: `hsl(${hue} / 0.2)`,
          border: `1px solid hsl(${hue} / 0.4)`,
        }}
      >
        <Icon name={icon} size={15} style={{ color: `hsl(${hue})` }} />
      </span>
      <div>
        <div
          className="font-mono-data"
          style={{
            fontSize: '1.05rem',
            fontWeight: 600,
            color: `hsl(${hue})`,
            lineHeight: 1,
          }}
        >
          {value}
        </div>
        <div
          className="uppercase mt-0.5"
          style={{
            fontFamily: 'Manrope, sans-serif',
            fontSize: '0.58rem',
            fontWeight: 600,
            letterSpacing: '0.14em',
            color: 'hsl(222 8% 58%)',
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}