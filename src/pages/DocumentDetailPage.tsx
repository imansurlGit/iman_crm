import { useEffect, useRef, useState, type FormEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  createDocument,
  createDocumentAnnotation,
  getDocument,
  toggleDocumentAnnotationResolved,
  updateDocumentStatus,
  reviewDocument,
  resubmitDocument,
  updateDocumentValidators,
  type AnnotationKind,
  type Document as GedDocument,
  type DocumentAnnotation,
  type DocumentStatus,
  type DocumentType as DocType,
  type ReviewDecision,
} from '../services/documentService';
import { listDirectory, type CurrentUser } from '../services/userService';
import { getTask, updateTask, type Task } from '../services/taskService';

// L'identité du document, le circuit de validation (validateurs, décisions,
// historique), l'historique des versions et les annotations sur l'aperçu
// (repère/cercle) sont tous réels, chargés depuis le backend — persistées
// par version, pour que le déposant les retrouve à la réouverture. Seul un
// validateur désigné peut en ajouter, au même titre qu'il peut ajouter
// d'autres validateurs.

const DOC_TYPE_LABELS: Record<DocType, string> = {
  CONTRAT: 'Contrat',
  CONVENTION: 'Convention',
  DEVIS: 'Devis',
  FACTURE: 'Facture',
  BRIEF: 'Brief',
  FICHE_BAT: 'Fiche BAT',
  VISUEL: 'Visuel',
  PRESENTATION: 'Présentation',
  LIVRABLE_FINAL: 'Livrable final',
  JUSTIFICATIF: 'Justificatif',
  RAPPORT: 'Rapport',
};

const STATUS_LABELS: Record<DocumentStatus, string> = {
  A_VALIDER: 'En attente de validation',
  VALIDE: 'Validé',
  MODIFICATIONS_DEMANDEES: 'Modifications demandées',
  REJETE: 'Rejeté',
  PIECE_JOINTE: 'Pièce jointe',
};

const STATUS_CLASSES: Record<DocumentStatus, string> = {
  A_VALIDER: 'bg-amber-100 text-amber-700',
  VALIDE: 'bg-emerald-100 text-emerald-700',
  MODIFICATIONS_DEMANDEES: 'bg-orange-100 text-orange-700',
  REJETE: 'bg-red-100 text-red-700',
  PIECE_JOINTE: 'bg-gray-100 text-gray-700',
};

const DECISION_CLASSES: Record<ReviewDecision, string> = {
  SOUMIS: 'bg-surface-container-high text-secondary',
  VALIDE: 'bg-emerald-100 text-emerald-700',
  MODIFICATIONS_DEMANDEES: 'bg-orange-100 text-orange-700',
  REJETE: 'bg-red-100 text-red-700',
};

// Les chefs de division sont les seuls habilités à valider (mêmes rôles que
// l'entrée "Validations" du menu, voir Sidebar.tsx).
const VALIDATOR_ROLES = ['CDN', 'CDV', 'CDM', 'DG'];

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'];

function isImageFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTENSIONS.includes(ext);
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

interface AnnotationDraft {
  kind: AnnotationKind;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

const COMPACT_INPUT_CLASSES =
  'w-full px-3 py-2 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container outline-none';

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Mode création : atteint via /documents/nouveau?task=<id>&project=<id>&label=<...>
  // — route statique sans param `:id`, donc `id` vaut `undefined` ici (pas
  // "nouveau") ; on détecte le mode via l'absence de param plutôt qu'une
  // comparaison de chaîne. Upload du fichier directement dans l'aperçu et
  // choix du validateur, plutôt qu'un formulaire séparé.
  const isCreateMode = !id;
  const createTaskId = searchParams.get('task');
  const createProjectId = searchParams.get('project');
  const createLabel = searchParams.get('label') || 'Nouveau document';

  const [doc, setDoc] = useState<GedDocument | null>(null);
  const [isLoading, setIsLoading] = useState(!isCreateMode);
  const [loadError, setLoadError] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    setLoadError(false);
    getDocument(Number(id))
      .then((data) => {
        setDoc(data);
        setSelectedVersionId(data.versions.at(-1)?.id ?? null);
      })
      .catch(() => setLoadError(true))
      .finally(() => setIsLoading(false));
  }, [id]);

  const [colleagues, setColleagues] = useState<CurrentUser[]>([]);
  useEffect(() => {
    listDirectory().then((users) => setColleagues(users.filter((u) => VALIDATOR_ROLES.includes(u.role ?? ''))));
  }, []);

  // Tâche liée (developpeur/graphiste) — permet de proposer "Marquer la
  // tâche comme terminée" une fois le document validé, sans page intermédiaire.
  const [relatedTask, setRelatedTask] = useState<Task | null>(null);
  const [isMarkingTaskDone, setIsMarkingTaskDone] = useState(false);
  useEffect(() => {
    if (!doc?.task) {
      setRelatedTask(null);
      return;
    }
    getTask(doc.task).then(setRelatedTask);
  }, [doc?.task]);

  // Hooks du mode consultation (document existant) — déclarés inconditionnellement
  // même en mode création, pour respecter les règles des hooks React (voir le
  // early return juste après le formulaire de création ci-dessous).
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);

  const [decisionComment, setDecisionComment] = useState('');
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const [newVersionFile, setNewVersionFile] = useState<File | null>(null);
  const [newVersionComment, setNewVersionComment] = useState('');
  const [isSubmittingVersion, setIsSubmittingVersion] = useState(false);
  const [newVersionError, setNewVersionError] = useState<string | null>(null);

  const [newValidatorId, setNewValidatorId] = useState('');
  const [isAddingValidator, setIsAddingValidator] = useState(false);

  const [activeTool, setActiveTool] = useState<AnnotationKind | null>(null);
  const [draft, setDraft] = useState<AnnotationDraft | null>(null);
  const [draftComment, setDraftComment] = useState('');
  const [isSavingAnnotation, setIsSavingAnnotation] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const [newDocFile, setNewDocFile] = useState<File | null>(null);
  const [newDocPreviewUrl, setNewDocPreviewUrl] = useState<string | null>(null);
  const [isDraggingNewDocFile, setIsDraggingNewDocFile] = useState(false);
  const [newDocValidatorIds, setNewDocValidatorIds] = useState<number[]>([]);
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);
  const [createDocError, setCreateDocError] = useState<string | null>(null);

  function pickNewDocFile(file: File | null) {
    setNewDocFile(file);
    setCreateDocError(null);
    setNewDocPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  function toggleNewDocValidator(userId: number) {
    setNewDocValidatorIds((prev) => (prev.includes(userId) ? prev.filter((v) => v !== userId) : [...prev, userId]));
    setCreateDocError(null);
  }

  async function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isCreatingDoc) return;
    if (!newDocFile) {
      setCreateDocError('Choisissez un fichier.');
      return;
    }
    if (newDocValidatorIds.length === 0) {
      setCreateDocError('Choisissez au moins un validateur.');
      return;
    }
    if (!createProjectId) {
      setCreateDocError('Projet introuvable pour cette soumission.');
      return;
    }
    setIsCreatingDoc(true);
    try {
      const formData = new FormData();
      formData.append('owner_type', 'PROJECT');
      formData.append('project', createProjectId);
      if (createTaskId) formData.append('task', createTaskId);
      formData.append('document_type', 'LIVRABLE_FINAL');
      formData.append('status', 'A_VALIDER');
      formData.append('label', createLabel);
      formData.append('file', newDocFile);
      newDocValidatorIds.forEach((validatorId) => formData.append('validators', String(validatorId)));
      const created = await createDocument(formData);
      navigate(`/documents/${created.id}`, { replace: true });
    } catch {
      setCreateDocError("Impossible d'envoyer ce document. Vérifiez les champs et réessayez.");
    } finally {
      setIsCreatingDoc(false);
    }
  }

  if (isCreateMode) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col gap-gutter">
        <div>
          <nav className="flex items-center gap-1.5 mb-2 text-on-surface-variant text-xs font-medium">
            <button className="hover:text-primary transition-colors cursor-pointer" onClick={() => navigate(-1)} type="button">
              Retour
            </button>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-on-surface">Nouvelle soumission</span>
          </nav>
          <h2 className="font-headline-md text-xl font-bold text-on-surface tracking-tight">{createLabel}</h2>
          <p className="text-sm text-secondary mt-1">Envoyez votre fichier pour validation.</p>
        </div>

        <form className="grid grid-cols-12 gap-gutter items-start" onSubmit={handleCreateSubmit}>
          <div className="col-span-12 lg:col-span-8">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm">
              <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide mb-2">Aperçu</p>
              {newDocFile ? (
                <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border border-outline-variant bg-white">
                  {newDocPreviewUrl && isImageFile(newDocFile.name) ? (
                    <img alt="" className="absolute inset-0 w-full h-full object-contain" src={newDocPreviewUrl} />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-secondary">
                      <div className="w-16 h-16 rounded-full bg-primary-container/10 text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-[28px]">description</span>
                      </div>
                      <span className="text-sm font-semibold text-on-surface px-6 text-center truncate max-w-full">{newDocFile.name}</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex items-center gap-1.5">
                    <label
                      className="w-8 h-8 inline-flex items-center justify-center bg-white/95 text-secondary hover:text-primary rounded-lg shadow-sm transition-colors cursor-pointer"
                      title="Changer le fichier"
                    >
                      <span className="material-symbols-outlined text-[18px]">sync</span>
                      <input className="hidden" onChange={(event) => pickNewDocFile(event.target.files?.[0] ?? null)} type="file" />
                    </label>
                    <button
                      className="w-8 h-8 inline-flex items-center justify-center bg-white/95 text-secondary hover:text-error rounded-lg shadow-sm transition-colors"
                      onClick={() => pickNewDocFile(null)}
                      title="Retirer le fichier"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  className={`flex flex-col items-center justify-center gap-3 w-full aspect-[4/3] rounded-lg border-2 border-dashed cursor-pointer transition-colors text-center ${
                    isDraggingNewDocFile
                      ? 'border-primary bg-primary-container/10'
                      : 'border-outline-variant bg-surface-container-low hover:border-primary/50 hover:bg-primary-container/5'
                  }`}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    setIsDraggingNewDocFile(false);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDraggingNewDocFile(true);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setIsDraggingNewDocFile(false);
                    const file = event.dataTransfer.files?.[0] ?? null;
                    if (file) pickNewDocFile(file);
                  }}
                >
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center shadow-sm transition-colors ${
                      isDraggingNewDocFile ? 'bg-primary text-white' : 'bg-white text-primary border border-outline-variant'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[28px]">upload_file</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">Cliquez pour choisir un fichier</p>
                    <p className="text-xs text-secondary mt-0.5">ou glissez-déposez votre visuel ici</p>
                  </div>
                  <input className="hidden" onChange={(event) => pickNewDocFile(event.target.files?.[0] ?? null)} type="file" />
                </label>
              )}
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 flex flex-col gap-gutter">
            <div className="bg-surface-container-lowest border border-outline-variant p-5">
              <h3 className="font-headline-md text-base font-bold text-on-surface mb-3">Validateur(s)</h3>
              <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
                {colleagues.map((validatorUser) => (
                  <label
                    className="flex items-center gap-2.5 px-3 py-2 bg-white border border-outline-variant rounded text-sm cursor-pointer hover:bg-surface-container-low transition-colors"
                    key={validatorUser.id}
                  >
                    <input
                      checked={newDocValidatorIds.includes(validatorUser.id)}
                      className="w-4 h-4 text-primary focus:ring-primary rounded-sm border-outline"
                      onChange={() => toggleNewDocValidator(validatorUser.id)}
                      type="checkbox"
                    />
                    <span className="text-on-surface">
                      {validatorUser.first_name} {validatorUser.last_name}
                    </span>
                    <span className="ml-auto text-[10px] font-bold uppercase text-secondary shrink-0">{validatorUser.role_display}</span>
                  </label>
                ))}
                {colleagues.length === 0 && <p className="text-xs text-secondary">Aucun validateur disponible pour l'instant.</p>}
              </div>
            </div>

            {createDocError && <p className="text-xs text-error font-semibold">{createDocError}</p>}

            <button
              className="flex items-center justify-center gap-1.5 bg-primary text-white py-2.5 rounded-full text-sm font-bold shadow-sm hover:shadow-md hover:bg-on-primary-fixed-variant active:scale-95 transition-all disabled:opacity-40"
              disabled={isCreatingDoc}
              type="submit"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              {isCreatingDoc ? 'Envoi...' : 'Envoyer pour validation'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  async function handleMarkTaskDone() {
    if (!relatedTask || relatedTask.done || isMarkingTaskDone) return;
    setIsMarkingTaskDone(true);
    try {
      setRelatedTask(await updateTask(relatedTask.id, { done: true }));
    } finally {
      setIsMarkingTaskDone(false);
    }
  }

  async function handleDecision(decision: Extract<ReviewDecision, 'VALIDE' | 'MODIFICATIONS_DEMANDEES' | 'REJETE'>) {
    if (!doc || isUpdatingStatus) return;
    if (decision !== 'VALIDE' && !decisionComment.trim()) {
      setDecisionError('Un commentaire est requis pour demander une modification ou rejeter.');
      return;
    }
    setIsUpdatingStatus(true);
    try {
      const updated = await reviewDocument(doc.id, decision, decisionComment.trim());
      setDoc(updated);
      setDecisionComment('');
      setDecisionError(null);
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function handleNewVersionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!doc || isSubmittingVersion) return;
    if (!newVersionFile) {
      setNewVersionError('Joignez le nouveau fichier.');
      return;
    }
    setIsSubmittingVersion(true);
    try {
      const updated = await resubmitDocument(doc.id, newVersionComment.trim(), newVersionFile);
      setDoc(updated);
      setSelectedVersionId(updated.versions.at(-1)?.id ?? null);
      setNewVersionFile(null);
      setNewVersionComment('');
      setNewVersionError(null);
    } finally {
      setIsSubmittingVersion(false);
    }
  }

  async function handleAddValidator() {
    if (!doc || !newValidatorId || isAddingValidator) return;
    setIsAddingValidator(true);
    try {
      const updated = await updateDocumentValidators(doc.id, [...doc.validators, Number(newValidatorId)]);
      setDoc(updated);
      setNewValidatorId('');
    } finally {
      setIsAddingValidator(false);
    }
  }

  function validatorStatus(validatorId: number) {
    if (!doc) return { label: 'En attente', classes: 'bg-amber-100 text-amber-700' };
    const lastDecision = [...doc.reviews].reverse().find((r) => r.author === validatorId && r.decision !== 'SOUMIS');
    if (!lastDecision) return { label: 'En attente', classes: 'bg-amber-100 text-amber-700' };
    return { label: lastDecision.decision_display, classes: DECISION_CLASSES[lastDecision.decision] };
  }

  function positionFromEvent(event: ReactMouseEvent<HTMLDivElement>): { x: number; y: number } | null {
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100));
    return { x, y };
  }

  function handlePreviewClick(event: ReactMouseEvent<HTMLDivElement>) {
    if (activeTool !== 'PIN') return;
    const pos = positionFromEvent(event);
    if (!pos) return;
    setDraft({ kind: 'PIN', x: pos.x, y: pos.y });
    setDraftComment('');
    setActiveTool(null);
  }

  function handleMouseDown(event: ReactMouseEvent<HTMLDivElement>) {
    if (activeTool !== 'CIRCLE') return;
    const pos = positionFromEvent(event);
    if (!pos) return;
    setDragStart(pos);
    setDragCurrent(pos);
  }

  function handleMouseMove(event: ReactMouseEvent<HTMLDivElement>) {
    if (!dragStart) return;
    const pos = positionFromEvent(event);
    if (pos) setDragCurrent(pos);
  }

  function handleMouseUp() {
    if (!dragStart || !dragCurrent) return;
    const x = Math.min(dragStart.x, dragCurrent.x);
    const y = Math.min(dragStart.y, dragCurrent.y);
    const width = Math.abs(dragCurrent.x - dragStart.x);
    const height = Math.abs(dragCurrent.y - dragStart.y);
    setDragStart(null);
    setDragCurrent(null);
    if (width < 3 || height < 3) return;
    setDraft({ kind: 'CIRCLE', x, y, width, height });
    setDraftComment('');
    setActiveTool(null);
  }

  async function saveDraft() {
    if (!draft || !draftComment.trim() || !activeVersion || isSavingAnnotation) return;
    setIsSavingAnnotation(true);
    try {
      const created = await createDocumentAnnotation({
        version: activeVersion.id,
        kind: draft.kind,
        x: draft.x,
        y: draft.y,
        width: draft.width,
        height: draft.height,
        comment: draftComment.trim(),
      });
      setDoc((prev) =>
        prev
          ? {
              ...prev,
              versions: prev.versions.map((v) =>
                v.id === activeVersion.id ? { ...v, annotations: [...v.annotations, created] } : v,
              ),
            }
          : prev,
      );
      setDraft(null);
      setDraftComment('');
    } finally {
      setIsSavingAnnotation(false);
    }
  }

  function cancelDraft() {
    setDraft(null);
    setDraftComment('');
  }

  async function toggleResolved(annotation: DocumentAnnotation) {
    const updated = await toggleDocumentAnnotationResolved(annotation.id, !annotation.resolved);
    setDoc((prev) =>
      prev
        ? {
            ...prev,
            versions: prev.versions.map((v) =>
              v.id === updated.version ? { ...v, annotations: v.annotations.map((a) => (a.id === updated.id ? updated : a)) } : v,
            ),
          }
        : prev,
    );
  }

  if (isLoading) {
    return <p className="font-body-sm text-body-sm text-secondary">Chargement...</p>;
  }

  if (loadError || !doc) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="text-secondary text-sm mb-4">Ce document est introuvable.</p>
        <button className="text-sm font-bold text-primary hover:underline" onClick={() => navigate('/documents')} type="button">
          Retour aux documents
        </button>
      </div>
    );
  }

  const latestVersion = doc.versions.at(-1) ?? null;
  const activeVersion = doc.versions.find((v) => v.id === selectedVersionId) ?? latestVersion;
  const previewFile = activeVersion?.file ?? doc.file;
  const isLinkOnly = !previewFile && !!doc.link;
  const filename = previewFile ? previewFile.split('/').pop() ?? doc.label : doc.label;
  const isImage = !isLinkOnly && isImageFile(filename);
  const ownerName = (doc.owner_type === 'CONTACT' ? doc.contact_name : doc.project_name) ?? '—';
  const isValidator = !!user && doc.validators.includes(user.id);
  const canDecide = isValidator && doc.status === 'A_VALIDER';
  const isOwner = !!user && doc.uploaded_by === user.id;
  const canAddVersion = isOwner && doc.status === 'MODIFICATIONS_DEMANDEES';
  const canMarkTaskDone = isOwner && doc.status === 'VALIDE' && !!relatedTask && !relatedTask.done;
  const annotations = activeVersion?.annotations ?? [];
  const sortedAnnotations = [...annotations].sort((a, b) => a.id - b.id);

  return (
    <div className="flex flex-col gap-gutter">
      {/* Header */}
      <section className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <nav className="flex items-center gap-1.5 mb-2 text-on-surface-variant text-xs font-medium">
            <button className="hover:text-primary transition-colors cursor-pointer" onClick={() => navigate('/documents')} type="button">
              Documents
            </button>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-on-surface">Détails</span>
          </nav>
          <h2 className="font-headline-md text-xl font-bold text-on-surface tracking-tight">{doc.label}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-primary/5 border border-primary/20 text-primary">
              {DOC_TYPE_LABELS[doc.document_type]}
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-surface-container-high text-secondary">
              {ownerName}
            </span>
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${STATUS_CLASSES[doc.status]}`}>
              {STATUS_LABELS[doc.status]}
            </span>
          </div>
        </div>
      </section>

      {canMarkTaskDone && (
        <div className="bg-blue-50 border border-blue-200 p-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-blue-900">Document validé</p>
            <p className="text-xs text-blue-800 mt-0.5">Vous pouvez maintenant clôturer la tâche associée.</p>
          </div>
          <button
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 shrink-0"
            disabled={isMarkingTaskDone}
            onClick={handleMarkTaskDone}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            {isMarkingTaskDone ? 'Enregistrement...' : 'Marquer la tâche comme terminée'}
          </button>
        </div>
      )}

      {relatedTask?.done && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          Tâche terminée — aucune action supplémentaire requise.
        </div>
      )}

      <div className="grid grid-cols-12 gap-gutter items-start">
        {/* Colonne gauche : aperçu (+ annotations pour les validateurs) */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-gutter">
          <div className="bg-surface-container-lowest border border-outline-variant p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              {isValidator ? (
                <div className="flex items-center gap-1 p-1 bg-surface-container border border-outline-variant rounded-xl">
                  <button
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeTool === 'PIN' ? 'bg-white text-primary shadow-sm' : 'text-secondary hover:text-on-surface'
                    }`}
                    onClick={() => setActiveTool((prev) => (prev === 'PIN' ? null : 'PIN'))}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">push_pin</span>
                    Commentaire
                  </button>
                  <button
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeTool === 'CIRCLE' ? 'bg-white text-primary shadow-sm' : 'text-secondary hover:text-on-surface'
                    }`}
                    onClick={() => setActiveTool((prev) => (prev === 'CIRCLE' ? null : 'CIRCLE'))}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">panorama_fish_eye</span>
                    Encercler
                  </button>
                </div>
              ) : (
                <div />
              )}

              {doc.versions.length > 1 && (
                <div className="relative">
                  <select
                    className="bg-surface-container border border-outline-variant rounded-lg py-1.5 pl-3 pr-8 text-xs font-bold appearance-none focus:outline-none focus:border-primary-container"
                    onChange={(event) => setSelectedVersionId(Number(event.target.value))}
                    value={activeVersion?.id ?? ''}
                  >
                    {doc.versions.map((version, index) => (
                      <option key={version.id} value={version.id}>
                        V{index + 1}
                        {index === doc.versions.length - 1 ? ' · actuelle' : ''}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline text-sm pointer-events-none">
                    expand_more
                  </span>
                </div>
              )}
            </div>

            {isValidator && activeTool && (
              <p className="text-xs text-primary font-semibold mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">{activeTool === 'PIN' ? 'touch_app' : 'gesture'}</span>
                {activeTool === 'PIN' ? 'Cliquez sur le visuel pour ajouter un commentaire.' : 'Cliquez-glissez sur le visuel pour encercler une zone.'}
              </p>
            )}

            <div
              className={`relative w-full aspect-[4/3] rounded-lg overflow-hidden border border-outline-variant select-none ${
                isValidator && activeTool && !isLinkOnly ? 'cursor-crosshair' : 'cursor-default'
              }`}
              onClick={isValidator && !isLinkOnly ? handlePreviewClick : undefined}
              onMouseDown={isValidator && !isLinkOnly ? handleMouseDown : undefined}
              onMouseMove={isValidator && !isLinkOnly ? handleMouseMove : undefined}
              onMouseUp={isValidator && !isLinkOnly ? handleMouseUp : undefined}
              ref={previewRef}
            >
              {isLinkOnly ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-container-low">
                  <span className="material-symbols-outlined text-primary text-4xl">link</span>
                  <a className="text-sm font-bold text-primary hover:underline break-all px-6 text-center" href={doc.link} rel="noreferrer" target="_blank">
                    {doc.link}
                  </a>
                </div>
              ) : isImage ? (
                <img alt={doc.label} className="absolute inset-0 w-full h-full object-contain bg-white pointer-events-none" src={previewFile ?? undefined} />
              ) : (
                <iframe className="absolute inset-0 w-full h-full border-0 bg-white pointer-events-none" src={previewFile ?? undefined} title={doc.label} />
              )}

              {sortedAnnotations.map((annotation, index) =>
                annotation.kind === 'PIN' ? (
                  <div
                    className={`absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-md ${
                      annotation.resolved ? 'bg-secondary' : 'bg-primary'
                    }`}
                    key={annotation.id}
                    style={{ left: `${annotation.x}%`, top: `${annotation.y}%` }}
                    title={annotation.comment}
                  >
                    {index + 1}
                  </div>
                ) : (
                  <div
                    className={`absolute rounded-full border-[3px] ${annotation.resolved ? 'border-secondary' : 'border-error'}`}
                    key={annotation.id}
                    style={{
                      left: `${annotation.x}%`,
                      top: `${annotation.y}%`,
                      width: `${annotation.width}%`,
                      height: `${annotation.height}%`,
                    }}
                    title={annotation.comment}
                  >
                    <span
                      className={`absolute -top-2.5 -left-2.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                        annotation.resolved ? 'bg-secondary' : 'bg-error'
                      }`}
                    >
                      {index + 1}
                    </span>
                  </div>
                ),
              )}

              {dragStart && dragCurrent && (
                <div
                  className="absolute rounded-full border-[3px] border-dashed border-primary bg-primary/10"
                  style={{
                    left: `${Math.min(dragStart.x, dragCurrent.x)}%`,
                    top: `${Math.min(dragStart.y, dragCurrent.y)}%`,
                    width: `${Math.abs(dragCurrent.x - dragStart.x)}%`,
                    height: `${Math.abs(dragCurrent.y - dragStart.y)}%`,
                  }}
                />
              )}

              {draft && draft.kind === 'PIN' && (
                <div
                  className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/60 border-2 border-dashed border-white flex items-center justify-center text-[11px] font-bold text-white animate-pulse"
                  style={{ left: `${draft.x}%`, top: `${draft.y}%` }}
                />
              )}
              {draft && draft.kind === 'CIRCLE' && (
                <div
                  className="absolute rounded-full border-[3px] border-dashed border-primary bg-primary/10 animate-pulse"
                  style={{ left: `${draft.x}%`, top: `${draft.y}%`, width: `${draft.width}%`, height: `${draft.height}%` }}
                />
              )}
            </div>

            {draft && (
              <div className="mt-3 p-3.5 bg-surface-container-low rounded-lg">
                <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide">
                  {draft.kind === 'PIN' ? 'Commentaire' : 'Ce qui doit être corrigé dans cette zone'}
                </label>
                <textarea
                  autoFocus
                  className={`${COMPACT_INPUT_CLASSES} resize-none h-16 mt-1`}
                  onChange={(event) => setDraftComment(event.target.value)}
                  placeholder="Décrivez la correction attendue..."
                  value={draftComment}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    className="px-3.5 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-on-primary-fixed-variant transition-colors disabled:opacity-40"
                    disabled={!draftComment.trim() || isSavingAnnotation}
                    onClick={saveDraft}
                    type="button"
                  >
                    {isSavingAnnotation ? 'Enregistrement...' : "Enregistrer l'annotation"}
                  </button>
                  <button
                    className="px-3.5 py-2 border border-outline-variant text-on-surface text-xs font-bold rounded-lg hover:bg-surface-container-high transition-colors"
                    onClick={cancelDraft}
                    type="button"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mt-3 text-xs text-secondary">
              <span>
                {isLinkOnly ? 'Lien' : filename} · Déposé par {doc.uploaded_by_name ?? 'Inconnu'} le {formatDateTime(doc.uploaded_at)}
              </span>
              {!isLinkOnly && (
                <a className="text-primary font-bold hover:underline shrink-0" href={previewFile ?? undefined} rel="noreferrer" target="_blank">
                  Ouvrir le fichier
                </a>
              )}
            </div>
          </div>

          {/* Annotations — visibles pour tous, ajoutées par les validateurs uniquement */}
          {annotations.length > 0 && (
            <div className="bg-surface-container-lowest border border-outline-variant p-5">
              <h3 className="font-headline-md text-base font-bold text-on-surface mb-3 flex items-center gap-2">
                Annotations sur le visuel
                <span className="bg-surface-container-high px-1.5 py-0.5 rounded-full text-[11px] font-bold text-secondary">
                  {annotations.length}
                </span>
              </h3>
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {sortedAnnotations.map((annotation, index) => (
                  <div className="flex gap-2.5" key={annotation.id}>
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5 ${
                        annotation.resolved ? 'bg-secondary' : annotation.kind === 'CIRCLE' ? 'bg-error' : 'bg-primary'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${annotation.resolved ? 'line-through text-secondary' : 'text-on-surface'}`}>{annotation.comment}</p>
                      <p className="text-[11px] text-secondary">
                        {annotation.author_name ?? '—'} · {formatDateTime(annotation.created_at)}
                      </p>
                    </div>
                    {isValidator && (
                      <button
                        className="text-secondary hover:text-primary transition-colors shrink-0"
                        onClick={() => toggleResolved(annotation)}
                        title={annotation.resolved ? 'Marquer comme non résolu' : 'Marquer comme résolu'}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {annotation.resolved ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Colonne droite : validateurs, décision, historique, versions */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-gutter">
          {doc.status === 'PIECE_JOINTE' ? (
            <div className="bg-surface-container-lowest border border-outline-variant p-5">
              <h3 className="font-headline-md text-base font-bold text-on-surface mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-secondary">attach_file</span>
                Pièce jointe
              </h3>
              <p className="text-sm text-secondary mb-3">
                Ce document est une simple pièce jointe de référence — il ne nécessite pas de validation.
              </p>
              <button
                className="text-xs font-bold text-primary hover:underline disabled:opacity-40"
                disabled={isUpdatingStatus}
                onClick={async () => {
                  if (!doc) return;
                  setIsUpdatingStatus(true);
                  try {
                    setDoc(await updateDocumentStatus(doc.id, 'A_VALIDER'));
                  } finally {
                    setIsUpdatingStatus(false);
                  }
                }}
                type="button"
              >
                Soumettre pour validation
              </button>
            </div>
          ) : (
            <>
              {/* Validateurs */}
              <div className="bg-surface-container-lowest border border-outline-variant p-5">
                <h3 className="font-headline-md text-base font-bold text-on-surface mb-3">Validateurs</h3>
                <div className="space-y-2">
                  {doc.validators_detail.map((validator) => {
                    const status = validatorStatus(validator.id);
                    return (
                      <div className="flex items-center gap-2.5" key={validator.id}>
                        <div className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                          {getInitials(validator.name)}
                        </div>
                        <span className="text-sm text-on-surface flex-1 truncate">{validator.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${status.classes}`}>
                          {status.label}
                        </span>
                      </div>
                    );
                  })}
                  {doc.validators_detail.length === 0 && <p className="text-sm text-secondary">Aucun validateur désigné.</p>}
                </div>
                {isValidator && doc.status === 'A_VALIDER' && colleagues.some((c) => !doc.validators.includes(c.id)) && (
                  <div className="flex gap-2 mt-3">
                    <div className="relative flex-1">
                      <select
                        className={`${COMPACT_INPUT_CLASSES} appearance-none`}
                        onChange={(event) => setNewValidatorId(event.target.value)}
                        value={newValidatorId}
                      >
                        <option value="">Ajouter un validateur...</option>
                        {colleagues
                          .filter((c) => !doc.validators.includes(c.id))
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.first_name} {c.last_name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <button
                      className="px-3 py-2 bg-surface-container-high text-on-surface text-xs font-bold rounded hover:bg-surface-container-highest transition-colors shrink-0 disabled:opacity-40"
                      disabled={!newValidatorId || isAddingValidator}
                      onClick={handleAddValidator}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Décision — réservée aux validateurs désignés */}
              {canDecide ? (
                <div className="bg-surface-container-lowest border border-outline-variant p-5">
                  <h3 className="font-headline-md text-base font-bold text-on-surface mb-3">Votre décision</h3>
                  <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide">
                    Commentaire <span className="normal-case font-normal text-secondary">(requis pour modification ou rejet)</span>
                  </label>
                  <textarea
                    className={`${COMPACT_INPUT_CLASSES} resize-none h-16 mt-1`}
                    onChange={(event) => {
                      setDecisionComment(event.target.value);
                      setDecisionError(null);
                    }}
                    placeholder="Votre avis sur ce document..."
                    value={decisionComment}
                  />
                  {decisionError && <p className="text-xs text-error font-semibold mt-1.5">{decisionError}</p>}
                  <div className="flex flex-col gap-2 mt-3">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-error text-white text-xs font-bold rounded-lg hover:bg-error/90 transition-colors disabled:opacity-50"
                        disabled={isUpdatingStatus}
                        onClick={() => handleDecision('REJETE')}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">block</span>
                        Rejeté
                      </button>
                      <button
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
                        disabled={isUpdatingStatus}
                        onClick={() => handleDecision('MODIFICATIONS_DEMANDEES')}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit_note</span>
                        à Modifier
                      </button>
                    </div>
                    <button
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      disabled={isUpdatingStatus}
                      onClick={() => handleDecision('VALIDE')}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      Validé
                    </button>
                  </div>
                </div>
              ) : canAddVersion ? (
                <form
                  className="bg-orange-50/40 border border-orange-200 p-5"
                  id="new-version-form"
                  onSubmit={handleNewVersionSubmit}
                >
                  <p className="flex items-center gap-1.5 text-sm font-bold text-orange-800 mb-3">
                    <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                    Corrections apportées ? Envoyez une nouvelle version
                  </p>
                  <label
                    className="flex items-center gap-2 px-3 py-2.5 bg-white border border-dashed border-outline-variant rounded text-sm cursor-pointer hover:border-primary/40 transition-colors"
                    htmlFor="new-version-file"
                  >
                    <span className="material-symbols-outlined text-[18px] text-primary shrink-0">upload_file</span>
                    <span className={newVersionFile ? 'text-on-surface truncate' : 'text-outline'}>
                      {newVersionFile ? newVersionFile.name : 'Choisir le nouveau fichier...'}
                    </span>
                    <input
                      className="hidden"
                      id="new-version-file"
                      onChange={(event) => {
                        setNewVersionFile(event.target.files?.[0] ?? null);
                        setNewVersionError(null);
                      }}
                      type="file"
                    />
                  </label>
                  <textarea
                    className={`${COMPACT_INPUT_CLASSES} resize-none h-16 mt-2`}
                    onChange={(event) => setNewVersionComment(event.target.value)}
                    placeholder="Ce qui a été corrigé depuis la dernière remarque..."
                    value={newVersionComment}
                  />
                  {newVersionError && <p className="text-xs text-error font-semibold mt-1.5">{newVersionError}</p>}
                  <button
                    className="flex items-center gap-1.5 px-3.5 py-2 mt-3 bg-primary text-white text-xs font-bold rounded-lg hover:bg-on-primary-fixed-variant transition-colors disabled:opacity-50"
                    disabled={isSubmittingVersion}
                    type="submit"
                  >
                    <span className="material-symbols-outlined text-[16px]">send</span>
                    {isSubmittingVersion ? 'Envoi...' : 'Envoyer pour validation'}
                  </button>
                </form>
              ) : (
                <div className="bg-surface-container-lowest border border-outline-variant p-5">
                  <h3 className="font-headline-md text-base font-bold text-on-surface mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-secondary">lock</span>
                    Décision
                  </h3>
                  <p className="text-sm text-secondary">
                    {doc.status === 'A_VALIDER'
                      ? 'Ce document est en cours de validation. Seuls les validateurs désignés peuvent valider, demander des modifications ou rejeter.'
                      : 'Ce document a déjà été traité — voir l\'historique ci-dessous.'}
                  </p>
                </div>
              )}
            </>
          )}

          {/* Historique des validations */}
          <div className="bg-surface-container-lowest border border-outline-variant p-5">
            <h3 className="font-headline-md text-base font-bold text-on-surface mb-3">Historique des retours</h3>
            {doc.reviews.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {[...doc.reviews].reverse().map((entry) => (
                  <div className="flex gap-2.5" key={entry.id}>
                    <div className="w-7 h-7 rounded-full bg-primary-container text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                      {getInitials(entry.author_name ?? '—')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-on-surface">{entry.author_name ?? '—'}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${DECISION_CLASSES[entry.decision]}`}>
                          {entry.decision_display}
                        </span>
                      </div>
                      {entry.comment && <p className="text-xs text-on-surface-variant mt-0.5">{entry.comment}</p>}
                      <p className="text-[11px] text-secondary mt-0.5">{formatDateTime(entry.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-secondary">Aucun retour enregistré pour l'instant.</p>
            )}
          </div>

          {/* Versions */}
          <div className="bg-surface-container-lowest border border-outline-variant p-5">
            <h3 className="font-headline-md text-base font-bold text-on-surface mb-3 flex items-center gap-2">
              Versions
              <span className="bg-surface-container-high px-1.5 py-0.5 rounded-full text-[11px] font-bold text-secondary">
                {doc.versions.length}
              </span>
            </h3>
            <div className="space-y-2">
              {[...doc.versions].reverse().map((version, reversedIndex) => {
                const index = doc.versions.length - 1 - reversedIndex;
                const isLatest = index === doc.versions.length - 1;
                return (
                  <button
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-colors ${
                      version.id === activeVersion?.id ? 'border-primary bg-primary-container/10' : 'border-outline-variant hover:bg-surface-container-high'
                    }`}
                    key={version.id}
                    onClick={() => setSelectedVersionId(version.id)}
                    type="button"
                  >
                    <span className="text-sm font-bold text-on-surface">V{index + 1}</span>
                    {isLatest && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700">
                        Actuelle
                      </span>
                    )}
                    <span className="text-[11px] text-secondary ml-auto shrink-0 truncate">
                      {version.uploaded_by_name ?? '—'} · {formatDateTime(version.uploaded_at)}
                    </span>
                  </button>
                );
              })}
              {doc.versions.length === 0 && <p className="text-sm text-secondary">Aucune version enregistrée.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
