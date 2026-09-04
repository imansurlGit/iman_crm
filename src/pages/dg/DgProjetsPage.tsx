import { useEffect, useMemo, useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDivisionIcon } from '../../services/divisionService';
import {
  listProjects,
  updateProjectStatus,
  formatProjectDeadline,
  getProjectDivisions,
  PRIORITY_BADGE_CLASSES,
  STATUS_OPTIONS,
  type Project,
  type ProjectStatus,
} from '../../services/projectService';

const LATE_EXEMPT_STATUSES: ProjectStatus[] = ['LIVRE', 'CLOTURE'];

const PROGRESS_BY_STATUS: Record<ProjectStatus, number> = {
  NOUVEAU: 5,
  A_TRAITER: 15,
  EN_COURS: 50,
  EN_VALIDATION_INTERNE: 70,
  EN_VALIDATION_CLIENT: 80,
  EN_CORRECTION: 60,
  PRET_POUR_EXECUTION: 90,
  PRET_POUR_LIVRAISON: 95,
  LIVRE: 100,
  CLOTURE: 100,
  BLOQUE: 40,
  PERDUE: 0,
};

const STATUS_DOT_CLASSES: Record<ProjectStatus, string> = {
  NOUVEAU: 'bg-blue-500',
  A_TRAITER: 'bg-amber-500',
  EN_COURS: 'bg-indigo-500',
  EN_VALIDATION_INTERNE: 'bg-purple-500',
  EN_VALIDATION_CLIENT: 'bg-pink-500',
  EN_CORRECTION: 'bg-orange-500',
  PRET_POUR_EXECUTION: 'bg-teal-500',
  PRET_POUR_LIVRAISON: 'bg-cyan-500',
  LIVRE: 'bg-emerald-500',
  CLOTURE: 'bg-outline',
  BLOQUE: 'bg-error',
  PERDUE: 'bg-gray-400',
};

function formatAmount(value: number): string {
  return `${value.toLocaleString('fr-FR')} FCFA`;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function isLateProject(project: Project) {
  return !!project.deadline && new Date(project.deadline) < new Date() && !LATE_EXEMPT_STATUSES.includes(project.status);
}

function projectColumnTotal(projects: Project[]): number {
  return projects.reduce((sum, project) => sum + (project.budget ? Number(project.budget) : 0), 0);
}

interface ProjectCardViewProps {
  project: Project;
  onDragStart: (event: DragEvent<HTMLDivElement>, projectId: number) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

function ProjectCardView({ project, onDragStart, onDragEnd, isDragging }: ProjectCardViewProps) {
  const navigate = useNavigate();
  const divisions = getProjectDivisions(project);
  const urgent = project.priority === 'HIGH' || isLateProject(project);
  const progress = PROGRESS_BY_STATUS[project.status];

  const cardClasses = urgent
    ? 'bg-white border-2 border-primary-container shadow-md'
    : project.status === 'CLOTURE'
      ? 'bg-emerald-50 border border-emerald-200'
      : 'bg-white border border-outline-variant hover:border-primary-container/40';

  return (
    <div
      className={`${cardClasses} p-4 rounded-lg relative overflow-hidden cursor-grab active:cursor-grabbing group active:scale-[0.98] hover:shadow-md transition-all ${
        isDragging ? 'opacity-40' : ''
      }`}
      draggable
      onClick={() => navigate(`/projets/${project.id}`)}
      onDragEnd={onDragEnd}
      onDragStart={(event) => onDragStart(event, project.id)}
    >
      {urgent && (
        <div className="absolute top-2 -right-4 w-24 text-center rotate-45 bg-primary text-white text-[9px] font-bold py-1">
          {isLateProject(project) ? 'RETARD' : 'URGENT'}
        </div>
      )}
      <div className="flex justify-between items-start mb-3">
        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-tighter font-bold ${PRIORITY_BADGE_CLASSES[project.priority]}`}>
          {project.priority_display}
        </span>
        {project.status === 'CLOTURE' ? (
          <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
        ) : (
          <span className="material-symbols-outlined text-secondary opacity-0 group-hover:opacity-100 transition-opacity text-[18px]">open_in_new</span>
        )}
      </div>
      <h4 className="text-[15px] font-bold text-on-surface mb-1 leading-snug">{project.name}</h4>
      <p className="text-secondary text-xs mb-3">{project.client_name}</p>

      {divisions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {divisions.map((division) => (
            <span key={division} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container text-[10px] font-medium text-secondary">
              <span className="material-symbols-outlined text-[12px]">{getDivisionIcon(division)}</span>
              {division}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-on-surface text-sm">{project.budget ? formatAmount(Number(project.budget)) : '—'}</span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-secondary font-medium">{formatProjectDeadline(project.deadline)}</span>
          {project.created_by_name && (
            <div className="w-7 h-7 rounded-full border-2 border-white bg-primary-container text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm" title={project.created_by_name}>
              {getInitials(project.created_by_name)}
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 bg-surface-container rounded-full h-1.5 w-full">
        <div className={`h-1.5 rounded-full ${progress >= 100 ? 'bg-emerald-600' : 'bg-orange-500'}`} style={{ width: `${progress}%` }} />
      </div>
      <p className="text-[10px] text-secondary mt-1 text-right">Progression : {progress}%</p>
    </div>
  );
}

type ViewMode = 'KANBAN' | 'LISTE';

export default function DgProjetsPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('KANBAN');
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [draggedProjectId, setDraggedProjectId] = useState<number | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<ProjectStatus | null>(null);

  useEffect(() => {
    listProjects({ kind: 'PROJET' })
      .then(setProjects)
      .finally(() => setIsLoadingProjects(false));
  }, []);

  const projectsByStatus = useMemo(() => {
    const map = new Map<ProjectStatus, Project[]>();
    for (const option of STATUS_OPTIONS) map.set(option.value, []);
    for (const project of projects) map.get(project.status)?.push(project);
    return map;
  }, [projects]);

  function handleCardDragStart(event: DragEvent<HTMLDivElement>, projectId: number) {
    event.dataTransfer.effectAllowed = 'move';
    setDraggedProjectId(projectId);
  }

  function handleCardDragEnd() {
    setDraggedProjectId(null);
    setDragOverStatus(null);
  }

  function handleColumnDrop(event: DragEvent<HTMLDivElement>, status: ProjectStatus) {
    event.preventDefault();
    setDragOverStatus(null);
    const projectId = draggedProjectId;
    setDraggedProjectId(null);
    if (projectId === null) return;
    const project = projects.find((p) => p.id === projectId);
    if (!project || project.status === status) return;

    const previousStatus = project.status;
    setProjects((current) => current.map((p) => (p.id === projectId ? { ...p, status } : p)));
    updateProjectStatus(projectId, status).catch(() => {
      setProjects((current) => current.map((p) => (p.id === projectId ? { ...p, status: previousStatus } : p)));
    });
  }

  return (
    <div className="flex flex-col gap-gutter">
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">Projets</h2>
          <p className="text-secondary mt-1 text-sm">Le flux de travail des projets confirmés, division par division.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-outline-variant rounded-lg p-1">
            {(['KANBAN', 'LISTE'] as ViewMode[]).map((mode) => (
              <button
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                  viewMode === mode ? 'bg-primary text-white' : 'text-secondary hover:bg-surface-container'
                }`}
                key={mode}
                onClick={() => setViewMode(mode)}
                type="button"
              >
                <span className="material-symbols-outlined text-[15px]">{mode === 'KANBAN' ? 'view_kanban' : 'table_rows'}</span>
                {mode === 'KANBAN' ? 'Kanban' : 'Liste'}
              </button>
            ))}
          </div>
          <button
            className="flex items-center gap-1.5 bg-primary text-white pl-3 pr-4 py-2 rounded-full text-xs font-bold shadow-sm hover:shadow-md hover:bg-on-primary-fixed-variant active:scale-95 transition-all"
            onClick={() => navigate('/projets/nouveau')}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Nouveau projet
          </button>
        </div>
      </section>

      {isLoadingProjects ? (
        <div className="flex items-center justify-center py-16 text-secondary text-sm">Chargement des projets...</div>
      ) : viewMode === 'LISTE' ? (
        <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="px-6 py-4 font-bold text-secondary text-[11px] uppercase tracking-widest">Projet</th>
                  <th className="px-6 py-4 font-bold text-secondary text-[11px] uppercase tracking-widest">Client</th>
                  <th className="px-6 py-4 font-bold text-secondary text-[11px] uppercase tracking-widest">Divisions</th>
                  <th className="px-6 py-4 font-bold text-secondary text-[11px] uppercase tracking-widest">Statut</th>
                  <th className="px-6 py-4 font-bold text-secondary text-[11px] uppercase tracking-widest">Priorité</th>
                  <th className="px-6 py-4 font-bold text-secondary text-[11px] uppercase tracking-widest">Budget</th>
                  <th className="px-6 py-4 font-bold text-secondary text-[11px] uppercase tracking-widest">Échéance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {projects.map((project) => {
                  const divisions = getProjectDivisions(project);
                  return (
                    <tr
                      className="hover:bg-surface-container-lowest transition-colors cursor-pointer"
                      key={project.id}
                      onClick={() => navigate(`/projets/${project.id}`)}
                    >
                      <td className="px-6 py-4">
                        <p className="font-bold text-primary text-sm hover:underline">{project.name}</p>
                      </td>
                      <td className="px-6 py-4 text-on-surface text-sm">{project.client_name}</td>
                      <td className="px-6 py-4">
                        {divisions.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {divisions.map((division) => (
                              <span key={division} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container text-[10px] font-medium text-secondary">
                                <span className="material-symbols-outlined text-[12px]">{getDivisionIcon(division)}</span>
                                {division}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-secondary text-sm">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-secondary uppercase tracking-wider">
                          <span className={`w-2 h-2 rounded-full ${STATUS_DOT_CLASSES[project.status]}`} />
                          {project.status_display}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-tighter font-bold ${PRIORITY_BADGE_CLASSES[project.priority]}`}>
                          {project.priority_display}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-sm text-on-surface">
                        {project.budget ? formatAmount(Number(project.budget)) : '—'}
                      </td>
                      <td className={`px-6 py-4 text-sm ${isLateProject(project) ? 'text-error font-bold' : 'text-secondary'}`}>
                        {formatProjectDeadline(project.deadline)}
                      </td>
                    </tr>
                  );
                })}
                {projects.length === 0 && (
                  <tr>
                    <td className="px-6 py-8 text-center text-secondary font-body-sm" colSpan={7}>
                      Aucun projet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex gap-6 overflow-x-auto custom-scrollbar pb-4">
          {STATUS_OPTIONS.map((column) => {
            const columnProjects = projectsByStatus.get(column.value) ?? [];
            return (
              <div className="min-w-[300px] w-[300px] flex flex-col gap-3" key={column.value}>
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${STATUS_DOT_CLASSES[column.value]}`} />
                    <span className="font-bold text-secondary uppercase text-[11px] tracking-widest">{column.label}</span>
                    <span className="bg-surface-container-high px-2 py-0.5 rounded text-[10px] font-bold text-secondary">{columnProjects.length}</span>
                  </div>
                  <span className="text-secondary text-[11px] font-bold">{formatAmount(projectColumnTotal(columnProjects))}</span>
                </div>
                <div
                  className={`flex-1 border rounded-xl p-3 flex flex-col gap-3 min-h-[420px] transition-colors ${
                    dragOverStatus === column.value ? 'bg-primary-fixed/20 border-primary-container' : 'bg-surface-container-low/50 border-outline-variant/30'
                  }`}
                  onDragLeave={() => setDragOverStatus((current) => (current === column.value ? null : current))}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragOverStatus(column.value);
                  }}
                  onDrop={(event) => handleColumnDrop(event, column.value)}
                >
                  {columnProjects.length > 0 ? (
                    columnProjects.map((project) => (
                      <ProjectCardView
                        isDragging={draggedProjectId === project.id}
                        key={project.id}
                        onDragEnd={handleCardDragEnd}
                        onDragStart={handleCardDragStart}
                        project={project}
                      />
                    ))
                  ) : (
                    <div className="flex-1 flex items-center justify-center border-2 border-dashed border-outline-variant/20 rounded-lg min-h-[380px]">
                      <span className="text-secondary text-sm italic opacity-40">Aucun projet</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
