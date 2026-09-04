import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRdwWorkspace } from '../context/RdwWorkspaceContext';
import { formatTaskDueLabel, type Task } from '../services/taskService';

const CARD_CLASSES = 'bg-white rounded-lg border border-outline-variant';

function formatDate(value: string | null): string {
  if (!value) return 'Sans échéance';
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

function isOverdue(task: Task): boolean {
  return !task.done && !!task.due_at && new Date(task.due_at) < new Date();
}

export default function DashboardRdwPage() {
  const navigate = useNavigate();
  const { team, projects, tasks, isLoading } = useRdwWorkspace();

  const pendingTasks = useMemo(() => tasks.filter((t) => !t.done), [tasks]);
  const overdueTasks = useMemo(() => tasks.filter(isOverdue), [tasks]);
  const avgWorkload = team.length ? Math.round(team.reduce((sum, m) => sum + m.workload, 0) / team.length) : 0;

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
        <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">Pilotage Développement Web</h2>
        <p className="text-secondary mt-1 text-sm">Mon équipe de développeurs, les projets web et leur avancement.</p>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
        <div className={`${CARD_CLASSES} p-4 flex items-center gap-3`}>
          <span className="material-symbols-outlined text-primary-container text-2xl shrink-0">groups</span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">Développeurs</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{team.length}</span>
          </div>
        </div>
        <div className={`${CARD_CLASSES} p-4 flex items-center gap-3`}>
          <span className="material-symbols-outlined text-indigo-600 text-2xl shrink-0">account_tree</span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">Projets web actifs</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{projects.length}</span>
          </div>
        </div>
        <div className={`${CARD_CLASSES} p-4 flex items-center gap-3 ${overdueTasks.length > 0 ? 'border-error/30' : ''}`}>
          <span className={`material-symbols-outlined text-2xl shrink-0 ${overdueTasks.length > 0 ? 'text-error' : 'text-primary-container'}`}>
            schedule
          </span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">Tâches en retard</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{overdueTasks.length}</span>
          </div>
        </div>
        <div className={`${CARD_CLASSES} p-4 flex items-center gap-3`}>
          <span className="material-symbols-outlined text-amber-600 text-2xl shrink-0">speed</span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">Charge moyenne équipe</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{avgWorkload}%</span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-12 gap-gutter">
        {/* Équipe */}
        <div className={`${CARD_CLASSES} col-span-12 lg:col-span-5 p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-headline-md text-lg font-bold text-primary">Mon équipe</h4>
            <button className="text-xs font-bold text-primary hover:underline" onClick={() => navigate('/rdw/equipe')} type="button">
              Voir le détail
            </button>
          </div>
          <div className="space-y-3">
            {team.map((member) => (
              <div className="flex items-center gap-3" key={member.id}>
                <div className="w-9 h-9 rounded-full bg-primary-container text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                  {getInitials(member.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-on-surface truncate">{member.name}</p>
                  <p className="text-xs text-secondary truncate">{member.focus}</p>
                </div>
                <div className="w-20 shrink-0 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                    <div
                      className={`h-full rounded-full ${member.workload >= 80 ? 'bg-error' : 'bg-primary'}`}
                      style={{ width: `${member.workload}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-secondary">{member.workload}%</span>
                </div>
              </div>
            ))}
            {team.length === 0 && <p className="text-sm text-secondary">Aucun développeur dans votre division.</p>}
          </div>
        </div>

        {/* Tâches à venir */}
        <div className={`${CARD_CLASSES} col-span-12 lg:col-span-7 p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-headline-md text-lg font-bold text-primary">Tâches à venir de l'équipe</h4>
            <button className="text-xs font-bold text-primary hover:underline" onClick={() => navigate('/rdw/taches')} type="button">
              Voir toutes les tâches
            </button>
          </div>
          <div className="space-y-2">
            {upcomingTasks.map((task) => {
              const overdue = isOverdue(task);
              return (
                <div
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-lg transition-colors ${
                    overdue ? 'bg-error-container/20' : 'bg-surface-container-low'
                  }`}
                  key={task.id}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-on-surface truncate">{task.label}</p>
                    <p className="text-xs text-secondary truncate">{task.assignee_name ?? 'Non assignée'}</p>
                  </div>
                  <span className={`text-[11px] font-bold shrink-0 ${overdue ? 'text-error' : 'text-secondary'}`}>
                    {formatTaskDueLabel(task)}
                  </span>
                </div>
              );
            })}
            {upcomingTasks.length === 0 && <p className="text-sm text-secondary">Aucune tâche en attente pour l'équipe. 🎉</p>}
          </div>
        </div>
      </section>

      {/* Projets */}
      <section className={`${CARD_CLASSES} p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-headline-md text-lg font-bold text-primary">Projets web</h4>
          <button className="text-xs font-bold text-primary hover:underline" onClick={() => navigate('/rdw/projets')} type="button">
            Voir tous les projets
          </button>
        </div>
        <div className="space-y-2">
          {projects.map((project) => (
            <div className="flex items-center gap-3 px-3.5 py-3 bg-surface-container-low rounded-lg" key={project.id}>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-on-surface truncate">{project.name}</p>
                <p className="text-xs text-secondary truncate">{project.clientName}</p>
              </div>
              <div className="w-24 shrink-0 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${project.avancement}%` }} />
                </div>
                <span className="text-[11px] font-bold text-secondary">{project.avancement}%</span>
              </div>
              <span className="text-[11px] text-secondary shrink-0 w-24 text-right">{formatDate(project.deadline)}</span>
            </div>
          ))}
          {projects.length === 0 && <p className="text-center text-secondary text-sm py-4">Aucun projet pour l'instant.</p>}
        </div>
      </section>
    </div>
  );
}
