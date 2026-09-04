import { useRdwWorkspace } from '../context/RdwWorkspaceContext';

function formatDate(value: string | null): string {
  if (!value) return 'Sans échéance';
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function RdwProjetsPage() {
  const { projects, isLoading } = useRdwWorkspace();

  return (
    <div className="flex flex-col gap-gutter">
      <section>
        <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">Projets web</h2>
        <p className="text-secondary mt-1 text-sm">Les projets de développement suivis par votre équipe.</p>
      </section>

      {isLoading ? (
        <p className="text-sm text-secondary py-6 text-center">Chargement...</p>
      ) : (
        <div className="bg-white border border-outline-variant rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-secondary">Projet</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-secondary">Client</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-secondary">Statut</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-secondary">Avancement</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-secondary">Tâches restantes</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-secondary">Échéance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {projects.map((project) => (
                <tr className="hover:bg-surface-container-lowest transition-colors" key={project.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-primary-container/10 text-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[16px]">account_tree</span>
                      </div>
                      <p className="text-sm font-semibold text-on-surface truncate max-w-[220px]" title={project.name}>
                        {project.name}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-on-surface-variant">{project.clientName}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-surface-container-high text-secondary">
                      {project.statusDisplay}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 w-32">
                      <div className="flex-1 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${project.avancement}%` }} />
                      </div>
                      <span className="text-[11px] font-bold text-secondary shrink-0">{project.avancement}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-on-surface-variant">
                    {project.remainingTasks} tâche{project.remainingTasks !== 1 ? 's' : ''}
                  </td>
                  <td className="px-4 py-3 text-sm text-on-surface-variant">{formatDate(project.deadline)}</td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-secondary" colSpan={6}>
                    Aucun projet en cours pour l'instant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
