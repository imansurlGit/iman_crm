import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getContact, type Contact } from '../services/contactService';
import { createDocument, listDocuments, type Document as GedDocument } from '../services/documentService';
import { getDivisionChiefLabel, getDivisionIcon, listDivisions, type Division } from '../services/divisionService';
import PrestationChiefView from './PrestationChiefView';
import { listPrestationTasks, type Task } from '../services/taskService';
import {
  createPrestation,
  deletePrestation,
  getProject,
  updatePrestation,
  updateProjectStatus,
  PRIORITY_BADGE_CLASSES,
  STATUS_BADGE_CLASSES,
  type Prestation,
  type Project,
} from '../services/projectService';

// Affecter une prestation à une division notifie le chef de cette division
// (voir `PrestationViewSet.perform_create/perform_update` côté backend).

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatMoney(value: string | null): string {
  if (!value) return '—';
  return `${Number(value).toLocaleString('fr-FR')} FCFA`;
}

function isoToDatetimeLocal(value: string): string {
  const date = new Date(value);
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

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'];

function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (ext === 'pdf') return 'picture_as_pdf';
  if (['doc', 'docx'].includes(ext)) return 'description';
  if (['xls', 'xlsx'].includes(ext)) return 'table_chart';
  if (['zip', 'rar', '7z'].includes(ext)) return 'folder_zip';
  return 'attach_file';
}

const COMPACT_INPUT_CLASSES =
  'w-full px-3 py-2 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container outline-none';
const LABEL_CLASSES = 'font-label-md text-label-md text-on-surface-variant uppercase tracking-wide';
const ICON_BUTTON_CLASSES =
  'w-8 h-8 inline-flex items-center justify-center text-secondary hover:bg-surface-container-low hover:text-on-surface rounded-lg transition-colors shrink-0';

interface PrestationFormModalProps {
  projectId: number;
  projectDeadline: string | null;
  prestation?: Prestation | null;
  onClose: () => void;
  onSaved: () => void;
}

function PrestationFormModal({ projectId, projectDeadline, prestation, onClose, onSaved }: PrestationFormModalProps) {
  const isEdit = !!prestation;
  const [label, setLabel] = useState(prestation?.label ?? '');
  const [deadline, setDeadline] = useState(prestation ? isoToDatetimeLocal(prestation.deadline) : '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!label.trim() || !deadline) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const deadlineIso = new Date(deadline).toISOString();
      if (isEdit && prestation) {
        await updatePrestation(prestation.id, { label: label.trim(), deadline: deadlineIso });
      } else {
        await createPrestation({ project: projectId, label: label.trim(), deadline: deadlineIso, division: null });
      }
      onSaved();
    } catch {
      setError("Impossible d'enregistrer cette prestation. Vérifiez l'échéance et réessayez.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose} role="presentation">
      <form
        className="bg-white border border-outline-variant rounded-xl p-5 shadow-lg w-full max-w-sm"
        onClick={(domEvent) => domEvent.stopPropagation()}
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <h4 className="text-sm font-bold text-on-surface">{isEdit ? 'Modifier la prestation' : 'Ajouter une prestation'}</h4>
          <button className="text-secondary hover:text-on-surface shrink-0" onClick={onClose} type="button">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <div className="space-y-1">
            <label className={LABEL_CLASSES} htmlFor="prestation-label">
              Intitulé
            </label>
            <input
              className={COMPACT_INPUT_CLASSES}
              id="prestation-label"
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Ex : maquette logo"
              type="text"
              value={label}
            />
          </div>
          <div className="space-y-1">
            <label className={LABEL_CLASSES} htmlFor="prestation-deadline">
              Échéance
            </label>
            <input
              className={COMPACT_INPUT_CLASSES}
              id="prestation-deadline"
              max={projectDeadline ? projectDeadline.slice(0, 16) : undefined}
              onChange={(event) => setDeadline(event.target.value)}
              type="datetime-local"
              value={deadline}
            />
            {projectDeadline && (
              <p className="text-[11px] text-secondary">Ne peut pas dépasser l'échéance globale du projet ({formatDateTime(projectDeadline)}).</p>
            )}
          </div>
          {error && <p className="text-xs text-error font-medium">{error}</p>}
          <button
            className="w-full flex items-center justify-center gap-1.5 bg-primary text-white py-2.5 rounded-full text-sm font-bold shadow-sm hover:shadow-md hover:bg-on-primary-fixed-variant active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none mt-1"
            disabled={!label.trim() || !deadline || isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </form>
    </div>
  );
}

function PrestationDetailModal({ prestation, files, onClose }: { prestation: Prestation; files: GedDocument[]; onClose: () => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    listPrestationTasks(prestation.id)
      .then(setTasks)
      .catch(() => setTasks([]))
      .finally(() => setIsLoading(false));
  }, [prestation.id]);

  const doneCount = tasks.filter((task) => task.done).length;
  const progress = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose} role="presentation">
      <div
        className="bg-white border border-outline-variant rounded-xl p-5 shadow-lg w-full max-w-md max-h-[85vh] overflow-y-auto"
        onClick={(domEvent) => domEvent.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-9 h-9 rounded-lg bg-primary-container/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">add_task</span>
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-secondary">Détail de la prestation</p>
              <h4 className="text-sm font-bold text-on-surface leading-snug truncate">{prestation.label}</h4>
            </div>
          </div>
          <button className="text-secondary hover:text-on-surface shrink-0" onClick={onClose} type="button">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-on-surface">Avancement</span>
            <span className="font-bold text-primary">{progress}%</span>
          </div>
          <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${progress >= 100 ? 'bg-emerald-500' : 'bg-primary'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[11px] text-secondary">
            {doneCount} / {tasks.length} tâches terminées
          </p>
        </div>

        <div className="space-y-2 text-sm mt-4 pt-4 border-t border-outline-variant">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px] text-secondary shrink-0">schedule</span>
            {formatDateTime(prestation.deadline)}
          </div>
          <div className="flex items-center gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px] text-secondary shrink-0">
              {prestation.division_name ? getDivisionIcon(prestation.division_name) : 'help'}
            </span>
            {prestation.division_name ?? 'Non affectée'}
          </div>
        </div>

        {(prestation.note || files.length > 0) && (
          <div className="mt-4 pt-4 border-t border-outline-variant">
            <p className="text-[11px] font-bold uppercase tracking-wider text-secondary mb-2">Consignes transmises</p>
            {prestation.note && <p className="text-sm text-on-surface-variant">{prestation.note}</p>}
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {files.map((file) => {
                  const filename = file.file ? (file.file.split('/').pop() ?? file.label) : file.label;
                  return (
                    <a
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-container-low border border-outline-variant rounded-full text-xs text-secondary hover:border-primary hover:text-primary transition-colors"
                      href={file.file || file.link}
                      key={file.id}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <span className="material-symbols-outlined text-[14px]">{file.file ? getFileIcon(filename) : 'link'}</span>
                      {file.label || filename}
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-outline-variant">
          <p className="text-[11px] font-bold uppercase tracking-wider text-secondary mb-2">Tâches</p>
          {isLoading ? (
            <p className="text-xs text-secondary">Chargement...</p>
          ) : (
            <div className="space-y-1.5">
              {tasks.map((task) => (
                <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-surface-container-low/60" key={task.id}>
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      task.done ? 'bg-emerald-500' : 'border-2 border-outline-variant'
                    }`}
                  >
                    {task.done && <span className="material-symbols-outlined text-white text-[12px]">check</span>}
                  </span>
                  <span className={`text-sm flex-1 min-w-0 truncate ${task.done ? 'line-through text-secondary' : 'text-on-surface font-medium'}`}>
                    {task.label}
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    {task.assignee_name ? (
                      <>
                        <span className="w-5 h-5 rounded-full bg-primary-container text-white flex items-center justify-center text-[9px] font-bold">
                          {getInitials(task.assignee_name)}
                        </span>
                        <span className="text-[11px] text-secondary">{task.assignee_name}</span>
                      </>
                    ) : (
                      <span className="text-[11px] text-secondary italic">Non assigné</span>
                    )}
                  </span>
                </div>
              ))}
              {tasks.length === 0 && <p className="text-xs text-secondary italic">Aucune tâche pour l'instant.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface AffectDivisionModalProps {
  prestation: Prestation;
  projectId: number;
  onClose: () => void;
  onAssigned: () => void;
}

function AffectDivisionModal({ prestation, projectId, onClose, onAssigned }: AffectDivisionModalProps) {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [divisionId, setDivisionId] = useState(prestation.division ? String(prestation.division) : '');
  const [note, setNote] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listDivisions()
      .then(setDivisions)
      .catch(() => setDivisions([]));
  }, []);

  const selectedDivision = divisions.find((d) => d.id === Number(divisionId)) ?? null;
  const chiefLabel = selectedDivision ? getDivisionChiefLabel(selectedDivision.name) : null;

  function handleFilesChange(event: ChangeEvent<HTMLInputElement>) {
    setFiles((prev) => [...prev, ...Array.from(event.target.files ?? [])]);
    event.target.value = '';
  }

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((file) => file.name !== name));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!divisionId) return;
    setIsSubmitting(true);
    setError(null);

    try {
      await updatePrestation(prestation.id, { division: Number(divisionId), note: note.trim() || undefined });
    } catch (err) {
      console.error("Échec de l'affectation à la division :", err);
      setError("Impossible d'affecter cette prestation. Vérifiez les champs et réessayez.");
      setIsSubmitting(false);
      return;
    }

    // L'affectation ci-dessus est l'action principale — un échec d'upload
    // (réseau, fichier trop lourd...) ne doit ni l'annuler ni le masquer,
    // seulement le signaler distinctement.
    if (files.length > 0) {
      const results = await Promise.allSettled(
        files.map((file) => {
          const formData = new FormData();
          formData.append('owner_type', 'PROJECT');
          formData.append('project', String(projectId));
          formData.append('prestation', String(prestation.id));
          formData.append('document_type', 'BRIEF');
          formData.append('label', file.name);
          formData.append('file', file);
          return createDocument(formData);
        }),
      );
      const failed = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
      if (failed.length > 0) {
        failed.forEach((result) => console.error("Échec de la jointure d'un fichier :", result.reason));
        setError(
          `Division affectée, mais ${failed.length} fichier${failed.length > 1 ? 's n’ont' : ' n’a'} pas pu être joint${failed.length > 1 ? 's' : ''}.`,
        );
        setIsSubmitting(false);
        return;
      }
    }

    setIsSubmitting(false);
    onAssigned();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose} role="presentation">
      <form
        className="bg-white border border-outline-variant rounded-xl p-5 shadow-lg w-full max-w-sm max-h-[90vh] overflow-y-auto"
        onClick={(domEvent) => domEvent.stopPropagation()}
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-9 h-9 rounded-lg bg-primary-container/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">assignment_turned_in</span>
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-secondary">Affecter à une division</p>
              <h4 className="text-sm font-bold text-on-surface leading-snug truncate">{prestation.label}</h4>
            </div>
          </div>
          <button className="text-secondary hover:text-on-surface shrink-0" onClick={onClose} type="button">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="space-y-1">
            <label className={LABEL_CLASSES} htmlFor="affect-division">
              Division
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">
                {selectedDivision ? getDivisionIcon(selectedDivision.name) : 'category'}
              </span>
              <select
                className={`${COMPACT_INPUT_CLASSES} appearance-none pl-10 pr-8`}
                id="affect-division"
                onChange={(event) => setDivisionId(event.target.value)}
                value={divisionId}
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
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">
                expand_more
              </span>
            </div>
            {chiefLabel && (
              <p className="text-[11px] text-secondary flex items-center gap-1 pt-1">
                <span className="material-symbols-outlined text-[13px] shrink-0">notifications</span>
                {chiefLabel} sera notifié à l'enregistrement.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className={LABEL_CLASSES} htmlFor="affect-note">
              Note <span className="normal-case font-normal text-secondary">(optionnelle)</span>
            </label>
            <textarea
              className={`${COMPACT_INPUT_CLASSES} resize-none`}
              id="affect-note"
              onChange={(event) => setNote(event.target.value)}
              placeholder="Précisions utiles pour la division : contexte, attentes, contraintes..."
              rows={3}
              value={note}
            />
          </div>

          <div className="space-y-1">
            <label className={LABEL_CLASSES}>
              Fichiers joints <span className="normal-case font-normal text-secondary">(optionnels)</span>
            </label>
            <label
              className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-outline-variant rounded-lg py-5 cursor-pointer hover:border-primary hover:bg-surface-container-low/50 transition-colors text-center"
              htmlFor="affect-files"
            >
              <span className="material-symbols-outlined text-[20px] text-secondary">upload_file</span>
              <span className="text-xs font-semibold text-secondary px-2">Cliquez pour joindre un ou plusieurs fichiers</span>
            </label>
            <input className="hidden" id="affect-files" multiple onChange={handleFilesChange} type="file" />
            {files.length > 0 && (
              <ul className="space-y-1.5 mt-2">
                {files.map((file) => (
                  <li className="flex items-center gap-2 px-2.5 py-1.5 bg-surface-container-low rounded text-xs" key={file.name}>
                    <span className="material-symbols-outlined text-[14px] text-secondary shrink-0">description</span>
                    <span className="truncate flex-1">{file.name}</span>
                    <button className="text-secondary hover:text-error shrink-0" onClick={() => removeFile(file.name)} type="button">
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <p className="text-xs text-error font-medium">{error}</p>}

          <button
            className="w-full flex items-center justify-center gap-1.5 bg-primary text-white py-2.5 rounded-full text-sm font-bold shadow-sm hover:shadow-md hover:bg-on-primary-fixed-variant active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none mt-1"
            disabled={!divisionId || isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Enregistrement...' : 'Affecter à la division'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ProjetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient] = useState<Contact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [formModal, setFormModal] = useState<'new' | Prestation | null>(null);
  const [detailPrestation, setDetailPrestation] = useState<Prestation | null>(null);
  const [affectingPrestation, setAffectingPrestation] = useState<Prestation | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [documents, setDocuments] = useState<GedDocument[]>([]);

  function loadProject(projectId: number) {
    setIsLoading(true);
    setLoadError(false);
    return getProject(projectId)
      .then(async (data) => {
        setProject(data);
        const contact = await getContact(data.client).catch(() => null);
        setClient(contact);
        const docs = await listDocuments({ project: projectId }).catch(() => []);
        setDocuments(docs);
      })
      .catch(() => setLoadError(true))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    if (!id) return;
    loadProject(Number(id));
  }, [id]);

  const isOwner = !!user && !!project && user.id === project.created_by;

  // Un chef de division (pas le détenteur du projet) qui a au moins une
  // prestation affectée à sa division voit un poste de travail différent :
  // bref aperçu du projet, puis répartition en tâches pour son équipe.
  const myDivisionPrestations =
    project && user?.division_name ? project.prestations.filter((p) => p.division_name === user.division_name) : [];
  const isChiefView = !isOwner && myDivisionPrestations.length > 0;

  // Une prestation est « terminée » quand elle a au moins une tâche et
  // qu'elles sont toutes faites (voir services/taskService.ts).
  const [allPrestationsComplete, setAllPrestationsComplete] = useState(false);

  useEffect(() => {
    if (!project || project.prestations.length === 0) {
      setAllPrestationsComplete(false);
      return;
    }
    Promise.all(project.prestations.map((prestation) => listPrestationTasks(prestation.id)))
      .then((taskLists) => {
        setAllPrestationsComplete(taskLists.every((tasks) => tasks.length > 0 && tasks.every((task) => task.done)));
      })
      .catch(() => setAllPrestationsComplete(false));
  }, [project]);

  const isAlreadyClosed = project?.status === 'CLOTURE';
  const canCloseProject = allPrestationsComplete && !isAlreadyClosed;

  async function handleCloseProject() {
    if (!project || !canCloseProject) return;
    setIsClosing(true);
    try {
      await updateProjectStatus(project.id, 'CLOTURE');
      await loadProject(project.id);
    } finally {
      setIsClosing(false);
    }
  }

  async function handleDeletePrestation(prestation: Prestation) {
    setOpenMenuId(null);
    if (!window.confirm(`Supprimer la prestation « ${prestation.label} » ? Cette action est irréversible.`)) return;
    await deletePrestation(prestation.id);
    if (project) loadProject(project.id);
  }

  if (isLoading) {
    return <p className="font-body-sm text-body-sm text-secondary">Chargement...</p>;
  }

  if (loadError || !project) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="text-secondary text-sm mb-4">Ce projet est introuvable.</p>
        <button className="text-sm font-bold text-primary hover:underline" onClick={() => navigate('/projets')} type="button">
          Retour aux projets
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1.5 mb-2 text-on-surface-variant text-xs font-medium">
            <button className="hover:text-primary transition-colors cursor-pointer" onClick={() => navigate('/projets')} type="button">
              Projets
            </button>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-on-surface">{project.name}</span>
          </nav>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-headline-md text-headline-md text-on-surface">{project.name}</h2>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_BADGE_CLASSES[project.status]}`}>
              {project.status_display}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${PRIORITY_BADGE_CLASSES[project.priority]}`}>
              {project.priority_display}
            </span>
          </div>
          <p className="text-secondary text-sm mt-1">
            {project.kind_display} · Créé par {project.created_by_name ?? '—'} le {formatDateTime(project.created_at)}
          </p>
        </div>
        {isOwner && (
          <button
            className="flex items-center gap-1.5 bg-primary text-white pl-3 pr-4 py-2 rounded-full text-xs font-bold shadow-sm hover:shadow-md hover:bg-on-primary-fixed-variant active:scale-95 transition-all shrink-0 disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none"
            disabled={!canCloseProject || isClosing}
            onClick={handleCloseProject}
            title={
              isAlreadyClosed
                ? 'Ce projet est déjà clôturé.'
                : !allPrestationsComplete
                  ? 'Toutes les prestations doivent être terminées avant de pouvoir clôturer le projet.'
                  : undefined
            }
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">{isAlreadyClosed ? 'check_circle' : 'task_alt'}</span>
            {isClosing ? 'Clôture...' : isAlreadyClosed ? 'Projet clôturé' : 'Clôturer le projet'}
          </button>
        )}
      </div>

      {isChiefView ? (
        <PrestationChiefView project={project} viewerDivisionId={user?.division ?? null} viewerDivisionName={user?.division_name ?? null} />
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter items-start">
        {/* Colonne principale */}
        <div className="lg:col-span-2 flex flex-col gap-gutter">
          {/* Informations du projet */}
          <section className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm">
            <h3 className="font-headline-md text-base font-bold text-on-surface mb-5">Informations du projet</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-label-md text-label-md text-on-surface-variant uppercase mb-1">Échéance globale</p>
                <p className="text-on-surface">{formatDateTime(project.deadline)}</p>
              </div>
              <div>
                <p className="font-label-md text-label-md text-on-surface-variant uppercase mb-1">Budget</p>
                <p className="text-on-surface">{formatMoney(project.budget)}</p>
              </div>
              <div>
                <p className="font-label-md text-label-md text-on-surface-variant uppercase mb-1">Acompte</p>
                <p className="text-on-surface">
                  {project.requires_deposit ? `Requis — ${formatMoney(project.deposit_amount)}` : 'Non requis'}
                </p>
              </div>
              {project.kind === 'OPPORTUNITE' && (
                <div>
                  <p className="font-label-md text-label-md text-on-surface-variant uppercase mb-1">Probabilité</p>
                  <p className="text-on-surface">{project.probability !== null ? `${project.probability}%` : '—'}</p>
                </div>
              )}
              {project.converted_at && (
                <div>
                  <p className="font-label-md text-label-md text-on-surface-variant uppercase mb-1">Converti en projet le</p>
                  <p className="text-on-surface">{formatDateTime(project.converted_at)}</p>
                </div>
              )}
            </div>
            {project.description && (
              <div className="mt-4 pt-4 border-t border-outline-variant">
                <p className="font-label-md text-label-md text-on-surface-variant uppercase mb-1">Description</p>
                <p className="text-on-surface text-sm whitespace-pre-wrap">{project.description}</p>
              </div>
            )}
          </section>

          {/* Prestations & Divisions */}
          <section className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-headline-md text-base font-bold text-on-surface">Prestations &amp; divisions</h3>
              <span className="text-xs text-secondary">
                {project.prestations.length} prestation{project.prestations.length > 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs text-secondary mb-5">Ce qu'il faut faire pour ce projet, et qui s'en charge.</p>

            <div className="space-y-2.5">
              {project.prestations.map((prestation) => (
                <div className="relative p-3.5 pr-10 rounded-lg border border-outline-variant bg-surface-container-low/40" key={prestation.id}>
                  <button
                    className={`${ICON_BUTTON_CLASSES} absolute top-1.5 right-1.5`}
                    onClick={() => setOpenMenuId((prev) => (prev === prestation.id ? null : prestation.id))}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                  </button>
                  {openMenuId === prestation.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                      <div className="absolute right-1.5 top-9 z-50 w-48 bg-white border border-outline-variant rounded-lg shadow-lg py-1.5">
                        <button
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-low transition-colors"
                          onClick={() => {
                            setOpenMenuId(null);
                            setDetailPrestation(prestation);
                          }}
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                          Voir le détail
                        </button>
                        {isOwner && (
                          <>
                            <button
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-low transition-colors"
                              onClick={() => {
                                setOpenMenuId(null);
                                setFormModal(prestation);
                              }}
                              type="button"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                              Modifier
                            </button>
                            <button
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-low transition-colors"
                              onClick={() => {
                                setOpenMenuId(null);
                                setAffectingPrestation(prestation);
                              }}
                              type="button"
                            >
                              <span className="material-symbols-outlined text-[16px]">assignment_turned_in</span>
                              Affecter à une division
                            </button>
                            <button
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-error hover:bg-error-container/20 transition-colors"
                              onClick={() => handleDeletePrestation(prestation)}
                              type="button"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                              Supprimer
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary-container/10 text-primary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[20px]">add_task</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-on-surface truncate">{prestation.label}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-secondary">{formatDateTime(prestation.deadline)}</p>
                        {documents.filter((d) => d.prestation === prestation.id).length > 0 && (
                          <span className="flex items-center gap-0.5 text-[11px] text-secondary">
                            <span className="material-symbols-outlined text-[13px]">attach_file</span>
                            {documents.filter((d) => d.prestation === prestation.id).length}
                          </span>
                        )}
                      </div>
                    </div>
                    {prestation.division_name ? (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-container/20 text-primary shrink-0">
                        <span className="material-symbols-outlined text-[14px]">{getDivisionIcon(prestation.division_name)}</span>
                        {prestation.division_name}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-container text-secondary italic shrink-0">
                        Non affectée
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {project.prestations.length === 0 && (
                <div className="text-center text-secondary text-sm py-8 border border-dashed border-outline-variant rounded-lg">
                  Aucune prestation pour l'instant.
                </div>
              )}
            </div>

            {isOwner && (
              <button
                className="w-full mt-3 py-2.5 border-2 border-dashed border-outline-variant rounded-lg text-secondary text-sm font-semibold hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1.5"
                onClick={() => setFormModal('new')}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Ajouter une prestation
              </button>
            )}
          </section>
        </div>

        {/* Colonne latérale */}
        <aside className="lg:sticky lg:top-6 flex flex-col gap-gutter">
          <section className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm">
            <h3 className="font-headline-md text-base font-bold text-on-surface mb-4">Client concerné</h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-lg bg-primary-container/10 text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">apartment</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-on-surface truncate">{client?.company || project.client_name}</p>
                {client && <p className="text-xs text-secondary truncate">{client.contact_type_display}</p>}
              </div>
            </div>
            {client && (
              <div className="space-y-2 text-sm text-on-surface-variant">
                {client.email && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-secondary shrink-0">mail</span>
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-secondary shrink-0">call</span>
                    {client.phone}
                  </div>
                )}
                {client.sector && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-secondary shrink-0">work</span>
                    {client.sector}
                  </div>
                )}
              </div>
            )}
            <button
              className="w-full mt-4 py-2 border border-outline-variant rounded-lg text-xs font-bold text-primary hover:bg-surface-container-low transition-colors"
              onClick={() => navigate(`/clients/${project.client}`)}
              type="button"
            >
              Voir la fiche client
            </button>
          </section>
        </aside>
      </div>
      )}

      {formModal && (
        <PrestationFormModal
          onClose={() => setFormModal(null)}
          onSaved={() => {
            setFormModal(null);
            loadProject(project.id);
          }}
          prestation={formModal === 'new' ? null : formModal}
          projectDeadline={project.deadline}
          projectId={project.id}
        />
      )}
      {detailPrestation && (
        <PrestationDetailModal
          files={documents.filter((d) => d.prestation === detailPrestation.id)}
          onClose={() => setDetailPrestation(null)}
          prestation={detailPrestation}
        />
      )}
      {affectingPrestation && (
        <AffectDivisionModal
          onAssigned={() => {
            setAffectingPrestation(null);
            loadProject(project.id);
          }}
          onClose={() => setAffectingPrestation(null)}
          prestation={affectingPrestation}
          projectId={project.id}
        />
      )}
    </div>
  );
}
