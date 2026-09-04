import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type PartnerStatus = 'PROSPECT' | 'NEGOCIATION' | 'ACTIF' | 'ARCHIVE';
type PartnerType = 'FINANCIER' | 'TECHNIQUE' | 'MEDIA' | 'LOGISTIQUE';

interface Partner {
  id: number;
  company: string;
  contact: string;
  type: PartnerType;
  status: PartnerStatus;
  event: string;
  lastAction: string;
}

const PARTNERS: Partner[] = [
  { id: 101, company: 'NovaTel Afrique',   contact: 'Mariam Issa',     type: 'TECHNIQUE',  status: 'ACTIF',       event: 'Salon Tech 2026',      lastAction: 'Convention validée hier' },
  { id: 102, company: 'Banque Horizon',    contact: 'Ibrahim Oumarou', type: 'FINANCIER',  status: 'NEGOCIATION', event: 'Conférence Annuelle',   lastAction: 'Relance proposition J-2' },
  { id: 103, company: 'Réseau Média 24',   contact: 'Halima Mossi',    type: 'MEDIA',      status: 'PROSPECT',    event: 'Gala 2026',            lastAction: 'Premier échange téléphonique' },
  { id: 104, company: 'Logis Event Group', contact: 'Amadou Alio',     type: 'LOGISTIQUE', status: 'ACTIF',       event: 'Foire Internationale', lastAction: 'Brief logistique planifié' },
  { id: 105, company: 'Sahel Industries',  contact: 'Fatou Maina',     type: 'FINANCIER',  status: 'ARCHIVE',     event: 'Sommet 2025',          lastAction: 'Bilan clôturé en janvier' },
  { id: 106, company: 'Cloud Bridge',      contact: 'Nadir K.',        type: 'TECHNIQUE',  status: 'NEGOCIATION', event: 'Forum Digital Public', lastAction: 'Convention v2 envoyée' },
  { id: 107, company: 'Impression Atlas',  contact: 'Souleymane H.',   type: 'LOGISTIQUE', status: 'ACTIF',       event: 'Foire Internationale', lastAction: 'Maquettes livrées' },
  { id: 108, company: 'Agence Lumen',      contact: 'Inoussa T.',      type: 'MEDIA',      status: 'PROSPECT',    event: 'Gala 2026',            lastAction: 'Présentation reçue' },
];

const STATUS_META: Record<PartnerStatus, { label: string; dot: string; text: string; bg: string }> = {
  PROSPECT:    { label: 'Prospect',           dot: 'bg-outline',           text: 'text-on-surface-variant', bg: 'bg-surface-container'     },
  NEGOCIATION: { label: 'En cours de négo',   dot: 'bg-primary-container', text: 'text-primary',            bg: 'bg-primary-fixed/40'      },
  ACTIF:       { label: 'Partenaire actif',   dot: 'bg-green-500',         text: 'text-green-800',          bg: 'bg-green-50'              },
  ARCHIVE:     { label: 'Ancien partenaire',  dot: 'bg-error/60',          text: 'text-error',              bg: 'bg-error-container/30'    },
};

const TYPE_META: Record<PartnerType, { label: string; icon: string }> = {
  FINANCIER:  { label: 'Financier',  icon: 'account_balance' },
  TECHNIQUE:  { label: 'Technique',  icon: 'settings_suggest' },
  MEDIA:      { label: 'Média',      icon: 'rss_feed' },
  LOGISTIQUE: { label: 'Logistique', icon: 'local_shipping' },
};

const STATUS_FILTERS = [
  { value: 'ALL',         label: 'Tous les statuts' },
  { value: 'PROSPECT',    label: 'Prospect' },
  { value: 'NEGOCIATION', label: 'En cours de négo' },
  { value: 'ACTIF',       label: 'Partenaire actif' },
  { value: 'ARCHIVE',     label: 'Ancien partenaire' },
] as const;

const TYPE_FILTERS = [
  { value: 'ALL',         label: 'Tous les types' },
  { value: 'FINANCIER',   label: 'Financier' },
  { value: 'TECHNIQUE',   label: 'Technique' },
  { value: 'MEDIA',       label: 'Média' },
  { value: 'LOGISTIQUE',  label: 'Logistique' },
] as const;

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

export default function PartenairesPage() {
  const navigate = useNavigate();
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState<PartnerStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter]     = useState<PartnerType   | 'ALL'>('ALL');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return PARTNERS.filter(
      (p) =>
        (!q || p.company.toLowerCase().includes(q)) &&
        (statusFilter === 'ALL' || p.status === statusFilter) &&
        (typeFilter   === 'ALL' || p.type   === typeFilter),
    );
  }, [search, statusFilter, typeFilter]);

  const kpis = [
    { label: 'Total',          value: PARTNERS.length,                                     icon: 'folder_shared'   },
    { label: 'Actifs',         value: PARTNERS.filter((p) => p.status === 'ACTIF').length, icon: 'verified'        },
    { label: 'En négociation', value: PARTNERS.filter((p) => p.status === 'NEGOCIATION').length, icon: 'pending_actions' },
    { label: 'Prospects',      value: PARTNERS.filter((p) => p.status === 'PROSPECT').length,    icon: 'person_search'   },
  ];

  return (
    <div className="flex flex-col gap-gutter">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-on-surface rounded-xl px-6 py-7 md:px-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-12 w-56 h-56 rounded-full bg-primary-container/25 blur-3xl"
        />
        <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-label-md text-label-md text-white/35 uppercase tracking-widest">Répertoire</p>
            <h1 className="font-headline-lg text-headline-lg text-white mt-1">Partenaires</h1>
            <p className="font-body-sm text-body-sm text-white/55 mt-1.5 max-w-xl">
              Vue consolidée de tous les dossiers — du premier contact au bilan final.
            </p>
          </div>
          <button
            className="shrink-0 inline-flex items-center gap-2 bg-primary-container text-on-primary font-semibold text-sm px-4 py-2.5 rounded-lg hover:opacity-90 active:scale-95 transition-all"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nouveau partenaire
          </button>
        </div>

        <div className="relative mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map((k) => (
            <div
              key={k.label}
              className="rounded-lg border border-white/10 bg-white/[0.07] px-4 py-3 flex items-center gap-3"
            >
              <span className="material-symbols-outlined text-white/40 text-xl shrink-0">{k.icon}</span>
              <div>
                <p className="font-label-md text-label-md text-white/35">{k.label}</p>
                <p className="text-2xl font-bold text-white leading-none mt-0.5">{k.value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Filtres ── */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <label className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-outline">
              <span className="material-symbols-outlined text-[18px]">search</span>
            </span>
            <input
              className="w-full bg-surface-container border border-outline-variant rounded-lg py-2.5 pl-10 pr-3 font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary-container transition-colors"
              placeholder="Rechercher par nom d'entreprise…"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          {/* Status */}
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-outline">
              <span className="material-symbols-outlined text-[16px]">filter_list</span>
            </span>
            <select
              className="appearance-none bg-surface-container border border-outline-variant rounded-lg py-2.5 pl-9 pr-8 font-body-sm text-body-sm text-on-surface outline-none focus:border-primary-container transition-colors"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PartnerStatus | 'ALL')}
            >
              {STATUS_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            <span className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-outline">
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </span>
          </div>

          {/* Type */}
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-outline">
              <span className="material-symbols-outlined text-[16px]">category</span>
            </span>
            <select
              className="appearance-none bg-surface-container border border-outline-variant rounded-lg py-2.5 pl-9 pr-8 font-body-sm text-body-sm text-on-surface outline-none focus:border-primary-container transition-colors"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as PartnerType | 'ALL')}
            >
              {TYPE_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            <span className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-outline">
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </span>
          </div>
        </div>
      </section>

      {/* ── Tableau ── */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">

        {/* Desktop */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low">
                {['Nom du partenaire', 'Contact principal', 'Type', 'Statut actuel', 'Événement lié', 'Dernière action', ''].map((col) => (
                  <th key={col} className="px-5 py-3 text-left font-label-md text-label-md text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="group cursor-pointer hover:bg-surface-container-low transition-colors"
                  onClick={() => navigate(`/partenaires/${p.id}`)}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-secondary-container flex items-center justify-center font-label-md text-label-md text-on-surface shrink-0">
                        {initials(p.company)}
                      </div>
                      <span className="font-body-sm font-semibold text-on-surface group-hover:text-primary transition-colors">
                        {p.company}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 font-body-sm text-body-sm text-on-surface-variant">{p.contact}</td>
                  <td className="px-5 py-3.5">
                    <div className="inline-flex items-center gap-1.5 bg-surface-container border border-outline-variant rounded-full px-2.5 py-1">
                      <span className="material-symbols-outlined text-[13px] text-outline">{TYPE_META[p.type].icon}</span>
                      <span className="font-label-md text-label-md text-on-surface-variant">{TYPE_META[p.type].label}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${STATUS_META[p.status].bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_META[p.status].dot}`} />
                      <span className={`font-label-md text-label-md ${STATUS_META[p.status].text}`}>
                        {STATUS_META[p.status].label}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 font-body-sm text-body-sm text-on-surface-variant">{p.event}</td>
                  <td className="px-5 py-3.5 font-body-sm text-body-sm text-secondary italic">{p.lastAction}</td>
                  <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="inline-flex items-center gap-1 border border-outline-variant rounded-lg px-3 py-1.5 font-label-md text-label-md text-on-surface hover:border-primary-container hover:text-primary transition-colors"
                      onClick={() => navigate(`/partenaires/${p.id}`)}
                      type="button"
                    >
                      Ouvrir la fiche
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="divide-y divide-outline-variant/40 lg:hidden">
          {filtered.map((p) => (
            <article
              key={p.id}
              className="p-4 hover:bg-surface-container-low transition-colors cursor-pointer"
              onClick={() => navigate(`/partenaires/${p.id}`)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary-container flex items-center justify-center font-label-md text-label-md text-on-surface shrink-0">
                  {initials(p.company)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-body-sm font-semibold text-on-surface">{p.company}</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">{p.contact}</p>
                </div>
                <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 shrink-0 ${STATUS_META[p.status].bg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_META[p.status].dot}`} />
                  <span className={`font-label-md text-label-md ${STATUS_META[p.status].text}`}>
                    {STATUS_META[p.status].label}
                  </span>
                </div>
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-1 text-xs text-on-surface-variant">
                <p><span className="font-semibold text-on-surface">Type :</span> {TYPE_META[p.type].label}</p>
                <p><span className="font-semibold text-on-surface">Événement :</span> {p.event}</p>
                <p className="col-span-2 italic text-secondary mt-0.5">{p.lastAction}</p>
              </div>
            </article>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="py-14 text-center">
            <span className="material-symbols-outlined text-4xl text-outline block mb-2">search_off</span>
            <p className="font-body-sm text-body-sm text-secondary">Aucun partenaire ne correspond aux filtres.</p>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="border-t border-outline-variant/40 px-5 py-2.5 bg-surface-container-low">
            <p className="font-label-md text-label-md text-on-surface-variant">
              {filtered.length} partenaire{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
