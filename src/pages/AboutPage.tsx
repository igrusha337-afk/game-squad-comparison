import Icon from '@/components/ui/icon';

/* ─── Блоки ─── */

function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-4 mb-6">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background:
            'linear-gradient(135deg, hsl(42 76% 50% / 0.25) 0%, hsl(30 64% 36% / 0.1) 100%)',
          border: '1px solid hsl(42 76% 58% / 0.45)',
          boxShadow: 'inset 0 1px 0 hsl(42 76% 60% / 0.25), 0 4px 12px hsl(42 76% 40% / 0.2)',
        }}
      >
        <Icon name={icon} size={22} style={{ color: 'hsl(42 80% 68%)' }} />
      </div>
      <div className="flex-1 min-w-0 pt-1">
        <h2
          style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '1.9rem',
            fontWeight: 700,
            color: 'hsl(38 24% 94%)',
            letterSpacing: '-0.015em',
            lineHeight: 1.1,
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            className="mt-1"
            style={{
              fontFamily: 'Manrope, sans-serif',
              fontSize: '0.88rem',
              color: 'hsl(222 8% 58%)',
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative p-7 md:p-9 rounded-2xl overflow-hidden ${className}`}
      style={{
        background:
          'linear-gradient(180deg, hsl(222 16% 12%) 0%, hsl(222 20% 7%) 100%)',
        border: '1px solid hsl(222 14% 18%)',
        boxShadow:
          'inset 0 1px 0 hsl(42 30% 40% / 0.08), 0 12px 28px hsl(222 40% 2% / 0.4)',
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent, hsl(42 76% 58% / 0.5) 50%, transparent)',
        }}
      />
      {children}
    </div>
  );
}

function Paragraph({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={`leading-relaxed ${className}`}
      style={{
        fontFamily: 'Manrope, sans-serif',
        fontSize: '1rem',
        color: 'hsl(222 8% 74%)',
        lineHeight: 1.65,
      }}
    >
      {children}
    </p>
  );
}

/* ─── Страница ─── */

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto pb-20 animate-fade-in">
      {/* HERO */}
      <header className="mb-14 relative">
        <div
          className="absolute -top-10 left-1/4 w-96 h-96 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, hsl(42 76% 50% / 0.15) 0%, transparent 60%)',
            filter: 'blur(40px)',
          }}
        />
        <div
          className="absolute top-20 right-1/4 w-72 h-72 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, hsl(354 62% 44% / 0.1) 0%, transparent 60%)',
            filter: 'blur(40px)',
          }}
        />

        <div className="relative text-center">
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
              ◆ О проекте ◆
            </span>
            <span className="h-px w-10 bg-primary/40" />
          </div>

          <h1
            style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 'clamp(2.8rem, 6.5vw, 5rem)',
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              color: 'hsl(38 24% 94%)',
            }}
          >
            Между{' '}
            <span className="text-gradient-gold" style={{ fontStyle: 'italic' }}>
              двух эпох
            </span>
          </h1>

          <p
            className="mt-5 max-w-2xl mx-auto"
            style={{
              fontFamily: 'Manrope, sans-serif',
              fontSize: '1.08rem',
              color: 'hsl(222 8% 66%)',
              lineHeight: 1.6,
            }}
          >
            Современный справочник по отрядам с духом средневековых хроник. Здесь
            каждая хоругвь — это герб, цифры и история, собранные в одной удобной
            витрине.
          </p>
        </div>
      </header>

      <div className="space-y-6">
        {/* О проекте */}
        <Card>
          <SectionHeader
            icon="BookOpen"
            title="Что это такое"
            subtitle="Коротко о «Хоругви»"
          />
          <Paragraph className="drop-cap mb-4">
            «Хоругвь» — это каталог отрядов, собранный для тех, кто любит
            планировать состав войска осмысленно. Мы взяли средневековую эстетику
            гербов, печатей и хроник, соединили её с современным интерфейсом, удобным
            поиском и гибкими фильтрами — и получили рабочий инструмент, в который
            приятно возвращаться.
          </Paragraph>
          <Paragraph>
            Здесь нет сложных правил и магических порталов: только данные об
            отрядах, их характеристики, умения, черты и связанные с ними трактаты.
            Всё можно сравнить, сопоставить и собрать идеальную роту под свою задачу.
          </Paragraph>
        </Card>

        {/* Разделы */}
        <Card>
          <SectionHeader
            icon="LayoutGrid"
            title="Разделы"
            subtitle="Куда можно заглянуть"
          />
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                icon: 'LayoutGrid',
                title: 'Каталог отрядов',
                desc:
                  'Сердце проекта. Все отряды с фильтрами по классу, роли и рангу. Поиск по названию, сортировка по параметрам.',
                hue: '42 76% 58%',
              },
              {
                icon: 'Swords',
                title: 'Сравнение',
                desc:
                  'Поставьте до 4 отрядов рядом. Лучшие значения подсвечиваются автоматически — видно, кто сильнее и в чём.',
                hue: '354 62% 54%',
              },
              {
                icon: 'ScrollText',
                title: 'Трактаты',
                desc:
                  'Прикладывайте совместимые трактаты к отрядам и сразу видите итоговые характеристики. Бонусы считаются мгновенно.',
                hue: '282 58% 60%',
              },
              {
                icon: 'MessageSquare',
                title: 'Форум',
                desc:
                  'Обсуждения, стратегии, предложения правок. Здесь можно написать напрямую писцу — автору каталога.',
                hue: '210 78% 58%',
              },
            ].map(item => (
              <div
                key={item.title}
                className="p-5 rounded-xl transition-all group cursor-default"
                style={{
                  background: `linear-gradient(180deg, hsl(${item.hue} / 0.08), hsl(222 18% 8%))`,
                  border: `1px solid hsl(${item.hue} / 0.3)`,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = `hsl(${item.hue} / 0.6)`;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 12px 24px hsl(222 40% 2% / 0.5), 0 0 20px hsl(${item.hue} / 0.15)`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = `hsl(${item.hue} / 0.3)`;
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                  style={{
                    background: `linear-gradient(135deg, hsl(${item.hue} / 0.25), hsl(${item.hue} / 0.08))`,
                    border: `1px solid hsl(${item.hue} / 0.5)`,
                  }}
                >
                  <Icon name={item.icon} size={18} style={{ color: `hsl(${item.hue})` }} />
                </div>
                <div
                  style={{
                    fontFamily: 'Cormorant Garamond, serif',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: 'hsl(38 24% 92%)',
                    marginBottom: '0.4rem',
                  }}
                >
                  {item.title}
                </div>
                <div
                  style={{
                    fontFamily: 'Manrope, sans-serif',
                    fontSize: '0.86rem',
                    color: 'hsl(222 8% 62%)',
                    lineHeight: 1.5,
                  }}
                >
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Ранги */}
        <Card>
          <SectionHeader
            icon="Award"
            title="Ранги отрядов"
            subtitle="Пять ступеней геральдической иерархии"
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: 'Обычный',     hue: '220 10% 60%',  lore: 'Рядовая пехота городских ополчений.' },
              { label: 'Необычный',   hue: '150 48% 50%',  lore: 'Закалённые ветераны длинных походов.' },
              { label: 'Редкий',      hue: '210 78% 58%',  lore: 'Королевские хоругви под гербом.' },
              { label: 'Уникальный',  hue: '282 58% 60%',  lore: 'Вассалы высокой крови и славы.' },
              { label: 'Легендарный', hue: '18 84% 58%',   lore: 'Те, о ком слагают песни у костра.' },
            ].map(r => (
              <div
                key={r.label}
                className="p-4 rounded-xl relative overflow-hidden"
                style={{
                  background: `linear-gradient(180deg, hsl(${r.hue} / 0.18), hsl(222 18% 8%))`,
                  border: `1px solid hsl(${r.hue} / 0.45)`,
                  boxShadow: `inset 0 1px 0 hsl(${r.hue} / 0.25)`,
                }}
              >
                <div
                  className="absolute top-0 left-0 right-0 h-px"
                  style={{
                    background: `linear-gradient(90deg, transparent, hsl(${r.hue}) 50%, transparent)`,
                  }}
                />
                <div
                  className="uppercase mb-2"
                  style={{
                    fontFamily: 'Manrope, sans-serif',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    letterSpacing: '0.12em',
                    color: `hsl(${r.hue})`,
                    textShadow: '0 1px 0 hsl(0 0% 0% / 0.5)',
                  }}
                >
                  {r.label}
                </div>
                <div
                  className="italic leading-snug"
                  style={{
                    fontFamily: 'Cormorant Garamond, serif',
                    fontSize: '0.96rem',
                    color: 'hsl(222 10% 72%)',
                  }}
                >
                  {r.lore}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Команда и благодарности */}
        <Card>
          <SectionHeader
            icon="Users"
            title="Команда"
            subtitle="Те, кто стоит за проектом"
          />
          <Paragraph className="mb-6">
            Сайт разработан игровым сообществом{' '}
            <span style={{ color: 'hsl(42 76% 68%)', fontWeight: 700 }}>ASGARD</span>{' '}
            и другими неравнодушными игроками. Мы создали этот инструмент для всех,
            кто хочет глубже понимать игру и принимать взвешенные тактические решения.
          </Paragraph>

          <div
            className="h-px mb-6"
            style={{ background: 'linear-gradient(90deg, transparent, hsl(42 76% 58% / 0.3) 50%, transparent)' }}
          />

          <div
            className="uppercase mb-4"
            style={{
              fontFamily: 'Manrope, sans-serif',
              fontSize: '0.68rem',
              fontWeight: 700,
              letterSpacing: '0.25em',
              color: 'hsl(42 50% 54%)',
            }}
          >
            ◆ Особая благодарность
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { nick: 'Alef_Beit', role: 'за помощь в наполнении данными' },
              { nick: 'Apsilon', role: 'за помощь в тестировании' },
              { nick: 'Zeozzz', role: 'за помощь в наполнении данными' },
              { nick: 'Apsilon', role: 'за помощь в наполнении данными' },
              { nick: 'DOktor_NeAdekvaT', role: 'за ценные советы и обратную связь' },
              { nick: 'Apsilon', role: 'за ценные советы и обратную связь' },
            ].map(item => (
              <div
                key={item.nick}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{
                  background: 'hsl(222 16% 10%)',
                  border: '1px solid hsl(42 76% 50% / 0.15)',
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, hsl(42 76% 50% / 0.2), hsl(30 64% 36% / 0.1))',
                    border: '1px solid hsl(42 76% 58% / 0.3)',
                  }}
                >
                  <Icon name="Sword" size={14} style={{ color: 'hsl(42 76% 64%)' }} />
                </div>
                <div>
                  <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: '0.9rem', fontWeight: 700, color: 'hsl(38 24% 92%)' }}>
                    {item.nick}
                  </div>
                  <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: '0.76rem', color: 'hsl(222 8% 54%)' }}>
                    {item.role}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Подпись */}
        <div className="text-center pt-6 pb-4">
          <div className="inline-flex items-center gap-3">
            <span className="h-px w-12 bg-primary/40" />
            <span
              className="uppercase font-mono-data"
              style={{
                fontSize: '0.68rem',
                letterSpacing: '0.32em',
                color: 'hsl(42 50% 54%)',
              }}
            >
              ANNO · MMXXVI
            </span>
            <span className="h-px w-12 bg-primary/40" />
          </div>
          <p
            className="italic mt-3"
            style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: '1rem',
              color: 'hsl(222 8% 52%)',
            }}
          >
            «Сделано с заботой — для тех, кто любит стратегию и детали.»
          </p>
        </div>
      </div>
    </div>
  );
}