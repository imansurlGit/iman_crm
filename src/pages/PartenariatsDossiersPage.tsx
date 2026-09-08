import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartenariatDossiers, type Dossier } from '../context/PartenariatDossiersContext';
import { formatMontant, formatPeriode } from '../services/partnershipDossierService';
import { STEP_DEFINITIONS, stepIndex, type DossierStep } from '../data/partenariatDossiers';

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
            <span className="material-symbols-outlined text-[20px]">folder_shared</span>
          </div>
          <div className="min-w-0">
            <h2 className="font-headline-md text-xl font-extrabold text-slate-900 tracking-tight">Dossiers de partenariat</h2>
            <p className="text-slate-500 text-xs mt-0.5">
              De la création du dossier à la clôture — le système suit chaque étape et signale les blocages.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                view === 'kanban' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              onClick={() => setView('kanban')}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">view_kanban</span>
              Kanban
            </button>
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                view === 'liste' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              onClick={() => setView('liste')}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">view_list</span>
              Liste
            </button>
          </div>
          <button
            className="flex items-center gap-1.5 bg-primary text-white pl-3.5 pr-4 py-2 rounded-xl text-xs font-bold shadow-xs hover:bg-on-primary-fixed-variant active:scale-95 transition-all"
            onClick={() => navigate('/partenariats/dossiers/nouveau')}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Nouveau dossier
          </button>
        </div>
      </header>

      {view === 'liste' && (
        <>
          {/* KPIs */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-xs font-semibold">Dossiers actifs</span>
                <span className="material-symbols-outlined text-slate-400 text-[18px]">folder_shared</span>
              </div>
              <span className="text-2xl font-black text-slate-900 tracking-tight font-headline-md mt-2">{activeCount}</span>
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

          {/* Filtres */}
          <section className="flex flex-col md:flex-row md:items-center gap-2.5 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                <span className="material-symbols-outlined text-[16px]">search</span>
              </span>
              <input
                className="w-full bg-slate-50 border border-slate-200 py-1.5 pl-9 pr-3 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white transition-all text-slate-800 placeholder-slate-400"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un dossier, un partenaire, un événement..."
                type="text"
                value={search}
              />
            </div>
            <div className="relative w-full md:w-64 shrink-0">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
                <span className="material-symbols-outlined text-[16px]">filter_list</span>
              </span>
              <select
                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-9 pr-8 text-xs font-medium text-slate-700 outline-none focus:ring-1 focus:ring-primary cursor-pointer"
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
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[16px] pointer-events-none">
                expand_more
              </span>
            </div>
          </section>

          <div className="flex flex-col gap-2.5">
            {filteredDossiers.map((dossier) => {
              const index = stepIndex(dossier.current_step);
              const progress = Math.round(((index + 1) / STEP_DEFINITIONS.length) * 100);
              const blocked = isBlocked(dossier);
              const stepDef = STEP_DEFINITIONS[index];
              return (
                <button
                  className={`text-left bg-white border rounded-2xl shadow-xs p-4 flex flex-col md:flex-row md:items-center gap-4 hover:shadow-sm hover:border-primary/30 transition-all ${
                    blocked ? 'border-rose-200' : 'border-slate-100'
                  }`}
                  key={dossier.id}
                  onClick={() => navigate(`/partenariats/dossiers/${dossier.id}`)}
                  type="button"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[22px]">{stepDef.icon}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-primary">{dossier.reference}</p>
                      <p className="text-sm font-semibold text-slate-900">{dossier.partenaire_name}</p>
                      {dossier.urgent && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white">Urgent</span>
                      )}
                      {blocked && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                          Paiement bloquant
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {dossier.evenement}
                      {formatPeriode(dossier.evenement_debut, dossier.evenement_fin) &&
                        ` · ${formatPeriode(dossier.evenement_debut, dossier.evenement_fin)}`}{' '}
                      · {formatMontant(dossier.montant)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 max-w-[220px] h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        Étape {index + 1}/{STEP_DEFINITIONS.length} · {stepDef.shortLabel}
                      </span>
                    </div>
                  </div>

                  <span className="material-symbols-outlined text-slate-400 shrink-0">chevron_right</span>
                </button>
              );
            })}
            {filteredDossiers.length === 0 && (
              <div className="text-center text-slate-400 text-xs py-10 bg-white border border-dashed border-slate-200 rounded-2xl">
                Aucun dossier ne correspond à votre recherche.
              </div>
            )}
          </div>
        </>
      )}

      {view === 'kanban' && (
        <div className="flex gap-3.5 overflow-x-auto custom-scrollbar pb-4">
          {STEP_DEFINITIONS.map((step) => {
            const columnDossiers = dossiers.filter((dossier) => dossier.current_step === step.key);
            return (
              <div className="min-w-[260px] w-[260px] flex flex-col gap-2.5 shrink-0" key={step.key}>
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-[16px] text-slate-400 shrink-0">{step.icon}</span>
                    <span className="font-bold text-slate-900 uppercase text-[11px] tracking-widest truncate">{step.shortLabel}</span>
                  </div>
                  <span className="bg-slate-100 px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-500 shrink-0">
                    {columnDossiers.length}
                  </span>
                </div>
                <div className="flex-1 bg-slate-50/60 border border-slate-200/60 rounded-2xl p-2.5 flex flex-col gap-2.5 min-h-[200px]">
                  {columnDossiers.map((dossier) => {
                    const blocked = isBlocked(dossier);
                    return (
                      <button
                        className={`text-left bg-white p-3 rounded-xl border shadow-2xs hover:border-primary/40 hover:shadow-xs transition-all ${
                          blocked ? 'border-rose-200' : 'border-slate-200/80'
                        }`}
                        key={dossier.id}
                        onClick={() => navigate(`/partenariats/dossiers/${dossier.id}`)}
                        type="button"
                      >
                        <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                          {dossier.urgent && (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-rose-600 text-white">
                              Urgent
                            </span>
                          )}
                          {blocked && (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200">
                              Bloqué
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-primary">{dossier.reference}</p>
                        <p className="text-sm font-semibold text-slate-900 mt-0.5">{dossier.partenaire_name}</p>
                        <p className="text-[11px] text-slate-500 mt-1">{dossier.evenement}</p>
                        {formatPeriode(dossier.evenement_debut, dossier.evenement_fin) && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {formatPeriode(dossier.evenement_debut, dossier.evenement_fin)}
                          </p>
                        )}
                        <p className="text-xs font-semibold text-slate-900 mt-1.5">{formatMontant(dossier.montant)}</p>
                      </button>
                    );
                  })}
                  {columnDossiers.length === 0 && (
                    <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-200/60 rounded-xl min-h-[160px]">
                      <span className="text-slate-400 text-xs italic opacity-70">Aucun dossier</span>
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
