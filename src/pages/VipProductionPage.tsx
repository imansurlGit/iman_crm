import { useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVipWorkspace, type OrderStatus, type ProductionOrder } from '../context/VipWorkspaceContext';

// Le passage à "Prêt pour livraison" concerne le PROJET (une seule étape
// Exécution dans le parcours commercial, voir commercialWorkflow.ts), pas
// la prestation individuelle — le bouton n'apparaît donc que si le projet en
// est encore à l'étape Exécution (project.status === 'PRET_POUR_EXECUTION').

const STATUS_SEQUENCE: OrderStatus[] = ['A_LANCER', 'EN_COURS', 'TERMINE'];

const STATUS_META: Record<OrderStatus, { title: string; headerBg: string; dot: string; count: string }> = {
  A_LANCER: { title: 'À lancer', headerBg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500', count: 'bg-amber-100 text-amber-700' },
  EN_COURS: {
    title: 'En production',
    headerBg: 'bg-primary-fixed/30 border-primary-fixed',
    dot: 'bg-primary-container',
    count: 'bg-primary-fixed text-primary',
  },
  TERMINE: { title: 'Terminé', headerBg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500', count: 'bg-emerald-100 text-emerald-700' },
};

const SEARCH_INPUT_CLASSES =
  'w-full bg-surface-container border border-outline-variant py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary-container transition-all';

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isOverdue(order: ProductionOrder): boolean {
  return order.statut !== 'TERMINE' && new Date(order.echeance) < new Date();
}

export default function VipProductionPage() {
  const navigate = useNavigate();
  const { orders, isLoading, markExecutionComplete } = useVipWorkspace();
  const [search, setSearch] = useState('');
  const [completingProjectId, setCompletingProjectId] = useState<number | null>(null);

  async function handleMarkExecutionComplete(order: ProductionOrder, event: ReactMouseEvent) {
    event.stopPropagation();
    if (completingProjectId) return;
    setCompletingProjectId(order.projectId);
    try {
      await markExecutionComplete(order.projectId);
    } finally {
      setCompletingProjectId(null);
    }
  }

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders.filter(
      (order) => !query || order.titre.toLowerCase().includes(query) || order.client.toLowerCase().includes(query) || order.projet.toLowerCase().includes(query),
    );
  }, [orders, search]);

  const grouped = useMemo(() => {
    const map: Record<OrderStatus, ProductionOrder[]> = { A_LANCER: [], EN_COURS: [], TERMINE: [] };
    for (const order of filteredOrders) {
      map[order.statut].push(order);
    }
    for (const statut of STATUS_SEQUENCE) {
      map[statut].sort((a, b) => (isOverdue(b) ? 1 : 0) - (isOverdue(a) ? 1 : 0) || a.echeance.localeCompare(b.echeance));
    }
    return map;
  }, [filteredOrders]);

  if (isLoading) {
    return <p className="font-body-sm text-body-sm text-secondary">Chargement...</p>;
  }

  return (
    <div className="flex flex-col gap-gutter">
      <section>
        <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">Suivi production</h2>
        <p className="text-secondary mt-1 text-sm">
          Les prestations affectées à votre division, classées selon l'avancement réel de leurs tâches.
        </p>
      </section>

      <div className="relative">
        <span className="absolute inset-y-0 left-3 flex items-center text-outline">
          <span className="material-symbols-outlined text-sm">search</span>
        </span>
        <input
          className={SEARCH_INPUT_CLASSES}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher une prestation, un client, un projet..."
          type="text"
          value={search}
        />
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[900px] grid-cols-3 gap-3">
          {STATUS_SEQUENCE.map((statut) => {
            const meta = STATUS_META[statut];
            const items = grouped[statut];
            return (
              <div className="flex flex-col gap-2.5" key={statut}>
                <div className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${meta.headerBg}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
                    <p className="text-sm font-semibold text-on-surface">{meta.title}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${meta.count}`}>{items.length}</span>
                </div>

                {items.map((order) => {
                  const overdue = isOverdue(order);
                  const progress = order.totalTasks ? Math.round((order.doneTasks / order.totalTasks) * 100) : 0;
                  const canMarkComplete = order.projectStatus === 'PRET_POUR_EXECUTION';
                  return (
                    <div
                      className={`text-left bg-white border rounded-lg p-3.5 shadow-sm hover:border-primary transition-colors cursor-pointer ${
                        overdue ? 'border-error/40' : 'border-outline-variant'
                      }`}
                      key={order.id}
                      onClick={() => navigate(`/projets/${order.projectId}`)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') navigate(`/projets/${order.projectId}`);
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold text-on-surface">{order.titre}</p>
                        {overdue && <span className="text-[10px] font-bold text-error shrink-0">En retard</span>}
                      </div>
                      <p className="text-xs text-secondary mt-0.5">
                        {order.client} · {order.projet}
                      </p>
                      {order.instructions && (
                        <p className="text-[11px] text-on-surface-variant mt-2 leading-snug line-clamp-2">{order.instructions}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2.5">
                        <div className="flex-1 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                          <div
                            className={`h-full rounded-full ${progress >= 100 ? 'bg-emerald-500' : 'bg-primary'}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-secondary shrink-0">
                          {order.doneTasks}/{order.totalTasks}
                        </span>
                      </div>
                      <p className={`text-[11px] font-bold mt-2 ${overdue ? 'text-error' : 'text-secondary'}`}>
                        Échéance : {formatDate(order.echeance)}
                      </p>
                      {canMarkComplete && (
                        <button
                          className="w-full flex items-center justify-center gap-1.5 mt-3 pt-3 border-t border-outline-variant text-xs font-bold text-primary hover:text-on-primary-fixed-variant disabled:opacity-50 transition-colors"
                          disabled={completingProjectId === order.projectId}
                          onClick={(event) => handleMarkExecutionComplete(order, event)}
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                          {completingProjectId === order.projectId ? 'Enregistrement...' : "Marquer l'exécution comme terminée"}
                        </button>
                      )}
                    </div>
                  );
                })}

                {items.length === 0 && (
                  <div className="rounded-lg border border-dashed border-outline-variant p-4 text-center">
                    <p className="text-xs text-secondary">Aucune prestation</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
