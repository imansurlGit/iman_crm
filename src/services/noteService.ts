import { api } from './api';

export interface Note {
  id: number;
  contact: number;
  text: string;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export async function listNotes(contactId: number): Promise<Note[]> {
  const response = await api.get<Note[]>('/notes/', { params: { contact: contactId } });
  return response.data;
}

export async function createNote(contactId: number, text: string): Promise<Note> {
  const response = await api.post<Note>('/notes/', { contact: contactId, text });
  return response.data;
}

export async function updateNote(id: number, text: string): Promise<Note> {
  const response = await api.patch<Note>(`/notes/${id}/`, { text });
  return response.data;
}

export async function deleteNote(id: number): Promise<void> {
  await api.delete(`/notes/${id}/`);
}
