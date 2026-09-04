import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ============================================================================
// DASHBOARD CHEFFE DU DÉPARTEMENT VENTES (CDV) — ÉDITION ÉPURÉE & GRAPHIQUE
// Design moderne, aéré, centré sur la clarté visuelle, de superbes graphiques
// SVG interactifs, des timelines fluides et un pilotage commercial complet.
// ============================================================================

type PeriodFilter = 'MONTH' | 'QUARTER' | 'YEAR';
type ActiveTab = 'OVERVIEW' | 'PIPELINE' | 'TEAM' | 'VALIDATIONS';

// Aligné sur `Event.EventType` côté backend (CALL / MEETING / LIVRAISON) —
// un `Event` n'a que ces 3 natures, contrairement aux catégories libres
// utilisées dans une première version de ce template.
type EventType = 'CALL' | 'MEETING' | 'LIVRAISON';

const EVENT_TYPE_META: Record<EventType, { label: string; icon: string; badge: string; iconBg: string }> = {
  CALL: {
    label: 'Appel',
    icon: 'call',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    iconBg: 'bg-blue-500',
  },
  MEETING: {
    label: 'Réunion',
    icon: 'groups',
    badge: 'bg-primary/10 text-primary border-primary/20',
    iconBg: 'bg-primary',
  },
  LIVRAISON: {
    label: 'Livraison',
    icon: 'local_shipping',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconBg: 'bg-emerald-500',
  },
};

export default function DashboardCdvTemplatePage() {
  const navigate = useNavigate();

  // États de navigation & filtres
  const [period, setPeriod] = useState<PeriodFilter>('MONTH');
  // Onglets retirés temporairement (voir plus bas) — activeTab reste figé sur
  // 'OVERVIEW', ce qui suffit à garder toutes les sections visibles puisque
  // chacune l'inclut dans sa condition d'affichage.
  const [activeTab] = useState<ActiveTab>('OVERVIEW');
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
  const [selectedRepId, setSelectedRepId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // --------------------------------------------------------------------------
  // DONNÉES STATIQUES — Graphique d'évolution du CA (Mensuel & Objectifs)
  // --------------------------------------------------------------------------
  const revenueChartData = [
    { month: 'Jan', revenue: 32.5, target: 40, deals: 8 },
    { month: 'Fév', revenue: 38.0, target: 42, deals: 10 },
    { month: 'Mar', revenue: 45.2, target: 45, deals: 12 },
    { month: 'Avr', revenue: 41.0, target: 48, deals: 9 },
    { month: 'Mai', revenue: 52.8, target: 50, deals: 14 },
    { month: 'Juin', revenue: 49.0, target: 52, deals: 11 },
    { month: 'Juil', revenue: 47.5, target: 55, deals: 13 },
    { month: 'Août', revenue: 54.8, target: 60, deals: 16, current: true },
    { month: 'Sep', revenue: 0, target: 65, projected: 62.0 },
    { month: 'Oct', revenue: 0, target: 65, projected: 68.5 },
  ];

  // --------------------------------------------------------------------------
  // DONNÉES STATIQUES — Équipe Commerciale & Quotas
  // --------------------------------------------------------------------------
  const teamMembers = [
    {
      id: 1,
      name: 'Rose Marie',
      initials: 'RM',
      role: 'Grands Comptes',
      avatarBg: 'bg-primary text-white',
      photoUrl: 'https://i.pravatar.cc/150?img=47',
      revenue: 21.4,
      target: 20.0,
      deals: 5,
      conversion: 42,
      progress: 107,
      status: 'En rdv client',
      statusColor: 'bg-emerald-500',
    },
    {
      id: 2,
      name: 'Bulma Brief',
      initials: 'BB',
      role: 'Senior Tech & Media',
      avatarBg: 'bg-stone-800 text-white',
      photoUrl: 'https://i.pravatar.cc/150?img=12',
      revenue: 16.8,
      target: 18.0,
      deals: 4,
      conversion: 38,
      progress: 93,
      status: 'Closing en cours',
      statusColor: 'bg-amber-500',
    },
    {
      id: 3,
      name: 'Amina Test',
      initials: 'AT',
      role: 'PME & Institutionnels',
      avatarBg: 'bg-slate-700 text-white',
      photoUrl: 'https://i.pravatar.cc/150?img=32',
      revenue: 11.2,
      target: 14.0,
      deals: 3,
      conversion: 31,
      progress: 80,
      status: 'Au bureau',
      statusColor: 'bg-blue-500',
    },
    {
      id: 4,
      name: 'Marc Kouadio',
      initials: 'MK',
      role: 'Junior Commercial',
      avatarBg: 'bg-stone-600 text-white',
      photoUrl: 'https://i.pravatar.cc/150?img=51',
      revenue: 5.4,
      target: 8.0,
      deals: 2,
      conversion: 25,
      progress: 68,
      status: 'Prospection',
      statusColor: 'bg-blue-400',
    },
  ];

  // --------------------------------------------------------------------------
  // DONNÉES STATIQUES — Timeline Épurée du Pipeline Commercial (Icônes & Stats)
  // --------------------------------------------------------------------------
  const pipelineTimeline = [
    {
      step: 1,
      name: 'Prospection & Cadrage',
      icon: 'person_search',
      count: 16,
      amount: '58,0 M FCFA',
      color: 'bg-red-50 text-primary border-primary/20',
    },
    {
      step: 2,
      name: 'Signature & Acompte',
      icon: 'edit_document',
      count: 11,
      amount: '44,5 M FCFA',
      color: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      step: 3,
      name: 'Production',
      icon: 'design_services',
      count: 9,
      amount: '39,2 M FCFA',
      color: 'bg-violet-50 text-violet-700 border-violet-200',
    },
    {
      step: 4,
      name: 'Validation Client',
      icon: 'rate_review',
      count: 6,
      amount: '27,2 M FCFA',
      color: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      step: 5,
      name: 'Livraison & Facturation',
      icon: 'local_shipping',
      count: 9,
      amount: '39,5 M FCFA',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
  ];

  // --------------------------------------------------------------------------
  // DONNÉES STATIQUES — Timeline Chronologique Agenda CDV
  // --------------------------------------------------------------------------
  const scheduleTimeline: {
    time: string;
    eventType: EventType;
    title: string;
    location: string;
    contact: string;
    highlight: boolean;
  }[] = [
    {
      time: '09:00',
      eventType: 'MEETING',
      title: 'Comité de Direction Ventes & Quotas',
      location: 'Salle A & Teams',
      contact: 'Équipe CDV',
      highlight: true,
    },
    {
      time: '11:30',
      eventType: 'CALL',
      title: 'Point budget — Airtel Niger (Campagne 4G+)',
      location: 'Visio',
      contact: 'Airtel Niger — Dir. Marketing',
      highlight: false,
    },
    {
      time: '14:30',
      eventType: 'MEETING',
      title: 'Revue de cadrage 1:1 avec Bulma Brief',
      location: 'Bureau CDV',
      contact: 'Bulma Brief',
      highlight: false,
    },
    {
      time: '16:00',
      eventType: 'LIVRAISON',
      title: 'Livraison visuels campagne — Banque Atlantique',
      location: 'Agence Iman',
      contact: 'Banque Atlantique',
      highlight: false,
    },
  ];

  // --------------------------------------------------------------------------
  // DONNÉES STATIQUES — Validations / Arbitrages en attente
  // --------------------------------------------------------------------------
  // Aligné sur `Document.DocumentType` / `Document.Status` côté backend — une
  // validation en attente est un `Document` avec status A_VALIDER, comme
  // affiché dans le vrai Centre de validation (`CentreValidationPage.tsx`),
  // pas une « demande » libre avec montant/impact inventés.
  type DocumentType = 'DEVIS' | 'FICHE_BAT' | 'CONTRAT' | 'CONVENTION' | 'VISUEL';
  type DocumentStatus = 'A_VALIDER' | 'VALIDE' | 'REJETE';

  const [validations] = useState<
    {
      id: string;
      documentType: DocumentType;
      label: string;
      context: string;
      uploadedBy: string;
      timeAgo: string;
      status: DocumentStatus;
    }[]
  >([
    {
      id: 'VAL-1',
      documentType: 'DEVIS',
      label: 'Devis — Campagne Institutionnelle 360°',
      context: 'Airtel Niger',
      uploadedBy: 'Rose Marie',
      timeAgo: 'Il y a 20 min',
      status: 'A_VALIDER',
    },
    {
      id: 'VAL-2',
      documentType: 'DEVIS',
      label: 'Devis — Branding & Signalétique 8 Agences',
      context: 'Banque Atlantique',
      uploadedBy: 'Bulma Brief',
      timeAgo: 'Il y a 1h',
      status: 'A_VALIDER',
    },
    {
      id: 'VAL-3',
      documentType: 'FICHE_BAT',
      label: 'Fiche BAT — Pavillon Minier International',
      context: 'Société des Mines du Liptako',
      uploadedBy: 'Amina Test',
      timeAgo: 'Hier 16:30',
      status: 'A_VALIDER',
    },
  ]);

  const DOCUMENT_TYPE_META: Record<DocumentType, { label: string; icon: string }> = {
    DEVIS: { label: 'Devis', icon: 'request_quote' },
    FICHE_BAT: { label: 'Fiche BAT', icon: 'fact_check' },
    CONTRAT: { label: 'Contrat', icon: 'description' },
    CONVENTION: { label: 'Convention', icon: 'handshake' },
    VISUEL: { label: 'Visuel', icon: 'image' },
  };

  const DOCUMENT_STATUS_META: Record<DocumentStatus, { label: string; badge: string }> = {
    A_VALIDER: { label: 'À valider', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
    VALIDE: { label: 'Validé', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    REJETE: { label: 'Rejeté', badge: 'bg-red-50 text-red-700 border-red-200' },
  };

  // --------------------------------------------------------------------------
  // DONNÉES DU DONUT (MIX DES VENTES)
  // --------------------------------------------------------------------------
  const salesMix = [
    { label: 'Branding & Identité', percent: 38, value: '20,8 M', color: '#680200' },
    { label: 'Média & Digital', percent: 32, value: '17,5 M', color: '#8b1a0e' },
    { label: 'Événementiel VIP', percent: 20, value: '11,0 M', color: '#b91c1c' },
    { label: 'Conseil & Stratégie', percent: 10, value: '5,5 M', color: '#cbd5e1' },
  ];

  return (
    <div className="max-w-[1480px] mx-auto space-y-6 pb-16 text-slate-800">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs font-medium">
          <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
          {toastMessage}
        </div>
      )}

      {/* ==================================================================== */}
      {/* EN-TÊTE ÉPURÉ & MODERNE                                              */}
      {/* ==================================================================== */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-headline-md text-2xl font-extrabold text-slate-900 tracking-tight">
              Tableau de Bord Commercial
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary">
              CDV · Division Ventes
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            Pilotage synthétique du chiffre d'affaires, de la progression de l'équipe et du flux commercial.
          </p>
        </div>

        {/* Filtre temporel & actions épurées */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === 'MONTH' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
              onClick={() => setPeriod('MONTH')}
              type="button"
            >
              Août 2026
            </button>
            <button
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === 'QUARTER' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
              onClick={() => setPeriod('QUARTER')}
              type="button"
            >
              Trimestre Q3
            </button>
            <button
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === 'YEAR' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
              onClick={() => setPeriod('YEAR')}
              type="button"
            >
              Année 2026
            </button>
          </div>

          <button
            className="px-3.5 py-2 bg-primary hover:bg-on-primary-fixed-variant text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
            onClick={() => navigate('/opportunites/nouvelle')}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Nouvelle Opportunité
          </button>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* TABS DE NAVIGATION DOUX — retirés temporairement (toutes les          */}
      {/* sections restent affichées, chacune gardant `activeTab === 'OVERVIEW'` */}
      {/* dans sa condition, et `activeTab` ne change plus jamais de sa valeur  */}
      {/* initiale 'OVERVIEW').                                                */}
      {/* ==================================================================== */}
      {/* <nav className="flex items-center gap-2 border-b border-slate-200 pb-1 text-xs font-semibold">
        <button
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === 'OVERVIEW'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          onClick={() => setActiveTab('OVERVIEW')}
          type="button"
        >
          Vue d'ensemble & Graphiques
        </button>
        <button
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === 'PIPELINE'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          onClick={() => setActiveTab('PIPELINE')}
          type="button"
        >
          Timeline du Pipeline ({pipelineTimeline.reduce((acc, p) => acc + p.count, 0)})
        </button>
        <button
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === 'TEAM'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          onClick={() => setActiveTab('TEAM')}
          type="button"
        >
          Performance Équipe ({teamMembers.length})
        </button>
        <button
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === 'VALIDATIONS'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          onClick={() => setActiveTab('VALIDATIONS')}
          type="button"
        >
          Arbitrages en attente
          <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-bold">
            {validations.filter((v) => v.status === 'PENDING').length}
          </span>
        </button>
      </nav> */}

      {/* ==================================================================== */}
      {/* 4 INDICATEURS CLÉS ÉPURÉS                                            */}
      {/* ==================================================================== */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1 : CA du mois */}
        <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium mb-1">
            <span>CA Signé (Août)</span>
            <span className="text-emerald-600 font-semibold bg-emerald-100/70 px-1.5 py-0.5 rounded-full text-[10px]">
              +14.2%
            </span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 tracking-tight">
            54,8 M <span className="text-xs font-normal text-slate-400">FCFA</span>
          </div>
          <div className="mt-2 pt-2 border-t border-emerald-100 flex items-center justify-between text-[10px] text-slate-500">
            <span>Cible : 60,0 M</span>
            <span className="font-bold text-primary">91.3%</span>
          </div>
        </div>

        {/* KPI 2 : Pipeline Global */}
        <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium mb-1">
            <span>Pipeline Actif</span>
            <span className="text-blue-600 font-semibold bg-blue-100/70 px-1.5 py-0.5 rounded-full text-[10px]">
              28 opp.
            </span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 tracking-tight">
            142,5 M <span className="text-xs font-normal text-slate-400">FCFA</span>
          </div>
          <div className="mt-2 pt-2 border-t border-blue-100 flex items-center justify-between text-[10px] text-slate-500">
            <span>Closing sous 30j</span>
            <span className="font-bold text-slate-800">48,0 M</span>
          </div>
        </div>

        {/* KPI 3 : Taux de conversion */}
        <div className="bg-violet-50/60 p-3.5 rounded-xl border border-violet-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium mb-1">
            <span>Taux de Transformation</span>
            <span className="text-violet-600 font-semibold bg-violet-100/70 px-1.5 py-0.5 rounded-full text-[10px]">
              +4.2 pts
            </span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 tracking-tight">
            36.8%
          </div>
          <div className="mt-2 pt-2 border-t border-violet-100 flex items-center justify-between text-[10px] text-slate-500">
            <span>18 / 49 leads</span>
            <span className="font-bold text-slate-800">Cible : 30%</span>
          </div>
        </div>

        {/* KPI 4 : Cycle moyen */}
        <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium mb-1">
            <span>Vélocité & Panier Moyen</span>
            <span className="text-amber-600 font-semibold bg-amber-100/70 px-1.5 py-0.5 rounded-full text-[10px]">
              -3.5 j
            </span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 tracking-tight">
            4,56 M <span className="text-xs font-normal text-slate-400">FCFA</span>
          </div>
          <div className="mt-2 pt-2 border-t border-amber-100 flex items-center justify-between text-[10px] text-slate-500">
            <span>Cycle moyen</span>
            <span className="font-bold text-slate-800">19 jours</span>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* LIGNE FINE DU PIPELINE — repère rapide avant l'agenda/validations     */}
      {/* ==================================================================== */}
      {(activeTab === 'OVERVIEW' || activeTab === 'PIPELINE') && (
        <section className="bg-white px-5 py-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-headline-md text-sm font-bold text-slate-900">Pipeline Commercial</h2>
            <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
              208,4 M FCFA
            </span>
          </div>

          <div className="relative flex items-start justify-between">
            <div className="absolute left-[4%] right-[4%] top-[18px] h-px bg-slate-200" />
            {pipelineTimeline.map((stage) => (
              <div className="relative z-10 flex flex-col items-center text-center gap-1.5 px-1 flex-1" key={stage.step}>
                <span className={`w-9 h-9 rounded-full border flex items-center justify-center ${stage.color}`}>
                  <span className="material-symbols-outlined text-[19px]">{stage.icon}</span>
                </span>
                <span className="text-[11px] font-bold text-slate-800 leading-tight">{stage.name}</span>
                <span className="text-[10px] text-slate-400">
                  {stage.count} dossiers · {stage.amount}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ==================================================================== */}
      {/* PRIORITÉ DU JOUR : AGENDA & VALIDATIONS EN ATTENTE, CÔTE À CÔTE       */}
      {/* ==================================================================== */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* COLONNE 1 : AGENDA STRATÉGIQUE DU JOUR + MIX DES VENTES (5 COLS) */}
        {(activeTab === 'OVERVIEW' || activeTab === 'PIPELINE') && (
          <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-headline-md text-base font-bold text-slate-900">
                  Agenda & Comités CDV
                </h2>
                <p className="text-slate-400 text-xs">Aujourd'hui · 27 Août 2026</p>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                4 événements
              </span>
            </div>

            {/* Timeline compacte à icônes de type d'événement (Appel / Réunion / Livraison) */}
            <div>
              {scheduleTimeline.map((item, idx) => {
                const meta = EVENT_TYPE_META[item.eventType];
                const isLast = idx === scheduleTimeline.length - 1;

                return (
                  <div className="relative flex gap-3" key={idx}>
                    {/* Icône du type d'événement + ligne connectrice */}
                    <div className="flex flex-col items-center shrink-0">
                      <span
                        className={`relative w-8 h-8 rounded-full flex items-center justify-center ${meta.iconBg} ${
                          item.highlight ? 'ring-4 ring-primary/20' : ''
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px] text-white">{meta.icon}</span>
                      </span>
                      {!isLast && <span className="w-0.5 flex-1 min-h-[1.75rem] bg-slate-200 my-1" />}
                    </div>

                    {/* Contenu de l'événement */}
                    <div className={`flex-1 min-w-0 ${isLast ? 'pb-0' : 'pb-4'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 font-label-md">{item.time}</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${meta.badge}`}>
                          {meta.label}
                        </span>
                      </div>

                      <h3 className="font-bold text-xs text-slate-800 mt-1 leading-snug">{item.title}</h3>
                      <p className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5 truncate">
                        {item.contact} ·
                        <span className="material-symbols-outlined text-[13px] text-primary shrink-0">location_on</span>
                        {item.location}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors text-center"
              onClick={() => navigate('/calendrier-collaboratif')}
              type="button"
            >
              Voir l'agenda complet de l'équipe →
            </button>
          </div>

          {/* Répartition du Mix des Ventes (Donut & Breakdown), juste sous l'agenda */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="font-headline-md text-base font-bold text-slate-900">
                Mix des Prestations Ventes
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Ventilation du chiffre d'affaires par pôle d'activité
              </p>
            </div>

            {/* Donut SVG minimaliste */}
            <div className="my-4 flex items-center justify-center relative">
              <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 100 100">
                {/* Branding : 38% */}
                <circle
                  cx="50"
                  cy="50"
                  fill="transparent"
                  r="38"
                  stroke="#680200"
                  strokeDasharray="238.7"
                  strokeDashoffset="0"
                  strokeWidth="14"
                />
                {/* Média : 32% */}
                <circle
                  cx="50"
                  cy="50"
                  fill="transparent"
                  r="38"
                  stroke="#8b1a0e"
                  strokeDasharray="238.7"
                  strokeDashoffset="90.7"
                  strokeWidth="14"
                />
                {/* Événementiel : 20% */}
                <circle
                  cx="50"
                  cy="50"
                  fill="transparent"
                  r="38"
                  stroke="#b91c1c"
                  strokeDasharray="238.7"
                  strokeDashoffset="167.1"
                  strokeWidth="14"
                />
                {/* Conseil : 10% */}
                <circle
                  cx="50"
                  cy="50"
                  fill="transparent"
                  r="38"
                  stroke="#cbd5e1"
                  strokeDasharray="238.7"
                  strokeDashoffset="214.8"
                  strokeWidth="14"
                />
              </svg>

              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Total</span>
                <span className="text-base font-extrabold text-slate-900">54,8 M</span>
              </div>
            </div>

            {/* Légende épurée */}
            <div className="space-y-2">
              {salesMix.map((item) => (
                <div className="flex items-center justify-between text-xs" key={item.label}>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-700 font-medium">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[11px]">{item.value} FCFA</span>
                    <span className="font-bold text-slate-900">{item.percent}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </div>
        )}

        {/* COLONNE 2 : APERÇU CA (COMPACT) + CENTRE DE VALIDATION CDV (7 COLS) */}
        {(activeTab === 'OVERVIEW' || activeTab === 'VALIDATIONS') && (
          <div className="lg:col-span-7 flex flex-col gap-5">
            {/* Aperçu compact : Trajectoire du CA & Objectifs, aligné en largeur avec le Centre de Validation */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div>
                    <h2 className="font-headline-md text-sm font-bold text-slate-900">
                      Trajectoire du Chiffre d'Affaires & Objectifs
                    </h2>
                    <p className="text-slate-400 text-[11px]">Réalisé vs objectif, en Millions FCFA</p>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] shrink-0">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-slate-600 font-medium">Réalisé</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-0.5 bg-slate-400 border-t border-dashed border-slate-400" />
                      <span className="text-slate-600 font-medium">Objectif</span>
                    </span>
                  </div>
                </div>

                {/* Visualisation SVG compacte */}
                <div className="relative w-full h-40">
                  <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 600 200">
                    <defs>
                      <linearGradient id="primaryAreaGradCompact" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#680200" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="#680200" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    <line stroke="#f1f5f9" strokeWidth="1" x1="0" x2="600" y1="40" />
                    <line stroke="#f1f5f9" strokeWidth="1" x1="0" x2="600" y1="90" />
                    <line stroke="#f1f5f9" strokeWidth="1" x1="0" x2="600" y1="140" />
                    <line stroke="#f1f5f9" strokeWidth="1" x1="0" x2="600" y1="190" />

                    <path
                      d="M 20 120 L 80 115 L 140 105 L 200 98 L 260 92 L 320 86 L 380 78 L 440 68 L 500 55 L 560 55"
                      fill="none"
                      stroke="#94a3b8"
                      strokeDasharray="4 4"
                      strokeWidth="2"
                    />

                    <path
                      d="M 20 135 L 80 124 L 140 110 L 200 118 L 260 94 L 320 102 L 380 105 L 440 90 L 440 190 L 20 190 Z"
                      fill="url(#primaryAreaGradCompact)"
                    />

                    <path
                      d="M 20 135 L 80 124 L 140 110 L 200 118 L 260 94 L 320 102 L 380 105 L 440 90"
                      fill="none"
                      stroke="#680200"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="3.5"
                    />

                    <path
                      d="M 440 90 L 500 75 L 560 62"
                      fill="none"
                      stroke="#680200"
                      strokeDasharray="3 3"
                      strokeOpacity="0.5"
                      strokeWidth="2"
                    />

                    {revenueChartData.map((d, index) => {
                      const x = 20 + index * 60;
                      const y = d.revenue > 0 ? 200 - d.revenue * 2.0 : 200 - (d.projected ?? 0) * 2.0;
                      const isCurrent = d.current;
                      const isHovered = hoveredMonth === index;

                      return (
                        <g
                          className="cursor-pointer"
                          key={d.month}
                          onMouseEnter={() => setHoveredMonth(index)}
                          onMouseLeave={() => setHoveredMonth(null)}
                        >
                          {isHovered && (
                            <line stroke="#cbd5e1" strokeDasharray="2 2" strokeWidth="1" x1={x} x2={x} y1="0" y2="190" />
                          )}

                          {d.revenue > 0 && (
                            <circle
                              className="transition-all duration-200"
                              cx={x}
                              cy={y}
                              fill={isCurrent ? '#680200' : '#ffffff'}
                              r={isHovered ? 5 : isCurrent ? 4 : 3}
                              stroke="#680200"
                              strokeWidth={isCurrent ? 2.5 : 1.5}
                            />
                          )}

                          <text
                            className={`text-[10px] font-semibold transition-colors ${
                              isCurrent ? 'fill-primary font-bold' : 'fill-slate-400'
                            }`}
                            textAnchor="middle"
                            x={x}
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
                      <p className="font-bold text-slate-200">{revenueChartData[hoveredMonth].month} 2026</p>
                      <p className="text-emerald-400 font-semibold">
                        {revenueChartData[hoveredMonth].revenue > 0 ? `${revenueChartData[hoveredMonth].revenue} M FCFA` : 'En cours'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                  <span>
                    Moyenne mensuelle : <strong className="text-slate-800">45,1 M FCFA</strong>
                  </span>
                  <span>
                    Projection annuelle : <strong className="text-slate-900">580 M FCFA</strong>
                  </span>
                </div>
              </div>

            {/* Performance de l'équipe, en classement, juste au-dessus du Centre de Validation */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-headline-md text-sm font-bold text-slate-900">Performance de l'Équipe</h2>
                  <p className="text-slate-400 text-[11px]">Classement par CA réalisé vs objectif</p>
                </div>
                <button
                  className="text-xs font-semibold text-primary hover:underline shrink-0"
                  onClick={() => showToast('Ouverture du rapport individuel.')}
                  type="button"
                >
                  Rapport →
                </button>
              </div>

              <div className="space-y-1">
                {[...teamMembers]
                  .sort((a, b) => b.revenue - a.revenue)
                  .map((rep, idx) => {
                    const isSelected = selectedRepId === rep.id;
                    const rank = idx + 1;
                    const rankBadge =
                      rank === 1
                        ? 'bg-amber-100 text-amber-700'
                        : rank === 2
                        ? 'bg-slate-200 text-slate-600'
                        : rank === 3
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-slate-50 text-slate-400';

                    return (
                      <div
                        className={`flex items-center gap-3 p-2 rounded-xl transition-colors cursor-pointer ${
                          isSelected ? 'bg-slate-50' : 'hover:bg-slate-50'
                        }`}
                        key={rep.id}
                        onClick={() => setSelectedRepId(isSelected ? null : rep.id)}
                        role="button"
                        tabIndex={0}
                      >
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${rankBadge}`}>
                          {rank}
                        </span>
                        <div
                          className={`w-8 h-8 rounded-full ${rep.avatarBg} flex items-center justify-center font-bold text-[11px] shrink-0 overflow-hidden`}
                        >
                          <img alt={rep.name} className="w-full h-full object-cover" src={rep.photoUrl} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-900 truncate">{rep.name}</span>
                            <span className="text-xs font-extrabold text-slate-900 shrink-0">
                              {rep.revenue} M <span className="text-slate-400 font-normal">/ {rep.target} M</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  rep.progress >= 100 ? 'bg-emerald-600' : rep.progress >= 80 ? 'bg-primary' : 'bg-amber-500'
                                }`}
                                style={{ width: `${Math.min(100, rep.progress)}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 shrink-0 w-8 text-right">{rep.progress}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-headline-md text-base font-bold text-slate-900">
                    Centre de Validation
                  </h2>
                  <span className="text-xs font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                    {validations.filter((v) => v.status === 'A_VALIDER').length} en attente
                  </span>
                </div>
                <p className="text-slate-400 text-xs mt-0.5">
                  Devis, fiches BAT et contrats soumis par l'équipe, avant diffusion
                </p>
              </div>

              <button
                className="text-xs font-semibold text-primary hover:underline"
                onClick={() => navigate('/centre-validation')}
                type="button"
              >
                Voir tout →
              </button>
            </div>

            <div className="space-y-2 pt-2">
              {validations.map((val) => {
                const typeMeta = DOCUMENT_TYPE_META[val.documentType];
                return (
                  <div
                    className={`p-3 rounded-xl border transition-all flex items-center gap-3 ${
                      val.status === 'VALIDE'
                        ? 'bg-emerald-50/50 border-emerald-200 opacity-80'
                        : val.status === 'REJETE'
                        ? 'bg-red-50/50 border-red-200 opacity-60'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                    }`}
                    key={val.id}
                  >
                    <span className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[18px] text-primary">{typeMeta.icon}</span>
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-xs text-slate-900 leading-snug truncate">{val.label}</h3>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${DOCUMENT_STATUS_META[val.status].badge}`}>
                          {DOCUMENT_STATUS_META[val.status].label}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {typeMeta.label} · {val.context} · Soumis par {val.uploadedBy} · {val.timeAgo}
                      </p>
                    </div>

                    {/* Action */}
                    <button
                      className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary border border-primary/20 hover:bg-primary/5 transition-colors"
                      onClick={() => navigate('/centre-validation')}
                      type="button"
                    >
                      Voir
                    </button>
                  </div>
                );
              })}
            </div>
            </div>
          </div>
        )}
      </section>

    </div>
  );
}
