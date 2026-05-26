import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { buildsApi } from '@/lib/api';
import { useUnits, useTreaties } from '@/hooks/useAppData';
import { Treaty, UnitStats } from '@/data/types';
import { ALL_STATS } from '@/data/statGroups';
import RarityBadge from '@/components/RarityBadge';

import Icon from '@/components/ui/icon';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import UnitStatsPanel from '@/components/unit/UnitStatsPanel';

interface Build {
  id: string;
  unitId: string;
  treatyIds: string[];
  title: string;
  description: string;
  authorId: number;
  authorUsername: string;
  isPublic: boolean;
  views: number;
  createdAt: string;
}

const getStatLabel = (key: string) => {
  const found = ALL_STATS.find(s => s.key === key);
  return found ? found.label : key;
};



export default function BuildPage() {
  const { buildId } = useParams<{ buildId: string }>();
  const { units } = useUnits();
  const { treaties: ALL_TREATIES } = useTreaties();
  const [build, setBuild] = useState<Build | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!buildId) return;
    setLoading(true);
    buildsApi.getById(buildId)
      .then(res => setBuild(res.build))
      .catch(() => setError('Сборка не найдена или недоступна'))
      .finally(() => setLoading(false));
  }, [buildId]);

  const unit = build ? units.find(u => u.id === build.unitId) : null;
  const treaties = build
    ? ALL_TREATIES.filter(t => build.treatyIds.includes(t.id))
    : [];

  useDocumentMeta({
    title: build ? build.title : 'Сборка трактатов',
    description: build && unit ? `Сборка для ${unit.name}: ${treaties.map(t => t.name).join(', ')}` : undefined,
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Icon name="Loader" size={24} className="animate-spin text-muted-foreground" />
    </div>
  );

  if (error || !build) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center px-4">
      <Icon name="ScrollText" size={48} className="text-muted-foreground opacity-30 mb-4" />
      <h1 className="text-lg font-semibold mb-2">Сборка не найдена</h1>
      <p className="text-sm text-muted-foreground mb-6">{error || 'Эта сборка не существует или была удалена'}</p>
      <a href="/" className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 transition-colors">
        На главную
      </a>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Заголовок */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-1">
            <h1 className="text-2xl font-semibold text-foreground" style={{ fontFamily: 'Oswald, sans-serif', letterSpacing: '0.05em' }}>
              {build.title}
            </h1>
            <button onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-sm hover:bg-muted transition-colors whitespace-nowrap mt-1">
              <Icon name={copied ? 'Check' : 'Share2'} size={12} className={copied ? 'text-green-400' : ''} />
              {copied ? 'Скопировано' : 'Поделиться'}
            </button>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {build.authorUsername && (
              <span className="flex items-center gap-1"><Icon name="User" size={11} />{build.authorUsername}</span>
            )}
            <span className="flex items-center gap-1"><Icon name="Eye" size={11} />{build.views} просмотров</span>
            <span>{new Date(build.createdAt).toLocaleDateString('ru-RU')}</span>
          </div>
          {build.description && (
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{build.description}</p>
          )}
        </div>

        {/* Отряд */}
        {unit && (
          <div className={`bg-card border border-rarity-${unit.rarity} rounded-sm p-4 mb-6 flex items-center gap-4`}>
            {unit.avatar_url && (
              <div className="w-14 h-14 rounded-sm overflow-hidden flex-shrink-0 bg-muted">
                <img src={unit.avatar_url} alt={unit.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-semibold text-foreground">{unit.name}</h2>
                <RarityBadge rarity={unit.rarity} />
              </div>
              <p className="text-xs text-muted-foreground">{unit.class} · {unit.description}</p>
            </div>
          </div>
        )}

        {/* Трактаты */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Трактаты ({treaties.length})
          </h3>
          <div className="space-y-3">
            {treaties.map(t => (
              <div key={t.id} className={`bg-card border border-rarity-${t.rarity} rounded-sm p-4`}>
                <div className="flex items-center gap-3 mb-2">
                  {t.avatar_url && (
                    <div className="w-10 h-10 rounded-sm overflow-hidden flex-shrink-0 bg-muted">
                      <img src={t.avatar_url} alt={t.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm text-foreground">{t.name}</span>
                      <RarityBadge rarity={t.rarity} />
                    </div>
                    {t.description && <p className="text-xs text-muted-foreground truncate">{t.description}</p>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(t.statModifiers || {}).map(([stat, val]) => (
                    <span key={stat} className={`font-mono-data text-[10px] px-1.5 py-0.5 rounded-sm ${(val || 0) > 0 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                      {getStatLabel(stat)}: {(val || 0) > 0 ? '+' : ''}{val}
                    </span>
                  ))}
                  {Object.entries(t.statModifiersEx || {}).map(([stat, entry]) => (
                    <span key={`ex-${stat}`} className={`font-mono-data text-[10px] px-1.5 py-0.5 rounded-sm ${entry.value > 0 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                      {getStatLabel(stat)}: {entry.value > 0 ? '+' : ''}{entry.value}%
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Характеристики отряда с бонусами трактатов */}
        {unit && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Характеристики отряда
            </h3>
            <UnitStatsPanel
              unit={unit}
              myTreaties={treaties.map(t => ({
                id: t.id,
                statModifiers: t.statModifiers as Partial<Record<keyof UnitStats, number>>,
                statModifiersEx: t.statModifiersEx as Partial<Record<keyof UnitStats, { type: string; value: number }>>,
              }))}
            />
          </div>
        )}

        {/* Ссылка на главную */}
        <div className="mt-8 text-center">
          <a href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4">
            Открыть справочник отрядов
          </a>
        </div>
      </div>
    </div>
  );
}