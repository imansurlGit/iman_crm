import { useEffect, useState } from 'react';
import { listNotifications, markNotificationRead, type Notification } from '../../services/notificationService';

// Bande d'alerte sous l'en-tête — les notifications LOW restent uniquement
// dans la cloche (Topbar.tsx) ; MEDIUM/HIGH s'affichent aussi ici tant
// qu'elles ne sont pas lues. Interrogation indépendante de la cloche (même
// pattern de sondage que Topbar.tsx), pas d'état partagé entre les deux.

const POLL_INTERVAL_MS = 5_000;

const URGENCY_STYLE: Record<'HIGH' | 'MEDIUM', { bar: string; icon: string }> = {
  HIGH: { bar: 'bg-red-600 text-white', icon: 'error' },
  MEDIUM: { bar: 'bg-amber-400 text-slate-900', icon: 'priority_high' },
};

function formatRelativeTime(value: string): string {
  const diffMin = Math.round((Date.now() - new Date(value).getTime()) / 60_000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `il y a ${diffHours} h`;
  return `il y a ${Math.round(diffHours / 24)} j`;
}

export default function UrgencyBanner() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    function refresh() {
      listNotifications()
        .then(setNotifications)
        .catch(() => {});
    }
    refresh();
    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const banners = notifications
    .filter((n): n is Notification & { urgency: 'HIGH' | 'MEDIUM' } => !n.is_read && n.urgency !== 'LOW')
    .sort((a, b) => (a.urgency === b.urgency ? a.created_at.localeCompare(b.created_at) : a.urgency === 'HIGH' ? -1 : 1));

  async function dismiss(id: number) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await markNotificationRead(id);
  }

  if (banners.length === 0) return null;

  return (
    <div className="flex flex-col">
      {banners.map((notification) => {
        const style = URGENCY_STYLE[notification.urgency];
        return (
          <div className={`flex items-center gap-2.5 px-6 py-2 text-xs font-semibold ${style.bar}`} key={notification.id}>
            <span className="material-symbols-outlined text-[16px] shrink-0">{style.icon}</span>
            <span className="flex-1 min-w-0 truncate">{notification.message}</span>
            <span className="text-[11px] font-medium opacity-80 shrink-0">{formatRelativeTime(notification.created_at)}</span>
            <button
              aria-label="Marquer comme lue"
              className="p-1 -m-1 rounded-full hover:bg-black/10 transition-colors shrink-0"
              onClick={() => dismiss(notification.id)}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
