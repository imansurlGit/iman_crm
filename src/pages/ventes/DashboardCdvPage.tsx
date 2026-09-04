import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { listContacts, type Contact } from '../../services/contactService';
import { listProjects, type Project } from '../../services/projectService';
import { listAllTasks, updateTask, formatTaskDueLabel, type Task } from '../../services/taskService';
import { listAllEvents, type ProspectEvent } from '../../services/eventService';
import { listDocuments, type Document, type DocumentType } from '../../services/documentService';
import { listDivisionMembers, type CurrentUser } from '../../services/userService';
import { listDivisions } from '../../services/divisionService';
import { listDivisionObjectives, type DivisionObjective } from '../../services/divisionObjectiveService';
import {
  deriveCurrentStep,
  isDossierBlocked,
  isRelanceDue,
  type CommercialStep,
} from '../../utils/commercialWorkflow';

// Tableau de bord réel du CDV (Chef Division Ventes) — reprend l'habillage
// visuel de DashboardCdvTemplatePage.tsx (KPIs pastel, timeline d'agenda à
// icônes, courbe de CA, classement photo de l'équipe) mais entièrement
// branché sur les vraies données (Contact/Project/Task/Event/Document,
// dérivation du parcours via commercialWorkflow.ts, comme l'ancienne version
// de cette page). Deux notions du prototype statique n'existent pas côté
// backend et ont donc été adaptées : pas de "Mix des prestations" (aucun
// montant par prestation) — remplacé par les dossiers à relancer réels ; pas
// de cible mensuelle globale — reprise depuis `DivisionObjective` (Ventes)
// si le DG en a fixé une pour le mois en cours.

type PeriodFilter = 'MONTH' | 'QUARTER' | 'YEAR';

type EventType = 'CALL' | 'MEETING' | 'LIVRAISON';

const EVENT_TYPE_META: Record<EventType, { label: string; icon: string; badge: string; iconBg: string }> = {
  CALL: { label: 'Appel', icon: 'call', badge: 'bg-blue-50 text-blue-700 border-blue-200', iconBg: 'bg-blue-500' },
  MEETING: { label: 'Réunion', icon: 'groups', badge: 'bg-primary/10 text-primary border-primary/20', iconBg: 'bg-primary' },
  LIVRAISON: {
    label: 'Livraison',
    icon: 'local_shipping',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconBg: 'bg-emerald-500',
  },
};

const STEP_GROUPS: { label: string; icon: string; color: string; steps: CommercialStep[] }[] = [
  { label: 'Avant-vente', icon: 'person_search', color: 'bg-red-50 text-primary border-primary/20', steps: ['PRISE_CONTACT', 'QUALIFICATION', 'CADRAGE', 'DEVIS'] },
  { label: 'Acompte & lancement', icon: 'payments', color: 'bg-blue-50 text-blue-700 border-blue-200', steps: ['GAGNE_PERDU', 'ACOMPTE', 'PRODUCTION'] },
  { label: 'Validation & BAT', icon: 'fact_check', color: 'bg-amber-50 text-amber-700 border-amber-200', steps: ['VALIDATION_CLIENT', 'FICHE_BAT', 'EXECUTION'] },
  { label: 'Livraison & clôture', icon: 'local_shipping', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', steps: ['LIVRAISON', 'PAIEMENT_FINAL', 'CLOTURE'] },
];

const DOCUMENT_TYPE_META: Partial<Record<DocumentType, { label: string; icon: string }>> = {
  DEVIS: { label: 'Devis', icon: 'request_quote' },
  FICHE_BAT: { label: 'Fiche BAT', icon: 'fact_check' },
  CONTRAT: { label: 'Contrat', icon: 'description' },
  CONVENTION: { label: 'Convention', icon: 'handshake' },
  VISUEL: { label: 'Visuel', icon: 'image' },
  FACTURE: { label: 'Facture', icon: 'receipt_long' },
};

function isToday(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString();
}

function formatFcfaCompact(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1).replace('.0', '')} M FCFA`;
  if (amount >= 1_000) return `${Math.round(amount / 1_000)} k FCFA`;
  return `${amount.toLocaleString('fr-FR')} FCFA`;
}

function formatM(value: number): string {
  return (value / 1_000_000).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function formatEventTime(startsAt: string): string {
  return new Date(startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function formatShortDate(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function periodStart(period: PeriodFilter): Date {
  const now = new Date();
  if (period === 'MONTH') return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === 'QUARTER') return new Date(now.getFullYear(), now.getMonth() - 2, 1);
  return new Date(now.getFullYear(), 0, 1);
}

function periodLabel(period: PeriodFilter): string {
  const now = new Date();
  if (period === 'MONTH') {
    const label = now.toLocaleDateString('fr-FR', { month: 'long' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  if (period === 'QUARTER') return `Trimestre Q${Math.floor(now.getMonth() / 3) + 1}`;
  return `Année ${now.getFullYear()}`;
}

function currentMonthISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function DashboardCdvPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [period, setPeriod] = useState<PeriodFilter>('MONTH');
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
  const [selectedRepId, setSelectedRepId] = useState<number | null>(null);

  const [team, setTeam] = useState<CurrentUser[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<ProspectEvent[]>([]);
  const [validations, setValidations] = useState<Document[]>([]);
  const [objective, setObjective] = useState<DivisionObjective | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    Promise.all([
      user.division ? listDivisionMembers(user.division) : Promise.resolve([]),
      listContacts('PROSPECT'),
      listContacts('CLIENT'),
      listProjects(),
      listAllTasks(),
      listAllEvents(),
      listDocuments({ validator: user.id }),
    ])
      .then(([members, prospects, clients, allProjects, allTasks, allEvents, allValidations]) => {
        setTeam(members);
        const memberIds = new Set(members.map((m) => m.id));
        setContacts([...prospects, ...clients].filter((c) => c.assigned_to !== null && memberIds.has(c.assigned_to)));
        setProjects(allProjects);
        setTasks(allTasks.filter((t) => t.task_type === 'CONTACT' && t.assignee !== null && memberIds.has(t.assignee)));
        setEvents(allEvents);
        setValidations(allValidations.filter((d) => d.status === 'A_VALIDER'));
      })
      .finally(() => setIsLoading(false));
  }, [user]);

  // Objectif du mois pour la division Ventes — fixé par le DG (DgFinancePage).
  useEffect(() => {
    listDivisions().then((divisionsList) => {
      const ventes = divisionsList.find((d) => d.name === 'Ventes');
      if (!ventes) return;
      listDivisionObjectives(currentMonthISO()).then((objs) => setObjective(objs.find((o) => o.division === ventes.id) ?? null));
    });
  }, []);

  const contactIds = useMemo(() => new Set(contacts.map((c) => c.id)), [contacts]);

  const latestProjectByContact = useMemo(() => {
    const map = new Map<number, Project>();
    for (const project of projects) {
      if (!contactIds.has(project.client)) continue;
      const existing = map.get(project.client);
      if (!existing || project.created_at > existing.created_at) map.set(project.client, project);
    }
    return map;
  }, [projects, contactIds]);

  const dossiers = useMemo(
    () =>
      contacts.map((contact) => {
        const project = latestProjectByContact.get(contact.id) ?? null;
        return {
          contact,
          project,
          step: deriveCurrentStep(contact, project),
          blocked: isDossierBlocked(contact, project),
          relanceDue: isRelanceDue(contact),
        };
      }),
    [contacts, latestProjectByContact],
  );

  const activeDossiers = useMemo(() => dossiers.filter((d) => d.step !== 'CLOTURE'), [dossiers]);
  const dossiersToRelance = useMemo(
    () => activeDossiers.filter((d) => d.relanceDue).sort((a, b) => (a.contact.next_followup_at ?? '').localeCompare(b.contact.next_followup_at ?? '')),
    [activeDossiers],
  );

  const teamProjects = useMemo(() => projects.filter((p) => contactIds.has(p.client)), [projects, contactIds]);
  const wonProjects = teamProjects.filter((p) => p.kind === 'PROJET');
  const openOpportunities = teamProjects.filter((p) => p.kind === 'OPPORTUNITE');
  const caGenere = wonProjects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
  const caGenerePeriode = wonProjects
    .filter((p) => new Date(p.converted_at ?? p.created_at) >= periodStart(period))
    .reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
  const pipelineValue = openOpportunities.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
  const convertedCount = contacts.filter((c) => c.contact_type === 'CLIENT').length;
  const conversionRate = contacts.length > 0 ? Math.round((convertedCount / contacts.length) * 100) : 0;
  const avgDealSize = wonProjects.length > 0 ? caGenere / wonProjects.length : 0;

  const avgCycleDays = useMemo(() => {
    const converted = contacts.filter((c) => c.contact_type === 'CLIENT' && c.converted_at);
    if (converted.length === 0) return null;
    const totalDays = converted.reduce(
      (sum, c) => sum + Math.max(0, (new Date(c.converted_at as string).getTime() - new Date(c.created_at).getTime()) / 86_400_000),
      0,
    );
    return Math.round(totalDays / converted.length);
  }, [contacts]);

  const targetAmount = objective ? Number(objective.amount) : null;
  const targetPct = targetAmount && targetAmount > 0 ? Math.round((caGenerePeriode / targetAmount) * 100) : null;

  const KPI_CARDS = [
    {
      key: 'ca',
      icon: 'payments',
      bg: 'bg-emerald-50/60',
      border: 'border-emerald-100',
      label: `CA Signé (${periodLabel(period)})`,
      value: formatFcfaCompact(caGenerePeriode),
      footerLeft: targetAmount !== null ? `Cible : ${formatFcfaCompact(targetAmount)}` : 'Aucune cible définie',
      footerRight: targetPct !== null ? `${targetPct}%` : '—',
    },
    {
      key: 'pipeline',
      icon: 'account_tree',
      bg: 'bg-blue-50/60',
      border: 'border-blue-100',
      label: 'Pipeline Actif',
      value: formatFcfaCompact(pipelineValue),
      badge: `${openOpportunities.length} opp.`,
      footerLeft: 'Valeur moyenne',
      footerRight: formatFcfaCompact(openOpportunities.length > 0 ? pipelineValue / openOpportunities.length : 0),
    },
    {
      key: 'conversion',
      icon: 'sync_alt',
      bg: 'bg-violet-50/60',
      border: 'border-violet-100',
      label: 'Taux de Transformation',
      value: `${conversionRate}%`,
      footerLeft: `${convertedCount} / ${contacts.length} contacts`,
      footerRight: null,
    },
    {
      key: 'velocity',
      icon: 'speed',
      bg: 'bg-amber-50/60',
      border: 'border-amber-100',
      label: 'Panier Moyen',
      value: formatFcfaCompact(avgDealSize),
      footerLeft: 'Cycle moyen',
      footerRight: avgCycleDays !== null ? `${avgCycleDays} j` : '—',
    },
  ];

  const todayEvents = useMemo(
    () =>
      events
        .filter((e) => contactIds.has(e.contact) && isToday(e.starts_at))
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [events, contactIds],
  );

  const pendingTasks = useMemo(() => tasks.filter((t) => !t.done).sort((a, b) => (a.due_at ?? '').localeCompare(b.due_at ?? '')), [tasks]);

  const commercials = useMemo(() => team.filter((m) => m.role === 'COMMERCIAL'), [team]);
  const performance = useMemo(() => {
    const byMember = commercials.map((member) => {
      const memberDeals = wonProjects.filter((p) => {
        const contact = contacts.find((c) => c.id === p.client);
        return contact?.assigned_to === member.id;
      });
      const revenue = memberDeals.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
      return { member, deals: memberDeals.length, revenue };
    });
    const maxRevenue = Math.max(1, ...byMember.map((m) => m.revenue));
    return byMember
      .map((entry) => ({ ...entry, ratio: Math.round((entry.revenue / maxRevenue) * 100) }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [commercials, wonProjects, contacts]);

  // Trajectoire du CA — 10 derniers mois, projets confirmés de la division.
  const revenueChartData = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 10 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (9 - i), 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, month: d.toLocaleDateString('fr-FR', { month: 'short' }), revenue: 0 };
    });
    for (const p of wonProjects) {
      const d = new Date(p.converted_at ?? p.created_at);
      const bucket = months.find((m) => m.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (bucket) bucket.revenue += Number(p.budget || 0) / 1_000_000;
    }
    return months.map((m, idx) => ({ ...m, current: idx === months.length - 1 }));
  }, [wonProjects]);

  const chartPoints = useMemo(
    () => revenueChartData.map((d, i) => ({ x: 20 + i * 60, y: 190 - Math.min(170, d.revenue * 2.0) })),
    [revenueChartData],
  );
  const linePath = chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath =
    chartPoints.length > 0 ? `${linePath} L ${chartPoints[chartPoints.length - 1].x} 190 L ${chartPoints[0].x} 190 Z` : '';

  async function toggleTask(task: Task) {
    const updated = await updateTask(task.id, { done: !task.done, status: task.done ? 'TODO' : 'DONE' });
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
  }

  if (isLoading) {
    return <p className="font-body-sm text-body-sm text-secondary">Chargement...</p>;
  }

  return (
    <div className="max-w-[1480px] mx-auto space-y-6 pb-16 text-slate-800">
      {/* ==================================================================== */}
      {/* EN-TÊTE                                                              */}
      {/* ==================================================================== */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-headline-md text-2xl font-extrabold text-slate-900 tracking-tight">Tableau de Bord Commercial</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary">CDV · Division Ventes</span>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            Pilotage synthétique du chiffre d'affaires, de la progression de l'équipe et du flux commercial.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {(['MONTH', 'QUARTER', 'YEAR'] as PeriodFilter[]).map((p) => (
              <button
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  period === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
                key={p}
                onClick={() => setPeriod(p)}
                type="button"
              >
                {p === 'MONTH' ? 'Mois' : p === 'QUARTER' ? 'Trimestre' : 'Année'}
              </button>
            ))}
          </div>

          <button
            className="px-3.5 py-2 bg-primary hover:bg-on-primary-fixed-variant text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
            onClick={() => navigate('/opportunites/nouvelle')}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Nouvelle Opportunité
          </button>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* 4 INDICATEURS CLÉS ÉPURÉS                                            */}
      {/* ==================================================================== */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {KPI_CARDS.map((kpi) => (
          <div className={`${kpi.bg} p-3.5 rounded-xl border ${kpi.border} shadow-sm flex flex-col justify-between`} key={kpi.key}>
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium mb-1">
              <span>{kpi.label}</span>
              {kpi.badge && (
                <span className="text-slate-600 font-semibold bg-white/70 px-1.5 py-0.5 rounded-full text-[10px]">{kpi.badge}</span>
              )}
            </div>
            <div className="text-xl font-extrabold text-slate-900 tracking-tight">{kpi.value}</div>
            <div className="mt-2 pt-2 border-t border-white/70 flex items-center justify-between text-[10px] text-slate-500">
              <span>{kpi.footerLeft}</span>
              {kpi.footerRight !== null && <span className="font-bold text-slate-800">{kpi.footerRight}</span>}
            </div>
          </div>
        ))}
      </section>

      {/* ==================================================================== */}
      {/* LIGNE FINE DU PIPELINE                                               */}
      {/* ==================================================================== */}
      <section className="bg-white px-5 py-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-headline-md text-sm font-bold text-slate-900">Pipeline Commercial</h2>
          <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
            {formatFcfaCompact(caGenere + pipelineValue)} au total
          </span>
        </div>
        <div className="relative flex items-start justify-between">
          <div className="absolute left-[4%] right-[4%] top-[18px] h-px bg-slate-200" />
          {STEP_GROUPS.map((group) => {
            const groupDossiers = activeDossiers.filter((d) => group.steps.includes(d.step));
            const groupValue = groupDossiers.reduce((sum, d) => sum + (Number(d.project?.budget) || 0), 0);
            return (
              <div className="relative z-10 flex flex-col items-center text-center gap-1.5 px-1 flex-1" key={group.label}>
                <span className={`w-9 h-9 rounded-full border flex items-center justify-center ${group.color}`}>
                  <span className="material-symbols-outlined text-[19px]">{group.icon}</span>
                </span>
                <span className="text-[11px] font-bold text-slate-800 leading-tight">{group.label}</span>
                <span className="text-[10px] text-slate-400">
                  {groupDossiers.length} dossier{groupDossiers.length !== 1 ? 's' : ''}
                  {groupValue > 0 ? ` · ${formatFcfaCompact(groupValue)}` : ''}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ==================================================================== */}
      {/* PRIORITÉ DU JOUR : AGENDA / TÂCHES / RELANCES + CA / ÉQUIPE / VALIDATIONS */}
      {/* ==================================================================== */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* COLONNE 1 : AGENDA + TÂCHES + RELANCES (5 COLS) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-headline-md text-base font-bold text-slate-900">Agenda & Comités CDV</h2>
                <p className="text-slate-400 text-xs">Aujourd'hui</p>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                {todayEvents.length} événement{todayEvents.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div>
              {todayEvents.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Rien de planifié aujourd'hui pour l'équipe.</p>
              ) : (
                todayEvents.map((event, idx) => {
                  const meta = EVENT_TYPE_META[event.event_type];
                  const isLast = idx === todayEvents.length - 1;
                  return (
                    <div className="relative flex gap-3" key={event.id}>
                      <div className="flex flex-col items-center shrink-0">
                        <span className={`relative w-8 h-8 rounded-full flex items-center justify-center ${meta.iconBg}`}>
                          <span className="material-symbols-outlined text-[16px] text-white">{meta.icon}</span>
                        </span>
                        {!isLast && <span className="w-0.5 flex-1 min-h-[1.75rem] bg-slate-200 my-1" />}
                      </div>
                      <div className={`flex-1 min-w-0 ${isLast ? 'pb-0' : 'pb-4'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900 font-label-md">{formatEventTime(event.starts_at)}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${meta.badge}`}>{meta.label}</span>
                        </div>
                        <h3 className="font-bold text-xs text-slate-800 mt-1 leading-snug">{event.title}</h3>
                        {event.location && (
                          <p className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5 truncate">
                            <span className="material-symbols-outlined text-[13px] text-primary shrink-0">location_on</span>
                            {event.location}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <button
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors text-center"
              onClick={() => navigate('/calendrier-collaboratif')}
              type="button"
            >
              Voir l'agenda complet de l'équipe →
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-headline-md text-base font-bold text-slate-900">Tâches à Faire</h2>
              <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                {pendingTasks.length} en cours
              </span>
            </div>
            <div className="max-h-[280px] overflow-y-auto custom-scrollbar space-y-1">
              {pendingTasks.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Aucune tâche en attente pour l'équipe.</p>
              ) : (
                pendingTasks.map((task) => (
                  <label className="flex items-start gap-2.5 py-2 cursor-pointer" key={task.id}>
                    <input
                      checked={task.done}
                      className="mt-0.5 w-4 h-4 text-primary focus:ring-primary rounded-sm border-slate-300 shrink-0"
                      onChange={() => toggleTask(task)}
                      type="checkbox"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800">{task.label}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap text-[11px] text-slate-400">
                        <span>{task.assignee_name ?? 'Non assignée'}</span>
                        <span>·</span>
                        <span>{formatTaskDueLabel(task)}</span>
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
            <a
              className="block w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors text-center"
              href="/feuilles-de-taches"
            >
              Voir toutes les tâches
            </a>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
            <div>
              <h2 className="font-headline-md text-base font-bold text-slate-900">Dossiers à Relancer</h2>
              <p className="text-slate-400 text-xs mt-0.5">Prospects/clients dont la relance est due</p>
            </div>
            <div className="space-y-1">
              {dossiersToRelance.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Aucune relance en retard. 🎉</p>
              ) : (
                dossiersToRelance.slice(0, 6).map(({ contact }) => (
                  <div className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition-colors" key={contact.id}>
                    <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-[11px] font-bold shrink-0">
                      {getInitials(contact.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{contact.company || contact.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{contact.assigned_to_name ?? 'Non affecté'}</p>
                    </div>
                    {contact.next_followup_at && (
                      <span className="text-[10px] font-bold text-amber-600 shrink-0">{formatShortDate(contact.next_followup_at)}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* COLONNE 2 : CA / ÉQUIPE / VALIDATIONS (7 COLS) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div>
                <h2 className="font-headline-md text-sm font-bold text-slate-900">Trajectoire du Chiffre d'Affaires</h2>
                <p className="text-slate-400 text-[11px]">Projets confirmés, 10 derniers mois</p>
              </div>
            </div>

            <div className="relative w-full h-40">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 600 200">
                <defs>
                  <linearGradient id="cdvAreaGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#680200" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#680200" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <line stroke="#f1f5f9" strokeWidth="1" x1="0" x2="600" y1="40" />
                <line stroke="#f1f5f9" strokeWidth="1" x1="0" x2="600" y1="90" />
                <line stroke="#f1f5f9" strokeWidth="1" x1="0" x2="600" y1="140" />
                <line stroke="#f1f5f9" strokeWidth="1" x1="0" x2="600" y1="190" />
                {areaPath && <path d={areaPath} fill="url(#cdvAreaGrad)" />}
                {linePath && <path d={linePath} fill="none" stroke="#680200" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" />}
                {revenueChartData.map((d, index) => {
                  const point = chartPoints[index];
                  const isCurrent = d.current;
                  const isHovered = hoveredMonth === index;
                  return (
                    <g className="cursor-pointer" key={d.month + index} onMouseEnter={() => setHoveredMonth(index)} onMouseLeave={() => setHoveredMonth(null)}>
                      {isHovered && <line stroke="#cbd5e1" strokeDasharray="2 2" strokeWidth="1" x1={point.x} x2={point.x} y1="0" y2="190" />}
                      <circle
                        className="transition-all duration-200"
                        cx={point.x}
                        cy={point.y}
                        fill={isCurrent ? '#680200' : '#ffffff'}
                        r={isHovered ? 5 : isCurrent ? 4 : 3}
                        stroke="#680200"
                        strokeWidth={isCurrent ? 2.5 : 1.5}
                      />
                      <text className={`text-[10px] font-semibold transition-colors ${isCurrent ? 'fill-primary font-bold' : 'fill-slate-400'}`} textAnchor="middle" x={point.x} y="196">
                        {d.month}
                      </text>
                    </g>
                  );
                })}
              </svg>
              {hoveredMonth !== null && revenueChartData[hoveredMonth] && (
                <div
                  className="absolute top-1 bg-slate-900 text-white px-2.5 py-1.5 rounded-lg text-[11px] shadow-xl pointer-events-none transition-all"
                  style={{ left: `${Math.min(75, Math.max(10, (hoveredMonth / (revenueChartData.length - 1)) * 100))}%` }}
                >
                  <p className="font-bold text-slate-200">{revenueChartData[hoveredMonth].month}</p>
                  <p className="text-emerald-400 font-semibold">
                    {revenueChartData[hoveredMonth].revenue > 0 ? `${formatM(revenueChartData[hoveredMonth].revenue * 1_000_000)} M FCFA` : 'Aucun projet'}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-headline-md text-sm font-bold text-slate-900">Performance de l'Équipe</h2>
                <p className="text-slate-400 text-[11px]">Classement par CA réalisé</p>
              </div>
            </div>

            <div className="space-y-1">
              {performance.length === 0 && <p className="text-xs text-slate-400 text-center py-6">Aucun commercial dans votre division.</p>}
              {performance.map(({ member, deals, revenue, ratio }, idx) => {
                const isSelected = selectedRepId === member.id;
                const rank = idx + 1;
                const rankBadge =
                  rank === 1 ? 'bg-amber-100 text-amber-700' : rank === 2 ? 'bg-slate-200 text-slate-600' : rank === 3 ? 'bg-orange-100 text-orange-700' : 'bg-slate-50 text-slate-400';

                return (
                  <div
                    className={`flex items-center gap-3 p-2 rounded-xl transition-colors cursor-pointer ${isSelected ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
                    key={member.id}
                    onClick={() => {
                      setSelectedRepId(isSelected ? null : member.id);
                      navigate(`/equipe/commerciaux/${member.id}`);
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${rankBadge}`}>{rank}</span>
                    <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-[11px] shrink-0 overflow-hidden">
                      {member.profile_picture ? (
                        <img alt={member.first_name} className="w-full h-full object-cover" src={member.profile_picture} />
                      ) : (
                        getInitials(`${member.first_name} ${member.last_name}`)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {member.first_name} {member.last_name}
                        </span>
                        <span className="text-xs font-extrabold text-slate-900 shrink-0">{formatFcfaCompact(revenue)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${ratio >= 90 ? 'bg-emerald-600' : ratio >= 60 ? 'bg-primary' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, ratio)}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 shrink-0">
                          {deals} deal{deals !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-headline-md text-base font-bold text-slate-900">Centre de Validation</h2>
                  <span className="text-xs font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-full">{validations.length} en attente</span>
                </div>
                <p className="text-slate-400 text-xs mt-0.5">Devis, fiches BAT et contrats soumis par l'équipe, avant diffusion</p>
              </div>
              <button className="text-xs font-semibold text-primary hover:underline" onClick={() => navigate('/centre-validation')} type="button">
                Voir tout →
              </button>
            </div>

            <div className="space-y-2 pt-2">
              {validations.length === 0 && <p className="text-xs text-slate-400 text-center py-6">Aucune validation en attente.</p>}
              {validations.map((val) => {
                const typeMeta = DOCUMENT_TYPE_META[val.document_type] ?? { label: val.document_type_display, icon: 'description' };
                return (
                  <button
                    className="w-full p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-2xs transition-all flex items-center gap-3 text-left"
                    key={val.id}
                    onClick={() => navigate(`/documents/${val.id}`)}
                    type="button"
                  >
                    <span className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[18px] text-primary">{typeMeta.icon}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-xs text-slate-900 leading-snug truncate">{val.label || typeMeta.label}</h3>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-md border shrink-0 bg-amber-50 text-amber-700 border-amber-200">
                          À valider
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {typeMeta.label} · {val.contact_name || val.project_name || '—'} · Soumis par {val.uploaded_by_name ?? '—'} · {formatDateTime(val.uploaded_at)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
