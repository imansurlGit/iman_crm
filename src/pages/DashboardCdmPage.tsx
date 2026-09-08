// TODO: page volontairement statique pour caler le design du dashboard CDM —
// aucun modèle de campagne marketing n'existe encore côté backend.

const FUNNEL_CLIP = 'polygon(0% 0%, 100% 0%, 90% 100%, 10% 100%)';

interface KpiCard {
  key: string;
  icon: string;
  bg: string;
  border: string;
  label: string;
  value: string;
  trend: string;
  trendUp: boolean;
  footer?: string;
  progress?: number;
}

const KPI_CARDS: KpiCard[] = [
  {
    key: 'prospects',
    icon: 'person_add',
    bg: 'bg-blue-50/50',
    border: 'border-blue-200/60',
    label: 'Nouveaux prospects',
    value: '128',
    trend: '+12,4%',
    trendUp: true,
    progress: 78,
  },
  {
    key: 'conversion',
    icon: 'sync_alt',
    bg: 'bg-violet-50/50',
    border: 'border-violet-200/60',
    label: 'Taux de conversion',
    value: '18,4%',
    trend: '+2,1%',
    trendUp: true,
    footer: 'Prospects vers opportunités',
  },
  {
    key: 'roi',
    icon: 'payments',
    bg: 'bg-emerald-50/50',
    border: 'border-emerald-200/60',
    label: 'ROI / Budget',
    value: '4,2x',
    trend: '-4,2%',
    trendUp: false,
    footer: '1 250 000 FCFA de budget mensuel',
  },
  {
    key: 'cpl',
    icon: 'target',
    bg: 'bg-amber-50/50',
    border: 'border-amber-200/60',
    label: 'Coût par prospect',
    value: '9 770 FCFA',
    trend: '+8,9%',
    trendUp: true,
    footer: 'En baisse depuis 10 700 FCFA',
  },
];

interface FunnelStep {
  label: string;
  width: string;
  bg: string;
  textColor: string;
}

const FUNNEL_STEPS: FunnelStep[] = [
  { label: '128 PROSPECTS', width: '100%', bg: 'rgba(104, 2, 0, 0.15)', textColor: 'text-slate-900' },
  { label: '84 QUALIFIÉS', width: '85%', bg: 'rgba(104, 2, 0, 0.35)', textColor: 'text-primary' },
  { label: '42 CONTACTÉS', width: '65%', bg: 'rgba(104, 2, 0, 0.55)', textColor: 'text-white' },
  { label: '18 OPPORTUNITÉS', width: '45%', bg: 'rgba(104, 2, 0, 0.78)', textColor: 'text-white' },
  { label: '6 CLIENTS SIGNÉS', width: '25%', bg: 'rgba(104, 2, 0, 1)', textColor: 'text-white' },
];

const FUNNEL_STATS = [
  { label: 'Taux de contact', value: '65%' },
  { label: 'Engagement', value: '42%' },
  { label: 'Taux de conclusion', value: '22%' },
  { label: 'Vélocité', value: '12 jours' },
];

interface MarketingEvent {
  day: string;
  month: string;
  title: string;
  description: string;
  tag: string;
  tagClasses: string;
  time: string;
  timeIcon: string;
  faded?: boolean;
}

const MARKETING_EVENTS: MarketingEvent[] = [
  {
    day: '14',
    month: 'AOÛT',
    title: 'Atelier Stratégie T4',
    description: 'Séminaire présentiel avec les responsables de division.',
    tag: 'Stratégique',
    tagClasses: 'bg-slate-100 text-slate-600',
    time: '10:00',
    timeIcon: 'schedule',
  },
  {
    day: '18',
    month: 'AOÛT',
    title: 'Webinaire : Tendances Com 2026',
    description: 'Coproduit avec Radio Ténéré.',
    tag: 'Campagne',
    tagClasses: 'bg-emerald-50 text-emerald-700',
    time: '14:00',
    timeIcon: 'schedule',
  },
  {
    day: '22',
    month: 'AOÛT',
    title: 'Emailing : Relance prospects',
    description: 'Réengagement des contacts froids du T2.',
    tag: 'Fidélisation',
    tagClasses: 'bg-blue-50 text-blue-700',
    time: '09:00',
    timeIcon: 'mail',
  },
  {
    day: '25',
    month: 'AOÛT',
    title: 'Échéance Audit SEO',
    description: 'Revue mensuelle de la performance organique.',
    tag: '',
    tagClasses: '',
    time: '',
    timeIcon: '',
    faded: true,
  },
];

const SOURCE_DISTRIBUTION = [
  { label: 'Recherche organique', value: 38 },
  { label: 'Publicité payante', value: 25 },
  { label: 'Programme de recommandation', value: 20 },
  { label: 'Réseaux sociaux', value: 12 },
  { label: 'Autre', value: 5 },
];

interface Campaign {
  name: string;
  channel: string;
  status: 'ACTIVE' | 'EN PAUSE';
  budget: string;
  roi: string;
  roiPositive: boolean;
  conversion: string;
}

const CAMPAIGNS: Campaign[] = [
  {
    name: 'Campagne digitale — Niger BTP Services',
    channel: 'Recherche & Display',
    status: 'ACTIVE',
    budget: '1 420 000 FCFA',
    roi: '5,2x',
    roiPositive: true,
    conversion: '2,4%',
  },
  {
    name: 'Sponsoring LinkedIn — Zinder Mode & Textile',
    channel: 'LinkedIn Sponsorisé',
    status: 'ACTIVE',
    budget: '890 000 FCFA',
    roi: '3,8x',
    roiPositive: true,
    conversion: '1,8%',
  },
  {
    name: 'Relance email — Clients existants',
    channel: 'Séquence email',
    status: 'EN PAUSE',
    budget: '210 000 FCFA',
    roi: '11,4x',
    roiPositive: false,
    conversion: '8,2%',
  },
  {
    name: 'Lead magnet — Tendances Communication 2026',
    channel: 'Contenu / PDF',
    status: 'ACTIVE',
    budget: '450 000 FCFA',
    roi: '2,1x',
    roiPositive: true,
    conversion: '1,2%',
  },
];

const STATUS_CLASSES: Record<Campaign['status'], string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'EN PAUSE': 'bg-amber-50 text-amber-700 border-amber-200',
};

export default function DashboardCdmPage() {
  return (
    <div className="max-w-[1480px] mx-auto space-y-5 pb-16 text-slate-800 animate-fadeIn">
      {/* ==================================================================== */}
      {/* EN-TÊTE                                                              */}
      {/* ==================================================================== */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">campaign</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-headline-md text-xl font-extrabold text-slate-900 tracking-tight">Performance Marketing</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary">
                CDM · Division Marketing
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">
              Acquisition de prospects et conversion des campagnes — bilan T3 2026.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">filter_list</span>
            Filtrer
          </button>
          <button
            className="flex items-center gap-1.5 bg-primary hover:bg-on-primary-fixed-variant text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs hover:shadow-md active:scale-95 transition-all"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">file_download</span>
            Exporter les données
          </button>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* KPIS                                                                 */}
      {/* ==================================================================== */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {KPI_CARDS.map((kpi) => (
          <div className={`${kpi.bg} p-4 rounded-xl border ${kpi.border} shadow-2xs flex flex-col justify-between`} key={kpi.key}>
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
              <span>{kpi.label}</span>
              <span className={`font-bold px-1.5 py-0.5 rounded-full text-[10px] ${kpi.trendUp ? 'text-emerald-700 bg-emerald-100/70' : 'text-rose-700 bg-rose-100/70'}`}>
                {kpi.trend}
              </span>
            </div>
            <div className="text-xl font-extrabold text-slate-900 tracking-tight font-headline-md">{kpi.value}</div>
            {kpi.progress !== undefined ? (
              <div className="mt-2.5 h-1.5 w-full bg-white/70 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: `${kpi.progress}%` }} />
              </div>
            ) : (
              <p className="text-slate-500 text-[10px] mt-2.5 pt-2.5 border-t border-white/70">{kpi.footer}</p>
            )}
          </div>
        ))}
      </section>

      {/* ==================================================================== */}
      {/* ENTONNOIR + CALENDRIER                                               */}
      {/* ==================================================================== */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-100 shadow-xs p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="font-headline-md text-sm font-bold text-slate-900">Entonnoir Prospects → Clients</h2>
              <p className="text-xs text-slate-400 mt-0.5">Efficacité de conversion à chaque étape</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
              <span className="text-[11px] text-slate-500">Prospect qualifié</span>
            </div>
          </div>

          <div className="flex flex-col items-center space-y-2 max-w-lg mx-auto">
            {FUNNEL_STEPS.map((step) => (
              <div
                className="w-full h-16 flex items-center justify-center"
                key={step.label}
                style={{ clipPath: FUNNEL_CLIP, width: step.width, backgroundColor: step.bg }}
              >
                <span className={`text-sm font-bold ${step.textColor}`}>{step.label}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 mt-8 border-t border-slate-100 pt-5 text-center">
            {FUNNEL_STATS.map((stat) => (
              <div key={stat.label}>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">{stat.label}</p>
                <p className="text-base font-bold text-slate-900 mt-0.5 font-headline-md">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-primary/5 border border-primary/10 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-6">
            <div className="flex items-center gap-4">
              <span className="text-xs text-primary font-bold shrink-0">Vélocité actuelle</span>
              <div className="h-2 w-40 sm:w-56 bg-white/70 rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[72%] rounded-full" />
              </div>
            </div>
            <span className="text-sm font-bold text-primary">+14% de croissance</span>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-100 shadow-xs flex flex-col">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center">
            <h2 className="font-headline-md text-sm font-bold text-slate-900">Calendrier Marketing</h2>
            <span className="material-symbols-outlined text-slate-400 text-[18px]">calendar_month</span>
          </div>
          <div className="p-4 flex-1 overflow-y-auto custom-scrollbar max-h-[380px] space-y-4">
            {MARKETING_EVENTS.map((event) => (
              <div className={`flex gap-3 ${event.faded ? 'opacity-50' : ''}`} key={event.title}>
                <div className="shrink-0 text-center w-11 py-1.5 bg-primary/5 border border-primary/10 rounded-lg">
                  <p className="text-[9px] text-slate-500 font-bold uppercase">{event.month}</p>
                  <p className="text-base leading-none text-primary font-bold mt-0.5">{event.day}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-bold text-slate-900">{event.title}</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">{event.description}</p>
                  {event.tag && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-bold ${event.tagClasses}`}>
                        {event.tag}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">{event.timeIcon}</span>
                        {event.time}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 pt-0">
            <a
              className="block w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors text-center"
              href="/calendrier-collaboratif"
            >
              Voir le calendrier complet
            </a>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* SOURCES + CAMPAGNES                                                  */}
      {/* ==================================================================== */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-100 shadow-xs p-5">
          <h2 className="font-headline-md text-sm font-bold text-slate-900 mb-4">Répartition des sources</h2>
          <div className="space-y-3">
            {SOURCE_DISTRIBUTION.map((source) => (
              <div className="space-y-1" key={source.label}>
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-700">{source.label}</span>
                  <span className="font-bold text-slate-900">{source.value}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${source.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-headline-md text-sm font-bold text-slate-900">Performance des campagnes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                  <th className="px-5 py-3.5">Campagne</th>
                  <th className="px-5 py-3.5 text-center">Statut</th>
                  <th className="px-5 py-3.5 text-right">Budget</th>
                  <th className="px-5 py-3.5 text-right">ROI</th>
                  <th className="px-5 py-3.5 text-right">Conv.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {CAMPAIGNS.map((campaign) => (
                  <tr className="hover:bg-slate-50/80 transition-colors" key={campaign.name}>
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-slate-900">{campaign.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{campaign.channel}</p>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_CLASSES[campaign.status]}`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-slate-900">{campaign.budget}</td>
                    <td className={`px-5 py-3.5 text-right font-bold ${campaign.roiPositive ? 'text-emerald-600' : 'text-primary'}`}>
                      {campaign.roi}
                    </td>
                    <td className="px-5 py-3.5 text-right text-slate-500">{campaign.conversion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
