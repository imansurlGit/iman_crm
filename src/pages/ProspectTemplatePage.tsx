// Gabarit statique de la fiche prospect — reflète le vrai parcours mis en
// place cette session (Contact.stage à 4 paliers, Interaction réelle
// CALL/MEETING/EMAIL/MESSAGE, conversion en Opportunité). A servi de
// référence visuelle pour ProspectDetailPage.tsx, désormais partagée par
// tous les rôles (y compris COMMERCIAL).

import { useNavigate } from 'react-router-dom';

type Stage = 'PRISE_DE_CONTACT' | 'QUALIFICATION' | 'ECHANGES' | 'CHIFFRAGE_OFFRE' | 'CONVERSION_CLIENT';
type InteractionType = 'CALL' | 'MEETING' | 'EMAIL' | 'MESSAGE';

const STAGE_DEFS: { key: Stage; label: string; icon: string; dot: string; text: string; bg: string; border: string }[] = [
  { key: 'PRISE_DE_CONTACT', label: 'Prise de Contact', icon: 'call', dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
  { key: 'QUALIFICATION', label: 'Qualification', icon: 'psychology', dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  { key: 'ECHANGES', label: 'Échanges', icon: 'forum', dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  { key: 'CHIFFRAGE_OFFRE', label: 'Chiffrage & Offre', icon: 'request_quote', dot: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  { key: 'CONVERSION_CLIENT', label: 'Conversion Client', icon: 'workspace_premium', dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
];

const CURRENT_STAGE: Stage = 'CHIFFRAGE_OFFRE';

// Bandeau "Parcours prospect" — reprend les 5 vrais paliers de Contact.Stage,
// avec un aperçu de la donnée clé de chaque étape.
const PARCOURS_STEPS: { key: Stage; label: string; subtitle: string }[] = [
  { key: 'PRISE_DE_CONTACT', label: 'Prise de Contact', subtitle: 'Source : Appel à froid' },
  { key: 'QUALIFICATION', label: 'Qualification', subtitle: 'Besoins identifiés' },
  { key: 'ECHANGES', label: 'Échanges', subtitle: 'Réunion de cadrage' },
  { key: 'CHIFFRAGE_OFFRE', label: 'Chiffrage & Offre', subtitle: '1 600 000 FCFA' },
  { key: 'CONVERSION_CLIENT', label: 'Conversion Client', subtitle: 'Convertir en Client' },
];

const NEXT_ACTION = {
  description: 'Relance programmée pour la présentation du devis et le suivi de la proposition commerciale.',
  date: '2026-08-25',
};

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
  jpg: 'image',
  png: 'image',
};

const INTERACTIONS: Interaction[] = [
  {
    id: 1,
    stage: 'PRISE_DE_CONTACT',
    type: 'CALL',
    title: 'Premier contact découverte',
    date: '12 août 2026, 09:10',
    note: "Premier appel de découverte, présentation de l'agence et de nos services.",
  },
  {
    id: 2,
    stage: 'QUALIFICATION',
    type: 'MESSAGE',
    title: "Confirmation d'intérêt",
    date: '13 août 2026, 15:40',
    note: "Confirmation par SMS de l'intérêt pour une campagne digitale de rentrée.",
  },
  {
    id: 3,
    stage: 'ECHANGES',
    type: 'MEETING',
    title: 'Réunion de cadrage',
    date: '16 août 2026, 10:00',
    note: 'Réunion de cadrage : objectifs de la campagne, cibles prioritaires, enveloppe budgétaire envisagée.',
    attachment: { name: 'Compte-rendu_reunion_cadrage.docx', extension: 'docx' },
  },
  {
    id: 4,
    stage: 'ECHANGES',
    type: 'EMAIL',
    title: 'Envoi du brief et calendrier',
    date: '18 août 2026, 08:30',
    note: 'Envoi du brief détaillé et du calendrier prévisionnel de diffusion.',
    attachment: { name: 'Brief_Campagne_Rentree.pdf', extension: 'pdf' },
  },
  {
    id: 5,
    stage: 'CHIFFRAGE_OFFRE',
    type: 'CALL',
    title: 'Présentation du devis',
    date: '20 août 2026, 11:00',
    note: 'Présentation du devis — retour positif sur le tarif, en attente de validation interne côté client.',
    attachment: { name: 'Devis_EAB_2026.pdf', extension: 'pdf' },
  },
];

const PROSPECT = {
  name: 'Alassane Boubacar',
  role: 'Gérant',
  company: 'Ets Alassane Boubacar',
  sector: 'Commerce',
  phone: '+227 96 12 34 56',
  email: 'contact@eab.ne',
  address: 'Quartier Plateau, Niamey',
  source: 'Appel à froid',
  score: 78,
  createdAt: '12 août 2026',
  commercial: 'Franklin Roosevelt',
  besoin: 'Lancer une campagne digitale pour la rentrée commerciale, avec un accent sur les réseaux sociaux et le référencement local.',
};

const OPPORTUNITE = {
  name: 'Campagne digitale — rentrée',
  budget: '1 600 000 FCFA',
  requiresDeposit: true,
  depositAmount: '300 000 FCFA',
  status: 'Nouveau',
};

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const CARD_CLASSES = 'bg-white rounded-xl border border-outline-variant';

export default function ProspectTemplatePage() {
  const navigate = useNavigate();
  const currentStageIndex = STAGE_DEFS.findIndex((s) => s.key === CURRENT_STAGE);
  const currentParcoursIndex = PARCOURS_STEPS.findIndex((s) => s.key === CURRENT_STAGE);

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-outline-variant">
        <span className="text-xs font-bold text-on-surface">Gabarit 1 (Standard)</span>
        <button
          type="button"
          onClick={() => navigate('/templates/prospect-2')}
          className="px-3 py-1.5 text-xs font-bold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1.5"
        >
          <span>Découvrir le Gabarit 2 (Fiche CV &amp; Interactions riches)</span>
          <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
        {/* Colonne gauche — façon CV : photo, identité, infos */}
        <aside className="lg:col-span-4 space-y-5">
          <div className={`${CARD_CLASSES} overflow-hidden shadow-sm`}>
            <div className="h-20 bg-[linear-gradient(120deg,#680200_0%,#8a1a0e_100%)]" />
            <div className="px-6 pb-6 -mt-12 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-2xl font-bold border-4 border-white shadow-md shrink-0">
                {getInitials(PROSPECT.name)}
              </div>
              <h2 className="font-headline-md text-lg font-bold text-on-surface mt-3">{PROSPECT.name}</h2>
              <p className="text-sm text-secondary">{PROSPECT.role}</p>
              <p className="text-sm font-semibold text-primary mt-0.5">{PROSPECT.company}</p>

              <span className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${STAGE_DEFS[currentStageIndex].bg} ${STAGE_DEFS[currentStageIndex].text}`}>
                <span className="material-symbols-outlined text-[14px]">{STAGE_DEFS[currentStageIndex].icon}</span>
                {STAGE_DEFS[currentStageIndex].label}
              </span>

              <div className="w-full mt-5 pt-5 border-t border-outline-variant space-y-3 text-left">
                <div className="flex items-center gap-2.5 text-sm">
                  <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">call</span>
                  <span className="text-on-surface">{PROSPECT.phone}</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm">
                  <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">mail</span>
                  <span className="text-on-surface truncate">{PROSPECT.email}</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm">
                  <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">location_on</span>
                  <span className="text-on-surface">{PROSPECT.address}</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm">
                  <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">business_center</span>
                  <span className="text-on-surface">{PROSPECT.sector}</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm">
                  <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">campaign</span>
                  <span className="text-on-surface">Source : {PROSPECT.source}</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm">
                  <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">event</span>
                  <span className="text-on-surface">Enregistré le {PROSPECT.createdAt}</span>
                </div>
              </div>

              <div className="w-full mt-5 pt-5 border-t border-outline-variant">
                <p className="text-[10px] font-bold uppercase tracking-widest text-secondary text-left mb-2">Commercial assigné</p>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-xs font-bold shrink-0">
                    {getInitials(PROSPECT.commercial)}
                  </div>
                  <span className="text-sm font-semibold text-on-surface">{PROSPECT.commercial}</span>
                </div>
              </div>

              <div className="w-full mt-5 pt-5 border-t border-outline-variant">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">Score du prospect</p>
                  <span className="text-sm font-bold text-primary">{PROSPECT.score}/100</span>
                </div>
                <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${PROSPECT.score}%` }} />
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Colonne droite — parcours, interactions, opportunité */}
        <div className="lg:col-span-8 flex flex-col gap-gutter">
          {/* Parcours prospect & entonnoir commercial */}
          <div className={`${CARD_CLASSES} p-5`}>
            <div className="flex items-center justify-between gap-3 mb-5">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-primary">
                Parcours prospect &amp; entonnoir commercial Iman
              </h3>
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide bg-primary/5 border border-primary/20 text-primary px-2.5 py-1 rounded-full">
                Statut : {STAGE_DEFS[currentStageIndex].label}
              </span>
            </div>

            <div className="flex items-start">
              {PARCOURS_STEPS.flatMap((step, index) => {
                const isReached = index <= currentParcoursIndex;
                const card = (
                  <div className="flex flex-col items-center gap-1.5 shrink-0 w-28" key={step.key}>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${
                        isReached ? 'bg-primary text-white' : 'bg-surface-container-high text-secondary'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span className={`text-xs font-bold text-center leading-tight ${isReached ? 'text-on-surface' : 'text-secondary'}`}>
                      {step.label}
                    </span>
                    <span className="text-[10px] text-secondary text-center leading-tight">{step.subtitle}</span>
                  </div>
                );
                if (index === PARCOURS_STEPS.length - 1) return [card];
                const connectorDone = index < currentParcoursIndex;
                const connector = (
                  <div
                    className={`flex-1 min-w-[12px] h-0.5 mt-4 mx-1 rounded-full ${connectorDone ? 'bg-primary' : 'bg-outline-variant/40'}`}
                    key={`${step.key}-connector`}
                  />
                );
                return [card, connector];
              })}
            </div>

            <div className="mt-6 flex items-start justify-between gap-4 rounded-lg border border-outline-variant/70 p-3.5 bg-surface-container-low/50">
              <p className="text-sm text-on-surface-variant leading-relaxed">
                <span className="mr-1.5">💡</span>
                <span className="font-bold text-on-surface">Prochaine action système : </span>
                {NEXT_ACTION.description}
              </p>
              <span className="shrink-0 text-xs font-bold bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full">
                {NEXT_ACTION.date}
              </span>
            </div>
          </div>

          {/* Besoin exprimé */}
          <div className={`${CARD_CLASSES} p-5 bg-primary-fixed/10 border-primary/20`}>
            <h3 className="font-headline-md text-base font-bold text-primary mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">lightbulb</span>
              Besoin exprimé
            </h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">« {PROSPECT.besoin} »</p>
          </div>

          {/* Historique des interactions, par étape */}
          <div className={`${CARD_CLASSES} p-5`}>
            <h3 className="font-headline-md text-base font-bold text-on-surface mb-5">Historique des interactions</h3>
            <div className="flex flex-col gap-5">
              {STAGE_DEFS.map((stage) => {
                const stageInteractions = INTERACTIONS.filter((item) => item.stage === stage.key);
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
                      {stageInteractions.map((item) => {
                        const meta = INTERACTION_TYPE_META[item.type];
                        return (
                          <div className="flex items-start gap-3 bg-surface-container-low/60 rounded-lg p-3" key={item.id}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${stage.bg} ${stage.text}`}>
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
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Opportunité liée */}
          <div className={`${CARD_CLASSES} p-5`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline-md text-base font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">emoji_objects</span>
                Opportunité liée
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wide bg-primary/5 border border-primary/20 text-primary px-2.5 py-1 rounded-full">
                {OPPORTUNITE.status}
              </span>
            </div>
            <p className="text-sm font-semibold text-on-surface mb-3">{OPPORTUNITE.name}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-secondary">Budget</p>
                <p className="text-sm font-bold text-on-surface mt-0.5">{OPPORTUNITE.budget}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-secondary">Acompte</p>
                <p className="text-sm font-bold text-on-surface mt-0.5">
                  {OPPORTUNITE.requiresDeposit ? OPPORTUNITE.depositAmount : 'Non requis'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
