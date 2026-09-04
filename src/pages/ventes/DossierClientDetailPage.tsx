import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getContact, updateContact, convertToClient, type Contact, type Stage } from '../../services/contactService';
import {
  listInteractions,
  createInteraction,
  updateInteraction,
  deleteInteraction,
  INTERACTION_TYPE_OPTIONS,
  type Interaction,
  type InteractionType,
} from '../../services/interactionService';
import {
  listProjects,
  startProject,
  updateProjectStatus,
  setDepositDecision,
  markOpportunityWon,
  markOpportunityLost,
  confirmDelivery,
  createPrestation,
  updatePrestation,
  formatProjectDeadline,
  type Project,
} from '../../services/projectService';
import { listDocuments, createDocument, updateDocumentStatus, type Document } from '../../services/documentService';
import { listPrestationTasks, type Task } from '../../services/taskService';
import { listNotes, createNote, updateNote, deleteNote, type Note } from '../../services/noteService';
import { listDirectory, type CurrentUser } from '../../services/userService';
import { listDivisions, getDivisionChiefLabel, type Division } from '../../services/divisionService';
import { createEvent } from '../../services/eventService';
import {
  STEP_DEFINITIONS,
  stepIndex,
  deriveCurrentStep,
  deriveRecordType,
  RECORD_TYPE_LABELS,
  RECORD_TYPE_CLASSES,
  type CommercialStep,
} from '../../utils/commercialWorkflow';
import Modal from '../../components/ui/Modal';

const CARD_TITLE_CLASSES = 'font-headline-md text-base font-bold text-on-surface';
const ADVANCE_BUTTON_CLASSES =
  'flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white text-sm font-bold rounded-lg hover:bg-on-primary-fixed-variant transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-primary';

// Les chefs de division et le DG sont habilités à valider (mêmes rôles que
// dans DocumentDetailPage.tsx, où le DG peut déjà être désigné validateur).
const VALIDATOR_ROLES = ['CDN', 'CDV', 'CDM', 'DG'];

// Division par défaut pour l'exécution — le VIP (Visibilité, Infrastructure
// et Production) est le responsable habituel de cette étape.
const DEFAULT_EXECUTION_DIVISION_NAME = 'Visibilité, Infrastructure et Production';
// Repère la prestation d'exécution parmi celles du projet — pas de champ
// dédié côté backend, l'intitulé fait foi (voir handleExecutionSubmit).
const EXECUTION_PRESTATION_LABEL = 'Exécution';

// Miroir de PROSPECTION_STAGE_TO_STEP (commercialWorkflow.ts) — permet, une
// fois une étape franchie, de retrouver les échanges qui y ont été
// enregistrés (via Interaction.stage) pour ne pas les faire disparaître.
const STEP_TO_STAGE: Partial<Record<CommercialStep, Stage>> = {
  PRISE_CONTACT: 'PRISE_DE_CONTACT',
  QUALIFICATION: 'QUALIFICATION',
  CADRAGE: 'ECHANGES',
};

const PRODUCTION_STEPS: CommercialStep[] = [
  'PRODUCTION',
  'VALIDATION_CLIENT',
  'FICHE_BAT',
  'EXECUTION',
  'LIVRAISON',
  'PAIEMENT_FINAL',
  'CLOTURE',
];

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function nowForDateTimeInput(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function toDateTimeLocalValue(iso: string): string {
  const date = new Date(iso);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatFCFA(value: string | null): string {
  if (!value) return 'Non défini';
  const amount = Number(value);
  return Number.isNaN(amount) ? 'Non défini' : `${amount.toLocaleString('fr-FR')} FCFA`;
}

interface InteractionLogPanelProps {
  contact: Contact;
  stageFilter: Stage;
  interactions: Interaction[];
  onInteractionAdded: (interaction: Interaction) => void;
  onInteractionUpdated: (interaction: Interaction) => void;
  onInteractionDeleted: (id: number) => void;
  advanceLabel: string;
  advanceIcon: string;
  onAdvance: () => Promise<void> | void;
  isAdvancing: boolean;
}

function InteractionLogPanel({
  contact,
  stageFilter,
  interactions,
  onInteractionAdded,
  onInteractionUpdated,
  onInteractionDeleted,
  advanceLabel,
  advanceIcon,
  onAdvance,
  isAdvancing,
}: InteractionLogPanelProps) {
  const stageInteractions = interactions.filter((item) => item.stage === stageFilter);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [type, setType] = useState<InteractionType>('CALL');
  const [subject, setSubject] = useState('');
  const [note, setNote] = useState('');
  const [occurredAt, setOccurredAt] = useState(nowForDateTimeInput());
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [existingAttachment, setExistingAttachment] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function openCreateModal() {
    setEditingId(null);
    setType('CALL');
    setSubject('');
    setNote('');
    setOccurredAt(nowForDateTimeInput());
    setAttachedFile(null);
    setExistingAttachment(null);
    setIsModalOpen(true);
  }

  function openEditModal(interaction: Interaction) {
    setEditingId(interaction.id);
    setType(interaction.interaction_type);
    setSubject(interaction.title);
    setNote(interaction.description);
    setOccurredAt(toDateTimeLocalValue(interaction.occurred_at));
    setAttachedFile(null);
    setExistingAttachment(interaction.attachment);
    setIsModalOpen(true);
  }

  async function handleDelete(interaction: Interaction) {
    if (!window.confirm("Supprimer cette interaction ? Cette action est irréversible.")) return;
    await deleteInteraction(interaction.id);
    onInteractionDeleted(interaction.id);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('contact', String(contact.id));
      formData.append('interaction_type', type);
      formData.append('title', subject.trim());
      formData.append('description', note.trim());
      formData.append('occurred_at', new Date(occurredAt).toISOString());
      if (attachedFile) formData.append('attachment', attachedFile);

      if (editingId) {
        const updated = await updateInteraction(editingId, formData);
        onInteractionUpdated(updated);
      } else {
        const created = await createInteraction(formData);
        onInteractionAdded(created);
      }
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      {stageInteractions.length > 0 && (
        <div className="space-y-2">
          {stageInteractions.map((interaction) => {
            const meta = INTERACTION_TYPE_OPTIONS.find((option) => option.value === interaction.interaction_type);
            return (
              <div className="group flex items-start gap-2.5 bg-white border border-outline-variant/60 rounded-lg p-2.5" key={interaction.id}>
                <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">{meta?.icon ?? 'chat'}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-on-surface">
                    {interaction.title || interaction.interaction_type_display}
                  </p>
                  {interaction.description && <p className="text-xs text-secondary">{interaction.description}</p>}
                  <p className="text-[10px] text-outline mt-0.5">
                    {interaction.created_by_name} · {formatDateTime(interaction.occurred_at)}
                  </p>
                  {interaction.attachment && (
                    <a
                      className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                      href={interaction.attachment}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <span className="material-symbols-outlined text-[13px]">attach_file</span>
                      Pièce jointe
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="w-6 h-6 flex items-center justify-center rounded text-secondary hover:text-primary hover:bg-surface-container-high transition-colors"
                    onClick={() => openEditModal(interaction)}
                    title="Modifier"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[14px]">edit</span>
                  </button>
                  <button
                    className="w-6 h-6 flex items-center justify-center rounded text-secondary hover:text-error hover:bg-error-container/20 transition-colors"
                    onClick={() => handleDelete(interaction)}
                    title="Supprimer"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        className="flex items-center justify-center gap-1.5 px-3 py-2 w-full border border-dashed border-outline-variant text-secondary text-xs font-bold rounded-lg hover:bg-surface-container-high hover:text-on-surface transition-colors"
        onClick={openCreateModal}
        type="button"
      >
        <span className="material-symbols-outlined text-[16px]">add</span>
        Ajouter une interaction
      </button>

      <div>
        <button className={ADVANCE_BUTTON_CLASSES} disabled={isAdvancing} onClick={() => onAdvance()} type="button">
          <span className="material-symbols-outlined text-[18px]">{advanceIcon}</span>
          {isAdvancing ? 'Enregistrement...' : advanceLabel}
        </button>
      </div>

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
              className="px-5 py-2.5 rounded bg-primary text-white font-body-sm text-body-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
              disabled={isSubmitting}
              form="interaction-form"
              type="submit"
            >
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </>
        }
        isOpen={isModalOpen}
        maxWidthClassName="max-w-md"
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Modifier l'interaction" : 'Ajouter une interaction'}
      >
        <form className="space-y-3" id="interaction-form" onSubmit={handleSubmit}>
          <div className="flex gap-1.5 flex-wrap">
            {INTERACTION_TYPE_OPTIONS.map((option) => (
              <button
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                  type === option.value ? 'bg-primary text-white border-primary' : 'border-outline-variant text-secondary hover:bg-surface-container-high'
                }`}
                key={option.value}
                onClick={() => setType(option.value)}
                type="button"
              >
                <span className="material-symbols-outlined text-[13px]">{option.icon}</span>
                {option.label}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <label className="font-label-md text-label-md text-on-surface-variant uppercase" htmlFor="interaction-subject">
              Objet
            </label>
            <input
              className="w-full px-3 py-2 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container outline-none"
              id="interaction-subject"
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Objet de l'échange"
              type="text"
              value={subject}
            />
          </div>
          <div className="space-y-1.5">
            <label className="font-label-md text-label-md text-on-surface-variant uppercase" htmlFor="interaction-date">
              Date et heure
            </label>
            <input
              className="w-full px-3 py-2 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container outline-none"
              id="interaction-date"
              onChange={(event) => setOccurredAt(event.target.value)}
              required
              type="datetime-local"
              value={occurredAt}
            />
          </div>
          <div className="space-y-1.5">
            <label className="font-label-md text-label-md text-on-surface-variant uppercase" htmlFor="interaction-note">
              Note
            </label>
            <div className="relative">
              <textarea
                className="w-full px-3 py-2 pb-9 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container outline-none min-h-[80px] resize-none"
                id="interaction-note"
                onChange={(event) => setNote(event.target.value)}
                placeholder="Résumé de l'échange..."
                value={note}
              />
              <label
                className="absolute bottom-2 right-2 p-1.5 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                title={existingAttachment ? 'Remplacer le fichier joint' : 'Joindre un fichier'}
              >
                <span className="material-symbols-outlined text-[18px]">attach_file</span>
                <input className="hidden" onChange={(event) => setAttachedFile(event.target.files?.[0] ?? null)} type="file" />
              </label>
            </div>
            {attachedFile && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-sm text-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px] text-primary">description</span>
                <span className="truncate flex-1">{attachedFile.name}</span>
                <button
                  className="text-secondary hover:text-error transition-colors"
                  onClick={() => setAttachedFile(null)}
                  title="Retirer le fichier"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            )}
            {!attachedFile && existingAttachment && (
              <a
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                href={existingAttachment}
                rel="noreferrer"
                target="_blank"
              >
                <span className="material-symbols-outlined text-[14px]">description</span>
                Voir la pièce jointe actuelle
              </a>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}

interface NotesCardProps {
  notes: Note[];
  onAdd: (text: string) => void;
  onEdit: (id: number, text: string) => void;
  onDelete: (id: number) => void;
}

function NotesCard({ notes, onAdd, onEdit, onDelete }: NotesCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState('');

  function openNew() {
    setEditingId(null);
    setDraft('');
    setIsOpen(true);
  }

  function openExisting(note: Note) {
    setEditingId(note.id);
    setDraft(note.text);
    setIsOpen(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim()) return;
    if (editingId) onEdit(editingId, draft.trim());
    else onAdd(draft.trim());
    setIsOpen(false);
  }

  return (
    <div className="bg-surface-container-lowest border border-outline-variant p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className={`${CARD_TITLE_CLASSES} flex items-center gap-2`}>
          Notes
          {notes.length > 0 && (
            <span className="bg-surface-container-high px-1.5 py-0.5 rounded-full text-[11px] font-bold text-secondary">{notes.length}</span>
          )}
        </h3>
        <button className="text-xs font-bold text-primary hover:underline" onClick={openNew} type="button">
          + Ajouter
        </button>
      </div>
      <div className="space-y-1.5">
        {notes.map((note) => (
          <button
            className="w-full text-left bg-white border border-outline-variant/60 rounded-lg p-3 hover:border-primary/40 hover:shadow-sm transition-all"
            key={note.id}
            onClick={() => openExisting(note)}
            type="button"
          >
            <p className="text-sm text-on-surface-variant line-clamp-2">{note.text}</p>
            <p className="text-[11px] text-outline mt-1">
              {note.created_by_name} · {formatDateTime(note.updated_at)}
            </p>
          </button>
        ))}
        {notes.length === 0 && <p className="text-sm text-secondary italic">Aucune note pour le moment.</p>}
      </div>

      <Modal
        footer={
          <>
            {editingId && (
              <button
                className="px-4 py-2.5 rounded border border-error/30 text-error font-body-sm text-body-sm font-semibold hover:bg-error-container/20 transition-colors mr-auto"
                onClick={() => {
                  onDelete(editingId);
                  setIsOpen(false);
                }}
                type="button"
              >
                Supprimer
              </button>
            )}
            <button
              className="px-5 py-2.5 rounded border border-outline-variant text-on-surface font-body-sm text-body-sm hover:bg-surface-container-high transition-colors"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              Annuler
            </button>
            <button
              className="px-5 py-2.5 rounded bg-primary text-white font-body-sm text-body-sm font-bold hover:bg-primary/90 transition-colors"
              form="note-form"
              type="submit"
            >
              Enregistrer
            </button>
          </>
        }
        isOpen={isOpen}
        maxWidthClassName="max-w-lg"
        onClose={() => setIsOpen(false)}
        title={editingId ? 'Modifier la note' : 'Nouvelle note'}
      >
        <form id="note-form" onSubmit={handleSubmit}>
          <textarea
            autoFocus
            className="w-full px-3 py-2 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container outline-none min-h-[160px] resize-none"
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Écrire une note sur ce dossier..."
            value={draft}
          />
        </form>
      </Modal>
    </div>
  );
}

export default function DossierClientDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const canRecordPayments = user?.role === 'COMPTABLE_GENERAL' || user?.role === 'ASSISTANT_COMPTABLE';

  const [contact, setContact] = useState<Contact | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [prestationTasks, setPrestationTasks] = useState<Record<number, Task[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);

  const [isRelanceOpen, setIsRelanceOpen] = useState(false);
  const [relanceDate, setRelanceDate] = useState('');
  const [isSavingRelance, setIsSavingRelance] = useState(false);

  const [isQualificationOpen, setIsQualificationOpen] = useState(false);
  const [qualificationNote, setQualificationNote] = useState('');

  const [validators, setValidators] = useState<CurrentUser[]>([]);
  const [isDevisModalOpen, setIsDevisModalOpen] = useState(false);
  const [devisFile, setDevisFile] = useState<File | null>(null);
  const [selectedValidatorIds, setSelectedValidatorIds] = useState<number[]>([]);
  const [devisError, setDevisError] = useState<string | null>(null);
  const [isSubmittingDevis, setIsSubmittingDevis] = useState(false);

  const [isGagneModalOpen, setIsGagneModalOpen] = useState(false);
  const [gagneMontant, setGagneMontant] = useState('');
  const [isPerduModalOpen, setIsPerduModalOpen] = useState(false);
  const [perduRaison, setPerduRaison] = useState('');
  const [isSubmittingOutcome, setIsSubmittingOutcome] = useState(false);

  const [depositRequired, setDepositRequired] = useState(false);
  const [depositAmountInput, setDepositAmountInput] = useState('');
  const [isSavingDepositDecision, setIsSavingDepositDecision] = useState(false);

  const [divisions, setDivisions] = useState<Division[]>([]);
  const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);
  const [executionDivisionId, setExecutionDivisionId] = useState('');
  const [executionNote, setExecutionNote] = useState('');
  const [isSubmittingExecution, setIsSubmittingExecution] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);

  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [isConfirmingDelivery, setIsConfirmingDelivery] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

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
      listProjects({ client: contactId }),
      listNotes(contactId),
      listDocuments({ contact: contactId }),
    ])
      .then(async ([contactData, interactionsData, projectsData, notesData, contactDocs]) => {
        setContact(contactData);
        setInteractions(interactionsData);
        setNotes(notesData);
        const latestProject = projectsData[0] ?? null;
        setProject(latestProject);
        if (latestProject) {
          const projectDocs = await listDocuments({ project: latestProject.id });
          setDocuments([...contactDocs, ...projectDocs]);
        } else {
          setDocuments(contactDocs);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(() => {
    if (!project || project.kind !== 'PROJET' || project.prestations.length === 0) return;
    Promise.all(project.prestations.map((p) => listPrestationTasks(p.id))).then((results) => {
      const map: Record<number, Task[]> = {};
      project.prestations.forEach((p, index) => {
        map[p.id] = results[index];
      });
      setPrestationTasks(map);
    });
  }, [project]);

  useEffect(() => {
    listDirectory().then((users) => setValidators(users.filter((u) => VALIDATOR_ROLES.includes(u.role ?? ''))));
    listDivisions().then(setDivisions);
  }, []);

  function openDevisModal() {
    setDevisFile(null);
    setSelectedValidatorIds([]);
    setDevisError(null);
    setIsDevisModalOpen(true);
  }

  function toggleValidator(userId: number) {
    setSelectedValidatorIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  }

  function openGagneModal() {
    setGagneMontant('');
    setIsGagneModalOpen(true);
  }

  function openPerduModal() {
    setPerduRaison('');
    setIsPerduModalOpen(true);
  }

  async function handleDevisSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project || isSubmittingDevis) return;
    if (!devisFile) {
      setDevisError('Joignez le fichier du devis.');
      return;
    }
    if (selectedValidatorIds.length === 0) {
      setDevisError('Choisissez au moins un validateur.');
      return;
    }
    setIsSubmittingDevis(true);
    try {
      const formData = new FormData();
      formData.append('owner_type', 'PROJECT');
      formData.append('project', String(project.id));
      formData.append('document_type', 'DEVIS');
      formData.append('status', 'A_VALIDER');
      formData.append('label', devisFile.name);
      formData.append('file', devisFile);
      selectedValidatorIds.forEach((validatorId) => formData.append('validators', String(validatorId)));
      const created = await createDocument(formData);
      setDocuments((prev) => [created, ...prev]);
      setIsDevisModalOpen(false);
    } finally {
      setIsSubmittingDevis(false);
    }
  }

  async function handleAddNote(text: string) {
    if (!contact) return;
    const created = await createNote(contact.id, text);
    setNotes((prev) => [created, ...prev]);
  }

  async function handleEditNote(noteId: number, text: string) {
    const updated = await updateNote(noteId, text);
    setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
  }

  async function handleDeleteNote(noteId: number) {
    await deleteNote(noteId);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  }

  if (isLoading) {
    return <p className="font-body-sm text-body-sm text-secondary">Chargement...</p>;
  }

  if (notFound || !contact) {
    return (
      <div className="space-y-3">
        <p className="font-body-sm text-body-sm text-secondary">Ce dossier client est introuvable.</p>
        <button className="text-primary text-sm font-semibold hover:underline" onClick={() => navigate('/dossiers-clients')} type="button">
          Retour aux dossiers
        </button>
      </div>
    );
  }

  const activeContact = contact;
  const currentStep = deriveCurrentStep(contact, project, documents);
  const recordType = deriveRecordType(project);
  const currentIndex = stepIndex(currentStep);
  const batDocument = documents.find((doc) => doc.document_type === 'FICHE_BAT');
  const isClient = recordType === 'PROJET';

  async function advanceContactStage(nextStage: Contact['stage']) {
    if (!contact) return;
    setIsAdvancing(true);
    try {
      const updated = await updateContact(contact.id, { stage: nextStage });
      setContact(updated);
    } finally {
      setIsAdvancing(false);
    }
  }

  function openQualificationModal() {
    setQualificationNote(activeContact.notes);
    setIsQualificationOpen(true);
  }

  async function handleQualificationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!contact || isAdvancing) return;
    setIsAdvancing(true);
    try {
      const trimmedNote = qualificationNote.trim();
      await updateContact(contact.id, { notes: trimmedNote, stage: 'ECHANGES' });
      navigate(`/opportunites/nouvelle?client=${contact.id}&description=${encodeURIComponent(trimmedNote)}`);
    } finally {
      setIsAdvancing(false);
    }
  }

  async function handleStartProject() {
    if (!project) return;
    setIsAdvancing(true);
    try {
      const updated = await startProject(project.id);
      setProject(updated);
    } finally {
      setIsAdvancing(false);
    }
  }

  async function handleGagneSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project || !contact || isSubmittingOutcome) return;
    setIsSubmittingOutcome(true);
    try {
      const updated = await markOpportunityWon(project.id, gagneMontant);
      setProject(updated);
      if (contact.contact_type === 'PROSPECT') {
        const updatedContact = await convertToClient(contact.id);
        setContact(updatedContact);
      }
      setIsGagneModalOpen(false);
    } finally {
      setIsSubmittingOutcome(false);
    }
  }

  async function handlePerduSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project || isSubmittingOutcome) return;
    setIsSubmittingOutcome(true);
    try {
      const updated = await markOpportunityLost(project.id, perduRaison.trim());
      setProject(updated);
      setIsPerduModalOpen(false);
    } finally {
      setIsSubmittingOutcome(false);
    }
  }

  async function handleDepositDecisionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project || isSavingDepositDecision) return;
    setIsSavingDepositDecision(true);
    try {
      const updated = await setDepositDecision(project.id, depositRequired, depositRequired ? depositAmountInput : null);
      setProject(updated);
    } finally {
      setIsSavingDepositDecision(false);
    }
  }

  async function handleSetStatus(status: Project['status']) {
    if (!project) return;
    setIsAdvancing(true);
    try {
      const updated = await updateProjectStatus(project.id, status);
      setProject(updated);
    } finally {
      setIsAdvancing(false);
    }
  }

  // La prestation d'exécution n'a pas de champ dédié côté backend — on la
  // repère par son intitulé fixe (voir EXECUTION_PRESTATION_LABEL).
  function findExecutionPrestation() {
    return project?.prestations.find((p) => p.label === EXECUTION_PRESTATION_LABEL) ?? null;
  }

  function openExecutionModal() {
    const existing = findExecutionPrestation();
    const vipDivision = divisions.find((d) => d.name === DEFAULT_EXECUTION_DIVISION_NAME);
    setExecutionDivisionId(existing?.division ? String(existing.division) : vipDivision ? String(vipDivision.id) : '');
    setExecutionNote(existing?.note ?? '');
    setExecutionError(null);
    setIsExecutionModalOpen(true);
  }

  async function handleExecutionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project || !executionDivisionId || isSubmittingExecution) return;
    setIsSubmittingExecution(true);
    setExecutionError(null);
    try {
      const existing = findExecutionPrestation();
      const prestation = existing
        ? await updatePrestation(existing.id, { division: Number(executionDivisionId), note: executionNote.trim() })
        : await createPrestation({
            project: project.id,
            label: EXECUTION_PRESTATION_LABEL,
            deadline: project.deadline ?? new Date().toISOString(),
            division: Number(executionDivisionId),
            note: executionNote.trim(),
          });
      setProject((prev) =>
        prev
          ? {
              ...prev,
              prestations: existing
                ? prev.prestations.map((p) => (p.id === prestation.id ? prestation : p))
                : [...prev.prestations, prestation],
            }
          : prev,
      );
      setIsExecutionModalOpen(false);
    } catch {
      setExecutionError('Impossible de transmettre ce dossier. Vérifiez les champs et réessayez.');
    } finally {
      setIsSubmittingExecution(false);
    }
  }

  function openDeliveryModal() {
    setDeliveryDate(project?.deadline ? toDateTimeLocalValue(project.deadline) : '');
    setDeliveryError(null);
    setIsDeliveryModalOpen(true);
  }

  async function handleConfirmDelivery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project || !deliveryDate || isConfirmingDelivery) return;
    setIsConfirmingDelivery(true);
    setDeliveryError(null);
    try {
      const isoDate = new Date(deliveryDate).toISOString();
      const updated = await confirmDelivery(project.id, isoDate);
      setProject(updated);
      await createEvent({
        contact: project.client,
        event_type: 'LIVRAISON',
        title: `Livraison — ${project.name}`,
        starts_at: isoDate,
      });
      setIsDeliveryModalOpen(false);
    } catch {
      setDeliveryError('Impossible de confirmer la livraison. Réessayez.');
    } finally {
      setIsConfirmingDelivery(false);
    }
  }

  async function handleValidateBat() {
    if (!batDocument) return;
    setIsAdvancing(true);
    try {
      const updated = await updateDocumentStatus(batDocument.id, 'VALIDE');
      setDocuments((prev) => prev.map((doc) => (doc.id === updated.id ? updated : doc)));
    } finally {
      setIsAdvancing(false);
    }
  }

  function openRelanceModal() {
    setRelanceDate(contact?.next_followup_at ?? '');
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

  function renderStepPanel(step: CommercialStep) {
    switch (step) {
      case 'PRISE_CONTACT':
        return (
          <InteractionLogPanel
            advanceIcon="psychology"
            advanceLabel="Terminer la prise de contact"
            contact={activeContact}
            interactions={interactions}
            isAdvancing={isAdvancing}
            onAdvance={() => advanceContactStage('QUALIFICATION')}
            onInteractionAdded={(interaction) => setInteractions((prev) => [interaction, ...prev])}
            onInteractionDeleted={(deletedId) => setInteractions((prev) => prev.filter((item) => item.id !== deletedId))}
            onInteractionUpdated={(interaction) => setInteractions((prev) => prev.map((item) => (item.id === interaction.id ? interaction : item)))}
            stageFilter="PRISE_DE_CONTACT"
          />
        );
      case 'QUALIFICATION':
        return (
          <InteractionLogPanel
            advanceIcon="forum"
            advanceLabel="Terminer la qualification"
            contact={activeContact}
            interactions={interactions}
            isAdvancing={isAdvancing}
            onAdvance={openQualificationModal}
            onInteractionAdded={(interaction) => setInteractions((prev) => [interaction, ...prev])}
            onInteractionDeleted={(deletedId) => setInteractions((prev) => prev.filter((item) => item.id !== deletedId))}
            onInteractionUpdated={(interaction) => setInteractions((prev) => prev.map((item) => (item.id === interaction.id ? interaction : item)))}
            stageFilter="QUALIFICATION"
          />
        );
      case 'CADRAGE':
        return (
          <InteractionLogPanel
            advanceIcon="request_quote"
            advanceLabel="Terminer les échanges"
            contact={activeContact}
            interactions={interactions}
            isAdvancing={isAdvancing}
            onAdvance={() => advanceContactStage('CHIFFRAGE_OFFRE')}
            onInteractionAdded={(interaction) => setInteractions((prev) => [interaction, ...prev])}
            onInteractionDeleted={(deletedId) => setInteractions((prev) => prev.filter((item) => item.id !== deletedId))}
            onInteractionUpdated={(interaction) => setInteractions((prev) => prev.map((item) => (item.id === interaction.id ? interaction : item)))}
            stageFilter="ECHANGES"
          />
        );
      case 'DEVIS': {
        if (!project) {
          return (
            <div className="space-y-2">
              <p className="text-xs text-secondary">
                Aucune opportunité créée pour l'instant. La création de l'opportunité précise le titre, l'échéance visée et
                les prestations.
              </p>
              <button
                className={ADVANCE_BUTTON_CLASSES}
                onClick={() => navigate(`/opportunites/nouvelle?client=${activeContact.id}`)}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">emoji_objects</span>
                Créer l'opportunité
              </button>
            </div>
          );
        }

        const devisDocument = documents
          .filter((doc) => doc.document_type === 'DEVIS' && doc.owner_type === 'PROJECT' && doc.project === project.id)
          .sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at))[0];

        if (!devisDocument) {
          return (
            <div className="space-y-2">
              <p className="text-xs text-secondary">Aucun devis soumis pour l'instant.</p>
              <button className={ADVANCE_BUTTON_CLASSES} onClick={openDevisModal} type="button">
                <span className="material-symbols-outlined text-[18px]">upload_file</span>
                Soumettre le devis à validation
              </button>
            </div>
          );
        }

        return (
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase bg-amber-100 text-amber-700">
              <span className="material-symbols-outlined text-[14px]">schedule</span>
              En attente de validation
            </span>
            <p className="text-xs text-secondary">
              Validateur{devisDocument.validator_names.length > 1 ? 's' : ''} : {devisDocument.validator_names.join(', ')}
            </p>
            <button
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              onClick={() => navigate(`/documents/${devisDocument.id}`)}
              type="button"
            >
              <span className="material-symbols-outlined text-[14px]">description</span>
              Voir le devis
            </button>
          </div>
        );
      }
      case 'GAGNE_PERDU': {
        if (project && project.status === 'PERDUE') {
          return (
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase bg-gray-200 text-gray-700">
                <span className="material-symbols-outlined text-[14px]">cancel</span>
                Opportunité perdue
              </span>
              {project.description && <p className="text-xs text-secondary italic">« {project.description} »</p>}
            </div>
          );
        }
        return (
          <div className="space-y-2">
            <p className="text-xs text-secondary">Le devis a été validé — cette opportunité est-elle gagnée ou perdue ?</p>
            <div className="flex flex-wrap gap-2">
              <button
                className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-colors"
                onClick={openGagneModal}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">emoji_events</span>
                Opportunité gagnée
              </button>
              <button
                className="flex items-center gap-1.5 px-4 py-2.5 border border-outline-variant text-on-surface text-sm font-bold rounded-lg hover:bg-surface-container-high transition-colors"
                onClick={openPerduModal}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">cancel</span>
                Opportunité perdue
              </button>
            </div>
          </div>
        );
      }
      case 'ACOMPTE': {
        if (!project) return null;

        if (!project.deposit_decided) {
          return (
            <form className="space-y-3" onSubmit={handleDepositDecisionSubmit}>
              <p className="text-xs text-secondary">Un acompte est-il nécessaire pour ce projet ?</p>
              <div className="flex items-center gap-1 p-1 bg-surface-container border border-outline-variant rounded-xl w-fit">
                <button
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    depositRequired ? 'bg-white text-on-surface shadow-sm' : 'text-secondary hover:text-on-surface'
                  }`}
                  onClick={() => setDepositRequired(true)}
                  type="button"
                >
                  Oui
                </button>
                <button
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    !depositRequired ? 'bg-white text-on-surface shadow-sm' : 'text-secondary hover:text-on-surface'
                  }`}
                  onClick={() => setDepositRequired(false)}
                  type="button"
                >
                  Non
                </button>
              </div>
              {depositRequired && (
                <input
                  className="w-full max-w-xs px-3 py-2 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container outline-none"
                  min="0"
                  onChange={(event) => setDepositAmountInput(event.target.value)}
                  placeholder="Montant de l'acompte (FCFA)"
                  required
                  type="number"
                  value={depositAmountInput}
                />
              )}
              <button className={ADVANCE_BUTTON_CLASSES} disabled={isSavingDepositDecision} type="submit">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                {isSavingDepositDecision ? 'Enregistrement...' : 'Confirmer'}
              </button>
            </form>
          );
        }

        if (project.requires_deposit && !project.deposit_received) {
          return (
            <p className="text-xs text-error flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">block</span>
              Étape bloquée : en attente de la confirmation d'encaissement de l'acompte par la Comptabilité.
            </p>
          );
        }

        const missing: string[] = [];
        if (!project.deadline) missing.push('une échéance');
        if (!project.budget) missing.push('un budget');
        if (project.prestations.length === 0) missing.push('au moins une prestation');
        if (missing.length > 0) {
          return (
            <div className="space-y-2">
              <p className="text-xs text-error flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">block</span>
                Manque : {missing.join(', ')}.
              </p>
              <button
                className="flex items-center gap-1.5 px-4 py-2.5 border border-outline-variant text-on-surface text-sm font-bold rounded-lg hover:bg-surface-container-high transition-colors"
                onClick={() => navigate(`/opportunites/${project.id}`)}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                Compléter l'opportunité
              </button>
            </div>
          );
        }

        return (
          <button className={ADVANCE_BUTTON_CLASSES} disabled={isAdvancing} onClick={handleStartProject} type="button">
            <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
            Démarrer le projet
          </button>
        );
      }
      default:
        return null;
    }
  }

  const executionPrestation = findExecutionPrestation();

  return (
    <div className="flex flex-col gap-gutter">
      {/* Header */}
      <section className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div>
          <nav className="flex items-center gap-1.5 mb-2 text-on-surface-variant text-xs font-medium">
            <button className="hover:text-primary transition-colors cursor-pointer" onClick={() => navigate('/dossiers-clients')} type="button">
              Dossiers clients
            </button>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-on-surface">{contact.company || contact.name}</span>
          </nav>
          <div className="flex items-center gap-2.5">
            <h2 className="font-headline-md text-xl font-bold text-on-surface tracking-tight">{contact.company || contact.name}</h2>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${RECORD_TYPE_CLASSES[recordType]}`}>
              {RECORD_TYPE_LABELS[recordType]}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5 text-sm font-bold text-on-surface">
              <span className="material-symbols-outlined text-[18px] text-primary">person</span>
              {contact.name}
            </div>
            {project && (
              <div className="flex items-center gap-1.5 text-sm text-secondary">
                <span className="material-symbols-outlined text-[18px]">design_services</span>
                {project.name}
              </div>
            )}
            {project?.budget && (
              <div className="flex items-center gap-1.5 text-sm text-secondary">
                <span className="material-symbols-outlined text-[18px]">payments</span>
                {formatFCFA(project.budget)}
              </div>
            )}
          </div>
          {project?.description && <p className="text-xs text-secondary italic mt-1.5 max-w-lg">« {project.description} »</p>}
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-primary/5 border border-primary/20 text-primary">
              {STEP_DEFINITIONS[currentIndex].label}
            </span>
          </div>
        </div>

        {isClient
          ? project?.deadline && (
              <div className="flex items-center gap-3 bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200/80 rounded-xl pl-3 pr-4 py-2 shadow-sm shrink-0">
                <div className="w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                </div>
                <div className="leading-tight">
                  <p className="text-[9px] uppercase tracking-wider font-bold text-blue-700">
                    {project.status === 'LIVRE' || project.status === 'CLOTURE' ? 'Livré le' : 'Livraison prévue'}
                  </p>
                  <p className="text-sm font-bold text-blue-900 whitespace-nowrap">{formatProjectDeadline(project.deadline)}</p>
                </div>
              </div>
            )
          : currentStep !== 'CLOTURE' && (
              <>
                {contact.next_followup_at ? (
                  <div className="flex items-center gap-3 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 rounded-xl pl-3 pr-2 py-2 shadow-sm shrink-0">
                    <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <span className="material-symbols-outlined text-[18px]">schedule</span>
                    </div>
                    <div className="leading-tight">
                      <p className="text-[9px] uppercase tracking-wider font-bold text-amber-700">Relance commerciale</p>
                      <p className="text-sm font-bold text-amber-900 whitespace-nowrap">{formatDateTime(contact.next_followup_at)}</p>
                    </div>
                    <div className="flex items-center gap-1 pl-2 ml-1 border-l border-amber-200">
                      <button
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-amber-700 hover:bg-amber-200/50 transition-colors"
                        onClick={openRelanceModal}
                        title="Reprogrammer la relance"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit_calendar</span>
                      </button>
                      <button
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-amber-700 hover:bg-amber-200/50 transition-colors"
                        onClick={handleCancelRelance}
                        title="Interrompre la relance"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">event_busy</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="flex items-center gap-2 bg-primary text-white pl-3.5 pr-4 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:shadow-md hover:bg-on-primary-fixed-variant active:scale-95 transition-all shrink-0"
                    onClick={openRelanceModal}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">notifications_active</span>
                    Enregistrer une relance
                  </button>
                )}
              </>
            )}
      </section>

      {isClient && project ? (
        <>
          {/* Suivi de production — stepper horizontal, ne montre que les étapes de production */}
          <section className="bg-surface-container-lowest border border-outline-variant p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className={CARD_TITLE_CLASSES}>Suivi de production</h3>
              <button className="text-xs font-bold text-primary hover:underline" onClick={() => navigate(`/projets/${project.id}`)} type="button">
                Voir le projet complet
              </button>
            </div>
            <div className="flex items-start">
              {PRODUCTION_STEPS.map((step, index) => {
                const productionCurrentIndex = PRODUCTION_STEPS.indexOf(currentStep);
                const isDone = index < productionCurrentIndex;
                const isCurrent = index === productionCurrentIndex;
                const stepDef = STEP_DEFINITIONS[stepIndex(step)];
                return (
                  <div className="flex-1 flex flex-col items-center relative" key={step}>
                    {index > 0 && (
                      <div className={`absolute top-4 right-1/2 w-full h-[2px] ${index <= productionCurrentIndex ? 'bg-primary' : 'bg-outline-variant'}`} />
                    )}
                    <div
                      className={`relative w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        isDone
                          ? 'bg-primary text-white'
                          : isCurrent
                            ? 'bg-white border-2 border-primary text-primary shadow-[0_0_0_4px_rgba(139,26,14,0.15)]'
                            : 'bg-surface-container-high text-secondary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">{isDone ? 'check' : stepDef.icon}</span>
                    </div>
                    <p className={`mt-2 text-[11px] text-center leading-tight ${isCurrent ? 'font-bold text-on-surface' : isDone ? 'font-medium text-on-surface' : 'text-secondary'}`}>
                      {stepDef.shortLabel}
                    </p>
                  </div>
                );
              })}
            </div>

            {currentStep === 'PRODUCTION' && (
              <div className="mt-5 pt-5 border-t border-outline-variant flex flex-wrap gap-2">
                {project.prestations.some((prestation) => !prestation.division) ? (
                  <button className={ADVANCE_BUTTON_CLASSES} onClick={() => navigate(`/projets/${project.id}`)} type="button">
                    <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                    Voir le projet
                  </button>
                ) : (
                  <button className={ADVANCE_BUTTON_CLASSES} disabled={isAdvancing} onClick={() => handleSetStatus('EN_VALIDATION_CLIENT')} type="button">
                    <span className="material-symbols-outlined text-[18px]">fact_check</span>
                    Envoyer pour validation client
                  </button>
                )}
              </div>
            )}
            {currentStep === 'EXECUTION' && (
              <div className="mt-5 pt-5 border-t border-outline-variant">
                {executionPrestation ? (
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-sm">
                      <span className="material-symbols-outlined text-[18px]">move_to_inbox</span>
                      Transmis à {executionPrestation.division_name ?? '—'} — en attente de fin d'exécution.
                    </div>
                    <button className="text-xs font-bold text-primary hover:underline" onClick={openExecutionModal} type="button">
                      Modifier l'affectation
                    </button>
                  </div>
                ) : (
                  <button className={ADVANCE_BUTTON_CLASSES} onClick={openExecutionModal} type="button">
                    <span className="material-symbols-outlined text-[18px]">move_to_inbox</span>
                    Transmettre à une division
                  </button>
                )}
              </div>
            )}
            {currentStep === 'LIVRAISON' && (
              <div className="mt-5 pt-5 border-t border-outline-variant">
                <button className={ADVANCE_BUTTON_CLASSES} disabled={isAdvancing} onClick={openDeliveryModal} type="button">
                  <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                  Confirmer la livraison
                </button>
              </div>
            )}
            {currentStep === 'CLOTURE' && project.status !== 'CLOTURE' && (
              <div className="mt-5 pt-5 border-t border-outline-variant">
                <button className={ADVANCE_BUTTON_CLASSES} disabled={isAdvancing} onClick={() => handleSetStatus('CLOTURE')} type="button">
                  <span className="material-symbols-outlined text-[18px]">task_alt</span>
                  Clôturer le dossier
                </button>
              </div>
            )}
          </section>

          <div className="grid grid-cols-12 gap-gutter items-start">
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-gutter">
              {project.prestations.length > 0 && (
                <div className="bg-surface-container-lowest border border-outline-variant p-5">
                  <h3 className={`${CARD_TITLE_CLASSES} mb-4`}>Prestations</h3>
                  <div className="space-y-2">
                    {project.prestations.map((prestation) => {
                      const relatedTasks = prestationTasks[prestation.id] ?? [];
                      const status =
                        relatedTasks.length === 0
                          ? 'À faire'
                          : relatedTasks.every((t) => t.done)
                            ? 'Terminé'
                            : 'En cours';
                      const statusClasses =
                        status === 'Terminé'
                          ? 'bg-emerald-100 text-emerald-700'
                          : status === 'En cours'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-surface-container-high text-secondary';
                      return (
                        <div className="flex items-center gap-3 bg-white border border-outline-variant/60 rounded-lg p-3" key={prestation.id}>
                          <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">design_services</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-on-surface truncate">{prestation.label}</p>
                            <p className="text-[11px] text-secondary truncate">{prestation.division_name ?? 'Division non assignée'}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${statusClasses}`}>{status}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="bg-surface-container-lowest border border-outline-variant p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className={CARD_TITLE_CLASSES}>Validation client</h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      project.status === 'EN_CORRECTION'
                        ? 'bg-red-100 text-red-700'
                        : project.status === 'EN_VALIDATION_CLIENT'
                          ? 'bg-amber-100 text-amber-700'
                          : currentStep === 'PRODUCTION'
                            ? 'bg-surface-container-high text-secondary'
                            : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {currentStep === 'PRODUCTION' ? 'Pas encore envoyé' : project.status_display}
                  </span>
                </div>
                {currentStep === 'VALIDATION_CLIENT' ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="flex items-center gap-1.5 px-4 py-2.5 border border-outline-variant text-on-surface text-sm font-bold rounded-lg hover:bg-surface-container-high transition-colors"
                      disabled={isAdvancing}
                      onClick={() => handleSetStatus('EN_CORRECTION')}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">undo</span>
                      Demander des modifications
                    </button>
                    <button className={ADVANCE_BUTTON_CLASSES} disabled={isAdvancing} onClick={() => handleSetStatus('PRET_POUR_EXECUTION')} type="button">
                      <span className="material-symbols-outlined text-[18px]">edit_document</span>
                      Valider et passer à l'exécution
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-secondary">
                    Envoyez les livrables au client pour validation dès que la conception est prête.
                  </p>
                )}
              </div>

              {documents.length > 0 && (
                <div className="bg-surface-container-lowest border border-outline-variant p-5">
                  <h3 className={`${CARD_TITLE_CLASSES} mb-4`}>Documents</h3>
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div className="flex items-center gap-3 bg-white border border-outline-variant/60 rounded-lg p-3" key={doc.id}>
                        <a
                          className="material-symbols-outlined text-[18px] text-secondary shrink-0"
                          href={doc.file || doc.link}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {doc.file ? 'description' : 'link'}
                        </a>
                        <p className="text-sm font-semibold text-on-surface flex-1">{doc.label || doc.document_type_display}</p>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                            doc.status === 'VALIDE'
                              ? 'bg-emerald-100 text-emerald-700'
                              : doc.status === 'A_VALIDER'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-surface-container-high text-secondary'
                          }`}
                        >
                          {doc.status_display}
                        </span>
                        {currentStep === 'FICHE_BAT' && doc.document_type === 'FICHE_BAT' && doc.status !== 'VALIDE' && (
                          <button
                            className="text-xs font-bold text-primary hover:underline shrink-0"
                            disabled={isAdvancing}
                            onClick={handleValidateBat}
                            type="button"
                          >
                            Valider
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-surface-container-low border border-dashed border-outline-variant p-4 flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary text-[18px] shrink-0">history</span>
                <p className="text-xs text-secondary flex-1">
                  Opportunité créée le {formatDateTime(project.created_at)}
                  {project.converted_at && ` · Converti en projet le ${formatDateTime(project.converted_at)}`}
                </p>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-4 flex flex-col gap-gutter">
              <div className="bg-surface-container-lowest border border-outline-variant p-5">
                <h3 className={`${CARD_TITLE_CLASSES} mb-4`}>Paiement</h3>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-secondary">Montant total</dt>
                    <dd className="font-semibold text-on-surface text-right">{formatFCFA(project.budget)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 items-center">
                    <dt className="text-secondary">Acompte</dt>
                    <dd className="text-right">
                      {project.requires_deposit ? (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                            project.deposit_received ? 'bg-emerald-100 text-emerald-700' : 'bg-error-container text-error'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px]">{project.deposit_received ? 'check_circle' : 'schedule'}</span>
                          {project.deposit_received ? 'Reçu' : 'En attente'}
                        </span>
                      ) : (
                        <span className="font-semibold text-on-surface">Non requis</span>
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 items-center">
                    <dt className="text-secondary">Paiement final</dt>
                    <dd className="text-right">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                          project.final_payment_received ? 'bg-emerald-100 text-emerald-700' : 'bg-error-container text-error'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">{project.final_payment_received ? 'check_circle' : 'schedule'}</span>
                        {project.final_payment_received ? 'Reçu' : 'En attente'}
                      </span>
                    </dd>
                  </div>
                </dl>
                {currentStep === 'PAIEMENT_FINAL' &&
                  (canRecordPayments ? (
                    <button
                      className={`${ADVANCE_BUTTON_CLASSES} w-full mt-4 justify-center`}
                      onClick={() => navigate('/finance')}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">payments</span>
                      Enregistrer l'encaissement
                    </button>
                  ) : (
                    <p className="text-xs text-error flex items-center gap-1 mt-4">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      En attente de la confirmation du paiement final par la Comptabilité.
                    </p>
                  ))}
              </div>

              <div className="bg-surface-container-lowest border border-outline-variant p-5">
                <h3 className={`${CARD_TITLE_CLASSES} mb-3`}>Contact</h3>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-9 h-9 rounded-full bg-primary-container text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {getInitials(contact.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-on-surface truncate">{contact.name}</p>
                    <p className="text-xs text-secondary truncate">{contact.company || contact.entity_type_display}</p>
                  </div>
                </div>
                <div className="space-y-2 text-xs text-on-surface-variant">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[15px] text-secondary shrink-0">call</span>
                    <span className="truncate">{contact.phone || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[15px] text-secondary shrink-0">mail</span>
                    <span className="truncate">{contact.email || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[15px] text-secondary shrink-0">business_center</span>
                    <span className="truncate">{contact.sector || '—'}</span>
                  </div>
                </div>

                <button
                  className="flex items-center justify-center gap-1.5 px-3 py-2 w-full mt-4 border border-outline-variant text-on-surface text-xs font-bold rounded-lg hover:bg-surface-container-high transition-colors"
                  onClick={() => navigate(`/clients/${contact.id}`)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  Voir la fiche
                </button>
              </div>

              <NotesCard notes={notes} onAdd={handleAddNote} onDelete={handleDeleteNote} onEdit={handleEditNote} />
            </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-12 gap-gutter items-start">
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-gutter">
            <div className="bg-surface-container-lowest border border-outline-variant p-5">
              <h3 className={`${CARD_TITLE_CLASSES} mb-5`}>Étapes du workflow</h3>
              <div className="flex flex-col">
                {STEP_DEFINITIONS.map((step, index) => {
                  const isDone = index < currentIndex;
                  const isCurrent = index === currentIndex;
                  const stageForStep = STEP_TO_STAGE[step.key];
                  const doneStepInteractions = isDone && stageForStep ? interactions.filter((item) => item.stage === stageForStep) : [];
                  return (
                    <div className="flex gap-3" key={step.key}>
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            isDone
                              ? 'bg-primary text-white'
                              : isCurrent
                                ? 'bg-white border-2 border-primary text-primary shadow-[0_0_0_4px_rgba(139,26,14,0.15)]'
                                : 'bg-surface-container-high text-secondary'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">{isDone ? 'check' : step.icon}</span>
                        </div>
                        {index < STEP_DEFINITIONS.length - 1 && (
                          <div className={`w-[2px] flex-1 min-h-[16px] ${isDone ? 'bg-primary' : 'bg-outline-variant'}`} />
                        )}
                      </div>
                      <div className={`flex-1 min-w-0 ${index < STEP_DEFINITIONS.length - 1 ? 'pb-5' : ''}`}>
                        <p className={`text-sm ${isCurrent ? 'font-bold text-on-surface' : isDone ? 'font-medium text-on-surface' : 'text-secondary'}`}>
                          {step.label}
                        </p>
                        {isCurrent && <div className="mt-3 p-3.5 bg-surface-container-low rounded-lg">{renderStepPanel(currentStep)}</div>}
                        {isDone && doneStepInteractions.length > 0 && (
                          <div className="mt-2 space-y-1.5">
                            {doneStepInteractions.map((item) => {
                              const meta = INTERACTION_TYPE_OPTIONS.find((option) => option.value === item.interaction_type);
                              return (
                                <div className="flex items-start gap-2 bg-surface-container-low/60 rounded-lg p-2" key={item.id}>
                                  <span className="material-symbols-outlined text-[14px] text-primary shrink-0 mt-0.5">{meta?.icon ?? 'chat'}</span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold text-on-surface">{item.title || item.interaction_type_display}</p>
                                    {item.description && <p className="text-[11px] text-secondary">{item.description}</p>}
                                    <p className="text-[10px] text-outline mt-0.5">
                                      {item.created_by_name} · {formatDateTime(item.occurred_at)}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 flex flex-col gap-gutter">
            <div className="bg-surface-container-lowest border border-outline-variant p-5">
              <h3 className={`${CARD_TITLE_CLASSES} mb-4`}>Contact</h3>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-full bg-primary-container text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {getInitials(contact.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-on-surface truncate">{contact.name}</p>
                  <p className="text-xs text-secondary truncate">{contact.company || contact.entity_type_display}</p>
                </div>
              </div>
              <div className="space-y-2 text-xs text-on-surface-variant">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[15px] text-secondary shrink-0">call</span>
                  <span className="truncate">{contact.phone || '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[15px] text-secondary shrink-0">mail</span>
                  <span className="truncate">{contact.email || '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[15px] text-secondary shrink-0">business_center</span>
                  <span className="truncate">{contact.sector || '—'}</span>
                </div>
              </div>

              <div className="mt-5 pt-5 border-t border-outline-variant">
                <p className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-3">Informations générales</p>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-secondary">Type de dossier</dt>
                    <dd className="font-semibold text-on-surface text-right">{RECORD_TYPE_LABELS[recordType]}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-secondary">Étape actuelle</dt>
                    <dd className="font-semibold text-on-surface text-right">{STEP_DEFINITIONS[currentIndex].label}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-secondary">Commercial</dt>
                    <dd className="font-semibold text-on-surface text-right">{contact.assigned_to_name ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-secondary">Créé le</dt>
                    <dd className="font-semibold text-on-surface text-right">{formatDateTime(contact.created_at)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-secondary">Prochaine relance</dt>
                    <dd className="font-semibold text-on-surface text-right">
                      {contact.next_followup_at ? formatDateTime(contact.next_followup_at) : 'Aucune'}
                    </dd>
                  </div>
                </dl>
              </div>

              <button
                className="flex items-center justify-center gap-1.5 px-3 py-2 w-full mt-4 border border-outline-variant text-on-surface text-xs font-bold rounded-lg hover:bg-surface-container-high transition-colors"
                onClick={() => navigate(contact.contact_type === 'CLIENT' ? `/clients/${contact.id}` : `/prospection/${contact.id}`)}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                Voir la fiche complète
              </button>
            </div>

            <NotesCard notes={notes} onAdd={handleAddNote} onDelete={handleDeleteNote} onEdit={handleEditNote} />

            <div className="bg-surface-container-lowest border border-outline-variant p-5">
              <h3 className={`${CARD_TITLE_CLASSES} mb-4`}>Opportunités</h3>
              {recordType === 'OPPORTUNITE' && project ? (
                <button
                  className="w-full text-left bg-white border border-outline-variant/60 rounded-lg p-3.5 hover:border-primary/40 hover:shadow-sm transition-all"
                  onClick={() => navigate(`/opportunites/${project.id}`)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-on-surface">{project.name}</p>
                    <span
                      className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        !project.requires_deposit || project.deposit_received ? 'bg-emerald-100 text-emerald-700' : 'bg-error-container text-error'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[12px]">
                        {!project.requires_deposit || project.deposit_received ? 'check_circle' : 'schedule'}
                      </span>
                      {!project.requires_deposit ? 'Sans acompte' : project.deposit_received ? 'Acompte reçu' : 'Acompte en attente'}
                    </span>
                  </div>
                  {project.description && <p className="text-xs text-secondary italic mt-1.5">« {project.description} »</p>}
                  <dl className="space-y-2 text-sm mt-3">
                    <div className="flex justify-between gap-3">
                      <dt className="text-secondary">Budget</dt>
                      <dd className="font-semibold text-on-surface text-right">{formatFCFA(project.budget)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-secondary">Échéance</dt>
                      <dd className="font-semibold text-on-surface text-right">{formatProjectDeadline(project.deadline)}</dd>
                    </div>
                  </dl>
                </button>
              ) : (
                <div className="text-center py-4">
                  <span className="material-symbols-outlined text-secondary text-[22px]">emoji_objects</span>
                  <p className="text-sm font-semibold text-on-surface mt-1.5">Aucune opportunité pour l'instant</p>
                  <p className="text-xs text-secondary mt-0.5">Ce dossier est encore classé en prospection.</p>
                  <button
                    className="flex items-center justify-center gap-1.5 px-3 py-2 w-full mt-3 border border-dashed border-outline-variant text-secondary text-xs font-bold rounded-lg hover:bg-surface-container-high hover:text-on-surface transition-colors"
                    onClick={() => navigate(`/opportunites/nouvelle?client=${contact.id}`)}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Créer une opportunité
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
              className="px-5 py-2.5 rounded bg-on-primary-fixed-variant text-white font-body-sm text-body-sm font-bold hover:bg-primary transition-colors disabled:opacity-50"
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

      <Modal
        footer={
          <>
            <button
              className="px-5 py-2.5 rounded border border-outline-variant text-on-surface font-body-sm text-body-sm hover:bg-surface-container-high transition-colors"
              onClick={() => setIsQualificationOpen(false)}
              type="button"
            >
              Annuler
            </button>
            <button
              className="px-5 py-2.5 rounded bg-primary text-white font-body-sm text-body-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
              disabled={isAdvancing}
              form="qualification-form"
              type="submit"
            >
              {isAdvancing ? 'Enregistrement...' : 'Terminer la qualification'}
            </button>
          </>
        }
        isOpen={isQualificationOpen}
        maxWidthClassName="max-w-md"
        onClose={() => setIsQualificationOpen(false)}
        title="Qualifier le besoin"
      >
        <form className="space-y-1.5" id="qualification-form" onSubmit={handleQualificationSubmit}>
          <label className="font-label-md text-label-md text-on-surface-variant uppercase" htmlFor="qualification-note">
            Besoin exprimé par le prospect
          </label>
          <textarea
            autoFocus
            className="w-full px-3 py-2 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container outline-none min-h-[100px] resize-none"
            id="qualification-note"
            onChange={(event) => setQualificationNote(event.target.value)}
            placeholder="Ce que le prospect cherche à obtenir..."
            value={qualificationNote}
          />
        </form>
      </Modal>

      <Modal
        footer={
          <>
            <button
              className="px-5 py-2.5 rounded border border-outline-variant text-on-surface font-body-sm text-body-sm hover:bg-surface-container-high transition-colors"
              onClick={() => setIsDevisModalOpen(false)}
              type="button"
            >
              Annuler
            </button>
            <button
              className="px-5 py-2.5 rounded bg-primary text-white font-body-sm text-body-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
              disabled={isSubmittingDevis}
              form="devis-form"
              type="submit"
            >
              {isSubmittingDevis ? 'Envoi en cours...' : 'Soumettre à validation'}
            </button>
          </>
        }
        isOpen={isDevisModalOpen}
        maxWidthClassName="max-w-md"
        onClose={() => setIsDevisModalOpen(false)}
        title="Soumettre le devis à validation"
      >
        <form className="space-y-4" id="devis-form" onSubmit={handleDevisSubmit}>
          <div className="space-y-1.5">
            <label className="font-label-md text-label-md text-on-surface-variant uppercase" htmlFor="devis-file">
              Fichier du devis
            </label>
            <label
              className="flex items-center gap-2 px-3 py-2.5 bg-white border border-dashed border-outline-variant rounded text-sm cursor-pointer hover:border-primary/40 transition-colors"
              htmlFor="devis-file"
            >
              <span className="material-symbols-outlined text-[18px] text-primary shrink-0">upload_file</span>
              <span className={devisFile ? 'text-on-surface truncate' : 'text-outline'}>
                {devisFile ? devisFile.name : 'Choisir un fichier...'}
              </span>
              <input
                className="hidden"
                id="devis-file"
                onChange={(event) => {
                  setDevisFile(event.target.files?.[0] ?? null);
                  setDevisError(null);
                }}
                type="file"
              />
            </label>
          </div>

          <div className="space-y-1.5">
            <label className="font-label-md text-label-md text-on-surface-variant uppercase">Validateur(s)</label>
            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
              {validators.map((validatorUser) => (
                <label
                  className="flex items-center gap-2.5 px-3 py-2 bg-white border border-outline-variant rounded text-sm cursor-pointer hover:bg-surface-container-low transition-colors"
                  key={validatorUser.id}
                >
                  <input
                    checked={selectedValidatorIds.includes(validatorUser.id)}
                    className="w-4 h-4 text-primary focus:ring-primary rounded-sm border-outline"
                    onChange={() => {
                      toggleValidator(validatorUser.id);
                      setDevisError(null);
                    }}
                    type="checkbox"
                  />
                  <span className="text-on-surface">
                    {validatorUser.first_name} {validatorUser.last_name}
                  </span>
                  <span className="ml-auto text-[10px] font-bold uppercase text-secondary shrink-0">{validatorUser.role_display}</span>
                </label>
              ))}
              {validators.length === 0 && <p className="text-xs text-secondary">Aucun validateur disponible pour l'instant.</p>}
            </div>
          </div>

          {devisError && <p className="text-xs text-error font-semibold">{devisError}</p>}
        </form>
      </Modal>

      <Modal
        footer={
          <>
            <button
              className="px-5 py-2.5 rounded border border-outline-variant text-on-surface font-body-sm text-body-sm hover:bg-surface-container-high transition-colors"
              onClick={() => setIsGagneModalOpen(false)}
              type="button"
            >
              Annuler
            </button>
            <button
              className="px-5 py-2.5 rounded bg-emerald-600 text-white font-body-sm text-body-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
              disabled={isSubmittingOutcome}
              form="gagne-form"
              type="submit"
            >
              {isSubmittingOutcome ? 'Enregistrement...' : 'Confirmer'}
            </button>
          </>
        }
        isOpen={isGagneModalOpen}
        maxWidthClassName="max-w-sm"
        onClose={() => setIsGagneModalOpen(false)}
        title="Opportunité gagnée"
      >
        <form className="space-y-1.5" id="gagne-form" onSubmit={handleGagneSubmit}>
          <label className="font-label-md text-label-md text-on-surface-variant uppercase" htmlFor="gagne-montant">
            Montant final (FCFA)
          </label>
          <input
            autoFocus
            className="w-full px-3 py-2 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container outline-none"
            id="gagne-montant"
            min="0"
            onChange={(event) => setGagneMontant(event.target.value)}
            placeholder="Ex : 2500000"
            required
            type="number"
            value={gagneMontant}
          />
        </form>
      </Modal>

      <Modal
        footer={
          <>
            <button
              className="px-5 py-2.5 rounded border border-outline-variant text-on-surface font-body-sm text-body-sm hover:bg-surface-container-high transition-colors"
              onClick={() => setIsPerduModalOpen(false)}
              type="button"
            >
              Annuler
            </button>
            <button
              className="px-5 py-2.5 rounded bg-error text-white font-body-sm text-body-sm font-bold hover:bg-error/90 transition-colors disabled:opacity-50"
              disabled={isSubmittingOutcome}
              form="perdu-form"
              type="submit"
            >
              {isSubmittingOutcome ? 'Enregistrement...' : 'Confirmer'}
            </button>
          </>
        }
        isOpen={isPerduModalOpen}
        maxWidthClassName="max-w-sm"
        onClose={() => setIsPerduModalOpen(false)}
        title="Opportunité perdue"
      >
        <form className="space-y-1.5" id="perdu-form" onSubmit={handlePerduSubmit}>
          <label className="font-label-md text-label-md text-on-surface-variant uppercase" htmlFor="perdu-raison">
            Raison
          </label>
          <textarea
            autoFocus
            className="w-full px-3 py-2 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container outline-none min-h-[100px] resize-none"
            id="perdu-raison"
            onChange={(event) => setPerduRaison(event.target.value)}
            placeholder="Pourquoi cette opportunité a été perdue..."
            required
            value={perduRaison}
          />
        </form>
      </Modal>

      <Modal
        footer={
          <>
            <button
              className="px-5 py-2.5 rounded border border-outline-variant text-on-surface font-body-sm text-body-sm hover:bg-surface-container-high transition-colors"
              onClick={() => setIsExecutionModalOpen(false)}
              type="button"
            >
              Annuler
            </button>
            <button
              className="px-5 py-2.5 rounded bg-on-primary-fixed-variant text-white font-body-sm text-body-sm font-bold hover:bg-primary transition-colors disabled:opacity-50"
              disabled={!executionDivisionId || isSubmittingExecution}
              form="execution-form"
              type="submit"
            >
              {isSubmittingExecution ? 'Envoi...' : 'Transmettre le dossier'}
            </button>
          </>
        }
        isOpen={isExecutionModalOpen}
        maxWidthClassName="max-w-sm"
        onClose={() => setIsExecutionModalOpen(false)}
        title="Transmettre l'exécution"
      >
        <form className="space-y-3" id="execution-form" onSubmit={handleExecutionSubmit}>
          <div className="space-y-1.5">
            <label className="font-label-md text-label-md text-on-surface-variant uppercase" htmlFor="execution-division">
              Division responsable
            </label>
            <select
              className="w-full px-3 py-2 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container outline-none appearance-none"
              id="execution-division"
              onChange={(event) => setExecutionDivisionId(event.target.value)}
              value={executionDivisionId}
            >
              <option value="" disabled>
                Choisir une division...
              </option>
              {divisions.map((division) => (
                <option key={division.id} value={division.id}>
                  {division.name}
                </option>
              ))}
            </select>
            {(() => {
              const selected = divisions.find((d) => d.id === Number(executionDivisionId));
              const chiefLabel = selected ? getDivisionChiefLabel(selected.name) : null;
              return (
                chiefLabel && (
                  <p className="text-[11px] text-secondary flex items-center gap-1 pt-0.5">
                    <span className="material-symbols-outlined text-[13px] shrink-0">notifications</span>
                    {chiefLabel} sera notifié à l'enregistrement.
                  </p>
                )
              );
            })()}
          </div>
          <div className="space-y-1.5">
            <label className="font-label-md text-label-md text-on-surface-variant uppercase" htmlFor="execution-note">
              Détails de production
            </label>
            <textarea
              className="w-full px-3 py-2 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container outline-none min-h-[100px] resize-none"
              id="execution-note"
              onChange={(event) => setExecutionNote(event.target.value)}
              placeholder="Précisions utiles pour la production : quantités, finitions, contraintes..."
              value={executionNote}
            />
          </div>
          {executionError && <p className="text-xs text-error font-semibold">{executionError}</p>}
        </form>
      </Modal>

      <Modal
        footer={
          <>
            <button
              className="px-5 py-2.5 rounded border border-outline-variant text-on-surface font-body-sm text-body-sm hover:bg-surface-container-high transition-colors"
              onClick={() => setIsDeliveryModalOpen(false)}
              type="button"
            >
              Annuler
            </button>
            <button
              className="px-5 py-2.5 rounded bg-emerald-600 text-white font-body-sm text-body-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
              disabled={!deliveryDate || isConfirmingDelivery}
              form="delivery-form"
              type="submit"
            >
              {isConfirmingDelivery ? 'Enregistrement...' : 'Confirmer'}
            </button>
          </>
        }
        isOpen={isDeliveryModalOpen}
        maxWidthClassName="max-w-sm"
        onClose={() => setIsDeliveryModalOpen(false)}
        title="Confirmer la livraison"
      >
        <form className="space-y-3" id="delivery-form" onSubmit={handleConfirmDelivery}>
          <div className="space-y-1.5">
            <label className="font-label-md text-label-md text-on-surface-variant uppercase" htmlFor="delivery-date">
              Date de livraison
            </label>
            <input
              autoFocus
              className="w-full px-3 py-2 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container outline-none"
              id="delivery-date"
              onChange={(event) => setDeliveryDate(event.target.value)}
              required
              type="datetime-local"
              value={deliveryDate}
            />
            <p className="text-[11px] text-secondary pt-0.5">Enregistrée sur le calendrier collaboratif à la confirmation.</p>
          </div>
          {deliveryError && <p className="text-xs text-error font-semibold">{deliveryError}</p>}
        </form>
      </Modal>
    </div>
  );
}
