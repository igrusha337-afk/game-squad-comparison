import { useAuth } from '@/context/AuthContext';
import Icon from '@/components/ui/icon';

// Аккаунт разработчика, куда уходят жалобы на ошибки/неточности в контенте сайта
export const CONTACT_USER_ID = 2;
export const CONTACT_USERNAME = 'KOHTAKT';

// Ключ localStorage: если неавторизованный пользователь нажал кнопку жалобы,
// после успешного входа/регистрации сразу откроем ему переписку с администратором
export const PENDING_REPORT_ISSUE_KEY = 'pending_report_issue';

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
      localStorage.setItem(PENDING_REPORT_ISSUE_KEY, '1');
      onNavigateTo('auth');
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-all ${className}`}
      style={{ color: 'hsl(42 70% 62%)', border: '1px solid hsl(42 76% 50% / 0.35)', background: 'hsl(42 76% 50% / 0.06)' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'hsl(42 76% 50% / 0.7)'; e.currentTarget.style.background = 'hsl(42 76% 50% / 0.12)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'hsl(42 76% 50% / 0.35)'; e.currentTarget.style.background = 'hsl(42 76% 50% / 0.06)'; }}
    >
      <Icon name="MessageCircleWarning" size={13} />
      Не согласен с какой либо информацией или обнаружил ошибку?
    </button>
  );
}