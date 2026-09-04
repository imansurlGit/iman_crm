import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { listContacts, type Contact } from '../../services/contactService';
import { listProjects, type Project } from '../../services/projectService';
import { listAllTasks, updateTask, formatTaskDueLabel, type Task } from '../../services/taskService';
import { listAllEvents, type ProspectEvent } from '../../services/eventService';
import {
  STEP_DEFINITIONS,
  stepIndex,
  deriveCurrentStep,
  isDossierBlocked,
  isRelanceDue,
  type CommercialStep,
} from '../../utils/commercialWorkflow';

const CARD_CLASSES = 'bg-white rounded-lg border border-outline-variant';

interface Dossier {
  contact: Contact;
  project: Project | null;
  step: CommercialStep;
  blocked: boolean;
  relanceDue: boolean;
}

function reasonFor(dossier: Dossier): string {
  if (dossier.step === 'ACOMPTE' && dossier.project?.requires_deposit && !dossier.project.deposit_received) {
    return 'Acompte en attente';
  }
  if (dossier.step === 'VALIDATION_CLIENT' && dossier.project?.status === 'EN_CORRECTION') {
    return 'Modifications demandées par le client';
  }
  if (dossier.step === 'VALIDATION_CLIENT') return 'En attente de validation client';
  if (dossier.step === 'FICHE_BAT') return 'Fiche BAT non validée';
  if (dossier.step === 'PAIEMENT_FINAL') return 'Paiement final en attente';
  if (dossier.relanceDue) return 'Relance commerciale à faire';
  return 'À traiter';
}

// Ramp ordinale validée (une teinte, luminosité monotone) — voir la skill
// dataviz : "Répartition par phase" est un ordre (avant-vente → clôture),
// pas une identité, donc une seule teinte qui fonce plutôt que 4 couleurs.
const STEP_GROUPS: { label: string; steps: CommercialStep[]; color: string }[] = [
  { label: 'Avant-vente', steps: ['PRISE_CONTACT', 'QUALIFICATION', 'CADRAGE', 'DEVIS'], color: '#d9a09c' },
  { label: 'Acompte & lancement', steps: ['ACOMPTE', 'PRODUCTION'], color: '#c17d78' },
  { label: 'Validation & BAT', steps: ['VALIDATION_CLIENT', 'FICHE_BAT', 'EXECUTION'], color: '#99392f' },
  { label: 'Livraison & clôture', steps: ['LIVRAISON', 'PAIEMENT_FINAL', 'CLOTURE'], color: '#680200' },
];

function isToday(iso: string): boolean {
  const date = new Date(iso);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

function isPastDue(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}

function formatFcfaCompact(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1).replace('.0', '')} M FCFA`;
  if (amount >= 1_000) return `${Math.round(amount / 1_000)} k FCFA`;
  return `${amount.toLocaleString('fr-FR')} FCFA`;
}

function formatEventBadge(startsAt: string): { month: string; day: string } {
  const date = new Date(startsAt);
  return {
    month: date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '').toUpperCase(),
    day: date.toLocaleDateString('fr-FR', { day: '2-digit' }),
  };
}

function formatEventTime(startsAt: string): string {
  return new Date(startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function DashboardCommercialPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<ProspectEvent[]>([]);

  useEffect(() => {
    Promise.all([listContacts('PROSPECT'), listContacts('CLIENT'), listProjects(), listAllTasks(), listAllEvents()]).then(
      ([prospectsData, clientsData, projectsData, tasksData, eventsData]) => {
        setContacts([...prospectsData, ...clientsData].filter((contact) => contact.assigned_to === user?.id));
        setProjects(projectsData);
        setTasks(tasksData.filter((task) => task.assignee === user?.id));
        setEvents(eventsData);
      },
    );
  }, [user?.id]);

  const contactIds = useMemo(() => new Set(contacts.map((c) => c.id)), [contacts]);

  const latestProjectByContact = useMemo(() => {
    const map = new Map<number, Project>();
    for (const project of projects) {
      const existing = map.get(project.client);
      if (!existing || project.created_at > existing.created_at) {
        map.set(project.client, project);
      }
    }
    return map;
  }, [projects]);

  const dossiers: Dossier[] = useMemo(
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
  const relanceCount = dossiers.filter((d) => d.step !== 'CLOTURE' && d.relanceDue).length;
  const closedCount = dossiers.filter((d) => d.step === 'CLOTURE').length;

  const attentionList = useMemo(
    () =>
      dossiers
        .filter((d) => d.step !== 'CLOTURE' && (d.blocked || d.relanceDue))
        .sort((a, b) => (b.blocked ? 1 : 0) - (a.blocked ? 1 : 0)),
    [dossiers],
  );

  // Repli affiché quand rien ne nécessite d'action, pour ne pas laisser la
  // carte vide — les 3 dossiers ouverts les plus récents.
  const recentDossiers = useMemo(
    () =>
      [...dossiers]
        .filter((d) => d.step !== 'CLOTURE')
        .sort((a, b) => b.contact.created_at.localeCompare(a.contact.created_at))
        .slice(0, 3),
    [dossiers],
  );

  const maxGroupCount = Math.max(
    1,
    ...STEP_GROUPS.map((group) => activeDossiers.filter((d) => group.steps.includes(d.step)).length),
  );

  // Performance financière — uniquement les projets confirmés (kind=PROJET)
  // pour le CA, les opportunités (kind=OPPORTUNITE) pour le pipeline.
  const wonProjects = projects.filter((p) => p.kind === 'PROJET');
  const openOpportunities = projects.filter((p) => p.kind === 'OPPORTUNITE');
  const caGenere = wonProjects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
  const caEncaisse = wonProjects.reduce((sum, p) => {
    const budget = Number(p.budget) || 0;
    const deposit = Number(p.deposit_amount) || 0;
    if (p.final_payment_received) return sum + budget;
    if (p.deposit_received) return sum + deposit;
    return sum;
  }, 0);
  const pipelineValue = openOpportunities.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
  const convertedCount = contacts.filter((c) => c.contact_type === 'CLIENT').length;
  const conversionRate = contacts.length > 0 ? Math.round((convertedCount / contacts.length) * 100) : 0;

  // Tâches du jour — échéance aujourd'hui ou en retard, non terminées.
  const todayTasks = useMemo(
    () =>
      tasks
        .filter((t) => !t.done && t.due_at && (isToday(t.due_at) || isPastDue(t.due_at)))
        .sort((a, b) => (a.due_at ?? '').localeCompare(b.due_at ?? ''))
        .slice(0, 6),
    [tasks],
  );

  // Agenda du jour — rendez-vous liés à mes propres dossiers.
  const todayEvents = useMemo(
    () =>
      events
        .filter((e) => contactIds.has(e.contact) && isToday(e.starts_at))
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [events, contactIds],
  );

  async function toggleTask(task: Task) {
    const updated = await updateTask(task.id, { done: !task.done, status: task.done ? 'TODO' : 'DONE' });
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
  }

  const ringRadius = 26;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - conversionRate / 100);

  return (
    <div className="max-w-[1400px] mx-auto space-y-3">
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">Tableau de bord Commercial</h2>
          <p className="text-secondary mt-0.5 text-sm">Suivi des dossiers clients, de la prise de contact à la clôture.</p>
        </div>
        <button
          className="flex items-center gap-1.5 bg-primary text-white pl-3 pr-4 py-2 rounded-full text-xs font-bold shadow-sm hover:shadow-md hover:bg-on-primary-fixed-variant active:scale-95 transition-all shrink-0"
          onClick={() => navigate('/dossiers-clients')}
          type="button"
        >
          <span className="material-symbols-outlined text-[16px]">folder_shared</span>
          Voir tous les dossiers
        </button>
      </section>

      {/* KPIs opérationnels */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="rounded-lg border border-primary/15 bg-primary/5 p-3 flex items-center gap-2.5">
          <span className="material-symbols-outlined text-primary text-xl shrink-0">folder_shared</span>
          <div className="min-w-0">
            <span className="text-primary/70 text-[11px] font-medium block truncate">Dossiers actifs</span>
            <span className="font-headline-md text-lg text-primary leading-tight">{activeDossiers.length}</span>
          </div>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 flex items-center gap-2.5">
          <span className="material-symbols-outlined text-blue-600 text-xl shrink-0">apartment</span>
          <div className="min-w-0">
            <span className="text-blue-700/70 text-[11px] font-medium block truncate">Clients</span>
            <span className="font-headline-md text-lg text-blue-700 leading-tight">{convertedCount}</span>
          </div>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-center gap-2.5">
          <span className="material-symbols-outlined text-amber-600 text-xl shrink-0">notifications_active</span>
          <div className="min-w-0">
            <span className="text-amber-700/70 text-[11px] font-medium block truncate">Relances à faire</span>
            <span className="font-headline-md text-lg text-amber-700 leading-tight">{relanceCount}</span>
          </div>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2.5">
          <span className="material-symbols-outlined text-emerald-600 text-xl shrink-0">task_alt</span>
          <div className="min-w-0">
            <span className="text-emerald-700/70 text-[11px] font-medium block truncate">Clôturés</span>
            <span className="font-headline-md text-lg text-emerald-700 leading-tight">{closedCount}</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        {/* Colonne gauche */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          {/* Dossiers nécessitant une action */}
          <div className={`${CARD_CLASSES} p-4`}>
            <h4 className="font-headline-md text-sm font-bold text-primary mb-3">Dossiers nécessitant une action</h4>
            <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
              {attentionList.map((dossier) => {
                const index = stepIndex(dossier.step);
                return (
                  <button
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-colors text-left"
                    key={dossier.contact.id}
                    onClick={() => navigate(`/dossiers-clients/${dossier.contact.id}`)}
                    type="button"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary-container/10 text-primary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[16px]">{STEP_DEFINITIONS[index].icon}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-on-surface truncate">
                        {dossier.contact.company || dossier.contact.name}
                      </p>
                      <p className="text-xs text-error">{reasonFor(dossier)}</p>
                    </div>
                    <span className="material-symbols-outlined text-secondary text-[18px] shrink-0">chevron_right</span>
                  </button>
                );
              })}
              {attentionList.length === 0 && (
                <>
                  <p className="text-sm text-secondary py-1">Aucun dossier ne nécessite d'action pour l'instant.</p>
                  {recentDossiers.length > 0 && (
                    <>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-secondary pt-2 pb-0.5">
                        Dossiers récents
                      </p>
                      {recentDossiers.map((dossier) => {
                        const index = stepIndex(dossier.step);
                        return (
                          <button
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-colors text-left"
                            key={dossier.contact.id}
                            onClick={() => navigate(`/dossiers-clients/${dossier.contact.id}`)}
                            type="button"
                          >
                            <div className="w-8 h-8 rounded-lg bg-primary-container/10 text-primary flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-[16px]">{STEP_DEFINITIONS[index].icon}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-on-surface truncate">
                                {dossier.contact.company || dossier.contact.name}
                              </p>
                              <p className="text-xs text-secondary">{STEP_DEFINITIONS[index].label}</p>
                            </div>
                            <span className="material-symbols-outlined text-secondary text-[18px] shrink-0">chevron_right</span>
                          </button>
                        );
                      })}
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Tâches du jour */}
          <div className={`${CARD_CLASSES} p-4`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-headline-md text-sm font-bold text-primary">Tâches du jour</h4>
              <button
                className="text-xs font-semibold text-primary hover:underline"
                onClick={() => navigate('/commercial/taches')}
                type="button"
              >
                Toutes mes tâches
              </button>
            </div>
            <div className="space-y-1">
              {todayTasks.map((task) => {
                const late = task.due_at ? isPastDue(task.due_at) && !isToday(task.due_at) : false;
                return (
                  <label
                    className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer group"
                    key={task.id}
                  >
                    <input
                      checked={task.done}
                      className="mt-0.5 w-4 h-4 text-primary focus:ring-primary rounded-sm border-outline shrink-0"
                      onChange={() => toggleTask(task)}
                      type="checkbox"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-on-surface truncate group-hover:text-primary transition-colors">
                        {task.label}
                      </p>
                      <p className={`text-[11px] ${late ? 'text-error font-semibold' : 'text-secondary'}`}>
                        {formatTaskDueLabel(task)}
                      </p>
                    </div>
                  </label>
                );
              })}
              {todayTasks.length === 0 && <p className="text-sm text-secondary py-2">Aucune tâche urgente aujourd'hui.</p>}
            </div>
          </div>
        </div>

        {/* Colonne droite */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          {/* Performance */}
          <div className={`${CARD_CLASSES} p-4`}>
            <h4 className="font-headline-md text-sm font-bold text-primary mb-3">Performance</h4>
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle className="text-surface-container" cx="32" cy="32" fill="transparent" r={ringRadius} stroke="currentColor" strokeWidth={6} />
                  <circle
                    cx="32"
                    cy="32"
                    fill="transparent"
                    r={ringRadius}
                    stroke="#680200"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                    strokeLinecap="round"
                    strokeWidth={6}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-on-surface">
                  {conversionRate}%
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-secondary">Taux de conversion</p>
                <p className="text-sm font-semibold text-on-surface">
                  {convertedCount} client{convertedCount > 1 ? 's' : ''} / {contacts.length} contact{contacts.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 mt-4">
              <div className="bg-surface-container-low rounded-lg p-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-secondary">CA généré</p>
                <p className="text-sm font-bold text-on-surface mt-0.5">{formatFcfaCompact(caGenere)}</p>
                <p className="text-[10px] text-emerald-700 mt-0.5">{formatFcfaCompact(caEncaisse)} encaissé</p>
              </div>
              <div className="bg-surface-container-low rounded-lg p-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-secondary">Pipeline en cours</p>
                <p className="text-sm font-bold text-on-surface mt-0.5">{formatFcfaCompact(pipelineValue)}</p>
                <p className="text-[10px] text-secondary mt-0.5">{openOpportunities.length} opportunité{openOpportunities.length > 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>

          {/* Répartition par phase */}
          <div className={`${CARD_CLASSES} p-4`}>
            <h4 className="font-headline-md text-sm font-bold text-primary mb-3">Répartition par phase</h4>
            <div className="space-y-2.5">
              {STEP_GROUPS.map((group) => {
                const count = activeDossiers.filter((d) => group.steps.includes(d.step)).length;
                return (
                  <div className="flex items-center gap-2.5" key={group.label}>
                    <span className="text-xs text-on-surface w-[110px] shrink-0 truncate">{group.label}</span>
                    <div className="flex-1 bg-surface-container rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${(count / maxGroupCount) * 100}%`, backgroundColor: group.color }}
                      />
                    </div>
                    <span className="text-xs font-bold text-on-surface w-4 text-right shrink-0">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Agenda du jour */}
          <div className={`${CARD_CLASSES} p-4`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-headline-md text-sm font-bold text-primary">Agenda du jour</h4>
              <a className="text-xs font-semibold text-primary hover:underline" href="/calendrier-collaboratif">
                Calendrier
              </a>
            </div>
            <div className="space-y-1">
              {todayEvents.map((event) => {
                const badge = formatEventBadge(event.starts_at);
                const isMeeting = event.event_type === 'MEETING';
                return (
                  <div className="flex items-center gap-2.5 p-1.5" key={event.id}>
                    <div
                      className={`flex flex-col items-center px-2 py-1 rounded-md shrink-0 ${
                        isMeeting ? 'bg-primary/5 text-primary' : 'bg-surface-container-high text-secondary'
                      }`}
                    >
                      <span className="text-[8px] font-bold uppercase">{badge.month}</span>
                      <span className="text-xs font-bold leading-none">{badge.day}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-on-surface truncate">{event.title}</p>
                      <p className="text-[11px] text-secondary">{formatEventTime(event.starts_at)}</p>
                    </div>
                  </div>
                );
              })}
              {todayEvents.length === 0 && <p className="text-sm text-secondary py-1">Rien de planifié aujourd'hui.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
