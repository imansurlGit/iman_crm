import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
} from '../../services/notificationService';
import { listConversations, type Conversation } from '../../services/messagingService';
import UserMenu from './UserMenu';

const POLL_INTERVAL_MS = 5_000;

function formatRelativeTime(value: string): string {
  const diffMin = Math.round((Date.now() - new Date(value).getTime()) / 60_000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `il y a ${diffHours} h`;
  return `il y a ${Math.round(diffHours / 24)} j`;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function lastMessagePreview(conversation: Conversation): string {
  const message = conversation.last_message;
  if (!message) return '';
  if (message.text) return message.text;
  if (message.attachment) return '📎 Document';
  return '';
}

export default function Topbar() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const messagesPanelRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    function refresh() {
      listConversations()
        .then(setConversations)
        .catch(() => {});
    }
    refresh();
    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: globalThis.MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (messagesPanelRef.current && !messagesPanelRef.current.contains(event.target as Node)) {
        setIsMessagesOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setIsMessagesOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const unreadMessageCount = conversations.reduce((sum, c) => sum + c.unread_count, 0);
  const recentConversations = [...conversations]
    .filter((c) => c.last_message)
    .sort((a, b) => new Date(b.last_message!.created_at).getTime() - new Date(a.last_message!.created_at).getTime())
    .slice(0, 5);

  function goToConversation(conversation: Conversation) {
    setIsMessagesOpen(false);
    navigate(`/messagerie?conversation=${conversation.id}`);
  }

  async function handleNotificationClick(notification: Notification) {
    if (notification.is_read) return;
    const updated = await markNotificationRead(notification.id);
    setNotifications((prev) => prev.map((n) => (n.id === notification.id ? updated : n)));
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function handleDeleteNotification(event: MouseEvent, id: number) {
    event.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await deleteNotification(id);
  }

  return (
    <header className="sticky top-0 w-full h-[64px] bg-surface-container-lowest border-b border-surface-variant flex items-center justify-between px-gutter z-50">
      <div className="flex items-center gap-8 flex-1">
        <div className="relative w-full max-w-md focus-within:ring-2 focus-within:ring-primary/20 rounded">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
            search
          </span>
          <input
            className="w-full bg-surface-container-low border-none rounded py-2 pl-10 pr-4 focus:ring-0 text-body-md"
            placeholder="Rechercher..."
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 mr-4">
          <div className="relative" ref={panelRef}>
            <button
              aria-expanded={isOpen}
              aria-haspopup="true"
              aria-label="Notifications"
              className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors relative"
              onClick={() => setIsOpen((prev) => !prev)}
              type="button"
            >
              <span className="material-symbols-outlined">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-primary text-white text-[10px] font-bold rounded-full leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {isOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg surface-card z-30">
                <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
                  <h3 className="font-body-sm text-body-sm font-bold text-on-surface">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      className="text-xs text-primary font-semibold hover:underline"
                      onClick={handleMarkAllRead}
                      type="button"
                    >
                      Tout marquer comme lu
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div
                      className={`w-full text-left flex items-start gap-3 px-4 py-3 border-b border-outline-variant last:border-0 hover:bg-surface-container-high transition-colors cursor-pointer group ${
                        notification.is_read ? '' : 'bg-primary-container/5'
                      }`}
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      {!notification.is_read && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                      <div className={`flex-1 min-w-0 ${notification.is_read ? 'pl-[18px]' : ''}`}>
                        <p className="font-body-sm text-body-sm text-on-surface">{notification.message}</p>
                        <span className="text-[11px] text-on-surface-variant">
                          {formatRelativeTime(notification.created_at)}
                        </span>
                      </div>
                      <button
                        aria-label="Supprimer la notification"
                        className="p-1 -m-1 rounded-full text-on-surface-variant/40 opacity-0 group-hover:opacity-100 hover:bg-error-container/40 hover:text-error transition-all shrink-0"
                        onClick={(event) => handleDeleteNotification(event, notification.id)}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <p className="px-4 py-6 text-center text-body-sm text-secondary">Aucune notification.</p>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="relative" ref={messagesPanelRef}>
            <button
              aria-expanded={isMessagesOpen}
              aria-haspopup="true"
              aria-label="Messagerie"
              className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors relative"
              onClick={() => setIsMessagesOpen((prev) => !prev)}
              type="button"
            >
              <span className="material-symbols-outlined">mail</span>
              {unreadMessageCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-emerald-500 text-white text-[10px] font-bold rounded-full leading-none">
                  {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                </span>
              )}
            </button>

            {isMessagesOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg surface-card z-30">
                <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
                  <h3 className="font-body-sm text-body-sm font-bold text-on-surface">Messages</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {recentConversations.map((conversation) => {
                    const avatarUrl = conversation.kind === 'DIRECT' ? conversation.other_participant?.profile_picture : null;
                    return (
                      <button
                        className={`w-full text-left flex items-start gap-3 px-4 py-3 border-b border-outline-variant last:border-0 hover:bg-surface-container-high transition-colors ${
                          conversation.unread_count > 0 ? 'bg-primary-container/5' : ''
                        }`}
                        key={conversation.id}
                        onClick={() => goToConversation(conversation)}
                        type="button"
                      >
                        {conversation.kind === 'GROUP' ? (
                          <div className="w-8 h-8 rounded-full bg-surface-container-high text-secondary flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[16px]">tag</span>
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-[11px] font-bold shrink-0 overflow-hidden">
                            {avatarUrl ? (
                              <img alt="" className="w-full h-full object-cover" src={avatarUrl} />
                            ) : (
                              getInitials(conversation.display_name)
                            )}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-body-sm text-body-sm font-semibold text-on-surface truncate">
                              {conversation.display_name}
                            </p>
                            {conversation.unread_count > 0 && (
                              <span className="min-w-[16px] h-[16px] px-1 flex items-center justify-center bg-emerald-500 text-white text-[9px] font-bold rounded-full shrink-0">
                                {conversation.unread_count}
                              </span>
                            )}
                          </div>
                          <p className="text-[12px] text-on-surface-variant truncate">{lastMessagePreview(conversation)}</p>
                          <span className="text-[11px] text-on-surface-variant/70">
                            {formatRelativeTime(conversation.last_message!.created_at)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                  {recentConversations.length === 0 && (
                    <p className="px-4 py-6 text-center text-body-sm text-secondary">Aucun message pour le moment.</p>
                  )}
                </div>
                <button
                  className="w-full py-2.5 text-center text-xs font-semibold text-primary hover:bg-surface-container-high transition-colors border-t border-outline-variant"
                  onClick={() => {
                    setIsMessagesOpen(false);
                    navigate('/messagerie');
                  }}
                  type="button"
                >
                  Voir plus
                </button>
              </div>
            )}
          </div>
        </div>

        <UserMenu />
      </div>
    </header>
  );
}
