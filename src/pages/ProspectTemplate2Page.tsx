import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import CelebrationModal from '../components/CelebrationModal';
import Modal from '../components/ui/Modal';

type Stage = 'PRISE_DE_CONTACT' | 'QUALIFICATION' | 'ECHANGES' | 'CHIFFRAGE_OFFRE' | 'CONVERSION_CLIENT';
type InteractionType = 'CALL' | 'MEETING' | 'EMAIL' | 'MESSAGE';

interface Attachment {
  id: string;
  name: string;
  extension: 'pdf' | 'docx' | 'xlsx' | 'png' | 'jpg';
  size: string;
  uploadedAt: string;
  url?: string;
}

interface InteractionItem {
  id: number;
  stage: Stage;
  type: InteractionType;
  title: string;
  date: string;
  time: string;
  author: string;
  outcome?: string;
  outcomeType?: 'success' | 'warning' | 'info';
  note: string;
  attachments?: Attachment[];
}

interface TaskItem {
  id: number;
  label: string;
  dueDate: string;
  completed: boolean;
  priority: 'high' | 'normal';
}

interface CalendarEventItem {
  id: number;
  title: string;
  date: string;
  day: string;
  month: string;
  time: string;
  location: string;
  type: 'MEETING' | 'CALL';
}

const STAGE_DEFS: {
  key: Stage;
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
  bg: string;
  border: string;
  dot: string;
  summary: string;
}[] = [
  {
    key: 'PRISE_DE_CONTACT',
    label: '1. Prise de Contact',
    shortLabel: 'Prise de contact',
    icon: 'call',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    dot: 'bg-red-500',
    summary: 'Premier échange téléphonique & cadrage initial',
  },
  {
    key: 'QUALIFICATION',
    label: '2. Qualification',
    shortLabel: 'Qualification',
    icon: 'psychology',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    summary: 'Validation des besoins, budget & décisionnaire',
  },
  {
    key: 'ECHANGES',
    label: '3. Échanges & Cadrage',
    shortLabel: 'Échanges',
    icon: 'forum',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
    summary: 'Réunions de travail, ateliers & envoi du brief',
  },
  {
    key: 'CHIFFRAGE_OFFRE',
    label: '4. Chiffrage & Offre',
    shortLabel: 'Chiffrage & Offre',
    icon: 'request_quote',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
    summary: 'Élaboration du devis, négociation & suivi',
  },
  {
    key: 'CONVERSION_CLIENT',
    label: '5. Conversion Client',
    shortLabel: 'Conversion',
    icon: 'workspace_premium',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    summary: 'Signature de contrat & versement de l’acompte',
  },
];

const INTERACTION_TYPE_META: Record<InteractionType, { label: string; icon: string; bg: string; text: string }> = {
  CALL: { label: 'Appel téléphonique', icon: 'call', bg: 'bg-rose-100', text: 'text-rose-800' },
  MEETING: { label: 'Réunion / Cadrage', icon: 'groups', bg: 'bg-blue-100', text: 'text-blue-800' },
  EMAIL: { label: 'Email officiel', icon: 'mail', bg: 'bg-purple-100', text: 'text-purple-800' },
  MESSAGE: { label: 'WhatsApp / SMS', icon: 'sms', bg: 'bg-emerald-100', text: 'text-emerald-800' },
};

const ATTACHMENT_META: Record<string, { icon: string; bg: string; text: string; label: string }> = {
  pdf: { icon: 'picture_as_pdf', bg: 'bg-red-50 text-red-700 border-red-200', text: 'text-red-700', label: 'Document PDF' },
  docx: { icon: 'description', bg: 'bg-blue-50 text-blue-700 border-blue-200', text: 'text-blue-700', label: 'Word (DOCX)' },
  xlsx: { icon: 'table_chart', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-700', label: 'Excel (XLSX)' },
  png: { icon: 'image', bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-700', label: 'Image PNG' },
  jpg: { icon: 'image', bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-700', label: 'Image JPG' },
};

const INITIAL_PROSPECT = {
  id: 104,
  civility: 'M.',
  fullName: 'Alassane Boubacar',
  role: 'Directeur Général & Fondateur',
  company: 'Ets Alassane Boubacar SARL',
  legalStatus: 'SARL au capital de 10 000 000 FCFA',
  sector: 'Distribution & Commerce de gros',
  category: 'Grand Compte B2B',
  phone: '+227 96 12 34 56',
  whatsapp: '+227 96 12 34 56',
  email: 'a.boubacar@eab-distribution.ne',
  emailSec: 'direction@eab-distribution.ne',
  website: 'www.eab-distribution.ne',
  address: 'Avenue de la République, Quartier Plateau, Niamey - Niger',
  city: 'Niamey',
  country: 'Niger',
  source: 'Appel entrant & Recommandation',
  currentStage: 'CHIFFRAGE_OFFRE' as Stage,
  score: 85,
  scoreLabel: 'Prospect Très Chaud',
  createdAt: '12 août 2026',
  assignedCommercial: {
    name: 'Franklin Roosevelt',
    role: 'Chargé d’Affaires Senior',
    email: 'f.roosevelt@iman.agency',
    phone: '+227 90 00 11 22',
    avatar: 'FR',
  },
  decisionMaker: 'Oui (Décisionnaire direct et signataire)',
  estimatedBudget: '1 600 000 FCFA',
  targetDeadline: '15 Septembre 2026',
  tags: [
    'Campagne Digitale',
    'Réseaux Sociaux',
    'Identité Visuelle',
    'Sponsoring Radio',
    'Acompte 30%',
    'Décisionnaire Direct',
  ],
  besoinSynthese:
    'Lancer une campagne marketing omnicanale intensive pour la rentrée commerciale 2026 (Septembre-Novembre) : gestion et animation des pages réseaux sociaux (Meta & LinkedIn), création de 15 visuels publicitaires, spot radio 30s et référencement sponsorisé.',
  pointsVigilance: [
    'Sensible aux délais d’exécution stricts avant la première quinzaine de septembre.',
    'Exige un compte-rendu hebdomadaire des performances et des statistiques de conversion.',
    'Conditionne le lancement à la réception de l’acompte validé par le DAF.',
  ],
};

const INITIAL_INTERACTIONS: InteractionItem[] = [
  {
    id: 1,
    stage: 'PRISE_DE_CONTACT',
    type: 'CALL',
    title: 'Premier contact & qualification initiale',
    date: '12 août 2026',
    time: '09:15',
    author: 'Franklin Roosevelt',
    outcome: 'Intérêt très fort confirmé',
    outcomeType: 'success',
    note: 'Appel d’environ 20 minutes avec M. Boubacar. Il souhaite moderniser la communication globale de ses établissements pour la rentrée. Présentation de notre portfolio et accord pour planifier un atelier de cadrage approfondi.',
    attachments: [
      {
        id: 'att-1',
        name: 'Plaquette_Commerciale_Iman_2026.pdf',
        extension: 'pdf',
        size: '2.4 Mo',
        uploadedAt: '12/08/2026 09:35',
      },
    ],
  },
  {
    id: 2,
    stage: 'QUALIFICATION',
    type: 'MESSAGE',
    title: 'Échange WhatsApp — Confirmation des éléments clés',
    date: '13 août 2026',
    time: '15:40',
    author: 'Franklin Roosevelt',
    outcome: 'Budget prévisionnel cadré',
    outcomeType: 'info',
    note: 'Confirmation par message instantané des enveloppes budgétaires prévues (environ 1.5M - 1.8M FCFA) et des dates de disponibilité pour la réunion physique au siège.',
  },
  {
    id: 3,
    stage: 'ECHANGES',
    type: 'MEETING',
    title: 'Réunion de cadrage & Définition du brief au siège',
    date: '16 août 2026',
    time: '10:00 - 11:30',
    author: 'Franklin Roosevelt & Équipe Créative',
    outcome: 'Objectifs et canaux validés',
    outcomeType: 'success',
    note: 'Séance de travail en présence de M. Boubacar et de son responsable marketing. Analyse des cibles B2B et B2C, calendrier de diffusion arrêté du 15 septembre au 15 novembre. Rédaction conjointe du cahier des charges.',
    attachments: [
      {
        id: 'att-2',
        name: 'Compte_Rendu_Reunion_Cadrage_EAB.docx',
        extension: 'docx',
        size: '480 Ko',
        uploadedAt: '16/08/2026 14:10',
      },
      {
        id: 'att-3',
        name: 'Grille_Besoins_Campagne_Rentree.xlsx',
        extension: 'xlsx',
        size: '215 Ko',
        uploadedAt: '16/08/2026 14:12',
      },
    ],
  },
  {
    id: 4,
    stage: 'ECHANGES',
    type: 'EMAIL',
    title: 'Transmission du cahier des charges & planning prévisionnel',
    date: '18 août 2026',
    time: '08:45',
    author: 'Franklin Roosevelt',
    outcome: 'Validation écrite reçue sous 24h',
    outcomeType: 'success',
    note: 'Envoi par courriel officiel du brief technique consolidé avec le rétroplanning de production graphique et la stratégie média. M. Boubacar a répondu avec son accord complet pour passer au chiffrage.',
    attachments: [
      {
        id: 'att-4',
        name: 'Brief_Technique_Consolide_Rentree.pdf',
        extension: 'pdf',
        size: '1.8 Mo',
        uploadedAt: '18/08/2026 08:45',
      },
    ],
  },
  {
    id: 5,
    stage: 'CHIFFRAGE_OFFRE',
    type: 'CALL',
    title: 'Présentation de l’offre financière et devis n° DEV-2026-084',
    date: '20 août 2026',
    time: '11:00',
    author: 'Franklin Roosevelt',
    outcome: 'En attente validation acompte',
    outcomeType: 'warning',
    note: 'Revue détaillée poste par poste de la proposition de 1 600 000 FCFA. M. Boubacar apprécie la structure de l’offre. Transmission au service comptable pour ordonnancer l’acompte de 300 000 FCFA nécessaire au démarrage.',
    attachments: [
      {
        id: 'att-5',
        name: 'Devis_DEV-2026-084_Ets_Boubacar.pdf',
        extension: 'pdf',
        size: '1.2 Mo',
        uploadedAt: '20/08/2026 10:50',
      },
      {
        id: 'att-6',
        name: 'Annexe_Prestations_Graphisme_Media.pdf',
        extension: 'pdf',
        size: '890 Ko',
        uploadedAt: '20/08/2026 10:52',
      },
    ],
  },
];

const INITIAL_TASKS: TaskItem[] = [
  { id: 1, label: 'Relancer M. Boubacar sur la signature du devis', dueDate: '25 août 2026', completed: false, priority: 'high' },
  { id: 2, label: 'Transmettre le RIB agence au service comptabilité EAB', dueDate: '25 août 2026', completed: true, priority: 'normal' },
  { id: 3, label: 'Préparer le template de contrat de prestation de service', dueDate: '27 août 2026', completed: false, priority: 'normal' },
  { id: 4, label: 'Briefer le pôle Graphisme dès confirmation de l’acompte', dueDate: '28 août 2026', completed: false, priority: 'high' },
];

const INITIAL_EVENTS: CalendarEventItem[] = [
  {
    id: 1,
    title: 'Point téléphonique de validation devis & acompte',
    date: '2026-08-25',
    day: '25',
    month: 'AOÛT',
    time: '10:30 - 11:00',
    location: 'Appel direct (+227 96 12 34 56)',
    type: 'CALL',
  },
  {
    id: 2,
    title: 'Réunion de lancement / Kickoff de production',
    date: '2026-09-02',
    day: '02',
    month: 'SEPT',
    time: '15:00 - 16:30',
    location: 'Salle de réunion Iman Agency',
    type: 'MEETING',
  },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function ProspectTemplate2Page() {
  const navigate = useNavigate();

  // État du prospect
  const [prospect, setProspect] = useState(INITIAL_PROSPECT);
  const [interactions, setInteractions] = useState<InteractionItem[]>(INITIAL_INTERACTIONS);
  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS);
  const [events] = useState<CalendarEventItem[]>(INITIAL_EVENTS);

  // Filtres d'interactions
  const [stageFilter, setStageFilter] = useState<Stage | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<InteractionType | 'ALL'>('ALL');
  const [onlyWithAttachments, setOnlyWithAttachments] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & dialogues
  const [isNewInteractionOpen, setIsNewInteractionOpen] = useState(false);
  const [isRelanceOpen, setIsRelanceOpen] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [nextRelanceDate, setNextRelanceDate] = useState('2026-08-25T10:30');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Formulaire nouvelle interaction
  const [newType, setNewType] = useState<InteractionType>('CALL');
  const [newStage, setNewStage] = useState<Stage>(prospect.currentStage);
  const [newTitle, setNewTitle] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newOutcome, setNewOutcome] = useState('');
  const [newOutcomeType, setNewOutcomeType] = useState<'success' | 'warning' | 'info'>('info');
  const [newAttachmentName, setNewAttachmentName] = useState('');
  const [newAttachmentExt, setNewAttachmentExt] = useState<'pdf' | 'docx' | 'xlsx' | 'png'>('pdf');

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  }

  function handleToggleTask(taskId: number) {
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, completed: !task.completed } : task)),
    );
  }

  function handleConvert() {
    setIsConverting(true);
    setTimeout(() => {
      setIsConverting(false);
      setProspect((prev) => ({
        ...prev,
        currentStage: 'CONVERSION_CLIENT',
        score: 100,
        scoreLabel: 'Client Converti',
      }));
      setShowCelebration(true);
    }, 600);
  }

  function handleSaveRelance(e: FormEvent) {
    e.preventDefault();
    setIsRelanceOpen(false);
    showToast('Relance commerciale reprogrammée avec succès pour le ' + new Date(nextRelanceDate).toLocaleString('fr-FR'));
  }

  function handleCreateInteraction(e: FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !newNote.trim()) return;

    const newAttachmentsList: Attachment[] = [];
    if (newAttachmentName.trim()) {
      newAttachmentsList.push({
        id: `att-${Date.now()}`,
        name: newAttachmentName.trim().endsWith(`.${newAttachmentExt}`)
          ? newAttachmentName.trim()
          : `${newAttachmentName.trim()}.${newAttachmentExt}`,
        extension: newAttachmentExt,
        size: '1.1 Mo',
        uploadedAt: new Date().toLocaleDateString('fr-FR') + ' ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      });
    }

    const created: InteractionItem = {
      id: Date.now(),
      stage: newStage,
      type: newType,
      title: newTitle.trim(),
      date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      author: prospect.assignedCommercial.name,
      outcome: newOutcome.trim() || undefined,
      outcomeType: newOutcomeType,
      note: newNote.trim(),
      attachments: newAttachmentsList.length > 0 ? newAttachmentsList : undefined,
    };

    setInteractions((prev) => [created, ...prev]);
    setIsNewInteractionOpen(false);
    setNewTitle('');
    setNewNote('');
    setNewOutcome('');
    setNewAttachmentName('');
    showToast('Nouvelle interaction enregistrée avec succès.');
  }

  // Filtrage des interactions
  const filteredInteractions = interactions.filter((item) => {
    if (stageFilter !== 'ALL' && item.stage !== stageFilter) return false;
    if (typeFilter !== 'ALL' && item.type !== typeFilter) return false;
    if (onlyWithAttachments && (!item.attachments || item.attachments.length === 0)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchNote = item.note.toLowerCase().includes(q);
      const matchOutcome = item.outcome?.toLowerCase().includes(q) ?? false;
      const matchAtt = item.attachments?.some((a) => a.name.toLowerCase().includes(q)) ?? false;
      if (!matchTitle && !matchNote && !matchOutcome && !matchAtt) return false;
    }
    return true;
  });

  const currentStageIndex = STAGE_DEFS.findIndex((s) => s.key === prospect.currentStage);
  const totalAttachmentsCount = interactions.reduce((acc, curr) => acc + (curr.attachments?.length ?? 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Toast de notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-inverse-surface text-white px-4 py-3 rounded-lg shadow-xl border border-outline/30 animate-bounce">
          <span className="material-symbols-outlined text-[20px] text-emerald-400">check_circle</span>
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Barre d'en-tête & Switch de Gabarits */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-outline-variant shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[22px]">badge</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Gabarit v2 • Fiche Contact &amp; CV Prospect</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-200">
                PROPOSITION INTERACTION &amp; PIÈCES JOINTES
              </span>
            </div>
            <h1 className="text-base font-bold text-on-surface">
              Dossier Commercial Individuel : {prospect.fullName}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/templates/prospect')}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-outline-variant text-secondary hover:bg-surface-container-low transition-colors flex items-center gap-1.5"
            title="Basculer vers le template 1 initial"
          >
            <span className="material-symbols-outlined text-[15px]">compare_arrows</span>
            Gabarit 1 (Standard)
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[15px]">print</span>
            Imprimer Fiche
          </button>
          <button
            type="button"
            onClick={() => setIsNewInteractionOpen(true)}
            className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-primary text-white hover:bg-primary/90 transition-transform active:scale-95 flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">add_comment</span>
            Ajouter un échange
          </button>
          <button
            type="button"
            disabled={isConverting}
            onClick={handleConvert}
            className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-transform active:scale-95 flex items-center gap-1.5 shadow-sm disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
            {isConverting ? 'Conversion...' : 'Convertir en Client'}
          </button>
        </div>
      </div>

      {/* Bannière Entonnoir / Stepper de progression par étape */}
      <div className="bg-white rounded-xl border border-outline-variant p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5 border-b border-outline-variant/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">timeline</span>
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-on-surface">
              Parcours de Prospection &amp; Entonnoir Commercial
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-secondary">Étape actuelle :</span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${STAGE_DEFS[currentStageIndex].bg} ${STAGE_DEFS[currentStageIndex].color} border ${STAGE_DEFS[currentStageIndex].border}`}>
              <span className="material-symbols-outlined text-[15px]">{STAGE_DEFS[currentStageIndex].icon}</span>
              {STAGE_DEFS[currentStageIndex].shortLabel}
            </span>
          </div>
        </div>

        {/* Visual Stepper */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {STAGE_DEFS.map((stage, idx) => {
            const isCompleted = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            const stageInteractionsCount = interactions.filter((i) => i.stage === stage.key).length;

            return (
              <button
                key={stage.key}
                type="button"
                onClick={() => setStageFilter(stageFilter === stage.key ? 'ALL' : stage.key)}
                className={`group relative text-left p-3.5 rounded-xl border transition-all ${
                  isCurrent
                    ? 'border-primary bg-primary/[0.03] ring-2 ring-primary/20 shadow-sm'
                    : isCompleted
                    ? 'border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50'
                    : 'border-outline-variant/60 bg-surface-container-low/40 hover:bg-surface-container-low opacity-75'
                } ${stageFilter === stage.key ? 'ring-2 ring-primary' : ''}`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                      isCompleted
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-surface-container-high text-secondary'
                    }`}
                  >
                    {isCompleted ? (
                      <span className="material-symbols-outlined text-[15px]">check</span>
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                      isCompleted
                        ? 'bg-emerald-100 text-emerald-800'
                        : isCurrent
                        ? 'bg-primary/10 text-primary animate-pulse'
                        : 'bg-surface-container text-secondary'
                    }`}
                  >
                    {isCompleted ? 'Validé' : isCurrent ? 'En cours' : 'À venir'}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <h3
                    className={`text-xs font-bold line-clamp-1 ${
                      isCurrent ? 'text-primary' : isCompleted ? 'text-emerald-950' : 'text-secondary'
                    }`}
                  >
                    {stage.shortLabel}
                  </h3>
                  <p className="text-[11px] text-secondary line-clamp-2 leading-relaxed">
                    {stage.summary}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-outline-variant/40 flex items-center justify-between text-[10px] text-secondary">
                  <span className="font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">forum</span>
                    {stageInteractionsCount} échange{stageInteractionsCount > 1 ? 's' : ''}
                  </span>
                  {stageFilter === stage.key && (
                    <span className="text-primary font-bold">Filtre actif</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grille Principale : Style Fiche CV Contact (Gauche) + Timeline & Affaires (Droite) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================= */}
        {/* COLONNE GAUCHE (4 col) : FICHE DE CONTACT PROSPECT (FAÇON CV) */}
        {/* ========================================================= */}
        <aside className="lg:col-span-4 space-y-5">
          {/* Carte Principale Style CV */}
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
            {/* Header / Bannière CV */}
            <div className="h-28 bg-[linear-gradient(135deg,#680200_0%,#8a1a0e_60%,#3d0100_100%)] relative p-4 flex items-start justify-between">
              <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Contact Actif B2B
              </span>
              <span className="text-white/80 text-[11px] font-mono">
                ID #{prospect.id}
              </span>
            </div>

            {/* Corps Identité CV */}
            <div className="px-5 pb-6 -mt-14 flex flex-col items-center text-center">
              {/* Photo / Avatar avec Ring */}
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl bg-primary-container text-on-primary flex items-center justify-center text-3xl font-extrabold border-4 border-white shadow-lg shrink-0">
                  {getInitials(prospect.fullName)}
                </div>
                <div
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white text-[14px]"
                  title="Contact Décisionnaire direct"
                >
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                </div>
              </div>

              {/* Nom & Titre façon CV */}
              <h2 className="font-headline-md text-xl font-extrabold text-on-surface mt-3">
                {prospect.civility} {prospect.fullName}
              </h2>
              <p className="text-xs font-bold text-secondary uppercase tracking-wide mt-0.5">
                {prospect.role}
              </p>
              <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-primary">
                <span className="material-symbols-outlined text-[16px]">domain</span>
                <span>{prospect.company}</span>
              </div>
              <p className="text-[11px] text-secondary mt-0.5">{prospect.legalStatus}</p>

              {/* Jauge Score / Température Lead */}
              <div className="w-full mt-4 p-3 bg-surface-container-low rounded-xl border border-outline-variant/60 flex items-center justify-between">
                <div className="text-left">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-secondary">Score d’engagement</p>
                  <p className="text-xs font-extrabold text-primary">{prospect.scoreLabel}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-surface-container-high h-2.5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${prospect.score}%` }} />
                  </div>
                  <span className="text-xs font-bold text-on-surface">{prospect.score}%</span>
                </div>
              </div>

              {/* COORDONNÉES DIRECTES (Style CV) */}
              <div className="w-full mt-5 pt-4 border-t border-outline-variant/70 space-y-2.5 text-left">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-secondary flex items-center gap-1 mb-1">
                  <span className="material-symbols-outlined text-[14px]">contact_phone</span>
                  Coordonnées directes
                </p>

                <a
                  href={`tel:${prospect.phone}`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-container-low border border-transparent hover:border-outline-variant transition-all text-xs group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[15px]">call</span>
                    </div>
                    <span className="font-semibold text-on-surface">{prospect.phone}</span>
                  </div>
                  <span className="text-[10px] text-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity">Appeler</span>
                </a>

                <a
                  href={`https://wa.me/${prospect.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-container-low border border-transparent hover:border-outline-variant transition-all text-xs group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[15px]">chat</span>
                    </div>
                    <span className="font-semibold text-on-surface">{prospect.whatsapp}</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">WhatsApp</span>
                </a>

                <a
                  href={`mailto:${prospect.email}`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-container-low border border-transparent hover:border-outline-variant transition-all text-xs group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[15px]">mail</span>
                    </div>
                    <span className="font-semibold text-on-surface truncate">{prospect.email}</span>
                  </div>
                  <span className="text-[10px] text-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity shrink-0">Écrire</span>
                </a>

                <div className="flex items-start gap-2.5 p-2 text-xs">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[15px]">location_on</span>
                  </div>
                  <div>
                    <span className="font-semibold text-on-surface block">{prospect.address}</span>
                    <span className="text-[11px] text-secondary">{prospect.city}, {prospect.country}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-2 text-xs">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[15px]">language</span>
                  </div>
                  <span className="font-semibold text-on-surface">{prospect.website}</span>
                </div>
              </div>

              {/* PROFIL COMMERCIAL & DÉCISION (Style CV) */}
              <div className="w-full mt-4 pt-4 border-t border-outline-variant/70 space-y-2.5 text-left">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-secondary flex items-center gap-1 mb-1">
                  <span className="material-symbols-outlined text-[14px]">psychology</span>
                  Profil &amp; Pouvoir de Décision
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-surface-container-low rounded-lg border border-outline-variant/50">
                    <p className="text-[10px] text-secondary font-bold uppercase">Secteur</p>
                    <p className="font-semibold text-on-surface mt-0.5 line-clamp-1">{prospect.sector}</p>
                  </div>
                  <div className="p-2.5 bg-surface-container-low rounded-lg border border-outline-variant/50">
                    <p className="text-[10px] text-secondary font-bold uppercase">Source</p>
                    <p className="font-semibold text-on-surface mt-0.5 line-clamp-1">{prospect.source}</p>
                  </div>
                  <div className="p-2.5 bg-surface-container-low rounded-lg border border-outline-variant/50">
                    <p className="text-[10px] text-secondary font-bold uppercase">Budget Estimé</p>
                    <p className="font-extrabold text-primary mt-0.5">{prospect.estimatedBudget}</p>
                  </div>
                  <div className="p-2.5 bg-surface-container-low rounded-lg border border-outline-variant/50">
                    <p className="text-[10px] text-secondary font-bold uppercase">Échéance Clé</p>
                    <p className="font-semibold text-on-surface mt-0.5">{prospect.targetDeadline}</p>
                  </div>
                </div>

                <div className="p-2.5 bg-surface-container-low rounded-lg border border-outline-variant/50 text-xs">
                  <span className="text-[10px] text-secondary font-bold uppercase block">Rôle dans l’achat :</span>
                  <span className="font-semibold text-on-surface">{prospect.decisionMaker}</span>
                </div>
              </div>

              {/* TAGS / COMPÉTENCES & CENTRES D'INTÉRÊT (Style CV) */}
              <div className="w-full mt-4 pt-4 border-t border-outline-variant/70 text-left">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-secondary flex items-center gap-1 mb-2">
                  <span className="material-symbols-outlined text-[14px]">sell</span>
                  Mots-clés &amp; Besoins identifiés
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {prospect.tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-primary/5 text-primary border border-primary/20 px-2 py-0.5 rounded-md text-[11px] font-semibold"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* COMMERCIAL EN CHARGE DU DOSSIER */}
              <div className="w-full mt-4 pt-4 border-t border-outline-variant/70 text-left">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-secondary mb-2">
                  Conseiller Commercial Référent
                </p>
                <div className="flex items-center gap-3 p-2.5 bg-surface-container-low rounded-xl border border-outline-variant/50">
                  <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                    {prospect.assignedCommercial.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-on-surface truncate">{prospect.assignedCommercial.name}</p>
                    <p className="text-[11px] text-secondary truncate">{prospect.assignedCommercial.role}</p>
                    <p className="text-[10px] text-primary font-medium">{prospect.assignedCommercial.phone}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Points de Vigilance & Notes Stratégiques */}
          <div className="bg-white rounded-xl border border-outline-variant p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">crisis_alert</span>
              Points de Vigilance Commerciale
            </h3>
            <ul className="space-y-2 text-xs text-on-surface-variant">
              {prospect.pointsVigilance.map((point, index) => (
                <li key={index} className="flex items-start gap-2 bg-amber-50/60 p-2 rounded-lg border border-amber-200/60">
                  <span className="text-amber-700 font-bold">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* ========================================================= */}
        {/* COLONNE DROITE (8 col) : HISTORIQUE INTERACTIONS PAR ÉTAPE, AFFAIRES, PIÈCES JOINTES */}
        {/* ========================================================= */}
        <div className="lg:col-span-8 space-y-6">
          {/* BANNIÈRE PROCHAINE ACTION / RELANCE PRIORITAIRE */}
          <div className="bg-gradient-to-r from-red-900 to-primary text-white rounded-xl p-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
                <span className="material-symbols-outlined text-[22px] text-amber-300">notification_important</span>
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-300 block">
                  Prochaine Action Commerciale Requise
                </span>
                <h4 className="text-sm font-bold text-white mt-0.5">
                  Point téléphonique de relance devis n° DEV-2026-084 &amp; validation acompte
                </h4>
                <p className="text-xs text-white/80 mt-1 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[14px]">event</span>
                  Prévu le 25 août 2026 à 10:30
                  <span className="bg-amber-400 text-slate-900 text-[10px] font-extrabold px-1.5 py-0.2 rounded">
                    J - 3
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsRelanceOpen(true)}
                className="px-3 py-1.5 bg-white text-primary rounded-lg text-xs font-bold hover:bg-white/90 transition-all shadow-sm flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[15px]">edit_calendar</span>
                Reprogrammer
              </button>
              <button
                type="button"
                onClick={() => showToast('Relance marquée comme réalisée.')}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold border border-white/20 transition-all"
              >
                Fait
              </button>
            </div>
          </div>

          {/* Synthèse du Besoin Exprimé (Brief Client) */}
          <div className="bg-white rounded-xl border border-primary/20 p-5 shadow-sm bg-primary/[0.015]">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">lightbulb</span>
                Synthèse du Besoin Exprimé &amp; Enjeux
              </h3>
              <span className="text-[11px] font-semibold text-secondary">
                Enregistré lors du cadrage initial
              </span>
            </div>
            <p className="text-sm text-on-surface leading-relaxed italic bg-surface-container-low/60 p-3.5 rounded-lg border border-outline-variant/60">
              « {prospect.besoinSynthese} »
            </p>
          </div>

          {/* SECTION MAJEURE : HISTORIQUE DES INTERACTIONS PAR ÉTAPE (AVEC PIÈCES JOINTES) */}
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
            {/* Header de la section interactions */}
            <div className="p-5 border-b border-outline-variant/80 bg-surface-container-low/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-headline-md text-base font-extrabold text-on-surface">
                      Historique Structuré des Interactions
                    </h3>
                    <span className="bg-primary/10 text-primary font-bold text-xs px-2 py-0.5 rounded-full">
                      {interactions.length} échange{interactions.length > 1 ? 's' : ''}
                    </span>
                    <span className="bg-blue-50 text-blue-700 font-bold text-xs px-2 py-0.5 rounded-full flex items-center gap-1 border border-blue-200">
                      <span className="material-symbols-outlined text-[13px]">attach_file</span>
                      {totalAttachmentsCount} document{totalAttachmentsCount > 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-xs text-secondary mt-0.5">
                    Tous les échanges (appels, réunions, emails, WhatsApp) classés par étape du cycle de vente avec pièces jointes téléchargeables.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsNewInteractionOpen(true)}
                  className="px-3 py-1.5 text-xs font-bold bg-primary text-white rounded-lg hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-sm shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  Nouvel échange
                </button>
              </div>

              {/* Barre de Recherche et Filtres d'interactions */}
              <div className="mt-4 pt-3 border-t border-outline-variant/50 flex flex-wrap items-center gap-2.5">
                {/* Recherche textuelle */}
                <div className="relative flex-1 min-w-[200px]">
                  <span className="material-symbols-outlined text-[16px] text-secondary absolute left-2.5 top-1/2 -translate-y-1/2">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Rechercher un mot-clé, compte-rendu, document..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-outline-variant bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Filtre Type */}
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as InteractionType | 'ALL')}
                  className="text-xs py-1.5 px-2.5 rounded-lg border border-outline-variant bg-white text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">Tous types de contact</option>
                  <option value="CALL">📞 Appels téléphoniques</option>
                  <option value="MEETING">🤝 Réunions &amp; Ateliers</option>
                  <option value="EMAIL">✉️ Emails officiels</option>
                  <option value="MESSAGE">💬 WhatsApp &amp; SMS</option>
                </select>

                {/* Filtre Étape */}
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value as Stage | 'ALL')}
                  className="text-xs py-1.5 px-2.5 rounded-lg border border-outline-variant bg-white text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">Toutes les étapes (1 à 5)</option>
                  {STAGE_DEFS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>

                {/* Toggle Pièces jointes uniquement */}
                <button
                  type="button"
                  onClick={() => setOnlyWithAttachments(!onlyWithAttachments)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition-colors ${
                    onlyWithAttachments
                      ? 'bg-blue-100 text-blue-900 border-blue-300'
                      : 'bg-white text-secondary border-outline-variant hover:bg-surface-container-low'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">attachment</span>
                  Avec pièces jointes ({totalAttachmentsCount})
                </button>

                {(stageFilter !== 'ALL' || typeFilter !== 'ALL' || onlyWithAttachments || searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setStageFilter('ALL');
                      setTypeFilter('ALL');
                      setOnlyWithAttachments(false);
                      setSearchQuery('');
                    }}
                    className="text-xs text-primary font-bold hover:underline"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>
            </div>

            {/* Corps : Affichage groupé par Étape (Stepper timeline) */}
            <div className="p-5 space-y-8">
              {STAGE_DEFS.map((stage) => {
                const stageInteractions = filteredInteractions.filter((i) => i.stage === stage.key);
                if (stageInteractions.length === 0 && (stageFilter !== 'ALL' || onlyWithAttachments || searchQuery)) {
                  return null;
                }

                return (
                  <div key={stage.key} className="relative">
                    {/* En-tête de l'étape */}
                    <div className="flex items-center justify-between gap-3 mb-4 bg-surface-container-low/80 p-2.5 rounded-xl border border-outline-variant/60">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-3 h-3 rounded-full ${stage.dot} ring-4 ring-white shadow-sm`} />
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-on-surface">
                          {stage.label}
                        </h4>
                        <span className="text-[11px] text-secondary">
                          • {stage.summary}
                        </span>
                      </div>
                      <span className="bg-white px-2 py-0.5 rounded-full text-[10px] font-extrabold text-secondary border border-outline-variant shadow-xs">
                        {stageInteractions.length} interaction{stageInteractions.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Liste des interactions de l'étape */}
                    {stageInteractions.length > 0 ? (
                      <div className={`space-y-4 pl-4 ml-1.5 border-l-2 ${stage.border}`}>
                        {stageInteractions.map((item) => {
                          const typeMeta = INTERACTION_TYPE_META[item.type];
                          return (
                            <div
                              key={item.id}
                              className="bg-white rounded-xl border border-outline-variant p-4 hover:border-primary/40 hover:shadow-sm transition-all relative group"
                            >
                              {/* Ligne d'en-tête de l'interaction */}
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                <div className="flex items-start gap-3">
                                  <div
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${typeMeta.bg} ${typeMeta.text} shadow-xs`}
                                  >
                                    <span className="material-symbols-outlined text-[18px]">
                                      {typeMeta.icon}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h5 className="text-sm font-bold text-on-surface">{item.title}</h5>
                                      {item.outcome && (
                                        <span
                                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                            item.outcomeType === 'success'
                                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                              : item.outcomeType === 'warning'
                                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                                              : 'bg-blue-50 text-blue-800 border-blue-200'
                                          }`}
                                        >
                                          {item.outcome}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 text-[11px] text-secondary mt-0.5">
                                      <span className="font-medium flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[13px]">person</span>
                                        {item.author}
                                      </span>
                                      <span>•</span>
                                      <span className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[13px]">schedule</span>
                                        {item.date} à {item.time}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${typeMeta.bg} ${typeMeta.text} shrink-0`}>
                                  {typeMeta.label}
                                </span>
                              </div>

                              {/* Corps de la note / Compte-rendu */}
                              <div className="mt-3 text-xs text-on-surface-variant leading-relaxed bg-surface-container-low/40 p-3 rounded-lg border border-outline-variant/40">
                                {item.note}
                              </div>

                              {/* PIÈCES JOINTES DE L'INTERACTION */}
                              {item.attachments && item.attachments.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-outline-variant/60">
                                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-secondary flex items-center gap-1 mb-2">
                                    <span className="material-symbols-outlined text-[13px] text-primary">attach_file</span>
                                    Pièces jointes associées ({item.attachments.length}) :
                                  </p>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {item.attachments.map((file) => {
                                      const extMeta = ATTACHMENT_META[file.extension] ?? ATTACHMENT_META.pdf;
                                      return (
                                        <div
                                          key={file.id}
                                          className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-outline-variant bg-white hover:bg-surface-container-low/70 transition-all text-xs"
                                        >
                                          <div className="flex items-center gap-2.5 min-w-0">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${extMeta.bg}`}>
                                              <span className="material-symbols-outlined text-[18px]">
                                                {extMeta.icon}
                                              </span>
                                            </div>
                                            <div className="min-w-0">
                                              <p className="font-bold text-on-surface truncate text-xs" title={file.name}>
                                                {file.name}
                                              </p>
                                              <p className="text-[10px] text-secondary">
                                                {file.size} • Ajouté le {file.uploadedAt}
                                              </p>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-1 shrink-0">
                                            <button
                                              type="button"
                                              onClick={() => setPreviewAttachment(file)}
                                              className="p-1.5 text-secondary hover:text-primary rounded hover:bg-white border border-transparent hover:border-outline-variant transition-colors"
                                              title="Aperçu du document"
                                            >
                                              <span className="material-symbols-outlined text-[16px]">visibility</span>
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => showToast(`Téléchargement de ${file.name}...`)}
                                              className="p-1.5 text-secondary hover:text-primary rounded hover:bg-white border border-transparent hover:border-outline-variant transition-colors"
                                              title="Télécharger"
                                            >
                                              <span className="material-symbols-outlined text-[16px]">download</span>
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className={`pl-4 ml-1.5 border-l-2 ${stage.border}`}>
                        <div className="p-3 bg-surface-container-low/30 rounded-lg text-center text-xs text-secondary italic border border-dashed border-outline-variant">
                          Aucun échange enregistré pour l’étape « {stage.shortLabel} ».
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredInteractions.length === 0 && (
                <div className="text-center py-8 text-secondary">
                  <span className="material-symbols-outlined text-[32px] opacity-40">filter_alt_off</span>
                  <p className="text-sm font-semibold mt-2">Aucune interaction ne correspond aux filtres sélectionnés.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setStageFilter('ALL');
                      setTypeFilter('ALL');
                      setOnlyWithAttachments(false);
                      setSearchQuery('');
                    }}
                    className="mt-2 text-xs text-primary font-bold hover:underline"
                  >
                    Effacer tous les filtres
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* SECTION OPPORTUNITÉ LIÉE & CHIFFRAGE DU DEVIS */}
          <div className="bg-white rounded-xl border border-outline-variant p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">request_quote</span>
                <h3 className="font-headline-md text-base font-extrabold text-on-surface">
                  Proposition Commerciale &amp; Opportunité Associée
                </h3>
              </div>
              <span className="bg-purple-100 text-purple-900 border border-purple-200 text-xs font-extrabold px-2.5 py-0.5 rounded-full">
                Statut : En Négociation
              </span>
            </div>

            <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div>
                  <h4 className="text-sm font-bold text-on-surface">Campagne Digitale Omnicanale — Rentrée 2026</h4>
                  <p className="text-xs text-secondary">Réf. Devis DEV-2026-084 • Créé le 18 août 2026</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[10px] font-bold uppercase text-secondary">Budget Total Négocié</p>
                  <p className="text-base font-black text-primary">1 600 000 FCFA</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-outline-variant/60 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-outline-variant/50">
                  <p className="text-[10px] text-secondary font-bold uppercase">Acompte Requis (30%)</p>
                  <p className="font-bold text-on-surface mt-0.5">300 000 FCFA</p>
                  <span className="text-[10px] text-amber-700 font-medium">En attente de versement</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-outline-variant/50">
                  <p className="text-[10px] text-secondary font-bold uppercase">Prestations Incluses</p>
                  <p className="font-bold text-on-surface mt-0.5">3 Pôles d’expertise</p>
                  <span className="text-[10px] text-secondary">Graphisme, Social Ads, Spot Radio</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-outline-variant/50">
                  <p className="text-[10px] text-secondary font-bold uppercase">Probabilité Closing</p>
                  <p className="font-bold text-emerald-700 mt-0.5">85% — Très Élevée</p>
                  <span className="text-[10px] text-secondary">Validation DG imminente</span>
                </div>
              </div>
            </div>
          </div>

          {/* DUAL CARD : TÂCHES TO-DO & PROCHAINS ÉVÉNEMENTS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tâches associées au prospect */}
            <div className="bg-white rounded-xl border border-outline-variant p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-primary">checklist</span>
                  Tâches &amp; To-Do Commercial
                </h3>
                <span className="text-[11px] font-bold text-secondary">
                  {tasks.filter((t) => t.completed).length}/{tasks.length} faites
                </span>
              </div>

              <div className="space-y-2">
                {tasks.map((task) => (
                  <label
                    key={task.id}
                    className="flex items-start gap-2.5 p-2.5 rounded-lg border border-outline-variant hover:bg-surface-container-low transition-colors cursor-pointer text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => handleToggleTask(task.id)}
                      className="mt-0.5 rounded text-primary focus:ring-primary h-4 w-4"
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`font-semibold ${task.completed ? 'line-through text-secondary' : 'text-on-surface'}`}>
                        {task.label}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-secondary mt-0.5">
                        <span>Échéance : {task.dueDate}</span>
                        {task.priority === 'high' && (
                          <span className="bg-red-100 text-red-800 px-1.5 py-0.2 rounded font-bold">Urgent</span>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Prochains Rendez-vous & Événements */}
            <div className="bg-white rounded-xl border border-outline-variant p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-primary">calendar_month</span>
                  Agenda &amp; Rendez-vous Prévus
                </h3>
                <span className="bg-primary/10 text-primary text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  {events.length} planifié{events.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="space-y-2.5">
                {events.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-start gap-3 p-2.5 rounded-lg border border-outline-variant hover:bg-surface-container-low transition-colors"
                  >
                    <div className="flex flex-col items-center px-2 py-1 bg-primary/10 text-primary rounded-lg shrink-0 text-center font-bold">
                      <span className="text-[9px] uppercase">{ev.month}</span>
                      <span className="text-sm leading-none">{ev.day}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-on-surface truncate">{ev.title}</h4>
                      <p className="text-[11px] text-primary font-medium mt-0.5">{ev.time}</p>
                      <p className="text-[10px] text-secondary flex items-center gap-1 mt-0.5">
                        <span className="material-symbols-outlined text-[12px]">location_on</span>
                        {ev.location}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL : AJOUT D'UNE NOUVELLE INTERACTION AVEC PIÈCE JOINTE */}
      {/* ========================================================= */}
      <Modal
        isOpen={isNewInteractionOpen}
        onClose={() => setIsNewInteractionOpen(false)}
        title="Enregistrer une nouvelle interaction"
        maxWidthClassName="max-w-xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsNewInteractionOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-outline-variant text-secondary hover:bg-surface-container-low transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              form="new-interaction-form"
              className="px-4 py-2 text-xs font-bold rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm"
            >
              Enregistrer l’échange
            </button>
          </>
        }
      >
        <form id="new-interaction-form" onSubmit={handleCreateInteraction} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-on-surface block mb-1">Type d’échange *</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as InteractionType)}
                className="w-full text-xs p-2.5 rounded-lg border border-outline-variant bg-white focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="CALL">📞 Appel téléphonique</option>
                <option value="MEETING">🤝 Réunion / Cadrage physique ou visio</option>
                <option value="EMAIL">✉️ Email officiel</option>
                <option value="MESSAGE">💬 WhatsApp / SMS</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-on-surface block mb-1">Étape du cycle *</label>
              <select
                value={newStage}
                onChange={(e) => setNewStage(e.target.value as Stage)}
                className="w-full text-xs p-2.5 rounded-lg border border-outline-variant bg-white focus:ring-1 focus:ring-primary focus:outline-none"
              >
                {STAGE_DEFS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-on-surface block mb-1">Objet / Titre de l’échange *</label>
            <input
              type="text"
              required
              placeholder="Ex: Présentation de la maquette, Validation du calendrier..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-outline-variant bg-white focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-on-surface block mb-1">Résultat clé / Tag synthèse</label>
              <input
                type="text"
                placeholder="Ex: Budget accepté, En attente DAF..."
                value={newOutcome}
                onChange={(e) => setNewOutcome(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-outline-variant bg-white focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface block mb-1">Impact / Tonalité</label>
              <select
                value={newOutcomeType}
                onChange={(e) => setNewOutcomeType(e.target.value as 'success' | 'warning' | 'info')}
                className="w-full text-xs p-2.5 rounded-lg border border-outline-variant bg-white focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="success">🟢 Positif / Validé</option>
                <option value="warning">🟡 Attention / En attente</option>
                <option value="info">🔵 Informatif</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-on-surface block mb-1">Compte-rendu détaillé *</label>
            <textarea
              required
              rows={4}
              placeholder="Détaillez les points abordés, les demandes du prospect, les engagements pris et les prochaines étapes..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-outline-variant bg-white focus:ring-1 focus:ring-primary focus:outline-none resize-none"
            />
          </div>

          {/* Section Pièce Jointe */}
          <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/70 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
              <span className="material-symbols-outlined text-[16px]">attach_file</span>
              <span>Ajouter une pièce jointe (Compte-rendu, Devis, Brief, Accord...)</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <input
                  type="text"
                  placeholder="Nom du fichier (ex: Devis_V2_Signe)"
                  value={newAttachmentName}
                  onChange={(e) => setNewAttachmentName(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-outline-variant bg-white focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
              <div>
                <select
                  value={newAttachmentExt}
                  onChange={(e) => setNewAttachmentExt(e.target.value as 'pdf' | 'docx' | 'xlsx' | 'png')}
                  className="w-full text-xs p-2 rounded-lg border border-outline-variant bg-white focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="pdf">.PDF</option>
                  <option value="docx">.DOCX (Word)</option>
                  <option value="xlsx">.XLSX (Excel)</option>
                  <option value="png">.PNG / Image</option>
                </select>
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL : PROGRAMMER UNE RELANCE */}
      {/* ========================================================= */}
      <Modal
        isOpen={isRelanceOpen}
        onClose={() => setIsRelanceOpen(false)}
        title="Programmer une relance commerciale"
        maxWidthClassName="max-w-md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsRelanceOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-outline-variant text-secondary hover:bg-surface-container-low transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              form="relance-form"
              className="px-4 py-2 text-xs font-bold rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm"
            >
              Confirmer la date
            </button>
          </>
        }
      >
        <form id="relance-form" onSubmit={handleSaveRelance} className="space-y-4">
          <p className="text-xs text-secondary leading-relaxed">
            Définissez la date et l’heure de la prochaine prise de contact pour {prospect.fullName} ({prospect.company}).
          </p>
          <div>
            <label className="text-xs font-bold text-on-surface block mb-1">Date et heure de relance</label>
            <input
              type="datetime-local"
              required
              value={nextRelanceDate}
              onChange={(e) => setNextRelanceDate(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-outline-variant bg-white focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>
        </form>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL : APERÇU DE PIÈCE JOINTE */}
      {/* ========================================================= */}
      <Modal
        isOpen={Boolean(previewAttachment)}
        onClose={() => setPreviewAttachment(null)}
        title={`Aperçu document : ${previewAttachment?.name}`}
        maxWidthClassName="max-w-2xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-secondary">
              Taille : {previewAttachment?.size} • Ajouté le {previewAttachment?.uploadedAt}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-outline-variant text-secondary hover:bg-surface-container-low transition-colors"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => {
                  showToast(`Téléchargement de ${previewAttachment?.name}...`);
                  setPreviewAttachment(null);
                }}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                Télécharger
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-4 py-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-[36px]">
              {previewAttachment ? ATTACHMENT_META[previewAttachment.extension]?.icon ?? 'description' : 'description'}
            </span>
          </div>

          <div>
            <h4 className="text-sm font-bold text-on-surface">{previewAttachment?.name}</h4>
            <p className="text-xs text-secondary mt-1">
              Document officiel lié à l’historique des interactions avec {prospect.fullName}.
            </p>
          </div>

          <div className="p-6 bg-surface-container-low rounded-xl border border-dashed border-outline-variant text-xs text-secondary leading-relaxed">
            <p className="font-semibold text-on-surface mb-2">Simulateur de visionneuse intégrée CRM</p>
            <p>
              Le document « <strong>{previewAttachment?.name}</strong> » ({previewAttachment?.size}) est prêt à être consulté ou imprimé.
            </p>
          </div>
        </div>
      </Modal>

      {/* Modal Célébration (Conversion Prospect -> Client) */}
      <CelebrationModal
        isOpen={showCelebration}
        title="Félicitations pour le Closing !"
        message={
          <div>
            <p className="text-sm text-on-surface">
              Le prospect <strong>{prospect.fullName}</strong> ({prospect.company}) a été converti en <strong>Client Actif</strong> avec succès.
            </p>
            <p className="text-xs text-secondary mt-1">
              Le dossier projet associé et la facturation d’acompte sont désormais initialisés.
            </p>
          </div>
        }
        ctaLabel="Voir le dossier client"
        onClose={() => {
          setShowCelebration(false);
          navigate('/templates/client');
        }}
      />
    </div>
  );
}
