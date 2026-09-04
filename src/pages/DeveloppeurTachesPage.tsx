import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useDeveloppeurWorkspace,
  SUBMISSION_STATUS_LABELS,
  SUBMISSION_STATUS_CLASSES,
  type DeveloperTask,
} from '../context/DeveloppeurWorkspaceContext';
import { formatTaskDueLabel, type TaskPriority } from '../services/taskService';

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  HIGH: 'Élevée',
  MEDIUM: 'Moyenne',
  LOW: 'Faible',
};

const PRIORITY_CLASSES: Record<TaskPriority, string> = {
  HIGH: 'bg-red-100 text-red-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LOW: 'bg-gray-100 text-gray-700',
};

const STATUS_ICONS: Record<DeveloperTask['submissionStatus'], string> = {
  A_FAIRE: 'radio_button_unchecked',
  EN_ATTENTE_VALIDATION: 'hourglass_top',
  MODIFICATIONS_DEMANDEES: 'edit_note',
  REJETEE: 'cancel',
  VALIDEE_A_CLOTURER: 'check_circle',
  TERMINEE: 'task_alt',
};

const STATUS_ICON_CLASSES: Record<DeveloperTask['submissionStatus'], string> = {
  A_FAIRE: 'bg-gray-100 text-gray-500',
  EN_ATTENTE_VALIDATION: 'bg-amber-100 text-amber-600',
  MODIFICATIONS_DEMANDEES: 'bg-orange-100 text-orange-600',
  REJETEE: 'bg-red-100 text-red-600',
  VALIDEE_A_CLOTURER: 'bg-blue-100 text-blue-600',
  TERMINEE: 'bg-emerald-100 text-emerald-600',
};

function isOverdue(task: DeveloperTask): boolean {
  return !task.done && !!task.due_at && new Date(task.due_at) < new Date();
}

const SEARCH_INPUT_CLASSES =
  'w-full bg-surface-container border border-outline-variant py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary-container transition-all';

export default function DeveloppeurTachesPage() {
  const navigate = useNavigate();
  const { tasks, projects, isLoading } = useDeveloppeurWorkspace();
  const [search, setSearch] = useState('');
  const [projetFilter, setProjetFilter] = useState('');
  const [statutFilter, setStatutFilter] = useState<'TOUTES' | 'A_FAIRE' | 'TERMINEES'>('TOUTES');

  const pendingCount = tasks.filter((t) => !t.done).length;
  const overdueCount = tasks.filter(isOverdue).length;
  const doneCount = tasks.filter((t) => t.done).length;

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tasks
      .filter((task) => !query || task.label.toLowerCase().includes(query) || task.projectName.toLowerCase().includes(query))
      .filter((task) => !projetFilter || task.projectName === projetFilter)
      .filter((task) => {
        if (statutFilter === 'A_FAIRE') return !task.done;
        if (statutFilter === 'TERMINEES') return task.done;
        return true;
      })
      .sort((a, b) => (isOverdue(b) ? 1 : 0) - (isOverdue(a) ? 1 : 0) || (a.due_at ?? '').localeCompare(b.due_at ?? ''));
  }, [tasks, search, projetFilter, statutFilter]);

  return (
    <div className="flex flex-col gap-gutter">
      <section>
        <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">Mes tâches</h2>
        <p className="text-secondary mt-1 text-sm">Les tâches de développement qui vous incombent.</p>
      </section>

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
        <div className="relative w-full md:w-64 shrink-0">
          <span className="absolute inset-y-0 left-3 flex items-center text-outline pointer-events-none">
            <span className="material-symbols-outlined text-sm">account_tree</span>
          </span>
          <select
            className="w-full bg-surface-container border border-outline-variant rounded py-2 pl-10 pr-8 text-sm appearance-none focus:outline-none focus:border-primary-container transition-all"
            onChange={(event) => setProjetFilter(event.target.value)}
            value={projetFilter}
          >
            <option value="">Tous mes projets</option>
            {projects.map((project) => (
              <option key={project.id} value={project.name}>
                {project.name}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-sm pointer-events-none">
            expand_more
          </span>
        </div>
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
        {isLoading && <p className="text-sm text-secondary py-6 text-center">Chargement...</p>}

        {!isLoading &&
          filteredTasks.map((task) => {
            const overdue = isOverdue(task);
            return (
              <div
                className={`flex items-center gap-4 px-4 py-4 bg-white border rounded-lg transition-colors ${
                  overdue ? 'border-error/40 bg-error-container/10' : 'border-outline-variant hover:border-outline'
                }`}
                key={task.id}
              >
                <span className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${STATUS_ICON_CLASSES[task.submissionStatus]}`}>
                  <span className="material-symbols-outlined text-[20px]">{STATUS_ICONS[task.submissionStatus]}</span>
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold truncate ${task.done ? 'line-through text-secondary' : 'text-on-surface'}`}>
                      {task.label}
                    </p>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${PRIORITY_CLASSES[task.priority]}`}>
                      {PRIORITY_LABELS[task.priority]}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-secondary">
                    <span className="truncate">{task.projectName}</span>
                    {!task.done && (
                      <>
                        <span className="text-outline">·</span>
                        <span className={overdue ? 'text-error font-bold' : ''}>{formatTaskDueLabel(task)}</span>
                      </>
                    )}
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase shrink-0 ${SUBMISSION_STATUS_CLASSES[task.submissionStatus]}`}
                >
                  {SUBMISSION_STATUS_LABELS[task.submissionStatus]}
                </span>

                <button
                  className="flex items-center gap-1 px-3 py-1.5 border border-outline-variant text-on-surface text-xs font-bold rounded-lg hover:bg-surface-container-high transition-colors shrink-0"
                  onClick={() => navigate(`/developpeur/taches/${task.id}`)}
                  type="button"
                >
                  {task.done ? 'Voir' : 'Traiter'}
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>
            );
          })}
        {!isLoading && filteredTasks.length === 0 && (
          <div className="text-center text-secondary text-sm py-10 bg-white border border-dashed border-outline-variant rounded-lg">
            Aucune tâche ne correspond à votre recherche.
          </div>
        )}
      </div>
    </div>
  );
}
