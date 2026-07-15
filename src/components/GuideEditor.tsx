import { useRef, useState } from 'react';
import { GuideBlock } from '@/data/types';
import { uploadApi } from '@/lib/api';
import Icon from '@/components/ui/icon';
import { resizeImageToBase64 } from '@/lib/imageResize';
import RichEditor from '@/components/RichEditor';
import { textToHtml } from '@/lib/richText';

interface GuideEditorProps {
  label: string;
  value: GuideBlock[];
  onChange: (blocks: GuideBlock[]) => void;
}

export default function GuideEditor({ label, value, onChange }: GuideEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');

  const addText = () => onChange([...value, { type: 'text', content: '' }]);

  const addImage = async (file: File) => {
    if (!file.type.startsWith('image/')) { setUploadErr('Только изображения'); return; }
    setUploading(true); setUploadErr('');
    try {
      const { data, type } = await resizeImageToBase64(file);
      const res = await uploadApi.upload(data, type, 'guides');
      onChange([...value, { type: 'image', content: res.url }]);
    } catch (e: unknown) {
      setUploadErr(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setUploading(false);
    }
  };

  const updateBlock = (i: number, content: string) =>
    onChange(value.map((b, idx) => idx === i ? { ...b, content } : b));

  const removeBlock = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  const moveBlock = (i: number, dir: -1 | 1) => {
    const arr = [...value];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    onChange(arr);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs text-muted-foreground uppercase tracking-widest">{label}</label>
        <div className="flex gap-1.5">
          <button type="button" onClick={addText}
            className="flex items-center gap-1 text-[11px] px-2 py-1 border border-border rounded-sm hover:bg-muted transition-colors text-muted-foreground">
            <Icon name="AlignLeft" size={11} /> Текст
          </button>
          <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1 text-[11px] px-2 py-1 border border-border rounded-sm hover:bg-muted transition-colors text-muted-foreground disabled:opacity-50">
            <Icon name={uploading ? 'Loader' : 'ImagePlus'} size={11} className={uploading ? 'animate-spin' : ''} /> Фото
          </button>
        </div>
      </div>

      {uploadErr && <p className="text-[10px] text-red-400 mb-2">{uploadErr}</p>}

      {value.length === 0 && (
        <p className="text-[11px] text-muted-foreground italic bg-muted/30 border border-border rounded-sm p-3 text-center">
          Пусто. Добавьте текст или изображение.
        </p>
      )}

      <div className="space-y-2">
        {value.map((block, i) => (
          <div key={i} className="group flex gap-2 items-start bg-muted/20 border border-border rounded-sm p-2">
            {/* Controls */}
            <div className="flex flex-col gap-0.5 mt-0.5">
              <button type="button" onClick={() => moveBlock(i, -1)} disabled={i === 0}
                className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
                <Icon name="ChevronUp" size={13} />
              </button>
              <button type="button" onClick={() => moveBlock(i, 1)} disabled={i === value.length - 1}
                className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
                <Icon name="ChevronDown" size={13} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {block.type === 'text' ? (
                <RichEditor
                  value={textToHtml(block.content)}
                  onChange={v => updateBlock(i, v)}
                  placeholder="Введите текст рекомендации..."
                  minHeight={80}
                />
              ) : (
                <div className="relative">
                  <img src={block.content} alt="" className="w-full rounded-sm object-cover max-h-48" />
                  <div className="absolute top-1 right-1 bg-background/80 rounded-sm px-1.5 py-0.5 text-[10px] text-muted-foreground flex items-center gap-1">
                    <Icon name="Image" size={10} /> фото
                  </div>
                </div>
              )}
            </div>

            {/* Delete */}
            <button type="button" onClick={() => removeBlock(i)}
              className="text-muted-foreground hover:text-destructive transition-colors mt-0.5 flex-shrink-0">
              <Icon name="Trash2" size={13} />
            </button>
          </div>
        ))}
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) addImage(f); e.target.value = ''; }} />
    </div>
  );
}