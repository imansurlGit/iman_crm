import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  convertToClient,
  getContact,
  updateContact,
  STAGE_BADGE_CLASSES,
  STAGE_OPTIONS,
  type Contact,
  type Stage,
} from '../../services/contactService';
import { listInteractions, INTERACTION_TYPE_OPTIONS, type Interaction } from '../../services/interactionService';
import { listTasks, updateTask, type Task } from '../../services/taskService';
import { listEvents, type ProspectEvent } from '../../services/eventService';
import { listProjects, STATUS_BADGE_CLASSES, type Project } from '../../services/projectService';
import TasksCard from '../../components/TasksCard';
import CelebrationModal from '../../components/CelebrationModal';
import Modal from '../../components/ui/Modal';

const CARD_CLASSES = 'bg-white rounded-xl border border-outline-variant';
const CARD_TITLE_CLASSES = 'font-headline-md text-base font-bold text-on-surface';
const SECONDARY_BUTTON_CLASSES =
  'px-4 py-2 text-sm border border-outline-variant text-on-surface font-semibold rounded-lg hover:bg-surface-container-low transition-colors';
const PRIMARY_BUTTON_CLASSES =
  'px-4 py-2 text-sm bg-primary text-white font-semibold rounded-lg transition-transform active:scale-95 hover:bg-primary/90 disabled:opacity-50';

const INTERACTION_ICON_BY_TYPE = Object.fromEntries(
  INTERACTION_TYPE_OPTIONS.map((option) => [option.value, option.icon]),
) as Record<Interaction['interaction_type'], string>;

const STAGE_GROUP_META: Record<Stage, { dot: string; border: string }> = {
  PRISE_DE_CONTACT: { dot: 'bg-red-500', border: 'border-red-200' },
  QUALIFICATION: { dot: 'bg-amber-500', border: 'border-amber-200' },
  ECHANGES: { dot: 'bg-blue-500', border: 'border-blue-200' },
  CHIFFRAGE_OFFRE: { dot: 'bg-purple-500', border: 'border-purple-200' },
  CONVERSION_CLIENT: { dot: 'bg-emerald-500', border: 'border-emerald-200' },
};

const ATTACHMENT_ICON_BY_EXT: Record<string, string> = {
  pdf: 'picture_as_pdf',
  xlsx: 'table_chart',
  xls: 'table_chart',
  docx: 'description',
  doc: 'description',
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
};

function attachmentIcon(url: string): string {
  const extension = url.split('.').pop()?.split('?')[0]?.toLowerCase() ?? '';
  return ATTACHMENT_ICON_BY_EXT[extension] ?? 'attach_file';
}

function attachmentName(url: string): string {
  try {
    return decodeURIComponent(url.split('/').pop() ?? url);
  } catch {
    return url;
  }
}

function formatInteractionTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatOpportunityBudget(budget: string | null): string {
  if (!budget) return 'Budget non défini';
  const amount = Number(budget);
  if (Number.isNaN(amount)) return 'Budget non défini';
  return `${amount.toLocaleString('fr-FR')} FCFA`;
}

function formatOpportunityDate(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
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

function formatRelanceDate(value: string): string {
  return new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function toDateTimeLocalValue(iso: string): string {
  const date = new Date(iso);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function ProspectDetailPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  // Cette fiche est partagée entre le suivi commercial (rôle COMMERCIAL, qui
  // n'a pas accès au menu "Prospection") et la liste globale (CDV/CDM/ADMIN).
  const listRoute = user?.role === 'COMMERCIAL' ? '/mes-contacts' : '/prospection';
  const [contact, setContact] = useState<Contact | null>(null);
  const [opportunities, setOpportunities] = useState<Project[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<ProspectEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const [isRelanceOpen, setIsRelanceOpen] = useState(false);
  const [relanceDate, setRelanceDate] = useState('');
  const [isSavingRelance, setIsSavingRelance] = useState(false);

  useEffect(() => {
    const contactId = Number(id);
    if (!contactId) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    Promise.all([
      getContact(contactId),
      listInteractions(contactId),
      listTasks(contactId),
      listEvents(contactId),
      listProjects({ client: contactId, kind: 'OPPORTUNITE' }),
    ])
      .then(([contactData, interactionsData, tasksData, eventsData, opportunitiesData]) => {
        setContact(contactData);
        setInteractions(interactionsData);
        setTasks(tasksData);
        setEvents(eventsData);
        setOpportunities(opportunitiesData);
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [id]);

  async function toggleTask(task: Task) {
    const updated = await updateTask(task.id, { done: !task.done });
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
  }

  async function handleConvert() {
    if (!contact) return;
    setIsConverting(true);
    try {
      const updated = await convertToClient(contact.id);
      setContact(updated);
      setShowCelebration(true);
    } finally {
      setIsConverting(false);
    }
  }

  function handleCelebrationClose() {
    setShowCelebration(false);
    navigate(listRoute);
  }

  function openNotesEdit() {
    setNotesDraft(contact?.notes ?? '');
    setIsEditingNotes(true);
  }

  async function handleSaveNotes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!contact || isSavingNotes) return;
    setIsSavingNotes(true);
    try {
      const updated = await updateContact(contact.id, { notes: notesDraft.trim() });
      setContact(updated);
      setIsEditingNotes(false);
    } finally {
      setIsSavingNotes(false);
    }
  }

  function openRelanceModal() {
    setRelanceDate(contact?.next_followup_at ? toDateTimeLocalValue(contact.next_followup_at) : '');
    setIsRelanceOpen(true);
  }

  async function handleRelanceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!contact || !relanceDate || isSavingRelance) return;
    setIsSavingRelance(true);
    try {
      const updated = await updateContact(contact.id, { next_followup_at: new Date(relanceDate).toISOString() });
      setContact(updated);
      setIsRelanceOpen(false);
    } finally {
      setIsSavingRelance(false);
    }
  }

  async function handleCancelRelance() {
    if (!contact || isSavingRelance) return;
    setIsSavingRelance(true);
    try {
      const updated = await updateContact(contact.id, { next_followup_at: null });
      setContact(updated);
    } finally {
      setIsSavingRelance(false);
    }
  }

  if (isLoading) {
    return <p className="font-body-sm text-body-sm text-secondary">Chargement...</p>;
  }

  if (notFound || !contact) {
    return (
      <div className="space-y-3">
        <p className="font-body-sm text-body-sm text-secondary">Ce prospect est introuvable.</p>
        <button className="text-primary text-sm font-semibold hover:underline" onClick={() => navigate(listRoute)} type="button">
          Retour à la prospection
        </button>
      </div>
    );
  }

  const currentStageIndex = Math.max(0, STAGE_OPTIONS.findIndex((s) => s.value === contact.stage));
  const sortedInteractions = [...interactions].sort(
    (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
  );

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-gutter">
      {/* Fil d'ariane + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex items-center gap-1.5 text-on-surface-variant text-xs font-medium">
          <button className="hover:text-primary transition-colors" onClick={() => navigate(listRoute)} type="button">
            Prospects
          </button>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-on-surface">{contact.name}</span>
        </nav>
        <div className="flex gap-2">
          <button
            className={SECONDARY_BUTTON_CLASSES}
            onClick={() => navigate(`/opportunites/nouvelle?client=${contact.id}`)}
            type="button"
          >
            Nouvelle opportunité
          </button>
          <button
            className={`${PRIMARY_BUTTON_CLASSES} flex items-center gap-1.5`}
            disabled={isConverting}
            onClick={handleConvert}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
            {isConverting ? 'Conversion...' : 'Convertir en client'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
        {/* Colonne gauche — façon CV : identité, infos */}
        <aside className="lg:col-span-4 space-y-5">
          <div className={`${CARD_CLASSES} overflow-hidden shadow-sm`}>
            <div className="h-20 bg-[linear-gradient(120deg,#680200_0%,#8a1a0e_100%)]" />
            <div className="px-6 pb-6 -mt-12 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-2xl font-bold border-4 border-white shadow-md shrink-0">
                {getInitials(contact.name)}
              </div>
              <h2 className="font-headline-md text-lg font-bold text-on-surface mt-3">{contact.name}</h2>
              {contact.company && <p className="text-sm font-semibold text-primary mt-0.5">{contact.company}</p>}

              <span
                className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border ${STAGE_BADGE_CLASSES[contact.stage]}`}
              >
                {contact.stage_display}
              </span>

              <div className="w-full mt-5 pt-5 border-t border-outline-variant space-y-3 text-left">
                <div className="flex items-center gap-2.5 text-sm">
                  <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">call</span>
                  <span className="text-on-surface">{contact.phone || '—'}</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm">
                  <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">mail</span>
                  <span className="text-on-surface truncate">{contact.email || '—'}</span>
                </div>
                {contact.address && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">location_on</span>
                    <span className="text-on-surface">{contact.address}</span>
                  </div>
                )}
                {contact.sector && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">business_center</span>
                    <span className="text-on-surface">{contact.sector}</span>
                  </div>
                )}
                {contact.source && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">campaign</span>
                    <span className="text-on-surface">Source : {contact.source}</span>
                  </div>
                )}
                <div className="flex items-center gap-2.5 text-sm">
                  <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">event</span>
                  <span className="text-on-surface">
                    Enregistré le {new Date(contact.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>

              <div className="w-full mt-5 pt-5 border-t border-outline-variant">
                <p className="text-[10px] font-bold uppercase tracking-widest text-secondary text-left mb-2">Commercial assigné</p>
                {contact.assigned_to_name ? (
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-xs font-bold shrink-0">
                      {getInitials(contact.assigned_to_name)}
                    </div>
                    <span className="text-sm font-semibold text-on-surface">{contact.assigned_to_name}</span>
                  </div>
                ) : (
                  <p className="text-sm text-secondary text-left">Non assigné</p>
                )}
              </div>

              <div className="w-full mt-5 pt-5 border-t border-outline-variant">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">Score du prospect</p>
                  <span className="text-sm font-bold text-primary">{contact.score}/100</span>
                </div>
                <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, contact.score)}%` }} />
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Colonne droite — parcours, interactions, opportunités, suivi */}
        <div className="lg:col-span-8 flex flex-col gap-gutter">
          {/* Parcours prospect */}
          <div className={`${CARD_CLASSES} p-5`}>
            <div className="flex items-center justify-between gap-3 mb-5">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-primary">
                Parcours prospect &amp; entonnoir commercial Iman
              </h3>
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide bg-primary/5 border border-primary/20 text-primary px-2.5 py-1 rounded-full">
                Statut : {contact.stage_display}
              </span>
            </div>

            <div className="flex items-start">
              {STAGE_OPTIONS.flatMap((stage, index) => {
                const isReached = index <= currentStageIndex;
                const card = (
                  <div className="flex flex-col items-center gap-1.5 shrink-0 w-28" key={stage.value}>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${
                        isReached ? 'bg-primary text-white' : 'bg-surface-container-high text-secondary'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span className={`text-xs font-bold text-center leading-tight ${isReached ? 'text-on-surface' : 'text-secondary'}`}>
                      {stage.label}
                    </span>
                  </div>
                );
                if (index === STAGE_OPTIONS.length - 1) return [card];
                const connectorDone = index < currentStageIndex;
                const connector = (
                  <div
                    className={`flex-1 min-w-[12px] h-0.5 mt-4 mx-1 rounded-full ${connectorDone ? 'bg-primary' : 'bg-outline-variant/40'}`}
                    key={`${stage.value}-connector`}
                  />
                );
                return [card, connector];
              })}
            </div>

            <div className="mt-6 flex items-center justify-between gap-4 rounded-lg border border-outline-variant/70 p-3.5 bg-surface-container-low/50">
              <p className="text-sm text-on-surface-variant leading-relaxed min-w-0">
                <span className="mr-1.5">💡</span>
                <span className="font-bold text-on-surface">Prochaine relance : </span>
                {contact.next_followup_at
                  ? 'Relance commerciale programmée pour ce prospect.'
                  : 'Aucune relance programmée pour le moment.'}
              </p>
              <div className="flex items-center gap-1.5 shrink-0">
                {contact.next_followup_at && (
                  <span className="text-xs font-bold bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full whitespace-nowrap">
                    {formatRelanceDate(contact.next_followup_at)}
                  </span>
                )}
                <button
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-secondary hover:text-primary hover:bg-surface-container-high transition-colors disabled:opacity-50"
                  disabled={isSavingRelance}
                  onClick={openRelanceModal}
                  title={contact.next_followup_at ? 'Reprogrammer la relance' : 'Programmer une relance'}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {contact.next_followup_at ? 'edit_calendar' : 'notifications_active'}
                  </span>
                </button>
                {contact.next_followup_at && (
                  <button
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-secondary hover:text-error hover:bg-error-container/20 transition-colors disabled:opacity-50"
                    disabled={isSavingRelance}
                    onClick={handleCancelRelance}
                    title="Interrompre la relance"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">event_busy</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Besoin exprimé */}
          <div className={`${CARD_CLASSES} p-5 bg-primary-fixed/10 border-primary/20`}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="font-headline-md text-base font-bold text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">lightbulb</span>
                Besoin exprimé
              </h3>
              {!isEditingNotes && (
                <button className="text-xs font-bold text-primary hover:underline" onClick={openNotesEdit} type="button">
                  {contact.notes ? 'Modifier' : 'Renseigner'}
                </button>
              )}
            </div>
            {isEditingNotes ? (
              <form className="space-y-2" onSubmit={handleSaveNotes}>
                <textarea
                  autoFocus
                  className="w-full border border-outline-variant p-3 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none resize-none h-20 bg-white"
                  onChange={(event) => setNotesDraft(event.target.value)}
                  placeholder="Ce que le prospect cherche à obtenir..."
                  value={notesDraft}
                />
                <div className="flex justify-end gap-2">
                  <button
                    className="px-3 py-1.5 text-xs font-semibold text-secondary hover:text-on-surface transition-colors"
                    onClick={() => setIsEditingNotes(false)}
                    type="button"
                  >
                    Annuler
                  </button>
                  <button
                    className="px-3 py-1.5 text-xs font-bold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    disabled={isSavingNotes}
                    type="submit"
                  >
                    {isSavingNotes ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            ) : contact.notes ? (
              <p className="text-sm text-on-surface-variant leading-relaxed">« {contact.notes} »</p>
            ) : (
              <p className="text-sm text-secondary italic">Aucun besoin renseigné pour le moment.</p>
            )}
          </div>

          {/* Historique des interactions */}
          <div className={`${CARD_CLASSES} p-5`}>
            <h3 className={`${CARD_TITLE_CLASSES} mb-5 flex items-center gap-2`}>
              Historique des interactions
              {sortedInteractions.length > 0 && (
                <span className="bg-surface-container-high px-1.5 py-0.5 rounded-full text-[11px] font-bold text-secondary">
                  {sortedInteractions.length}
                </span>
              )}
            </h3>
            <div className="flex flex-col gap-5">
              {STAGE_OPTIONS.map((stage) => {
                const stageInteractions = sortedInteractions.filter((item) => item.stage === stage.value);
                if (stageInteractions.length === 0) return null;
                const meta = STAGE_GROUP_META[stage.value];
                return (
                  <div key={stage.value}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
                      <h4 className="text-xs font-bold uppercase tracking-widest text-secondary">{stage.label}</h4>
                      <span className="bg-surface-container-high px-1.5 py-0.5 rounded-full text-[10px] font-bold text-secondary">
                        {stageInteractions.length}
                      </span>
                    </div>
                    <div className={`space-y-2 pl-4 border-l-2 ${meta.border}`}>
                      {stageInteractions.map((item) => (
                        <div className="flex items-start gap-3 bg-surface-container-low/60 rounded-lg p-3" key={item.id}>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-primary/10 text-primary">
                            <span className="material-symbols-outlined text-[16px]">{INTERACTION_ICON_BY_TYPE[item.interaction_type]}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-on-surface">{item.title || item.interaction_type_display}</span>
                              <span className="text-[11px] text-secondary shrink-0">{formatInteractionTimestamp(item.occurred_at)}</span>
                            </div>
                            {item.description && (
                              <p className="text-sm text-on-surface-variant mt-0.5 leading-relaxed">{item.description}</p>
                            )}
                            {item.created_by_name && (
                              <p className="text-[11px] text-secondary mt-0.5">{item.created_by_name}</p>
                            )}
                            {item.attachment && (
                              <a
                                className="mt-2 inline-flex items-center gap-1.5 bg-white border border-outline-variant rounded-lg px-2.5 py-1.5 text-xs font-semibold text-on-surface hover:border-primary/40 hover:text-primary transition-colors"
                                href={item.attachment}
                                rel="noreferrer"
                                target="_blank"
                              >
                                <span className="material-symbols-outlined text-[15px] text-secondary">{attachmentIcon(item.attachment)}</span>
                                <span className="truncate max-w-[220px]">{attachmentName(item.attachment)}</span>
                                <span className="material-symbols-outlined text-[14px] text-secondary">download</span>
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {sortedInteractions.length === 0 && (
                <p className="text-sm text-secondary">Aucun échange enregistré pour le moment.</p>
              )}
            </div>
          </div>

          {/* Opportunités */}
          <div className={`${CARD_CLASSES} p-5`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`${CARD_TITLE_CLASSES} flex items-center gap-2`}>
                Opportunités
                {opportunities.length > 0 && (
                  <span className="bg-surface-container-high px-1.5 py-0.5 rounded-full text-[11px] font-bold text-secondary">
                    {opportunities.length}
                  </span>
                )}
              </h3>
              <button
                className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                onClick={() => navigate(`/opportunites/nouvelle?client=${contact.id}`)}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Nouvelle opportunité
              </button>
            </div>

            {opportunities.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {opportunities.map((opportunity) => (
                  <button
                    className="group relative flex items-center gap-2.5 bg-white border border-outline-variant rounded-lg py-2 pl-3 pr-3 overflow-hidden hover:border-primary/40 hover:shadow-sm transition-all text-left"
                    key={opportunity.id}
                    onClick={() => navigate(`/opportunites/${opportunity.id}`)}
                    type="button"
                  >
                    <div className="absolute inset-y-0 left-0 w-1 bg-primary/70" />
                    <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[16px]">emoji_objects</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-on-surface truncate" title={opportunity.name}>
                        {opportunity.name}
                      </h4>
                      <p className="text-[10px] text-secondary truncate">
                        {opportunity.prestations.length} prestation{opportunity.prestations.length > 1 ? 's' : ''} ·{' '}
                        {formatOpportunityDate(opportunity.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${STATUS_BADGE_CLASSES[opportunity.status]}`}
                      >
                        {opportunity.status_display}
                      </span>
                      <span className="text-xs font-bold text-primary whitespace-nowrap">
                        {formatOpportunityBudget(opportunity.budget)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center border-2 border-dashed border-outline-variant rounded-lg">
                <span className="material-symbols-outlined text-[28px] text-secondary opacity-60">emoji_objects</span>
                <p className="text-sm text-secondary">Aucune opportunité créée pour ce prospect pour le moment.</p>
                <button
                  className="mt-1 flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                  onClick={() => navigate(`/opportunites/nouvelle?client=${contact.id}`)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  Créer la première opportunité
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
            <TasksCard
              contactId={contact.id}
              onCreated={(task) => setTasks((prev) => [task, ...prev])}
              onToggle={toggleTask}
              tasks={tasks}
              title="Tâches en attente"
            />

            {/* Prochains événements */}
            <div className={`${CARD_CLASSES} p-5`}>
              <h3 className={`${CARD_TITLE_CLASSES} mb-4`}>Prochains événements</h3>
              <div className="space-y-2">
                {events.map((event) => {
                  const badge = formatEventBadge(event.starts_at);
                  const isMeeting = event.event_type === 'MEETING';
                  return (
                    <div className="flex gap-3" key={event.id}>
                      <div
                        className={`flex flex-col items-center px-2.5 py-1.5 rounded-lg shrink-0 ${
                          isMeeting ? 'bg-primary/5 border border-primary/10 text-primary' : 'bg-surface-container-high text-secondary'
                        }`}
                      >
                        <span className="text-[9px] font-bold uppercase">{badge.month}</span>
                        <span className="text-base font-bold leading-none">{badge.day}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-semibold text-on-surface truncate">{event.title}</h4>
                        <p className="text-xs text-on-surface-variant">{formatEventTime(event.starts_at)}</p>
                        {event.location && (
                          <p className="text-[11px] text-secondary mt-0.5 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">location_on</span>
                            {event.location}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {events.length === 0 && <p className="text-sm text-secondary">Rien de planifié pour l'instant.</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <CelebrationModal
        isOpen={showCelebration}
        message={
          <>
            <strong className="text-on-surface">{contact.name}</strong> a été converti en client avec succès.
          </>
        }
        onClose={handleCelebrationClose}
        title="Félicitations !"
      />

      <Modal
        footer={
          <>
            <button
              className="px-5 py-2.5 rounded border border-outline-variant text-on-surface font-body-sm text-body-sm hover:bg-surface-container-high transition-colors"
              onClick={() => setIsRelanceOpen(false)}
              type="button"
            >
              Annuler
            </button>
            <button
              className="px-5 py-2.5 rounded bg-primary text-white font-body-sm text-body-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
              disabled={isSavingRelance}
              form="relance-form"
              type="submit"
            >
              {isSavingRelance ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </>
        }
        isOpen={isRelanceOpen}
        maxWidthClassName="max-w-sm"
        onClose={() => setIsRelanceOpen(false)}
        title={contact.next_followup_at ? 'Reprogrammer la relance' : 'Enregistrer une relance'}
      >
        <form className="space-y-3" id="relance-form" onSubmit={handleRelanceSubmit}>
          <div className="space-y-1.5">
            <label className="font-label-md text-label-md text-on-surface-variant uppercase" htmlFor="relance-date">
              Prochaine relance
            </label>
            <input
              className="w-full px-3 py-2 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container outline-none"
              id="relance-date"
              onChange={(event) => setRelanceDate(event.target.value)}
              required
              type="datetime-local"
              value={relanceDate}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
