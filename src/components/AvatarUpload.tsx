import { useRef, useState } from 'react';
import { uploadApi } from '@/lib/api';
import Icon from '@/components/ui/icon';
import { resizeImageToBase64 } from '@/lib/imageResize';

interface AvatarUploadProps {
  value: string;
  onChange: (url: string) => void;
  aspectRatio?: string;     // напр. "3/4" для карточки, "1/1" для трактата
  label?: string;
  folder?: string;
}

export default function AvatarUpload({ value, onChange, aspectRatio = '1/1', label = 'Изображение', folder = 'avatars' }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Только изображения (jpg, png, webp)');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { data, type } = await resizeImageToBase64(file);
      const res = await uploadApi.upload(data, type, folder);
      onChange(res.url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const onDragOver = (e: React.DragEvent) => e.preventDefault();

  return (
    <div>
      <label className="text-xs text-muted-foreground block mb-1.5">{label}</label>
      <div className="flex gap-3 items-start">
        {/* Preview */}
        <div
          className="relative flex-shrink-0 rounded-sm overflow-hidden bg-muted border border-border cursor-pointer hover:border-primary/50 transition-colors"
          style={{ width: 80, aspectRatio }}
          onClick={() => !loading && inputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
          {value ? (
            <img src={value} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground">
              <Icon name="ImagePlus" size={18} />
            </div>
          )}
          {loading && (
            <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
              <Icon name="Loader" size={16} className="animate-spin text-primary" />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex-1 space-y-1.5">
          <button
            type="button"
            disabled={loading}
            onClick={() => inputRef.current?.click()}
            className="w-full px-3 py-2 text-xs border border-border rounded-sm hover:bg-muted disabled:opacity-50 transition-colors text-left flex items-center gap-2"
          >
            <Icon name="Upload" size={12} />
            {value ? 'Заменить изображение' : 'Загрузить изображение'}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="w-full px-3 py-2 text-xs border border-red-500/30 text-red-400 rounded-sm hover:bg-red-900/10 transition-colors text-left flex items-center gap-2"
            >
              <Icon name="Trash2" size={12} />
              Удалить
            </button>
          )}
          {error && <p className="text-[10px] text-red-400">{error}</p>}
          <p className="text-[10px] text-muted-foreground">JPG, PNG, WebP · до 5 МБ</p>
        </div>
      </div>

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onInputChange} />
    </div>
  );
}