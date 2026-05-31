import { useState, useEffect, useCallback } from 'react';
import { unitsApi, treatiesApi, rolesApi, formationsApi, traitsApi, abilitiesApi, specialStatsApi } from '@/lib/api';
import { Unit, Treaty, TreatyCategory, UnitStats, Ability, Trait, Formation, StatModifierEntry, TraitColor } from '@/data/types';

export interface SpecialStatDef {
  id: number;
  key: string;
  label: string;
  maxValue: number;
  sortOrder: number;
}

export interface UnitRoleDef {
  id: number;
  name: string;
  description: string;
}

export interface TraitDef {
  id: number;
  name: string;
  description: string;
  color: TraitColor;
  adminComment?: string;
}

export interface AbilityDef {
  id: number;
  name: string;
  description: string;
  statModifiers: Partial<UnitStats>;
  statModifiersEx: Partial<Record<keyof UnitStats, StatModifierEntry>>;
  adminComment?: string;
}

// Конвертирует abilities — поддерживает и строки, и объекты Ability
function parseAbilities(raw: unknown): (string | Ability)[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(item => {
    if (typeof item === 'string') return item;
    if (typeof item === 'object' && item !== null && 'name' in item) {
      return item as Ability;
    }
    return String(item);
  });
}

function parseRole(raw: unknown): Unit['role'] {
  if (Array.isArray(raw)) return raw as Unit['role'];
  if (typeof raw === 'string') return raw as Unit['role'];
  return 'Урон';
}

function parseTraits(raw: unknown): Trait[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(item => {
    if (typeof item === 'string') return { name: item };
    return item as Trait;
  });
}

// Конвертирует объект из API в тип Unit
function apiToUnit(u: Record<string, unknown>): Unit {
  return {
    id: u.id as string,
    name: u.name as string,
    class: u.class as Unit['class'],
    role: parseRole(u.role),
    rarity: u.rarity as Unit['rarity'],
    description: (u.description as string) || '',
    lore: (u.lore as string) || '',
    abilities: parseAbilities(u.abilities),
    traits: parseTraits(u.traits),
    avatar_url: (u.avatar_url as string) || '',
    stars: typeof u.stars === 'number' ? u.stars : 0,
    guide_upgrade: Array.isArray(u.guide_upgrade) ? u.guide_upgrade : [],
    guide_gameplay: Array.isArray(u.guide_gameplay) ? u.guide_gameplay : [],
    stats: (u.stats as UnitStats) || {} as UnitStats,
    formations: Array.isArray(u.formations) ? (u.formations as number[]) : [],
    subtype: (u.subtype as Unit['subtype']) || '',
  };
}

// Конвертирует объект из API в тип Treaty
function apiToTreaty(t: Record<string, unknown>): Treaty {
  return {
    id: t.id as string,
    name: t.name as string,
    description: (t.description as string) || '',
    compatibleClasses: (t.compatibleClasses as Treaty['compatibleClasses']) || [],
    compatibleSubtypes: (t.compatibleSubtypes as Treaty['compatibleSubtypes']) || [],
    compatibleUnitIds: (t.compatibleUnitIds as string[]) || [],
    rarity: t.rarity as Treaty['rarity'],
    statModifiers: (t.statModifiers as Partial<UnitStats>) || {},
    statModifiersEx: (t.statModifiersEx as Partial<Record<keyof UnitStats, StatModifierEntry>>) || undefined,
    avatar_url: (t.avatar_url as string) || '',
    categoryId: (t.categoryId as number | null) ?? null,
  };
}

function apiToCategory(c: Record<string, unknown>): TreatyCategory {
  return {
    id: c.id as number,
    name: c.name as string,
    description: (c.description as string) || '',
    sortOrder: (c.sortOrder as number) || 0,
  };
}

let cachedUnits: Unit[] | null = null;
let cachedTreaties: Treaty[] | null = null;
 
let cachedTreatyCategories: TreatyCategory[] | null = null;
let unitsPromise: Promise<Unit[]> | null = null;
let treatiesPromise: Promise<{ treaties: Treaty[]; categories: TreatyCategory[] }> | null = null;

export function useUnits() {
  const [units, setUnits] = useState<Unit[]>(cachedUnits || []);
  const [loading, setLoading] = useState(!cachedUnits);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (cachedUnits) { setUnits(cachedUnits); setLoading(false); return; }
    if (!unitsPromise) {
      unitsPromise = unitsApi.list().then(data => {
        const mapped = (data.units as Record<string, unknown>[]).map(apiToUnit);
        cachedUnits = mapped;
        return mapped;
      });
    }
    try {
      const result = await unitsPromise;
      setUnits(result);
    } catch {
      setError('Не удалось загрузить отряды');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const invalidate = () => {
    cachedUnits = null;
    unitsPromise = null;
    setLoading(true);
    load();
  };

  return { units, loading, error, invalidate };
}

export function useTreaties() {
  const [treaties, setTreaties] = useState<Treaty[]>(cachedTreaties || []);
  const [categories, setCategories] = useState<TreatyCategory[]>(cachedTreatyCategories || []);
  const [loading, setLoading] = useState(!cachedTreaties);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (cachedTreaties && cachedTreatyCategories) {
      setTreaties(cachedTreaties);
      setCategories(cachedTreatyCategories);
      setLoading(false);
      return;
    }
    if (!treatiesPromise) {
      treatiesPromise = treatiesApi.list().then(data => {
        const mappedTreaties = (data.treaties as Record<string, unknown>[]).map(apiToTreaty);
        const mappedCategories = ((data.categories || []) as Record<string, unknown>[]).map(apiToCategory);
        cachedTreaties = mappedTreaties;
        cachedTreatyCategories = mappedCategories;
        return { treaties: mappedTreaties, categories: mappedCategories };
      });
    }
    try {
      const result = await treatiesPromise;
      setTreaties(result.treaties);
      setCategories(result.categories);
    } catch {
      setError('Не удалось загрузить трактаты');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const invalidate = () => {
    cachedTreaties = null;
    cachedTreatyCategories = null;
    treatiesPromise = null;
    setLoading(true);
    load();
  };

  return { treaties, categories, loading, error, invalidate };
}

let cachedRoles: UnitRoleDef[] | null = null;
let rolesPromise: Promise<UnitRoleDef[]> | null = null;

export function useRoles() {
  const [roles, setRoles] = useState<UnitRoleDef[]>(cachedRoles || []);
  const [loading, setLoading] = useState(!cachedRoles);

  const load = useCallback(async () => {
    if (cachedRoles) { setRoles(cachedRoles); setLoading(false); return; }
    if (!rolesPromise) {
      rolesPromise = rolesApi.list().then((data: UnitRoleDef[]) => {
        cachedRoles = data;
        return data;
      });
    }
    try {
      const result = await rolesPromise;
      setRoles(result);
    } catch {
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const invalidate = () => {
    cachedRoles = null;
    rolesPromise = null;
    setLoading(true);
    load();
  };

  return { roles, loading, invalidate };
}

let cachedFormations: Formation[] | null = null;
let formationsPromise: Promise<Formation[]> | null = null;

export function useFormations() {
  const [formations, setFormations] = useState<Formation[]>(cachedFormations || []);
  const [loading, setLoading] = useState(!cachedFormations);

  const load = useCallback(async () => {
    if (cachedFormations) { setFormations(cachedFormations); setLoading(false); return; }
    if (!formationsPromise) {
      formationsPromise = formationsApi.list().then((data: Formation[]) => {
        cachedFormations = data;
        return data;
      });
    }
    try {
      const result = await formationsPromise;
      setFormations(result);
    } catch {
      setFormations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const invalidate = () => {
    cachedFormations = null;
    formationsPromise = null;
    setLoading(true);
    load();
  };

  return { formations, loading, invalidate };
}

let cachedTraits: TraitDef[] | null = null;
let traitsPromise: Promise<TraitDef[]> | null = null;

export function useTraits() {
  const [traits, setTraits] = useState<TraitDef[]>(cachedTraits || []);
  const [loading, setLoading] = useState(!cachedTraits);

  const load = useCallback(async () => {
    if (cachedTraits) { setTraits(cachedTraits); setLoading(false); return; }
    if (!traitsPromise) {
      traitsPromise = traitsApi.list().then((data: TraitDef[]) => {
        cachedTraits = data;
        return data;
      });
    }
    try {
      const result = await traitsPromise;
      setTraits(result);
    } catch {
      setTraits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const invalidate = () => {
    cachedTraits = null;
    traitsPromise = null;
    setLoading(true);
    load();
  };

  return { traits, loading, invalidate };
}

let cachedAbilities: AbilityDef[] | null = null;
let abilitiesPromise: Promise<AbilityDef[]> | null = null;

export function useAbilities() {
  const [abilities, setAbilities] = useState<AbilityDef[]>(cachedAbilities || []);
  const [loading, setLoading] = useState(!cachedAbilities);

  const load = useCallback(async () => {
    if (cachedAbilities) { setAbilities(cachedAbilities); setLoading(false); return; }
    if (!abilitiesPromise) {
      abilitiesPromise = abilitiesApi.list().then((data: AbilityDef[]) => {
        cachedAbilities = data;
        return data;
      });
    }
    try {
      const result = await abilitiesPromise;
      setAbilities(result);
    } catch {
      setAbilities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const invalidate = () => {
    cachedAbilities = null;
    abilitiesPromise = null;
    setLoading(true);
    load();
  };

  return { abilities, loading, invalidate };
}

let cachedSpecialStats: SpecialStatDef[] | null = null;
let specialStatsPromise: Promise<SpecialStatDef[]> | null = null;

export function useSpecialStats() {
  const [specialStats, setSpecialStats] = useState<SpecialStatDef[]>(cachedSpecialStats || []);
  const [loading, setLoading] = useState(!cachedSpecialStats);

  const load = useCallback(async () => {
    if (cachedSpecialStats) { setSpecialStats(cachedSpecialStats); setLoading(false); return; }
    if (!specialStatsPromise) {
      specialStatsPromise = specialStatsApi.list().then((data: SpecialStatDef[]) => {
        cachedSpecialStats = data;
        return data;
      });
    }
    try {
      const result = await specialStatsPromise;
      setSpecialStats(result);
    } catch {
      setSpecialStats([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const invalidate = () => {
    cachedSpecialStats = null;
    specialStatsPromise = null;
    setLoading(true);
    load();
  };

  return { specialStats, loading, invalidate };
}