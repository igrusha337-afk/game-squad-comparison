import Icon from '@/components/ui/icon';
import { SocialMetaItem } from '@/data/socialMeta';

interface Props {
  meta: SocialMetaItem;
  size?: number;
}

export default function SocialIcon({ meta, size = 16 }: Props) {
  if (meta.imageUrl) {
    return (
      <img src={meta.imageUrl} alt={meta.label} width={size} height={size}
        style={{ width: size, height: size, borderRadius: size * 0.22, objectFit: 'cover', flexShrink: 0 }} />
    );
  }
  return <Icon name={meta.icon} size={size} style={{ color: meta.color }} />;
}
