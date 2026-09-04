import { api } from './api';
import type { Stage } from './contactService';

export type InteractionType = 'CALL' | 'MEETING' | 'EMAIL' | 'MESSAGE';

export interface Interaction {
  id: number;
  contact: number;
  interaction_type: InteractionType;
  interaction_type_display: string;
  /** Étape du contact au moment de l'échange — capturée côté serveur à la création. */
  stage: Stage | null;
  stage_display: string | null;
  title: string;
  description: string;
  occurred_at: string;
  attachment: string | null;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
}

export const INTERACTION_TYPE_OPTIONS: { value: InteractionType; label: string; icon: string }[] = [
  { value: 'CALL', label: 'Appel', icon: 'call' },
  { value: 'MEETING', label: 'Réunion', icon: 'groups' },
  { value: 'EMAIL', label: 'Email', icon: 'mail' },
  { value: 'MESSAGE', label: 'Message', icon: 'sms' },
];

export async function listInteractions(contactId: number): Promise<Interaction[]> {
  const response = await api.get<Interaction[]>('/interactions/', { params: { contact: contactId } });
  return response.data;
}

export async function createInteraction(data: FormData): Promise<Interaction> {
  const response = await api.post<Interaction>('/interactions/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function updateInteraction(id: number, data: FormData): Promise<Interaction> {
  const response = await api.patch<Interaction>(`/interactions/${id}/`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function deleteInteraction(id: number): Promise<void> {
  await api.delete(`/interactions/${id}/`);
}
