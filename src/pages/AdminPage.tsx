import { useState, useEffect, useCallback } from 'react';
import { statsApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useUnits, useTreaties, useRoles, useFormations, useTraits, useAbilities } from '@/hooks/useAppData';
import Icon from '@/components/ui/icon';

import { Toast, ConfirmModal, UnitModal, TreatyModal } from '@/components/admin/AdminModals';
import { AdminTabUnits, AdminTabTreaties } from '@/components/admin/AdminTabUnitsAndTreaties';
import { AdminTabRoles, AdminTabFormations, AdminTabTraits, AdminTabAbilities } from '@/components/admin/AdminTabDictionaries';
import { AdminTabStats, AdminTabModeration, SiteStats } from '@/components/admin/AdminTabStatsAndModeration';

import { useAdminUnits } from './admin/useAdminUnits';
import { useAdminDictionaries } from './admin/useAdminDictionaries';
import { useAdminModeration } from './admin/useAdminModeration';

type AdminTab = 'stats' | 'units' | 'treaties' | 'roles' | 'formations' | 'traits' | 'abilities' | 'moderation';

export default function AdminPage() {
  const { user } = useAuth();
  const { invalidate: invalidateUnits } = useUnits();
  const { invalidate: invalidateTreaties } = useTreaties();
  const { roles, invalidate: invalidateRoles } = useRoles();
  const { formations, invalidate: invalidateFormations } = useFormations();
  const { traits, invalidate: invalidateTraits } = useTraits();
  const { abilities, invalidate: invalidateAbilities } = useAbilities();

  const [tab, setTab] = useState<AdminTab>('stats');
  const [siteStats, setSiteStats] = useState<SiteStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => setToast({ message, type }), []);

  const units$ = useAdminUnits(invalidateUnits, invalidateTreaties, showToast);
  const dict$ = useAdminDictionaries(invalidateRoles, invalidateFormations, invalidateTraits, invalidateAbilities, showToast);
  const mod$ = useAdminModeration(showToast);

  useEffect(() => { units$.loadData(); }, [units$.loadData]);

  useEffect(() => {
    if (tab === 'stats') {
      setStatsLoading(true);
      statsApi.getStats().then(data => setSiteStats(data)).catch(() => {}).finally(() => setStatsLoading(false));
    }
    if (tab === 'moderation') mod$.loadPending();
  }, [tab]);

  if (!user?.is_admin) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center space-y-3">
          <Icon name="ShieldOff" size={32} className="text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Доступ только для администраторов</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-base font-semibold text-foreground" style={{ fontFamily: 'Oswald, sans-serif', letterSpacing: '0.05em' }}>
            ПАНЕЛЬ УПРАВЛЕНИЯ
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Управление данными справочника</p>
        </div>
        <button onClick={units$.handleSeed} disabled={units$.seedLoading}
          className="flex items-center gap-2 px-3 py-2 text-xs border border-border rounded-sm hover:bg-muted disabled:opacity-50 transition-colors">
          <Icon name={units$.seedLoading ? 'Loader' : 'Download'} size={13} className={units$.seedLoading ? 'animate-spin' : ''} />
          Импортировать базовые данные
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border flex-wrap">
        {(['stats', 'units', 'treaties', 'roles', 'formations', 'traits', 'abilities', 'moderation'] as AdminTab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${tab === t ? 'border-primary text-primary font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {t === 'stats' ? 'Статистика' : t === 'units' ? 'Отряды' : t === 'treaties' ? 'Трактаты' : t === 'roles' ? 'Роли' : t === 'formations' ? 'Построения' : t === 'traits' ? 'Особенности' : t === 'abilities' ? 'Умения' : (
              <span className="flex items-center gap-1.5">
                Публикации
                {(mod$.pendingTopics.length + mod$.pendingGuides.length) > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none"
                    style={{ background: 'hsl(355 72% 50%)', color: 'white' }}>
                    {mod$.pendingTopics.length + mod$.pendingGuides.length}
                  </span>
                )}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'stats' && <AdminTabStats siteStats={siteStats} statsLoading={statsLoading} />}

      {tab === 'units' && (
        <AdminTabUnits
          units={units$.units}
          loadingData={units$.loadingData}
          onAdd={() => units$.setUnitModal({ open: true, unit: null })}
          onEdit={unit => units$.setUnitModal({ open: true, unit })}
          onDelete={unit => units$.setConfirmDelete({ id: unit.id as string, name: unit.name as string, kind: 'unit' })}
        />
      )}

      {tab === 'treaties' && (
        <AdminTabTreaties
          treaties={units$.treaties}
          loadingData={units$.loadingData}
          onAdd={() => units$.setTreatyModal({ open: true, treaty: null })}
          onEdit={treaty => units$.setTreatyModal({ open: true, treaty })}
          onDelete={treaty => units$.setConfirmDelete({ id: treaty.id as string, name: treaty.name as string, kind: 'treaty' })}
        />
      )}

      {tab === 'roles' && (
        <AdminTabRoles
          roles={roles}
          roleForm={dict$.roleForm}
          roleEditing={dict$.roleEditing}
          roleLoading={dict$.roleLoading}
          onFormChange={dict$.setRoleForm}
          onSave={dict$.handleSaveRole}
          onEdit={dict$.startEditRole}
          onDelete={dict$.handleDeleteRole}
          onCancelEdit={dict$.cancelEditRole}
        />
      )}

      {tab === 'formations' && (
        <AdminTabFormations
          formations={formations}
          formationForm={dict$.formationForm}
          formationEditing={dict$.formationEditing}
          formationLoading={dict$.formationLoading}
          onFormChange={dict$.setFormationForm}
          onSave={dict$.handleSaveFormation}
          onEdit={dict$.startEditFormation}
          onDelete={dict$.handleDeleteFormation}
          onCancelEdit={dict$.cancelEditFormation}
        />
      )}

      {tab === 'traits' && (
        <AdminTabTraits
          traits={traits}
          traitForm={dict$.traitForm}
          traitEditing={dict$.traitEditing}
          traitLoading={dict$.traitLoading}
          onFormChange={dict$.setTraitForm}
          onSave={dict$.handleSaveTrait}
          onEdit={dict$.startEditTrait}
          onDelete={dict$.handleDeleteTrait}
          onCancelEdit={dict$.cancelEditTrait}
        />
      )}

      {tab === 'abilities' && (
        <AdminTabAbilities
          abilities={abilities}
          abilityForm={dict$.abilityForm}
          abilityEditing={dict$.abilityEditing}
          abilityLoading={dict$.abilityLoading}
          onFormChange={dict$.setAbilityForm}
          onSave={dict$.handleSaveAbility}
          onEdit={dict$.startEditAbility}
          onDelete={dict$.handleDeleteAbility}
          onCancelEdit={dict$.cancelEditAbility}
          onAddMod={dict$.addAbilityFormMod}
          onRemoveMod={dict$.removeAbilityFormMod}
        />
      )}

      {tab === 'moderation' && (
        <AdminTabModeration
          pendingTopics={mod$.pendingTopics}
          pendingGuides={mod$.pendingGuides}
          moderationLoading={mod$.moderationLoading}
          expandedTopic={mod$.expandedTopic}
          processingId={mod$.processingId}
          onSetExpandedTopic={mod$.setExpandedTopic}
          onPublishTopic={mod$.handlePublishTopic}
          onPublishGuide={mod$.handlePublishGuide}
        />
      )}

      {/* Modals */}
      {units$.unitModal.open && (
        <UnitModal unit={units$.unitModal.unit} onSave={units$.handleSaveUnit} onClose={() => units$.setUnitModal({ open: false })}
          availableRoles={roles} availableFormations={formations} availableTraits={traits} availableAbilities={abilities} />
      )}
      {units$.treatyModal.open && (
        <TreatyModal treaty={units$.treatyModal.treaty} onSave={units$.handleSaveTreaty} onClose={() => units$.setTreatyModal({ open: false })} />
      )}
      {units$.confirmDelete && (
        <ConfirmModal
          name={units$.confirmDelete.name}
          type={units$.confirmDelete.kind === 'unit' ? 'отряд' : 'трактат'}
          onConfirm={units$.handleConfirmDelete}
          onCancel={() => units$.setConfirmDelete(null)}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}