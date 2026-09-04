import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { listDocuments, type Document } from '../services/documentService';
import type { Prestation, Project } from '../services/projectService';
import {
  createPrestationTask,
  deleteTask,
  listPrestationTasks,
  updatePrestationTask,
  type Task,
  type TaskPriority,
} from '../services/taskService';
import { listDivisionMembers, type CurrentUser } from '../services/userService';

// Poste de travail du chef de division : bref aperçu du projet, puis pour
// chacune des prestations affectées à sa division — les consignes reçues du
// détenteur (`Prestation.note`, saisie à l'affectation) et les fichiers joints
// à ce moment-là (`Document.prestation`), et la répartition en tâches
// confiées à son équipe (voir services/taskService.ts et core.views.tasks.TaskViewSet).

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getFullName(user: CurrentUser): string {
  return `${user.first_name} ${user.last_name}`.trim() || user.email;
}

function isOverdue(task: Task): boolean {
  return !task.done && !!task.due_at && new Date(task.due_at) < new Date();
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

function isImageFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTENSIONS.includes(ext);
}

const PRIORITY_LABELS: Record<TaskPriority, string> = { HIGH: 'Élevée', MEDIUM: 'Moyenne', LOW: 'Faible' };
const PRIORITY_CLASSES: Record<TaskPriority, string> = {
  HIGH: 'bg-red-100 text-red-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LOW: 'bg-gray-100 text-gray-700',
};
const PRIORITY_BUTTON_CLASSES: Record<TaskPriority, { selected: string; unselected: string }> = {
  HIGH: { selected: 'bg-error text-white', unselected: 'bg-error-container/40 text-error' },
  MEDIUM: { selected: 'bg-primary text-white', unselected: 'bg-primary-fixed/40 text-primary' },
  LOW: { selected: 'bg-secondary text-white', unselected: 'bg-secondary-fixed/60 text-secondary' },
};

const COMPACT_INPUT_CLASSES =
  'w-full px-3 py-2 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container outline-none';
const LABEL_CLASSES = 'font-label-md text-label-md text-on-surface-variant uppercase tracking-wide';

interface TaskFormModalProps {
  prestationId: number;
  task: Task | 'new';
  deadline: string;
  onClose: () => void;
  onSaved: () => void;
}

function TaskFormModal({ prestationId, task, deadline, onClose, onSaved }: TaskFormModalProps) {
  const isEdit = task !== 'new';
  const [label, setLabel] = useState(isEdit ? task.label : '');
  const [description, setDescription] = useState(isEdit ? task.description : '');
  const [priority, setPriority] = useState<TaskPriority>(isEdit ? task.priority : 'MEDIUM');
  const [dueDate, setDueDate] = useState(isEdit && task.due_at ? task.due_at.slice(0, 10) : deadline.slice(0, 10));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!label.trim() || !dueDate) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const dueAt = new Date(dueDate).toISOString();
      if (isEdit) {
        await updatePrestationTask(task.id, { label: label.trim(), description: description.trim(), priority, due_at: dueAt });
      } else {
        await createPrestationTask({ prestation: prestationId, label: label.trim(), description: description.trim(), priority, due_at: dueAt });
      }
      onSaved();
    } catch {
      setError("Impossible d'enregistrer cette tâche. Vérifiez les champs et réessayez.");
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
          <h4 className="text-sm font-bold text-on-surface">{isEdit ? 'Modifier la tâche' : 'Nouvelle tâche'}</h4>
          <button className="text-secondary hover:text-on-surface shrink-0" onClick={onClose} type="button">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <div className="space-y-1">
            <label className={LABEL_CLASSES} htmlFor="task-label">
              Intitulé
            </label>
            <input
              className={COMPACT_INPUT_CLASSES}
              id="task-label"
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Ex : Retoucher le visuel bannière"
              type="text"
              value={label}
            />
          </div>
          <div className="space-y-1">
            <label className={LABEL_CLASSES} htmlFor="task-description">
              Description <span className="normal-case font-normal text-secondary">(optionnelle)</span>
            </label>
            <textarea
              className={`${COMPACT_INPUT_CLASSES} resize-none`}
              id="task-description"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Détails, contexte, attentes pour cette tâche..."
              rows={3}
              value={description}
            />
          </div>
          <div className="space-y-1">
            <label className={LABEL_CLASSES}>Priorité</label>
            <div className="flex items-center gap-1.5">
              {(Object.keys(PRIORITY_LABELS) as TaskPriority[]).map((option) => {
                const colors = PRIORITY_BUTTON_CLASSES[option];
                return (
                  <button
                    className={`flex-1 px-2 py-2 text-xs font-bold rounded-lg transition-all ${priority === option ? colors.selected : colors.unselected}`}
                    key={option}
                    onClick={() => setPriority(option)}
                    type="button"
                  >
                    {PRIORITY_LABELS[option]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-1">
            <label className={LABEL_CLASSES} htmlFor="task-due-date">
              Échéance
            </label>
            <input
              className={COMPACT_INPUT_CLASSES}
              id="task-due-date"
              max={deadline.slice(0, 10)}
              onChange={(event) => setDueDate(event.target.value)}
              type="date"
              value={dueDate}
            />
          </div>
          {error && <p className="text-xs text-error font-medium">{error}</p>}
          <button
            className="w-full flex items-center justify-center gap-1.5 bg-primary text-white py-2.5 rounded-full text-sm font-bold shadow-sm hover:shadow-md hover:bg-on-primary-fixed-variant active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none mt-1"
            disabled={!label.trim() || !dueDate || isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </form>
    </div>
  );
}

interface PrestationWorkspaceCardProps {
  prestation: Prestation;
  tasks: Task[];
  teamMembers: CurrentUser[];
  documents: Document[];
  onRefresh: () => void;
}

function PrestationWorkspaceCard({ prestation, tasks, teamMembers, documents, onRefresh }: PrestationWorkspaceCardProps) {
  const files = useMemo(() => documents.filter((d) => d.prestation === prestation.id), [documents, prestation.id]);

  const [statusFilter, setStatusFilter] = useState<'TOUTES' | 'A_FAIRE' | 'TERMINEES'>('TOUTES');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [taskModal, setTaskModal] = useState<Task | 'new' | null>(null);
  const [assigningTaskId, setAssigningTaskId] = useState<number | null>(null);
  const [pendingAssignment, setPendingAssignment] = useState<{ task: Task; member: CurrentUser } | null>(null);

  const doneCount = tasks.filter((task) => task.done).length;
  const overdueCount = tasks.filter(isOverdue).length;
  const progress = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

  const workload = useMemo(
    () => teamMembers.map((member) => ({ member, pending: tasks.filter((task) => task.assignee === member.id && !task.done).length })),
    [teamMembers, tasks],
  );

  const filteredTasks = useMemo(
    () =>
      tasks
        .filter((task) => (statusFilter === 'TOUTES' ? true : statusFilter === 'A_FAIRE' ? !task.done : task.done))
        .filter((task) => !assigneeFilter || String(task.assignee) === assigneeFilter)
        .sort((a, b) => (isOverdue(b) ? 1 : 0) - (isOverdue(a) ? 1 : 0) || (a.due_at ?? '').localeCompare(b.due_at ?? '')),
    [tasks, statusFilter, assigneeFilter],
  );

  async function toggleTask(task: Task) {
    await updatePrestationTask(task.id, { done: !task.done });
    onRefresh();
  }

  async function removeTask(id: number) {
    await deleteTask(id);
    onRefresh();
  }

  async function confirmAssignment() {
    if (!pendingAssignment) return;
    const { task, member } = pendingAssignment;
    setPendingAssignment(null);
    await updatePrestationTask(task.id, { assignee: member.id });
    onRefresh();
  }

  function toggleAssignMenu(taskId: number) {
    setAssigningTaskId((prev) => (prev === taskId ? null : taskId));
  }

  return (
    <section className="bg-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
      {/* En-tête + avancement */}
      <div className="p-5 border-b border-outline-variant bg-surface-container-low/40">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary-container/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">add_task</span>
            </div>
            <div className="min-w-0">
              <h4 className="text-base font-bold text-on-surface truncate">{prestation.label}</h4>
              <p className="text-xs text-secondary">Échéance : {formatDateTime(prestation.deadline)}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-secondary">Avancement</p>
            <p className="text-lg font-bold text-primary leading-tight">{progress}%</p>
          </div>
        </div>
        <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden mt-3">
          <div className={`h-full rounded-full transition-all ${progress >= 100 ? 'bg-emerald-500' : 'bg-primary'}`} style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Consignes du détenteur */}
      <div className="p-5 border-b border-outline-variant bg-amber-50/40">
        <p className="text-[11px] font-bold uppercase tracking-wider text-secondary mb-1.5 flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">campaign</span>
          Consignes du détenteur
        </p>
        <p className="text-sm text-on-surface-variant">{prestation.note || 'Aucune consigne particulière.'}</p>
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {files.map((file) => {
              const filename = file.file ? (file.file.split('/').pop() ?? file.label) : file.label;
              return (
                <a
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-outline-variant rounded-full text-xs text-secondary hover:border-primary hover:text-primary transition-colors"
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

      {/* Équipe & charge */}
      <div className="px-5 py-4 border-b border-outline-variant flex flex-wrap items-center gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-secondary shrink-0 mr-1">Équipe</p>
        {workload.map(({ member, pending }) => (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-container-low rounded-full text-xs" key={member.id}>
            <span className="w-5 h-5 rounded-full bg-primary-container text-white flex items-center justify-center text-[9px] font-bold shrink-0">
              {getInitials(getFullName(member))}
            </span>
            <span className="font-semibold text-on-surface">{getFullName(member)}</span>
            <span className="text-secondary">· {pending} en cours</span>
          </div>
        ))}
        {teamMembers.length === 0 && <p className="text-xs text-secondary italic">Aucun membre dans cette division pour l'instant.</p>}
      </div>

      {/* KPI compacts */}
      <div className="px-5 pt-4 grid grid-cols-3 gap-2 text-center">
        <div className="bg-surface-container-low rounded-lg py-2">
          <p className="text-sm font-bold text-on-surface">{tasks.length - doneCount}</p>
          <p className="text-[10px] text-secondary uppercase font-semibold">À faire</p>
        </div>
        <div className={`rounded-lg py-2 ${overdueCount > 0 ? 'bg-error-container/20' : 'bg-surface-container-low'}`}>
          <p className={`text-sm font-bold ${overdueCount > 0 ? 'text-error' : 'text-on-surface'}`}>{overdueCount}</p>
          <p className="text-[10px] text-secondary uppercase font-semibold">En retard</p>
        </div>
        <div className="bg-surface-container-low rounded-lg py-2">
          <p className="text-sm font-bold text-on-surface">{doneCount}</p>
          <p className="text-[10px] text-secondary uppercase font-semibold">Terminées</p>
        </div>
      </div>

      {/* Filtres + ajout */}
      <div className="px-5 pt-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5">
          {(
            [
              { value: 'TOUTES', label: 'Toutes' },
              { value: 'A_FAIRE', label: 'À faire' },
              { value: 'TERMINEES', label: 'Terminées' },
            ] as const
          ).map((option) => (
            <button
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                statusFilter === option.value ? 'bg-primary text-white border-primary' : 'border-outline-variant text-secondary hover:bg-surface-container-high'
              }`}
              key={option.value}
              onClick={() => setStatusFilter(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <select
            className="bg-surface-container border border-outline-variant rounded-full py-1 pl-3 pr-7 text-[11px] font-semibold appearance-none focus:outline-none focus:border-primary-container transition-all"
            onChange={(event) => setAssigneeFilter(event.target.value)}
            value={assigneeFilter}
          >
            <option value="">Toute l'équipe</option>
            {teamMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {getFullName(member)}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 text-outline text-[14px] pointer-events-none">
            expand_more
          </span>
        </div>
        <button
          className="ml-auto flex items-center gap-1.5 bg-primary text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm hover:shadow-md hover:bg-on-primary-fixed-variant active:scale-95 transition-all"
          onClick={() => setTaskModal('new')}
          type="button"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Nouvelle tâche
        </button>
      </div>

      {/* Liste des tâches */}
      <div className="p-5 space-y-2">
        {filteredTasks.map((task) => {
          const overdue = isOverdue(task);
          return (
            <div
              className={`flex items-center gap-3 px-3.5 py-3 rounded-lg border transition-colors ${
                overdue ? 'border-error/40 bg-error-container/10' : 'border-outline-variant hover:bg-surface-container-low'
              }`}
              key={task.id}
            >
              <input checked={task.done} className="w-4 h-4 accent-primary shrink-0" onChange={() => toggleTask(task)} type="checkbox" />
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold ${task.done ? 'line-through text-secondary' : 'text-on-surface'}`}>{task.label}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {task.assignee_name ? (
                    <>
                      <span className="w-4 h-4 rounded-full bg-primary-container text-white flex items-center justify-center text-[8px] font-bold shrink-0">
                        {getInitials(task.assignee_name)}
                      </span>
                      <span className="text-xs text-secondary truncate">{task.assignee_name}</span>
                    </>
                  ) : (
                    <span className="text-xs text-secondary italic truncate">Non assigné</span>
                  )}
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${PRIORITY_CLASSES[task.priority]}`}>
                {PRIORITY_LABELS[task.priority]}
              </span>
              <span className={`text-[11px] font-bold shrink-0 w-20 text-right ${overdue ? 'text-error' : 'text-secondary'}`}>
                {formatDate(task.due_at)}
              </span>
              <div className="flex items-center gap-0.5 shrink-0 relative">
                <button
                  className="w-7 h-7 inline-flex items-center justify-center text-secondary hover:bg-primary-container/20 hover:text-primary rounded-lg transition-colors"
                  onClick={() => toggleAssignMenu(task.id)}
                  title="Affecter"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">person_add</span>
                </button>
                {assigningTaskId === task.id && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setAssigningTaskId(null)} />
                    <div className="absolute right-0 bottom-full mb-1 z-50 w-44 max-h-48 overflow-y-auto bg-white border border-outline-variant rounded-lg shadow-lg py-1.5">
                      {teamMembers.map((member) => (
                        <button
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-low transition-colors text-left"
                          key={member.id}
                          onClick={() => {
                            setAssigningTaskId(null);
                            setPendingAssignment({ task, member });
                          }}
                          type="button"
                        >
                          <span className="w-5 h-5 rounded-full bg-primary-container text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                            {getInitials(getFullName(member))}
                          </span>
                          {getFullName(member)}
                        </button>
                      ))}
                      {teamMembers.length === 0 && <p className="px-3 py-2 text-xs text-secondary italic">Aucun membre disponible.</p>}
                    </div>
                  </>
                )}
                <button
                  className="w-7 h-7 inline-flex items-center justify-center text-secondary hover:bg-surface-container-high hover:text-on-surface rounded-lg transition-colors"
                  onClick={() => setTaskModal(task)}
                  title="Modifier"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                </button>
                <button
                  className="w-7 h-7 inline-flex items-center justify-center text-secondary hover:bg-error-container/30 hover:text-error rounded-lg transition-colors"
                  onClick={() => removeTask(task.id)}
                  title="Supprimer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </div>
            </div>
          );
        })}
        {filteredTasks.length === 0 && (
          <div className="text-center text-secondary text-sm py-8 border border-dashed border-outline-variant rounded-lg">
            Aucune tâche ne correspond à ce filtre.
          </div>
        )}
      </div>

      {taskModal && (
        <TaskFormModal
          deadline={prestation.deadline}
          onClose={() => setTaskModal(null)}
          onSaved={() => {
            setTaskModal(null);
            onRefresh();
          }}
          prestationId={prestation.id}
          task={taskModal}
        />
      )}

      {pendingAssignment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setPendingAssignment(null)}
          role="presentation"
        >
          <div
            className="bg-white border border-outline-variant rounded-xl p-5 shadow-lg w-full max-w-sm"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-lg bg-primary-container/10 text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">person_add</span>
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-secondary">Affecter la tâche</p>
                <h4 className="text-sm font-bold text-on-surface leading-snug truncate">{pendingAssignment.task.label}</h4>
              </div>
            </div>
            <p className="text-sm text-on-surface-variant mb-5">
              Affecter cette tâche à <span className="font-bold text-on-surface">{getFullName(pendingAssignment.member)}</span> ?
            </p>
            <div className="flex gap-2">
              <button
                className="flex-1 px-4 py-2.5 border border-outline-variant text-on-surface text-sm font-bold rounded-lg hover:bg-surface-container-high transition-colors"
                onClick={() => setPendingAssignment(null)}
                type="button"
              >
                Annuler
              </button>
              <button
                className="flex-1 px-4 py-2.5 bg-primary text-white text-sm font-bold rounded-lg hover:bg-on-primary-fixed-variant transition-colors"
                onClick={confirmAssignment}
                type="button"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

interface PrestationChiefViewProps {
  project: Project;
  viewerDivisionName: string | null;
  viewerDivisionId: number | null;
}

export default function PrestationChiefView({ project, viewerDivisionName, viewerDivisionId }: PrestationChiefViewProps) {
  const allPrestations = project.prestations;
  const myPrestations = useMemo(
    () => allPrestations.filter((p) => p.division_name === viewerDivisionName),
    [allPrestations, viewerDivisionName],
  );

  const [selectedId, setSelectedId] = useState<number>(myPrestations[0]?.id ?? 0);
  const [tasksByPrestation, setTasksByPrestation] = useState<Record<number, Task[]>>({});
  const [teamMembers, setTeamMembers] = useState<CurrentUser[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);

  const selectedPrestation = myPrestations.find((p) => p.id === selectedId) ?? myPrestations[0] ?? null;

  function refreshTasksFor(prestationId: number) {
    listPrestationTasks(prestationId)
      .then((tasks) => setTasksByPrestation((prev) => ({ ...prev, [prestationId]: tasks })))
      .catch(() => setTasksByPrestation((prev) => ({ ...prev, [prestationId]: [] })));
  }

  useEffect(() => {
    setIsLoadingTasks(true);
    Promise.all(myPrestations.map((p) => listPrestationTasks(p.id).then((tasks) => [p.id, tasks] as const)))
      .then((entries) => setTasksByPrestation(Object.fromEntries(entries)))
      .catch(() => setTasksByPrestation({}))
      .finally(() => setIsLoadingTasks(false));
  }, [myPrestations]);

  useEffect(() => {
    if (!viewerDivisionId) {
      setTeamMembers([]);
      return;
    }
    listDivisionMembers(viewerDivisionId)
      .then(setTeamMembers)
      .catch(() => setTeamMembers([]));
  }, [viewerDivisionId]);

  useEffect(() => {
    listDocuments({ project: project.id })
      .then(setDocuments)
      .catch(() => setDocuments([]));
  }, [project.id]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter items-start">
      {/* Colonne latérale : projet + navigation entre prestations */}
      <aside className="lg:sticky lg:top-6 flex flex-col gap-gutter">
        <section className="bg-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-secondary mb-1">Projet</p>
            <h3 className="text-base font-bold text-on-surface truncate">{project.name}</h3>
            <p className="text-sm text-secondary mt-0.5">{project.client_name}</p>
            <p className="text-xs text-secondary mt-2">Échéance globale : {formatDateTime(project.deadline)}</p>
            {project.description && (
              <p className="text-xs text-on-surface-variant mt-3 pt-3 border-t border-outline-variant">{project.description}</p>
            )}
          </div>

          <div className="border-t border-outline-variant p-2">
            <p className="px-3 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-secondary">
              Prestations ({allPrestations.length})
            </p>
            <div className="space-y-1 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {allPrestations.map((prestation) => {
                const mine = prestation.division_name === viewerDivisionName;

                if (!mine) {
                  return (
                    <div className="w-full text-left px-3 py-2.5 rounded-lg border border-transparent opacity-50 cursor-not-allowed" key={prestation.id}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-on-surface truncate">{prestation.label}</span>
                        <span className="material-symbols-outlined text-secondary text-[16px] shrink-0">lock</span>
                      </div>
                      <p className="text-[11px] text-secondary mt-0.5">
                        {prestation.division_name ?? 'Non affectée'} · {formatDate(prestation.deadline)}
                      </p>
                    </div>
                  );
                }

                const tasks = tasksByPrestation[prestation.id] ?? [];
                const doneCount = tasks.filter((task) => task.done).length;
                const progress = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
                const selected = prestation.id === selectedId;
                return (
                  <button
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                      selected ? 'border-primary bg-primary-container/10' : 'border-transparent hover:bg-surface-container-low'
                    }`}
                    key={prestation.id}
                    onClick={() => setSelectedId(prestation.id)}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-semibold truncate ${selected ? 'text-primary' : 'text-on-surface'}`}>
                        {prestation.label}
                      </span>
                      <span className={`text-[11px] font-bold shrink-0 ${selected ? 'text-primary' : 'text-secondary'}`}>{progress}%</span>
                    </div>
                    <p className="text-[11px] text-secondary mt-0.5">{formatDate(prestation.deadline)}</p>
                    <div className="h-1 w-full bg-surface-container-high rounded-full overflow-hidden mt-1.5">
                      <div
                        className={`h-full rounded-full ${progress >= 100 ? 'bg-emerald-500' : 'bg-primary'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-white border border-outline-variant rounded-xl p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-secondary mb-2">
            Pièces jointes ({documents.length})
          </p>
          {documents.length > 0 ? (
            <div className="space-y-1.5">
              {documents.map((document) => {
                const filename = document.file ? (document.file.split('/').pop() ?? document.label) : document.label;
                const isImage = !!document.file && isImageFile(filename);
                return (
                  <a
                    className="flex items-center gap-2.5 p-2 rounded-lg border border-outline-variant hover:border-primary hover:bg-surface-container-low transition-colors"
                    href={document.file || document.link}
                    key={document.id}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {isImage ? (
                      <img alt="" className="w-9 h-9 rounded-lg object-cover shrink-0 border border-outline-variant" src={document.file!} />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-primary-container/10 text-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[18px]">{document.file ? getFileIcon(filename) : 'link'}</span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-on-surface truncate">{document.label || filename}</p>
                      <p className="text-[10px] text-secondary">{document.document_type_display}</p>
                    </div>
                    <span className="material-symbols-outlined text-outline text-[16px] shrink-0">open_in_new</span>
                  </a>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-secondary italic">Aucune pièce jointe pour l'instant.</p>
          )}
        </section>
      </aside>

      {/* Colonne principale : poste de travail de la prestation sélectionnée */}
      <div className="lg:col-span-2">
        {isLoadingTasks ? (
          <div className="bg-white border border-outline-variant rounded-xl p-8 text-center text-sm text-secondary">Chargement...</div>
        ) : selectedPrestation ? (
          <PrestationWorkspaceCard
            documents={documents}
            key={selectedPrestation.id}
            onRefresh={() => refreshTasksFor(selectedPrestation.id)}
            prestation={selectedPrestation}
            tasks={tasksByPrestation[selectedPrestation.id] ?? []}
            teamMembers={teamMembers}
          />
        ) : (
          <div className="bg-white border border-dashed border-outline-variant rounded-xl p-8 text-center text-sm text-secondary">
            Aucune prestation affectée à votre division sur ce projet.
          </div>
        )}
      </div>
    </div>
  );
}
