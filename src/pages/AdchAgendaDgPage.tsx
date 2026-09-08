import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { getOrCreateAgencyContact, type Contact } from '../services/contactService';
import { listEvents, createEvent, EVENT_TYPE_OPTIONS, type EventType, type ProspectEvent } from '../services/eventService';
import Modal from '../components/ui/Modal';
import { LABEL_CLASSES } from '../components/ui/formStyles';

const INPUT_CLASSES =
  'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-1 focus:ring-primary focus:bg-white outline-none transition-all';

// Aligné sur `Event.Status` côté backend et sur STATUS_META de CalendrierDgPage.tsx
// (le calendrier du DG lui-même) — même vocabulaire visuel des deux côtés.
const STATUS_META: Record<ProspectEvent['status'], { label: string; badge: string }> = {
  PENDING: { label: 'En attente', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  ACCEPTED: { label: 'Accepté', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  DECLINED: { label: 'Décliné', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
  POSTPONED: { label: 'Reporté', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
};

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
    return (
      <div className="flex items-center justify-center min-h-[300px] text-slate-400 text-xs">
        <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
        Chargement...
      </div>
    );
  }

  return (
    <div className="max-w-[1480px] mx-auto space-y-5 pb-16 text-slate-800 animate-fadeIn">
      {/* ==================================================================== */}
      {/* EN-TÊTE                                                              */}
      {/* ==================================================================== */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">event</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-headline-md text-xl font-extrabold text-slate-900 tracking-tight">Agenda du DG</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary">ADCH</span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">Planifiez et suivez les rendez-vous du Directeur Général.</p>
          </div>
        </div>
        <button
          className="flex items-center gap-1.5 bg-primary hover:bg-on-primary-fixed-variant text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs hover:shadow-md active:scale-95 transition-all shrink-0 disabled:opacity-40"
          disabled={!agencyContact}
          onClick={openModal}
          type="button"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Planifier un rendez-vous
        </button>
      </header>

      {/* ==================================================================== */}
      {/* KPIS                                                                 */}
      {/* ==================================================================== */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200/60 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 text-xs font-medium mb-1">
            <span>Prochain rendez-vous</span>
            <span className="material-symbols-outlined text-blue-600 text-[18px]">event_upcoming</span>
          </div>
          <div className="text-lg font-black text-slate-900 tracking-tight font-headline-md">
            {upcoming[0]
              ? `${formatDay(upcoming[0].starts_at).day} ${formatDay(upcoming[0].starts_at).month} · ${formatTime(upcoming[0].starts_at)}`
              : '—'}
          </div>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Cette semaine</span>
            <span className="material-symbols-outlined text-slate-400 text-[18px]">date_range</span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight font-headline-md">{thisWeekCount}</div>
        </div>
        <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/60 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 text-xs font-medium mb-1">
            <span>Total à venir</span>
            <span className="material-symbols-outlined text-emerald-600 text-[18px]">event</span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight font-headline-md">{upcoming.length}</div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* RENDEZ-VOUS À VENIR                                                  */}
      {/* ==================================================================== */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5">
        <h2 className="font-headline-md text-sm font-bold text-slate-900 mb-3">Rendez-vous à venir</h2>
        {upcoming.length > 0 ? (
          <div className="space-y-2">
            {upcoming.map((event) => {
              const badge = formatDay(event.starts_at);
              const meta = EVENT_TYPE_OPTIONS.find((option) => option.value === event.event_type);
              return (
                <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100" key={event.id}>
                  <div className="flex flex-col items-center px-2.5 py-1.5 bg-primary/5 border border-primary/10 rounded-lg text-primary shrink-0">
                    <span className="text-[9px] font-bold uppercase">{badge.month}</span>
                    <span className="text-base font-bold leading-none">{badge.day}</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">{meta?.icon ?? 'event'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{event.title}</p>
                    <p className="text-xs text-slate-500">
                      {formatTime(event.starts_at)}
                      {event.location && ` · ${event.location}`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_META[event.status].badge}`}>
                      {STATUS_META[event.status].label}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{event.event_type_display}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-6">Aucun rendez-vous planifié pour l'instant.</p>
        )}
      </section>

      {/* ==================================================================== */}
      {/* RENDEZ-VOUS PASSÉS                                                   */}
      {/* ==================================================================== */}
      {past.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5">
          <h2 className="font-headline-md text-sm font-bold text-slate-900 mb-3">Rendez-vous passés</h2>
          <div className="space-y-1">
            {past.slice(0, 6).map((event) => (
              <div className="flex items-center gap-3 px-3 py-2 opacity-60" key={event.id}>
                <span className="text-xs text-slate-400 w-20 shrink-0">
                  {formatDay(event.starts_at).day} {formatDay(event.starts_at).month}
                </span>
                <span className="text-sm text-slate-800 truncate flex-1">{event.title}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${STATUS_META[event.status].badge}`}>
                  {STATUS_META[event.status].label}
                </span>
                <span className="text-xs text-slate-400 shrink-0">{formatTime(event.starts_at)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ==================================================================== */}
      {/* MODAL : PLANIFIER UN RENDEZ-VOUS                                     */}
      {/* ==================================================================== */}
      <Modal
        footer={
          <>
            <button
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition-colors"
              onClick={() => setIsModalOpen(false)}
              type="button"
            >
              Annuler
            </button>
            <button
              className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-on-primary-fixed-variant transition-colors disabled:opacity-50"
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
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                  eventType === option.value
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
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
          <div className="space-y-1">
            <label className={LABEL_CLASSES} htmlFor="agenda-dg-title">
              Intitulé
            </label>
            <input
              className={INPUT_CLASSES}
              id="agenda-dg-title"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex : Comité de direction"
              required
              type="text"
              value={title}
            />
          </div>
          <div className="space-y-1">
            <label className={LABEL_CLASSES} htmlFor="agenda-dg-date">
              Date et heure
            </label>
            <input
              className={INPUT_CLASSES}
              id="agenda-dg-date"
              onChange={(event) => setStartsAt(event.target.value)}
              required
              type="datetime-local"
              value={startsAt}
            />
          </div>
          <div className="space-y-1">
            <label className={LABEL_CLASSES} htmlFor="agenda-dg-location">
              Lieu
            </label>
            <input
              className={INPUT_CLASSES}
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
