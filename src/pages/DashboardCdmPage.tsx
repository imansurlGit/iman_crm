// TODO: page volontairement statique pour caler le design du dashboard CDM —
// aucun modèle de campagne marketing n'existe encore côté backend.

const CARD_CLASSES = 'bg-white rounded-lg border border-outline-variant';
const FUNNEL_CLIP = 'polygon(0% 0%, 100% 0%, 90% 100%, 10% 100%)';

interface KpiCard {
  icon: string;
  label: string;
  value: string;
  trend: string;
  trendUp: boolean;
  footer?: string;
  progress?: number;
}

const KPI_CARDS: KpiCard[] = [
  { icon: 'person_add', label: 'Nouveaux prospects', value: '128', trend: '+12,4%', trendUp: true, progress: 78 },
  {
    icon: 'sync_alt',
    label: 'Taux de conversion',
    value: '18,4%',
    trend: '+2,1%',
    trendUp: true,
    footer: 'Prospects vers opportunités',
  },
  {
    icon: 'payments',
    label: 'ROI / Budget',
    value: '4,2x',
    trend: '-4,2%',
    trendUp: false,
    footer: '1 250 000 FCFA de budget mensuel',
  },
  {
    icon: 'target',
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
  shade: string;
  textColor: string;
}

const FUNNEL_STEPS: FunnelStep[] = [
  { label: '128 PROSPECTS', width: '100%', shade: 'bg-primary/20', textColor: 'text-on-surface' },
  { label: '84 QUALIFIÉS', width: '85%', shade: 'bg-primary/40', textColor: 'text-primary' },
  { label: '42 CONTACTÉS', width: '65%', shade: 'bg-primary/60', textColor: 'text-white' },
  { label: '18 OPPORTUNITÉS', width: '45%', shade: 'bg-primary/80', textColor: 'text-white' },
  { label: '6 CLIENTS SIGNÉS', width: '25%', shade: 'bg-primary', textColor: 'text-white' },
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
    tagClasses: 'bg-secondary-container text-on-secondary-container',
    time: '10:00',
    timeIcon: 'schedule',
  },
  {
    day: '18',
    month: 'AOÛT',
    title: 'Webinaire : Tendances Com 2026',
    description: 'Coproduit avec Radio Ténéré.',
    tag: 'Campagne',
    tagClasses: 'bg-green-100 text-green-800',
    time: '14:00',
    timeIcon: 'schedule',
  },
  {
    day: '22',
    month: 'AOÛT',
    title: 'Emailing : Relance prospects',
    description: 'Réengagement des contacts froids du T2.',
    tag: 'Fidélisation',
    tagClasses: 'bg-blue-100 text-blue-800',
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
  { label: 'Recherche organique', value: 38, barClasses: 'bg-primary' },
  { label: 'Publicité payante', value: 25, barClasses: 'bg-primary/80' },
  { label: 'Programme de recommandation', value: 20, barClasses: 'bg-primary/60' },
  { label: 'Réseaux sociaux', value: 12, barClasses: 'bg-primary/40' },
  { label: 'Autre', value: 5, barClasses: 'bg-primary/20' },
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
  ACTIVE: 'bg-green-50 text-green-700',
  'EN PAUSE': 'bg-orange-50 text-orange-700',
};

export default function DashboardCdmPage() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-gutter">
      {/* En-tête */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">Performance Marketing</h2>
          <p className="text-secondary mt-1 text-sm">
            Acquisition de prospects et conversion des campagnes — bilan T3 2026.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-outline-variant px-4 py-2 flex items-center gap-2 rounded hover:bg-surface-container-low transition-colors text-sm font-semibold" type="button">
            <span className="material-symbols-outlined text-[18px]">filter_list</span>
            Filtrer
          </button>
          <button className="bg-primary text-white px-4 py-2 flex items-center gap-2 rounded hover:bg-on-primary-fixed-variant transition-colors text-sm font-semibold" type="button">
            <span className="material-symbols-outlined text-[18px]">file_download</span>
            Exporter les données
          </button>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
        {KPI_CARDS.map((kpi) => (
          <div className={`${CARD_CLASSES} p-5`} key={kpi.label}>
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-secondary-container rounded">
                <span className="material-symbols-outlined text-primary-container">{kpi.icon}</span>
              </div>
              <span
                className={`px-2 py-1 rounded font-bold text-[11px] ${
                  kpi.trendUp ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
                }`}
              >
                {kpi.trend}
              </span>
            </div>
            <p className="text-secondary text-xs font-medium uppercase tracking-wider">{kpi.label}</p>
            <h3 className="font-headline-md text-2xl font-bold text-on-surface mt-1">{kpi.value}</h3>
            {kpi.progress !== undefined ? (
              <div className="mt-4 h-1 w-full bg-surface-container rounded-full overflow-hidden">
                <div className="bg-primary-container h-full" style={{ width: `${kpi.progress}%` }} />
              </div>
            ) : (
              <p className="text-secondary text-[11px] mt-2">{kpi.footer}</p>
            )}
          </div>
        ))}
      </section>

      {/* Bento : entonnoir + calendrier */}
      <section className="grid grid-cols-12 gap-gutter">
        <div className={`${CARD_CLASSES} col-span-12 lg:col-span-8 p-8`}>
          <div className="flex justify-between items-start mb-8">
            <div>
              <h4 className="font-headline-md text-lg font-bold text-primary">Entonnoir Prospects → Clients</h4>
              <p className="text-sm text-secondary">Efficacité de conversion à chaque étape</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-xs text-secondary">Prospect qualifié</span>
            </div>
          </div>

          <div className="flex flex-col items-center space-y-2 max-w-lg mx-auto">
            {FUNNEL_STEPS.map((step) => (
              <div
                className={`w-full h-16 flex items-center justify-center ${step.shade}`}
                key={step.label}
                style={{ clipPath: FUNNEL_CLIP, width: step.width }}
              >
                <span className={`text-sm font-bold ${step.textColor}`}>{step.label}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 mt-10 border-t border-outline-variant pt-6 text-center">
            {FUNNEL_STATS.map((stat) => (
              <div key={stat.label}>
                <p className="text-[11px] text-secondary uppercase font-semibold">{stat.label}</p>
                <p className="font-headline-md text-lg font-bold text-on-surface mt-1">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-primary-fixed/30 p-5 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-8">
            <div className="flex items-center gap-6">
              <div className="text-sm text-primary font-bold">Vélocité actuelle</div>
              <div className="h-2.5 w-40 sm:w-64 bg-surface-container-highest/50 rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[72%] rounded-full" />
              </div>
            </div>
            <div className="font-headline-md text-lg font-bold text-primary">+14% de croissance</div>
          </div>
        </div>

        <div className={`${CARD_CLASSES} col-span-12 lg:col-span-4 flex flex-col`}>
          <div className="p-5 border-b border-outline-variant flex justify-between items-center">
            <h4 className="font-headline-md text-lg font-bold text-primary">Calendrier Marketing</h4>
            <span className="material-symbols-outlined text-secondary">calendar_month</span>
          </div>
          <div className="p-4 flex-1 overflow-y-auto custom-scrollbar max-h-[380px] space-y-5">
            {MARKETING_EVENTS.map((event) => (
              <div className={`flex gap-3 ${event.faded ? 'opacity-50' : ''}`} key={event.title}>
                <div className="shrink-0 text-center w-11 py-2 bg-surface-container rounded border border-outline-variant">
                  <p className="text-[10px] text-secondary font-semibold">{event.month}</p>
                  <p className="font-headline-md text-lg leading-none text-primary">{event.day}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-bold text-on-surface">{event.title}</h5>
                  <p className="text-xs text-secondary">{event.description}</p>
                  {event.tag && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${event.tagClasses}`}>
                        {event.tag}
                      </span>
                      <span className="text-[10px] text-secondary flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">{event.timeIcon}</span>
                        {event.time}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <a
            className="p-4 w-full text-center bg-surface-container-high text-primary text-sm font-bold hover:bg-surface-container-highest transition-all border-t border-outline-variant"
            href="/calendrier-collaboratif"
          >
            Voir le calendrier complet
          </a>
        </div>
      </section>

      {/* Bento : sources + campagnes */}
      <section className="grid grid-cols-12 gap-gutter">
        <div className={`${CARD_CLASSES} col-span-12 lg:col-span-4 p-6`}>
          <h4 className="font-headline-md text-lg font-bold text-primary mb-6">Répartition des sources</h4>
          <div className="space-y-4">
            {SOURCE_DISTRIBUTION.map((source) => (
              <div className="space-y-1" key={source.label}>
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-on-surface">{source.label}</span>
                  <span className="font-bold text-on-surface">{source.value}%</span>
                </div>
                <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">
                  <div className={`h-full rounded-full ${source.barClasses}`} style={{ width: `${source.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`${CARD_CLASSES} col-span-12 lg:col-span-8 p-6 overflow-hidden`}>
          <h4 className="font-headline-md text-lg font-bold text-primary mb-6">Performance des campagnes</h4>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="pb-3 font-bold text-secondary text-[11px] uppercase tracking-wider">Campagne</th>
                  <th className="pb-3 font-bold text-secondary text-[11px] uppercase tracking-wider text-center">Statut</th>
                  <th className="pb-3 font-bold text-secondary text-[11px] uppercase tracking-wider text-right">Budget</th>
                  <th className="pb-3 font-bold text-secondary text-[11px] uppercase tracking-wider text-right">ROI</th>
                  <th className="pb-3 font-bold text-secondary text-[11px] uppercase tracking-wider text-right">Conv.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {CAMPAIGNS.map((campaign) => (
                  <tr className="hover:bg-surface-container-low transition-colors" key={campaign.name}>
                    <td className="py-4">
                      <p className="text-sm font-bold text-on-surface">{campaign.name}</p>
                      <p className="text-[10px] text-secondary">{campaign.channel}</p>
                    </td>
                    <td className="py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${STATUS_CLASSES[campaign.status]}`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="py-4 text-right text-sm text-on-surface">{campaign.budget}</td>
                    <td className={`py-4 text-right text-sm font-bold ${campaign.roiPositive ? 'text-green-600' : 'text-primary'}`}>
                      {campaign.roi}
                    </td>
                    <td className="py-4 text-right text-sm text-secondary">{campaign.conversion}</td>
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
