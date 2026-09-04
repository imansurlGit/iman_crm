import { api } from './api';

export interface Notification {
  id: number;
  message: string;
  contact: number | null;
  contact_name: string | null;
  is_read: boolean;
  created_at: string;
}

export async function listNotifications(): Promise<Notification[]> {
  const response = await api.get<Notification[]>('/notifications/');
  return response.data;
}

export async function markNotificationRead(id: number): Promise<Notification> {
  const response = await api.patch<Notification>(`/notifications/${id}/`, { is_read: true });
  return response.data;
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post('/notifications/mark-all-read/');
}

export async function deleteNotification(id: number): Promise<void> {
  await api.delete(`/notifications/${id}/`);
}
