import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { getOrCreateAgencyContact, type Contact } from '../services/contactService';
import { listEvents, createEvent, EVENT_TYPE_OPTIONS, type EventType, type ProspectEvent } from '../services/eventService';
import Modal from '../components/ui/Modal';
import { LABEL_CLASSES } from '../components/ui/formStyles';

const CARD_CLASSES = 'bg-white rounded-lg border border-outline-variant';

function formatDay(value: string): { day: string; month: string } {
  const date = new Date(value);
  return {
    day: date.toLocaleDateString('fr-FR', { day: '2-digit' }),
    month: date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '').toUpperCase(),
  };
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function nowForDateTimeInput(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export default function AdchAgendaDgPage() {
  const [agencyContact, setAgencyContact] = useState<Contact | null>(null);
  const [events, setEvents] = useState<ProspectEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState<EventType>('MEETING');
  const [startsAt, setStartsAt] = useState(nowForDateTimeInput());
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getOrCreateAgencyContact()
      .then((contact) => {
        setAgencyContact(contact);
        return listEvents(contact.id);
      })
      .then(setEvents)
      .finally(() => setIsLoading(false));
  }, []);

  const sortedEvents = useMemo(() => [...events].sort((a, b) => a.starts_at.localeCompare(b.starts_at)), [events]);
  const now = new Date();
  const upcoming = sortedEvents.filter((event) => new Date(event.starts_at) >= now);
  const past = sortedEvents.filter((event) => new Date(event.starts_at) < now).reverse();

  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const thisWeekCount = upcoming.filter((event) => new Date(event.starts_at) <= weekEnd).length;

  function openModal() {
    setTitle('');
    setEventType('MEETING');
    setStartsAt(nowForDateTimeInput());
    setLocation('');
    setIsModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!agencyContact || !title.trim() || !startsAt) return;
    setIsSubmitting(true);
    try {
      const created = await createEvent({
        contact: agencyContact.id,
        event_type: eventType,
        title: title.trim(),
        starts_at: new Date(startsAt).toISOString(),
        location: location.trim() || undefined,
        // Proposé par l'ADCH pour le DG — à confirmer par ce dernier
        // (Accepter/Décliner/Reporter) depuis son propre calendrier.
        status: 'PENDING',
      });
      setEvents((prev) => [...prev, created]);
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <p className="font-body-sm text-body-sm text-secondary">Chargement...</p>;
  }

  return (
    <div className="flex flex-col gap-gutter">
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">Agenda du DG</h2>
          <p className="text-secondary mt-1 text-sm">Planifiez et suivez les rendez-vous du Directeur Général.</p>
        </div>
        <button
          className="flex items-center gap-1.5 bg-primary text-white pl-3 pr-4 py-2 rounded-full text-xs font-bold shadow-sm hover:shadow-md hover:bg-on-primary-fixed-variant active:scale-95 transition-all shrink-0 disabled:opacity-40"
          disabled={!agencyContact}
          onClick={openModal}
          type="button"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Planifier un rendez-vous
        </button>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        <div className={`${CARD_CLASSES} p-4 flex items-center gap-3`}>
          <span className="material-symbols-outlined text-primary-container text-2xl shrink-0">event_upcoming</span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">Prochain rendez-vous</span>
            <span className="font-headline-md text-lg font-bold text-on-surface leading-tight">
              {upcoming[0] ? `${formatDay(upcoming[0].starts_at).day} ${formatDay(upcoming[0].starts_at).month} · ${formatTime(upcoming[0].starts_at)}` : '—'}
            </span>
          </div>
        </div>
        <div className={`${CARD_CLASSES} p-4 flex items-center gap-3`}>
          <span className="material-symbols-outlined text-primary-container text-2xl shrink-0">date_range</span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">Cette semaine</span>
            <span className="font-headline-md text-lg font-bold text-on-surface leading-tight">{thisWeekCount}</span>
          </div>
        </div>
        <div className={`${CARD_CLASSES} p-4 flex items-center gap-3`}>
          <span className="material-symbols-outlined text-primary-container text-2xl shrink-0">event</span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">Total à venir</span>
            <span className="font-headline-md text-lg font-bold text-on-surface leading-tight">{upcoming.length}</span>
          </div>
        </div>
      </section>

      <section className={`${CARD_CLASSES} p-5`}>
        <h3 className="font-headline-md text-base font-bold text-on-surface mb-4">Rendez-vous à venir</h3>
        {upcoming.length > 0 ? (
          <div className="space-y-2.5">
            {upcoming.map((event) => {
              const badge = formatDay(event.starts_at);
              const meta = EVENT_TYPE_OPTIONS.find((option) => option.value === event.event_type);
              return (
                <div
                  className="flex items-center gap-3 px-4 py-3 bg-surface-container-low rounded-lg border border-outline-variant/50"
                  key={event.id}
                >
                  <div className="flex flex-col items-center px-2.5 py-1.5 bg-primary/5 border border-primary/10 rounded-sm text-primary shrink-0">
                    <span className="text-[9px] font-bold uppercase">{badge.month}</span>
                    <span className="text-base font-bold leading-none">{badge.day}</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary-container/10 text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">{meta?.icon ?? 'event'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-on-surface truncate">{event.title}</p>
                    <p className="text-xs text-secondary">
                      {formatTime(event.starts_at)}
                      {event.location && ` · ${event.location}`}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-secondary bg-surface-container-high px-2 py-1 rounded-full shrink-0">
                    {event.event_type_display}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-secondary">Aucun rendez-vous planifié pour l'instant.</p>
        )}
      </section>

      {past.length > 0 && (
        <section className={`${CARD_CLASSES} p-5`}>
          <h3 className="font-headline-md text-base font-bold text-on-surface mb-4">Rendez-vous passés</h3>
          <div className="space-y-2">
            {past.slice(0, 6).map((event) => (
              <div className="flex items-center gap-3 px-3 py-2 opacity-60" key={event.id}>
                <span className="text-xs text-secondary w-20 shrink-0">
                  {formatDay(event.starts_at).day} {formatDay(event.starts_at).month}
                </span>
                <span className="text-sm text-on-surface truncate flex-1">{event.title}</span>
                <span className="text-xs text-secondary shrink-0">{formatTime(event.starts_at)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <Modal
        footer={
          <>
            <button
              className="px-5 py-2.5 rounded border border-outline-variant text-on-surface font-body-sm text-body-sm hover:bg-surface-container-high transition-colors"
              onClick={() => setIsModalOpen(false)}
              type="button"
            >
              Annuler
            </button>
            <button
              className="px-5 py-2.5 rounded bg-on-primary-fixed-variant text-white font-body-sm text-body-sm font-bold hover:bg-primary transition-colors disabled:opacity-50"
              disabled={isSubmitting}
              form="agenda-dg-form"
              type="submit"
            >
              {isSubmitting ? 'Enregistrement...' : 'Planifier'}
            </button>
          </>
        }
        isOpen={isModalOpen}
        maxWidthClassName="max-w-md"
        onClose={() => setIsModalOpen(false)}
        title="Planifier un rendez-vous"
      >
        <form className="space-y-3" id="agenda-dg-form" onSubmit={handleSubmit}>
          <div className="flex gap-2">
            {EVENT_TYPE_OPTIONS.map((option) => (
              <button
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border transition-colors ${
                  eventType === option.value
                    ? 'border-primary bg-primary-container/10 text-on-surface font-semibold'
                    : 'border-outline-variant text-secondary hover:bg-surface-container-high'
                }`}
                key={option.value}
                onClick={() => setEventType(option.value)}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">{option.icon}</span>
                {option.label}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <label className={LABEL_CLASSES} htmlFor="agenda-dg-title">
              Intitulé
            </label>
            <input
              className="w-full px-3 py-2 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container outline-none"
              id="agenda-dg-title"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex : Comité de direction"
              required
              type="text"
              value={title}
            />
          </div>
          <div className="space-y-1.5">
            <label className={LABEL_CLASSES} htmlFor="agenda-dg-date">
              Date et heure
            </label>
            <input
              className="w-full px-3 py-2 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container outline-none"
              id="agenda-dg-date"
              onChange={(event) => setStartsAt(event.target.value)}
              required
              type="datetime-local"
              value={startsAt}
            />
          </div>
          <div className="space-y-1.5">
            <label className={LABEL_CLASSES} htmlFor="agenda-dg-location">
              Lieu
            </label>
            <input
              className="w-full px-3 py-2 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container outline-none"
              id="agenda-dg-location"
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Ex : Salle de conférence A"
              type="text"
              value={location}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
