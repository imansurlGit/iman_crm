import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listDocuments } from '../../services/documentService';
import { listProjects, PRIORITY_BADGE_CLASSES, PRIORITY_OPTIONS, type Project } from '../../services/projectService';

// Les 4 étapes (Ouverte / Négociation / Gagnée / Perdue) restent celles du
// prototype — seule la donnée change. Dérivées de Project(kind=OPPORTUNITE) :
// Perdue = status PERDUE ; Gagnée = budget renseigné (seul signal réel d'une
// décision prise, voir commercialWorkflow.ts) ; Négociation = un devis validé
// existe déjà pour le projet ; Ouverte = rien de tout ça pour l'instant.
// Aucune notion de "catégorie" ni de "progression %" n'existe côté backend —
// remplacées ici par la priorité réelle du projet (HIGH/MEDIUM/LOW).

type StageKey = 'OUVERTE' | 'NEGOCIATION' | 'GAGNEE' | 'PERDUE';

interface OpportunityCard {
  id: number;
  title: string;
  client: string;
  priorityLabel: string;
  priorityClasses: string;
  amount: number | null;
  assignee: string;
  urgent: boolean;
  deadlineLabel: string | null;
  won: boolean;
  lost: boolean;
  lostReason: string;
}

interface KanbanColumn {
  key: StageKey;
  label: string;
  dotClasses: string;
  items: OpportunityCard[];
}

const COLUMN_META: { key: StageKey; label: string; dotClasses: string }[] = [
  { key: 'OUVERTE', label: 'Ouverte', dotClasses: 'bg-blue-500' },
  { key: 'NEGOCIATION', label: 'Négociation', dotClasses: 'bg-orange-500' },
  { key: 'GAGNEE', label: 'Gagnée', dotClasses: 'bg-emerald-500' },
  { key: 'PERDUE', label: 'Perdue', dotClasses: 'bg-outline' },
];

const PRIORITY_LABELS: Record<string, string> = Object.fromEntries(PRIORITY_OPTIONS.map((o) => [o.value, o.label]));

function formatAmount(value: number): string {
  return `${value.toLocaleString('fr-FR')} FCFA`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function columnTotal(column: KanbanColumn): number {
  return column.items.reduce((sum, item) => sum + (item.amount ?? 0), 0);
}

function deriveStage(project: Project, validatedDevisProjectIds: Set<number>): StageKey {
  if (project.status === 'PERDUE') return 'PERDUE';
  if (project.budget !== null) return 'GAGNEE';
  return validatedDevisProjectIds.has(project.id) ? 'NEGOCIATION' : 'OUVERTE';
}

interface OpportunityCardViewProps {
  card: OpportunityCard;
  onClick: () => void;
}

function OpportunityCardView({ card, onClick }: OpportunityCardViewProps) {
  if (card.lost) {
    return (
      <button
        className="w-full text-left bg-surface-container-low/60 border border-outline-variant/50 p-2.5 rounded-lg opacity-70"
        onClick={onClick}
        type="button"
      >
        <div className="flex justify-between items-start mb-1.5">
          <span className={`${card.priorityClasses} text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-tighter font-bold`}>
            {card.priorityLabel}
          </span>
          <span className="material-symbols-outlined text-secondary text-[15px]">cancel</span>
        </div>
        <h4 className="text-[13px] font-bold text-on-surface-variant mb-0.5 leading-snug line-through">{card.title}</h4>
        <p className="text-secondary text-[11px] mb-1">{card.client}</p>
        {card.lostReason && <p className="text-[10px] text-secondary italic mb-1.5">Motif : {card.lostReason}</p>}
        <div className="flex items-center justify-between">
          <span className="font-bold text-secondary text-xs line-through">
            {card.amount !== null ? formatAmount(card.amount) : '—'}
          </span>
          <div
            className="w-6 h-6 rounded-full border-2 border-white bg-outline text-white flex items-center justify-center text-[9px] font-bold shrink-0"
            title={card.assignee}
          >
            {getInitials(card.assignee)}
          </div>
        </div>
      </button>
    );
  }

  if (card.won) {
    return (
      <button className="w-full text-left bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg shadow-sm" onClick={onClick} type="button">
        <div className="flex justify-between items-start mb-1.5">
          <span className={`${card.priorityClasses} text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-tighter font-bold`}>
            {card.priorityLabel}
          </span>
          <span className="material-symbols-outlined text-emerald-600 text-[15px]">check_circle</span>
        </div>
        <h4 className="text-[13px] font-bold text-on-surface mb-0.5 leading-snug">{card.title}</h4>
        <p className="text-secondary text-[11px] mb-2">{card.client}</p>
        <div className="flex items-center justify-between">
          <span className="font-bold text-emerald-700 text-xs">{card.amount !== null ? formatAmount(card.amount) : '—'}</span>
          <div
            className="w-6 h-6 rounded-full border-2 border-white bg-primary-container text-white flex items-center justify-center text-[9px] font-bold shrink-0 shadow-sm"
            title={card.assignee}
          >
            {getInitials(card.assignee)}
          </div>
        </div>
      </button>
    );
  }

  if (card.urgent) {
    return (
      <button
        className="w-full text-left bg-white border-2 border-primary-container p-2.5 rounded-lg shadow-md relative overflow-hidden"
        onClick={onClick}
        type="button"
      >
        <div className="absolute top-1.5 -right-5 w-20 text-center rotate-45 bg-primary text-white text-[8px] font-bold py-0.5">
          URGENT
        </div>
        <span className={`${card.priorityClasses} text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-tighter font-bold`}>
          {card.priorityLabel}
        </span>
        <h4 className="text-[13px] font-bold text-primary mt-1.5 mb-0.5 leading-snug">{card.title}</h4>
        <p className="text-secondary text-[11px] mb-1.5">{card.client}</p>
        {card.deadlineLabel && (
          <div className="flex items-center gap-1 text-primary-container mb-1.5">
            <span className="material-symbols-outlined text-[14px]">alarm</span>
            <span className="text-[10px] font-bold">{card.deadlineLabel}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="font-bold text-primary-container text-xs">{card.amount !== null ? formatAmount(card.amount) : '—'}</span>
          <div
            className="w-6 h-6 rounded-full border-2 border-primary-container bg-primary-container text-white flex items-center justify-center text-[9px] font-bold shrink-0 shadow-sm"
            title={card.assignee}
          >
            {getInitials(card.assignee)}
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      className="w-full text-left bg-white border border-outline-variant p-2.5 rounded-lg shadow-sm hover:shadow-md hover:border-primary-container/40 transition-all"
      onClick={onClick}
      type="button"
    >
      <div className="flex justify-between items-start mb-1.5">
        <span className={`${card.priorityClasses} text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-tighter font-bold`}>
          {card.priorityLabel}
        </span>
      </div>
      <h4 className="text-[13px] font-bold text-on-surface mb-0.5 leading-snug">{card.title}</h4>
      <p className="text-secondary text-[11px] mb-2">{card.client}</p>
      <div className="flex items-center justify-between">
        <span className="font-bold text-on-surface text-xs">{card.amount !== null ? formatAmount(card.amount) : '—'}</span>
        <div
          className="w-6 h-6 rounded-full border-2 border-white bg-primary-container text-white flex items-center justify-center text-[9px] font-bold shrink-0 shadow-sm"
          title={card.assignee}
        >
          {getInitials(card.assignee)}
        </div>
      </div>
    </button>
  );
}

export default function OpportunitesPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [projects, setProjects] = useState<Project[]>([]);
  const [validatedDevisProjectIds, setValidatedDevisProjectIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([listProjects({ kind: 'OPPORTUNITE' }), listDocuments()])
      .then(([opportunityProjects, allDocuments]) => {
        setProjects(opportunityProjects);
        setValidatedDevisProjectIds(
          new Set(
            allDocuments
              .filter((doc) => doc.document_type === 'DEVIS' && doc.status === 'VALIDE' && doc.project !== null)
              .map((doc) => doc.project as number),
          ),
        );
      })
      .finally(() => setIsLoading(false));
  }, []);

  const columns = useMemo<KanbanColumn[]>(() => {
    const cards: (OpportunityCard & { stage: StageKey })[] = projects.map((project) => {
      const stage = deriveStage(project, validatedDevisProjectIds);
      return {
        id: project.id,
        title: project.name,
        client: project.client_name,
        priorityLabel: PRIORITY_LABELS[project.priority] ?? project.priority,
        priorityClasses: PRIORITY_BADGE_CLASSES[project.priority],
        amount: project.budget !== null ? Number(project.budget) : null,
        assignee: project.created_by_name ?? 'Non assigné',
        urgent: project.priority === 'HIGH' && stage !== 'GAGNEE' && stage !== 'PERDUE',
        deadlineLabel: project.deadline ? `Échéance : ${formatDate(project.deadline)}` : null,
        won: stage === 'GAGNEE',
        lost: stage === 'PERDUE',
        lostReason: project.description,
        stage,
      };
    });

    return COLUMN_META.map((meta) => ({ ...meta, items: cards.filter((c) => c.stage === meta.key) }));
  }, [projects, validatedDevisProjectIds]);

  const allCards = useMemo(
    () => columns.flatMap((column) => column.items.map((item) => ({ ...item, columnLabel: column.label }))),
    [columns],
  );

  return (
    <div className="flex flex-col gap-gutter">
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">Opportunités</h2>
          <p className="text-secondary mt-1 text-sm">
            Affaires en cours, avec ou sans client existant — tant que ce n'est pas signé, ce n'est pas un projet.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-surface-container border border-outline-variant rounded-xl">
            <button
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                view === 'kanban' ? 'bg-white text-on-surface shadow-sm' : 'text-secondary hover:text-on-surface'
              }`}
              onClick={() => setView('kanban')}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">view_kanban</span>
              Kanban
            </button>
            <button
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                view === 'list' ? 'bg-white text-on-surface shadow-sm' : 'text-secondary hover:text-on-surface'
              }`}
              onClick={() => setView('list')}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">view_list</span>
              Liste
            </button>
          </div>
          <button
            className="flex items-center gap-1.5 bg-primary text-white pl-3 pr-4 py-2 rounded-full text-xs font-bold shadow-sm hover:shadow-md hover:bg-on-primary-fixed-variant active:scale-95 transition-all"
            onClick={() => navigate('/opportunites/nouvelle')}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Nouvelle opportunité
          </button>
        </div>
      </section>

      {isLoading ? (
        <p className="text-sm text-secondary py-6 text-center">Chargement...</p>
      ) : view === 'kanban' ? (
        <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-3">
          {columns.map((column) => (
            <div className="flex-1 min-w-[240px] flex flex-col gap-2" key={column.key}>
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${column.dotClasses}`} />
                  <span className="font-bold text-secondary uppercase text-[10px] tracking-widest">{column.label}</span>
                  <span className="bg-surface-container-high px-1.5 py-0.5 rounded text-[9px] font-bold text-secondary">
                    {column.items.length}
                  </span>
                </div>
                <span className="text-secondary text-[10px] font-bold">{formatAmount(columnTotal(column))}</span>
              </div>
              <div className="flex-1 bg-surface-container-low/50 border border-outline-variant/30 rounded-xl p-2 flex flex-col gap-2 min-h-[340px]">
                {column.items.length > 0 ? (
                  column.items.map((card) => (
                    <OpportunityCardView card={card} key={card.id} onClick={() => navigate(`/opportunites/${card.id}`)} />
                  ))
                ) : (
                  <div className="flex-1 flex items-center justify-center border-2 border-dashed border-outline-variant/20 rounded-lg min-h-[300px]">
                    <span className="text-secondary text-xs italic opacity-40">Aucune opportunité</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="px-6 py-4 font-bold text-secondary text-[11px] uppercase tracking-widest">Opportunité</th>
                  <th className="px-6 py-4 font-bold text-secondary text-[11px] uppercase tracking-widest">Client</th>
                  <th className="px-6 py-4 font-bold text-secondary text-[11px] uppercase tracking-widest">Étape</th>
                  <th className="px-6 py-4 font-bold text-secondary text-[11px] uppercase tracking-widest">Montant</th>
                  <th className="px-6 py-4 font-bold text-secondary text-[11px] uppercase tracking-widest">Responsable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {allCards.map((card) => (
                  <tr
                    className="hover:bg-surface-container-lowest transition-colors cursor-pointer"
                    key={card.id}
                    onClick={() => navigate(`/opportunites/${card.id}`)}
                  >
                    <td className="px-6 py-4 font-bold text-primary text-sm">{card.title}</td>
                    <td className="px-6 py-4 text-on-surface text-sm">{card.client}</td>
                    <td className="px-6 py-4 text-secondary text-sm">{card.columnLabel}</td>
                    <td className="px-6 py-4 text-secondary text-sm">{card.amount !== null ? formatAmount(card.amount) : '—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary-container text-white flex items-center justify-center text-[10px] font-bold">
                          {getInitials(card.assignee)}
                        </div>
                        <span className="text-sm font-medium text-on-surface">{card.assignee}</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {allCards.length === 0 && (
                  <tr>
                    <td className="px-6 py-8 text-center text-sm text-secondary" colSpan={5}>
                      Aucune opportunité pour l'instant.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
