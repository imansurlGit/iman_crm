import { api } from './api';

// Volontairement pas nommé `Event` : ça masquerait le type DOM `Event`
// global partout où ce module est importé sans alias.
// `LIVRAISON` n'est jamais choisi dans un formulaire générique (voir
// `EVENT_TYPE_OPTIONS` ci-dessous, volontairement limité à CALL/MEETING) —
// il n'est créé que par la confirmation de livraison d'un projet.
export type EventType = 'CALL' | 'MEETING' | 'LIVRAISON';

// `ACCEPTED` par défaut côté serveur — un simple call/réunion loggé est déjà
// confirmé. `PENDING` sert aux demandes de rendez-vous qu'un tiers propose
// pour quelqu'un d'autre (ex: ADCH planifie pour le DG) — voir `respondToEvent`.
export type EventStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'POSTPONED';

export interface ProspectEvent {
  id: number;
  contact: number;
  event_type: EventType;
  event_type_display: string;
  title: string;
  starts_at: string;
  location: string;
  status: EventStatus;
  status_display: string;
  original_starts_at: string | null;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
}

export interface NewEventPayload {
  contact: number;
  event_type: EventType;
  title: string;
  starts_at: string;
  location?: string;
  status?: EventStatus;
}

export const EVENT_TYPE_OPTIONS: { value: EventType; label: string; icon: string }[] = [
  { value: 'CALL', label: 'Appel', icon: 'call' },
  { value: 'MEETING', label: 'Réunion', icon: 'groups' },
];

export async function listEvents(contactId: number): Promise<ProspectEvent[]> {
  const response = await api.get<ProspectEvent[]>('/events/', { params: { contact: contactId } });
  return response.data;
}

/** Calendrier collaboratif : événements de tous les contacts, non filtrés
 * côté serveur (voir `EventViewSet.get_queryset`) — à filtrer côté client
 * (par contact, par date...) selon le besoin de la page appelante. */
export async function listAllEvents(): Promise<ProspectEvent[]> {
  const response = await api.get<ProspectEvent[]>('/events/');
  return response.data;
}

export async function createEvent(data: NewEventPayload): Promise<ProspectEvent> {
  const response = await api.post<ProspectEvent>('/events/', data);
  return response.data;
}

/** Réponse du destinataire à une demande de rendez-vous. Pour un report,
 * `startsAt` (ISO 8601) est obligatoire — le serveur conserve l'horaire
 * initial dans `original_starts_at`. */
export async function respondToEvent(
  id: number,
  decision: Extract<EventStatus, 'ACCEPTED' | 'DECLINED' | 'POSTPONED'>,
  startsAt?: string,
): Promise<ProspectEvent> {
  const response = await api.post<ProspectEvent>(`/events/${id}/respond/`, {
    decision,
    ...(startsAt ? { starts_at: startsAt } : {}),
  });
  return response.data;
}
