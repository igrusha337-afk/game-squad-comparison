import Icon from '@/components/ui/icon';

interface Props {
  onClose: () => void;
}

const FEATURES: { icon: string; title: string; desc: string }[] = [
  { icon: 'Shield', title: 'Создание дома', desc: 'Основайте свой дом с гербом, названием и описанием. Один игрок может создать только один дом.' },
  { icon: 'Users', title: 'Участники', desc: 'Приглашайте соратников — они смогут вступить в дом и пополнить его ряды.' },
  { icon: 'Trophy', title: 'Рейтинг активности', desc: 'Дом набирает баллы за активность участников и поднимается в общем рейтинге.' },
  { icon: 'Pencil', title: 'Управление домом', desc: 'Глава дома может редактировать шапку, описание, добавлять видео, фото и аудио.' },
  { icon: 'Crown', title: 'Передача власти', desc: 'Глава может передать управление домом любому участнику или исключить кого-то из состава.' },
  { icon: 'Send', title: 'Соцсети', desc: 'Добавьте ссылки на Telegram, Discord, ВКонтакте, YouTube и Rutube своего дома.' },
];

export default function HousesHintModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden max-h-[85vh] flex flex-col"
        style={{ background: 'hsl(222 18% 9%)', border: '1px solid hsl(42 76% 50% / 0.3)', boxShadow: '0 20px 60px #00000080' }}
      >
        {/* Шапка */}
        <div className="relative px-6 py-5 flex-shrink-0" style={{ borderBottom: '1px solid hsl(222 14% 16%)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'hsl(42 76% 50% / 0.15)', border: '1px solid hsl(42 76% 50% / 0.35)' }}>
              <Icon name="Shield" size={20} style={{ color: 'hsl(42 76% 68%)' }} />
            </div>
            <div>
              <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.5rem', fontWeight: 700, color: 'hsl(38 24% 94%)', lineHeight: 1.1 }}>
                Дома CB
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'hsl(222 8% 54%)', fontFamily: 'Manrope, sans-serif' }}>
                Что умеет этот раздел
              </p>
            </div>
          </div>
          <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center transition-colors"
            style={{ background: 'hsl(222 20% 14%)', color: 'hsl(222 8% 60%)' }}>
            <Icon name="X" size={14} />
          </button>
        </div>

        {/* Контент */}
        <div className="px-6 py-5 overflow-y-auto scrollbar-thin space-y-3">
          {FEATURES.map(f => (
            <div key={f.title} className="flex items-start gap-3 p-3 rounded-xl"
              style={{ background: 'hsl(222 20% 11%)', border: '1px solid hsl(222 14% 18%)' }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'hsl(42 76% 50% / 0.12)', border: '1px solid hsl(42 76% 50% / 0.25)' }}>
                <Icon name={f.icon} size={16} style={{ color: 'hsl(42 76% 62%)' }} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold" style={{ color: 'hsl(38 18% 90%)', fontFamily: 'Manrope, sans-serif' }}>
                  {f.title}
                </div>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'hsl(222 8% 60%)', fontFamily: 'Manrope, sans-serif' }}>
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Футер */}
        <div className="px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid hsl(222 14% 16%)' }}>
          <button onClick={onClose}
            className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'linear-gradient(135deg, hsl(42 76% 52%), hsl(30 64% 38%))', color: 'hsl(222 30% 10%)', fontFamily: 'Manrope, sans-serif' }}>
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
}
