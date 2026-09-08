// Mon Agenda - Direction Générale (DG)
// Contrairement au calendrier collaboratif partagé, le DG reçoit des
// demandes de rendez-vous qu'il doit trancher : Accepter, Décliner ou
// Reporter — c'est ce qui rend ce calendrier "spécial". Branché sur les
// vrais rendez-vous (Event) du contact interne agence — voir
// AdchAgendaDgPage.tsx, qui les propose côté ADCH avec status=PENDING.

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { LABEL_CLASSES } from '../../components/ui/formStyles';
import Modal from '../../components/ui/Modal';
import { getOrCreateAgencyContact, type Contact } from '../../services/contactService';
import { listEvents, createEvent, respondToEvent, type EventType, type ProspectEvent } from '../../services/eventService';

const TYPE_META: Record<EventType, { label: string; icon: string; chipBg: string }> = {
  CALL: { label: 'Appel', icon: 'call', chipBg: 'bg-blue-100 text-blue-700' },
  MEETING: { label: 'Réunion', icon: 'groups', chipBg: 'bg-primary/10 text-primary' },
  LIVRAISON: { label: 'Livraison', icon: 'local_shipping', chipBg: 'bg-teal-100 text-teal-700' },
};

const STATUS_META = {
  PENDING: { label: 'En attente', badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  ACCEPTED: { label: 'Accepté', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  DECLINED: { label: 'Décliné', badge: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-400' },
  POSTPONED: { label: 'Reporté', badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
} as const;

const TODAY = new Date();

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return dateKey(a) === dateKey(b);
}

function getMonthMatrix(reference: Date): Date[][] {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = (firstOfMonth.getDay() + 6) % 7; // lundi = 0
  const gridStart = new Date(year, month, 1 - startWeekday);
  const weeks: Date[][] = [];
  const cursor = new Date(gridStart);
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function monthLabel(date: Date): string {
  const label = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatFullDate(iso: string): string {
  const label = new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function toDateInputValue(iso: string): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function toTimeInputValue(iso: string): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(11, 16);
}

export default function CalendrierDgPage() {
  const [agencyContact, setAgencyContact] = useState<Contact | null>(null);
  const [appointments, setAppointments] = useState<ProspectEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPendingOpen, setIsPendingOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isPostponeMode, setIsPostponeMode] = useState(false);
  const [postponeDate, setPostponeDate] = useState('');
  const [postponeTime, setPostponeTime] = useState('');

  const [isAddTypeMenuOpen, setIsAddTypeMenuOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newType, setNewType] = useState<EventType>('MEETING');
  const [newTitle, setNewTitle] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    setIsLoading(true);
    getOrCreateAgencyContact()
      .then((contact) => {
        setAgencyContact(contact);
        return listEvents(contact.id);
      })
      .then(setAppointments)
      .finally(() => setIsLoading(false));
  }, []);

  const pendingAppointments = useMemo(
    () => appointments.filter((a) => a.status === 'PENDING').sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [appointments],
  );

  // Le mois n'affiche que les rendez-vous déjà tranchés — une demande PENDING
  // n'est pas encore un engagement du DG, elle ne vit que dans le bandeau
  // "Demandes en attente" ci-dessus tant qu'il ne l'a pas acceptée.
  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, ProspectEvent[]>();
    for (const appointment of appointments) {
      if (appointment.status === 'PENDING') continue;
      const key = dateKey(new Date(appointment.starts_at));
      const list = map.get(key) ?? [];
      list.push(appointment);
      map.set(key, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    return map;
  }, [appointments]);

  const weeks = useMemo(() => getMonthMatrix(visibleMonth), [visibleMonth]);
  const selected = appointments.find((a) => a.id === selectedId) ?? null;

  function goToMonth(delta: number) {
    setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  function openDetail(id: number) {
    setSelectedId(id);
    setIsPostponeMode(false);
  }

  function closeModal() {
    setSelectedId(null);
    setIsPostponeMode(false);
  }

  async function handleAccept(id: number) {
    const updated = await respondToEvent(id, 'ACCEPTED');
    setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
    showToast('Rendez-vous accepté.');
    if (selectedId === id) closeModal();
  }

  async function handleDecline(id: number) {
    const updated = await respondToEvent(id, 'DECLINED');
    setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
    showToast('Rendez-vous décliné.');
    if (selectedId === id) closeModal();
  }

  function openPostpone(id: number) {
    const appointment = appointments.find((a) => a.id === id);
    if (!appointment) return;
    setSelectedId(id);
    setPostponeDate(toDateInputValue(appointment.starts_at));
    setPostponeTime(toTimeInputValue(appointment.starts_at));
    setIsPostponeMode(true);
  }

  async function handleConfirmPostpone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !postponeDate || !postponeTime) return;
    const newStartsAt = new Date(`${postponeDate}T${postponeTime}`).toISOString();
    const updated = await respondToEvent(selected.id, 'POSTPONED', newStartsAt);
    setAppointments((prev) => prev.map((a) => (a.id === selected.id ? updated : a)));
    showToast('Rendez-vous reporté.');
    closeModal();
  }

  function openAddModal(type: EventType) {
    setNewType(type);
    setNewTitle('');
    setNewLocation('');
    setNewDate(toDateInputValue(new Date().toISOString()));
    setNewTime('09:00');
    setIsAddTypeMenuOpen(false);
    setIsAddModalOpen(true);
  }

  async function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!agencyContact || !newTitle.trim() || !newDate || !newTime) return;
    const created = await createEvent({
      contact: agencyContact.id,
      event_type: newType,
      title: newTitle.trim(),
      starts_at: new Date(`${newDate}T${newTime}`).toISOString(),
      location: newLocation.trim() || undefined,
      // Créé directement par le DG — déjà confirmé, pas de décision à prendre.
      status: 'ACCEPTED',
    });
    setAppointments((prev) => [...prev, created]);
    showToast('Événement ajouté à votre agenda.');
    setIsAddModalOpen(false);
  }

  if (isLoading) {
    return <p className="text-sm text-slate-400 py-10 text-center">Chargement...</p>;
  }

  return (
    <div className="flex flex-col gap-5 pb-12 max-w-[1480px] mx-auto text-slate-800 animate-fadeIn">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs font-medium border border-slate-700 animate-fadeIn">
          <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
          {toastMessage}
        </div>
      )}

      {/* ==================================================================== */}
      {/* EN-TÊTE                                                              */}
      {/* ==================================================================== */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">event_available</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-headline-md text-xl font-extrabold text-slate-900 tracking-tight">Mon Agenda</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary">
                Direction Générale
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">
              Acceptez, déclinez ou reportez les demandes de rendez-vous adressées à la Direction.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
              isPendingOpen
                ? 'bg-primary text-white shadow-xs'
                : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
            }`}
            onClick={() => setIsPendingOpen((prev) => !prev)}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">notifications</span>
            Validations en attente
            {pendingAppointments.length > 0 && (
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isPendingOpen ? 'bg-white text-primary' : 'bg-amber-600 text-white'
                }`}
              >
                {pendingAppointments.length}
              </span>
            )}
          </button>

          <div className="relative">
            <button
              className="flex items-center gap-1.5 bg-primary hover:bg-on-primary-fixed-variant text-white pl-3 pr-3.5 py-2 rounded-xl text-xs font-bold shadow-xs hover:shadow-md active:scale-95 transition-all"
              onClick={() => setIsAddTypeMenuOpen((prev) => !prev)}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Nouvel événement
              <span className="material-symbols-outlined text-[16px]">{isAddTypeMenuOpen ? 'expand_less' : 'expand_more'}</span>
            </button>

            {isAddTypeMenuOpen && (
              <>
                <button
                  aria-label="Fermer le menu"
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setIsAddTypeMenuOpen(false)}
                  type="button"
                />
                <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-20 p-1.5 space-y-0.5">
                  <p className="px-2.5 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Type d'événement</p>
                  {(Object.keys(TYPE_META) as EventType[]).map((type) => (
                    <button
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                      key={type}
                      onClick={() => openAddModal(type)}
                      type="button"
                    >
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${TYPE_META[type].chipBg}`}>
                        <span className="material-symbols-outlined text-[15px]">{TYPE_META[type].icon}</span>
                      </span>
                      {TYPE_META[type].label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ================================================================== */}
      {/* DEMANDES EN ATTENTE — BANDEAU HORIZONTAL (dépliable)                 */}
      {/* ================================================================== */}
      {isPendingOpen && (
        <section className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs animate-fadeIn">
          <h2 className="font-headline-md text-sm font-bold text-slate-900 mb-3">Demandes en attente</h2>

          {pendingAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
              <span className="material-symbols-outlined text-[28px] text-slate-300">task_alt</span>
              Aucune demande en attente.
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-1">
              {pendingAppointments.map((appointment) => {
                const typeMeta = TYPE_META[appointment.event_type];
                return (
                  <div
                    className="shrink-0 w-[300px] p-3.5 rounded-xl border border-slate-200/80 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer"
                    key={appointment.id}
                    onClick={() => openDetail(appointment.id)}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${typeMeta.chipBg}`}>
                        <span className="material-symbols-outlined text-[16px]">{typeMeta.icon}</span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate">{appointment.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                          Demandé par {appointment.created_by_name ?? '—'}
                        </p>
                        <div className="flex flex-col gap-0.5 mt-1.5 text-[11px] text-slate-500">
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-700 truncate">
                            <span className="material-symbols-outlined text-[13px] shrink-0">schedule</span>
                            {formatFullDate(appointment.starts_at)} · {formatTime(appointment.starts_at)}
                          </span>
                          {appointment.location && (
                            <span className="inline-flex items-center gap-1 truncate">
                              <span className="material-symbols-outlined text-[13px] text-primary shrink-0">location_on</span>
                              {appointment.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors"
                        onClick={() => handleAccept(appointment.id)}
                        title="Accepter"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[14px]">check</span>
                      </button>
                      <button
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 text-[11px] font-bold transition-colors"
                        onClick={() => openPostpone(appointment.id)}
                        title="Reporter"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[14px]">update</span>
                      </button>
                      <button
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 text-[11px] font-bold transition-colors"
                        onClick={() => handleDecline(appointment.id)}
                        title="Décliner"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ================================================================== */}
      {/* CALENDRIER — VUE MOIS                                               */}
      {/* ================================================================== */}
      <section className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="font-headline-md text-sm font-bold text-slate-900 capitalize">{monthLabel(visibleMonth)}</h2>
          <div className="flex items-center gap-2">
            <button
              className="text-[11px] font-bold text-slate-500 hover:text-primary px-2 py-1 rounded-lg hover:bg-slate-50 transition-colors"
              onClick={() => setVisibleMonth(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1))}
              type="button"
            >
              Aujourd'hui
            </button>
            <div className="flex items-center bg-slate-100 rounded-xl p-1">
              <button
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-900 transition-colors"
                onClick={() => goToMonth(-1)}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
              </button>
              <button
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-900 transition-colors"
                onClick={() => goToMonth(1)}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-lg overflow-hidden border border-slate-100">
          {WEEKDAY_LABELS.map((label) => (
            <div className="bg-slate-50 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400" key={label}>
              {label}
            </div>
          ))}

          {weeks.flat().map((day) => {
            const inMonth = day.getMonth() === visibleMonth.getMonth();
            const isToday = isSameDay(day, TODAY);
            const dayAppointments = appointmentsByDay.get(dateKey(day)) ?? [];
            const visible = dayAppointments.slice(0, 4);
            const overflow = dayAppointments.length - visible.length;

            return (
              <div
                className={`relative min-h-[128px] p-2 flex flex-col gap-1.5 transition-colors ${
                  isToday ? 'bg-primary/[0.04]' : inMonth ? 'bg-white' : 'bg-slate-50/50'
                }`}
                key={dateKey(day)}
              >
                {isToday && <span className="absolute inset-x-0 top-0 h-[3px] bg-primary" />}
                <span
                  className={`text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full shrink-0 ${
                    inMonth ? 'text-slate-700' : 'text-slate-300'
                  }`}
                >
                  {day.getDate()}
                </span>

                <div className="flex flex-col gap-1">
                  {visible.map((appointment) => {
                    const statusMeta = STATUS_META[appointment.status];
                    return (
                      <button
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-left text-[10px] font-semibold border truncate transition-transform hover:scale-[1.03] ${statusMeta.badge} ${
                          appointment.status === 'DECLINED' ? 'line-through opacity-60' : ''
                        }`}
                        key={appointment.id}
                        onClick={() => openDetail(appointment.id)}
                        type="button"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusMeta.dot}`} />
                        <span className="truncate">
                          {formatTime(appointment.starts_at)} {appointment.title}
                        </span>
                      </button>
                    );
                  })}
                  {overflow > 0 && (
                    <span className="text-[10px] font-semibold text-slate-400 px-1.5">+{overflow} autre{overflow > 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Légende — PENDING exclu : ces demandes ne vivent que dans le bandeau ci-dessus, jamais dans la grille. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3.5 pt-3 border-t border-slate-100">
          {(Object.entries(STATUS_META) as [keyof typeof STATUS_META, (typeof STATUS_META)[keyof typeof STATUS_META]][])
            .filter(([key]) => key !== 'PENDING')
            .map(([key, meta]) => (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-500" key={key}>
                <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                {meta.label}
              </span>
            ))}
        </div>
      </section>

      {/* ==================================================================== */}
      {/* MODAL : DÉTAIL / DÉCISION SUR UN RENDEZ-VOUS                          */}
      {/* ==================================================================== */}
      <Modal
        footer={
          selected &&
          (isPostponeMode ? (
            <>
              <button
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition-colors"
                onClick={() => setIsPostponeMode(false)}
                type="button"
              >
                Annuler
              </button>
              <button
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-on-primary-fixed-variant transition-colors"
                form="dg-postpone-form"
                type="submit"
              >
                Confirmer le report
              </button>
            </>
          ) : (
            <>
              <button
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition-colors"
                onClick={closeModal}
                type="button"
              >
                Fermer
              </button>
              {selected.status === 'PENDING' && (
                <>
                  <button
                    className="px-4 py-2 rounded-xl border border-rose-300 text-rose-700 text-xs font-bold hover:bg-rose-50 transition-colors"
                    onClick={() => handleDecline(selected.id)}
                    type="button"
                  >
                    Décliner
                  </button>
                  <button
                    className="px-4 py-2 rounded-xl border border-amber-300 text-amber-700 text-xs font-bold hover:bg-amber-50 transition-colors"
                    onClick={() => openPostpone(selected.id)}
                    type="button"
                  >
                    Reporter
                  </button>
                  <button
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors"
                    onClick={() => handleAccept(selected.id)}
                    type="button"
                  >
                    Accepter
                  </button>
                </>
              )}
              {selected.status === 'ACCEPTED' && (
                <button
                  className="px-4 py-2 rounded-xl border border-amber-300 text-amber-700 text-xs font-bold hover:bg-amber-50 transition-colors"
                  onClick={() => openPostpone(selected.id)}
                  type="button"
                >
                  Reporter
                </button>
              )}
            </>
          ))
        }
        isOpen={selected !== null}
        maxWidthClassName="max-w-md"
        onClose={closeModal}
        title={isPostponeMode ? 'Reporter le rendez-vous' : 'Détail de la demande'}
      >
        {selected &&
          (isPostponeMode ? (
            <form className="space-y-3" id="dg-postpone-form" onSubmit={handleConfirmPostpone}>
              <p className="text-xs text-slate-500">
                Nouvelle date proposée pour <span className="font-bold text-slate-800">{selected.title}</span>.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={LABEL_CLASSES} htmlFor="postpone-date">
                    Date
                  </label>
                  <input
                    className="w-full px-3 py-2 bg-white border border-outline-variant rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
                    id="postpone-date"
                    onChange={(e) => setPostponeDate(e.target.value)}
                    required
                    type="date"
                    value={postponeDate}
                  />
                </div>
                <div className="space-y-1">
                  <label className={LABEL_CLASSES} htmlFor="postpone-time">
                    Heure
                  </label>
                  <input
                    className="w-full px-3 py-2 bg-white border border-outline-variant rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
                    id="postpone-time"
                    onChange={(e) => setPostponeTime(e.target.value)}
                    required
                    type="time"
                    value={postponeTime}
                  />
                </div>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${TYPE_META[selected.event_type].chipBg}`}>
                  <span className="material-symbols-outlined text-[20px]">{TYPE_META[selected.event_type].icon}</span>
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">{selected.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Demandé par {selected.created_by_name ?? '—'}</p>
                </div>
                <span className={`ml-auto shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_META[selected.status].badge}`}>
                  {STATUS_META[selected.status].label}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="material-symbols-outlined text-[16px] text-slate-400">schedule</span>
                  {formatFullDate(selected.starts_at)} à {formatTime(selected.starts_at)}
                </div>
                {selected.location && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="material-symbols-outlined text-[16px] text-primary">location_on</span>
                    {selected.location}
                  </div>
                )}
                {selected.status === 'POSTPONED' && selected.original_starts_at && (
                  <div className="flex items-center gap-2 text-slate-400 italic">
                    <span className="material-symbols-outlined text-[16px]">history</span>
                    Initialement prévu le {formatFullDate(selected.original_starts_at)} à {formatTime(selected.original_starts_at)}
                  </div>
                )}
              </div>
            </div>
          ))}
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL : NOUVEL ÉVÉNEMENT                                             */}
      {/* ==================================================================== */}
      <Modal
        footer={
          <>
            <button
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition-colors"
              onClick={() => setIsAddModalOpen(false)}
              type="button"
            >
              Annuler
            </button>
            <button
              className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-on-primary-fixed-variant transition-colors"
              form="dg-add-event-form"
              type="submit"
            >
              Ajouter à l'agenda
            </button>
          </>
        }
        isOpen={isAddModalOpen}
        maxWidthClassName="max-w-md"
        onClose={() => setIsAddModalOpen(false)}
        title={`Nouvel événement — ${TYPE_META[newType].label}`}
      >
        <form className="space-y-3" id="dg-add-event-form" onSubmit={handleCreateSubmit}>
          <div className="space-y-1">
            <label className={LABEL_CLASSES} htmlFor="new-event-title">
              Intitulé *
            </label>
            <input
              className="w-full px-3 py-2 bg-white border border-outline-variant rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
              id="new-event-title"
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Ex : Comité de Direction"
              required
              type="text"
              value={newTitle}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={LABEL_CLASSES} htmlFor="new-event-date">
                Date
              </label>
              <input
                className="w-full px-3 py-2 bg-white border border-outline-variant rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
                id="new-event-date"
                onChange={(e) => setNewDate(e.target.value)}
                required
                type="date"
                value={newDate}
              />
            </div>
            <div className="space-y-1">
              <label className={LABEL_CLASSES} htmlFor="new-event-time">
                Heure
              </label>
              <input
                className="w-full px-3 py-2 bg-white border border-outline-variant rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
                id="new-event-time"
                onChange={(e) => setNewTime(e.target.value)}
                required
                type="time"
                value={newTime}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className={LABEL_CLASSES} htmlFor="new-event-location">
              Lieu
            </label>
            <input
              className="w-full px-3 py-2 bg-white border border-outline-variant rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
              id="new-event-location"
              onChange={(e) => setNewLocation(e.target.value)}
              placeholder="Ex : Salle de Conseil DG"
              type="text"
              value={newLocation}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
