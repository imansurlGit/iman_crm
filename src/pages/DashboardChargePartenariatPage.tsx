import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartenariatDossiers, type Dossier } from '../context/PartenariatDossiersContext';
import { STEP_DEFINITIONS, stepIndex, type DossierStep } from '../data/partenariatDossiers';

const CARD_CLASSES = 'bg-white rounded-lg border border-outline-variant';

function isBlocked(dossier: Dossier): boolean {
  return dossier.current_step === 'PAIEMENT_INITIAL' && dossier.requires_payment && !dossier.payment_received;
}

function needsAttention(dossier: Dossier): boolean {
  return (
    isBlocked(dossier) ||
    dossier.urgent ||
    dossier.current_step === 'CREATION' ||
    (dossier.current_step === 'SIGNATURE_CONVENTION' && dossier.convention_status !== 'SIGNEE') ||
    (dossier.current_step === 'BILAN' && !dossier.bilan_valide)
  );
}

function reasonFor(dossier: Dossier): string {
  if (isBlocked(dossier)) return 'Paiement initial en attente';
  if (dossier.current_step === 'CREATION') return 'À transmettre au Head of Marketing';
  if (dossier.current_step === 'SIGNATURE_CONVENTION' && dossier.convention_status !== 'SIGNEE') return 'Convention non signée';
  if (dossier.current_step === 'BILAN' && !dossier.bilan_valide) return 'Bilan à déposer';
  return 'Urgent';
}

const STEP_GROUPS: { label: string; steps: DossierStep[]; barClasses: string }[] = [
  { label: 'Qualification', steps: ['CREATION', 'TRANSMISSION', 'DISCUSSIONS', 'ACCORD_PRINCIPE'], barClasses: 'bg-primary/40' },
  {
    label: 'Convention & paiement',
    steps: ['PREPARATION_CONVENTION', 'SIGNATURE_CONVENTION', 'PAIEMENT_INITIAL'],
    barClasses: 'bg-primary/70',
  },
  { label: 'Production & événement', steps: ['SUPPORTS_COMMUNICATION', 'DEPLOIEMENT', 'REALISATION'], barClasses: 'bg-primary' },
  { label: 'Bilan & clôture', steps: ['BILAN', 'CLOTURE'], barClasses: 'bg-emerald-600' },
];

export default function DashboardChargePartenariatPage() {
  const navigate = useNavigate();
  const { dossiers, isLoading } = usePartenariatDossiers();

  const activeDossiers = useMemo(() => dossiers.filter((d) => d.current_step !== 'CLOTURE'), [dossiers]);
  const blockedCount = dossiers.filter(isBlocked).length;
  const pendingSignatureCount = dossiers.filter(
    (d) => d.current_step === 'SIGNATURE_CONVENTION' && d.convention_status !== 'SIGNEE',
  ).length;
  const closedCount = dossiers.filter((d) => d.current_step === 'CLOTURE').length;

  const attentionList = useMemo(
    () => dossiers.filter(needsAttention).sort((a, b) => (isBlocked(b) ? 1 : 0) - (isBlocked(a) ? 1 : 0)),
    [dossiers],
  );

  const maxGroupCount = Math.max(
    1,
    ...STEP_GROUPS.map((group) => activeDossiers.filter((d) => group.steps.includes(d.current_step)).length),
  );

  if (isLoading) {
    return <p className="font-body-sm text-body-sm text-secondary">Chargement...</p>;
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-gutter">
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">Tableau de bord Partenariats</h2>
          <p className="text-secondary mt-1 text-sm">Suivi des dossiers de partenariat, de la création à la clôture.</p>
        </div>
        <button
          className="flex items-center gap-1.5 bg-primary text-white pl-3 pr-4 py-2 rounded-full text-xs font-bold shadow-sm hover:shadow-md hover:bg-on-primary-fixed-variant active:scale-95 transition-all shrink-0"
          onClick={() => navigate('/partenariats/dossiers')}
          type="button"
        >
          <span className="material-symbols-outlined text-[16px]">folder_shared</span>
          Voir tous les dossiers
        </button>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
        <div className={`${CARD_CLASSES} p-4 flex items-center gap-3`}>
          <span className="material-symbols-outlined text-primary-container text-2xl shrink-0">folder_shared</span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">Dossiers actifs</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{activeDossiers.length}</span>
          </div>
        </div>
        <div className={`${CARD_CLASSES} p-4 flex items-center gap-3 ${blockedCount > 0 ? 'border-error/30' : ''}`}>
          <span className={`material-symbols-outlined text-2xl shrink-0 ${blockedCount > 0 ? 'text-error' : 'text-primary-container'}`}>
            block
          </span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">Bloqués (paiement)</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{blockedCount}</span>
          </div>
        </div>
        <div className={`${CARD_CLASSES} p-4 flex items-center gap-3`}>
          <span className="material-symbols-outlined text-amber-600 text-2xl shrink-0">edit_document</span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">Conventions en attente</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{pendingSignatureCount}</span>
          </div>
        </div>
        <div className={`${CARD_CLASSES} p-4 flex items-center gap-3`}>
          <span className="material-symbols-outlined text-emerald-600 text-2xl shrink-0">task_alt</span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">Clôturés</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{closedCount}</span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-12 gap-gutter">
        {/* Dossiers nécessitant une action */}
        <div className={`${CARD_CLASSES} col-span-12 lg:col-span-7 p-6`}>
          <h4 className="font-headline-md text-lg font-bold text-primary mb-4">Dossiers nécessitant une action</h4>
          <div className="space-y-2">
            {attentionList.map((dossier) => {
              const index = stepIndex(dossier.current_step);
              return (
                <button
                  className="w-full flex items-center gap-3 px-3.5 py-3 bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-colors text-left"
                  key={dossier.id}
                  onClick={() => navigate(`/partenariats/dossiers/${dossier.id}`)}
                  type="button"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary-container/10 text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">{STEP_DEFINITIONS[index].icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-on-surface truncate">
                      {dossier.reference} — {dossier.partenaire_name}
                    </p>
                    <p className="text-xs text-error">{reasonFor(dossier)}</p>
                  </div>
                  <span className="material-symbols-outlined text-secondary shrink-0">chevron_right</span>
                </button>
              );
            })}
            {attentionList.length === 0 && <p className="text-sm text-secondary">Aucun dossier ne nécessite d'action pour l'instant.</p>}
          </div>
        </div>

        {/* Répartition par étape */}
        <div className={`${CARD_CLASSES} col-span-12 lg:col-span-5 p-6`}>
          <h4 className="font-headline-md text-lg font-bold text-primary mb-6">Répartition par phase</h4>
          <div className="space-y-4">
            {STEP_GROUPS.map((group) => {
              const count = activeDossiers.filter((d) => group.steps.includes(d.current_step)).length;
              return (
                <div className="space-y-1" key={group.label}>
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-on-surface">{group.label}</span>
                    <span className="font-bold text-on-surface">{count}</span>
                  </div>
                  <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${group.barClasses}`}
                      style={{ width: `${(count / maxGroupCount) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <a
            className="mt-6 block text-center py-2.5 bg-surface-container-high text-primary text-sm font-bold rounded-lg hover:bg-surface-container-highest transition-all"
            href="/calendrier-collaboratif"
          >
            Voir le calendrier collaboratif
          </a>
        </div>
      </section>
    </div>
  );
}
