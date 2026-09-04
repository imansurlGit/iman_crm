import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// TODO: page volontairement statique — design de référence pour le suivi
// des opportunités/projets initiés par le commercial. Le branchement sur
// les vraies données (Project kind=OPPORTUNITE|PROJET, filtré sur
// created_by=utilisateur courant) se fera une fois la disposition validée.

type Kind = 'OPPORTUNITE' | 'PROJET';
type OpportunityStatus = 'OUVERTE' | 'NEGOCIATION' | 'GAGNEE' | 'PERDUE';
type ProjectStatus = 'NOUVEAU' | 'EN_COURS' | 'VALIDATION_CLIENT' | 'PRET_EXECUTION' | 'LIVRE' | 'CLOTURE';

interface PipelineRow {
  id: string;
  kind: Kind;
  title: string;
  client: string;
  categoryOrDivision: string;
  amount: number;
  paid: number | null;
  statusLabel: string;
  statusClasses: string;
  deadline: string | null;
  urgent?: boolean;
  late?: boolean;
  lostReason?: string;
}

const KIND_META: Record<Kind, { label: string; classes: string }> = {
  OPPORTUNITE: { label: 'Opportunité', classes: 'text-violet-700 bg-violet-50 border border-violet-200' },
  PROJET: { label: 'Projet', classes: 'text-cyan-700 bg-cyan-50 border border-cyan-200' },
};

const OPPORTUNITY_STATUS_META: Record<OpportunityStatus, { label: string; classes: string }> = {
  OUVERTE: { label: 'Ouverte', classes: 'text-blue-700 bg-blue-100' },
  NEGOCIATION: { label: 'Négociation', classes: 'text-orange-700 bg-orange-100' },
  GAGNEE: { label: 'Gagnée', classes: 'text-emerald-700 bg-emerald-100' },
  PERDUE: { label: 'Perdue', classes: 'text-secondary bg-surface-container-high' },
};

const PROJECT_STATUS_META: Record<ProjectStatus, { label: string; classes: string }> = {
  NOUVEAU: { label: 'Nouveau', classes: 'text-blue-700 bg-blue-100' },
  EN_COURS: { label: 'En cours', classes: 'text-indigo-700 bg-indigo-100' },
  VALIDATION_CLIENT: { label: 'Validation client', classes: 'text-pink-700 bg-pink-100' },
  PRET_EXECUTION: { label: 'Prêt pour exécution', classes: 'text-teal-700 bg-teal-100' },
  LIVRE: { label: 'Livré', classes: 'text-emerald-700 bg-emerald-100' },
  CLOTURE: { label: 'Clôturé', classes: 'text-secondary bg-surface-container-high' },
};

const ROWS: PipelineRow[] = [
  {
    id: 'opp-1',
    kind: 'OPPORTUNITE',
    title: 'Plateforme de gestion des plaintes',
    client: 'Niger Télécom',
    categoryOrDivision: 'Digital',
    amount: 3_000_000,
    paid: null,
    statusLabel: OPPORTUNITY_STATUS_META.OUVERTE.label,
    statusClasses: OPPORTUNITY_STATUS_META.OUVERTE.classes,
    deadline: null,
  },
  {
    id: 'opp-2',
    kind: 'OPPORTUNITE',
    title: 'Refonte identité visuelle',
    client: 'Ets Alassane Boubacar',
    categoryOrDivision: 'Branding',
    amount: 1_200_000,
    paid: null,
    statusLabel: OPPORTUNITY_STATUS_META.OUVERTE.label,
    statusClasses: OPPORTUNITY_STATUS_META.OUVERTE.classes,
    deadline: null,
  },
  {
    id: 'opp-3',
    kind: 'OPPORTUNITE',
    title: 'Campagne digitale — rentrée',
    client: 'Sahel Mining SA',
    categoryOrDivision: 'Digital',
    amount: 1_600_000,
    paid: null,
    statusLabel: OPPORTUNITY_STATUS_META.NEGOCIATION.label,
    statusClasses: OPPORTUNITY_STATUS_META.NEGOCIATION.classes,
    deadline: null,
    urgent: true,
  },
  {
    id: 'opp-4',
    kind: 'OPPORTUNITE',
    title: 'Spot radio institutionnel',
    client: 'Radio Ténéré',
    categoryOrDivision: 'Production',
    amount: 900_000,
    paid: null,
    statusLabel: OPPORTUNITY_STATUS_META.NEGOCIATION.label,
    statusClasses: OPPORTUNITY_STATUS_META.NEGOCIATION.classes,
    deadline: null,
  },
  {
    id: 'opp-5',
    kind: 'OPPORTUNITE',
    title: 'Site web corporate',
    client: 'Groupe Sonibank',
    categoryOrDivision: 'Digital',
    amount: 2_400_000,
    paid: null,
    statusLabel: OPPORTUNITY_STATUS_META.GAGNEE.label,
    statusClasses: OPPORTUNITY_STATUS_META.GAGNEE.classes,
    deadline: null,
  },
  {
    id: 'opp-6',
    kind: 'OPPORTUNITE',
    title: 'Refonte charte graphique',
    client: 'Ets Alassane Boubacar',
    categoryOrDivision: 'Branding',
    amount: 800_000,
    paid: null,
    statusLabel: OPPORTUNITY_STATUS_META.PERDUE.label,
    statusClasses: OPPORTUNITY_STATUS_META.PERDUE.classes,
    deadline: null,
    lostReason: 'Budget insuffisant',
  },
  {
    id: 'proj-1',
    kind: 'PROJET',
    title: 'Refonte plateforme e-commerce',
    client: 'Groupe Sonibank',
    categoryOrDivision: 'Numérique',
    amount: 2_400_000,
    paid: 700_000,
    statusLabel: PROJECT_STATUS_META.EN_COURS.label,
    statusClasses: PROJECT_STATUS_META.EN_COURS.classes,
    deadline: '30 sept. 2026',
  },
  {
    id: 'proj-2',
    kind: 'PROJET',
    title: 'Campagne institutionnelle 2025',
    client: 'Sahel Mining SA',
    categoryOrDivision: 'Marketing',
    amount: 3_800_000,
    paid: 1_900_000,
    statusLabel: PROJECT_STATUS_META.VALIDATION_CLIENT.label,
    statusClasses: PROJECT_STATUS_META.VALIDATION_CLIENT.classes,
    deadline: '15 déc. 2025',
  },
  {
    id: 'proj-3',
    kind: 'PROJET',
    title: 'Spot TV lancement produit',
    client: 'Niger Télécom',
    categoryOrDivision: 'Production',
    amount: 1_800_000,
    paid: 900_000,
    statusLabel: PROJECT_STATUS_META.PRET_EXECUTION.label,
    statusClasses: PROJECT_STATUS_META.PRET_EXECUTION.classes,
    deadline: '10 nov. 2026',
    late: true,
  },
  {
    id: 'proj-4',
    kind: 'PROJET',
    title: 'Refonte identité visuelle',
    client: 'Sahel Mining SA',
    categoryOrDivision: 'Marketing',
    amount: 2_400_000,
    paid: 2_400_000,
    statusLabel: PROJECT_STATUS_META.CLOTURE.label,
    statusClasses: PROJECT_STATUS_META.CLOTURE.classes,
    deadline: '10 juin 2025',
  },
];

const STATUS_OPTIONS: { label: string; classes: string }[] = [
  ...Object.values(OPPORTUNITY_STATUS_META),
  ...Object.values(PROJECT_STATUS_META),
];

const SEARCH_INPUT_CLASSES =
  'w-full bg-surface-container border border-outline-variant py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary-container transition-all rounded-lg';

function formatAmount(value: number): string {
  return `${value.toLocaleString('fr-FR')} FCFA`;
}

export default function CommercialProjetsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<'' | Kind>('');
  const [statusFilter, setStatusFilter] = useState('');

  const opportunities = ROWS.filter((r) => r.kind === 'OPPORTUNITE');
  const projects = ROWS.filter((r) => r.kind === 'PROJET');
  const openOpportunities = opportunities.filter((r) => r.statusLabel === 'Ouverte' || r.statusLabel === 'Négociation');
  const pipelineValue = useMemo(() => openOpportunities.reduce((sum, r) => sum + r.amount, 0), [openOpportunities]);
  const activeProjects = projects.filter((r) => r.statusLabel !== 'Clôturé');
  const caGenere = useMemo(() => projects.reduce((sum, r) => sum + r.amount, 0), [projects]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return ROWS.filter((row) => {
      if (query && !row.title.toLowerCase().includes(query) && !row.client.toLowerCase().includes(query)) return false;
      if (kindFilter && row.kind !== kindFilter) return false;
      if (statusFilter && row.statusLabel !== statusFilter) return false;
      return true;
    });
  }, [search, kindFilter, statusFilter]);

  return (
    <div className="flex flex-col gap-3">
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">Mes opportunités &amp; projets</h2>
          <p className="text-secondary mt-0.5 text-sm">Le suivi de tout ce que vous avez initié, du premier contact à la clôture.</p>
        </div>
        <button
          className="flex items-center gap-1.5 bg-primary text-white pl-3 pr-4 py-2 rounded-full text-xs font-bold shadow-sm hover:shadow-md hover:bg-on-primary-fixed-variant active:scale-95 transition-all shrink-0"
          onClick={() => navigate('/opportunites/nouvelle')}
          type="button"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Nouvelle opportunité
        </button>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="rounded-lg border border-primary/15 bg-primary/5 p-3 flex items-center gap-2.5">
          <span className="material-symbols-outlined text-primary text-xl shrink-0">emoji_objects</span>
          <div className="min-w-0">
            <span className="text-primary/70 text-[11px] font-medium block truncate">Opportunités ouvertes</span>
            <span className="font-headline-md text-lg text-primary leading-tight">{openOpportunities.length}</span>
          </div>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 flex items-center gap-2.5">
          <span className="material-symbols-outlined text-blue-600 text-xl shrink-0">payments</span>
          <div className="min-w-0">
            <span className="text-blue-700/70 text-[11px] font-medium block truncate">Valeur pipeline</span>
            <span className="font-headline-md text-lg text-blue-700 leading-tight">{formatAmount(pipelineValue)}</span>
          </div>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-center gap-2.5">
          <span className="material-symbols-outlined text-amber-600 text-xl shrink-0">account_tree</span>
          <div className="min-w-0">
            <span className="text-amber-700/70 text-[11px] font-medium block truncate">Projets actifs</span>
            <span className="font-headline-md text-lg text-amber-700 leading-tight">{activeProjects.length}</span>
          </div>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2.5">
          <span className="material-symbols-outlined text-emerald-600 text-xl shrink-0">trending_up</span>
          <div className="min-w-0">
            <span className="text-emerald-700/70 text-[11px] font-medium block truncate">CA généré</span>
            <span className="font-headline-md text-lg text-emerald-700 leading-tight">{formatAmount(caGenere)}</span>
          </div>
        </div>
      </section>

      {/* Recherche + filtres */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-3 flex items-center text-outline">
            <span className="material-symbols-outlined text-sm">search</span>
          </span>
          <input
            className={SEARCH_INPUT_CLASSES}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un élément, un client..."
            type="text"
            value={search}
          />
        </div>
        <div className="relative w-full md:w-52 shrink-0">
          <span className="absolute inset-y-0 left-3 flex items-center text-outline pointer-events-none">
            <span className="material-symbols-outlined text-sm">category</span>
          </span>
          <select
            className="w-full bg-surface-container border border-outline-variant rounded-lg py-2 pl-10 pr-8 text-sm appearance-none focus:outline-none focus:border-primary-container transition-all"
            onChange={(event) => setKindFilter(event.target.value as '' | Kind)}
            value={kindFilter}
          >
            <option value="">Tous les stades</option>
            <option value="OPPORTUNITE">Opportunité</option>
            <option value="PROJET">Projet</option>
          </select>
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-sm pointer-events-none">
            expand_more
          </span>
        </div>
        <div className="relative w-full md:w-56 shrink-0">
          <span className="absolute inset-y-0 left-3 flex items-center text-outline pointer-events-none">
            <span className="material-symbols-outlined text-sm">flag</span>
          </span>
          <select
            className="w-full bg-surface-container border border-outline-variant rounded-lg py-2 pl-10 pr-8 text-sm appearance-none focus:outline-none focus:border-primary-container transition-all"
            onChange={(event) => setStatusFilter(event.target.value)}
            value={statusFilter}
          >
            <option value="">Tous les statuts</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.label} value={option.label}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-sm pointer-events-none">
            expand_more
          </span>
        </div>
      </div>

      <div className="bg-white border border-outline-variant rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant">
              <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-secondary">Élément</th>
              <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-secondary">Client</th>
              <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-secondary">Stade</th>
              <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-secondary text-right">Montant</th>
              <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-secondary text-right">Solde dû</th>
              <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-secondary">Échéance</th>
              <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-secondary">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/60">
            {filteredRows.map((row) => {
              const kindMeta = KIND_META[row.kind];
              const due = row.paid !== null ? row.amount - row.paid : null;
              return (
                <tr className="hover:bg-surface-container-lowest transition-colors" key={row.id}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-on-surface">{row.title}</p>
                    <p className="text-[11px] text-secondary">{row.categoryOrDivision}</p>
                    {row.urgent && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary mt-0.5">
                        <span className="material-symbols-outlined text-[12px]">alarm</span>
                        Urgent
                      </span>
                    )}
                    {row.late && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-error mt-0.5">
                        <span className="material-symbols-outlined text-[12px]">warning</span>
                        En retard
                      </span>
                    )}
                    {row.lostReason && <p className="text-[11px] text-secondary italic mt-0.5">Motif : {row.lostReason}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-on-surface-variant">{row.client}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${kindMeta.classes}`}>
                      {kindMeta.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-on-surface text-right">{formatAmount(row.amount)}</td>
                  <td className={`px-4 py-3 text-sm font-semibold text-right ${due && due > 0 ? 'text-red-700' : 'text-secondary'}`}>
                    {due !== null ? (due > 0 ? formatAmount(due) : 'Payé') : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-on-surface-variant">{row.deadline ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${row.statusClasses}`}>
                      {row.statusLabel}
                    </span>
                  </td>
                </tr>
              );
            })}
            {filteredRows.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-sm text-secondary" colSpan={7}>
                  Aucun élément ne correspond à votre recherche.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
