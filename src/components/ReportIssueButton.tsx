import { useAuth } from '@/context/AuthContext';
import Icon from '@/components/ui/icon';

// Аккаунт разработчика, куда уходят жалобы на ошибки/неточности в контенте сайта
export const CONTACT_USER_ID = 2;
export const CONTACT_USERNAME = 'KOHTAKT';

interface Props {
  onOpenMessages?: (userId: number, username: string) => void;
  onNavigateTo?: (page: 'auth') => void;
  className?: string;
}

export default function ReportIssueButton({ onOpenMessages, onNavigateTo, className = '' }: Props) {
  const { user } = useAuth();

  const handleClick = () => {
    if (user && onOpenMessages) {
      onOpenMessages(CONTACT_USER_ID, CONTACT_USERNAME);
    } else if (onNavigateTo) {
      onNavigateTo('auth');
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors ${className}`}
    >
      <Icon name="MessageCircleWarning" size={13} />
      Не согласен с какой либо информацией или обнаружил ошибку?
    </button>
  );
}