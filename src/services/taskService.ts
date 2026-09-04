import { api } from './api';

export type TaskType = 'CONTACT' | 'PRESTATION';
export type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export interface Task {
  id: number;
  task_type: TaskType;
  task_type_display: string;
  contact: number | null;
  prestation: number | null;
  label: string;
  description: string;
  due_at: string | null;
  priority: TaskPriority;
  priority_display: string;
  done: boolean;
  status: TaskStatus;
  status_display: string;
  assignee: number | null;
  assignee_name: string | null;
  created_by: number | null;
  created_at: string;
}

export interface NewTaskPayload {
  contact: number;
  label: string;
  description?: string;
  due_at?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  assignee?: number | null;
}

export interface TaskUpdatePayload {
  label?: string;
  description?: string;
  due_at?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  assignee?: number | null;
  done?: boolean;
}

export async function listTasks(contactId: number): Promise<Task[]> {
  const response = await api.get<Task[]>('/tasks/', { params: { contact: contactId } });
  return response.data;
}

/** Toutes les tâches (contact + prestation), non filtrées côté serveur (voir
 * `TaskViewSet.get_queryset`) — à filtrer côté client (par assignee, par
 * date...) selon le besoin de la page appelante. */
export async function listAllTasks(): Promise<Task[]> {
  const response = await api.get<Task[]>('/tasks/');
  return response.data;
}

export async function getTask(id: number): Promise<Task> {
  const response = await api.get<Task>(`/tasks/${id}/`);
  return response.data;
}

export async function createTask(data: NewTaskPayload): Promise<Task> {
  const response = await api.post<Task>('/tasks/', data);
  return response.data;
}

export async function updateTask(id: number, data: TaskUpdatePayload): Promise<Task> {
  const response = await api.patch<Task>(`/tasks/${id}/`, data);
  return response.data;
}

export interface NewPrestationTaskPayload {
  prestation: number;
  label: string;
  description?: string;
  due_at: string;
  priority: TaskPriority;
  assignee?: number | null;
}

export interface PrestationTaskUpdatePayload {
  label?: string;
  description?: string;
  due_at?: string;
  priority?: TaskPriority;
  assignee?: number | null;
  done?: boolean;
}

/** Assigner une tâche notifie la personne assignée (voir
 * `TaskViewSet._notify_assignee_if_newly_assigned` côté backend). */
export async function listPrestationTasks(prestationId: number): Promise<Task[]> {
  const response = await api.get<Task[]>('/tasks/', { params: { prestation: prestationId } });
  return response.data;
}

export async function createPrestationTask(data: NewPrestationTaskPayload): Promise<Task> {
  const response = await api.post<Task>('/tasks/', { ...data, task_type: 'PRESTATION' });
  return response.data;
}

export async function updatePrestationTask(id: number, data: PrestationTaskUpdatePayload): Promise<Task> {
  const response = await api.patch<Task>(`/tasks/${id}/`, data);
  return response.data;
}

export async function deleteTask(id: number): Promise<void> {
  await api.delete(`/tasks/${id}/`);
}

export function formatTaskDueLabel(task: Task): string {
  if (task.done) return 'Terminé';
  if (!task.due_at) return 'Sans échéance';

  const due = new Date(task.due_at);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDayStart = new Date(due);
  dueDayStart.setHours(0, 0, 0, 0);
  const diffDays = Math.round((dueDayStart.getTime() - today.getTime()) / 86_400_000);

  const time = due.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const isLate = due.getTime() < Date.now();

  let dayLabel: string;
  if (diffDays === 0) dayLabel = "Aujourd'hui";
  else if (diffDays === 1) dayLabel = 'Demain';
  else dayLabel = due.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

  return isLate ? `Échéance : ${dayLabel} ${time} (en retard)` : `Échéance : ${dayLabel} ${time}`;
}
