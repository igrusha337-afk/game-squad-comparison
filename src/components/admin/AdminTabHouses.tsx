import { useState, useEffect, useCallback } from 'react';
import { housesApi, HOUSE_TROPHY_TYPES } from '@/lib/api';
import Icon from '@/components/ui/icon';
import HouseTrophies, { Trophy } from '@/components/HouseTrophies';

interface AdminHouse {
  id: number;
  name: string;
  emblem_url: string;
  server: string;
  trophies: Trophy[];
}

export function AdminTabHouses() {
  const [houses, setHouses] = useState<AdminHouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await housesApi.adminList();
      setHouses(d.houses || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAward = async (houseId: number, trophyType: string) => {
    setBusyKey(`${houseId}-${trophyType}-award`);
    try {
      const res = await housesApi.awardTrophy(houseId, trophyType);
      setHouses(prev => prev.map(h => h.id === houseId ? { ...h, trophies: res.trophies } : h));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ошибка выдачи трофея');
    } finally {
      setBusyKey(null);
    }
  };

  const handleRevoke = async (houseId: number, trophyType: string) => {
    setBusyKey(`${houseId}-${trophyType}-revoke`);
    try {
      const res = await housesApi.revokeTrophy(houseId, trophyType);
      setHouses(prev => prev.map(h => h.id === houseId ? { ...h, trophies: res.trophies } : h));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ошибка снятия трофея');
    } finally {
      setBusyKey(null);
    }
  };

  const trophyCount = (house: AdminHouse, type: string) => house.trophies.find(t => t.type === type)?.count || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        <Icon name="Loader" size={18} className="animate-spin mr-2" /> Загрузка...
      </div>
    );
  }

  if (houses.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Домов пока нет</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-3">
        Выдавайте домам трофеи за особые достижения. Трофеи отображаются на странице дома и в списке домов CB.
      </p>
      {houses.map(h => (
        <div key={h.id} className="flex flex-wrap items-center gap-3 p-3 border border-border rounded-sm">
          <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 flex items-center justify-center bg-muted">
            {h.emblem_url
              ? <img src={h.emblem_url} alt="" className="w-full h-full object-cover" />
              : <Icon name="Shield" size={18} className="text-muted-foreground" />}
          </div>
          <div className="flex-1 min-w-[10rem]">
            <div className="text-sm font-medium">{h.name}</div>
            {h.server && <div className="text-[11px] text-muted-foreground">{h.server}</div>}
          </div>
          {h.trophies.length > 0 && <HouseTrophies trophies={h.trophies} />}
          <div className="flex flex-wrap gap-2">
            {Object.entries(HOUSE_TROPHY_TYPES).map(([type, label]) => {
              const count = trophyCount(h, type);
              return (
                <div key={type} className="flex items-center gap-1 px-2 py-1 rounded-sm border border-border">
                  <span className="text-xs text-muted-foreground">{label}{count > 0 ? ` (${count})` : ''}</span>
                  <button onClick={() => handleAward(h.id, type)} disabled={busyKey === `${h.id}-${type}-award`}
                    title="Выдать" className="p-1 rounded hover:bg-muted disabled:opacity-50 transition-colors">
                    <Icon name={busyKey === `${h.id}-${type}-award` ? 'Loader' : 'Plus'} size={12} className={busyKey === `${h.id}-${type}-award` ? 'animate-spin' : 'text-green-500'} />
                  </button>
                  {count > 0 && (
                    <button onClick={() => handleRevoke(h.id, type)} disabled={busyKey === `${h.id}-${type}-revoke`}
                      title="Забрать" className="p-1 rounded hover:bg-muted disabled:opacity-50 transition-colors">
                      <Icon name={busyKey === `${h.id}-${type}-revoke` ? 'Loader' : 'Minus'} size={12} className={busyKey === `${h.id}-${type}-revoke` ? 'animate-spin' : 'text-red-500'} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
