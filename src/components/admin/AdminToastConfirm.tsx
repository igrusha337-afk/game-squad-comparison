import { useEffect } from 'react';
import Icon from '@/components/ui/icon';

export function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-sm text-sm shadow-lg border
      ${type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-600' : 'bg-destructive/10 border-destructive/30 text-destructive'}`}>
      <Icon name={type === 'success' ? 'CheckCircle' : 'AlertCircle'} size={14} />
      {message}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><Icon name="X" size={12} /></button>
    </div>
  );
}

export function ConfirmModal({ name, type, onConfirm, onCancel }: { name: string; type: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
      <div className="bg-card border border-border rounded-sm p-6 w-full max-w-sm shadow-xl">
        <h3 className="text-sm font-semibold mb-3">Подтверждение удаления</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Вы уверены, что хотите удалить {type} <span className="text-foreground font-medium">«{name}»</span>?
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm border border-border rounded-sm hover:bg-muted transition-colors">
            Отмена
          </button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm bg-destructive text-destructive-foreground rounded-sm hover:bg-destructive/90 transition-colors">
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
}
