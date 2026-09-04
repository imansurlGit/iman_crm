import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVipWorkspace, type ProductionOrder } from '../context/VipWorkspaceContext';

const CARD_CLASSES = 'bg-white rounded-lg border border-outline-variant';

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isOverdue(order: ProductionOrder): boolean {
  return order.statut !== 'TERMINE' && new Date(order.echeance) < new Date();
}

interface ProjectBreakdown {
  projectId: number;
  projet: string;
  client: string;
  doneTasks: number;
  totalTasks: number;
}

export default function DashboardVipPage() {
  const navigate = useNavigate();
  const { orders, isLoading } = useVipWorkspace();

  const aLancer = orders.filter((o) => o.statut === 'A_LANCER');
  const enCours = orders.filter((o) => o.statut === 'EN_COURS');
  const termine = orders.filter((o) => o.statut === 'TERMINE');
  const enRetard = orders.filter(isOverdue);

  const priorityOrders = useMemo(
    () =>
      [...aLancer, ...enCours]
        .sort((a, b) => (isOverdue(b) ? 1 : 0) - (isOverdue(a) ? 1 : 0) || a.echeance.localeCompare(b.echeance))
        .slice(0, 6),
    [aLancer, enCours],
  );

  const byProject = useMemo(() => {
    const map = new Map<number, ProjectBreakdown>();
    for (const order of orders) {
      const entry = map.get(order.projectId) ?? { projectId: order.projectId, projet: order.projet, client: order.client, doneTasks: 0, totalTasks: 0 };
      entry.doneTasks += order.doneTasks;
      entry.totalTasks += order.totalTasks;
      map.set(order.projectId, entry);
    }
    return Array.from(map.values()).slice(0, 5);
  }, [orders]);

  if (isLoading) {
    return <p className="font-body-sm text-body-sm text-secondary">Chargement...</p>;
  }

  const KPI_CARDS = [
    { icon: 'pending_actions', label: 'À lancer', value: String(aLancer.length), footer: 'Prestations pas encore démarrées', tone: '' },
    { icon: 'autorenew', label: 'En production', value: String(enCours.length), footer: 'Prestations en cours', tone: '' },
    {
      icon: 'schedule',
      label: 'En retard',
      value: String(enRetard.length),
      footer: 'Échéance dépassée',
      tone: enRetard.length > 0 ? 'border-error/30' : '',
    },
    { icon: 'task_alt', label: 'Terminées', value: String(termine.length), footer: 'Prêtes pour livraison', tone: '' },
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-3">
      <section>
        <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">Suivi de la production</h2>
        <p className="text-secondary mt-1 text-sm">Les prestations de votre division, une fois les designs validés.</p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
        {KPI_CARDS.map((kpi) => (
          <div className={`${CARD_CLASSES} p-2.5 ${kpi.tone}`} key={kpi.label}>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-secondary-container rounded shrink-0">
                <span className="material-symbols-outlined text-[15px] text-primary-container">{kpi.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-secondary text-[9px] font-medium uppercase tracking-wider truncate">{kpi.label}</p>
                <h3 className="font-headline-md text-sm font-bold text-on-surface leading-tight">{kpi.value}</h3>
              </div>
            </div>
            <p className="text-secondary text-[9px] mt-1 truncate">{kpi.footer}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-12 gap-3">
        <div className={`${CARD_CLASSES} col-span-12 lg:col-span-8 p-5`}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-headline-md text-sm font-bold text-primary">Prestations prioritaires</h4>
            <button className="text-xs font-bold text-primary hover:underline" onClick={() => navigate('/vip/production')} type="button">
              Voir tout le suivi
            </button>
          </div>
          <div className="space-y-2">
            {priorityOrders.map((order) => {
              const overdue = isOverdue(order);
              return (
                <button
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-left transition-colors ${
                    overdue ? 'bg-error-container/20' : 'bg-surface-container-low hover:bg-surface-container-high'
                  }`}
                  key={order.id}
                  onClick={() => navigate(`/projets/${order.projectId}`)}
                  type="button"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-on-surface truncate">{order.titre}</p>
                    <p className="text-xs text-secondary truncate">
                      {order.client} · {order.doneTasks}/{order.totalTasks} tâches
                    </p>
                  </div>
                  <span className={`text-[11px] font-bold shrink-0 ${overdue ? 'text-error' : 'text-secondary'}`}>
                    {formatDate(order.echeance)}
                  </span>
                </button>
              );
            })}
            {priorityOrders.length === 0 && <p className="text-sm text-secondary">Aucune prestation en attente. 🎉</p>}
          </div>
        </div>

        <div className={`${CARD_CLASSES} col-span-12 lg:col-span-4 p-5`}>
          <h4 className="font-headline-md text-sm font-bold text-primary mb-4">Avancement par projet</h4>
          <div className="space-y-4">
            {byProject.map((project) => {
              const progress = project.totalTasks ? Math.round((project.doneTasks / project.totalTasks) * 100) : 0;
              return (
                <button
                  className="w-full text-left"
                  key={project.projectId}
                  onClick={() => navigate(`/projets/${project.projectId}`)}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold text-on-surface truncate">{project.projet}</p>
                    <span className="text-[11px] font-bold text-secondary shrink-0">{progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                    <div className={`h-full rounded-full ${progress >= 100 ? 'bg-emerald-500' : 'bg-primary'}`} style={{ width: `${progress}%` }} />
                  </div>
                </button>
              );
            })}
            {byProject.length === 0 && <p className="text-sm text-secondary">Aucun projet pour l'instant.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
