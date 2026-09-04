// Métadonnées pures d'affichage + utilitaires de date pour le calendrier
// collaboratif. Les événements eux-mêmes sont réels — dérivés d'Event
// (réunion/appel/livraison, voir services/eventService.ts), de Task (échéance, voir
// services/taskService.ts), de Contact.next_followup_at (relance — posée
// automatiquement à la création d'un prospect ou reprogrammée depuis sa
// fiche) et de PartnershipDossier (événement partenariat, voir
// services/partnershipDossierService.ts), assemblés dans
// CalendrierCollaboratifPage.tsx. La visibilité (qui voit l'agenda de qui)
// vit dans utils/calendarVisibility.ts — un événement partenariat, lui, est
// toujours visible sur tous les agendas (il concerne toute l'agence).

export type EventType = 'REUNION' | 'RELANCE' | 'DEADLINE' | 'EVENEMENT' | 'LIVRAISON';

export interface CalendarEvent {
  /** Préfixé par sa source ("event-12" / "task-7") — les deux modèles ont des id qui se recoupent. */
  id: string;
  title: string;
  type: EventType;
  /** Date de début, au format 'YYYY-MM-DD'. */
  startDate: string;
  /** Date de fin (incluse), au format 'YYYY-MM-DD'. Toujours égale à startDate ici : ni Event ni Task ne durent plusieurs jours. */
  endDate: string;
  allDay: boolean;
  /** Heure de début 'HH:mm', uniquement si allDay === false. */
  startTime?: string;
  endTime?: string;
  ownerId: number;
  ownerName: string;
  location?: string;
  linkedTo?: string;
}

export const TYPE_META: Record<EventType, { label: string; icon: string; dot: string; badge: string; border: string }> = {
  REUNION: { label: 'Réunion', icon: 'groups', dot: 'bg-indigo-600', badge: 'bg-indigo-100 text-indigo-800', border: 'border-indigo-600' },
  RELANCE: { label: 'Relance', icon: 'call', dot: 'bg-amber-600', badge: 'bg-amber-100 text-amber-800', border: 'border-amber-600' },
  DEADLINE: { label: 'Échéance', icon: 'flag', dot: 'bg-red-600', badge: 'bg-red-100 text-red-800', border: 'border-red-600' },
  EVENEMENT: { label: 'Événement', icon: 'celebration', dot: 'bg-rose-600', badge: 'bg-rose-100 text-rose-800', border: 'border-rose-600' },
  LIVRAISON: { label: 'Livraison', icon: 'local_shipping', dot: 'bg-blue-600', badge: 'bg-blue-100 text-blue-800', border: 'border-blue-600' },
};

export function parseISODate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Un événement occupe-t-il ce jour ? (bornes incluses) */
export function eventCoversDay(event: CalendarEvent, day: Date): boolean {
  const start = parseISODate(event.startDate);
  const end = parseISODate(event.endDate);
  const target = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  return target >= start && target <= end;
}
