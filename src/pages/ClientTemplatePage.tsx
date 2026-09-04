// Gabarit statique de la fiche client. Structure volontairement différente
// de la fiche prospect (ProspectTemplatePage.tsx) : ici le client est une
// "compte" déjà acquis — l'enjeu n'est plus de suivre un entonnoir mais de
// piloter la relation (portefeuille de projets, finances, historique
// complet). D'où un en-tête plein largeur avec les chiffres clés, puis une
// navigation par onglets plutôt qu'un long empilement de cartes.

import { useState } from 'react';

type Stage = 'PRISE_DE_CONTACT' | 'QUALIFICATION' | 'ECHANGES' | 'CHIFFRAGE_OFFRE' | 'CONVERSION_CLIENT';
type InteractionType = 'CALL' | 'MEETING' | 'EMAIL' | 'MESSAGE';
type ProjectStatus = 'CLOTURE' | 'LIVRE' | 'EN_COURS';
type TabKey = 'APERCU' | 'PROSPECTION' | 'PROJETS' | 'FINANCES';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'APERCU', label: 'Vue d’ensemble', icon: 'account_circle' },
  { key: 'PROSPECTION', label: 'Prospection', icon: 'person_search' },
  { key: 'PROJETS', label: 'Projets', icon: 'account_tree' },
  { key: 'FINANCES', label: 'Finances', icon: 'account_balance_wallet' },
];

const STAGE_DEFS: { key: Stage; label: string; dot: string; text: string; bg: string; border: string }[] = [
  { key: 'PRISE_DE_CONTACT', label: 'Prise de Contact', dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
  { key: 'QUALIFICATION', label: 'Qualification', dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  { key: 'ECHANGES', label: 'Échanges', dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  { key: 'CHIFFRAGE_OFFRE', label: 'Chiffrage & Offre', dot: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
];

const ORIGIN = {
  type: 'PROSPECT_CONVERTI' as const,
  firstContactAt: '3 mars 2025',
  convertedAt: '22 avril 2025',
  convertedBy: 'Rose Marie',
  note: 'Devis validé et acompte reçu sur "Refonte identité visuelle" — passage en client actif.',
};

const PARCOURS_STEPS: { key: Stage; label: string; subtitle: string }[] = [
  { key: 'PRISE_DE_CONTACT', label: 'Prise de Contact', subtitle: 'Source : Recommandation' },
  { key: 'QUALIFICATION', label: 'Qualification', subtitle: 'Besoins identifiés' },
  { key: 'ECHANGES', label: 'Échanges', subtitle: 'Réunion de cadrage' },
  { key: 'CHIFFRAGE_OFFRE', label: 'Chiffrage & Offre', subtitle: '2 400 000 FCFA' },
  { key: 'CONVERSION_CLIENT', label: 'Conversion Client', subtitle: ORIGIN.convertedAt },
];

const INTERACTION_TYPE_META: Record<InteractionType, { label: string; icon: string }> = {
  CALL: { label: 'Appel', icon: 'call' },
  MEETING: { label: 'Réunion', icon: 'groups' },
  EMAIL: { label: 'Email', icon: 'mail' },
  MESSAGE: { label: 'Message', icon: 'sms' },
};

interface InteractionAttachment {
  name: string;
  extension: string;
}

interface Interaction {
  id: number;
  stage: Stage;
  type: InteractionType;
  title: string;
  date: string;
  note: string;
  attachment?: InteractionAttachment;
}

const ATTACHMENT_ICON_BY_EXT: Record<string, string> = {
  pdf: 'picture_as_pdf',
  xlsx: 'table_chart',
  docx: 'description',
};

const PROSPECTION_INTERACTIONS: Interaction[] = [
  {
    id: 1,
    stage: 'PRISE_DE_CONTACT',
    type: 'CALL',
    title: 'Premier contact',
    date: '3 mars 2025, 09:15',
    note: "Contact initié suite à une recommandation d'un client existant du secteur minier.",
  },
  {
    id: 2,
    stage: 'QUALIFICATION',
    type: 'MEETING',
    title: 'Rendez-vous de découverte',
    date: '10 mars 2025, 14:00',
    note: 'Rendez-vous de découverte : besoin de refonte de identité visuelle et de campagne institutionnelle.',
  },
  {
    id: 3,
    stage: 'ECHANGES',
    type: 'EMAIL',
    title: 'Envoi du brief et références',
    date: '18 mars 2025, 11:20',
    note: 'Envoi du brief détaillé et des références de réalisations similaires.',
    attachment: { name: 'References_Identite_Visuelle.pdf', extension: 'pdf' },
  },
  {
    id: 4,
    stage: 'CHIFFRAGE_OFFRE',
    type: 'CALL',
    title: 'Présentation du devis',
    date: '5 avril 2025, 10:30',
    note: 'Présentation du devis "Refonte identité visuelle" — validation verbale, acompte annoncé sous 15 jours.',
    attachment: { name: 'Devis_Sahel_Mining_Identite.pdf', extension: 'pdf' },
  },
];

const RECENT_INTERACTIONS: Interaction[] = [
  {
    id: 5,
    stage: 'CONVERSION_CLIENT',
    type: 'CALL',
    title: 'Point mensuel de suivi',
    date: '12 août 2026, 16:00',
    note: 'Point mensuel de suivi — satisfaction confirmée, discussion sur un renouvellement du site web pour 2027.',
  },
  {
    id: 6,
    stage: 'CONVERSION_CLIENT',
    type: 'EMAIL',
    title: 'Relance de facture',
    date: '2 août 2026, 09:40',
    note: 'Relance de facture sur le solde du projet "Campagne institutionnelle 2025".',
  },
];

interface ClientProject {
  id: number;
  name: string;
  montant: number;
  status: ProjectStatus;
  dateKey: string;
  paidAmount: number;
}

const PROJECT_STATUS_META: Record<ProjectStatus, { label: string; text: string; bg: string }> = {
  CLOTURE: { label: 'Clôturé', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  LIVRE: { label: 'Livré', text: 'text-blue-700', bg: 'bg-blue-50' },
  EN_COURS: { label: 'En cours', text: 'text-amber-700', bg: 'bg-amber-50' },
};

const PROJECTS: ClientProject[] = [
  { id: 1, name: 'Refonte identité visuelle', montant: 2_400_000, status: 'CLOTURE', dateKey: 'Livré le 10 juin 2025', paidAmount: 2_400_000 },
  { id: 2, name: 'Campagne institutionnelle 2025', montant: 3_800_000, status: 'LIVRE', dateKey: 'Livré le 15 décembre 2025', paidAmount: 1_900_000 },
  { id: 3, name: 'Site web corporate', montant: 5_000_000, status: 'EN_COURS', dateKey: 'Démarré le 4 mai 2026', paidAmount: 1_500_000 },
];

const CLIENT = {
  name: 'Moussa Ibrahim',
  role: 'Directeur Général',
  company: 'Sahel Mining SA',
  sector: 'Mines & industries extractives',
  phone: '+227 90 45 67 12',
  email: 'direction@sahelmining.ne',
  address: 'Route de Tillabéri, Niamey',
  commercial: 'Rose Marie',
};

function formatFcfa(amount: number) {
  return `${amount.toLocaleString('fr-FR')} FCFA`;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const CARD_CLASSES = 'bg-white rounded-xl border border-outline-variant';

function InteractionRow({ item }: { item: Interaction }) {
  const meta = INTERACTION_TYPE_META[item.type];
  return (
    <div className="flex items-start gap-3 bg-surface-container-low/60 rounded-lg p-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-primary/10 text-primary">
        <span className="material-symbols-outlined text-[16px]">{meta.icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-on-surface">{item.title}</span>
          <span className="text-[11px] text-secondary shrink-0">{item.date}</span>
        </div>
        <p className="text-sm text-on-surface-variant mt-0.5 leading-relaxed">{item.note}</p>
        {item.attachment && (
          <button
            type="button"
            className="mt-2 inline-flex items-center gap-1.5 bg-white border border-outline-variant rounded-lg px-2.5 py-1.5 text-xs font-semibold text-on-surface hover:border-primary/40 hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[15px] text-secondary">
              {ATTACHMENT_ICON_BY_EXT[item.attachment.extension] ?? 'attach_file'}
            </span>
            <span className="truncate max-w-[220px]">{item.attachment.name}</span>
            <span className="material-symbols-outlined text-[14px] text-secondary">download</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default function ClientTemplatePage() {
  const [activeTab, setActiveTab] = useState<TabKey>('APERCU');

  const totalGenere = PROJECTS.reduce((sum, project) => sum + project.montant, 0);
  const totalEncaisse = PROJECTS.reduce((sum, project) => sum + project.paidAmount, 0);
  const soldeDu = totalGenere - totalEncaisse;

  return (
    <div className="max-w-6xl mx-auto">
      {/* <div className="mb-6">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/5 border border-primary/20 px-2.5 py-1 rounded-full">
          <span className="material-symbols-outlined text-[14px]">design_services</span>
          Gabarit — Fiche client
        </span>
      </div> */}

      {/* En-tête compte — identité + chiffres clés, tout de suite visibles */}
      <div className={`${CARD_CLASSES} overflow-hidden`}>
        <div className="h-16 bg-[linear-gradient(120deg,#680200_0%,#8a1a0e_100%)]" />
        <div className="px-8 pt-4 pb-6 flex flex-wrap items-start gap-4">
          <div className="w-14 h-14 -mt-10 rounded-xl bg-white text-primary flex items-center justify-center border border-outline-variant shadow-md shrink-0">
            <span className="material-symbols-outlined text-[26px]">apartment</span>
          </div>
          <div className="flex-1 min-w-[220px]">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-headline-md text-xl font-bold text-on-surface">{CLIENT.company}</h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                <span className="material-symbols-outlined text-[12px]">verified</span>
                Client actif
              </span>
            </div>
            <p className="text-sm text-secondary mt-0.5">{CLIENT.name} — {CLIENT.role} · {CLIENT.sector}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-outline-variant px-8 py-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">Client depuis</p>
            <p className="text-sm font-bold text-on-surface mt-1">{ORIGIN.convertedAt}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">Projets</p>
            <p className="text-sm font-bold text-on-surface mt-1">{PROJECTS.length}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">CA généré</p>
            <p className="text-sm font-bold text-on-surface mt-1">{formatFcfa(totalGenere)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">Solde dû</p>
            <p className={`text-sm font-bold mt-1 ${soldeDu > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
              {soldeDu > 0 ? formatFcfa(soldeDu) : 'À jour'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="flex items-center gap-1 border-b border-outline-variant mt-6 mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-secondary hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Onglet : Vue d'ensemble */}
      {activeTab === 'APERCU' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-gutter items-start">
          <div className={`${CARD_CLASSES} p-5 lg:col-span-2`}>
            <h3 className="font-headline-md text-base font-bold text-on-surface mb-4">Informations générales</h3>
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-2.5 text-sm">
                <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">call</span>
                <span className="text-on-surface">{CLIENT.phone}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">mail</span>
                <span className="text-on-surface truncate">{CLIENT.email}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">location_on</span>
                <span className="text-on-surface">{CLIENT.address}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">business_center</span>
                <span className="text-on-surface">{CLIENT.sector}</span>
              </div>
            </div>

            <div className="mt-5 pt-5 border-t border-outline-variant">
              <p className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-2">Commercial assigné</p>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-xs font-bold shrink-0">
                  {getInitials(CLIENT.commercial)}
                </div>
                <span className="text-sm font-semibold text-on-surface">{CLIENT.commercial}</span>
              </div>
            </div>

            <div className="mt-5 pt-5 border-t border-outline-variant">
              <p className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-2">Origine</p>
              <div className="flex items-start gap-2 text-sm text-on-surface-variant leading-relaxed">
                <span className="material-symbols-outlined text-[18px] text-emerald-600 shrink-0">workspace_premium</span>
                <p>
                  Converti depuis un prospect le <span className="font-semibold text-on-surface">{ORIGIN.convertedAt}</span> par{' '}
                  <span className="font-semibold text-on-surface">{ORIGIN.convertedBy}</span>.
                </p>
              </div>
            </div>
          </div>

          <div className={`${CARD_CLASSES} p-5 lg:col-span-3`}>
            <h3 className="font-headline-md text-base font-bold text-on-surface mb-4">Activité récente</h3>
            <div className="space-y-2">
              {RECENT_INTERACTIONS.map((item) => (
                <InteractionRow item={item} key={item.id} />
              ))}
            </div>

            <div className="mt-5 pt-5 border-t border-outline-variant">
              <p className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-2">Projet en cours</p>
              {PROJECTS.filter((p) => p.status === 'EN_COURS').map((project) => (
                <div className="flex items-center justify-between gap-3" key={project.id}>
                  <span className="text-sm font-semibold text-on-surface">{project.name}</span>
                  <span className="text-xs font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                    {PROJECT_STATUS_META[project.status].label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Onglet : Prospection */}
      {activeTab === 'PROSPECTION' && (
        <div className="flex flex-col gap-gutter">
          <div className={`${CARD_CLASSES} p-5`}>
            <div className="flex items-center justify-between gap-3 mb-5">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-primary">Parcours avant conversion</h3>
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-full">
                Prospect converti
              </span>
            </div>

            <div className="flex items-start">
              {PARCOURS_STEPS.flatMap((step, index) => {
                const card = (
                  <div className="flex flex-col items-center gap-1.5 shrink-0 w-28" key={step.key}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm bg-primary text-white">
                      {index === PARCOURS_STEPS.length - 1 ? (
                        <span className="material-symbols-outlined text-[16px]">workspace_premium</span>
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span className="text-xs font-bold text-center leading-tight text-on-surface">{step.label}</span>
                    <span className="text-[10px] text-secondary text-center leading-tight">{step.subtitle}</span>
                  </div>
                );
                if (index === PARCOURS_STEPS.length - 1) return [card];
                const connector = (
                  <div className="flex-1 min-w-[12px] h-0.5 mt-4 mx-1 rounded-full bg-primary" key={`${step.key}-connector`} />
                );
                return [card, connector];
              })}
            </div>

            <div className="mt-6 flex items-start justify-between gap-4 rounded-lg border border-outline-variant/70 p-3.5 bg-surface-container-low/50">
              <p className="text-sm text-on-surface-variant leading-relaxed">
                <span className="mr-1.5">🎉</span>
                <span className="font-bold text-on-surface">Converti par {ORIGIN.convertedBy} : </span>
                {ORIGIN.note}
              </p>
              <span className="shrink-0 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">
                {ORIGIN.convertedAt}
              </span>
            </div>
          </div>

          <div className={`${CARD_CLASSES} p-5`}>
            <h3 className="font-headline-md text-base font-bold text-on-surface mb-5">Historique de prospection</h3>
            <div className="flex flex-col gap-5">
              {STAGE_DEFS.map((stage) => {
                const stageInteractions = PROSPECTION_INTERACTIONS.filter((item) => item.stage === stage.key);
                if (stageInteractions.length === 0) return null;
                return (
                  <div key={stage.key}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${stage.dot}`} />
                      <h4 className="text-xs font-bold uppercase tracking-widest text-secondary">{stage.label}</h4>
                      <span className="bg-surface-container-high px-1.5 py-0.5 rounded-full text-[10px] font-bold text-secondary">
                        {stageInteractions.length}
                      </span>
                    </div>
                    <div className={`space-y-2 pl-4 border-l-2 ${stage.border}`}>
                      {stageInteractions.map((item) => (
                        <InteractionRow item={item} key={item.id} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Onglet : Projets */}
      {activeTab === 'PROJETS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
          {PROJECTS.map((project) => {
            const statusMeta = PROJECT_STATUS_META[project.status];
            const due = project.montant - project.paidAmount;
            const progressPct = Math.round((project.paidAmount / project.montant) * 100);
            return (
              <div className={`${CARD_CLASSES} p-5`} key={project.id}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">account_tree</span>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${statusMeta.bg} ${statusMeta.text}`}>
                    {statusMeta.label}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-on-surface">{project.name}</h4>
                <p className="text-xs text-secondary mt-0.5">{project.dateKey}</p>

                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-secondary">Montant</span>
                  <span className="font-bold text-on-surface">{formatFcfa(project.montant)}</span>
                </div>
                <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progressPct}%` }} />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[11px] text-secondary">{formatFcfa(project.paidAmount)} encaissé</span>
                  <span className={`text-[11px] font-semibold ${due > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                    {due > 0 ? `Solde : ${formatFcfa(due)}` : 'Payé'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Onglet : Finances */}
      {activeTab === 'FINANCES' && (
        <div className="flex flex-col gap-gutter">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-gutter">
            <div className={`${CARD_CLASSES} p-5`}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">Chiffre d&apos;affaires généré</p>
              <p className="text-2xl font-bold text-on-surface mt-2">{formatFcfa(totalGenere)}</p>
              <p className="text-xs text-secondary mt-1">Sur {PROJECTS.length} projets</p>
            </div>
            <div className={`${CARD_CLASSES} p-5`}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">Total encaissé</p>
              <p className="text-2xl font-bold text-emerald-700 mt-2">{formatFcfa(totalEncaisse)}</p>
              <p className="text-xs text-secondary mt-1">
                {Math.round((totalEncaisse / totalGenere) * 100)}% du chiffre d&apos;affaires généré
              </p>
            </div>
            <div className={`${CARD_CLASSES} p-5 ${soldeDu > 0 ? 'bg-red-50/40 border-red-200' : ''}`}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">Solde dû</p>
              <p className={`text-2xl font-bold mt-2 ${soldeDu > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                {soldeDu > 0 ? formatFcfa(soldeDu) : '0 FCFA'}
              </p>
              <p className="text-xs text-secondary mt-1">{soldeDu > 0 ? 'Créance en attente de règlement' : 'Compte à jour'}</p>
            </div>
          </div>

          <div className={`${CARD_CLASSES} p-5`}>
            <h3 className="font-headline-md text-base font-bold text-on-surface mb-4">Détail par projet</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-bold uppercase tracking-wide text-secondary border-b border-outline-variant">
                    <th className="pb-2 pr-3">Projet</th>
                    <th className="pb-2 pr-3">Statut</th>
                    <th className="pb-2 pr-3 text-right">Montant</th>
                    <th className="pb-2 pr-3 text-right">Encaissé</th>
                    <th className="pb-2 text-right">Solde dû</th>
                  </tr>
                </thead>
                <tbody>
                  {PROJECTS.map((project) => {
                    const statusMeta = PROJECT_STATUS_META[project.status];
                    const due = project.montant - project.paidAmount;
                    return (
                      <tr className="border-b border-outline-variant/60 last:border-0" key={project.id}>
                        <td className="py-2.5 pr-3 font-semibold text-on-surface">{project.name}</td>
                        <td className="py-2.5 pr-3">
                          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${statusMeta.bg} ${statusMeta.text}`}>
                            {statusMeta.label}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-right text-on-surface">{formatFcfa(project.montant)}</td>
                        <td className="py-2.5 pr-3 text-right text-emerald-700">{formatFcfa(project.paidAmount)}</td>
                        <td className={`py-2.5 text-right font-semibold ${due > 0 ? 'text-red-700' : 'text-secondary'}`}>
                          {due > 0 ? formatFcfa(due) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-outline-variant font-bold">
                    <td className="pt-2.5 pr-3 text-on-surface">Total</td>
                    <td className="pt-2.5 pr-3" />
                    <td className="pt-2.5 pr-3 text-right text-on-surface">{formatFcfa(totalGenere)}</td>
                    <td className="pt-2.5 pr-3 text-right text-emerald-700">{formatFcfa(totalEncaisse)}</td>
                    <td className={`pt-2.5 text-right ${soldeDu > 0 ? 'text-red-700' : 'text-secondary'}`}>
                      {soldeDu > 0 ? formatFcfa(soldeDu) : '—'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
