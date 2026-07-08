import { useRef, useState, useEffect } from 'react';
import { uploadApi } from '@/lib/api';
import Icon from '@/components/ui/icon';
import { resizeImageToBase64 } from '@/lib/imageResize';

const EMOJI_LIST = [
  '😀','😁','😂','🤣','😊','😍','🥰','😎','🤔','😮',
  '😢','😡','👍','👎','❤️','🔥','⚔️','🛡️','🏆','💀',
  '🎯','⚡','💪','🤝','👑','🌟','✨','💥','🎖️','⚜️',
];

interface RichEditorProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export default function RichEditor({ value, onChange, placeholder = 'Введите текст...', minHeight = 140 }: RichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // Флаг: изменение пришло изнутри — не перезаписывать DOM
  const isInternal = useRef(false);
  const savedRange = useRef<Range | null>(null);

  // Устанавливаем начальное значение только один раз при монтировании
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      // Игнорируем обновление если оно пришло из onInput
      if (isInternal.current) {
        isInternal.current = false;
        return;
      }
      editorRef.current.innerHTML = value;
    }
   
  }, [value]);

  const notifyChange = () => {
    isInternal.current = true;
    onChange(editorRef.current?.innerHTML || '');
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    const sel = window.getSelection();
    if (savedRange.current && sel) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
  };

  const exec = (cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val ?? undefined);
    notifyChange();
  };

  const insertEmoji = (emoji: string) => {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand('insertText', false, emoji);
    notifyChange();
    setShowEmoji(false);
  };

  const insertImage = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setUploading(true);
    try {
      const { data, type } = await resizeImageToBase64(file);
      const res = await uploadApi.upload(data, type, 'forum');
      editorRef.current?.focus();
      restoreSelection();
      document.execCommand('insertHTML', false,
        `<img src="${res.url}" alt="image" style="max-width:100%;border-radius:4px;margin:4px 0;" />`
      );
      notifyChange();
    } catch {
      // ignore
    } finally {
      setUploading(false);
    }
  };

  const toolBtn = (icon: string, cmd: string, val?: string, title?: string) => (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); exec(cmd, val); }}
      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
    >
      <Icon name={icon} size={14} />
    </button>
  );

  return (
    <div className="border border-border rounded-sm overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/30 flex-wrap">
        {toolBtn('Bold', 'bold', undefined, 'Жирный')}
        {toolBtn('Italic', 'italic', undefined, 'Курсив')}
        {toolBtn('Underline', 'underline', undefined, 'Подчёркнутый')}
        {toolBtn('Strikethrough', 'strikeThrough', undefined, 'Зачёркнутый')}
        <span className="w-px h-4 bg-border mx-1" />
        {toolBtn('AlignLeft', 'justifyLeft', undefined, 'По левому краю')}
        {toolBtn('AlignCenter', 'justifyCenter', undefined, 'По центру')}
        {toolBtn('AlignRight', 'justifyRight', undefined, 'По правому краю')}
        <span className="w-px h-4 bg-border mx-1" />
        {toolBtn('List', 'insertUnorderedList', undefined, 'Список')}
        {toolBtn('ListOrdered', 'insertOrderedList', undefined, 'Нумерованный список')}
        <span className="w-px h-4 bg-border mx-1" />
        <button type="button" onMouseDown={e => { e.preventDefault(); exec('formatBlock', '<h3>'); }}
          className="px-2 py-1 text-xs rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors font-semibold">H</button>
        {toolBtn('Quote', 'formatBlock', '<blockquote>', 'Цитата')}
        <span className="w-px h-4 bg-border mx-1" />
        <div className="relative">
          <button type="button"
            onMouseDown={e => { e.preventDefault(); saveSelection(); setShowEmoji(v => !v); }}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-sm">
            😊
          </button>
          {showEmoji && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-sm p-2 shadow-xl w-52 grid grid-cols-8 gap-0.5">
              {EMOJI_LIST.map(e => (
                <button key={e} type="button" onMouseDown={ev => { ev.preventDefault(); insertEmoji(e); }}
                  className="text-base p-0.5 rounded hover:bg-muted transition-colors text-center leading-none">
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="button"
          disabled={uploading}
          onMouseDown={e => { e.preventDefault(); saveSelection(); fileRef.current?.click(); }}
          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          title="Вставить изображение">
          <Icon name={uploading ? 'Loader' : 'Image'} size={14} className={uploading ? 'animate-spin' : ''} />
        </button>
        <span className="w-px h-4 bg-border mx-1" />
        {toolBtn('Eraser', 'removeFormat', undefined, 'Очистить форматирование')}
      </div>

      {/* contentEditable БЕЗ dangerouslySetInnerHTML — управление через ref */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => notifyChange()}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        data-placeholder={placeholder}
        className="outline-none px-4 py-3 text-sm text-foreground leading-relaxed rich-editor"
        style={{ minHeight }}
      />

      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) insertImage(f); e.target.value = ''; }} />
    </div>
  );
}