// TODO: page volontairement statique pour caler le design du dashboard CDN —
// aucun modèle de ticket/incident ou d'infrastructure n'existe encore côté
// backend. L'équipe (RSI, RDW, développeurs) est également fictive.

const CARD_CLASSES = 'bg-white rounded-lg border border-outline-variant';

interface TeamMember {
  name: string;
  role: string;
  focus: string;
  workload: number;
}

const TEAM: TeamMember[] = [
  { name: 'Karim Assane', role: "Responsable Systèmes d'Information", focus: 'Infrastructure & sécurité', workload: 70 },
  { name: 'Nadia Souley', role: 'Responsable Développement Web', focus: 'Coordination des projets web', workload: 85 },
  { name: 'Ismaël Boubacar', role: 'Développeur Front-end', focus: 'Site web vitrine — Maiga Transport', workload: 60 },
  { name: 'Aminata Zakari', role: 'Développeur Back-end', focus: 'API interne — Refonte e-commerce', workload: 75 },
  { name: 'Oumar Sani', role: 'Développeur Full-stack', focus: 'Application mobile CRM', workload: 45 },
];

interface DigitalProject {
  name: string;
  client: string;
  responsable: string;
  deadline: string;
  avancement: number;
  statut: string;
}

const PROJECTS: DigitalProject[] = [
  { name: 'Site web vitrine', client: 'Maiga Transport & Logistique', responsable: 'Ismaël Boubacar', deadline: '2026-08-27', avancement: 40, statut: 'En cours' },
  { name: 'Refonte site e-commerce', client: 'Orange Niger', responsable: 'Aminata Zakari', deadline: '2026-09-10', avancement: 25, statut: 'En cours' },
  { name: 'Application mobile CRM', client: 'Usage interne', responsable: 'Oumar Sani', deadline: '2026-09-30', avancement: 15, statut: 'À traiter' },
  { name: 'Migration hébergement', client: 'Usage interne', responsable: 'Karim Assane', deadline: '2026-08-20', avancement: 80, statut: 'En cours' },
];

interface Ticket {
  id: number;
  title: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OUVERT' | 'EN_COURS' | 'RESOLU';
  reportedBy: string;
  date: string;
}

const TICKETS: Ticket[] = [
  { id: 1, title: 'Lenteur sur le tableau de bord Finance', priority: 'HIGH', status: 'EN_COURS', reportedBy: 'Rabi Oumarou', date: '2026-08-11' },
  { id: 2, title: "Erreur d'envoi d'email de notification", priority: 'MEDIUM', status: 'OUVERT', reportedBy: 'Bulma Brief', date: '2026-08-10' },
  { id: 3, title: 'Certificat SSL à renouveler', priority: 'HIGH', status: 'OUVERT', reportedBy: 'Karim Assane', date: '2026-08-09' },
  { id: 4, title: 'Bouton export PDF cassé sur mobile', priority: 'LOW', status: 'RESOLU', reportedBy: 'Halima Boubacar', date: '2026-08-06' },
];

const TICKET_STATUS_LABELS: Record<Ticket['status'], string> = {
  OUVERT: 'Ouvert',
  EN_COURS: 'En cours',
  RESOLU: 'Résolu',
};

const TICKET_STATUS_CLASSES: Record<Ticket['status'], string> = {
  OUVERT: 'bg-red-100 text-red-700',
  EN_COURS: 'bg-amber-100 text-amber-700',
  RESOLU: 'bg-emerald-100 text-emerald-700',
};

const PRIORITY_CLASSES: Record<Ticket['priority'], string> = {
  HIGH: 'bg-error text-white',
  MEDIUM: 'bg-amber-500 text-white',
  LOW: 'bg-gray-300 text-gray-800',
};

interface SystemStatus {
  label: string;
  status: 'OK' | 'ATTENTION' | 'INCIDENT';
  detail: string;
}

const SYSTEMS: SystemStatus[] = [
  { label: 'Serveur applicatif', status: 'OK', detail: '99,98 % de disponibilité (30j)' },
  { label: 'Base de données', status: 'OK', detail: 'Sauvegarde nocturne à jour' },
  { label: 'Hébergement mail', status: 'ATTENTION', detail: 'Certificat SSL expire dans 5 jours' },
  { label: 'CDN / stockage fichiers', status: 'OK', detail: 'Aucun incident sur 30 jours' },
];

const SYSTEM_STATUS_CLASSES: Record<SystemStatus['status'], string> = {
  OK: 'bg-emerald-500',
  ATTENTION: 'bg-amber-500',
  INCIDENT: 'bg-error',
};

function formatDate(value: string): string {
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

export default function DashboardCdnPage() {
  const activeProjects = PROJECTS.filter((p) => p.statut !== 'Terminé').length;
  const openTickets = TICKETS.filter((t) => t.status !== 'RESOLU').length;
  const avgWorkload = Math.round(TEAM.reduce((sum, m) => sum + m.workload, 0) / TEAM.length);
  const systemsOk = SYSTEMS.filter((s) => s.status === 'OK').length;

  return (
    <div className="max-w-[1400px] mx-auto space-y-gutter">
      <section>
        <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">Pilotage Numérique</h2>
        <p className="text-secondary mt-1 text-sm">Équipe, projets web, tickets et systèmes d'information de la division.</p>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
        <div className={`${CARD_CLASSES} p-4 flex items-center gap-3`}>
          <span className="material-symbols-outlined text-primary-container text-2xl shrink-0">account_tree</span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">Projets actifs</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{activeProjects}</span>
          </div>
        </div>
        <div className={`${CARD_CLASSES} p-4 flex items-center gap-3 ${openTickets > 0 ? 'border-error/30' : ''}`}>
          <span className={`material-symbols-outlined text-2xl shrink-0 ${openTickets > 0 ? 'text-error' : 'text-primary-container'}`}>
            bug_report
          </span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">Tickets ouverts</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{openTickets}</span>
          </div>
        </div>
        <div className={`${CARD_CLASSES} p-4 flex items-center gap-3`}>
          <span className="material-symbols-outlined text-indigo-600 text-2xl shrink-0">groups</span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">Charge moyenne équipe</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{avgWorkload}%</span>
          </div>
        </div>
        <div className={`${CARD_CLASSES} p-4 flex items-center gap-3`}>
          <span className="material-symbols-outlined text-emerald-600 text-2xl shrink-0">dns</span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">Systèmes opérationnels</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">
              {systemsOk}/{SYSTEMS.length}
            </span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-12 gap-gutter">
        {/* Équipe */}
        <div className={`${CARD_CLASSES} col-span-12 lg:col-span-7 p-6`}>
          <h4 className="font-headline-md text-lg font-bold text-primary mb-4">Mon équipe</h4>
          <div className="space-y-3">
            {TEAM.map((member) => (
              <div className="flex items-center gap-3" key={member.name}>
                <div className="w-9 h-9 rounded-full bg-primary-container text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                  {getInitials(member.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-on-surface">{member.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-container-high text-secondary font-bold uppercase">
                      {member.role}
                    </span>
                  </div>
                  <p className="text-xs text-secondary truncate">{member.focus}</p>
                </div>
                <div className="w-24 shrink-0 flex items-center gap-2">
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
          </div>
        </div>

        {/* Systèmes */}
        <div className={`${CARD_CLASSES} col-span-12 lg:col-span-5 p-6`}>
          <h4 className="font-headline-md text-lg font-bold text-primary mb-4">Systèmes d'information</h4>
          <div className="space-y-3">
            {SYSTEMS.map((system) => (
              <div className="flex items-center gap-3" key={system.label}>
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${SYSTEM_STATUS_CLASSES[system.status]}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-on-surface">{system.label}</p>
                  <p className="text-xs text-secondary truncate">{system.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-12 gap-gutter">
        {/* Projets numériques */}
        <div className={`${CARD_CLASSES} col-span-12 lg:col-span-7 p-6`}>
          <h4 className="font-headline-md text-lg font-bold text-primary mb-4">Projets de la division</h4>
          <div className="space-y-3">
            {PROJECTS.map((project) => (
              <div className="border border-outline-variant rounded-lg p-3.5" key={project.name}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-on-surface truncate">{project.name}</p>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-surface-container-high text-secondary shrink-0">
                    {project.statut}
                  </span>
                </div>
                <p className="text-xs text-secondary mt-0.5">
                  {project.client} · {project.responsable}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${project.avancement}%` }} />
                  </div>
                  <span className="text-[11px] font-bold text-secondary shrink-0">{project.avancement}%</span>
                  <span className="text-[11px] text-secondary shrink-0">· {formatDate(project.deadline)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tickets */}
        <div className={`${CARD_CLASSES} col-span-12 lg:col-span-5 p-6`}>
          <h4 className="font-headline-md text-lg font-bold text-primary mb-4">Tickets récents</h4>
          <div className="space-y-2.5">
            {TICKETS.map((ticket) => (
              <div className="px-3.5 py-3 bg-surface-container-low rounded-lg" key={ticket.id}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-on-surface truncate">{ticket.title}</p>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${PRIORITY_CLASSES[ticket.priority]}`}>
                    {ticket.priority}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-[11px] text-secondary">
                    {ticket.reportedBy} · {formatDate(ticket.date)}
                  </p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${TICKET_STATUS_CLASSES[ticket.status]}`}>
                    {TICKET_STATUS_LABELS[ticket.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
