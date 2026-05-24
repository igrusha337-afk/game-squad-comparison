import { useState } from 'react';
import { rolesApi, formationsApi, traitsApi, abilitiesApi } from '@/lib/api';
import { UnitRoleDef, TraitDef, AbilityDef } from '@/hooks/useAppData';
import { AbilityFormState } from '@/components/admin/AdminTabDictionaries';
import { TraitColor, Formation } from '@/data/types';

export function useAdminDictionaries(
  invalidateRoles: () => void,
  invalidateFormations: () => void,
  invalidateTraits: () => void,
  invalidateAbilities: () => void,
  showToast: (msg: string, type?: 'success' | 'error') => void
) {
  // Роли
  const [roleForm, setRoleForm] = useState({ name: '', description: '' });
  const [roleEditing, setRoleEditing] = useState<UnitRoleDef | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);

  // Построения
  const [formationForm, setFormationForm] = useState({ name: '', description: '', avatar_url: '' });
  const [formationEditing, setFormationEditing] = useState<Formation | null>(null);
  const [formationLoading, setFormationLoading] = useState(false);

  // Умения
  const [abilityForm, setAbilityForm] = useState<AbilityFormState>({ name: '', description: '', adminComment: '', modifiers: {}, newModKey: 'health', newModVal: '', newModType: 'flat' });
  const [abilityEditing, setAbilityEditing] = useState<AbilityDef | null>(null);
  const [abilityLoading, setAbilityLoading] = useState(false);

  // Особенности
  const [traitForm, setTraitForm] = useState({ name: '', description: '', adminComment: '', color: 'gray' as TraitColor });
  const [traitEditing, setTraitEditing] = useState<TraitDef | null>(null);
  const [traitLoading, setTraitLoading] = useState(false);

  // ── Роли ──
  const handleSaveRole = async () => {
    if (!roleForm.name.trim()) return;
    setRoleLoading(true);
    try {
      if (roleEditing) {
        await rolesApi.update(roleEditing.id, { name: roleForm.name.trim(), description: roleForm.description.trim() });
        showToast('Роль обновлена');
      } else {
        await rolesApi.create({ name: roleForm.name.trim(), description: roleForm.description.trim() });
        showToast('Роль добавлена');
      }
      setRoleForm({ name: '', description: '' });
      setRoleEditing(null);
      invalidateRoles();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Ошибка сохранения роли', 'error');
    } finally {
      setRoleLoading(false);
    }
  };

  const handleDeleteRole = async (role: UnitRoleDef) => {
    setRoleLoading(true);
    try {
      await rolesApi.delete(role.id);
      showToast('Роль удалена');
      invalidateRoles();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Ошибка удаления роли', 'error');
    } finally {
      setRoleLoading(false);
    }
  };

  const startEditRole = (role: UnitRoleDef) => {
    setRoleEditing(role);
    setRoleForm({ name: role.name, description: role.description });
  };

  // ── Построения ──
  const handleSaveFormation = async () => {
    if (!formationForm.name.trim()) return;
    setFormationLoading(true);
    try {
      if (formationEditing) {
        await formationsApi.update(formationEditing.id, { name: formationForm.name.trim(), description: formationForm.description.trim(), avatar_url: formationForm.avatar_url.trim() });
        showToast('Построение обновлено');
      } else {
        await formationsApi.create({ name: formationForm.name.trim(), description: formationForm.description.trim(), avatar_url: formationForm.avatar_url.trim() });
        showToast('Построение добавлено');
      }
      setFormationForm({ name: '', description: '', avatar_url: '' });
      setFormationEditing(null);
      invalidateFormations();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Ошибка сохранения', 'error');
    } finally {
      setFormationLoading(false);
    }
  };

  const handleDeleteFormation = async (f: Formation) => {
    setFormationLoading(true);
    try {
      await formationsApi.delete(f.id);
      showToast('Построение удалено');
      invalidateFormations();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Ошибка удаления', 'error');
    } finally {
      setFormationLoading(false);
    }
  };

  const startEditFormation = (f: Formation) => {
    setFormationEditing(f);
    setFormationForm({ name: f.name, description: f.description, avatar_url: f.avatar_url });
  };

  // ── Особенности ──
  const handleSaveTrait = async () => {
    if (!traitForm.name.trim()) return;
    setTraitLoading(true);
    try {
      if (traitEditing) {
        await traitsApi.update(traitEditing.id, { name: traitForm.name.trim(), description: traitForm.description.trim(), adminComment: traitForm.adminComment.trim(), color: traitForm.color });
        showToast('Особенность обновлена');
      } else {
        await traitsApi.create({ name: traitForm.name.trim(), description: traitForm.description.trim(), adminComment: traitForm.adminComment.trim(), color: traitForm.color });
        showToast('Особенность добавлена');
      }
      setTraitForm({ name: '', description: '', adminComment: '', color: 'gray' });
      setTraitEditing(null);
      invalidateTraits();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Ошибка сохранения', 'error');
    } finally {
      setTraitLoading(false);
    }
  };

  const handleDeleteTrait = async (t: TraitDef) => {
    setTraitLoading(true);
    try {
      await traitsApi.delete(t.id);
      showToast('Особенность удалена');
      invalidateTraits();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Ошибка удаления', 'error');
    } finally {
      setTraitLoading(false);
    }
  };

  const startEditTrait = (t: TraitDef) => {
    setTraitEditing(t);
    setTraitForm({ name: t.name, description: t.description, adminComment: t.adminComment || '', color: t.color });
  };

  // ── Умения ──
  const handleSaveAbility = async () => {
    if (!abilityForm.name.trim()) return;
    setAbilityLoading(true);
    try {
      const statModifiers: Record<string, number> = {};
      const statModifiersEx: Record<string, { value: number; type: string }> = {};
      for (const [k, entry] of Object.entries(abilityForm.modifiers)) {
        const n = parseFloat(entry.value);
        if (!isNaN(n)) {
          if (entry.type === 'percent') statModifiersEx[k] = { value: n, type: 'percent' };
          else statModifiers[k] = n;
        }
      }
      if (abilityEditing) {
        await abilitiesApi.update(abilityEditing.id, { name: abilityForm.name.trim(), description: abilityForm.description.trim(), adminComment: abilityForm.adminComment.trim(), statModifiers, statModifiersEx });
        showToast('Умение обновлено');
      } else {
        await abilitiesApi.create({ name: abilityForm.name.trim(), description: abilityForm.description.trim(), adminComment: abilityForm.adminComment.trim(), statModifiers, statModifiersEx });
        showToast('Умение добавлено');
      }
      setAbilityForm({ name: '', description: '', adminComment: '', modifiers: {}, newModKey: 'health', newModVal: '', newModType: 'flat' });
      setAbilityEditing(null);
      invalidateAbilities();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Ошибка сохранения', 'error');
    } finally {
      setAbilityLoading(false);
    }
  };

  const handleDeleteAbility = async (a: AbilityDef) => {
    setAbilityLoading(true);
    try {
      await abilitiesApi.delete(a.id);
      showToast('Умение удалено');
      invalidateAbilities();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Ошибка удаления', 'error');
    } finally {
      setAbilityLoading(false);
    }
  };

  const startEditAbility = (a: AbilityDef) => {
    setAbilityEditing(a);
    const modifiers: Record<string, { value: string; type: 'flat' | 'percent' }> = {};
    for (const [k, v] of Object.entries(a.statModifiers || {})) modifiers[k] = { value: String(v), type: 'flat' };
    for (const [k, v] of Object.entries(a.statModifiersEx || {})) modifiers[k] = { value: String(v.value), type: v.type as 'flat' | 'percent' };
    setAbilityForm({ name: a.name, description: a.description, adminComment: a.adminComment || '', modifiers, newModKey: 'health', newModVal: '', newModType: 'flat' });
  };

  const addAbilityFormMod = () => {
    if (!abilityForm.newModVal) return;
    setAbilityForm(f => ({ ...f, modifiers: { ...f.modifiers, [f.newModKey]: { value: f.newModVal, type: f.newModType } }, newModVal: '' }));
  };

  const removeAbilityFormMod = (key: string) => {
    setAbilityForm(f => { const m = { ...f.modifiers }; delete m[key]; return { ...f, modifiers: m }; });
  };

  return {
    roleForm, setRoleForm, roleEditing, roleLoading,
    handleSaveRole, handleDeleteRole, startEditRole,
    cancelEditRole: () => { setRoleEditing(null); setRoleForm({ name: '', description: '' }); },

    formationForm, setFormationForm, formationEditing, formationLoading,
    handleSaveFormation, handleDeleteFormation, startEditFormation,
    cancelEditFormation: () => { setFormationEditing(null); setFormationForm({ name: '', description: '', avatar_url: '' }); },

    traitForm, setTraitForm, traitEditing, traitLoading,
    handleSaveTrait, handleDeleteTrait, startEditTrait,
    cancelEditTrait: () => { setTraitEditing(null); setTraitForm({ name: '', description: '', adminComment: '', color: 'gray' as TraitColor }); },

    abilityForm, setAbilityForm, abilityEditing, abilityLoading,
    handleSaveAbility, handleDeleteAbility, startEditAbility,
    cancelEditAbility: () => { setAbilityEditing(null); setAbilityForm({ name: '', description: '', adminComment: '', modifiers: {}, newModKey: 'health', newModVal: '', newModType: 'flat' }); },
    addAbilityFormMod, removeAbilityFormMod,
  };
}
