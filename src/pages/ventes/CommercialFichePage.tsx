import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { listContacts, type Contact } from '../../services/contactService';
import { listProjects, type Project } from '../../services/projectService';
import { listDivisionMembers, type CurrentUser } from '../../services/userService';

// Fiche complète d'un commercial — réservée aux chefs de division (accès
// depuis "Performance des Commerciaux" sur DashboardCdvPage.tsx). Toutes les
// données sont réelles : Contact.assigned_to identifie les prospects/clients
// du commercial, Project.client les rattache à leurs affaires (même jointure
// client-side que DashboardCdvPage.tsx, aucun filtre serveur dédié n'existe).
// Aucune librairie de graphiques n'est installée — les deux visualisations
// sont en SVG/CSS pur, calibrées selon la charte interne de dataviz.

type Period = '3M' | '6M' | '12M' | 'ALL';

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '3M', label: '3 mois' },
  { value: '6M', label: '6 mois' },
  { value: '12M', label: '12 mois' },
  { value: 'ALL', label: 'Tout' },
];

function periodStartDate(period: Period): Date | null {
  if (period === 'ALL') return null;
  const months = period === '3M' ? 3 : period === '6M' ? 6 : 12;
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatFCFA(value: number): string {
  return `${Math.round(value).toLocaleString('fr-FR')} FCFA`;
}

function formatFcfaCompact(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1).replace('.0', '')} M FCFA`;
  if (amount >= 1_000) return `${Math.round(amount / 1_000)} k FCFA`;
  return `${Math.round(amount).toLocaleString('fr-FR')} FCFA`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const RANK_MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

interface MonthlyBucket {
  key: string;
  label: string;
  value: number;
}

/** Barres verticales — une seule série (le CA du commercial), donc pas de
 * légende requise : le titre de la section porte déjà l'identité de la
 * série. Barres ≤24px, coin supérieur arrondi 4px, infobulle au survol. */
function RevenueBarChart({ data }: { data: MonthlyBucket[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const chartHeight = 150;

  return (
    <div>
      <div className="flex items-end gap-2" style={{ height: chartHeight }}>
        {data.map((bucket, index) => {
          const barHeight = bucket.value > 0 ? Math.max(4, Math.round((bucket.value / max) * (chartHeight - 12))) : 0;
          const isHovered = hovered === index;
          return (
            <div
              className="flex-1 h-full flex flex-col items-center justify-end relative min-w-0"
              key={bucket.key}
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
            >
              {isHovered && bucket.value > 0 && (
                <div className="absolute -top-1 -translate-y-full z-10 px-2 py-1 rounded-md bg-on-surface text-white text-[10px] font-bold whitespace-nowrap shadow-lg">
                  {formatFCFA(bucket.value)}
                </div>
              )}
              <div
                className={`w-full max-w-[26px] rounded-t-[4px] transition-colors ${
                  isHovered ? 'bg-primary' : 'bg-primary/60'
                } ${bucket.value === 0 ? 'bg-surface-container-high' : ''}`}
                style={{ height: barHeight }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 mt-1.5 pt-1.5 border-t border-outline-variant">
        {data.map((bucket) => (
          <div className="flex-1 text-center text-[10px] font-medium text-secondary truncate" key={bucket.key}>
            {bucket.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Barre horizontale empilée (part-to-whole) — 3 catégories, légende +
 * étiquettes directes obligatoires dès 2 séries. Séparateur de 2px entre
 * segments (jamais de contour). */
function DealBreakdownBar({ won, pipeline, lost }: { won: number; pipeline: number; lost: number }) {
  const total = won + pipeline + lost;
  const segments = [
    { key: 'won', label: 'Gagnés', value: won, bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
    { key: 'pipeline', label: 'En cours', value: pipeline, bar: 'bg-amber-500', dot: 'bg-amber-500' },
    { key: 'lost', label: 'Perdus', value: lost, bar: 'bg-red-400', dot: 'bg-red-400' },
  ];

  return (
    <div>
      {total > 0 ? (
        <div className="flex h-6 w-full rounded-full overflow-hidden gap-0.5 bg-surface-container-high">
          {segments
            .filter((s) => s.value > 0)
            .map((s) => (
              <div
                className={`${s.bar} h-full flex items-center justify-center`}
                key={s.key}
                style={{ width: `${(s.value / total) * 100}%` }}
                title={`${s.label} : ${s.value}`}
              >
                {s.value / total > 0.14 && <span className="text-[10px] font-bold text-white">{s.value}</span>}
              </div>
            ))}
        </div>
      ) : (
        <div className="h-6 w-full rounded-full bg-surface-container-high" />
      )}
      <div className="flex flex-wrap gap-3 mt-3">
        {segments.map((s) => (
          <div className="flex items-center gap-1.5 text-xs" key={s.key}>
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.dot}`} />
            <span className="text-secondary">{s.label}</span>
            <span className="font-bold text-on-surface">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface KpiTileProps {
  icon: string;
  label: string;
  value: string;
  footer?: string;
  footerTone?: 'up' | 'down' | 'neutral';
}

function KpiTile({ icon, label, value, footer, footerTone = 'neutral' }: KpiTileProps) {
  return (
    <div className="bg-white rounded-xl border border-outline-variant p-4 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="p-2 bg-primary-container/15 rounded-lg shrink-0">
          <span className="material-symbols-outlined text-[18px] text-primary">{icon}</span>
        </div>
        <p className="text-secondary text-[10px] font-bold uppercase tracking-wider truncate">{label}</p>
      </div>
      <p className="font-headline-md text-xl font-bold text-on-surface mt-2.5 leading-tight">{value}</p>
      {footer && (
        <p
          className={`text-[11px] font-semibold mt-1 ${
            footerTone === 'up' ? 'text-emerald-600' : footerTone === 'down' ? 'text-error' : 'text-secondary'
          }`}
        >
          {footer}
        </p>
      )}
    </div>
  );
}

export default function CommercialFichePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const commercialId = Number(id);

  const [team, setTeam] = useState<CurrentUser[]>([]);
  const [clients, setClients] = useState<Contact[]>([]);
  const [prospects, setProspects] = useState<Contact[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [period, setPeriod] = useState<Period>('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    setNotFound(false);
    Promise.all([
      user.division ? listDivisionMembers(user.division) : Promise.resolve<CurrentUser[]>([]),
      listContacts('CLIENT'),
      listContacts('PROSPECT'),
      listProjects(),
    ])
      .then(([members, allClients, allProspects, allProjects]) => {
        setTeam(members);
        setClients(allClients);
        setProspects(allProspects);
        setProjects(allProjects);
        if (!members.some((m) => m.id === commercialId)) setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [user, commercialId]);

  const member = team.find((m) => m.id === commercialId) ?? null;

  const myClients = useMemo(() => clients.filter((c) => c.assigned_to === commercialId), [clients, commercialId]);
  const myProspects = useMemo(() => prospects.filter((c) => c.assigned_to === commercialId), [prospects, commercialId]);
  const myContactIds = useMemo(
    () => new Set([...myClients, ...myProspects].map((c) => c.id)),
    [myClients, myProspects],
  );
  const myProjects = useMemo(() => projects.filter((p) => myContactIds.has(p.client)), [projects, myContactIds]);

  const wonAll = useMemo(() => myProjects.filter((p) => p.kind === 'PROJET'), [myProjects]);
  const openAll = useMemo(
    () => myProjects.filter((p) => p.kind === 'OPPORTUNITE' && p.status !== 'PERDUE'),
    [myProjects],
  );
  const lostAll = useMemo(() => myProjects.filter((p) => p.status === 'PERDUE'), [myProjects]);

  const periodStart = periodStartDate(period);
  const inPeriod = useMemo(
    () => (dateStr: string | null) => {
      if (!periodStart) return true;
      if (!dateStr) return false;
      return new Date(dateStr) >= periodStart;
    },
    [periodStart],
  );

  const won = useMemo(() => wonAll.filter((p) => inPeriod(p.converted_at ?? p.created_at)), [wonAll, inPeriod]);
  const lost = useMemo(() => lostAll.filter((p) => inPeriod(p.created_at)), [lostAll, inPeriod]);

  const totalRevenue = won.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
  const dealsWon = won.length;
  const dealsLost = lost.length;
  const winRate = dealsWon + dealsLost > 0 ? Math.round((dealsWon / (dealsWon + dealsLost)) * 100) : null;
  const avgDealSize = dealsWon > 0 ? totalRevenue / dealsWon : 0;
  const pipelineValue = openAll.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);

  // CA de ce mois vs le mois précédent, sur l'ensemble de l'historique (pas
  // le filtre de période) — un repère de tendance honnête, pas un artefact
  // du filtre affiché.
  const revenueTrend = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const sumInRange = (start: Date, end: Date) =>
      wonAll
        .filter((p) => {
          const d = p.converted_at ?? p.created_at;
          if (!d) return false;
          const date = new Date(d);
          return date >= start && date < end;
        })
        .reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
    const thisMonth = sumInRange(monthStart, now);
    const lastMonth = sumInRange(lastMonthStart, monthStart);
    if (lastMonth === 0) return thisMonth > 0 ? { label: 'Nouveau ce mois-ci', tone: 'up' as const } : null;
    const change = Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
    if (change === 0) return { label: 'Stable vs mois dernier', tone: 'neutral' as const };
    const tone: 'up' | 'down' = change > 0 ? 'up' : 'down';
    return { label: `${change > 0 ? '+' : ''}${change}% vs mois dernier`, tone };
  }, [wonAll]);

  const chartMonths = period === '3M' ? 3 : period === '6M' ? 6 : 12;
  const monthlyRevenue = useMemo<MonthlyBucket[]>(() => {
    const now = new Date();
    const buckets: MonthlyBucket[] = [];
    for (let i = chartMonths - 1; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: capitalize(d.toLocaleDateString('fr-FR', { month: 'short' })), value: 0 });
    }
    const byKey = new Map(buckets.map((b) => [b.key, b]));
    for (const p of wonAll) {
      const dateStr = p.converted_at ?? p.created_at;
      if (!dateStr) continue;
      const d = new Date(dateStr);
      const bucket = byKey.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (bucket) bucket.value += Number(p.budget) || 0;
    }
    return buckets;
  }, [wonAll, chartMonths]);

  // Classement de l'équipe — même formule que "Performance des Commerciaux"
  // (DashboardCdvPage.tsx), calculée ici pour situer ce commercial parmi ses
  // pairs sans dupliquer l'appel réseau (déjà chargé via listDivisionMembers).
  const teamRanking = useMemo(() => {
    const commercials = team.filter((m) => m.role === 'COMMERCIAL');
    const withRevenue = commercials.map((m) => {
      const ids = new Set([...clients, ...prospects].filter((c) => c.assigned_to === m.id).map((c) => c.id));
      const revenue = projects
        .filter((p) => p.kind === 'PROJET' && ids.has(p.client))
        .reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
      return { id: m.id, revenue };
    });
    return withRevenue.sort((a, b) => b.revenue - a.revenue).map((entry) => entry.id);
  }, [team, clients, prospects, projects]);
  const rank = teamRanking.indexOf(commercialId) + 1;

  const revenueByClientId = useMemo(() => {
    const map = new Map<number, number>();
    for (const p of wonAll) {
      map.set(p.client, (map.get(p.client) ?? 0) + (Number(p.budget) || 0));
    }
    return map;
  }, [wonAll]);

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();
    return myClients
      .filter((c) => inPeriod(c.converted_at ?? c.created_at))
      .filter((c) => !query || c.name.toLowerCase().includes(query) || c.company.toLowerCase().includes(query))
      .sort((a, b) => (b.converted_at ?? b.created_at).localeCompare(a.converted_at ?? a.created_at));
  }, [myClients, inPeriod, search]);

  if (isLoading) {
    return <p className="font-body-sm text-body-sm text-secondary">Chargement...</p>;
  }

  if (notFound || !member) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="text-secondary text-sm mb-4">Ce commercial est introuvable dans votre équipe.</p>
        <button className="text-sm font-bold text-primary hover:underline" onClick={() => navigate('/dashboard')} type="button">
          Retour au tableau de bord
        </button>
      </div>
    );
  }

  const fullName = `${member.first_name} ${member.last_name}`.trim();

  return (
    <div className="max-w-[1300px] mx-auto flex flex-col gap-5 pb-10">
      <button className="flex items-center gap-1 text-xs font-semibold text-secondary hover:text-primary transition-colors w-fit" onClick={() => navigate(-1)} type="button">
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        Retour
      </button>

      {/* Hero — carte de visite */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#400100] via-primary to-on-primary-fixed-variant p-7 shadow-lg">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.14),_transparent_60%)]"
        />
        <div className="relative flex flex-col md:flex-row items-start md:items-center gap-5">
          <div className="w-24 h-24 rounded-full bg-white/15 ring-4 ring-white/30 flex items-center justify-center text-2xl font-bold text-white shrink-0 overflow-hidden shadow-lg">
            {member.profile_picture ? (
              <img alt={fullName} className="w-full h-full object-cover" src={member.profile_picture} />
            ) : (
              getInitials(fullName)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="font-headline-md text-2xl font-bold text-white tracking-tight">{fullName}</h2>
              {rank > 0 && rank <= 3 && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 text-white text-xs font-bold">
                  {RANK_MEDALS[rank]} #{rank} de l'équipe
                </span>
              )}
            </div>
            <p className="text-white/70 text-sm mt-0.5">
              {member.role_display} · {member.division_name ?? 'Division non renseignée'}
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3">
              <div className="flex items-center gap-1.5 text-white/85 text-xs">
                <span className="material-symbols-outlined text-[15px]">mail</span>
                {member.email}
              </div>
              <div className="flex items-center gap-1.5 text-white/85 text-xs">
                <span className="material-symbols-outlined text-[15px]">calendar_today</span>
                Membre depuis {formatDate(member.date_joined)}
              </div>
              <div className="flex items-center gap-1.5 text-white/85 text-xs">
                <span className="material-symbols-outlined text-[15px]">groups</span>
                {myClients.length} client{myClients.length !== 1 ? 's' : ''} en portefeuille
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filtre de période */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-1 p-1 bg-surface-container border border-outline-variant rounded-xl">
          {PERIOD_OPTIONS.map((option) => (
            <button
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                period === option.value ? 'bg-white text-on-surface shadow-sm' : 'text-secondary hover:text-on-surface'
              }`}
              key={option.value}
              onClick={() => setPeriod(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile
          footer={revenueTrend?.label}
          footerTone={revenueTrend?.tone}
          icon="payments"
          label="CA généré"
          value={formatFcfaCompact(totalRevenue)}
        />
        <KpiTile
          footer={`${formatFcfaCompact(avgDealSize)} en moyenne`}
          icon="handshake"
          label="Deals gagnés"
          value={String(dealsWon)}
        />
        <KpiTile
          footer={dealsWon + dealsLost > 0 ? `${dealsWon} gagnés / ${dealsLost} perdus` : 'Aucune décision encore'}
          icon="target"
          label="Taux de conversion"
          value={winRate !== null ? `${winRate}%` : '—'}
        />
        <KpiTile
          footer={`${openAll.length} opportunité${openAll.length !== 1 ? 's' : ''} ouverte${openAll.length !== 1 ? 's' : ''}`}
          icon="trending_up"
          label="Pipeline actuel"
          value={formatFcfaCompact(pipelineValue)}
        />
      </section>

      {/* Graphiques */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-outline-variant p-5 shadow-sm">
          <h3 className="text-sm font-bold text-on-surface mb-4">CA généré par mois</h3>
          <RevenueBarChart data={monthlyRevenue} />
        </div>
        <div className="bg-white rounded-xl border border-outline-variant p-5 shadow-sm">
          <h3 className="text-sm font-bold text-on-surface mb-4">Répartition des affaires</h3>
          <DealBreakdownBar lost={dealsLost} pipeline={openAll.length} won={dealsWon} />
        </div>
      </section>

      {/* Clients apportés */}
      <section className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="p-5 border-b border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-on-surface">Clients apportés</h3>
            <p className="text-xs text-secondary mt-0.5">
              {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} sur la période sélectionnée
            </p>
          </div>
          <div className="relative w-full md:w-64">
            <span className="absolute inset-y-0 left-3 flex items-center text-outline">
              <span className="material-symbols-outlined text-sm">search</span>
            </span>
            <input
              className="w-full bg-surface-container border border-outline-variant rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-primary-container transition-all"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un client..."
              type="text"
              value={search}
            />
          </div>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="px-5 py-3 font-bold text-secondary text-[11px] uppercase tracking-widest">Client</th>
                <th className="px-5 py-3 font-bold text-secondary text-[11px] uppercase tracking-widest">Secteur</th>
                <th className="px-5 py-3 font-bold text-secondary text-[11px] uppercase tracking-widest">Montant</th>
                <th className="px-5 py-3 font-bold text-secondary text-[11px] uppercase tracking-widest">Client depuis</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {filteredClients.map((client) => {
                const revenue = revenueByClientId.get(client.id) ?? 0;
                return (
                  <tr
                    className="hover:bg-surface-container-lowest transition-colors cursor-pointer"
                    key={client.id}
                    onClick={() => navigate(`/dossiers-clients/${client.id}`)}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                          {getInitials(client.company || client.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-on-surface truncate">{client.company || client.name}</p>
                          {client.company && <p className="text-[11px] text-secondary truncate">{client.name}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-secondary">{client.sector || '—'}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-on-surface">{revenue > 0 ? formatFCFA(revenue) : '—'}</td>
                    <td className="px-5 py-3 text-sm text-secondary">
                      {client.converted_at ? formatDate(client.converted_at) : formatDate(client.created_at)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="material-symbols-outlined text-secondary text-[18px]">chevron_right</span>
                    </td>
                  </tr>
                );
              })}
              {filteredClients.length === 0 && (
                <tr>
                  <td className="px-5 py-8 text-center text-secondary text-sm" colSpan={5}>
                    Aucun client sur cette période.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
