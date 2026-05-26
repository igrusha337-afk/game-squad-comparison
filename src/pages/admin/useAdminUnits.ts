import { useState, useCallback } from 'react';
import { unitsApi, treatiesApi, seedApi } from '@/lib/api';
import { TreatyCategory } from '@/data/types';

export function useAdminUnits(
  invalidateUnits: () => void,
  invalidateTreaties: () => void,
  showToast: (msg: string, type?: 'success' | 'error') => void
) {
  const [units, setUnits] = useState<Record<string, unknown>[]>([]);
  const [treaties, setTreaties] = useState<Record<string, unknown>[]>([]);
  const [treatyCategories, setTreatyCategories] = useState<TreatyCategory[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [seedLoading, setSeedLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string; kind: 'unit' | 'treaty' } | null>(null);
  const [unitModal, setUnitModal] = useState<{ open: boolean; unit?: Record<string, unknown> | null }>({ open: false });
  const [treatyModal, setTreatyModal] = useState<{ open: boolean; treaty?: Record<string, unknown> | null }>({ open: false });

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [u, t] = await Promise.all([unitsApi.list(), treatiesApi.list()]);
      setUnits(u.units || []);
      setTreaties(t.treaties || []);
      setTreatyCategories((t.categories || []).map((c: Record<string, unknown>) => ({
        id: c.id as number,
        name: c.name as string,
        description: (c.description as string) || '',
        sortOrder: (c.sortOrder as number) || 0,
      })));
    } catch {
      showToast('Ошибка загрузки данных', 'error');
    } finally {
      setLoadingData(false);
    }
  }, [showToast]);

  const handleSeed = async () => {
    setSeedLoading(true);
    try {
      const res = await seedApi.run();
      const u = res.units as { inserted: number; skipped: number };
      const t = res.treaties as { inserted: number; skipped: number };
      showToast(`Импортировано: ${u.inserted} отрядов, ${t.inserted} трактатов`);
      await loadData();
      invalidateUnits();
      invalidateTreaties();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Ошибка импорта', 'error');
    } finally {
      setSeedLoading(false);
    }
  };

  const handleSaveUnit = async (data: Record<string, unknown>) => {
    if (unitModal.unit) {
      await unitsApi.update(unitModal.unit.id as string, data);
      showToast('Отряд успешно обновлён');
    } else {
      await unitsApi.create(data);
      showToast('Отряд успешно добавлен');
    }
    await loadData();
    invalidateUnits();
  };

  const handleSaveTreaty = async (data: Record<string, unknown>) => {
    if (treatyModal.treaty) {
      await treatiesApi.update(treatyModal.treaty.id as string, data);
      showToast('Трактат успешно обновлён');
    } else {
      await treatiesApi.create(data);
      showToast('Трактат успешно добавлен');
    }
    await loadData();
    invalidateTreaties();
  };

  const handleCreateCategory = async (data: { name: string; description: string; sortOrder: number }) => {
    await treatiesApi.createCategory(data);
    showToast('Категория создана');
    await loadData();
    invalidateTreaties();
  };

  const handleUpdateCategory = async (id: number, data: { name: string; description: string; sortOrder: number }) => {
    await treatiesApi.updateCategory(id, data);
    showToast('Категория обновлена');
    await loadData();
    invalidateTreaties();
  };

  const handleDeleteCategory = async (id: number) => {
    await treatiesApi.deleteCategory(id);
    showToast('Категория удалена');
    await loadData();
    invalidateTreaties();
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.kind === 'unit') {
        await unitsApi.delete(confirmDelete.id);
        showToast('Отряд успешно удалён');
        invalidateUnits();
      } else {
        await treatiesApi.delete(confirmDelete.id);
        showToast('Трактат успешно удалён');
        invalidateTreaties();
      }
      await loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Ошибка удаления', 'error');
    } finally {
      setConfirmDelete(null);
    }
  };

  return {
    units, treaties, treatyCategories, loadingData, seedLoading,
    confirmDelete, setConfirmDelete,
    unitModal, setUnitModal,
    treatyModal, setTreatyModal,
    loadData, handleSeed, handleSaveUnit, handleSaveTreaty, handleConfirmDelete,
    handleCreateCategory, handleUpdateCategory, handleDeleteCategory,
  };
}