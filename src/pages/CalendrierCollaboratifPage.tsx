import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePartenariatDossiers } from '../context/PartenariatDossiersContext';
import { TYPE_META, addDays, eventCoversDay, formatISODate, isSameDay, parseISODate } from '../data/calendarEvents';
import type { CalendarEvent, EventType } from '../data/calendarEvents';
import { canSeeOwner, isDivisionChief } from '../utils/calendarVisibility';
import { listAllEvents, createEvent, type EventType as ApiEventType } from '../services/eventService';
import { listAllTasks } from '../services/taskService';
import { listContacts, type Contact } from '../services/contactService';
import { listDirectory, listDivisionMembers, type CurrentUser } from '../services/userService';

// Calendrier collaboratif réel : réunions/appels réels (Event) + échéances
// de tâches réelles (Task.due_at), assemblés en CalendarEvent pour réutiliser
// les vues jour/semaine/mois ci-dessous inchangées. La visibilité (qui voit
// l'agenda de qui) est calculée dans utils/calendarVisibility.ts.

type ViewMode = 'JOUR' | 'SEMAINE' | 'MOIS';

const WEEKDAY_LABELS = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];
const GRID_START_HOUR = 7;
const GRID_END_HOUR = 20;
const HOUR_HEIGHT = 56;
const MONTH_MAX_LANES = 3;
const WEEK_ALL_DAY_MAX_LANES = 4;

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function startOfWeek(date: Date): Date {
  const weekday = (date.getDay() + 6) % 7; // lundi = 0
  return addDays(new Date(date.getFullYear(), date.getMonth(), date.getDate()), -weekday);
}

function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

function buildMonthWeeks(year: number, month: number): Date[][] {
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const weeks: Date[][] = [];
  let cursor = startOfWeek(firstOfMonth);
  while (cursor <= lastOfMonth) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(cursor, i)));
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

function eventsOverlapWeek(event: CalendarEvent, weekStart: Date, weekEnd: Date): boolean {
  return parseISODate(event.startDate) <= weekEnd && parseISODate(event.endDate) >= weekStart;
}

interface Placement {
  event: CalendarEvent;
  lane: number;
  startCol: number;
  endCol: number;
}

function assignLanes(events: CalendarEvent[], weekStart: Date): Placement[] {
  const items = events
    .map((event) => ({
      event,
      startCol: Math.max(0, diffDays(parseISODate(event.startDate), weekStart)),
      endCol: Math.min(6, diffDays(parseISODate(event.endDate), weekStart)),
    }))
    .sort((a, b) => {
      if (a.startCol !== b.startCol) return a.startCol - b.startCol;
      return b.endCol - b.startCol - (a.endCol - a.startCol);
    });

  const laneEnds: number[] = [];
  const placements: Placement[] = [];
  for (const item of items) {
    let lane = laneEnds.findIndex((endCol) => endCol < item.startCol);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.endCol);
    } else {
      laneEnds[lane] = item.endCol;
    }
    placements.push({ event: item.event, lane, startCol: item.startCol, endCol: item.endCol });
  }
  return placements;
}

interface TimedLayout {
  event: CalendarEvent;
  top: number;
  height: number;
  column: number;
  columns: number;
}

function layoutTimedEvents(events: CalendarEvent[]): TimedLayout[] {
  const items = events
    .map((event) => {
      const [sh, sm] = (event.startTime ?? '00:00').split(':').map(Number);
      const [eh, em] = (event.endTime ?? event.startTime ?? '00:00').split(':').map(Number);
      const startMin = Math.max(GRID_START_HOUR * 60, sh * 60 + sm);
      const endMin = Math.min(GRID_END_HOUR * 60, Math.max(startMin + 30, eh * 60 + em));
      return { event, startMin, endMin };
    })
    .sort((a, b) => a.startMin - b.startMin);

  const clusters: (typeof items)[] = [];
  let currentCluster: typeof items = [];
  let clusterEnd = -1;
  for (const item of items) {
    if (currentCluster.length === 0 || item.startMin < clusterEnd) {
      currentCluster.push(item);
      clusterEnd = Math.max(clusterEnd, item.endMin);
    } else {
      clusters.push(currentCluster);
      currentCluster = [item];
      clusterEnd = item.endMin;
    }
  }
  if (currentCluster.length > 0) clusters.push(currentCluster);

  const layouts: TimedLayout[] = [];
  for (const cluster of clusters) {
    const colEnds: number[] = [];
    const assigned: { item: (typeof cluster)[number]; column: number }[] = [];
    for (const item of cluster) {
      let column = colEnds.findIndex((end) => end <= item.startMin);
      if (column === -1) {
        column = colEnds.length;
        colEnds.push(item.endMin);
      } else {
        colEnds[column] = item.endMin;
      }
      assigned.push({ item, column });
    }
    const columns = colEnds.length;
    for (const { item, column } of assigned) {
      layouts.push({
        event: item.event,
        top: ((item.startMin - GRID_START_HOUR * 60) / 60) * HOUR_HEIGHT,
        height: Math.max(22, ((item.endMin - item.startMin) / 60) * HOUR_HEIGHT),
        column,
        columns,
      });
    }
  }
  return layouts;
}

function formatDateRange(event: CalendarEvent): string {
  const start = parseISODate(event.startDate);
  const startLabel = capitalize(start.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }));
  if (event.startDate === event.endDate) return startLabel;
  const end = parseISODate(event.endDate);
  const endLabel = capitalize(end.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }));
  return `Du ${startLabel} au ${endLabel}`;
}

function formatTimeRange(event: CalendarEvent): string {
  if (event.allDay) return 'Toute la journée';
  return `${event.startTime} – ${event.endTime}`;
}

interface AllDayRowProps {
  week: Date[];
  events: CalendarEvent[];
  today: Date;
  maxLanes: number;
  showDateNumbers: boolean;
  monthRef?: number;
  onSelectEvent: (id: string) => void;
  onSelectDay?: (date: Date) => void;
}

function AllDayRow({ week, events, today, maxLanes, showDateNumbers, monthRef, onSelectEvent, onSelectDay }: AllDayRowProps) {
  const weekStart = week[0];
  const weekEnd = week[6];
  const weekEvents = events.filter((event) => eventsOverlapWeek(event, weekStart, weekEnd));
  const placements = assignLanes(weekEvents, weekStart);

  return (
    <div className="grid grid-cols-7">
      {week.map((date, dayIndex) => {
        const inCurrentMonth = monthRef === undefined || date.getMonth() === monthRef;
        const isToday = isSameDay(date, today);
        const dayPlacements = placements.filter((p) => p.startCol <= dayIndex && dayIndex <= p.endCol);
        const visible = dayPlacements.filter((p) => p.lane < maxLanes);
        const overflow = dayPlacements.length - visible.length;
        return (
          <div
            className={`p-1.5 min-h-[92px] border-outline-variant ${dayIndex < 6 ? 'border-r' : ''} ${
              inCurrentMonth ? 'bg-surface-container-lowest' : 'bg-surface-container-low/50 opacity-40'
            } ${isToday ? 'ring-2 ring-primary/30 ring-inset' : ''}`}
            key={dayIndex}
          >
            {showDateNumbers && (
              <button
                className={`text-xs font-medium mb-1 ${isToday ? 'font-bold text-primary' : 'text-on-surface'} ${onSelectDay ? 'hover:underline' : ''}`}
                onClick={() => onSelectDay?.(date)}
                type="button"
              >
                {date.getDate()}
              </button>
            )}
            <div className="space-y-0.5">
              {Array.from({ length: maxLanes }, (_, lane) => {
                const placement = visible.find((p) => p.lane === lane);
                if (!placement) return <div className="h-[18px]" key={lane} />;
                const { event, startCol } = placement;
                const trueStart = isSameDay(parseISODate(event.startDate), date);
                const trueEnd = isSameDay(parseISODate(event.endDate), date);
                const isFirstVisibleCol = dayIndex === startCol;
                const meta = TYPE_META[event.type];
                return (
                  <button
                    className={`${meta.badge} w-full h-[18px] px-1.5 text-[10px] font-bold truncate text-left border-l-2 block ${
                      trueStart ? meta.border : 'border-l-transparent'
                    } ${trueStart ? 'rounded-l' : ''} ${trueEnd ? 'rounded-r' : ''}`}
                    key={lane}
                    onClick={() => onSelectEvent(event.id)}
                    title={event.title}
                    type="button"
                  >
                    {isFirstVisibleCol ? (event.allDay ? event.title : `${event.startTime} ${event.title}`) : ' '}
                  </button>
                );
              })}
              {overflow > 0 && (
                <div className="text-[9px] font-bold text-secondary px-1">
                  +{overflow} autre{overflow > 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface MonthViewProps {
  year: number;
  month: number;
  events: CalendarEvent[];
  today: Date;
  onSelectEvent: (id: string) => void;
  onSelectDay: (date: Date) => void;
}

function MonthView({ year, month, events, today, onSelectEvent, onSelectDay }: MonthViewProps) {
  const weeks = useMemo(() => buildMonthWeeks(year, month), [year, month]);
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
      <div className="grid grid-cols-7 border-b border-outline-variant bg-surface-container-low">
        {WEEKDAY_LABELS.map((label) => (
          <div className="py-3 text-center text-[11px] font-bold text-secondary" key={label}>
            {label}
          </div>
        ))}
      </div>
      <div className="divide-y divide-outline-variant">
        {weeks.map((week, index) => (
          <AllDayRow
            events={events}
            key={index}
            maxLanes={MONTH_MAX_LANES}
            monthRef={month}
            onSelectDay={onSelectDay}
            onSelectEvent={onSelectEvent}
            showDateNumbers
            today={today}
            week={week}
          />
        ))}
      </div>
    </div>
  );
}

interface WeekViewProps {
  weekStart: Date;
  events: CalendarEvent[];
  today: Date;
  onSelectEvent: (id: string) => void;
}

function WeekView({ weekStart, events, today, onSelectEvent }: WeekViewProps) {
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const allDayEvents = events.filter((event) => event.allDay || event.startDate !== event.endDate);
  const timedEventsByDay = weekDays.map((date) =>
    events.filter((event) => !event.allDay && event.startDate === event.endDate && isSameDay(parseISODate(event.startDate), date)),
  );
  const hours = Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }, (_, i) => GRID_START_HOUR + i);

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
      <div className="grid border-b border-outline-variant bg-surface-container-low" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
        <div />
        {weekDays.map((date, index) => {
          const isToday = isSameDay(date, today);
          return (
            <div className="py-2 text-center border-l border-outline-variant" key={index}>
              <p className="text-[10px] font-bold text-secondary uppercase">{WEEKDAY_LABELS[index]}</p>
              <p className={`text-sm font-bold ${isToday ? 'text-primary' : 'text-on-surface'}`}>{date.getDate()}</p>
            </div>
          );
        })}
      </div>

      {allDayEvents.length > 0 && (
        <div className="grid border-b border-outline-variant" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
          <div className="flex items-center justify-center text-[9px] font-bold text-secondary uppercase">Jour</div>
          <div className="col-span-7">
            <AllDayRow
              events={allDayEvents}
              maxLanes={WEEK_ALL_DAY_MAX_LANES}
              onSelectEvent={onSelectEvent}
              showDateNumbers={false}
              today={today}
              week={weekDays}
            />
          </div>
        </div>
      )}

      <div className="overflow-y-auto max-h-[600px]">
        <div className="grid" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
          <div>
            {hours.map((hour) => (
              <div className="text-right pr-2 text-[10px] text-secondary -translate-y-2" key={hour} style={{ height: HOUR_HEIGHT }}>
                {String(hour).padStart(2, '0')}:00
              </div>
            ))}
          </div>
          {weekDays.map((_, dayIndex) => {
            const layouts = layoutTimedEvents(timedEventsByDay[dayIndex]);
            return (
              <div className="relative border-l border-outline-variant" key={dayIndex} style={{ height: HOUR_HEIGHT * hours.length }}>
                {hours.map((hour) => (
                  <div className="border-b border-outline-variant/40" key={hour} style={{ height: HOUR_HEIGHT }} />
                ))}
                {layouts.map(({ event, top, height, column, columns }) => {
                  const meta = TYPE_META[event.type];
                  return (
                    <button
                      className={`${meta.badge} absolute rounded px-1.5 py-1 text-left text-[10px] font-bold border-l-2 ${meta.border} overflow-hidden hover:brightness-95 transition-all`}
                      key={event.id}
                      onClick={() => onSelectEvent(event.id)}
                      style={{ top, height, left: `calc(${(column / columns) * 100}% + 2px)`, width: `calc(${100 / columns}% - 4px)` }}
                      type="button"
                    >
                      <span className="block truncate">{event.title}</span>
                      <span className="block font-normal opacity-80">{event.startTime}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface DayViewProps {
  date: Date;
  events: CalendarEvent[];
  onSelectEvent: (id: string) => void;
}

function DayView({ date, events, onSelectEvent }: DayViewProps) {
  const allDayEvents = events.filter((event) => (event.allDay || event.startDate !== event.endDate) && eventCoversDay(event, date));
  const timedEvents = events.filter(
    (event) => !event.allDay && event.startDate === event.endDate && isSameDay(parseISODate(event.startDate), date),
  );
  const layouts = layoutTimedEvents(timedEvents);
  const hours = Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }, (_, i) => GRID_START_HOUR + i);

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
      {allDayEvents.length > 0 && (
        <div className="p-3 border-b border-outline-variant space-y-1.5">
          {allDayEvents.map((event) => {
            const meta = TYPE_META[event.type];
            return (
              <button
                className={`${meta.badge} w-full text-left px-2.5 py-1.5 rounded text-xs font-bold border-l-2 ${meta.border} flex items-center gap-2`}
                key={event.id}
                onClick={() => onSelectEvent(event.id)}
                type="button"
              >
                <span className="material-symbols-outlined text-[14px]">{meta.icon}</span>
                {event.title}
              </button>
            );
          })}
        </div>
      )}
      <div className="overflow-y-auto max-h-[640px]">
        <div className="grid" style={{ gridTemplateColumns: '56px 1fr' }}>
          <div>
            {hours.map((hour) => (
              <div className="text-right pr-2 text-[10px] text-secondary -translate-y-2" key={hour} style={{ height: HOUR_HEIGHT }}>
                {String(hour).padStart(2, '0')}:00
              </div>
            ))}
          </div>
          <div className="relative border-l border-outline-variant" style={{ height: HOUR_HEIGHT * hours.length }}>
            {hours.map((hour) => (
              <div className="border-b border-outline-variant/40" key={hour} style={{ height: HOUR_HEIGHT }} />
            ))}
            {layouts.map(({ event, top, height, column, columns }) => {
              const meta = TYPE_META[event.type];
              return (
                <button
                  className={`${meta.badge} absolute rounded px-2 py-1.5 text-left text-xs font-bold border-l-2 ${meta.border} overflow-hidden hover:brightness-95 transition-all`}
                  key={event.id}
                  onClick={() => onSelectEvent(event.id)}
                  style={{ top, height, left: `calc(${(column / columns) * 100}% + 2px)`, width: `calc(${100 / columns}% - 4px)` }}
                  type="button"
                >
                  <span className="block truncate">{event.title}</span>
                  <span className="block font-normal opacity-80">
                    {event.startTime} – {event.endTime}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function EventDetailModal({ event, onClose }: { event: CalendarEvent; onClose: () => void }) {
  const meta = TYPE_META[event.type];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white border border-outline-variant rounded-xl p-5 shadow-lg w-full max-w-md"
        onClick={(domEvent) => domEvent.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`${meta.badge} w-9 h-9 rounded-lg flex items-center justify-center shrink-0`}>
              <span className="material-symbols-outlined text-[18px]">{meta.icon}</span>
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-secondary">{meta.label}</p>
              <h4 className="text-sm font-bold text-on-surface leading-snug">{event.title}</h4>
            </div>
          </div>
          <button className="text-secondary hover:text-on-surface shrink-0" onClick={onClose} type="button">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px] text-secondary shrink-0">event</span>
            {formatDateRange(event)}
          </div>
          <div className="flex items-center gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px] text-secondary shrink-0">schedule</span>
            {formatTimeRange(event)}
          </div>
          <div className="flex items-center gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px] text-secondary shrink-0">person</span>
            {event.ownerName}
          </div>
          {event.location && (
            <div className="flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px] text-secondary shrink-0">location_on</span>
              {event.location}
            </div>
          )}
          {event.linkedTo && (
            <div className="flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px] text-secondary shrink-0">link</span>
              {event.linkedTo}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const INPUT_CLASSES =
  'w-full px-3 py-2 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container outline-none';
const LABEL_CLASSES = 'font-label-md text-label-md text-on-surface-variant uppercase tracking-wide';

// Seuls Réunion et Appel sont créables ici : la Livraison est un troisième
// type réellement persisté (Event.event_type LIVRAISON) mais uniquement créé
// depuis la confirmation de livraison d'un projet (DossierClientDetailPage).
// Les échéances viennent des tâches (Task.due_at) et se créent depuis les
// pages de tâches.
const CREATABLE_TYPE_TO_API: Partial<Record<EventType, ApiEventType>> = { REUNION: 'MEETING', RELANCE: 'CALL' };

const API_EVENT_TYPE_TO_CALENDAR_TYPE: Record<ApiEventType, EventType> = {
  CALL: 'RELANCE',
  MEETING: 'REUNION',
  LIVRAISON: 'LIVRAISON',
};

interface AddEventModalProps {
  type: EventType;
  contacts: Contact[];
  ownerName: string;
  onClose: () => void;
  onCreated: () => void;
}

function AddEventModal({ type, contacts, ownerName, onClose, onCreated }: AddEventModalProps) {
  const meta = TYPE_META[type];
  const todayISO = formatISODate(new Date());
  const [title, setTitle] = useState('');
  const [contactId, setContactId] = useState('');
  const [startDate, setStartDate] = useState(todayISO);
  const [startTime, setStartTime] = useState('09:00');
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (!title.trim() || !startDate || !contactId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await createEvent({
        contact: Number(contactId),
        event_type: CREATABLE_TYPE_TO_API[type] ?? 'MEETING',
        title: title.trim(),
        starts_at: new Date(`${startDate}T${startTime}`).toISOString(),
        location: location.trim() || undefined,
      });
      onCreated();
    } catch {
      setError("Impossible d'ajouter cet événement. Vérifiez les champs et réessayez.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose} role="presentation">
      <form
        className="bg-white border border-outline-variant rounded-xl p-5 shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(domEvent) => domEvent.stopPropagation()}
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`${meta.badge} w-9 h-9 rounded-lg flex items-center justify-center shrink-0`}>
              <span className="material-symbols-outlined text-[18px]">{meta.icon}</span>
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-secondary">{meta.label}</p>
              <h4 className="text-sm font-bold text-on-surface">Nouvel événement</h4>
            </div>
          </div>
          <button className="text-secondary hover:text-on-surface shrink-0" onClick={onClose} type="button">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="space-y-1">
            <label className={LABEL_CLASSES} htmlFor="event-title">
              Titre
            </label>
            <input
              autoFocus
              className={INPUT_CLASSES}
              id="event-title"
              onChange={(changeEvent) => setTitle(changeEvent.target.value)}
              placeholder={type === 'RELANCE' ? 'Ex : Relancer M. Idrissa (devis)' : 'Ex : Réunion de lancement'}
              type="text"
              value={title}
            />
          </div>

          <div className="space-y-1">
            <label className={LABEL_CLASSES} htmlFor="event-contact">
              Contact concerné
            </label>
            <select
              className={`${INPUT_CLASSES} appearance-none`}
              id="event-contact"
              onChange={(changeEvent) => setContactId(changeEvent.target.value)}
              value={contactId}
            >
              <option value="">Choisir un contact...</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.company || contact.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={LABEL_CLASSES} htmlFor="event-start-date">
                Date
              </label>
              <input
                className={INPUT_CLASSES}
                id="event-start-date"
                onChange={(changeEvent) => setStartDate(changeEvent.target.value)}
                type="date"
                value={startDate}
              />
            </div>
            <div className="space-y-1">
              <label className={LABEL_CLASSES} htmlFor="event-start-time">
                Heure
              </label>
              <input
                className={INPUT_CLASSES}
                id="event-start-time"
                onChange={(changeEvent) => setStartTime(changeEvent.target.value)}
                type="time"
                value={startTime}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className={LABEL_CLASSES} htmlFor="event-owner">
              Personne
            </label>
            <input className={`${INPUT_CLASSES} bg-surface-container-low`} disabled id="event-owner" type="text" value={ownerName} />
          </div>

          <div className="space-y-1">
            <label className={LABEL_CLASSES} htmlFor="event-location">
              Lieu <span className="normal-case font-normal text-secondary">(optionnel)</span>
            </label>
            <input
              className={INPUT_CLASSES}
              id="event-location"
              onChange={(changeEvent) => setLocation(changeEvent.target.value)}
              type="text"
              value={location}
            />
          </div>

          {error && <p className="text-xs text-error font-medium">{error}</p>}

          <button
            className="w-full flex items-center justify-center gap-1.5 bg-primary text-white py-2.5 rounded-full text-sm font-bold shadow-sm hover:shadow-md hover:bg-on-primary-fixed-variant active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none mt-1"
            disabled={!title.trim() || !startDate || !contactId || isSubmitting}
            type="submit"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            {isSubmitting ? 'Ajout...' : 'Ajouter au calendrier'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CalendrierCollaboratifPage() {
  const { user } = useAuth();
  const { dossiers } = usePartenariatDossiers();
  const today = useMemo(() => new Date(), []);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('MOIS');
  const [currentDate, setCurrentDate] = useState<Date>(today);
  const [personFilter, setPersonFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<EventType | ''>('');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [addType, setAddType] = useState<EventType | null>(null);

  const currentUserName = user ? `${user.first_name} ${user.last_name}`.trim() : '';

  function loadEvents() {
    if (!user) return;
    setIsLoading(true);
    const chief = isDivisionChief(user.role);
    Promise.all([
      listAllEvents(),
      listAllTasks(),
      listDirectory(),
      chief && user.division ? listDivisionMembers(user.division) : Promise.resolve<CurrentUser[]>([]),
      listContacts('PROSPECT'),
      listContacts('CLIENT'),
      listContacts('PARTENAIRE'),
      listContacts('INTERNE'),
    ])
      .then(([apiEvents, apiTasks, directory, teamMembers, prospects, clients, partenaires, internes]) => {
        const allContacts = [...prospects, ...clients, ...partenaires, ...internes];
        setContacts(allContacts);
        const contactNameById = new Map(allContacts.map((c) => [c.id, c.company || c.name]));
        const nameById = new Map(directory.map((d) => [d.id, `${d.first_name} ${d.last_name}`.trim() || d.email]));
        const teamMemberIds = chief ? new Set(teamMembers.map((m) => m.id)) : null;

        const fromEvents: CalendarEvent[] = apiEvents
          .filter((e) => e.created_by !== null)
          .map((e) => {
            const start = new Date(e.starts_at);
            const end = new Date(start.getTime() + 60 * 60 * 1000);
            const day = formatISODate(start);
            return {
              id: `event-${e.id}`,
              title: e.title,
              type: API_EVENT_TYPE_TO_CALENDAR_TYPE[e.event_type],
              startDate: day,
              endDate: day,
              allDay: false,
              startTime: start.toTimeString().slice(0, 5),
              endTime: end.toTimeString().slice(0, 5),
              ownerId: e.created_by as number,
              ownerName: nameById.get(e.created_by as number) ?? '—',
              location: e.location || undefined,
              linkedTo: contactNameById.get(e.contact),
            };
          });

        const fromTasks: CalendarEvent[] = apiTasks
          .filter((t) => t.due_at && !t.done && t.assignee !== null)
          .map((t) => {
            const due = new Date(t.due_at as string);
            const day = formatISODate(due);
            const time = due.toTimeString().slice(0, 5);
            return {
              id: `task-${t.id}`,
              title: t.label,
              type: 'DEADLINE',
              startDate: day,
              endDate: day,
              allDay: false,
              startTime: time,
              endTime: time,
              ownerId: t.assignee as number,
              ownerName: t.assignee_name ?? '—',
              linkedTo: t.contact ? contactNameById.get(t.contact) : undefined,
            };
          });

        // Relance d'un contact (Contact.next_followup_at) — posée
        // automatiquement à la création d'un prospect (+72h) ou reprogrammée
        // depuis sa fiche (ProspectDetailPage/DossierClientDetailPage).
        // Jusqu'ici uniquement visible sur la fiche contact et les
        // dashboards ; absente du calendrier collaboratif faute d'être
        // convertie en CalendarEvent — corrigé ici.
        const fromRelances: CalendarEvent[] = allContacts
          .filter((c) => c.next_followup_at && c.assigned_to !== null)
          .map((c) => {
            const due = new Date(c.next_followup_at as string);
            const day = formatISODate(due);
            const time = due.toTimeString().slice(0, 5);
            return {
              id: `relance-${c.id}`,
              title: `Relancer ${c.company || c.name}`,
              type: 'RELANCE',
              startDate: day,
              endDate: day,
              allDay: false,
              startTime: time,
              endTime: time,
              ownerId: c.assigned_to as number,
              ownerName: c.assigned_to_name ?? '—',
              linkedTo: c.company || c.name,
            };
          });

        // Un événement partenariat concerne toute l'agence : il s'affiche sur
        // tous les agendas, sans passer par la visibilité par équipe.
        const fromPartnerships: CalendarEvent[] = dossiers
          .filter((d) => d.evenement_debut && d.evenement_fin)
          .map((d) => ({
            id: `partnership-${d.id}`,
            title: d.evenement,
            type: 'EVENEMENT',
            startDate: d.evenement_debut as string,
            endDate: d.evenement_fin as string,
            allDay: true,
            ownerId: d.created_by ?? 0,
            ownerName: d.partenaire_name,
            linkedTo: d.partenaire_name,
          }));

        setEvents([
          ...[...fromEvents, ...fromTasks, ...fromRelances].filter((item) =>
            canSeeOwner(item.ownerId, user.id, user.role, teamMemberIds),
          ),
          ...fromPartnerships,
        ]);
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(loadEvents, [user, dossiers]); // eslint-disable-line react-hooks/exhaustive-deps

  const peopleOptions = useMemo(
    () => Array.from(new Set(events.map((event) => event.ownerName))).sort((a, b) => a.localeCompare(b, 'fr')),
    [events],
  );

  const filteredEvents = useMemo(
    () => events.filter((event) => (!personFilter || event.ownerName === personFilter) && (!typeFilter || event.type === typeFilter)),
    [events, personFilter, typeFilter],
  );

  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null;
  const hasFilters = personFilter !== '' || typeFilter !== '';

  function goPrev() {
    setCurrentDate((prev) => {
      if (viewMode === 'MOIS') return new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      if (viewMode === 'SEMAINE') return addDays(prev, -7);
      return addDays(prev, -1);
    });
  }

  function goNext() {
    setCurrentDate((prev) => {
      if (viewMode === 'MOIS') return new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      if (viewMode === 'SEMAINE') return addDays(prev, 7);
      return addDays(prev, 1);
    });
  }

  function openDay(date: Date) {
    setCurrentDate(date);
    setViewMode('JOUR');
  }

  function resetFilters() {
    setPersonFilter('');
    setTypeFilter('');
  }

  const rangeLabel = useMemo(() => {
    if (viewMode === 'MOIS') return capitalize(currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));
    if (viewMode === 'SEMAINE') {
      const start = startOfWeek(currentDate);
      const end = addDays(start, 6);
      const startLabel = start.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
      const endLabel = end.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
      return `${startLabel} – ${endLabel}`;
    }
    return capitalize(currentDate.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }));
  }, [viewMode, currentDate]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">Calendrier collaboratif</h2>
          <div className="flex items-center gap-1 mt-1">
            <button className="p-0.5 text-secondary hover:text-on-surface rounded transition-colors" onClick={goPrev} type="button">
              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            </button>
            <p className="text-secondary text-sm">{rangeLabel}</p>
            <button className="p-0.5 text-secondary hover:text-on-surface rounded transition-colors" onClick={goNext} type="button">
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-white border border-outline-variant rounded-lg p-1">
            {(['JOUR', 'SEMAINE', 'MOIS'] as ViewMode[]).map((mode) => (
              <button
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                  viewMode === mode ? 'bg-primary text-white' : 'hover:bg-surface-container'
                }`}
                key={mode}
                onClick={() => setViewMode(mode)}
                type="button"
              >
                {mode === 'JOUR' ? 'Jour' : mode === 'SEMAINE' ? 'Semaine' : 'Mois'}
              </button>
            ))}
          </div>
          <div className="relative">
            <button
              className="flex items-center gap-1.5 bg-primary text-white pl-3 pr-3.5 py-2 rounded-full text-xs font-bold shadow-sm hover:shadow-md hover:bg-on-primary-fixed-variant active:scale-95 transition-all"
              onClick={() => setShowTypeMenu((prev) => !prev)}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Nouvel événement
              <span className="material-symbols-outlined text-[16px]">{showTypeMenu ? 'expand_less' : 'expand_more'}</span>
            </button>
            {showTypeMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowTypeMenu(false)} />
                <div className="absolute right-0 top-full mt-2 z-50 w-60 bg-white border border-outline-variant rounded-lg shadow-lg p-1.5">
                  <p className="px-2.5 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-secondary">Type d'événement</p>
                  {(['REUNION', 'RELANCE'] as EventType[]).map((type) => (
                    <button
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left text-xs font-semibold text-on-surface hover:bg-surface-container-low transition-colors"
                      key={type}
                      onClick={() => {
                        setAddType(type);
                        setShowTypeMenu(false);
                      }}
                      type="button"
                    >
                      <span className={`${TYPE_META[type].badge} w-6 h-6 rounded flex items-center justify-center shrink-0`}>
                        <span className="material-symbols-outlined text-[14px]">{TYPE_META[type].icon}</span>
                      </span>
                      {TYPE_META[type].label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-white border border-outline-variant rounded-lg p-3">
        <div className="relative">
          <select
            className="bg-surface-container border border-outline-variant rounded py-1.5 pl-3 pr-8 text-xs font-semibold appearance-none focus:outline-none focus:border-primary-container transition-all"
            onChange={(event) => setPersonFilter(event.target.value)}
            value={personFilter}
          >
            <option value="">Toute personne</option>
            {peopleOptions.map((person) => (
              <option key={person} value={person}>
                {person}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline text-sm pointer-events-none">
            expand_more
          </span>
        </div>
        <div className="h-5 w-px bg-outline-variant hidden sm:block" />
        <div className="flex flex-wrap gap-1.5">
          <button
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
              typeFilter === '' ? 'bg-primary text-white border-primary' : 'border-outline-variant text-secondary hover:bg-surface-container-high'
            }`}
            onClick={() => setTypeFilter('')}
            type="button"
          >
            Tous types
          </button>
          {(Object.keys(TYPE_META) as EventType[]).map((type) => (
            <button
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                typeFilter === type ? 'bg-primary text-white border-primary' : 'border-outline-variant text-secondary hover:bg-surface-container-high'
              }`}
              key={type}
              onClick={() => setTypeFilter(type)}
              type="button"
            >
              {TYPE_META[type].label}
            </button>
          ))}
        </div>
        {hasFilters && (
          <button className="ml-auto text-[11px] font-bold text-primary hover:underline" onClick={resetFilters} type="button">
            Réinitialiser
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-secondary py-10 text-center">Chargement...</p>
      ) : (
        <>
          {viewMode === 'MOIS' && (
            <MonthView
              events={filteredEvents}
              month={currentDate.getMonth()}
              onSelectDay={openDay}
              onSelectEvent={setSelectedEventId}
              today={today}
              year={currentDate.getFullYear()}
            />
          )}
          {viewMode === 'SEMAINE' && (
            <WeekView events={filteredEvents} onSelectEvent={setSelectedEventId} today={today} weekStart={startOfWeek(currentDate)} />
          )}
          {viewMode === 'JOUR' && <DayView date={currentDate} events={filteredEvents} onSelectEvent={setSelectedEventId} />}
        </>
      )}

      {selectedEvent && <EventDetailModal event={selectedEvent} onClose={() => setSelectedEventId(null)} />}
      {addType && (
        <AddEventModal
          contacts={contacts}
          onClose={() => setAddType(null)}
          onCreated={() => {
            setAddType(null);
            loadEvents();
          }}
          ownerName={currentUserName}
          type={addType}
        />
      )}

      <div className="flex flex-wrap gap-4 pt-4 border-t border-outline-variant">
        {(Object.keys(TYPE_META) as EventType[]).map((type) => {
          const meta = TYPE_META[type];
          return (
            <div className="flex items-center gap-2" key={type}>
              <span className={`w-3 h-3 rounded-full ${meta.dot}`} />
              <span className="text-[11px] font-bold text-secondary uppercase">{meta.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
