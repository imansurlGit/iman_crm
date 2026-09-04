import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listContacts, type Contact } from '../services/contactService';
import {
  listProjects,
  formatProjectDeadline,
  getProjectDivisions,
  PRIORITY_BADGE_CLASSES,
  PRIORITY_OPTIONS,
  STATUS_BADGE_CLASSES,
  type Project,
  type ProjectPriority,
} from '../services/projectService';

const SELECT_CLASSES =
  'bg-surface-container border border-outline-variant py-2 pl-9 pr-8 text-sm focus:outline-none focus:border-primary-container transition-all appearance-none';

export default function MesProjetsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<ProjectPriority | ''>('');

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [clients, allProjects] = await Promise.all([listContacts('CLIENT'), listProjects({ kind: 'PROJET' })]);
        const myClientIds = new Set(
          clients.filter((c: Contact) => c.assigned_to === user?.id).map((c) => c.id),
        );
        setProjects(allProjects.filter((project) => myClientIds.has(project.client)));
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [user?.id]);

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

  return (
    <div className="flex flex-col gap-gutter">
      <section>
        <h2 className="font-headline-md text-headline-md text-on-surface">Mes Projets</h2>
        <p className="font-body-md text-body-md text-secondary mt-2">
          Les projets en cours pour les clients dont vous avez la charge.
        </p>
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

      <section className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="px-6 py-4 font-bold text-secondary text-[11px] uppercase tracking-widest">Nom du projet</th>
                <th className="px-6 py-4 font-bold text-secondary text-[11px] uppercase tracking-widest">Client</th>
                <th className="px-6 py-4 font-bold text-secondary text-[11px] uppercase tracking-widest">Échéance</th>
                <th className="px-6 py-4 font-bold text-secondary text-[11px] uppercase tracking-widest">Priorité</th>
                <th className="px-6 py-4 font-bold text-secondary text-[11px] uppercase tracking-widest">Avancement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {filteredProjects.map((project) => (
                <tr className="hover:bg-surface-container-lowest transition-colors" key={project.id}>
                  <td className="px-6 py-4 font-bold text-primary text-sm">{project.name}</td>
                  <td className="px-6 py-4 text-on-surface text-sm">{project.client_name}</td>
                  <td className="px-6 py-4 text-secondary text-sm">{formatProjectDeadline(project.deadline)}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${PRIORITY_BADGE_CLASSES[project.priority]}`}
                    >
                      {project.priority_display}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_BADGE_CLASSES[project.status]}`}
                    >
                      {project.status_display}
                    </span>
                  </td>
                </tr>
              ))}
              {!isLoading && filteredProjects.length === 0 && (
                <tr>
                  <td className="px-6 py-8 text-center text-secondary font-body-sm" colSpan={5}>
                    Aucun projet ne correspond à votre recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
