import { api } from './api';

export type ConversationKind = 'GROUP' | 'DIRECT';

// Représentation minimale d'un participant, telle que renvoyée par l'app
// `messagerie` (générique et réutilisable — elle ne connaît ni les rôles ni
// les divisions propres à ce projet, voir `messagerie.serializers`).
export interface MessagingParticipant {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  profile_picture: string | null;
}

export interface Message {
  id: number;
  conversation: number;
  sender: number | null;
  sender_name: string | null;
  text: string;
  attachment: string | null;
  created_at: string;
}

export interface Conversation {
  id: number;
  kind: ConversationKind;
  kind_display: string;
  /** Nom du groupe — vide pour un message direct (voir `display_name`). */
  name: string;
  /** Nom du groupe, ou nom de l'interlocuteur pour un message direct. */
  display_name: string;
  participants: MessagingParticipant[];
  /** Non nul uniquement pour une conversation directe. */
  other_participant: MessagingParticipant | null;
  last_message: Message | null;
  unread_count: number;
  created_at: string;
}

export async function listConversations(): Promise<Conversation[]> {
  const response = await api.get<Conversation[]>('/conversations/');
  return response.data;
}

export async function startDirectConversation(userId: number): Promise<Conversation> {
  const response = await api.post<Conversation>('/conversations/direct/', { user: userId });
  return response.data;
}

export async function markConversationRead(conversationId: number): Promise<void> {
  await api.post(`/conversations/${conversationId}/mark-read/`);
}

export async function listMessages(conversationId: number): Promise<Message[]> {
  const response = await api.get<Message[]>('/messages/', { params: { conversation: conversationId } });
  return response.data;
}

export async function sendMessage(data: FormData): Promise<Message> {
  const response = await api.post<Message>('/messages/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}
