import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ============================================================================
// DASHBOARD DIRECTION GÉNÉRALE (DG) — VUE GLOBALE DE L'AGENCE
// Recentré sur l'essentiel pour un DG : performance de chaque division,
// agenda stratégique, tâches du jour et validations en attente — pas de
// graphique décoratif superflu. Miroir du vrai `dg/DashboardDgPage.tsx`.
// ============================================================================

// Aligné sur `Event.EventType` côté backend (CALL / MEETING / LIVRAISON).
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

export default function DashboardDgTemplatePage() {
  const navigate = useNavigate();

  const [selectedDivisionId, setSelectedDivisionId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // --------------------------------------------------------------------------
  // DONNÉES STATIQUES — Performance par Division (les 5 divisions de l'agence,
  // alignées sur `DIVISION_CHIEF_ROLES` côté backend : Ventes, Marketing,
  // Numérique, Visibilité/Infrastructure & Production, Comptabilité).
  // --------------------------------------------------------------------------
  const divisionPerformance = [
    {
      id: 1,
      name: 'Ventes',
      chef: 'Aïcha Moussa',
      chefPhoto: 'https://i.pravatar.cc/150?img=47',
      icon: 'trending_up',
      metricLabel: 'CA réalisé',
      realised: 54.8,
      target: 60,
      unit: 'M FCFA',
      progress: 91,
      projects: 28,
    },
    {
      id: 2,
      name: 'Marketing',
      chef: 'Ibrahim Touré',
      chefPhoto: 'https://i.pravatar.cc/150?img=13',
      icon: 'campaign',
      metricLabel: 'CA réalisé',
      realised: 38.2,
      target: 45,
      unit: 'M FCFA',
      progress: 85,
      projects: 14,
    },
    {
      id: 3,
      name: 'Numérique',
      chef: 'Sarah Hassane',
      chefPhoto: 'https://i.pravatar.cc/150?img=33',
      icon: 'code',
      metricLabel: 'CA réalisé',
      realised: 22.4,
      target: 25,
      unit: 'M FCFA',
      progress: 90,
      projects: 9,
    },
    {
      id: 4,
      name: 'Visibilité, Infrastructure & Production',
      chef: 'Moussa Idi',
      chefPhoto: 'https://i.pravatar.cc/150?img=52',
      icon: 'construction',
      metricLabel: 'CA réalisé',
      realised: 31.6,
      target: 35,
      unit: 'M FCFA',
      progress: 90,
      projects: 11,
    },
    {
      id: 5,
      name: 'Comptabilité',
      chef: 'Fatouma Boubacar',
      chefPhoto: 'https://i.pravatar.cc/150?img=44',
      icon: 'account_balance',
      metricLabel: 'Créances recouvrées',
      realised: 18.4,
      target: 20,
      unit: 'M FCFA',
      progress: 92,
      projects: 6,
    },
  ];

  // --------------------------------------------------------------------------
  // DONNÉES STATIQUES — Agenda Stratégique de la Direction
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
      title: 'Comité de Direction Hebdomadaire',
      location: 'Salle de Direction',
      contact: 'Chefs de Division',
      highlight: true,
    },
    {
      time: '11:00',
      eventType: 'CALL',
      title: 'Point budget Q3 — Investisseur',
      location: 'Visio',
      contact: 'Groupe SIFA Invest',
      highlight: false,
    },
    {
      time: '14:00',
      eventType: 'MEETING',
      title: 'Revue stratégique — Division Numérique',
      location: 'Bureau DG',
      contact: 'Sarah Hassane (CDN)',
      highlight: false,
    },
    {
      time: '16:30',
      eventType: 'LIVRAISON',
      title: 'Signature contrat-cadre',
      location: 'Cabinet ministériel',
      contact: 'Ministère du Plan',
      highlight: false,
    },
  ];

  // --------------------------------------------------------------------------
  // DONNÉES STATIQUES — Validations à fort enjeu (Contrats & Conventions)
  // --------------------------------------------------------------------------
  type DocumentType = 'CONTRAT' | 'CONVENTION' | 'DEVIS';
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
      documentType: 'CONTRAT',
      label: 'Contrat-cadre annuel — Ministère du Plan',
      context: 'Ministère du Plan',
      uploadedBy: 'Aïcha Moussa (CDV)',
      timeAgo: 'Il y a 30 min',
      status: 'A_VALIDER',
    },
    {
      id: 'VAL-2',
      documentType: 'CONVENTION',
      label: 'Convention de partenariat — Fondation Dangote',
      context: 'Fondation Dangote',
      uploadedBy: 'Ibrahim Touré (CDM)',
      timeAgo: 'Il y a 2h',
      status: 'A_VALIDER',
    },
    {
      id: 'VAL-3',
      documentType: 'CONTRAT',
      label: 'Avenant budgétaire — Airtel Niger',
      context: 'Airtel Niger',
      uploadedBy: 'Aïcha Moussa (CDV)',
      timeAgo: 'Hier',
      status: 'A_VALIDER',
    },
  ]);

  const DOCUMENT_TYPE_META: Record<DocumentType, { label: string; icon: string }> = {
    CONTRAT: { label: 'Contrat', icon: 'description' },
    CONVENTION: { label: 'Convention', icon: 'handshake' },
    DEVIS: { label: 'Devis', icon: 'request_quote' },
  };

  const DOCUMENT_STATUS_META: Record<DocumentStatus, { label: string; badge: string }> = {
    A_VALIDER: { label: 'À valider', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
    VALIDE: { label: 'Validé', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    REJETE: { label: 'Rejeté', badge: 'bg-red-50 text-red-700 border-red-200' },
  };

  // --------------------------------------------------------------------------
  // DONNÉES STATIQUES — Tâches du Jour (checklist rapide de la direction)
  // --------------------------------------------------------------------------
  const [tasks, setTasks] = useState([
    { id: 1, label: 'Approuver le budget Q4 Marketing', done: false },
    { id: 2, label: "Relire le rapport d'audit interne", done: false },
    { id: 3, label: 'Appeler le partenaire stratégique (Alpha Inc)', done: true },
  ]);

  const toggleTask = (id: number) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

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
              Tableau de Bord Direction Générale
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary">
              DG · Vue Globale Agence
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-1">Août 2026 · Performance des divisions, agenda et validations en attente.</p>
        </div>

        <button
          className="px-3.5 py-2 bg-primary hover:bg-on-primary-fixed-variant text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-all shrink-0"
          onClick={() => navigate('/centre-validation')}
          type="button"
        >
          <span className="material-symbols-outlined text-[16px]">verified</span>
          Centre de Validation
        </button>
      </header>

      {/* ==================================================================== */}
      {/* STATS PRATIQUES                                                      */}
      {/* ==================================================================== */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-slate-500 text-[11px] font-medium">CA Global Agence</span>
          <div className="text-xl font-extrabold text-slate-900 tracking-tight mt-1">
            147,0 M <span className="text-xs font-normal text-slate-400">FCFA</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span>Cible : 165,0 M</span>
            <span className="font-bold text-primary">89.1%</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-slate-500 text-[11px] font-medium">Trésorerie Disponible</span>
          <div className="text-xl font-extrabold text-slate-900 tracking-tight mt-1">
            62,5 M <span className="text-xs font-normal text-slate-400">FCFA</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span>Seuil sécurité : 40,0 M</span>
            <span className="font-bold text-emerald-600">156%</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-slate-500 text-[11px] font-medium">Projets Actifs</span>
          <div className="text-xl font-extrabold text-slate-900 tracking-tight mt-1">68</div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span>Toutes divisions</span>
            <span className="font-bold text-amber-600">5 en retard</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-slate-500 text-[11px] font-medium">Taux de Transformation</span>
          <div className="text-xl font-extrabold text-slate-900 tracking-tight mt-1">34.2%</div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span>112 opportunités</span>
            <span className="font-bold text-slate-800">Cible : 30%</span>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* PERFORMANCE PAR DIVISION — liste fine, une seule teinte, un coup d'œil */}
      {/* ==================================================================== */}
      <section className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-headline-md text-sm font-bold text-slate-900">Performance par Division</h2>
          <button
            className="text-xs font-semibold text-primary hover:underline shrink-0"
            onClick={() => showToast('Ouverture du rapport consolidé.')}
            type="button"
          >
            Rapport consolidé →
          </button>
        </div>

        <div className="space-y-2.5">
          {[...divisionPerformance]
            .sort((a, b) => b.progress - a.progress)
            .map((division) => {
              const isSelected = selectedDivisionId === division.id;
              return (
                <div
                  className={`flex items-center gap-3 py-1 px-2 -mx-2 rounded-lg cursor-pointer transition-colors ${
                    isSelected ? 'bg-slate-50' : 'hover:bg-slate-50'
                  }`}
                  key={division.id}
                  onClick={() => setSelectedDivisionId(isSelected ? null : division.id)}
                  role="button"
                  tabIndex={0}
                >
                  <span className="text-xs font-medium text-slate-600 w-44 shrink-0 truncate">{division.name}</span>
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${Math.min(100, division.progress)}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-800 w-10 text-right shrink-0">{division.progress}%</span>
                </div>
              );
            })}
        </div>
      </section>

      {/* ==================================================================== */}
      {/* AGENDA · TÂCHES DU JOUR · VALIDATIONS EN ATTENTE, TROIS COLONNES     */}
      {/* ==================================================================== */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* COLONNE 1 : AGENDA DE LA DIRECTION (4 COLS) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-headline-md text-base font-bold text-slate-900">Agenda</h2>
              <p className="text-slate-400 text-xs">Aujourd'hui · 27 Août</p>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              4
            </span>
          </div>

          {/* Timeline compacte à icônes de type d'événement (Appel / Réunion / Livraison) */}
          <div>
            {scheduleTimeline.map((item, idx) => {
              const meta = EVENT_TYPE_META[item.eventType];
              const isLast = idx === scheduleTimeline.length - 1;

              return (
                <div className="relative flex gap-3" key={idx}>
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
            Voir l'agenda complet →
          </button>
        </div>

        {/* COLONNE 2 : TÂCHES DU JOUR — checklist rapide (4 COLS) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-headline-md text-base font-bold text-slate-900">Tâches du Jour</h2>
            <button
              className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors shrink-0"
              onClick={() => showToast('Ajout de tâche à venir.')}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
            </button>
          </div>

          <div className="space-y-1">
            {tasks.map((task) => (
              <label
                className="flex items-start gap-2.5 p-2 -mx-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                key={task.id}
              >
                <input
                  checked={task.done}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/30 shrink-0"
                  onChange={() => toggleTask(task.id)}
                  type="checkbox"
                />
                <span className={`text-xs leading-snug ${task.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                  {task.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* COLONNE 3 : VALIDATIONS EN ATTENTE (4 COLS) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h2 className="font-headline-md text-base font-bold text-slate-900">Validations</h2>
              <span className="text-xs font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                {validations.filter((v) => v.status === 'A_VALIDER').length} en attente
              </span>
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
                    <h3 className="font-bold text-xs text-slate-900 leading-snug truncate">{val.label}</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                      {DOCUMENT_STATUS_META[val.status].label} · {val.context} · {val.timeAgo}
                    </p>
                  </div>

                  <button
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-primary border border-primary/20 hover:bg-primary/5 transition-colors shrink-0"
                    onClick={() => navigate('/centre-validation')}
                    title="Voir"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
