import { useEffect, useMemo, useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDivisionIcon } from '../services/divisionService';
import {
  listProjects,
  updateProjectStatus,
  formatProjectDeadline,
  getProjectDivisions,
  PRIORITY_BADGE_CLASSES,
  PRIORITY_OPTIONS,
  STATUS_BADGE_CLASSES,
  STATUS_OPTIONS,
  type Project,
  type ProjectPriority,
  type ProjectStatus,
} from '../services/projectService';

const LATE_EXEMPT_STATUSES: ProjectStatus[] = ['LIVRE', 'CLOTURE'];

/** Avancement indicatif dérivé du statut réel du projet — aucun champ dédié
 * n'existe côté backend, ce mapping donne un repère visuel cohérent. */
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

function formatDeadlineDateOnly(value: string | null): string {
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

function isLate(project: Project) {
  return !!project.deadline && new Date(project.deadline) < new Date() && !LATE_EXEMPT_STATUSES.includes(project.status);
}

interface ProjectCardProps {
  project: Project;
  onDragStart: (event: DragEvent<HTMLDivElement>, projectId: number) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

function ProjectCard({ project, onDragStart, onDragEnd, isDragging }: ProjectCardProps) {
  const navigate = useNavigate();
  const divisions = getProjectDivisions(project);
  return (
    <div
      className={`bg-white p-4 rounded-lg border border-outline-variant shadow-sm hover:border-primary transition-all cursor-grab active:cursor-grabbing group active:scale-[0.98] ${
        isDragging ? 'opacity-40' : ''
      }`}
      draggable
      onClick={() => navigate(`/projets/${project.id}`)}
      onDragEnd={onDragEnd}
      onDragStart={(event) => onDragStart(event, project.id)}
    >
      <div className="flex justify-between items-start mb-3">
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${PRIORITY_BADGE_CLASSES[project.priority]}`}
        >
          {project.priority_display}
        </span>
        <span className="material-symbols-outlined text-secondary opacity-0 group-hover:opacity-100 transition-opacity text-[18px]">
          open_in_new
        </span>
      </div>
      <h4 className="font-bold text-on-surface mb-1 text-sm">{project.name}</h4>
      <p className="text-secondary text-xs mb-4">{project.client_name}</p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {divisions.map((division) => (
          <span
            key={division}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container text-[10px] font-medium text-secondary"
          >
            <span className="material-symbols-outlined text-[12px]">{getDivisionIcon(division)}</span>
            {division}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-outline-variant/30">
        <div className="flex items-center gap-2">
          {project.created_by_name ? (
            <>
              <div className="w-6 h-6 rounded-full bg-primary-container text-white flex items-center justify-center text-[10px] font-bold">
                {getInitials(project.created_by_name)}
              </div>
              <span className="text-[12px] text-secondary font-medium">{project.created_by_name}</span>
            </>
          ) : (
            <span className="text-[12px] text-secondary italic">—</span>
          )}
        </div>
        <span className="text-[11px] text-secondary font-medium">{formatProjectDeadline(project.deadline)}</span>
      </div>
    </div>
  );
}

const SELECT_CLASSES =
  'bg-surface-container border border-outline-variant py-2 pl-9 pr-8 text-sm focus:outline-none focus:border-primary-container transition-all appearance-none';

export default function ProjetsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isKanbanOnly = user?.role === 'DG';
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'kanban' | 'list'>(isKanbanOnly ? 'kanban' : 'list');
  const [search, setSearch] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<ProjectPriority | ''>('');
  const [draggedProjectId, setDraggedProjectId] = useState<number | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<ProjectStatus | null>(null);

  useEffect(() => {
    listProjects({ kind: 'PROJET' })
      .then(setProjects)
      .finally(() => setIsLoading(false));
  }, []);

  const allDivisions = useMemo(
    () => Array.from(new Set(projects.flatMap((p) => getProjectDivisions(p)))).sort(),
    [projects],
  );

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesQuery =
        !query ||
        project.name.toLowerCase().includes(query) ||
        project.client_name.toLowerCase().includes(query);
      const matchesDivision = !divisionFilter || getProjectDivisions(project).includes(divisionFilter);
      const matchesPriority = !priorityFilter || project.priority === priorityFilter;
      return matchesQuery && matchesDivision && matchesPriority;
    });
  }, [projects, search, divisionFilter, priorityFilter]);

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

  const inProgressCount = projects.filter((p) => p.status === 'EN_COURS').length;
  const highPriorityCount = projects.filter((p) => p.priority === 'HIGH').length;
  const lateCount = projects.filter(isLate).length;

  return (
    <div className="flex flex-col gap-gutter">
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">Pipeline Opérationnel</h2>
          <p className="text-secondary mt-1 text-sm">
            Gérez le flux de travail et les étapes de validation des projets clients.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isKanbanOnly && (
            <div className="flex items-center gap-1 p-1 bg-surface-container border border-outline-variant rounded-xl">
              <button
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  view === 'kanban' ? 'bg-white text-on-surface shadow-sm' : 'text-secondary hover:text-on-surface'
                }`}
                onClick={() => setView('kanban')}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">view_kanban</span>
                Vue Kanban
              </button>
              <button
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  view === 'list' ? 'bg-white text-on-surface shadow-sm' : 'text-secondary hover:text-on-surface'
                }`}
                onClick={() => setView('list')}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">view_list</span>
                Vue Liste
              </button>
            </div>
          )}
          <button
            className="flex items-center gap-1.5 bg-primary text-white pl-3 pr-4 py-2 rounded-full text-xs font-bold shadow-sm hover:shadow-md hover:bg-on-primary-fixed-variant active:scale-95 transition-all"
            onClick={() => navigate('/projets/nouveau')}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Nouveau Projet
          </button>
        </div>
      </section>

      {view === 'list' && (
        <>
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
            <div className="bg-surface-container-lowest border border-outline-variant p-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary-container text-2xl shrink-0">account_tree</span>
              <div className="min-w-0">
                <span className="text-secondary text-xs font-medium block truncate">Total Projets</span>
                <span className="font-headline-md text-headline-md text-on-surface leading-tight">{projects.length}</span>
              </div>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant p-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary-container text-2xl shrink-0">sync</span>
              <div className="min-w-0">
                <span className="text-secondary text-xs font-medium block truncate">En Cours</span>
                <span className="font-headline-md text-headline-md text-on-surface leading-tight">{inProgressCount}</span>
              </div>
            </div>
            <div
              className={`bg-surface-container-lowest border p-4 flex items-center gap-3 ${
                highPriorityCount > 0 ? 'border-error/30' : 'border-outline-variant'
              }`}
            >
              <span
                className={`material-symbols-outlined text-2xl shrink-0 ${highPriorityCount > 0 ? 'text-error' : 'text-primary-container'}`}
              >
                priority_high
              </span>
              <div className="min-w-0">
                <span className="text-secondary text-xs font-medium block truncate">Priorité Élevée</span>
                <span className="font-headline-md text-headline-md text-on-surface leading-tight">{highPriorityCount}</span>
              </div>
            </div>
            <div
              className={`bg-surface-container-lowest border p-4 flex items-center gap-3 ${
                lateCount > 0 ? 'border-error/30' : 'border-outline-variant'
              }`}
            >
              <span className={`material-symbols-outlined text-2xl shrink-0 ${lateCount > 0 ? 'text-error' : 'text-primary-container'}`}>
                schedule
              </span>
              <div className="min-w-0">
                <span className="text-secondary text-xs font-medium block truncate">En Retard</span>
                <span className="font-headline-md text-headline-md text-on-surface leading-tight">{lateCount}</span>
              </div>
            </div>
          </section>

          <section className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative flex-1 md:max-w-xl">
              <span className="absolute inset-y-0 left-3 flex items-center text-outline">
                <span className="material-symbols-outlined text-sm">search</span>
              </span>
              <input
                className="w-full bg-surface-container border border-outline-variant py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary-container transition-all"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un projet ou un client..."
                type="text"
                value={search}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-outline pointer-events-none">
                  <span className="material-symbols-outlined text-sm">category</span>
                </span>
                <select
                  className={SELECT_CLASSES}
                  onChange={(event) => setDivisionFilter(event.target.value)}
                  value={divisionFilter}
                >
                  <option value="">Toutes les divisions</option>
                  {allDivisions.map((division) => (
                    <option key={division} value={division}>
                      {division}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline text-sm pointer-events-none">
                  expand_more
                </span>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-outline pointer-events-none">
                  <span className="material-symbols-outlined text-sm">priority_high</span>
                </span>
                <select
                  className={SELECT_CLASSES}
                  onChange={(event) => setPriorityFilter(event.target.value as ProjectPriority | '')}
                  value={priorityFilter}
                >
                  <option value="">Toutes les priorités</option>
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline text-sm pointer-events-none">
                  expand_more
                </span>
              </div>
            </div>
          </section>
        </>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-secondary text-sm">Chargement des projets...</div>
      ) : view === 'kanban' ? (
        <div className="flex gap-6 overflow-x-auto custom-scrollbar pb-4">
          {STATUS_OPTIONS.map((column) => {
            const columnProjects = projects.filter((p) => p.status === column.value);
            return (
              <div className="min-w-[280px] flex flex-col gap-3" key={column.value}>
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-on-surface uppercase text-[11px] tracking-widest">{column.label}</span>
                    <span className="bg-surface-container-high px-2 py-0.5 rounded text-[10px] font-bold text-secondary">
                      {columnProjects.length}
                    </span>
                  </div>
                </div>
                <div
                  className={`flex-1 border rounded-xl p-3 flex flex-col gap-3 min-h-[420px] transition-colors ${
                    dragOverStatus === column.value
                      ? 'bg-primary-fixed/20 border-primary-container'
                      : 'bg-surface-container-low/50 border-outline-variant/30'
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
                      <ProjectCard
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
      ) : (
        <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="px-6 py-4 font-bold text-secondary text-[11px] uppercase tracking-widest">Nom du projet</th>
                  <th className="px-6 py-4 font-bold text-secondary text-[11px] uppercase tracking-widest">Client</th>
                  <th className="px-6 py-4 font-bold text-secondary text-[11px] uppercase tracking-widest">Échéance</th>
                  <th className="px-6 py-4 font-bold text-secondary text-[11px] uppercase tracking-widest">Priorité</th>
                  <th className="px-6 py-4 font-bold text-secondary text-[11px] uppercase tracking-widest">Avancement</th>
                  <th className="px-6 py-4 font-bold text-secondary text-[11px] uppercase tracking-widest">Statut</th>
                  <th className="px-6 py-4 font-bold text-secondary text-[11px] uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {filteredProjects.map((project) => {
                  const progress = PROGRESS_BY_STATUS[project.status];
                  return (
                    <tr className="hover:bg-surface-container-lowest transition-colors" key={project.id}>
                      <td className="px-6 py-4 font-bold text-primary text-sm">{project.name}</td>
                      <td className="px-6 py-4 text-on-surface text-sm">{project.client_name}</td>
                      <td className="px-6 py-4 text-secondary text-sm">{formatDeadlineDateOnly(project.deadline)}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${PRIORITY_BADGE_CLASSES[project.priority]}`}
                        >
                          {project.priority_display}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <div className="flex-1 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                            <div
                              className={`h-full rounded-full ${progress >= 100 ? 'bg-emerald-600' : 'bg-primary'}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-secondary shrink-0 w-8 text-right">{progress}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_BADGE_CLASSES[project.status]}`}
                        >
                          {project.status_display}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            className="w-8 h-8 inline-flex items-center justify-center text-xs font-semibold border border-outline-variant text-secondary hover:bg-surface-container-low hover:text-on-surface transition-all rounded-lg"
                            title="Modifier"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            className="w-8 h-8 inline-flex items-center justify-center text-xs font-bold bg-primary-container text-on-primary hover:bg-primary transition-all shadow-sm rounded-lg"
                            onClick={() => navigate(`/projets/${project.id}`)}
                            title="Voir Détail"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredProjects.length === 0 && (
                  <tr>
                    <td className="px-6 py-8 text-center text-secondary font-body-sm" colSpan={7}>
                      Aucun projet ne correspond à votre recherche.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
