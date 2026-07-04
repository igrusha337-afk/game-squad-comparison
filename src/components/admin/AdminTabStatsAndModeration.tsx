import Icon from '@/components/ui/icon';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface DailyPoint { date: string; visitors: number; }
interface TopPage { path: string; views: number; unique: number; }
interface NewUsersPoint { date: string; count: number; }
interface HourlyPoint { hour: number; views: number; }

interface SiteStats {
  total_unique: number;
  total_views: number;
  today_unique: number;
  week_unique: number;
  month_unique: number;
  total_users: number;
  avg_views_per_visitor: number;
  daily: DailyPoint[];
  top_pages: TopPage[];
  new_users_daily: NewUsersPoint[];
  hourly: HourlyPoint[];
}

interface AdminTabStatsProps {
  siteStats: SiteStats | null;
  statsLoading: boolean;
}

function decodePath(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

const CHART_TOOLTIP_STYLE = {
  background: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '4px',
  fontSize: '12px',
};

export function AdminTabStats({ siteStats, statsLoading }: AdminTabStatsProps) {
  return (
    <div>
      {statsLoading ? (
        <div className="py-12 text-center text-muted-foreground text-sm">Загрузка статистики...</div>
      ) : !siteStats ? (
        <div className="py-12 text-center text-muted-foreground text-sm">Нет данных</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'За сегодня', value: siteStats.today_unique, icon: 'CalendarDays' },
              { label: 'За 7 дней', value: siteStats.week_unique, icon: 'TrendingUp' },
              { label: 'За 30 дней', value: siteStats.month_unique, icon: 'BarChart2' },
              { label: 'Всего уникальных', value: siteStats.total_unique, icon: 'Users' },
              { label: 'Всего просмотров', value: siteStats.total_views, icon: 'Eye' },
              { label: 'Зарегистрировано', value: siteStats.total_users, icon: 'UserCheck' },
              { label: 'Просмотров на посетителя', value: siteStats.avg_views_per_visitor, icon: 'Activity' },
            ].map(({ label, value, icon }) => (
              <div key={label} className="bg-card border border-border rounded-sm p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Icon name={icon as Parameters<typeof Icon>[0]['name']} size={14} />
                  <span className="text-xs">{label}</span>
                </div>
                <div className="text-2xl font-semibold text-foreground" style={{ fontFamily: 'Oswald, sans-serif' }}>{value}</div>
              </div>
            ))}
          </div>

          {siteStats.daily.length > 0 && (
            <div className="bg-card border border-border rounded-sm p-4">
              <div className="text-xs text-muted-foreground mb-4">Уникальные посетители за 30 дней</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={siteStats.daily} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tickFormatter={d => d.slice(5)} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    labelFormatter={d => String(d).slice(5)}
                    formatter={(v: number) => [v, 'Посетители']}
                  />
                  <Line type="monotone" dataKey="visitors" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {siteStats.new_users_daily.length > 0 && (
            <div className="bg-card border border-border rounded-sm p-4">
              <div className="text-xs text-muted-foreground mb-4">Новые регистрации за 30 дней</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={siteStats.new_users_daily} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tickFormatter={d => d.slice(5)} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    labelFormatter={d => String(d).slice(5)}
                    formatter={(v: number) => [v, 'Регистраций']}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {siteStats.hourly.length > 0 && (
            <div className="bg-card border border-border rounded-sm p-4">
              <div className="text-xs text-muted-foreground mb-4">Активность по часам суток (за 30 дней)</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={siteStats.hourly} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" tickFormatter={h => `${h}:00`} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    labelFormatter={h => `${h}:00`}
                    formatter={(v: number) => [v, 'Просмотров']}
                  />
                  <Bar dataKey="views" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {siteStats.top_pages.length > 0 && (
            <div className="bg-card border border-border rounded-sm p-4">
              <div className="text-xs text-muted-foreground mb-4">Топ-10 популярных страниц</div>
              <div className="space-y-2">
                {siteStats.top_pages.map((p, i) => (
                  <div key={p.path} className="flex items-center gap-3 text-sm">
                    <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                    <span className="flex-1 truncate text-foreground">{decodePath(p.path)}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{p.unique} уник. · {p.views} просм.</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface PendingTopic { id: number; title: string; content: string; author: string; author_id: number; created_at: string; }
interface PendingGuide { id: number; title: string; author: string; author_id: number; created_at: string; }

interface AdminTabModerationProps {
  pendingTopics: PendingTopic[];
  pendingGuides: PendingGuide[];
  moderationLoading: boolean;
  expandedTopic: number | null;
  processingId: string | null;
  onSetExpandedTopic: (id: number | null) => void;
  onPublishTopic: (id: number, approve: boolean) => void;
  onPublishGuide: (id: number, approve: boolean) => void;
}

export function AdminTabModeration({
  pendingTopics,
  pendingGuides,
  moderationLoading,
  expandedTopic,
  processingId,
  onSetExpandedTopic,
  onPublishTopic,
  onPublishGuide,
}: AdminTabModerationProps) {
  return (
    <div>
      {moderationLoading ? (
        <div className="py-12 text-center text-muted-foreground text-sm">Загрузка...</div>
      ) : (pendingTopics.length + pendingGuides.length) === 0 ? (
        <div className="py-16 text-center">
          <Icon name="CheckCircle" size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm text-muted-foreground">Нет публикаций на проверке</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pendingTopics.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Icon name="MessageSquare" size={14} className="text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Темы форума ({pendingTopics.length})
                </span>
              </div>
              <div className="space-y-3">
                {pendingTopics.map(topic => (
                  <div key={topic.id} className="bg-card border border-border rounded-sm overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-foreground mb-1">{topic.title}</div>
                          <div className="text-xs text-muted-foreground mb-2">
                            Автор: <span className="text-foreground">{topic.author}</span> · {new Date(topic.created_at).toLocaleDateString('ru')}
                          </div>
                          {expandedTopic === topic.id && (
                            <div className="text-xs text-muted-foreground leading-relaxed mt-2 mb-3 max-h-40 overflow-y-auto"
                              dangerouslySetInnerHTML={{ __html: topic.content }} />
                          )}
                          <button onClick={() => onSetExpandedTopic(expandedTopic === topic.id ? null : topic.id)}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                            <Icon name={expandedTopic === topic.id ? 'ChevronUp' : 'ChevronDown'} size={11} />
                            {expandedTopic === topic.id ? 'Свернуть' : 'Читать текст'}
                          </button>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => onPublishTopic(topic.id, true)}
                            disabled={processingId === `topic-${topic.id}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-sm font-semibold transition-all disabled:opacity-40"
                            style={{ background: 'hsl(150 48% 40% / 0.15)', border: '1px solid hsl(150 48% 40% / 0.4)', color: 'hsl(150 48% 60%)' }}>
                            <Icon name={processingId === `topic-${topic.id}` ? 'Loader' : 'Check'} size={12} className={processingId === `topic-${topic.id}` ? 'animate-spin' : ''} /> Одобрить
                          </button>
                          <button onClick={() => onPublishTopic(topic.id, false)}
                            disabled={processingId === `topic-${topic.id}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-sm font-semibold transition-all disabled:opacity-40"
                            style={{ background: 'hsl(355 62% 40% / 0.15)', border: '1px solid hsl(355 62% 40% / 0.4)', color: 'hsl(355 72% 62%)' }}>
                            <Icon name="X" size={12} /> Отклонить
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pendingGuides.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Icon name="BookOpen" size={14} className="text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Гайды ({pendingGuides.length})
                </span>
              </div>
              <div className="space-y-3">
                {pendingGuides.map(guide => (
                  <div key={guide.id} className="bg-card border border-border rounded-sm p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-foreground mb-1">{guide.title}</div>
                        <div className="text-xs text-muted-foreground">
                          Автор: <span className="text-foreground">{guide.author}</span> · {new Date(guide.created_at).toLocaleDateString('ru')}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => onPublishGuide(guide.id, true)}
                          disabled={processingId === `guide-${guide.id}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-sm font-semibold transition-all disabled:opacity-40"
                          style={{ background: 'hsl(150 48% 40% / 0.15)', border: '1px solid hsl(150 48% 40% / 0.4)', color: 'hsl(150 48% 60%)' }}>
                          <Icon name={processingId === `guide-${guide.id}` ? 'Loader' : 'Check'} size={12} className={processingId === `guide-${guide.id}` ? 'animate-spin' : ''} /> Одобрить
                        </button>
                        <button onClick={() => onPublishGuide(guide.id, false)}
                          disabled={processingId === `guide-${guide.id}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-sm font-semibold transition-all disabled:opacity-40"
                          style={{ background: 'hsl(355 62% 40% / 0.15)', border: '1px solid hsl(355 62% 40% / 0.4)', color: 'hsl(355 72% 62%)' }}>
                          <Icon name="X" size={12} /> Отклонить
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export type { SiteStats, PendingTopic, PendingGuide };
