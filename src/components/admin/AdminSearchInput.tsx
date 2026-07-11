import Icon from '@/components/ui/icon';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function AdminSearchInput({ value, onChange, placeholder = 'Поиск...' }: Props) {
  return (
    <div className="relative w-full max-w-xs">
      <Icon name="Search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-background border border-border rounded-sm pl-8 pr-7 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icon name="X" size={13} />
        </button>
      )}
    </div>
  );
}
