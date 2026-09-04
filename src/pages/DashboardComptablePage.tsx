import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listProjects, type Project } from '../services/projectService';
import { listProjectPayments, PAYMENT_METHOD_ICONS, type ProjectPayment } from '../services/projectPaymentService';
import { listAllTasks, updateTask, formatTaskDueLabel, type Task } from '../services/taskService';
import { listAllEvents, type ProspectEvent } from '../services/eventService';

// Tableau de bord réel de la Comptabilité (COMPTABLE_GENERAL / ASSISTANT_COMPTABLE) —
// mêmes fondations que les autres dashboards de rôle (Project/Task/Event
// réels), centrées sur le suivi des encaissements (voir FinancePage.tsx).

const CARD_CLASSES = 'bg-white rounded-lg border border-outline-variant';

function toAmount(value: string | null): number {
  if (!value) return 0;
  const amount = Number(value);
  return Number.isNaN(amount) ? 0 : amount;
}

function formatFcfaCompact(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1).replace('.0', '')} M FCFA`;
  if (amount >= 1_000) return `${Math.round(amount / 1_000)} k FCFA`;
  return `${amount.toLocaleString('fr-FR')} FCFA`;
}

function formatFCFA(value: number): string {
  return `${value.toLocaleString('fr-FR')} FCFA`;
}

function isToday(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString();
}

function formatEventTime(startsAt: string): string {
  return new Date(startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function DashboardComptablePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [recentPayments, setRecentPayments] = useState<ProjectPayment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<ProspectEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    Promise.all([listProjects(), listProjectPayments(), listAllTasks(), listAllEvents()])
      .then(([allProjects, allPayments, allTasks, allEvents]) => {
        setProjects(allProjects.filter((p) => p.budget !== null));
        setRecentPayments([...allPayments].sort((a, b) => b.paid_at.localeCompare(a.paid_at)).slice(0, 6));
        setTasks(allTasks.filter((t) => t.assignee === user.id));
        setEvents(allEvents.filter((e) => e.created_by === user.id));
      })
      .finally(() => setIsLoading(false));
  }, [user]);

  const totalBudget = useMemo(() => projects.reduce((sum, p) => sum + toAmount(p.budget), 0), [projects]);
  const totalCollected = useMemo(() => projects.reduce((sum, p) => sum + toAmount(p.collected_amount), 0), [projects]);
  const totalRemaining = Math.max(0, totalBudget - totalCollected);
  const pendingDeposits = useMemo(
    () => projects.filter((p) => p.requires_deposit && !p.deposit_received),
    [projects],
  );

  const KPI_CARDS = [
    { icon: 'account_tree', label: 'Budget total', value: formatFcfaCompact(totalBudget), footer: `${projects.length} projet${projects.length !== 1 ? 's' : ''} avec budget` },
    { icon: 'payments', label: 'Encaissé', value: formatFcfaCompact(totalCollected), footer: `${totalBudget > 0 ? Math.round((totalCollected / totalBudget) * 100) : 0}% du budget total` },
    { icon: 'account_balance_wallet', label: 'Reste à percevoir', value: formatFcfaCompact(totalRemaining), footer: 'Tous projets confondus' },
    { icon: 'schedule', label: 'Acomptes en attente', value: String(pendingDeposits.length), footer: `${formatFcfaCompact(pendingDeposits.reduce((sum, p) => sum + toAmount(p.deposit_amount), 0))} attendus` },
  ];

  const todayEvents = useMemo(
    () => events.filter((e) => isToday(e.starts_at)).sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [events],
  );

  const pendingTasks = useMemo(
    () => tasks.filter((t) => !t.done).sort((a, b) => (a.due_at ?? '').localeCompare(b.due_at ?? '')),
    [tasks],
  );

  async function toggleTask(task: Task) {
    const updated = await updateTask(task.id, { done: !task.done, status: task.done ? 'TODO' : 'DONE' });
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
  }

  if (isLoading) {
    return <p className="font-body-sm text-body-sm text-secondary">Chargement...</p>;
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-3">
      {/* En-tête */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">Comptabilité</h2>
          <p className="text-secondary mt-1 text-sm">Suivi des encaissements — budgets, acomptes et paiements échelonnés.</p>
        </div>
        <button
          className="bg-primary text-white px-3 py-1.5 flex items-center gap-1.5 rounded hover:bg-on-primary-fixed-variant transition-colors text-xs font-semibold"
          onClick={() => navigate('/finance')}
          type="button"
        >
          <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
          Ouvrir Finance
        </button>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
        {KPI_CARDS.map((kpi) => (
          <div className={`${CARD_CLASSES} p-2.5`} key={kpi.label}>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-secondary-container rounded shrink-0">
                <span className="material-symbols-outlined text-[15px] text-primary-container">{kpi.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-secondary text-[9px] font-medium uppercase tracking-wider truncate">{kpi.label}</p>
                <h3 className="font-headline-md text-sm font-bold text-on-surface leading-tight">{kpi.value}</h3>
              </div>
            </div>
            <p className="text-secondary text-[9px] mt-1 truncate">{kpi.footer}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-12 gap-3 items-start">
        {/* Colonne gauche : Acomptes en attente + Derniers encaissements */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-3">
          <div className={`${CARD_CLASSES} flex flex-col`}>
            <div className="p-3.5 border-b border-outline-variant flex justify-between items-center">
              <h4 className="font-headline-md text-sm font-bold text-primary">Acomptes en Attente</h4>
              <span className="text-[10px] font-bold text-error bg-error-container/30 px-2 py-0.5 rounded-full">
                {pendingDeposits.length}
              </span>
            </div>
            <div className="p-3 space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar">
              {pendingDeposits.map((project) => (
                <button
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-lg border border-outline-variant/60 hover:bg-surface-container-low transition-colors text-left"
                  key={project.id}
                  onClick={() => navigate('/finance')}
                  type="button"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-amber-50 text-amber-700">
                    <span className="material-symbols-outlined text-[16px]">payments</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-[13px] font-bold text-on-surface truncate">{project.name}</h5>
                    <p className="text-[11px] text-secondary">{project.client_name}</p>
                  </div>
                  <span className="text-xs font-bold text-amber-700 shrink-0">{formatFCFA(toAmount(project.deposit_amount))}</span>
                </button>
              ))}
              {pendingDeposits.length === 0 && <p className="text-sm text-secondary px-1 py-1">Aucun acompte en attente. 🎉</p>}
            </div>
            <a
              className="p-3 w-full text-center bg-surface-container-high text-primary text-xs font-bold hover:bg-surface-container-highest transition-all border-t border-outline-variant"
              href="/finance/acomptes"
            >
              Voir tous les acomptes
            </a>
          </div>

          <div className={`${CARD_CLASSES} p-4`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-headline-md text-sm font-bold text-primary">Derniers Encaissements</h4>
            </div>
            <div className="space-y-2">
              {recentPayments.map((payment) => (
                <div className="flex items-center gap-2.5 p-2 rounded-lg bg-surface-container-low" key={payment.id}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-700">
                    <span className="material-symbols-outlined text-[16px]">{PAYMENT_METHOD_ICONS[payment.method]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-on-surface truncate">
                      {payment.recorded_by_name ?? '—'}
                      {payment.note && ` · ${payment.note}`}
                    </p>
                    <p className="text-[11px] text-secondary">{formatDateTime(payment.paid_at)}</p>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 shrink-0">{formatFCFA(toAmount(payment.amount))}</span>
                </div>
              ))}
              {recentPayments.length === 0 && <p className="text-sm text-secondary py-1">Aucun encaissement enregistré pour l'instant.</p>}
            </div>
          </div>
        </div>

        {/* Colonne droite : Agenda du jour + Mes tâches */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-3">
          <div className={`${CARD_CLASSES} p-4`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-headline-md text-sm font-bold text-primary">Agenda du Jour</h4>
              <a className="text-xs font-semibold text-primary hover:underline" href="/calendrier-collaboratif">
                Calendrier collaboratif
              </a>
            </div>
            <div className="relative max-h-[240px] overflow-y-auto custom-scrollbar pr-1">
              <div className="absolute left-[38px] top-2 bottom-2 w-px bg-outline-variant" />
              <div className="space-y-2">
                {todayEvents.map((event) => {
                  const isMeeting = event.event_type === 'MEETING';
                  return (
                    <div className="relative flex items-start gap-2.5" key={event.id}>
                      <span className="w-8 shrink-0 text-right text-label-md font-bold text-outline pt-1.5 text-[11px]">
                        {formatEventTime(event.starts_at)}
                      </span>
                      <div
                        className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ring-4 ring-white ${
                          isMeeting ? 'bg-secondary-container text-on-secondary-container' : 'bg-blue-50 text-blue-600'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[13px]">{isMeeting ? 'groups' : 'call'}</span>
                      </div>
                      <div className="flex-1 min-w-0 p-2.5 rounded-lg border bg-surface-container-low border-outline-variant/50">
                        <h5 className="text-[13px] font-bold text-on-surface truncate">{event.title}</h5>
                        {event.location && <p className="text-[11px] text-secondary mt-0.5">{event.location}</p>}
                      </div>
                    </div>
                  );
                })}
                {todayEvents.length === 0 && <p className="text-sm text-secondary py-2">Rien de planifié aujourd'hui.</p>}
              </div>
            </div>
          </div>

          <div className={`${CARD_CLASSES} flex flex-col`}>
            <div className="p-3.5 border-b border-outline-variant flex justify-between items-center">
              <h4 className="font-headline-md text-sm font-bold text-primary">Mes Tâches</h4>
              <span className="text-[10px] font-bold text-primary bg-primary-container/30 px-2 py-0.5 rounded-full">
                {pendingTasks.length} en cours
              </span>
            </div>
            <div className="p-3 space-y-2.5 max-h-[320px] overflow-y-auto custom-scrollbar">
              {pendingTasks.map((task) => (
                <label className="flex items-start gap-2.5 cursor-pointer" key={task.id}>
                  <input
                    checked={task.done}
                    className="mt-0.5 w-4 h-4 text-primary focus:ring-primary rounded-sm border-outline shrink-0"
                    onChange={() => toggleTask(task)}
                    type="checkbox"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-on-surface">{task.label}</p>
                    <p className="text-[11px] text-secondary mt-0.5">{formatTaskDueLabel(task)}</p>
                  </div>
                </label>
              ))}
              {pendingTasks.length === 0 && <p className="text-sm text-secondary py-1">Aucune tâche en attente. 🎉</p>}
            </div>
            <a
              className="p-3 w-full text-center bg-surface-container-high text-primary text-xs font-bold hover:bg-surface-container-highest transition-all border-t border-outline-variant"
              href="/feuilles-de-taches"
            >
              Voir toutes les tâches
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
