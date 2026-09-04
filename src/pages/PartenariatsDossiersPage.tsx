import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartenariatDossiers, type Dossier } from '../context/PartenariatDossiersContext';
import { formatMontant, formatPeriode } from '../services/partnershipDossierService';
import { STEP_DEFINITIONS, stepIndex, type DossierStep } from '../data/partenariatDossiers';

const SEARCH_INPUT_CLASSES =
  'w-full bg-surface-container border border-outline-variant py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary-container transition-all';

function isBlocked(dossier: Dossier): boolean {
  return dossier.current_step === 'PAIEMENT_INITIAL' && dossier.requires_payment && !dossier.payment_received;
}

export default function PartenariatsDossiersPage() {
  const navigate = useNavigate();
  const { dossiers, isLoading } = usePartenariatDossiers();
  const [view, setView] = useState<'liste' | 'kanban'>('liste');
  const [search, setSearch] = useState('');
  const [stepFilter, setStepFilter] = useState<DossierStep | ''>('');

  const filteredDossiers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return dossiers
      .filter(
        (dossier) =>
          !query ||
          dossier.partenaire_name.toLowerCase().includes(query) ||
          dossier.reference.toLowerCase().includes(query) ||
          dossier.evenement.toLowerCase().includes(query),
      )
      .filter((dossier) => !stepFilter || dossier.current_step === stepFilter)
      .sort((a, b) => {
        const aBlocked = isBlocked(a);
        const bBlocked = isBlocked(b);
        if (aBlocked !== bBlocked) return aBlocked ? -1 : 1;
        if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
        return b.created_at.localeCompare(a.created_at);
      });
  }, [dossiers, search, stepFilter]);

  const activeCount = dossiers.filter((d) => d.current_step !== 'CLOTURE').length;
  const blockedCount = dossiers.filter(isBlocked).length;
  const pendingSignatureCount = dossiers.filter(
    (d) => d.current_step === 'SIGNATURE_CONVENTION' && d.convention_status !== 'SIGNEE',
  ).length;
  const closedCount = dossiers.filter((d) => d.current_step === 'CLOTURE').length;

  if (isLoading) {
    return <p className="font-body-sm text-body-sm text-secondary">Chargement...</p>;
  }

  return (
    <div className="flex flex-col gap-gutter">
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">Dossiers de partenariat</h2>
          <p className="text-secondary mt-1 text-sm">
            De la création du dossier à la clôture — le système suit chaque étape et signale les blocages.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1 p-1 bg-surface-container border border-outline-variant rounded-xl">
            <button
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                view === 'kanban' ? 'bg-white text-on-surface shadow-sm' : 'text-secondary hover:text-on-surface'
              }`}
              onClick={() => setView('kanban')}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">view_kanban</span>
              Kanban
            </button>
            <button
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                view === 'liste' ? 'bg-white text-on-surface shadow-sm' : 'text-secondary hover:text-on-surface'
              }`}
              onClick={() => setView('liste')}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">view_list</span>
              Liste
            </button>
          </div>
          <button
            className="flex items-center gap-1.5 bg-primary text-white pl-3 pr-4 py-2 rounded-full text-xs font-bold shadow-sm hover:shadow-md hover:bg-on-primary-fixed-variant active:scale-95 transition-all"
            onClick={() => navigate('/partenariats/dossiers/nouveau')}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Nouveau dossier
          </button>
        </div>
      </section>

      {view === 'liste' && (
        <>
          {/* KPIs */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
            <div className="bg-surface-container-lowest border border-outline-variant p-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary-container text-2xl shrink-0">folder_shared</span>
              <div className="min-w-0">
                <span className="text-secondary text-xs font-medium block truncate">Dossiers actifs</span>
                <span className="font-headline-md text-headline-md text-on-surface leading-tight">{activeCount}</span>
              </div>
            </div>
            <div className={`bg-surface-container-lowest border p-4 flex items-center gap-3 ${blockedCount > 0 ? 'border-error/30' : 'border-outline-variant'}`}>
              <span className={`material-symbols-outlined text-2xl shrink-0 ${blockedCount > 0 ? 'text-error' : 'text-primary-container'}`}>
                block
              </span>
              <div className="min-w-0">
                <span className="text-secondary text-xs font-medium block truncate">Bloqués (paiement)</span>
                <span className="font-headline-md text-headline-md text-on-surface leading-tight">{blockedCount}</span>
              </div>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant p-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-amber-600 text-2xl shrink-0">edit_document</span>
              <div className="min-w-0">
                <span className="text-secondary text-xs font-medium block truncate">Conventions en attente</span>
                <span className="font-headline-md text-headline-md text-on-surface leading-tight">{pendingSignatureCount}</span>
              </div>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant p-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-emerald-600 text-2xl shrink-0">task_alt</span>
              <div className="min-w-0">
                <span className="text-secondary text-xs font-medium block truncate">Clôturés</span>
                <span className="font-headline-md text-headline-md text-on-surface leading-tight">{closedCount}</span>
              </div>
            </div>
          </section>

          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-3 flex items-center text-outline">
                <span className="material-symbols-outlined text-sm">search</span>
              </span>
              <input
                className={SEARCH_INPUT_CLASSES}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un dossier, un partenaire, un événement..."
                type="text"
                value={search}
              />
            </div>
            <div className="relative w-full md:w-64 shrink-0">
              <span className="absolute inset-y-0 left-3 flex items-center text-outline pointer-events-none">
                <span className="material-symbols-outlined text-sm">filter_list</span>
              </span>
              <select
                className="w-full bg-surface-container border border-outline-variant rounded py-2 pl-10 pr-8 text-sm appearance-none focus:outline-none focus:border-primary-container transition-all"
                onChange={(event) => setStepFilter(event.target.value as DossierStep | '')}
                value={stepFilter}
              >
                <option value="">Toutes les étapes</option>
                {STEP_DEFINITIONS.map((step) => (
                  <option key={step.key} value={step.key}>
                    {step.shortLabel}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-sm pointer-events-none">
                expand_more
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {filteredDossiers.map((dossier) => {
              const index = stepIndex(dossier.current_step);
              const progress = Math.round(((index + 1) / STEP_DEFINITIONS.length) * 100);
              const blocked = isBlocked(dossier);
              const stepDef = STEP_DEFINITIONS[index];
              return (
                <button
                  className={`text-left bg-white border rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-4 hover:shadow-sm transition-all ${
                    blocked ? 'border-error/40' : 'border-outline-variant'
                  }`}
                  key={dossier.id}
                  onClick={() => navigate(`/partenariats/dossiers/${dossier.id}`)}
                  type="button"
                >
                  <div className="w-11 h-11 rounded-lg bg-primary-container/10 text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[22px]">{stepDef.icon}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-primary">{dossier.reference}</p>
                      <p className="text-sm font-semibold text-on-surface">{dossier.partenaire_name}</p>
                      {dossier.urgent && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-error text-white">Urgent</span>
                      )}
                      {blocked && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-error-container text-error">
                          Paiement bloquant
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-secondary mt-0.5">
                      {dossier.evenement}
                      {formatPeriode(dossier.evenement_debut, dossier.evenement_fin) &&
                        ` · ${formatPeriode(dossier.evenement_debut, dossier.evenement_fin)}`}{' '}
                      · {formatMontant(dossier.montant)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 max-w-[220px] h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-[11px] text-secondary shrink-0">
                        Étape {index + 1}/{STEP_DEFINITIONS.length} · {stepDef.shortLabel}
                      </span>
                    </div>
                  </div>

                  <span className="material-symbols-outlined text-secondary shrink-0">chevron_right</span>
                </button>
              );
            })}
            {filteredDossiers.length === 0 && (
              <div className="text-center text-secondary text-sm py-10 bg-white border border-dashed border-outline-variant rounded-lg">
                Aucun dossier ne correspond à votre recherche.
              </div>
            )}
          </div>
        </>
      )}

      {view === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-4">
          {STEP_DEFINITIONS.map((step) => {
            const columnDossiers = dossiers.filter((dossier) => dossier.current_step === step.key);
            return (
              <div className="min-w-[260px] w-[260px] flex flex-col gap-3 shrink-0" key={step.key}>
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-[16px] text-secondary shrink-0">{step.icon}</span>
                    <span className="font-bold text-on-surface uppercase text-[11px] tracking-widest truncate">{step.shortLabel}</span>
                  </div>
                  <span className="bg-surface-container-high px-2 py-0.5 rounded text-[10px] font-bold text-secondary shrink-0">
                    {columnDossiers.length}
                  </span>
                </div>
                <div className="flex-1 bg-surface-container-low/50 border border-outline-variant/30 rounded-xl p-2.5 flex flex-col gap-2.5 min-h-[200px]">
                  {columnDossiers.map((dossier) => {
                    const blocked = isBlocked(dossier);
                    return (
                      <button
                        className={`text-left bg-white p-3 rounded-lg border shadow-sm hover:border-primary transition-all ${
                          blocked ? 'border-error/40' : 'border-outline-variant'
                        }`}
                        key={dossier.id}
                        onClick={() => navigate(`/partenariats/dossiers/${dossier.id}`)}
                        type="button"
                      >
                        <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                          {dossier.urgent && (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-error text-white">Urgent</span>
                          )}
                          {blocked && (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-error-container text-error">
                              Bloqué
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-primary">{dossier.reference}</p>
                        <p className="text-sm font-semibold text-on-surface mt-0.5">{dossier.partenaire_name}</p>
                        <p className="text-[11px] text-secondary mt-1">{dossier.evenement}</p>
                        {formatPeriode(dossier.evenement_debut, dossier.evenement_fin) && (
                          <p className="text-[10px] text-secondary/80 mt-0.5">
                            {formatPeriode(dossier.evenement_debut, dossier.evenement_fin)}
                          </p>
                        )}
                        <p className="text-xs font-semibold text-on-surface mt-1.5">{formatMontant(dossier.montant)}</p>
                      </button>
                    );
                  })}
                  {columnDossiers.length === 0 && (
                    <div className="flex-1 flex items-center justify-center border-2 border-dashed border-outline-variant/20 rounded-lg min-h-[160px]">
                      <span className="text-secondary text-xs italic opacity-40">Aucun dossier</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
