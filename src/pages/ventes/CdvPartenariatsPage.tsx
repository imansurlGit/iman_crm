import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartenariatDossiers } from '../../context/PartenariatDossiersContext';
import { formatMontant, formatPeriode } from '../../services/partnershipDossierService';
import {
  CONVENTION_STATUS_CLASSES,
  CONVENTION_STATUS_LABELS,
  STEP_DEFINITIONS,
  stepIndex,
  type DossierStep,
} from '../../data/partenariatDossiers';

// Vue unique du CDV sur les partenariats : un seul écran de consultation
// (dossiers réels + avancement), là où avant deux pages statiques et
// déconnectées ("Partenaires" et "Suivi partenariats") coexistaient. Le CDV
// n'agit pas sur les dossiers ici — il consulte ; la création et les
// décisions restent le travail du Chargé de Partenariat (/partenariats/dossiers).

const LAST_STEP_INDEX = STEP_DEFINITIONS.length - 1;

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function CdvPartenariatsPage() {
  const navigate = useNavigate();
  const { dossiers, isLoading } = usePartenariatDossiers();
  const [search, setSearch] = useState('');
  const [stepFilter, setStepFilter] = useState<DossierStep | ''>('');

  const activeCount = dossiers.filter((d) => d.current_step !== 'CLOTURE').length;
  const urgentCount = dossiers.filter((d) => d.urgent && d.current_step !== 'CLOTURE').length;
  const signedCount = dossiers.filter((d) => d.convention_status === 'SIGNEE').length;

  const filteredDossiers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return dossiers
      .filter(
        (d) =>
          !query ||
          d.partenaire_name.toLowerCase().includes(query) ||
          d.reference.toLowerCase().includes(query) ||
          d.evenement.toLowerCase().includes(query),
      )
      .filter((d) => !stepFilter || d.current_step === stepFilter)
      .sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) || b.created_at.localeCompare(a.created_at));
  }, [dossiers, search, stepFilter]);

  return (
    <div className="flex flex-col gap-gutter">
      <section>
        <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">Partenariats</h2>
        <p className="text-secondary mt-1 text-sm">
          Suivi des dossiers de partenariat, du premier contact à la clôture — vue de consultation.
        </p>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="bg-white border border-outline-variant rounded-lg p-2.5 flex items-center gap-2.5">
          <span className="material-symbols-outlined text-primary-container text-xl shrink-0">folder_shared</span>
          <div className="min-w-0">
            <span className="text-secondary text-[10px] font-medium block truncate">Dossiers</span>
            <span className="font-headline-md text-lg text-on-surface leading-tight">{dossiers.length}</span>
          </div>
        </div>
        <div className="bg-white border border-outline-variant rounded-lg p-2.5 flex items-center gap-2.5">
          <span className="material-symbols-outlined text-blue-600 text-xl shrink-0">timelapse</span>
          <div className="min-w-0">
            <span className="text-secondary text-[10px] font-medium block truncate">En cours</span>
            <span className="font-headline-md text-lg text-on-surface leading-tight">{activeCount}</span>
          </div>
        </div>
        <div className={`bg-white border rounded-lg p-2.5 flex items-center gap-2.5 ${urgentCount > 0 ? 'border-error/30' : 'border-outline-variant'}`}>
          <span className={`material-symbols-outlined text-xl shrink-0 ${urgentCount > 0 ? 'text-error' : 'text-primary-container'}`}>
            priority_high
          </span>
          <div className="min-w-0">
            <span className="text-secondary text-[10px] font-medium block truncate">Urgents</span>
            <span className="font-headline-md text-lg text-on-surface leading-tight">{urgentCount}</span>
          </div>
        </div>
        <div className="bg-white border border-outline-variant rounded-lg p-2.5 flex items-center gap-2.5">
          <span className="material-symbols-outlined text-emerald-600 text-xl shrink-0">edit_document</span>
          <div className="min-w-0">
            <span className="text-secondary text-[10px] font-medium block truncate">Conventions signées</span>
            <span className="font-headline-md text-lg text-on-surface leading-tight">{signedCount}</span>
          </div>
        </div>
      </section>

      {/* Recherche + filtre étape */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-3 flex items-center text-outline">
            <span className="material-symbols-outlined text-sm">search</span>
          </span>
          <input
            className="w-full bg-surface-container border border-outline-variant py-2 pl-10 pr-4 text-sm rounded focus:outline-none focus:border-primary-container transition-all"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un partenaire, une référence, un événement..."
            type="text"
            value={search}
          />
        </div>
        <div className="relative w-full md:w-64 shrink-0">
          <select
            className="w-full bg-surface-container border border-outline-variant rounded py-2 pl-3 pr-8 text-sm appearance-none focus:outline-none focus:border-primary-container transition-all"
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

      {isLoading ? (
        <p className="text-sm text-secondary py-6 text-center">Chargement...</p>
      ) : (
        <div className="bg-white border border-outline-variant rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-secondary">Dossier</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-secondary">Événement</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-secondary">Avancement</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-secondary">Convention</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-secondary text-right">Montant</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-secondary">Créé le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {filteredDossiers.map((dossier) => {
                const index = stepIndex(dossier.current_step);
                const progress = Math.round((index / LAST_STEP_INDEX) * 100);
                return (
                  <tr
                    className="hover:bg-surface-container-lowest transition-colors cursor-pointer"
                    key={dossier.id}
                    onClick={() => navigate(`/partenariats/dossiers/${dossier.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {dossier.urgent && dossier.current_step !== 'CLOTURE' && (
                          <span className="material-symbols-outlined text-error text-[16px] shrink-0" title="Urgent">
                            priority_high
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-on-surface truncate">{dossier.partenaire_name}</p>
                          <p className="text-[11px] text-secondary truncate">{dossier.reference}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-on-surface-variant">
                      <p className="truncate">{dossier.evenement}</p>
                      {formatPeriode(dossier.evenement_debut, dossier.evenement_fin) && (
                        <p className="text-[10px] text-secondary/80">{formatPeriode(dossier.evenement_debut, dossier.evenement_fin)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 w-40">
                        <div className="flex-1 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                          <div
                            className={`h-full rounded-full ${dossier.current_step === 'CLOTURE' ? 'bg-emerald-500' : 'bg-primary'}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-secondary shrink-0 truncate max-w-[110px]">{stepLabel(dossier.current_step)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${CONVENTION_STATUS_CLASSES[dossier.convention_status]}`}
                      >
                        {CONVENTION_STATUS_LABELS[dossier.convention_status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-on-surface text-right">{formatMontant(dossier.montant)}</td>
                    <td className="px-4 py-3 text-sm text-on-surface-variant">{formatDate(dossier.created_at)}</td>
                  </tr>
                );
              })}
              {filteredDossiers.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-secondary" colSpan={6}>
                    Aucun dossier ne correspond à votre recherche.
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

function stepLabel(step: DossierStep): string {
  return STEP_DEFINITIONS.find((s) => s.key === step)?.shortLabel ?? step;
}
