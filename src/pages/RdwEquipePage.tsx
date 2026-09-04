import { useRdwWorkspace } from '../context/RdwWorkspaceContext';

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function RdwEquipePage() {
  const { team, isLoading } = useRdwWorkspace();

  return (
    <div className="flex flex-col gap-gutter">
      <section>
        <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">Mon équipe</h2>
        <p className="text-secondary mt-1 text-sm">Les développeurs de votre division et leur charge actuelle.</p>
      </section>

      {isLoading ? (
        <p className="text-sm text-secondary py-6 text-center">Chargement...</p>
      ) : (
        <div className="bg-white border border-outline-variant rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-secondary">Développeur</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-secondary">Focus actuel</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-secondary">Charge</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-secondary">Tâches en cours</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-secondary">En retard</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {team.map((member) => (
                <tr className="hover:bg-surface-container-lowest transition-colors" key={member.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                        {getInitials(member.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-on-surface truncate">{member.name}</p>
                        <p className="text-[11px] text-secondary truncate">{member.roleDisplay}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-on-surface-variant truncate max-w-[280px]">{member.focus}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 w-28">
                      <div className="flex-1 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                        <div
                          className={`h-full rounded-full ${member.workload >= 80 ? 'bg-error' : 'bg-primary'}`}
                          style={{ width: `${member.workload}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-secondary shrink-0">{member.workload}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-on-surface-variant">{member.pendingCount}</td>
                  <td className="px-4 py-3">
                    {member.overdueCount > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-error-container text-error">
                        {member.overdueCount}
                      </span>
                    ) : (
                      <span className="text-secondary text-sm">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {team.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-secondary" colSpan={5}>
                    Aucun développeur dans votre division pour l'instant.
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
