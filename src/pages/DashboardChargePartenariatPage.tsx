import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartenariatDossiers, type Dossier } from '../context/PartenariatDossiersContext';
import { STEP_DEFINITIONS, stepIndex, type DossierStep } from '../data/partenariatDossiers';

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
    return (
      <div className="flex items-center justify-center min-h-[300px] text-slate-400 text-xs">
        <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
        Chargement...
      </div>
    );
  }

  return (
    <div className="max-w-[1480px] mx-auto space-y-5 pb-16 text-slate-800 animate-fadeIn">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">handshake</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-headline-md text-xl font-extrabold text-slate-900 tracking-tight">
                Tableau de bord Partenariats
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary">SPI</span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">Suivi des dossiers de partenariat, de la création à la clôture.</p>
          </div>
        </div>
        <button
          className="flex items-center gap-1.5 bg-primary text-white pl-3.5 pr-4 py-2 rounded-xl text-xs font-bold shadow-xs hover:bg-on-primary-fixed-variant active:scale-95 transition-all shrink-0"
          onClick={() => navigate('/partenariats/dossiers')}
          type="button"
        >
          <span className="material-symbols-outlined text-[16px]">folder_shared</span>
          Voir tous les dossiers
        </button>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-semibold">Dossiers actifs</span>
            <span className="material-symbols-outlined text-slate-400 text-[18px]">folder_shared</span>
          </div>
          <span className="text-2xl font-black text-slate-900 tracking-tight font-headline-md mt-2">{activeDossiers.length}</span>
        </div>

        <div
          className={`p-4 rounded-xl border shadow-2xs flex flex-col justify-between ${
            blockedCount > 0 ? 'bg-rose-50/50 border-rose-200/60' : 'bg-slate-50/50 border-slate-200/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${blockedCount > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
              Bloqués (paiement)
            </span>
            <span className={`material-symbols-outlined text-[18px] ${blockedCount > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
              block
            </span>
          </div>
          <span className="text-2xl font-black text-slate-900 tracking-tight font-headline-md mt-2">{blockedCount}</span>
        </div>

        <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/60 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-amber-700 text-xs font-semibold">Conventions en attente</span>
            <span className="material-symbols-outlined text-amber-500 text-[18px]">edit_document</span>
          </div>
          <span className="text-2xl font-black text-slate-900 tracking-tight font-headline-md mt-2">{pendingSignatureCount}</span>
        </div>

        <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/60 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-emerald-700 text-xs font-semibold">Clôturés</span>
            <span className="material-symbols-outlined text-emerald-500 text-[18px]">task_alt</span>
          </div>
          <span className="text-2xl font-black text-slate-900 tracking-tight font-headline-md mt-2">{closedCount}</span>
        </div>
      </section>

      <section className="grid grid-cols-12 gap-3.5">
        {/* Dossiers nécessitant une action */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs col-span-12 lg:col-span-7 p-5">
          <h4 className="font-headline-md text-sm font-bold text-slate-900 mb-4">Dossiers nécessitant une action</h4>
          <div className="space-y-2">
            {attentionList.map((dossier) => {
              const index = stepIndex(dossier.current_step);
              return (
                <button
                  className="w-full flex items-center gap-3 px-3.5 py-3 bg-slate-50/80 rounded-xl hover:bg-slate-100 transition-colors text-left"
                  key={dossier.id}
                  onClick={() => navigate(`/partenariats/dossiers/${dossier.id}`)}
                  type="button"
                >
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">{STEP_DEFINITIONS[index].icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {dossier.reference} — {dossier.partenaire_name}
                    </p>
                    <p className="text-xs text-rose-600 font-medium">{reasonFor(dossier)}</p>
                  </div>
                  <span className="material-symbols-outlined text-slate-400 shrink-0">chevron_right</span>
                </button>
              );
            })}
            {attentionList.length === 0 && (
              <p className="text-xs text-slate-400">Aucun dossier ne nécessite d'action pour l'instant.</p>
            )}
          </div>
        </div>

        {/* Répartition par étape */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs col-span-12 lg:col-span-5 p-5">
          <h4 className="font-headline-md text-sm font-bold text-slate-900 mb-5">Répartition par phase</h4>
          <div className="space-y-4">
            {STEP_GROUPS.map((group) => {
              const count = activeDossiers.filter((d) => group.steps.includes(d.current_step)).length;
              return (
                <div className="space-y-1" key={group.label}>
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700">{group.label}</span>
                    <span className="text-slate-900 font-bold">{count}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
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
            className="mt-6 block text-center py-2.5 bg-slate-100 text-primary text-xs font-bold rounded-xl hover:bg-slate-200 transition-all"
            href="/calendrier-collaboratif"
          >
            Voir le calendrier collaboratif
          </a>
        </div>
      </section>
    </div>
  );
}
