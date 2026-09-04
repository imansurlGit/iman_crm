import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { listProjects, getProjectDivisions, STATUS_OPTIONS, type Project } from '../../services/projectService';
import { listContacts, type Contact } from '../../services/contactService';

// ============================================================================
// ANALYTICS & STATISTIQUES — DIRECTION GÉNÉRALE
// Constructeur de rapport façon mini-BI : le DG coche les indicateurs qu'il
// veut voir, choisit une période et, pour certains indicateurs, le type de
// graphique, puis exporte (export encore factice).
//
// La plupart des indicateurs sont branchés sur les vraies données (Project,
// Contact). Deux exceptions assumées :
// - "Répartition par division" et "Pipeline commercial" sont des COMPTAGES
//   réels (nombre de projets/dossiers), pas des montants : `Prestation` n'a
//   pas de champ monétaire propre, impossible de ventiler un CA par division
//   sans agrégation dédiée côté backend.
// - "Répartition par prestation" reste illustrative : `Prestation.label` est
//   un champ libre, pas une catégorie fixe agrégable proprement.
// ============================================================================

type PeriodFilter = 'MONTH' | 'QUARTER' | 'YEAR';
type ChartType = 'number' | 'bar' | 'line' | 'donut' | 'funnel' | 'table';

interface MetricDef {
  id: string;
  label: string;
  category: string;
  charts: ChartType[]; // premier = type par défaut
}

const CHART_TYPE_META: Record<ChartType, { label: string; icon: string }> = {
  number: { label: 'Chiffre clé', icon: '123' },
  bar: { label: 'Barres', icon: 'bar_chart' },
  line: { label: 'Courbe', icon: 'show_chart' },
  donut: { label: 'Anneau', icon: 'donut_large' },
  funnel: { label: 'Entonnoir', icon: 'filter_alt' },
  table: { label: 'Tableau', icon: 'table_rows' },
};

const METRICS: MetricDef[] = [
  { id: 'ca', label: "Chiffre d'affaires", category: 'Commercial', charts: ['number', 'line'] },
  { id: 'conversion', label: 'Taux de transformation', category: 'Commercial', charts: ['number'] },
  { id: 'cycle', label: 'Cycle de vente moyen', category: 'Commercial', charts: ['number'] },
  { id: 'top_clients', label: 'Top clients', category: 'Commercial', charts: ['bar', 'table'] },
  { id: 'top_performeurs', label: 'Top performeurs', category: 'Commercial', charts: ['bar', 'table'] },
  { id: 'division', label: 'Répartition par division', category: 'Commercial', charts: ['donut', 'bar'] },
  { id: 'pipeline', label: 'Pipeline commercial', category: 'Production', charts: ['funnel', 'bar'] },
  { id: 'statuts', label: 'Statuts des projets', category: 'Production', charts: ['donut', 'bar'] },
  { id: 'prestations', label: 'Répartition par prestation', category: 'Production', charts: ['bar', 'table'] },
  { id: 'tresorerie', label: 'Total encaissé', category: 'Finance', charts: ['number'] },
];

const METRIC_CATEGORIES = ['Commercial', 'Production', 'Finance'];

const DEFAULT_SELECTED: Record<string, boolean> = {
  ca: true,
  conversion: true,
  cycle: false,
  top_clients: true,
  top_performeurs: true,
  division: true,
  pipeline: true,
  statuts: false,
  prestations: false,
  tresorerie: true,
};

const DEFAULT_CHART: Record<string, ChartType> = {
  ca: 'line',
  top_clients: 'bar',
  top_performeurs: 'bar',
  division: 'donut',
  pipeline: 'funnel',
  statuts: 'donut',
  prestations: 'bar',
};

const DIVISION_COLORS = ['#680200', '#8b1a0e', '#b91c1c', '#cbd5e1', '#10b981', '#6366f1'];

const STATUS_COLORS: Record<string, string> = {
  NOUVEAU: '#94a3b8',
  A_TRAITER: '#f59e0b',
  EN_COURS: '#3b82f6',
  EN_VALIDATION_INTERNE: '#a855f7',
  EN_VALIDATION_CLIENT: '#ec4899',
  EN_CORRECTION: '#f97316',
  PRET_POUR_EXECUTION: '#14b8a6',
  PRET_POUR_LIVRAISON: '#06b6d4',
  LIVRE: '#10b981',
  CLOTURE: '#680200',
  BLOQUE: '#ef4444',
  PERDUE: '#9ca3af',
};

function getPeriodStart(period: PeriodFilter): Date {
  const now = new Date();
  if (period === 'MONTH') return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === 'QUARTER') return new Date(now.getFullYear(), now.getMonth() - 2, 1);
  return new Date(now.getFullYear(), 0, 1);
}

function periodLabel(period: PeriodFilter): string {
  const now = new Date();
  if (period === 'MONTH') {
    const label = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  if (period === 'QUARTER') return `Trimestre Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`;
  return `Année ${now.getFullYear()}`;
}

function formatM(value: number): string {
  return value.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<PeriodFilter>('MONTH');
  const [selected, setSelected] = useState<Record<string, boolean>>(DEFAULT_SELECTED);
  const [chartChoice, setChartChoice] = useState<Record<string, ChartType>>(DEFAULT_CHART);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [opportunities, setOpportunities] = useState<Project[]>([]);
  const [clients, setClients] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([listProjects({ kind: 'PROJET' }), listProjects({ kind: 'OPPORTUNITE' }), listContacts('CLIENT')])
      .then(([projetsList, oppsList, clientsList]) => {
        setProjects(projetsList);
        setOpportunities(oppsList);
        setClients(clientsList);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const toggleMetric = (id: string) => setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  const setChartType = (id: string, type: ChartType) => setChartChoice((prev) => ({ ...prev, [id]: type }));
  const selectedCount = Object.values(selected).filter(Boolean).length;
  const selectAll = () => setSelected(Object.fromEntries(METRICS.map((m) => [m.id, true])));
  const selectNone = () => setSelected(Object.fromEntries(METRICS.map((m) => [m.id, false])));

  // --------------------------------------------------------------------------
  // Indicateurs période (Commercial/Finance) — filtrés sur `created_at`.
  // --------------------------------------------------------------------------
  const periodStart = useMemo(() => getPeriodStart(period), [period]);
  const periodProjects = useMemo(() => projects.filter((p) => new Date(p.created_at) >= periodStart), [projects, periodStart]);
  const periodOpportunities = useMemo(
    () => opportunities.filter((p) => new Date(p.created_at) >= periodStart),
    [opportunities, periodStart],
  );
  const convertedClients = useMemo(
    () => clients.filter((c) => c.converted_at && new Date(c.converted_at) >= periodStart),
    [clients, periodStart],
  );

  const kpi = useMemo(() => {
    const caTotal = periodProjects.reduce((sum, p) => sum + (p.budget ? Number(p.budget) : 0), 0);
    const collected = periodProjects.reduce((sum, p) => sum + Number(p.collected_amount || 0), 0);
    const wonCount = periodOpportunities.filter((p) => p.budget !== null).length;
    const conversionRate = periodOpportunities.length > 0 ? (wonCount / periodOpportunities.length) * 100 : 0;
    const avgCycleDays =
      convertedClients.length > 0
        ? Math.round(
            convertedClients.reduce(
              (sum, c) => sum + Math.max(0, (new Date(c.converted_at as string).getTime() - new Date(c.created_at).getTime()) / 86_400_000),
              0,
            ) / convertedClients.length,
          )
        : null;

    return {
      caTotal: `${formatM(caTotal / 1_000_000)} M FCFA`,
      caSub: `${periodProjects.length} projet${periodProjects.length > 1 ? 's' : ''} sur la période`,
      conversionRate: `${conversionRate.toFixed(1)}%`,
      conversionSub: `${wonCount}/${periodOpportunities.length} opportunités gagnées`,
      avgCycle: avgCycleDays !== null ? `${avgCycleDays} jours` : '—',
      cycleSub: `${convertedClients.length} client${convertedClients.length > 1 ? 's' : ''} converti${convertedClients.length > 1 ? 's' : ''}`,
      totalEncaisse: `${formatM(collected / 1_000_000)} M FCFA`,
      recoverySub: caTotal > 0 ? `Taux de recouvrement : ${Math.round((collected / caTotal) * 100)}%` : 'Aucun budget sur la période',
    };
  }, [periodProjects, periodOpportunities, convertedClients]);

  // --------------------------------------------------------------------------
  // Évolution du CA — 10 derniers mois, tous projets confirmés.
  // --------------------------------------------------------------------------
  const revenueChartData = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 10 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (9 - i), 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, month: d.toLocaleDateString('fr-FR', { month: 'short' }), revenue: 0 };
    });
    for (const p of projects) {
      if (!p.budget) continue;
      const d = new Date(p.created_at);
      const bucket = months.find((m) => m.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (bucket) bucket.revenue += Number(p.budget) / 1_000_000;
    }
    return months.map((m, idx) => ({ ...m, current: idx === months.length - 1 }));
  }, [projects]);

  const chartPoints = useMemo(
    () => revenueChartData.map((d, i) => ({ x: 20 + i * 60, y: 190 - Math.min(170, d.revenue * 0.7) })),
    [revenueChartData],
  );
  const linePath = chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath =
    chartPoints.length > 0
      ? `${linePath} L ${chartPoints[chartPoints.length - 1].x} 190 L ${chartPoints[0].x} 190 Z`
      : '';

  // --------------------------------------------------------------------------
  // Top clients / Top performeurs — CA réel agrégé par client / créateur.
  // --------------------------------------------------------------------------
  const topClients = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of projects) {
      if (!p.budget) continue;
      map.set(p.client_name, (map.get(p.client_name) ?? 0) + Number(p.budget));
    }
    return Array.from(map.entries())
      .map(([name, revenue]) => ({ name, revenue: revenue / 1_000_000 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, [projects]);

  const topPerformers = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of projects) {
      if (!p.budget || !p.created_by_name) continue;
      map.set(p.created_by_name, (map.get(p.created_by_name) ?? 0) + Number(p.budget));
    }
    return Array.from(map.entries())
      .map(([name, revenue]) => ({ name, revenue: revenue / 1_000_000 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [projects]);

  // --------------------------------------------------------------------------
  // Répartition par division — comptage de projets touchant chaque division
  // (via les prestations), pas un CA (voir commentaire d'en-tête).
  // --------------------------------------------------------------------------
  const divisionMix = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of projects) {
      for (const div of getProjectDivisions(p)) counts.set(div, (counts.get(div) ?? 0) + 1);
    }
    const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
    return Array.from(counts.entries())
      .map(([division, count], idx) => ({
        division,
        count,
        percent: total > 0 ? Math.round((count / total) * 100) : 0,
        color: DIVISION_COLORS[idx % DIVISION_COLORS.length],
      }))
      .sort((a, b) => b.count - a.count);
  }, [projects]);

  const DONUT_CIRCUMFERENCE = 238.7;
  const donutSegments = useMemo(() => {
    let cumulativeOffset = 0;
    return divisionMix.map((item) => {
      const offset = cumulativeOffset;
      cumulativeOffset += (item.percent / 100) * DONUT_CIRCUMFERENCE;
      return { ...item, offset };
    });
  }, [divisionMix]);

  // --------------------------------------------------------------------------
  // Pipeline commercial — comptages réels par bloc de statut (pas de montant,
  // voir commentaire d'en-tête).
  // --------------------------------------------------------------------------
  const FUNNEL_CLIP = 'polygon(0% 0%, 100% 0%, 92% 100%, 8% 100%)';
  const funnelStages = useMemo(() => {
    const stages = [
      { name: 'Prospection & Cadrage', shortName: 'PROSPECTION', count: opportunities.filter((p) => p.budget === null).length },
      {
        name: 'Signature & Acompte',
        shortName: 'SIGNATURE',
        count:
          opportunities.filter((p) => p.budget !== null).length +
          projects.filter((p) => ['NOUVEAU', 'A_TRAITER'].includes(p.status)).length,
      },
      {
        name: 'Production',
        shortName: 'PRODUCTION',
        count: projects.filter((p) => ['EN_COURS', 'EN_VALIDATION_INTERNE', 'BLOQUE', 'PRET_POUR_EXECUTION'].includes(p.status)).length,
      },
      {
        name: 'Validation Client',
        shortName: 'VALIDATION',
        count: projects.filter((p) => ['EN_VALIDATION_CLIENT', 'EN_CORRECTION'].includes(p.status)).length,
      },
      {
        name: 'Livraison & Facturation',
        shortName: 'LIVRAISON',
        count: projects.filter((p) => ['PRET_POUR_LIVRAISON', 'LIVRE', 'CLOTURE'].includes(p.status)).length,
      },
    ];
    const maxCount = Math.max(1, ...stages.map((s) => s.count));
    const opacities = [0.15, 0.35, 0.55, 0.78, 1];
    return stages.map((s, i) => ({
      step: i + 1,
      label: `${s.count} ${s.shortName}`,
      pct: s.count > 0 ? Math.max(15, Math.round((s.count / maxCount) * 100)) : 8,
      bg: `rgba(104, 2, 0, ${opacities[i]})`,
      textColor: i === 0 ? 'text-slate-900' : i === 1 ? 'text-primary' : 'text-white',
      subTextColor: i === 0 ? 'text-slate-500' : i === 1 ? 'text-primary/70' : 'text-white/80',
    }));
  }, [opportunities, projects]);

  // --------------------------------------------------------------------------
  // Statuts des projets — comptage réel par statut.
  // --------------------------------------------------------------------------
  const projectStatuses = useMemo(
    () =>
      STATUS_OPTIONS.map((opt) => ({
        key: opt.value,
        label: opt.label,
        count: projects.filter((p) => p.status === opt.value).length,
        color: STATUS_COLORS[opt.value] ?? '#94a3b8',
      })).filter((s) => s.count > 0),
    [projects],
  );
  const totalProjects = projectStatuses.reduce((acc, s) => acc + s.count, 0);
  const STATUS_DONUT_CIRCUMFERENCE = 238.7;
  const statusDonutSegments = useMemo(() => {
    let statusOffset = 0;
    return projectStatuses.map((s) => {
      const percent = totalProjects > 0 ? (s.count / totalProjects) * 100 : 0;
      const offset = statusOffset;
      statusOffset += (percent / 100) * STATUS_DONUT_CIRCUMFERENCE;
      return { ...s, percent, offset };
    });
  }, [projectStatuses, totalProjects]);

  // --------------------------------------------------------------------------
  // DONNÉES ILLUSTRATIVES — Répartition par prestation (voir commentaire
  // d'en-tête : `Prestation.label` est un champ libre, non agrégable).
  // --------------------------------------------------------------------------
  const prestationMix = [
    { label: 'Branding & Identité', percent: 28, value: '41,2 M' },
    { label: 'Média & Digital', percent: 22, value: '32,3 M' },
    { label: 'Événementiel VIP', percent: 18, value: '26,5 M' },
    { label: 'Développement Web', percent: 14, value: '20,6 M' },
    { label: 'Conseil & Stratégie', percent: 11, value: '16,2 M' },
    { label: 'Production & Fabrication', percent: 7, value: '10,3 M' },
  ];
  const maxPrestation = Math.max(...prestationMix.map((p) => p.percent));

  // --------------------------------------------------------------------------
  // Rendu générique d'une carte "chiffre clé"
  // --------------------------------------------------------------------------
  function NumberCard({ title, value, sub }: { title: string; value: string; sub: string }) {
    return (
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-full">
        <span className="text-slate-500 text-xs font-semibold">{title}</span>
        <div className="text-2xl font-extrabold text-slate-900 tracking-tight mt-2">{value}</div>
        <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-emerald-600 font-bold">{sub}</div>
      </div>
    );
  }

  function CardShell({ title, sub, fullWidth, children }: { title: string; sub: string; fullWidth?: boolean; children: ReactNode }) {
    return (
      <div className={`bg-white p-5 rounded-2xl border border-slate-100 shadow-sm ${fullWidth ? 'xl:col-span-2' : ''}`}>
        <div className="mb-4">
          <h3 className="font-headline-md text-sm font-bold text-slate-900">{title}</h3>
          <p className="text-slate-400 text-[11px] mt-0.5">{sub}</p>
        </div>
        {children}
      </div>
    );
  }

  function BarList({ rows, valueSuffix }: { rows: { label: string; sub?: string; value: number; display: string }[]; valueSuffix?: string }) {
    const max = Math.max(1, ...rows.map((r) => r.value));
    return (
      <div className="space-y-2.5">
        {rows.map((row) => (
          <div className="flex items-center gap-3" key={row.label}>
            <div className="w-32 shrink-0 min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">{row.label}</p>
              {row.sub && <p className="text-[10px] text-slate-400 truncate">{row.sub}</p>}
            </div>
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${(row.value / max) * 100}%` }} />
            </div>
            <span className="text-xs font-bold text-slate-800 w-16 text-right shrink-0">
              {row.display}
              {valueSuffix}
            </span>
          </div>
        ))}
        {rows.length === 0 && <p className="text-xs text-slate-400 text-center py-3">Aucune donnée pour l'instant.</p>}
      </div>
    );
  }

  function DataTable({ columns, rows }: { columns: string[]; rows: (string | number)[][] }) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100">
              {columns.map((col, i) => (
                <th className="pb-2 font-bold text-slate-400 text-[10px] uppercase tracking-wider" key={col} style={i > 0 ? { textAlign: 'right' } : undefined}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td className={`py-2 ${ci === 0 ? 'font-semibold text-slate-900' : 'text-slate-600 text-right'}`} key={ci}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="py-3 text-slate-400 text-center" colSpan={columns.length}>
                  Aucune donnée pour l'instant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Rendu de chaque indicateur selon le type de graphique choisi
  // --------------------------------------------------------------------------
  function renderMetric(metric: MetricDef) {
    const chartType = chartChoice[metric.id] ?? metric.charts[0];

    switch (metric.id) {
      case 'ca':
        if (chartType === 'number') {
          return <NumberCard key={metric.id} sub={kpi.caSub} title={`Chiffre d'affaires · ${periodLabel(period)}`} value={kpi.caTotal} />;
        }
        return (
          <CardShell fullWidth key={metric.id} sub="Projets confirmés, 10 derniers mois, toutes divisions" title="Évolution du Chiffre d'Affaires">
            <div className="relative w-full h-48">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 600 200">
                <defs>
                  <linearGradient id="analyticsAreaGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#680200" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#680200" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <line stroke="#f1f5f9" strokeWidth="1" x1="0" x2="600" y1="40" />
                <line stroke="#f1f5f9" strokeWidth="1" x1="0" x2="600" y1="90" />
                <line stroke="#f1f5f9" strokeWidth="1" x1="0" x2="600" y1="140" />
                <line stroke="#f1f5f9" strokeWidth="1" x1="0" x2="600" y1="190" />
                {areaPath && <path d={areaPath} fill="url(#analyticsAreaGrad)" />}
                {linePath && <path d={linePath} fill="none" stroke="#680200" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" />}
                {revenueChartData.map((d, index) => {
                  const point = chartPoints[index];
                  const isCurrent = d.current;
                  const isHovered = hoveredMonth === index;
                  return (
                    <g className="cursor-pointer" key={d.month + index} onMouseEnter={() => setHoveredMonth(index)} onMouseLeave={() => setHoveredMonth(null)}>
                      {isHovered && <line stroke="#cbd5e1" strokeDasharray="2 2" strokeWidth="1" x1={point.x} x2={point.x} y1="0" y2="190" />}
                      <circle
                        className="transition-all duration-200"
                        cx={point.x}
                        cy={point.y}
                        fill={isCurrent ? '#680200' : '#ffffff'}
                        r={isHovered ? 5 : isCurrent ? 4 : 3}
                        stroke="#680200"
                        strokeWidth={isCurrent ? 2.5 : 1.5}
                      />
                      <text
                        className={`text-[10px] font-semibold transition-colors ${isCurrent ? 'fill-primary font-bold' : 'fill-slate-400'}`}
                        textAnchor="middle"
                        x={point.x}
                        y="196"
                      >
                        {d.month}
                      </text>
                    </g>
                  );
                })}
              </svg>
              {hoveredMonth !== null && revenueChartData[hoveredMonth] && (
                <div
                  className="absolute top-1 bg-slate-900 text-white px-2.5 py-1.5 rounded-lg text-[11px] shadow-xl pointer-events-none transition-all"
                  style={{ left: `${Math.min(75, Math.max(10, (hoveredMonth / (revenueChartData.length - 1)) * 100))}%` }}
                >
                  <p className="font-bold text-slate-200">{revenueChartData[hoveredMonth].month}</p>
                  <p className="text-emerald-400 font-semibold">
                    {revenueChartData[hoveredMonth].revenue > 0 ? `${formatM(revenueChartData[hoveredMonth].revenue)} M FCFA` : 'Aucun projet'}
                  </p>
                </div>
              )}
            </div>
          </CardShell>
        );

      case 'conversion':
        return <NumberCard key={metric.id} sub={kpi.conversionSub} title="Taux de transformation" value={kpi.conversionRate} />;

      case 'cycle':
        return <NumberCard key={metric.id} sub={kpi.cycleSub} title="Cycle de vente moyen" value={kpi.avgCycle} />;

      case 'tresorerie':
        return <NumberCard key={metric.id} sub={kpi.recoverySub} title="Total encaissé" value={kpi.totalEncaisse} />;

      case 'top_clients':
        return (
          <CardShell key={metric.id} sub="Classement par CA réalisé, toutes divisions" title="Top Clients">
            {chartType === 'table' ? (
              <DataTable columns={['Client', 'CA']} rows={topClients.map((c) => [c.name, `${formatM(c.revenue)} M`])} />
            ) : (
              <BarList rows={topClients.map((c) => ({ label: c.name, value: c.revenue, display: `${formatM(c.revenue)} M` }))} />
            )}
          </CardShell>
        );

      case 'top_performeurs':
        return (
          <CardShell key={metric.id} sub="Classement par CA réalisé, toutes divisions" title="Top Performeurs">
            {chartType === 'table' ? (
              <DataTable columns={['Nom', 'CA']} rows={topPerformers.map((p) => [p.name, `${formatM(p.revenue)} M`])} />
            ) : (
              <BarList rows={topPerformers.map((p) => ({ label: p.name, value: p.revenue, display: `${formatM(p.revenue)} M` }))} />
            )}
          </CardShell>
        );

      case 'division':
        return (
          <CardShell key={metric.id} sub="Nombre de projets touchant chaque division" title="Répartition par Division">
            {chartType === 'donut' ? (
              <div className="flex items-center gap-6">
                <div className="relative shrink-0">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                    {donutSegments.map((seg) => (
                      <circle
                        cx="50"
                        cy="50"
                        fill="transparent"
                        key={seg.division}
                        r="38"
                        stroke={seg.color}
                        strokeDasharray={`${(seg.percent / 100) * DONUT_CIRCUMFERENCE} ${DONUT_CIRCUMFERENCE}`}
                        strokeDashoffset={-seg.offset}
                        strokeWidth="14"
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider">Total</span>
                    <span className="text-sm font-extrabold text-slate-900">{projects.length}</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {divisionMix.map((item) => (
                    <div className="flex items-center justify-between text-xs" key={item.division}>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-700 font-medium">{item.division}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[11px]">{item.count} projets</span>
                        <span className="font-bold text-slate-900">{item.percent}%</span>
                      </div>
                    </div>
                  ))}
                  {divisionMix.length === 0 && <p className="text-xs text-slate-400">Aucune donnée pour l'instant.</p>}
                </div>
              </div>
            ) : (
              <BarList rows={divisionMix.map((item) => ({ label: item.division, value: item.percent, display: `${item.percent}%` }))} />
            )}
          </CardShell>
        );

      case 'pipeline':
        return (
          <CardShell fullWidth={chartType === 'funnel'} key={metric.id} sub="Nombre de dossiers en cours, toutes divisions" title="Pipeline Commercial">
            {chartType === 'funnel' ? (
              <div className="flex flex-col items-center gap-1.5 pt-1">
                {funnelStages.map((stage) => (
                  <div
                    className="flex flex-col items-center justify-center text-center py-2.5"
                    key={stage.step}
                    style={{ clipPath: FUNNEL_CLIP, width: `${stage.pct}%`, backgroundColor: stage.bg }}
                  >
                    <span className={`text-xs font-extrabold tracking-wide ${stage.textColor}`}>{stage.label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <BarList rows={funnelStages.map((s) => ({ label: s.label.replace(/^\d+\s/, ''), value: s.pct, display: s.label.split(' ')[0] }))} />
            )}
          </CardShell>
        );

      case 'statuts':
        return (
          <CardShell key={metric.id} sub={`${totalProjects} projets, toutes divisions`} title="Statuts des Projets">
            {chartType === 'donut' ? (
              <div className="flex items-center gap-6">
                <div className="relative shrink-0">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                    {statusDonutSegments.map((seg) => (
                      <circle
                        cx="50"
                        cy="50"
                        fill="transparent"
                        key={seg.key}
                        r="38"
                        stroke={seg.color}
                        strokeDasharray={`${(seg.percent / 100) * STATUS_DONUT_CIRCUMFERENCE} ${STATUS_DONUT_CIRCUMFERENCE}`}
                        strokeDashoffset={-seg.offset}
                        strokeWidth="14"
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider">Total</span>
                    <span className="text-sm font-extrabold text-slate-900">{totalProjects}</span>
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-1 gap-1.5">
                  {projectStatuses.map((s) => (
                    <div className="flex items-center justify-between text-xs" key={s.key}>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="text-slate-600 font-medium truncate">{s.label}</span>
                      </div>
                      <span className="font-bold text-slate-900 shrink-0">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <BarList rows={projectStatuses.map((s) => ({ label: s.label, value: s.count, display: `${s.count}` }))} />
            )}
          </CardShell>
        );

      case 'prestations':
        return (
          <CardShell key={metric.id} sub="Estimation illustrative — pas de donnée agrégée côté backend" title="Répartition par Prestation">
            {chartType === 'table' ? (
              <DataTable columns={['Prestation', 'CA', 'Part']} rows={prestationMix.map((p) => [p.label, p.value, `${p.percent}%`])} />
            ) : (
              <BarList rows={prestationMix.map((p) => ({ label: p.label, value: p.percent / maxPrestation, display: p.value }))} />
            )}
          </CardShell>
        );

      default:
        return null;
    }
  }

  const activeMetrics = METRICS.filter((m) => selected[m.id]);
  const numberMetrics = activeMetrics.filter((m) => (chartChoice[m.id] ?? m.charts[0]) === 'number');
  const chartMetrics = activeMetrics.filter((m) => (chartChoice[m.id] ?? m.charts[0]) !== 'number');

  return (
    <div className="max-w-[1480px] mx-auto pb-16 text-slate-800">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs font-medium">
          <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
          {toastMessage}
        </div>
      )}

      {/* ==================================================================== */}
      {/* EN-TÊTE                                                              */}
      {/* ==================================================================== */}
      <header className="mb-5">
        <div className="flex items-center gap-2.5">
          <h1 className="font-headline-md text-2xl font-extrabold text-slate-900 tracking-tight">Analytics & Statistiques</h1>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary">DG · Constructeur de Rapport</span>
        </div>
        <p className="text-slate-500 text-xs mt-1">
          Cochez les indicateurs à inclure, choisissez leur type de graphique, puis exportez le rapport.
        </p>
      </header>

      <div className="flex flex-col lg:flex-row items-start gap-5">
        {/* ================================================================ */}
        {/* PANNEAU DE CONFIGURATION                                          */}
        {/* ================================================================ */}
        <aside className="w-full lg:w-72 shrink-0 lg:sticky lg:top-4 space-y-4">
          {/* Période */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Période</p>
            <div className="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-semibold w-full">
              {(['MONTH', 'QUARTER', 'YEAR'] as PeriodFilter[]).map((p) => (
                <button
                  className={`flex-1 px-3 py-1.5 rounded-lg transition-all ${
                    period === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                  key={p}
                  onClick={() => setPeriod(p)}
                  type="button"
                >
                  {p === 'MONTH' ? 'Mois' : p === 'QUARTER' ? 'Trimestre' : 'Année'}
                </button>
              ))}
            </div>
          </div>

          {/* Indicateurs */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Indicateurs ({selectedCount})</p>
              <div className="flex items-center gap-2 text-[10px] font-semibold">
                <button className="text-primary hover:underline" onClick={selectAll} type="button">
                  Tout
                </button>
                <span className="text-slate-300">·</span>
                <button className="text-slate-400 hover:underline" onClick={selectNone} type="button">
                  Aucun
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {METRIC_CATEGORIES.map((category) => (
                <div key={category}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{category}</p>
                  <div className="space-y-1.5">
                    {METRICS.filter((m) => m.category === category).map((metric) => (
                      <div className="border border-slate-100 rounded-xl overflow-hidden" key={metric.id}>
                        <label className="flex items-center gap-2.5 p-2.5 cursor-pointer hover:bg-slate-50 transition-colors">
                          <input
                            checked={!!selected[metric.id]}
                            className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/30 shrink-0"
                            onChange={() => toggleMetric(metric.id)}
                            type="checkbox"
                          />
                          <span className="text-xs font-semibold text-slate-800 flex-1 min-w-0 truncate">{metric.label}</span>
                        </label>

                        {selected[metric.id] && metric.charts.length > 1 && (
                          <div className="flex items-center gap-1.5 px-2.5 pb-2.5">
                            {metric.charts.map((ct) => {
                              const isActive = (chartChoice[metric.id] ?? metric.charts[0]) === ct;
                              return (
                                <button
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-colors ${
                                    isActive ? 'bg-primary border-primary text-white' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                                  }`}
                                  key={ct}
                                  onClick={() => setChartType(metric.id, ct)}
                                  title={CHART_TYPE_META[ct].label}
                                  type="button"
                                >
                                  <span className="material-symbols-outlined text-[15px]">{CHART_TYPE_META[ct].icon}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Export */}
          <button
            className="w-full px-4 py-2.5 bg-primary hover:bg-on-primary-fixed-variant text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={selectedCount === 0}
            onClick={() => showToast('Génération du rapport PDF en cours...')}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            Exporter le rapport
          </button>
        </aside>

        {/* ================================================================ */}
        {/* CANEVAS DU RAPPORT                                                */}
        {/* ================================================================ */}
        <main className="flex-1 min-w-0 space-y-5">
          {isLoading ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-100 flex items-center justify-center text-sm text-slate-400">
              Chargement...
            </div>
          ) : selectedCount === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-[36px] text-slate-300 mb-2">query_stats</span>
              <p className="text-sm font-semibold text-slate-500">Aucun indicateur sélectionné</p>
              <p className="text-xs text-slate-400 mt-1">Cochez au moins un indicateur dans le panneau de gauche pour construire votre rapport.</p>
            </div>
          ) : (
            <>
              {numberMetrics.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  {numberMetrics.map((m) => renderMetric(m))}
                </div>
              )}
              {chartMetrics.length > 0 && <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">{chartMetrics.map((m) => renderMetric(m))}</div>}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
