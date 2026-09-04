import { useAuth } from '../context/AuthContext';
import DashboardDgPage from './dg/DashboardDgPage';
import DashboardAdchPage from './DashboardAdchPage';
import DashboardCommercialPage from './ventes/DashboardCommercialPage';
import DashboardCdvPage from './ventes/DashboardCdvPage';
import DashboardCdmPage from './DashboardCdmPage';
import DashboardChargePartenariatPage from './DashboardChargePartenariatPage';
import DashboardGraphistePage from './DashboardGraphistePage';
import DashboardCdnPage from './DashboardCdnPage';
import DashboardRdwPage from './DashboardRdwPage';
import DashboardDeveloppeurPage from './DashboardDeveloppeurPage';
import DashboardVipPage from './DashboardVipPage';
import DashboardComptablePage from './DashboardComptablePage';

const CARD_CLASSES =
  'bg-surface-container-lowest rounded-lg shadow-sm border border-surface-variant hover:shadow-md hover:-translate-y-0.5 transition-all duration-200';

interface AgendaSlot {
  time: string;
  title: string;
  location: string;
  active: boolean;
  cardBg: string;
  cardBorder: string;
  cardHoverBg: string;
  titleClass: string;
}

const AGENDA_SLOTS: AgendaSlot[] = [
  {
    time: '09:00',
    title: "Réunion d'équipe",
    location: 'Salle de conférence A',
    active: true,
    cardBg: 'bg-primary-fixed/30',
    cardBorder: 'border-primary',
    cardHoverBg: 'group-hover:bg-primary-fixed/50',
    titleClass: 'text-on-surface',
  },
  {
    time: '11:00',
    title: 'Rendez-vous Client',
    location: 'Visioconférence / Zoom',
    active: false,
    cardBg: 'bg-secondary-container',
    cardBorder: 'border-outline-variant',
    cardHoverBg: 'group-hover:bg-secondary-fixed',
    titleClass: 'text-on-surface-variant',
  },
  {
    time: '13:00',
    title: 'Revue de Proposition',
    location: 'Suite Exécutive',
    active: true,
    cardBg: 'bg-error-container/20',
    cardBorder: 'border-primary',
    cardHoverBg: 'group-hover:bg-error-container/40',
    titleClass: 'text-on-surface',
  },
  {
    time: '15:00',
    title: 'Audit Interne',
    location: 'Pôle Finance',
    active: false,
    cardBg: 'bg-surface-variant/30',
    cardBorder: 'border-outline-variant',
    cardHoverBg: 'group-hover:bg-surface-variant/50',
    titleClass: 'text-on-surface-variant',
  },
];

interface PipelineStage {
  icon: string;
  label: string;
  state: 'done' | 'active' | 'pending';
}

const PIPELINE_STAGES: PipelineStage[] = [
  { icon: 'search', label: 'Prospection', state: 'done' },
  { icon: 'psychology', label: 'Qualification', state: 'done' },
  { icon: 'description', label: 'Proposition', state: 'active' },
  { icon: 'handshake', label: 'Négociation', state: 'pending' },
  { icon: 'rule', label: 'Validé', state: 'pending' },
];

interface Fiche {
  name: string;
  owner: string;
  progress: number;
}

const FICHES: Fiche[] = [
  { name: 'Projet Zenith', owner: 'E. Miller', progress: 75 },
  { name: 'Partenariat Nova', owner: 'D. Chen', progress: 25 },
];

interface PaymentSegment {
  label: string;
  value: number;
  barColor: string;
  labelColor: string;
  valueColor: string;
}

const PAYMENT_SEGMENTS: PaymentSegment[] = [
  { label: 'Payé', value: 60, barColor: 'bg-primary', labelColor: 'text-on-surface', valueColor: 'text-primary' },
  {
    label: 'Facturé',
    value: 25,
    barColor: 'bg-outline-variant',
    labelColor: 'text-on-surface-variant',
    valueColor: 'text-outline',
  },
  {
    label: 'En retard',
    value: 15,
    barColor: 'bg-secondary-container',
    labelColor: 'text-on-surface-variant',
    valueColor: 'text-outline',
  },
];

interface MetricBar {
  heightClass: string;
  colorClass: string;
}

interface PortfolioMetric {
  label: string;
  value: string;
  bars: MetricBar[];
}

const PORTFOLIO_METRICS: PortfolioMetric[] = [
  {
    label: 'Contacts Totaux',
    value: '4 812',
    bars: [
      { heightClass: 'h-1/2', colorClass: 'bg-primary-container' },
      { heightClass: 'h-3/4', colorClass: 'bg-primary-container' },
      { heightClass: 'h-full', colorClass: 'bg-primary shadow-sm' },
    ],
  },
  {
    label: 'Clients Actifs',
    value: '342',
    bars: [
      { heightClass: 'h-1/3', colorClass: 'bg-primary-container' },
      { heightClass: 'h-full', colorClass: 'bg-primary shadow-sm' },
      { heightClass: 'h-3/4', colorClass: 'bg-primary' },
    ],
  },
];

interface Rep {
  rank: string;
  name: string;
  quota: number;
  avatarUrl?: string;
  highlighted: boolean;
}

const REPS: Rep[] = [
  {
    rank: '01',
    name: 'Sarah Konnors',
    quota: 94,
    avatarUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBNJJibY60E4yo2btiS_rYfIQk5_hqEbyyTfwQEBOXJOE8I-S1is7VEoDtdHR_YqMmPxJOXRjKm6WrZB6Qput3GxFxNRpgnVbmx63eRHuJaIINNuTIXcLK6esOwzKzORTSbt-zz9mvqPeOgUdjg5vWH6VAnET5FL_eOw8CdHm9pOCY4iO6cgtXy-ID5eidBBSHKgJ0CySZPO88lINebnXqfm1J6K1THI8iOqg2sJOW3Ys7R3mDtEHx-JwA43AU519nVFOn0d1UtUg',
    highlighted: true,
  },
  { rank: '02', name: 'David Chen', quota: 82, highlighted: false },
  { rank: '03', name: 'Elena Miller', quota: 78, highlighted: false },
];

interface AuditEntry {
  icon: string;
  filled: boolean;
  title: string;
  description: string;
  time: string;
}

const AUDIT_ENTRIES: AuditEntry[] = [
  {
    icon: 'check_circle',
    filled: true,
    title: 'Dossier Validé',
    description: 'Alex Rivers a validé le Projet Zenith pour facturation.',
    time: 'il y a 2 min',
  },
  {
    icon: 'person_add',
    filled: false,
    title: 'Attribution de Prospect',
    description: 'Global Logistics Inc attribué à Sarah Konnors.',
    time: 'il y a 45 min',
  },
];

export default function DashboardPage() {
  const { user } = useAuth();

  if (user?.role === 'DG') {
    return <DashboardDgPage />;
  }

  if (user?.role === 'ADCH') {
    return <DashboardAdchPage />;
  }

  if (user?.role === 'COMMERCIAL') {
    return <DashboardCommercialPage />;
  }

  if (user?.role === 'CDV') {
    return <DashboardCdvPage />;
  }

  if (user?.role === 'CDM') {
    return <DashboardCdmPage />;
  }

  if (user?.role === 'CHARGE_PARTENARIAT') {
    return <DashboardChargePartenariatPage />;
  }

  if (user?.role === 'GRAPHISTE') {
    return <DashboardGraphistePage />;
  }

  if (user?.role === 'CDN') {
    return <DashboardCdnPage />;
  }

  if (user?.role === 'RDW') {
    return <DashboardRdwPage />;
  }

  if (user?.role === 'DEVELOPPEUR') {
    return <DashboardDeveloppeurPage />;
  }

  if (user?.role === 'VIP') {
    return <DashboardVipPage />;
  }

  if (user?.role === 'COMPTABLE_GENERAL' || user?.role === 'ASSISTANT_COMPTABLE') {
    return <DashboardComptablePage />;
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-gutter">
      {/* Agenda du jour */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-card-gap">
        <div className={`${CARD_CLASSES} lg:col-span-12 p-6`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div className="flex items-center gap-4">
              <h2 className="font-headline-md text-headline-md text-on-surface">Agenda du Jour</h2>
              <span className="text-[10px] font-bold text-primary bg-primary-fixed px-3 py-1 rounded-full">
                EN DIRECT • 14 MARS
              </span>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-error-container/20 rounded-lg border border-error/10">
                <span className="material-symbols-outlined text-error text-lg font-bold">verified</span>
                <span className="text-body-sm font-bold text-error">3 Validations en Attente</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-primary-container/20 rounded-lg border border-primary/10">
                <span className="material-symbols-outlined text-primary text-lg font-bold">timer</span>
                <span className="text-body-sm font-bold text-primary">7 Échéances Critiques</span>
              </div>
            </div>
          </div>

          <div className="relative overflow-x-auto no-scrollbar">
            <div className="flex min-w-[800px] justify-between items-start pb-4">
              {AGENDA_SLOTS.map((slot) => (
                <div key={slot.time} className="flex-1 flex flex-col items-center group cursor-pointer px-4">
                  <span className="text-label-md text-outline mb-4">{slot.time}</span>
                  <div className="w-full h-1 bg-outline-variant/30 relative mb-4">
                    <div
                      className={`absolute left-1/2 -translate-x-1/2 -top-1 w-3 h-3 rounded-full ring-4 ring-surface-container-lowest ${
                        slot.active ? 'bg-primary' : 'bg-outline-variant'
                      }`}
                    />
                  </div>
                  <div
                    className={`w-full p-3 rounded-lg border-l-4 transition-colors ${slot.cardBg} ${slot.cardBorder} ${slot.cardHoverBg}`}
                  >
                    <div className={`text-body-sm font-bold ${slot.titleClass}`}>{slot.title}</div>
                    <div className="text-[10px] text-outline uppercase tracking-wider">{slot.location}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-card-gap">
        <div className="lg:col-span-8 space-y-card-gap">
          {/* Pipeline commercial */}
          <div className={`${CARD_CLASSES} p-8`}>
            <h2 className="font-headline-md text-headline-md text-on-surface mb-10">Étapes du Pipeline Commercial</h2>
            <div className="relative flex justify-between items-center px-8 py-12">
              <div className="absolute top-1/2 left-8 right-8 h-[2px] bg-outline-variant/20 -translate-y-1/2 -z-10" />
              <div className="absolute top-1/2 left-8 w-1/2 h-[2px] bg-primary -translate-y-1/2 -z-10" />

              {PIPELINE_STAGES.map((stage) => (
                <div key={stage.label} className="relative flex flex-col items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      stage.state === 'pending'
                        ? 'bg-surface-container border border-outline-variant text-outline ring-4 ring-surface-container-lowest'
                        : stage.state === 'active'
                          ? 'bg-primary text-white shadow-md ring-4 ring-primary-container/30'
                          : 'bg-primary text-white shadow-sm ring-4 ring-surface-container-lowest'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">{stage.icon}</span>
                  </div>
                  <span
                    className={`absolute -bottom-8 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${
                      stage.state === 'pending'
                        ? 'text-outline'
                        : stage.state === 'active'
                          ? 'text-on-surface'
                          : 'text-primary'
                    }`}
                  >
                    {stage.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-primary-fixed/30 p-5 rounded-lg flex items-center justify-between mt-20">
              <div className="flex items-center gap-6">
                <div className="text-label-md text-primary font-bold">Vélocité Actuelle</div>
                <div className="h-2.5 w-64 bg-surface-container-highest/50 rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[72%] rounded-full shadow-sm" />
                </div>
              </div>
              <div className="font-headline-md text-primary">+14% de Croissance</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-card-gap">
            {/* Suivi des dossiers */}
            <div className={`${CARD_CLASSES} p-6`}>
              <h2 className="font-headline-md text-headline-md text-on-surface mb-6">Suivi des Dossiers</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-surface-container-low rounded-lg border-2 border-primary">
                  <div className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                      rule
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="text-body-md font-bold text-on-surface">Manager → Facturation</div>
                    <div className="text-label-md text-primary">Validation en cours</div>
                  </div>
                  <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                </div>
                <div className="flex items-center gap-4 p-4 bg-surface rounded-lg opacity-60 border border-outline-variant/10">
                  <div className="w-10 h-10 rounded-lg bg-surface-dim flex items-center justify-center text-outline">
                    <span className="material-symbols-outlined">receipt</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-body-md font-bold">Facturation → Exécution</div>
                    <div className="text-label-md text-outline">File vide</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fiches actives */}
            <div className={`${CARD_CLASSES} p-6`}>
              <h2 className="font-headline-md text-headline-md text-on-surface mb-6">Fiches Actives</h2>
              <div className="space-y-5">
                {FICHES.map((fiche) => (
                  <div key={fiche.name} className="group cursor-pointer">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-body-md font-bold text-on-surface group-hover:text-primary transition-colors">
                        {fiche.name}
                      </span>
                      <span className="text-label-md text-outline">{fiche.owner}</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-variant/30 rounded-full">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${fiche.progress}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-card-gap">
          {/* Facturation & Paiements */}
          <div className={`${CARD_CLASSES} p-6`}>
            <h2 className="font-headline-md text-headline-md text-on-surface mb-8">Facturation &amp; Paiements</h2>

            <div className="mb-6">
              <div className="flex justify-between items-center mb-6">
                <span className="text-label-md text-outline uppercase text-[10px] font-bold">
                  Répartition des Paiements
                </span>
                <span className="text-label-md text-primary font-bold text-[10px]">100% du Total</span>
              </div>
              <div className="space-y-4">
                {PAYMENT_SEGMENTS.map((segment) => (
                  <div key={segment.label} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className={segment.labelColor}>{segment.label}</span>
                      <span className={segment.valueColor}>{segment.value}%</span>
                    </div>
                    <div className="h-2 w-full bg-surface-variant/30 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${segment.barColor}`}
                        style={{ width: `${segment.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-outline-variant/10 grid grid-cols-2 gap-4">
              <div>
                <div className="text-label-md text-outline uppercase tracking-wider mb-1">ARR Total</div>
                <div className="text-headline-md text-on-surface">1,2 M€</div>
              </div>
              <div>
                <div className="text-label-md text-outline uppercase tracking-wider mb-1">Rétention</div>
                <div className="text-headline-md text-primary">94%</div>
              </div>
            </div>
          </div>

          {/* Indicateurs du portefeuille */}
          <div className={`${CARD_CLASSES} p-6`}>
            <h2 className="font-headline-md text-headline-md text-on-surface mb-6">Indicateurs du Portefeuille</h2>
            <div className="space-y-6">
              {PORTFOLIO_METRICS.map((metric) => (
                <div key={metric.label} className="flex justify-between items-center">
                  <div>
                    <div className="text-label-md text-outline uppercase text-[10px] mb-1">{metric.label}</div>
                    <div className="text-xl font-bold text-on-surface">{metric.value}</div>
                  </div>
                  <div className="flex items-end gap-1 h-8">
                    {metric.bars.map((bar, index) => (
                      <div key={index} className={`w-1.5 rounded-full ${bar.heightClass} ${bar.colorClass}`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-card-gap">
        {/* Performance de l'équipe */}
        <div className={`${CARD_CLASSES} lg:col-span-8 p-6`}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-headline-md text-headline-md text-on-surface">Performance de l'Équipe</h2>
            <button className="text-label-md text-primary hover:underline" type="button">
              Rapport Complet
            </button>
          </div>
          <div className="space-y-4">
            {REPS.map((rep) => (
              <div
                key={rep.rank}
                className={
                  rep.highlighted
                    ? 'grid grid-cols-12 gap-4 items-center bg-surface-container-low p-4 rounded-lg border-l-4 border-primary'
                    : 'grid grid-cols-12 gap-4 items-center bg-surface p-3 rounded-lg'
                }
              >
                <div
                  className={`col-span-1 font-label-md font-bold ${
                    rep.highlighted ? 'text-primary text-lg' : 'text-outline'
                  }`}
                >
                  {rep.rank}
                </div>
                <div className="col-span-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-surface-dim overflow-hidden">
                    {rep.avatarUrl && <img alt={rep.name} className="w-full h-full object-cover" src={rep.avatarUrl} />}
                  </div>
                  <span className={rep.highlighted ? 'font-body-md font-bold' : 'font-body-md'}>{rep.name}</span>
                </div>
                <div className="col-span-5">
                  <div className="h-2 w-full bg-surface-variant/30 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${rep.highlighted ? 'bg-primary' : 'bg-primary-container'}`}
                      style={{ width: `${rep.quota}%` }}
                    />
                  </div>
                </div>
                <div
                  className={`col-span-2 text-right font-label-md ${
                    rep.highlighted ? 'text-on-surface' : 'text-outline'
                  }`}
                >
                  {rep.quota}% du Quota
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Journal d'audit */}
        <div className={`${CARD_CLASSES} lg:col-span-4 p-6`}>
          <div className="flex justify-between items-center mb-8">
            <h2 className="font-headline-md text-headline-md text-on-surface">Journal d'Audit</h2>
            <button className="text-label-md text-primary font-bold hover:underline text-[10px]" type="button">
              Voir Tout
            </button>
          </div>
          <div className="space-y-6">
            {AUDIT_ENTRIES.map((entry) => (
              <div key={entry.title} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-primary shrink-0">
                  <span
                    className="material-symbols-outlined text-sm"
                    style={entry.filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {entry.icon}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="text-body-sm font-bold text-on-surface mb-1 leading-tight">{entry.title}</div>
                  <p className="text-[11px] text-on-surface-variant line-clamp-2">{entry.description}</p>
                  <span className="text-[9px] text-outline uppercase font-bold">{entry.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
