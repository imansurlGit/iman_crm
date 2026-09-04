import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useDeveloppeurWorkspace,
  SUBMISSION_STATUS_LABELS,
  SUBMISSION_STATUS_CLASSES,
  type DeveloperTask,
} from '../context/DeveloppeurWorkspaceContext';
import { formatTaskDueLabel } from '../services/taskService';

const CARD_CLASSES = 'bg-white rounded-lg border border-outline-variant';

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isOverdue(task: DeveloperTask): boolean {
  return !task.done && !!task.due_at && new Date(task.due_at) < new Date();
}

export default function DashboardDeveloppeurPage() {
  const navigate = useNavigate();
  const { tasks, projects, isLoading } = useDeveloppeurWorkspace();

  const pendingTasks = tasks.filter((t) => !t.done);
  const overdueTasks = tasks.filter(isOverdue);

  const upcomingTasks = useMemo(
    () => [...pendingTasks].sort((a, b) => (a.due_at ?? '').localeCompare(b.due_at ?? '')).slice(0, 6),
    [pendingTasks],
  );

  if (isLoading) {
    return <p className="font-body-sm text-body-sm text-secondary">Chargement...</p>;
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-gutter">
      <section>
        <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">Mon espace de travail</h2>
        <p className="text-secondary mt-1 text-sm">Mes tâches de développement et mes projets en cours.</p>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        <div className={`${CARD_CLASSES} p-4 flex items-center gap-3`}>
          <span className="material-symbols-outlined text-primary-container text-2xl shrink-0">checklist</span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">Tâches à faire</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{pendingTasks.length}</span>
          </div>
        </div>
        <div className={`${CARD_CLASSES} p-4 flex items-center gap-3 ${overdueTasks.length > 0 ? 'border-error/30' : ''}`}>
          <span className={`material-symbols-outlined text-2xl shrink-0 ${overdueTasks.length > 0 ? 'text-error' : 'text-primary-container'}`}>
            schedule
          </span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">En retard</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{overdueTasks.length}</span>
          </div>
        </div>
        <div className={`${CARD_CLASSES} p-4 flex items-center gap-3`}>
          <span className="material-symbols-outlined text-indigo-600 text-2xl shrink-0">account_tree</span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">Projets actifs</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{projects.length}</span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-12 gap-gutter">
        {/* Mes tâches à venir */}
        <div className={`${CARD_CLASSES} col-span-12 lg:col-span-7 p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-headline-md text-lg font-bold text-primary">Mes prochaines tâches</h4>
            <button className="text-xs font-bold text-primary hover:underline" onClick={() => navigate('/developpeur/taches')} type="button">
              Voir toutes mes tâches
            </button>
          </div>
          <div className="space-y-2">
            {upcomingTasks.map((task) => {
              const overdue = isOverdue(task);
              return (
                <button
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-left transition-colors ${
                    overdue ? 'bg-error-container/20' : 'bg-surface-container-low hover:bg-surface-container-high'
                  }`}
                  key={task.id}
                  onClick={() => navigate(`/developpeur/taches/${task.id}`)}
                  type="button"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-on-surface truncate">{task.label}</p>
                    <p className="text-xs text-secondary truncate">{task.projectName}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${SUBMISSION_STATUS_CLASSES[task.submissionStatus]}`}
                  >
                    {SUBMISSION_STATUS_LABELS[task.submissionStatus]}
                  </span>
                  <span className={`text-[11px] font-bold shrink-0 ${overdue ? 'text-error' : 'text-secondary'}`}>
                    {formatTaskDueLabel(task)}
                  </span>
                </button>
              );
            })}
            {upcomingTasks.length === 0 && <p className="text-sm text-secondary">Aucune tâche en attente. 🎉</p>}
          </div>
        </div>

        {/* Mes projets */}
        <div className={`${CARD_CLASSES} col-span-12 lg:col-span-5 p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-headline-md text-lg font-bold text-primary">Mes projets</h4>
            <button className="text-xs font-bold text-primary hover:underline" onClick={() => navigate('/developpeur/projets')} type="button">
              Voir tout
            </button>
          </div>
          <div className="space-y-3">
            {projects.map((project) => (
              <div className="border border-outline-variant rounded-lg p-3.5" key={project.id}>
                <p className="text-sm font-bold text-on-surface truncate">{project.name}</p>
                <p className="text-xs text-secondary truncate">{project.clientName}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${project.avancement}%` }} />
                  </div>
                  <span className="text-[11px] font-bold text-secondary shrink-0">{project.avancement}%</span>
                </div>
                <p className="text-[11px] text-secondary mt-1.5">
                  {project.deadline ? `Échéance : ${formatDate(project.deadline)}` : 'Sans échéance'}
                </p>
              </div>
            ))}
            {projects.length === 0 && <p className="text-sm text-secondary">Aucun projet assigné pour l'instant.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
