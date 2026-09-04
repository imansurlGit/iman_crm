import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { listProjects, type Project } from '../services/projectService';
import {
  createPrestationTask,
  deleteTask,
  listAllTasks,
  updatePrestationTask,
  type Task,
  type TaskPriority,
} from '../services/taskService';
import { listDivisionMembers, type CurrentUser } from '../services/userService';

// Feuille de tâches d'un chef de division (CDN, CDV, CDM...) : ses propres
// tâches de prestation (assignee = lui) et celles qu'il a confiées à son
// équipe (created_by = lui, assignee != lui). Même modèle réel que
// PrestationChiefView.tsx, mais vue transversale (tous projets de la
// division) plutôt que projet par projet — générique, pilotée entièrement
// par `user.division`/`user.division_name`.

type Tab = 'MINE' | 'ASSIGNED';
type StatutFilter = 'TOUTES' | 'A_FAIRE' | 'TERMINEES';

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
const SEARCH_INPUT_CLASSES =
  'w-full bg-surface-container border border-outline-variant py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary-container transition-all';

function isOverdue(task: Task): boolean {
  return !task.done && !!task.due_at && new Date(task.due_at) < new Date();
}

function formatDateTime(value: string | null): string {
  if (!value) return 'Sans échéance';
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

function getFullName(user: CurrentUser): string {
  return `${user.first_name} ${user.last_name}`.trim() || user.email;
}

interface PrestationOption {
  id: number;
  label: string;
  projectName: string;
  deadline: string;
}

interface TaskModalProps {
  task: Task | 'new';
  prestations: PrestationOption[];
  assignees: CurrentUser[];
  defaultAssigneeId: number | null;
  onClose: () => void;
  onSaved: () => void;
}

function TaskModal({ task, prestations, assignees, defaultAssigneeId, onClose, onSaved }: TaskModalProps) {
  const isEdit = task !== 'new';
  const [label, setLabel] = useState(isEdit ? task.label : '');
  const [description, setDescription] = useState(isEdit ? task.description : '');
  const [priority, setPriority] = useState<TaskPriority>(isEdit ? task.priority : 'MEDIUM');
  const [prestationId, setPrestationId] = useState(isEdit ? String(task.prestation ?? '') : String(prestations[0]?.id ?? ''));
  const [assigneeId, setAssigneeId] = useState(isEdit ? String(task.assignee ?? '') : String(defaultAssigneeId ?? ''));
  const [dueDate, setDueDate] = useState(isEdit && task.due_at ? task.due_at.slice(0, 16) : '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!label.trim() || !dueDate || (!isEdit && !prestationId)) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const dueAt = new Date(dueDate).toISOString();
      const assignee = assigneeId ? Number(assigneeId) : null;
      if (isEdit) {
        await updatePrestationTask(task.id, { label: label.trim(), description: description.trim(), priority, due_at: dueAt, assignee });
      } else {
        await createPrestationTask({
          prestation: Number(prestationId),
          label: label.trim(),
          description: description.trim(),
          priority,
          due_at: dueAt,
          assignee,
        });
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
        className="bg-white border border-outline-variant rounded-xl p-5 shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto"
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
            <label className={LABEL_CLASSES} htmlFor="chef-task-label">
              Intitulé
            </label>
            <input
              autoFocus
              className={COMPACT_INPUT_CLASSES}
              id="chef-task-label"
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Ex : Corriger le bug d'affichage mobile"
              type="text"
              value={label}
            />
          </div>
          <div className="space-y-1">
            <label className={LABEL_CLASSES} htmlFor="chef-task-description">
              Description <span className="normal-case font-normal text-secondary">(optionnelle)</span>
            </label>
            <textarea
              className={`${COMPACT_INPUT_CLASSES} resize-none`}
              id="chef-task-description"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Détails, contexte, attentes pour cette tâche..."
              rows={3}
              value={description}
            />
          </div>
          {!isEdit && (
            <div className="space-y-1">
              <label className={LABEL_CLASSES} htmlFor="chef-task-prestation">
                Prestation
              </label>
              <select
                className={`${COMPACT_INPUT_CLASSES} appearance-none`}
                id="chef-task-prestation"
                onChange={(event) => setPrestationId(event.target.value)}
                value={prestationId}
              >
                <option disabled value="">
                  Choisir une prestation...
                </option>
                {prestations.map((prestation) => (
                  <option key={prestation.id} value={prestation.id}>
                    {prestation.projectName} — {prestation.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-1">
            <label className={LABEL_CLASSES} htmlFor="chef-task-assignee">
              Assignée à
            </label>
            <select
              className={`${COMPACT_INPUT_CLASSES} appearance-none`}
              id="chef-task-assignee"
              onChange={(event) => setAssigneeId(event.target.value)}
              value={assigneeId}
            >
              <option value="">Non assignée</option>
              {assignees.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.id === defaultAssigneeId ? `${getFullName(member)} (moi)` : getFullName(member)}
                </option>
              ))}
            </select>
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
            <label className={LABEL_CLASSES} htmlFor="chef-task-due">
              Échéance
            </label>
            <input
              className={COMPACT_INPUT_CLASSES}
              id="chef-task-due"
              onChange={(event) => setDueDate(event.target.value)}
              type="datetime-local"
              value={dueDate}
            />
          </div>
          {error && <p className="text-xs text-error font-medium">{error}</p>}
          <button
            className="w-full flex items-center justify-center gap-1.5 bg-primary text-white py-2.5 rounded-full text-sm font-bold shadow-sm hover:shadow-md hover:bg-on-primary-fixed-variant active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none mt-1"
            disabled={!label.trim() || !dueDate || (!isEdit && !prestationId) || isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Ajouter la tâche'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ChefDivisionTachesPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<CurrentUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [tab, setTab] = useState<Tab>('MINE');
  const [search, setSearch] = useState('');
  const [projetFilter, setProjetFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [statutFilter, setStatutFilter] = useState<StatutFilter>('A_FAIRE');
  const [taskModal, setTaskModal] = useState<Task | 'new' | null>(null);
  const [reassigningTaskId, setReassigningTaskId] = useState<number | null>(null);
  const [pendingReassignment, setPendingReassignment] = useState<{ task: Task; member: CurrentUser } | null>(null);

  function refresh() {
    if (!user) return;
    Promise.all([listAllTasks(), listProjects()]).then(([allTasks, allProjects]) => {
      setTasks(allTasks.filter((t) => t.task_type === 'PRESTATION' && (t.assignee === user.id || t.created_by === user.id)));
      setProjects(allProjects);
    });
  }

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    Promise.all([listAllTasks(), listProjects(), user.division ? listDivisionMembers(user.division) : Promise.resolve([])])
      .then(([allTasks, allProjects, members]) => {
        setTasks(allTasks.filter((t) => t.task_type === 'PRESTATION' && (t.assignee === user.id || t.created_by === user.id)));
        setProjects(allProjects);
        setTeamMembers(members);
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const assigneeOptions = useMemo(() => {
    const map = new Map(teamMembers.map((member) => [member.id, member]));
    if (user) map.set(user.id, user);
    return Array.from(map.values()).sort((a, b) => getFullName(a).localeCompare(getFullName(b)));
  }, [teamMembers, user]);

  const prestationInfo = useMemo(() => {
    const map = new Map<number, { label: string; projectName: string; projectId: number }>();
    for (const project of projects) {
      for (const prestation of project.prestations) {
        map.set(prestation.id, { label: prestation.label, projectName: project.name, projectId: project.id });
      }
    }
    return map;
  }, [projects]);

  const myDivisionPrestations = useMemo<PrestationOption[]>(() => {
    if (!user?.division_name) return [];
    return projects
      .flatMap((project) =>
        project.prestations
          .filter((prestation) => prestation.division_name === user.division_name)
          .map((prestation) => ({ id: prestation.id, label: prestation.label, projectName: project.name, deadline: prestation.deadline })),
      )
      .sort((a, b) => a.deadline.localeCompare(b.deadline));
  }, [projects, user?.division_name]);

  const scopedTasks = useMemo(() => {
    if (!user) return [];
    return tab === 'MINE'
      ? tasks.filter((t) => t.assignee === user.id)
      : tasks.filter((t) => t.created_by === user.id && t.assignee !== user.id);
  }, [tasks, tab, user]);

  const pendingCount = scopedTasks.filter((t) => !t.done).length;
  const overdueCount = scopedTasks.filter(isOverdue).length;
  const doneCount = scopedTasks.filter((t) => t.done).length;

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return scopedTasks
      .filter((task) => {
        if (!query) return true;
        const info = task.prestation ? prestationInfo.get(task.prestation) : undefined;
        return (
          task.label.toLowerCase().includes(query) ||
          (info?.label.toLowerCase().includes(query) ?? false) ||
          (info?.projectName.toLowerCase().includes(query) ?? false)
        );
      })
      .filter((task) => {
        if (!projetFilter) return true;
        const info = task.prestation ? prestationInfo.get(task.prestation) : undefined;
        return info?.projectName === projetFilter;
      })
      .filter((task) => !assigneeFilter || String(task.assignee) === assigneeFilter)
      .filter((task) => {
        if (statutFilter === 'A_FAIRE') return !task.done;
        if (statutFilter === 'TERMINEES') return task.done;
        return true;
      })
      .sort((a, b) => (isOverdue(b) ? 1 : 0) - (isOverdue(a) ? 1 : 0) || (a.due_at ?? '').localeCompare(b.due_at ?? ''));
  }, [scopedTasks, search, projetFilter, assigneeFilter, statutFilter, prestationInfo]);

  const involvedProjectNames = useMemo(() => {
    const names = new Set<string>();
    for (const task of tasks) {
      const info = task.prestation ? prestationInfo.get(task.prestation) : undefined;
      if (info) names.add(info.projectName);
    }
    return Array.from(names).sort();
  }, [tasks, prestationInfo]);

  async function toggleDone(task: Task) {
    await updatePrestationTask(task.id, { done: !task.done });
    refresh();
  }

  async function removeTask(id: number) {
    await deleteTask(id);
    refresh();
  }

  async function confirmReassignment() {
    if (!pendingReassignment) return;
    const { task, member } = pendingReassignment;
    setPendingReassignment(null);
    await updatePrestationTask(task.id, { assignee: member.id });
    refresh();
  }

  if (isLoading) {
    return <p className="font-body-sm text-body-sm text-secondary">Chargement...</p>;
  }

  return (
    <div className="flex flex-col gap-gutter">
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">Feuille de tâches</h2>
          <p className="text-secondary mt-1 text-sm">Vos tâches et celles que vous avez confiées à votre équipe — division {user?.division_name ?? 'votre division'}.</p>
        </div>
        <button
          className="flex items-center gap-1.5 bg-primary text-white pl-3 pr-4 py-2 rounded-full text-xs font-bold shadow-sm hover:shadow-md hover:bg-on-primary-fixed-variant active:scale-95 transition-all shrink-0"
          onClick={() => setTaskModal('new')}
          type="button"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Nouvelle tâche
        </button>
      </section>

      <div className="flex items-center gap-1 p-1 bg-surface-container border border-outline-variant rounded-xl w-fit">
        <button
          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
            tab === 'MINE' ? 'bg-white text-on-surface shadow-sm' : 'text-secondary hover:text-on-surface'
          }`}
          onClick={() => setTab('MINE')}
          type="button"
        >
          Mes tâches
        </button>
        <button
          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
            tab === 'ASSIGNED' ? 'bg-white text-on-surface shadow-sm' : 'text-secondary hover:text-on-surface'
          }`}
          onClick={() => setTab('ASSIGNED')}
          type="button"
        >
          Tâches attribuées
        </button>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        <div className="bg-surface-container-lowest border border-outline-variant p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-primary-container text-2xl shrink-0">checklist</span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">À faire</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{pendingCount}</span>
          </div>
        </div>
        <div className={`bg-surface-container-lowest border p-4 flex items-center gap-3 ${overdueCount > 0 ? 'border-error/30' : 'border-outline-variant'}`}>
          <span className={`material-symbols-outlined text-2xl shrink-0 ${overdueCount > 0 ? 'text-error' : 'text-primary-container'}`}>
            schedule
          </span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">En retard</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{overdueCount}</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-emerald-600 text-2xl shrink-0">task_alt</span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">Terminées</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{doneCount}</span>
          </div>
        </div>
      </section>

      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-3 flex items-center text-outline">
            <span className="material-symbols-outlined text-sm">search</span>
          </span>
          <input
            className={SEARCH_INPUT_CLASSES}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher une tâche, un projet..."
            type="text"
            value={search}
          />
        </div>
        <div className="relative w-full md:w-56 shrink-0">
          <span className="absolute inset-y-0 left-3 flex items-center text-outline pointer-events-none">
            <span className="material-symbols-outlined text-sm">account_tree</span>
          </span>
          <select
            className="w-full bg-surface-container border border-outline-variant rounded py-2 pl-10 pr-8 text-sm appearance-none focus:outline-none focus:border-primary-container transition-all"
            onChange={(event) => setProjetFilter(event.target.value)}
            value={projetFilter}
          >
            <option value="">Tous les projets</option>
            {involvedProjectNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-sm pointer-events-none">
            expand_more
          </span>
        </div>
        {tab === 'ASSIGNED' && (
          <div className="relative w-full md:w-56 shrink-0">
            <span className="absolute inset-y-0 left-3 flex items-center text-outline pointer-events-none">
              <span className="material-symbols-outlined text-sm">person</span>
            </span>
            <select
              className="w-full bg-surface-container border border-outline-variant rounded py-2 pl-10 pr-8 text-sm appearance-none focus:outline-none focus:border-primary-container transition-all"
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
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-sm pointer-events-none">
              expand_more
            </span>
          </div>
        )}
        <div className="flex gap-2 shrink-0">
          {(
            [
              { value: 'A_FAIRE', label: 'À faire' },
              { value: 'TERMINEES', label: 'Terminées' },
              { value: 'TOUTES', label: 'Toutes' },
            ] as const
          ).map((option) => (
            <button
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                statutFilter === option.value
                  ? 'bg-primary text-white border-primary'
                  : 'border-outline-variant text-secondary hover:bg-surface-container-high'
              }`}
              key={option.value}
              onClick={() => setStatutFilter(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {filteredTasks.map((task) => {
          const overdue = isOverdue(task);
          const info = task.prestation ? prestationInfo.get(task.prestation) : undefined;
          return (
            <div
              className={`flex items-center gap-4 px-4 py-4 bg-white border rounded-lg transition-colors ${
                overdue ? 'border-error/40 bg-error-container/10' : 'border-outline-variant hover:border-outline'
              }`}
              key={task.id}
            >
              <button
                className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 transition-colors ${
                  task.done ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400 hover:bg-primary-container/20 hover:text-primary'
                }`}
                onClick={() => toggleDone(task)}
                title={task.done ? 'Marquer à faire' : 'Marquer terminée'}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">{task.done ? 'task_alt' : 'radio_button_unchecked'}</span>
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-semibold truncate ${task.done ? 'line-through text-secondary' : 'text-on-surface'}`}>
                    {task.label}
                  </p>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${PRIORITY_CLASSES[task.priority]}`}>
                    {PRIORITY_LABELS[task.priority]}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-secondary flex-wrap">
                  <span className="truncate">{info ? `${info.projectName} · ${info.label}` : '—'}</span>
                  <span className="text-outline">·</span>
                  <span className={overdue ? 'text-error font-bold' : ''}>{formatDateTime(task.due_at)}</span>
                  {tab === 'ASSIGNED' && task.assignee_name && (
                    <>
                      <span className="text-outline">·</span>
                      <span className="inline-flex items-center gap-1">
                        <span className="w-4 h-4 rounded-full bg-primary-container text-white flex items-center justify-center text-[8px] font-bold">
                          {getInitials(task.assignee_name)}
                        </span>
                        {task.assignee_name}
                      </span>
                    </>
                  )}
                  {tab === 'ASSIGNED' && !task.assignee_name && <span className="italic">Non assignée</span>}
                </div>
              </div>

              <div className="flex items-center gap-0.5 shrink-0 relative">
                {tab === 'ASSIGNED' && (
                  <>
                    <button
                      className="w-8 h-8 inline-flex items-center justify-center text-secondary hover:bg-primary-container/20 hover:text-primary rounded-lg transition-colors"
                      onClick={() => setReassigningTaskId(reassigningTaskId === task.id ? null : task.id)}
                      title="Réaffecter"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">person_add</span>
                    </button>
                    {reassigningTaskId === task.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setReassigningTaskId(null)} />
                        <div className="absolute right-0 bottom-full mb-1 z-50 w-44 max-h-48 overflow-y-auto bg-white border border-outline-variant rounded-lg shadow-lg py-1.5">
                          {teamMembers.map((member) => (
                            <button
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-low transition-colors text-left"
                              key={member.id}
                              onClick={() => {
                                setReassigningTaskId(null);
                                setPendingReassignment({ task, member });
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
                  </>
                )}
                <button
                  className="w-8 h-8 inline-flex items-center justify-center text-secondary hover:bg-surface-container-high hover:text-on-surface rounded-lg transition-colors"
                  onClick={() => setTaskModal(task)}
                  title="Modifier"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button
                  className="w-8 h-8 inline-flex items-center justify-center text-secondary hover:bg-error-container/30 hover:text-error rounded-lg transition-colors"
                  onClick={() => removeTask(task.id)}
                  title="Supprimer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </div>
          );
        })}
        {filteredTasks.length === 0 && (
          <div className="text-center text-secondary text-sm py-10 bg-white border border-dashed border-outline-variant rounded-lg">
            Aucune tâche ne correspond à votre recherche.
          </div>
        )}
      </div>

      {taskModal && user && (
        <TaskModal
          assignees={assigneeOptions}
          defaultAssigneeId={user.id}
          onClose={() => setTaskModal(null)}
          onSaved={() => {
            setTaskModal(null);
            refresh();
          }}
          prestations={myDivisionPrestations}
          task={taskModal}
        />
      )}

      {pendingReassignment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setPendingReassignment(null)}
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
                <p className="text-[10px] font-bold uppercase tracking-wider text-secondary">Réaffecter la tâche</p>
                <h4 className="text-sm font-bold text-on-surface leading-snug truncate">{pendingReassignment.task.label}</h4>
              </div>
            </div>
            <p className="text-sm text-on-surface-variant mb-5">
              Affecter cette tâche à <span className="font-bold text-on-surface">{getFullName(pendingReassignment.member)}</span> ?
            </p>
            <div className="flex gap-2">
              <button
                className="flex-1 px-4 py-2.5 border border-outline-variant text-on-surface text-sm font-bold rounded-lg hover:bg-surface-container-high transition-colors"
                onClick={() => setPendingReassignment(null)}
                type="button"
              >
                Annuler
              </button>
              <button
                className="flex-1 px-4 py-2.5 bg-primary text-white text-sm font-bold rounded-lg hover:bg-on-primary-fixed-variant transition-colors"
                onClick={confirmReassignment}
                type="button"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
