import { useEffect, useMemo, useState } from 'react';
import { listProjects, formatProjectDeadline, type Project } from '../services/projectService';
import { createProjectPayment } from '../services/projectPaymentService';

// Seule la Comptabilité peut confirmer l'encaissement d'un acompte (voir
// `ProjectPaymentViewSet` côté backend) — cette page liste les opportunités
// qui en attendent une, tous commerciaux confondus. Confirmer ici enregistre
// un vrai encaissement dans le grand livre du projet (voir /finance), pas
// seulement un booléen — `deposit_received` se met à jour tout seul une fois
// le montant de l'acompte atteint.

function formatFCFA(value: string | null): string {
  if (!value) return '—';
  const amount = Number(value);
  return Number.isNaN(amount) ? '—' : `${amount.toLocaleString('fr-FR')} FCFA`;
}

export default function AcomptesAConfirmerPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  useEffect(() => {
    setIsLoading(true);
    listProjects()
      .then((data) => setProjects(data.filter((p) => p.requires_deposit && !p.deposit_received)))
      .finally(() => setIsLoading(false));
  }, []);

  const totalPending = useMemo(
    () => projects.reduce((sum, p) => sum + (p.deposit_amount ? Number(p.deposit_amount) : 0), 0),
    [projects],
  );

  async function handleConfirm(project: Project) {
    if (confirmingId || !project.deposit_amount) return;
    setConfirmingId(project.id);
    try {
      await createProjectPayment({
        project: project.id,
        amount: project.deposit_amount,
        method: 'VIREMENT',
        note: 'Acompte',
        paid_at: new Date().toISOString(),
      });
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
    } finally {
      setConfirmingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-gutter">
      <section>
        <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">Acomptes à confirmer</h2>
        <p className="text-secondary mt-1 text-sm">
          Opportunités dont le démarrage est bloqué en attendant la confirmation d'encaissement de l'acompte.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
        <div className="bg-surface-container-lowest border border-outline-variant p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-amber-600 text-2xl shrink-0">schedule</span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">En attente de confirmation</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{projects.length}</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-primary-container text-2xl shrink-0">payments</span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">Montant total attendu</span>
            <span className="font-headline-md text-base font-bold text-on-surface leading-tight">
              {totalPending.toLocaleString('fr-FR')} FCFA
            </span>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-2">
        {isLoading && <p className="text-sm text-secondary py-6 text-center">Chargement...</p>}

        {!isLoading &&
          projects.map((project) => (
            <div className="bg-white border border-outline-variant rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-4" key={project.id}>
              <div className="w-11 h-11 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">payments</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-on-surface">{project.name}</p>
                <p className="text-xs text-secondary mt-0.5">
                  {project.client_name} · Budget {formatFCFA(project.budget)}
                  {project.deadline && ` · Échéance ${formatProjectDeadline(project.deadline)}`}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">Acompte attendu</p>
                <p className="text-sm font-bold text-amber-700">{formatFCFA(project.deposit_amount)}</p>
              </div>
              <button
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 shrink-0"
                disabled={confirmingId === project.id}
                onClick={() => handleConfirm(project)}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                {confirmingId === project.id ? 'Confirmation...' : "Confirmer l'encaissement"}
              </button>
            </div>
          ))}

        {!isLoading && projects.length === 0 && (
          <div className="text-center text-secondary text-sm py-10 bg-white border border-dashed border-outline-variant rounded-lg">
            Aucun acompte en attente de confirmation.
          </div>
        )}
      </div>
    </div>
  );
}
