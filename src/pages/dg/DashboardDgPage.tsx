import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getOrCreateAgencyContact, getContact } from '../../services/contactService';
import { listTasks, updateTask, formatTaskDueLabel, type Task, type TaskPriority } from '../../services/taskService';
import { listDocuments, reviewDocument, type Document } from '../../services/documentService';
import { listAllEvents, type ProspectEvent, type EventType } from '../../services/eventService';
import { listProjects, type Project } from '../../services/projectService';

// ============================================================================
// DASHBOARD DIRECTION GÉNÉRALE (DG) — COCKPIT STRATÉGIQUE & EXÉCUTIF
// Branché sur les vraies données pour : KPIs (Project), Agenda (Event),
// Tâches du Jour (Task, contact agence), Centre de Validation (Document).
//
// "Performance par Division" et "Pipeline Commercial en Entonnoir" restent
// illustratifs : aucun champ monétaire n'existe côté backend au niveau
// Prestation/Contact.stage pour dériver un CA réel par division ou par étape
// (Prestation n'a pas de montant propre, Contact n'a pas de valeur estimée).
// Nécessiterait un endpoint d'agrégation dédié — pas juste un branchement.
// ============================================================================

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

const DOCUMENT_TYPE_ICONS: Record<string, string> = {
  CONTRAT: 'description',
  CONVENTION: 'handshake',
  DEVIS: 'request_quote',
  FACTURE: 'receipt_long',
  BRIEF: 'assignment',
  FICHE_BAT: 'fact_check',
  VISUEL: 'image',
  PRESENTATION: 'slideshow',
  LIVRABLE_FINAL: 'inventory_2',
  JUSTIFICATIF: 'task',
  RAPPORT: 'summarize',
};

const DOCUMENT_STATUS_META: Record<string, { label: string; badge: string }> = {
  A_VALIDER: { label: 'À valider', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  MODIFICATIONS_DEMANDEES: { label: 'Modifications demandées', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
  VALIDE: { label: 'Validé', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  REJETE: { label: 'Rejeté', badge: 'bg-red-50 text-red-700 border-red-200' },
  PIECE_JOINTE: { label: 'Pièce jointe', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const PRIORITY_META: Record<TaskPriority, { label: string; badge: string }> = {
  HIGH: { label: 'Urgent', badge: 'bg-red-50 text-red-700 border-red-200' },
  MEDIUM: { label: 'Moyen', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  LOW: { label: 'Faible', badge: 'bg-slate-100 text-slate-500 border-slate-200' },
};

const LATE_EXEMPT_STATUSES = ['LIVRE', 'CLOTURE', 'PERDUE'];

function isLateProject(project: Project): boolean {
  return !!project.deadline && new Date(project.deadline) < new Date() && !LATE_EXEMPT_STATUSES.includes(project.status);
}

function formatM(value: number): string {
  return value.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function formatEventTime(value: string): string {
  return new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

interface AgendaItem {
  event: ProspectEvent;
  contactLabel: string;
}

export default function DashboardDgPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [selectedDivisionId, setSelectedDivisionId] = useState<number | null>(null);
  const [activeFunnelIndex, setActiveFunnelIndex] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [validations, setValidations] = useState<Document[]>([]);
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);

    Promise.all([
      getOrCreateAgencyContact(),
      listDocuments({ validator: user.id }),
      listAllEvents(),
      listProjects({ kind: 'PROJET' }),
      listProjects({ kind: 'OPPORTUNITE' }),
    ]).then(async ([agencyContact, docs, events, projetsList, opportunitesList]) => {
      const agencyTasks = await listTasks(agencyContact.id);
      setTasks(agencyTasks.filter((t) => t.assignee === user.id));
      setValidations(docs.filter((d) => d.status === 'A_VALIDER').slice(0, 6));
      setProjects([...projetsList, ...opportunitesList]);

      const upcoming = events
        .filter((e) => new Date(e.starts_at).getTime() >= Date.now())
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
        .slice(0, 4);
      const uniqueContactIds = Array.from(new Set(upcoming.map((e) => e.contact)));
      const contactEntries = await Promise.all(
        uniqueContactIds.map((id) => getContact(id).catch(() => null)),
      );
      const contactMap = new Map(
        contactEntries.filter((c): c is NonNullable<typeof c> => c !== null).map((c) => [c.id, c.name]),
      );
      setAgendaItems(upcoming.map((event) => ({ event, contactLabel: contactMap.get(event.contact) ?? '—' })));

      setIsLoading(false);
    });
  }, [user]);

  async function toggleTask(task: Task) {
    const done = !task.done;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done } : t)));
    await updateTask(task.id, { done, status: done ? 'DONE' : 'TODO' });
  }

  async function handleQuickValidate(id: number, e: MouseEvent) {
    e.stopPropagation();
    const updated = await reviewDocument(id, 'VALIDE', '');
    setValidations((prev) => prev.map((v) => (v.id === id ? updated : v)));
    showToast('Document validé avec succès par la Direction Générale.');
  }

  const kpis = useMemo(() => {
    const projetsList = projects.filter((p) => p.kind === 'PROJET');
    const opportunitesList = projects.filter((p) => p.kind === 'OPPORTUNITE');

    const caGlobal = projetsList.reduce((sum, p) => sum + (p.budget ? Number(p.budget) : 0), 0);
    const totalEncaisse = projetsList.reduce((sum, p) => sum + Number(p.collected_amount || 0), 0);
    const projetsActifs = projetsList.filter((p) => !['LIVRE', 'CLOTURE', 'PERDUE'].includes(p.status)).length;
    const projetsEnRetard = projetsList.filter(isLateProject).length;
    const opportunitesGagnees = opportunitesList.filter((p) => p.budget !== null).length;
    const tauxTransformation = opportunitesList.length > 0 ? (opportunitesGagnees / opportunitesList.length) * 100 : 0;

    return {
      caGlobal,
      totalEncaisse,
      projetsActifs,
      projetsEnRetard,
      opportunitesCount: opportunitesList.length,
      tauxTransformation,
    };
  }, [projects]);

  // --------------------------------------------------------------------------
  // DONNÉES ILLUSTRATIVES — Performance des 5 Divisions
  // (voir commentaire d'en-tête : pas de CA par division côté backend)
  // --------------------------------------------------------------------------
  const divisions = [
    {
      id: 1,
      name: 'Ventes',
      code: 'CDV',
      chef: 'Aïcha Moussa',
      role: 'Chef Division Ventes',
      avatarBg: 'bg-primary text-white',
      photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      revenue: 54.8,
      target: 60.0,
      deals: 28,
      onTimeRate: 98,
      progress: 91.3,
      budgetShare: 37.3,
      highlight: 'Contrat Ministère du Plan (45M) & Airtel (12M)',
    },
    {
      id: 2,
      name: 'Marketing',
      code: 'CDM',
      chef: 'Ibrahim Touré',
      role: 'Chef Division Marketing',
      avatarBg: 'bg-stone-800 text-white',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      revenue: 38.2,
      target: 45.0,
      deals: 14,
      onTimeRate: 92,
      progress: 84.9,
      budgetShare: 26.0,
      highlight: 'Campagnes Agro Niger Export & Lancement Zinder',
    },
    {
      id: 3,
      name: 'Visibilité, Infra & Prod.',
      code: 'VIP',
      chef: 'Moussa Idi',
      role: 'Chef Division VIP',
      avatarBg: 'bg-stone-700 text-white',
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      revenue: 31.6,
      target: 35.0,
      deals: 11,
      onTimeRate: 94,
      progress: 90.3,
      budgetShare: 21.5,
      highlight: 'Scénographie Forum Sahel & Habillage Niamey',
    },
    {
      id: 4,
      name: 'Numérique',
      code: 'CDN',
      chef: 'Sarah Hassane',
      role: 'Chef Division Numérique',
      avatarBg: 'bg-stone-600 text-white',
      photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
      revenue: 22.4,
      target: 25.0,
      deals: 9,
      onTimeRate: 96,
      progress: 89.6,
      budgetShare: 15.2,
      highlight: 'Portail Web Ministère Santé & App Logistique',
    },
    {
      id: 5,
      name: 'Comptabilité',
      code: 'CG',
      chef: 'Fatouma Boubacar',
      role: 'Comptable Générale',
      avatarBg: 'bg-slate-700 text-white',
      photoUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&auto=format&fit=crop&q=80',
      revenue: 18.4,
      target: 20.0,
      deals: 6,
      onTimeRate: 99,
      progress: 92.0,
      budgetShare: 12.5,
      highlight: 'Recouvrement créances Q2 & Clôture semestrielle',
    },
  ];

  // --------------------------------------------------------------------------
  // DONNÉES ILLUSTRATIVES — Pipeline Commercial en Entonnoir (Funnel)
  // --------------------------------------------------------------------------
  const funnelStages = [
    {
      step: 1,
      name: 'Prospection & Cadrage',
      shortName: 'PROSPECTION',
      count: 16,
      amount: '58,0 M',
      pct: 100,
      bg: 'rgba(104, 2, 0, 0.15)',
      textColor: 'text-slate-900',
      subTextColor: 'text-slate-500',
    },
    {
      step: 2,
      name: 'Signature & Acompte',
      shortName: 'SIGNATURE',
      count: 11,
      amount: '44,5 M',
      pct: 82,
      bg: 'rgba(104, 2, 0, 0.35)',
      textColor: 'text-primary',
      subTextColor: 'text-primary/70',
    },
    {
      step: 3,
      name: 'Production',
      shortName: 'PRODUCTION',
      count: 9,
      amount: '39,2 M',
      pct: 66,
      bg: 'rgba(104, 2, 0, 0.55)',
      textColor: 'text-white',
      subTextColor: 'text-white/80',
    },
    {
      step: 4,
      name: 'Validation Client',
      shortName: 'VALIDATION',
      count: 6,
      amount: '27,2 M',
      pct: 50,
      bg: 'rgba(104, 2, 0, 0.78)',
      textColor: 'text-white',
      subTextColor: 'text-white/80',
    },
    {
      step: 5,
      name: 'Livraison & Facturation',
      shortName: 'LIVRAISON',
      count: 9,
      amount: '39,5 M',
      pct: 34,
      bg: 'rgba(104, 2, 0, 1)',
      textColor: 'text-white',
      subTextColor: 'text-white/80',
    },
  ];

  const FUNNEL_CLIP = 'polygon(0% 0%, 100% 0%, 92% 100%, 8% 100%)';

  return (
    <div className="max-w-[1480px] mx-auto space-y-6 pb-16 text-slate-800">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs font-medium">
          <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
          {toastMessage}
        </div>
      )}

      {/* ==================================================================== */}
      {/* EN-TÊTE ÉPURÉ & MODERNE                                              */}
      {/* ==================================================================== */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-headline-md text-2xl font-extrabold text-slate-900 tracking-tight">Direction Générale</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary">Vue Globale Agence</span>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            Pilotage consolidé du chiffre d'affaires, performance des 5 divisions, agenda et arbitrages exécutifs.
          </p>
        </div>

        <button
          className="px-3.5 py-2 bg-primary hover:bg-on-primary-fixed-variant text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
          onClick={() => navigate('/dg/validations')}
          type="button"
        >
          <span className="material-symbols-outlined text-[16px]">verified</span>
          Centre de Validation
        </button>
      </header>

      {/* ==================================================================== */}
      {/* 4 INDICATEURS CLÉS ÉPURÉS                                            */}
      {/* ==================================================================== */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1 : CA Global Agence */}
        <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium mb-1">
            <span>CA Global Agence</span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 tracking-tight font-headline-md">
            {formatM(kpis.caGlobal / 1_000_000)} M <span className="text-xs font-normal text-slate-400">FCFA</span>
          </div>
          <div className="mt-2 pt-2 border-t border-emerald-100 flex items-center justify-between text-[10px] text-slate-500">
            <span>Sur projets actifs</span>
            <span className="font-bold text-primary font-label-md">{kpis.projetsActifs} projets</span>
          </div>
        </div>

        {/* KPI 2 : Total Encaissé */}
        <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium mb-1">
            <span>Total Encaissé</span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 tracking-tight font-headline-md">
            {formatM(kpis.totalEncaisse / 1_000_000)} M <span className="text-xs font-normal text-slate-400">FCFA</span>
          </div>
          <div className="mt-2 pt-2 border-t border-blue-100 flex items-center justify-between text-[10px] text-slate-500">
            <span>Taux de recouvrement</span>
            <span className="font-bold text-emerald-700 font-label-md">
              {kpis.caGlobal > 0 ? Math.round((kpis.totalEncaisse / kpis.caGlobal) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* KPI 3 : Projets Actifs */}
        <div className="bg-violet-50/60 p-3.5 rounded-xl border border-violet-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium mb-1">
            <span>Projets Actifs</span>
            {kpis.projetsEnRetard > 0 && (
              <span className="text-violet-600 font-semibold bg-violet-100/70 px-1.5 py-0.5 rounded-full text-[10px]">
                {kpis.projetsEnRetard} en retard
              </span>
            )}
          </div>
          <div className="text-xl font-extrabold text-slate-900 tracking-tight font-headline-md">{kpis.projetsActifs}</div>
          <div className="mt-2 pt-2 border-t border-violet-100 flex items-center justify-between text-[10px] text-slate-500">
            <span>Toutes divisions</span>
            <span className="font-bold text-slate-800">
              {kpis.projetsActifs > 0 ? Math.round(((kpis.projetsActifs - kpis.projetsEnRetard) / kpis.projetsActifs) * 100) : 100}% à temps
            </span>
          </div>
        </div>

        {/* KPI 4 : Taux de Transformation */}
        <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium mb-1">
            <span>Taux de Transformation</span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 tracking-tight font-headline-md">
            {kpis.tauxTransformation.toFixed(1)}%
          </div>
          <div className="mt-2 pt-2 border-t border-amber-100 flex items-center justify-between text-[10px] text-slate-500">
            <span>{kpis.opportunitesCount} opportunités</span>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* PRIORITÉ DU JOUR : AGENDA & PERFORMANCE / VALIDATIONS                */}
      {/* ==================================================================== */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* COLONNE 1 : AGENDA STRATÉGIQUE + TÂCHES (5 COLS) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Agenda de la Direction */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-headline-md text-base font-bold text-slate-900">Agenda de la Direction</h2>
                <p className="text-slate-400 text-xs">Prochains engagements</p>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                {agendaItems.length} engagement{agendaItems.length > 1 ? 's' : ''}
              </span>
            </div>

            <div>
              {isLoading ? (
                <p className="text-xs text-slate-400 text-center py-6">Chargement...</p>
              ) : agendaItems.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Aucun engagement à venir.</p>
              ) : (
                agendaItems.map(({ event, contactLabel }, idx) => {
                  const meta = EVENT_TYPE_META[event.event_type];
                  const isLast = idx === agendaItems.length - 1;

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
                        <p className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5 truncate">
                          {contactLabel} ·
                          <span className="material-symbols-outlined text-[13px] text-primary shrink-0">location_on</span>
                          {event.location || '—'}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <button
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors text-center"
              onClick={() => navigate('/dg/calendrier')}
              type="button"
            >
              Voir le calendrier complet →
            </button>
          </div>

          {/* Tâches du Jour — checklist rapide de la direction */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-headline-md text-base font-bold text-slate-900">Tâches du Jour</h2>
                <p className="text-slate-400 text-xs mt-0.5">
                  {tasks.filter((t) => t.done).length}/{tasks.length} terminées
                </p>
              </div>
              <button
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline shrink-0"
                onClick={() => navigate('/dg/taches')}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Ajouter
              </button>
            </div>

            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: tasks.length > 0 ? `${(tasks.filter((t) => t.done).length / tasks.length) * 100}%` : '0%' }}
              />
            </div>

            {isLoading ? (
              <p className="text-xs text-slate-400 text-center py-4">Chargement...</p>
            ) : tasks.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Aucune tâche pour la direction.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {tasks.map((task) => (
                  <div className={`flex items-start gap-3 py-3 first:pt-0 last:pb-0 ${task.done ? 'opacity-50' : ''}`} key={task.id}>
                    <button
                      className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        task.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-primary'
                      }`}
                      onClick={() => toggleTask(task)}
                      type="button"
                    >
                      {task.done && <span className="material-symbols-outlined text-white text-[13px]">check</span>}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold leading-snug ${task.done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                        {task.label}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span
                          className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${PRIORITY_META[task.priority].badge}`}
                        >
                          {PRIORITY_META[task.priority].label}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                            task.done ? 'text-slate-400' : task.priority === 'HIGH' ? 'text-red-600' : 'text-slate-400'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                          {formatTaskDueLabel(task)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COLONNE 2 : ENTONNOIR (FUNNEL) PIPELINE + PERFORMANCE PAR DIVISION (7 COLS) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Entonnoir (Funnel) de Conversion du Pipeline Commercial */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">filter_alt</span>
                  <h2 className="font-headline-md text-sm font-bold text-slate-900">Pipeline Commercial en Entonnoir</h2>
                </div>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Répartition des dossiers en cours, de la prospection à la facturation, toutes divisions
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                  Volume : <strong className="text-slate-900">208,4 M</strong>
                </span>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                  51 dossiers actifs
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-1.5 pt-1">
              {funnelStages.map((stage, idx) => {
                const isHovered = activeFunnelIndex === idx;

                return (
                  <div
                    key={stage.step}
                    onMouseEnter={() => setActiveFunnelIndex(idx)}
                    onMouseLeave={() => setActiveFunnelIndex(null)}
                    className={`flex flex-col items-center justify-center text-center py-3 transition-all cursor-pointer ${
                      isHovered ? 'brightness-95' : ''
                    }`}
                    style={{ clipPath: FUNNEL_CLIP, width: `${stage.pct}%`, backgroundColor: stage.bg }}
                  >
                    <span className={`text-sm font-extrabold tracking-wide ${stage.textColor}`}>
                      {stage.count} {stage.shortName}
                    </span>
                    <span className={`text-[10px] font-medium mt-0.5 ${stage.subTextColor}`}>{stage.amount} FCFA</span>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>
                Pipeline actif : <strong className="text-slate-900 font-bold">208,4 M FCFA</strong> sur 51 dossiers, toutes étapes confondues
              </span>
              <button
                type="button"
                onClick={() => navigate('/dg/opportunites')}
                className="text-primary hover:underline font-semibold flex items-center gap-1"
              >
                Explorer le pipeline →
              </button>
            </div>
          </div>

          {/* Performance par Division (Classement par CA réalisé vs Objectif) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-headline-md text-sm font-bold text-slate-900">Performance par Division</h2>
                <p className="text-slate-400 text-[11px]">Classement par CA réalisé vs objectif assigné</p>
              </div>
              <button
                className="text-xs font-semibold text-primary hover:underline shrink-0"
                onClick={() => setIsReportModalOpen(true)}
                type="button"
              >
                Rapport consolidé →
              </button>
            </div>

            <div className="space-y-1">
              {[...divisions]
                .sort((a, b) => b.revenue - a.revenue)
                .map((div, idx) => {
                  const isSelected = selectedDivisionId === div.id;
                  const rank = idx + 1;
                  const rankBadge =
                    rank === 1
                      ? 'bg-amber-100 text-amber-700'
                      : rank === 2
                      ? 'bg-slate-200 text-slate-600'
                      : rank === 3
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-slate-50 text-slate-400';

                  return (
                    <div
                      className={`flex items-center gap-3 p-2 rounded-xl transition-colors cursor-pointer ${
                        isSelected ? 'bg-slate-50' : 'hover:bg-slate-50'
                      }`}
                      key={div.id}
                      onClick={() => setSelectedDivisionId(isSelected ? null : div.id)}
                      role="button"
                      tabIndex={0}
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${rankBadge}`}>
                        {rank}
                      </span>
                      <div
                        className={`w-8 h-8 rounded-full ${div.avatarBg} flex items-center justify-center font-bold text-[11px] shrink-0 overflow-hidden`}
                      >
                        <img alt={div.chef} className="w-full h-full object-cover" src={div.photoUrl} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {div.name} <span className="text-[11px] font-normal text-slate-400">({div.chef})</span>
                          </span>
                          <span className="text-xs font-extrabold text-slate-900 shrink-0 font-label-md">
                            {div.revenue} M <span className="text-slate-400 font-normal">/ {div.target} M</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                div.progress >= 90 ? 'bg-emerald-600' : div.progress >= 80 ? 'bg-primary' : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(100, div.progress)}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 shrink-0 w-8 text-right font-label-md">
                            {div.progress.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* CENTRE DE VALIDATION DG — pleine largeur, en cards                   */}
      {/* ==================================================================== */}
      <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-headline-md text-base font-bold text-slate-900">Centre de Validation DG</h2>
              <span className="text-xs font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                {validations.filter((v) => v.status === 'A_VALIDER').length} en attente
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-0.5">Documents soumis pour votre validation</p>
          </div>

          <button className="text-xs font-semibold text-primary hover:underline" onClick={() => navigate('/dg/validations')} type="button">
            Voir tout →
          </button>
        </div>

        {isLoading ? (
          <p className="text-xs text-slate-400 text-center py-6">Chargement...</p>
        ) : validations.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">Aucun document en attente de votre validation.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {validations.map((val) => {
              const icon = DOCUMENT_TYPE_ICONS[val.document_type] ?? 'description';
              const isPending = val.status === 'A_VALIDER';
              const statusMeta = DOCUMENT_STATUS_META[val.status];

              return (
                <div
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    val.status === 'VALIDE'
                      ? 'bg-emerald-50/50 border-emerald-200 opacity-80'
                      : val.status === 'REJETE'
                      ? 'bg-red-50/50 border-red-200 opacity-60'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                  key={val.id}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[18px] text-primary">{icon}</span>
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${statusMeta.badge}`}>
                        {statusMeta.label}
                      </span>
                    </div>

                    <h3 className="font-bold text-xs text-slate-900 leading-snug">{val.label || val.document_type_display}</h3>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {val.document_type_display} · {val.contact_name || val.project_name || '—'}
                    </p>

                    <div className="mt-3 p-2.5 bg-slate-50 rounded-xl space-y-1.5 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Soumis par</span>
                        <span className="text-slate-700 font-medium">{val.uploaded_by_name ?? '—'}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Reçu</span>
                        <span>{new Date(val.uploaded_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                    {isPending ? (
                      <button
                        className="w-full px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-primary hover:bg-on-primary-fixed-variant transition-colors"
                        onClick={(e) => handleQuickValidate(val.id, e)}
                        type="button"
                      >
                        Valider
                      </button>
                    ) : (
                      <button
                        className="w-full px-3 py-1.5 rounded-lg text-xs font-semibold text-primary border border-primary/20 hover:bg-primary/5 transition-colors"
                        onClick={() => navigate('/dg/validations')}
                        type="button"
                      >
                        Voir
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ==================================================================== */}
      {/* MODAL : RAPPORT CONSOLIDÉ DE LA DIRECTION GÉNÉRALE                   */}
      {/* ==================================================================== */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-2xl p-6 shadow-2xl border border-slate-100 space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsReportModalOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shadow-md">
                <span className="material-symbols-outlined text-[20px]">summarize</span>
              </div>
              <div>
                <h3 className="font-headline-md text-base font-bold text-slate-900">Rapport Consolidé d'Activité</h3>
                <p className="text-xs text-slate-500">Direction Générale · Agence Iman</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-slate-900 mb-1">Synthèse Exécutive</h4>
                <p>
                  L'agence réalise un chiffre d'affaires consolidé de <strong>{formatM(kpis.caGlobal / 1_000_000)} M FCFA</strong> sur{' '}
                  <strong>{kpis.projetsActifs} projets actifs</strong>, dont <strong>{formatM(kpis.totalEncaisse / 1_000_000)} M FCFA</strong>{' '}
                  déjà encaissés. Le taux de transformation des opportunités s'établit à{' '}
                  <strong>{kpis.tauxTransformation.toFixed(1)}%</strong> sur {kpis.opportunitesCount} opportunités suivies.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-slate-200 bg-white">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">Division Leader</span>
                  <div className="font-extrabold text-sm text-slate-900 mt-0.5">Ventes (CDV)</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">54,8 M FCFA réalisés · 28 projets actifs</p>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-white">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">Projets en retard</span>
                  <div className="font-extrabold text-sm text-red-700 mt-0.5">{kpis.projetsEnRetard}</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Toutes divisions confondues</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900">
                <h4 className="font-bold mb-1">Recommandations Stratégiques</h4>
                <ul className="list-disc list-inside space-y-1 text-[11px]">
                  <li>Accélérer la signature des conventions en attente.</li>
                  <li>Soutenir les divisions pour convertir le pipeline d'ici la clôture du trimestre.</li>
                  <li>Maintenir la rigueur sur les délais de paiement.</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsReportModalOpen(false);
                  showToast('Téléchargement du rapport PDF consolidé en cours...');
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                Exporter en PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
