import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

type EventKey       = 'FOIRE' | 'CONFERENCE' | 'GALA';
type KanbanCol      = 'NEGOCIATION' | 'SIGNE' | 'DEPLOIEMENT' | 'READY';

interface EventDef  { key: EventKey; label: string; period: string; }
interface EventPartner {
  id: number; company: string; contact: string; amount: string;
  col: KanbanCol; blocker?: string;
}
interface EventSummary {
  partners: number; payments: string;
  blockers: number; blockersText: string;
}

const EVENTS: EventDef[] = [
  { key: 'FOIRE',      label: 'Foire Internationale', period: 'Oct. 2026' },
  { key: 'CONFERENCE', label: 'Conférence Annuelle',  period: 'Nov. 2026' },
  { key: 'GALA',       label: 'Gala 2026',            period: 'Déc. 2026' },
];

const COL_META: Record<KanbanCol, { title: string; headerBg: string; dot: string; count: string }> = {
  NEGOCIATION: { title: 'En négociation',         headerBg: 'bg-primary-fixed/30 border-primary-fixed',    dot: 'bg-primary-container', count: 'bg-primary-fixed text-primary'            },
  SIGNE:       { title: 'Convention signée',       headerBg: 'bg-green-50 border-green-200',               dot: 'bg-green-500',         count: 'bg-green-100 text-green-700'              },
  DEPLOIEMENT: { title: 'En cours de déploiement', headerBg: 'bg-secondary-container border-outline-variant',dot: 'bg-outline',          count: 'bg-surface-container text-on-surface-variant' },
  READY:       { title: "Prêt pour l'événement",  headerBg: 'bg-surface-container-high border-outline-variant',dot: 'bg-on-surface',   count: 'bg-on-surface text-on-primary'            },
};

const EVENT_DATA: Record<EventKey, { summary: EventSummary; partners: EventPartner[] }> = {
  FOIRE: {
    summary: { partners: 14, payments: '8 / 14 paiements reçus', blockers: 3, blockersText: '3 conventions en attente de signature' },
    partners: [
      { id: 201, company: 'Banque Horizon',    contact: 'Ibrahim Oumarou', amount: '3 000 000 FCFA', col: 'NEGOCIATION', blocker: 'Clause budget à clarifier' },
      { id: 202, company: 'NovaTel Afrique',   contact: 'Mariam Issa',     amount: '7 500 000 FCFA', col: 'SIGNE'       },
      { id: 203, company: 'Logis Event Group', contact: 'Amadou Alio',     amount: '2 000 000 FCFA', col: 'DEPLOIEMENT' },
      { id: 204, company: 'Réseau Média 24',   contact: 'Halima Mossi',    amount: '1 500 000 FCFA', col: 'READY'       },
      { id: 205, company: 'Cloud Bridge',      contact: 'Nadir K.',        amount: '1 800 000 FCFA', col: 'NEGOCIATION', blocker: 'Validation CDM manquante' },
      { id: 206, company: 'Impression Atlas',  contact: 'Souleymane H.',   amount: '950 000 FCFA',   col: 'DEPLOIEMENT' },
    ],
  },
  CONFERENCE: {
    summary: { partners: 9, payments: '6 / 9 paiements reçus', blockers: 1, blockersText: '1 dossier bloqué sur pièce justificative' },
    partners: [
      { id: 301, company: 'Studio Impact',  contact: 'Ramatou Ide',    amount: '1 100 000 FCFA', col: 'SIGNE'       },
      { id: 302, company: 'Zenith Food',    contact: 'Kadi A.',        amount: '700 000 FCFA',   col: 'READY'       },
      { id: 303, company: 'Print One',      contact: 'Moussa G.',      amount: '500 000 FCFA',   col: 'DEPLOIEMENT' },
      { id: 304, company: 'TechHost Niger', contact: 'Abdoulaye Sani', amount: '1 200 000 FCFA', col: 'NEGOCIATION' },
    ],
  },
  GALA: {
    summary: { partners: 11, payments: '4 / 11 paiements reçus', blockers: 4, blockersText: '4 conventions toujours en brouillon' },
    partners: [
      { id: 401, company: 'Réseau Média 24',   contact: 'Halima Mossi',  amount: '2 100 000 FCFA', col: 'NEGOCIATION', blocker: 'Arbitrage visibilité média' },
      { id: 402, company: 'NovaTel Afrique',   contact: 'Mariam Issa',   amount: '6 000 000 FCFA', col: 'SIGNE'       },
      { id: 403, company: 'Logis Event Group', contact: 'Amadou Alio',   amount: '2 500 000 FCFA', col: 'DEPLOIEMENT' },
      { id: 404, company: 'Agence Lumen',      contact: 'Inoussa T.',    amount: '1 400 000 FCFA', col: 'READY'       },
    ],
  },
};

export default function PartenariatsSuiviPage() {
  const [active, setActive] = useState<EventKey>('FOIRE');
  const data = EVENT_DATA[active];

  const grouped = useMemo(
    () =>
      data.partners.reduce<Record<KanbanCol, EventPartner[]>>(
        (acc, p) => { acc[p.col].push(p); return acc; },
        { NEGOCIATION: [], SIGNE: [], DEPLOIEMENT: [], READY: [] },
      ),
    [data],
  );

  return (
    <div className="flex flex-col gap-gutter">

      {/* ── En-tête ── */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 md:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest">Pilotage événementiel</p>
            <h1 className="font-headline-md text-headline-md text-on-surface mt-1">Suivi des partenariats</h1>
            <p className="font-body-sm text-body-sm text-secondary mt-1 max-w-xl">
              Vue groupée par événement — avancement, paiements et points de blocage.
            </p>
          </div>

          <div className="shrink-0 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-right">
            <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Événement actif</p>
            <p className="font-body-sm font-semibold text-on-surface mt-0.5">
              {EVENTS.find((e) => e.key === active)?.label}
            </p>
          </div>
        </div>

        {/* Onglets événements */}
        <div className="mt-5 flex flex-wrap gap-2">
          {EVENTS.map((ev) => (
            <button
              key={ev.key}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-body-sm text-body-sm transition-all ${
                active === ev.key
                  ? 'bg-on-surface text-white shadow-sm'
                  : 'border border-outline-variant text-on-surface hover:border-primary-container hover:text-primary'
              }`}
              onClick={() => setActive(ev.key)}
              type="button"
            >
              {ev.label}
              <span className={`font-label-md text-label-md ${active === ev.key ? 'text-white/50' : 'text-on-surface-variant'}`}>
                {ev.period}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── KPI de l'événement ── */}
      <section className="grid gap-gutter md:grid-cols-3">
        <article className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-secondary-container flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-on-surface-variant text-xl">group</span>
          </div>
          <div>
            <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Partenaires engagés</p>
            <p className="font-headline-md text-headline-md text-on-surface mt-0.5">{data.summary.partners}</p>
          </div>
        </article>

        <article className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-secondary-container flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-on-surface-variant text-xl">payments</span>
          </div>
          <div>
            <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">État des paiements</p>
            <p className="font-body-sm font-semibold text-on-surface mt-0.5">{data.summary.payments}</p>
          </div>
        </article>

        <article className={`border rounded-xl p-5 flex items-center gap-4 ${
          data.summary.blockers > 0
            ? 'border-error-container bg-error-container/20'
            : 'border-outline-variant bg-surface-container-lowest'
        }`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            data.summary.blockers > 0 ? 'bg-error-container' : 'bg-secondary-container'
          }`}>
            <span className={`material-symbols-outlined text-xl ${data.summary.blockers > 0 ? 'text-error' : 'text-on-surface-variant'}`}>
              warning
            </span>
          </div>
          <div>
            <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Alertes de blocage</p>
            <p className={`font-headline-md text-headline-md mt-0.5 ${data.summary.blockers > 0 ? 'text-error' : 'text-on-surface'}`}>
              {data.summary.blockers}
            </p>
            {data.summary.blockers > 0 && (
              <p className="font-label-md text-label-md text-error/80 mt-0.5">{data.summary.blockersText}</p>
            )}
          </div>
        </article>
      </section>

      {/* ── Kanban ── */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
        <div className="p-4 border-b border-outline-variant bg-surface-container-low">
          <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
            Tableau de suivi · {EVENTS.find((e) => e.key === active)?.label}
          </p>
        </div>

        <div className="overflow-x-auto p-4">
          <div className="grid min-w-[900px] grid-cols-4 gap-3">
            {(Object.keys(COL_META) as KanbanCol[]).map((col) => (
              <div key={col} className="flex flex-col gap-2.5">
                {/* En-tête colonne */}
                <div className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${COL_META[col].headerBg}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${COL_META[col].dot}`} />
                    <p className="font-body-sm font-semibold text-on-surface text-sm">{COL_META[col].title}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 font-label-md text-label-md ${COL_META[col].count}`}>
                    {grouped[col].length}
                  </span>
                </div>

                {/* Cartes partenaires */}
                {grouped[col].map((p) => (
                  <article
                    key={p.id}
                    className="rounded-xl border border-outline-variant bg-surface-container-lowest p-3.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                  >
                    <p className="font-body-sm font-semibold text-on-surface">{p.company}</p>
                    <p className="font-label-md text-label-md text-on-surface-variant mt-0.5">{p.contact}</p>
                    <p className="font-label-md text-label-md font-semibold text-secondary mt-1.5">{p.amount}</p>

                    {p.blocker && (
                      <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-error-container/20 border border-error-container/40 px-2.5 py-1.5">
                        <span className="material-symbols-outlined text-error text-[13px] shrink-0 mt-0.5">error</span>
                        <p className="font-label-md text-label-md text-error leading-snug">{p.blocker}</p>
                      </div>
                    )}

                    <div className="mt-3 flex gap-2">
                      <Link
                        to={`/partenaires/${p.id}`}
                        className="flex-1 text-center rounded-lg border border-outline-variant px-2 py-1.5 font-label-md text-label-md text-on-surface hover:border-primary-container hover:text-primary transition-colors"
                      >
                        Ouvrir fiche
                      </Link>
                      <button
                        className="rounded-lg bg-primary-container text-on-primary px-2 py-1.5 font-label-md text-label-md hover:opacity-90 active:scale-95 transition-all"
                        type="button"
                        title="Action terrain"
                      >
                        <span className="material-symbols-outlined text-[14px]">bolt</span>
                      </button>
                    </div>
                  </article>
                ))}

                {grouped[col].length === 0 && (
                  <div className="rounded-xl border border-dashed border-outline-variant/60 p-4 text-center">
                    <p className="font-label-md text-label-md text-on-surface-variant">Aucun partenaire</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
