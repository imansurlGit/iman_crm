import { Link, useParams } from 'react-router-dom';

type StepStatus = 'done' | 'current' | 'locked' | 'pending';

interface WorkflowStep { id: number; title: string; owner: string; status: StepStatus; }
interface DocItem      { title: string; statusLabel: string; statusKind: 'ok' | 'warn' | 'danger' | 'idle'; info: string; action: string; primary: boolean; }
interface MeetingItem  { title: string; date: string; participants: string; past: boolean; }
interface ActivityItem { text: string; date: string; actor: string; }
interface TaskItem     { title: string; owner: string; due: string; priority: 'Haute' | 'Moyenne' | 'Basse'; }

const STEPS: WorkflowStep[] = [
  { id:  1, title: 'Création du dossier',         owner: 'Chargée Partenariat', status: 'done'    },
  { id:  2, title: 'Qualification initiale',       owner: 'Chargée Partenariat', status: 'done'    },
  { id:  3, title: 'Premier entretien',            owner: 'Chargée Partenariat', status: 'done'    },
  { id:  4, title: 'Fiche signalétique',           owner: 'Chargée Partenariat', status: 'done'    },
  { id:  5, title: 'Préparation de la convention', owner: 'Chargée Partenariat', status: 'current' },
  { id:  6, title: 'Validation CDM',               owner: 'CDM',                 status: 'locked'  },
  { id:  7, title: 'Signature partenaire',         owner: 'Partenaire',          status: 'locked'  },
  { id:  8, title: 'Paiement initial',             owner: 'Comptabilité',        status: 'locked'  },
  { id:  9, title: "Plan d'activation",            owner: 'Chargée Partenariat', status: 'pending' },
  { id: 10, title: 'Déploiement terrain',          owner: 'Équipe projet',       status: 'pending' },
  { id: 11, title: 'Clôture opérationnelle',       owner: 'CDM',                 status: 'pending' },
  { id: 12, title: 'Bilan final',                  owner: 'CDM',                 status: 'pending' },
];

const DOCS: DocItem[] = [
  { title: 'Fiche signalétique',        statusLabel: 'Complète',              statusKind: 'ok',     info: 'Version 1.3 — validée le 02/08/2026',   action: 'Consulter',       primary: false },
  { title: 'Convention de partenariat', statusLabel: 'En révision juridique', statusKind: 'warn',   info: 'Version 2 envoyée au partenaire',       action: 'Relancer',        primary: true  },
  { title: 'Paiement initial',          statusLabel: 'En attente',            statusKind: 'danger', info: 'Acompte requis : 2 500 000 FCFA',       action: 'Suivre paiement', primary: true  },
  { title: 'Dépôt éléments finaux',     statusLabel: 'À ouvrir',              statusKind: 'idle',   info: 'Espace partagé non encore créé',       action: 'Créer espace',    primary: false },
];

const MEETINGS: MeetingItem[] = [
  { title: 'Réunion cadrage partenariat',  date: '08 août 2026, 10 h 30', participants: 'Chargée Partenariat + CDM',  past: true  },
  { title: 'Comité validation convention', date: '14 août 2026, 15 h 00', participants: 'CDM + Service juridique',    past: false },
  { title: 'Point lancement opérationnel',date: '20 août 2026, 09 h 00', participants: 'Équipe événement',           past: false },
];

const ACTIVITIES: ActivityItem[] = [
  { text: 'Fiche signalétique validée',          date: '09 août 2026, 17 h 42', actor: 'Aïcha M.'  },
  { text: 'Convention v2 envoyée au partenaire', date: '09 août 2026, 11 h 08', actor: 'Nadia R.'  },
  { text: 'Réunion cadrage réalisée',            date: '08 août 2026, 12 h 00', actor: 'Aïcha M.'  },
];

const TASKS: TaskItem[] = [
  { title: 'Vérifier la clause de visibilité média', owner: 'Chargée Partenariat', due: '11 août', priority: 'Haute'   },
  { title: 'Préparer check-list logistique salon',   owner: 'CDM',                 due: '13 août', priority: 'Moyenne' },
  { title: 'Partager maquette support partenaire',   owner: 'Chargée Partenariat', due: '15 août', priority: 'Basse'   },
];

const DOC_STATUS_CLASSES: Record<DocItem['statusKind'], string> = {
  ok:     'text-green-700  bg-green-50          border-green-200',
  warn:   'text-primary    bg-primary-fixed/30  border-primary-fixed',
  danger: 'text-error      bg-error-container/30 border-error-container',
  idle:   'text-on-surface-variant bg-surface-container border-outline-variant',
};

const PRIORITY_META: Record<TaskItem['priority'], { bg: string; text: string; dot: string }> = {
  Haute:   { bg: 'bg-error-container/30', text: 'text-error',             dot: 'bg-error'          },
  Moyenne: { bg: 'bg-primary-fixed/30',   text: 'text-primary',           dot: 'bg-primary-container' },
  Basse:   { bg: 'bg-surface-container',  text: 'text-on-surface-variant',dot: 'bg-outline'        },
};

function stepRing(s: StepStatus) {
  if (s === 'done')    return 'border-green-500   bg-green-500   text-white';
  if (s === 'current') return 'border-primary-container bg-primary-container text-on-primary';
  if (s === 'locked')  return 'border-outline     bg-surface-container-low     text-outline';
  return 'border-outline-variant bg-surface-container-lowest text-outline';
}

function stepCard(s: StepStatus) {
  if (s === 'done')    return 'border-green-200   bg-green-50/70';
  if (s === 'current') return 'border-primary-container/50 bg-primary-fixed/20 shadow-sm';
  if (s === 'locked')  return 'border-outline-variant/60 bg-surface-container-low opacity-80';
  return 'border-outline-variant/30 bg-surface-container-lowest opacity-55';
}

const doneCount  = STEPS.filter((s) => s.status === 'done').length;
const donePct    = Math.round((doneCount / STEPS.length) * 100);
const currentStep = STEPS.find((s) => s.status === 'current');

export default function PartenaireDetailPage() {
  const { id } = useParams();

  return (
    <div className="flex flex-col gap-gutter">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 font-label-md text-label-md text-on-surface-variant">
        <Link to="/partenaires" className="hover:text-primary transition-colors">Partenaires</Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-on-surface font-semibold">NovaTel Afrique</span>
      </nav>

      {/* ── En-tête identité ── */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
        {/* Bande de couleur */}
        <div className="h-1.5 w-full bg-gradient-to-r from-primary-container via-primary to-on-primary-fixed-variant" />

        <div className="p-5 md:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">

            {/* Avatar + infos */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-on-surface flex items-center justify-center font-bold text-base text-white shrink-0">
                NA
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5 mb-2">
                  <h1 className="font-headline-md text-headline-md text-on-surface">NovaTel Afrique</h1>
                  <span className="inline-flex items-center gap-1.5 bg-primary-fixed/30 border border-primary-fixed text-primary font-label-md text-label-md px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse" />
                    Étape {currentStep?.id} — {currentStep?.title}
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
                  {[
                    { icon: 'person', text: 'Mariam Issa · Directrice partenariats' },
                    { icon: 'call',   text: '+227 90 00 00 00'                       },
                    { icon: 'mail',   text: 'mariam@novatel.africa'                  },
                    { icon: 'event',  text: 'Dossier ouvert le 01 août 2026'         },
                  ].map((item) => (
                    <div key={item.icon} className="flex items-center gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
                      <span className="material-symbols-outlined text-[15px] text-outline shrink-0">{item.icon}</span>
                      {item.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 shrink-0">
              <Link
                to="/partenariats/suivi"
                className="inline-flex items-center gap-1.5 border border-outline-variant rounded-lg px-3 py-2 font-body-sm text-body-sm text-on-surface hover:border-primary-container hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">view_kanban</span>
                Vue événement
              </Link>
              <button
                className="inline-flex items-center gap-1.5 bg-primary-container text-on-primary rounded-lg px-3 py-2 font-body-sm text-body-sm hover:opacity-90 active:scale-95 transition-all"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                Modifier
              </button>
            </div>
          </div>

          {/* Méta-données */}
          <div className="mt-5 pt-4 border-t border-outline-variant grid grid-cols-3 gap-4">
            {[
              { label: 'ID dossier',         value: `PT-${id ?? '101'}-2026` },
              { label: 'Événement principal', value: 'Salon Tech 2026'        },
              { label: 'Montant engagé',      value: '7 500 000 FCFA'         },
            ].map((m) => (
              <div key={m.label}>
                <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">{m.label}</p>
                <p className="font-body-sm font-semibold text-on-surface mt-0.5">{m.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bloc 1 : Workflow 12 étapes ── */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 md:p-7">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-headline-md text-base font-bold text-on-surface">Workflow de partenariat</h2>
          <span className="font-label-md text-label-md text-on-surface-variant">
            {donePct} % — {doneCount} / {STEPS.length} étapes
          </span>
        </div>

        {/* Barre de progression */}
        <div className="relative h-2 w-full rounded-full bg-surface-container my-4 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-green-500 to-primary-container transition-all duration-700"
            style={{ width: `${donePct}%` }}
          />
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {STEPS.map((step) => (
            <article
              key={step.id}
              className={`rounded-lg border p-3 flex items-start gap-3 transition-all ${stepCard(step.status)}`}
            >
              <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-bold ${stepRing(step.status)}`}>
                {step.status === 'done'   && <span className="material-symbols-outlined text-[14px]">check</span>}
                {step.status === 'locked' && <span className="material-symbols-outlined text-[14px]">lock</span>}
                {(step.status === 'current' || step.status === 'pending') && step.id}
              </div>
              <div className="min-w-0">
                <p className="font-body-sm font-semibold text-on-surface leading-snug">{step.title}</p>
                <p className="font-label-md text-label-md text-on-surface-variant mt-0.5">{step.owner}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Blocs 2 + 3 : côte à côte ── */}
      <div className="grid gap-gutter xl:grid-cols-2">

        {/* Bloc 2 : Documents */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
          <h2 className="font-headline-md text-base font-bold text-on-surface mb-4">Documents & conventions</h2>
          <div className="space-y-3">
            {DOCS.map((doc) => (
              <article key={doc.title} className="rounded-lg border border-outline-variant bg-surface-container-low p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-body-sm font-semibold text-on-surface">{doc.title}</p>
                    <span className={`inline-flex items-center mt-1 font-label-md text-label-md rounded-full border px-2.5 py-0.5 ${DOC_STATUS_CLASSES[doc.statusKind]}`}>
                      {doc.statusLabel}
                    </span>
                  </div>
                  <button
                    className={`shrink-0 rounded-lg px-3 py-1.5 font-label-md text-label-md transition-all active:scale-95 ${
                      doc.primary
                        ? 'bg-primary-container text-on-primary hover:opacity-90'
                        : 'border border-outline-variant text-on-surface hover:border-primary-container hover:text-primary'
                    }`}
                    type="button"
                  >
                    {doc.action}
                  </button>
                </div>
                <p className="mt-2 font-label-md text-label-md text-on-surface-variant">{doc.info}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Bloc 3 : Calendrier */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
          <h2 className="font-headline-md text-base font-bold text-on-surface mb-4">Calendrier & événements liés</h2>

          <a
            href="#"
            className="mb-4 flex items-center justify-between rounded-lg border border-primary-fixed bg-primary-fixed/20 px-3.5 py-2.5 hover:bg-primary-fixed/35 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">event_available</span>
              <span className="font-body-sm font-semibold text-primary">Événement principal : Salon Tech 2026</span>
            </div>
            <span className="material-symbols-outlined text-primary text-[16px]">north_east</span>
          </a>

          <div className="space-y-2.5">
            {MEETINGS.map((m) => (
              <article key={m.title} className="rounded-lg border border-outline-variant p-3 flex items-start gap-3">
                <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${m.past ? 'bg-outline' : 'bg-primary-container'}`} />
                <div className="min-w-0 flex-1">
                  <p className="font-body-sm font-semibold text-on-surface">{m.title}</p>
                  <p className="font-label-md text-label-md text-on-surface-variant mt-0.5">{m.date}</p>
                  <p className="font-label-md text-label-md text-on-surface-variant">Participants : {m.participants}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 font-label-md text-label-md ${
                  m.past ? 'bg-surface-container text-on-surface-variant' : 'bg-primary-fixed/30 text-primary'
                }`}>
                  {m.past ? 'Passée' : 'À venir'}
                </span>
              </article>
            ))}
          </div>
        </section>
      </div>

      {/* ── Bloc 4 : Fil d'actualité + Tâches ── */}
      <div className="grid gap-gutter xl:grid-cols-2">

        {/* Fil d'actualité */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
          <h2 className="font-headline-md text-base font-bold text-on-surface mb-4">Fil d'actualité</h2>
          <ol className="relative border-l border-outline-variant ml-3 space-y-0">
            {ACTIVITIES.map((a, i) => (
              <li key={i} className="relative pl-5 pb-5 last:pb-0">
                <span className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full border-2 border-primary-container bg-surface-container-lowest flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
                </span>
                <p className="font-body-sm font-semibold text-on-surface leading-snug">{a.text}</p>
                <p className="font-label-md text-label-md text-on-surface-variant mt-0.5">{a.date} · {a.actor}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Tâches */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-headline-md text-base font-bold text-on-surface">Tâches en cours</h2>
            <button
              className="inline-flex items-center gap-1 border border-outline-variant rounded-lg px-3 py-1.5 font-label-md text-label-md text-on-surface hover:border-primary-container hover:text-primary transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              Nouvelle tâche
            </button>
          </div>

          <div className="space-y-2.5">
            {TASKS.map((t) => (
              <article key={t.title} className="rounded-lg border border-outline-variant bg-surface-container-low p-3.5 flex items-start gap-3">
                <button
                  className="mt-0.5 w-4 h-4 rounded border-2 border-outline shrink-0 hover:border-primary-container transition-colors"
                  type="button"
                  aria-label="Marquer comme fait"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-body-sm text-on-surface leading-snug">{t.title}</p>
                  <p className="font-label-md text-label-md text-on-surface-variant mt-1">
                    {t.owner} · Avant le {t.due}
                  </p>
                </div>
                <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-label-md text-label-md shrink-0 ${PRIORITY_META[t.priority].bg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_META[t.priority].dot}`} />
                  <span className={PRIORITY_META[t.priority].text}>{t.priority}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
