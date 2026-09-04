import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listDocuments } from '../../services/documentService';
import { listProjects, PRIORITY_BADGE_CLASSES, PRIORITY_OPTIONS, type Project } from '../../services/projectService';

// Vue DG des opportunités — mêmes règles de dérivation que la page réelle
// CDV/Commercial (pages/ventes/OpportunitesPage.tsx) : Perdue = status PERDUE ;
// Gagnée = budget renseigné ; Négociation = un devis validé existe déjà pour
// le projet ; Ouverte = rien de tout ça pour l'instant. Le DG voit tout
// l'agrégat agence (pas de filtre par créateur côté backend pour ce rôle).

type StageKey = 'OUVERTE' | 'NEGOCIATION' | 'GAGNEE' | 'PERDUE';
type ViewMode = 'KANBAN' | 'LISTE';

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
  stage: StageKey;
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

function OpportunityCardView({ card, onClick }: { card: OpportunityCard; onClick: () => void }) {
  if (card.lost) {
    return (
      <button
        className="w-full text-left bg-surface-container-low/60 border border-outline-variant/50 p-4 rounded-lg opacity-70"
        onClick={onClick}
        type="button"
      >
        <div className="flex justify-between items-start mb-3">
          <span className={`${card.priorityClasses} text-[10px] px-2 py-0.5 rounded-full uppercase tracking-tighter font-bold`}>
            {card.priorityLabel}
          </span>
          <span className="material-symbols-outlined text-secondary text-[18px]">cancel</span>
        </div>
        <h4 className="text-[15px] font-bold text-on-surface-variant mb-1 leading-snug line-through">{card.title}</h4>
        <p className="text-secondary text-xs mb-2">{card.client}</p>
        {card.lostReason && <p className="text-[11px] text-secondary italic mb-3">Motif : {card.lostReason}</p>}
        <div className="flex items-center justify-between">
          <span className="font-bold text-secondary text-sm line-through">
            {card.amount !== null ? formatAmount(card.amount) : '—'}
          </span>
          <div
            className="w-7 h-7 rounded-full border-2 border-white bg-outline text-white flex items-center justify-center text-[10px] font-bold shrink-0"
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
      <button className="w-full text-left bg-emerald-50 border border-emerald-200 p-4 rounded-lg shadow-sm" onClick={onClick} type="button">
        <div className="flex justify-between items-start mb-3">
          <span className={`${card.priorityClasses} text-[10px] px-2 py-0.5 rounded-full uppercase tracking-tighter font-bold`}>
            {card.priorityLabel}
          </span>
          <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
        </div>
        <h4 className="text-[15px] font-bold text-on-surface mb-1 leading-snug">{card.title}</h4>
        <p className="text-secondary text-xs mb-4">{card.client}</p>
        <div className="flex items-center justify-between">
          <span className="font-bold text-emerald-700 text-base">{card.amount !== null ? formatAmount(card.amount) : '—'}</span>
          <div
            className="w-8 h-8 rounded-full border-2 border-white bg-primary-container text-white flex items-center justify-center text-[11px] font-bold shrink-0 shadow-sm"
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
        className="w-full text-left bg-white border-2 border-primary-container p-4 rounded-lg shadow-md relative overflow-hidden"
        onClick={onClick}
        type="button"
      >
        <div className="absolute top-2 -right-4 w-24 text-center rotate-45 bg-primary text-white text-[9px] font-bold py-1">URGENT</div>
        <span className={`${card.priorityClasses} text-[10px] px-2 py-0.5 rounded-full uppercase tracking-tighter font-bold`}>
          {card.priorityLabel}
        </span>
        <h4 className="text-[15px] font-bold text-primary mt-3 mb-1 leading-snug">{card.title}</h4>
        <p className="text-secondary text-xs mb-3">{card.client}</p>
        {card.deadlineLabel && (
          <div className="flex items-center gap-1 text-primary-container mb-3">
            <span className="material-symbols-outlined text-[16px]">alarm</span>
            <span className="text-[11px] font-bold">{card.deadlineLabel}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="font-bold text-primary-container text-base">{card.amount !== null ? formatAmount(card.amount) : '—'}</span>
          <div
            className="w-8 h-8 rounded-full border-2 border-primary-container bg-primary-container text-white flex items-center justify-center text-[11px] font-bold shrink-0 shadow-sm"
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
      className="w-full text-left bg-white border border-outline-variant p-4 rounded-lg shadow-sm hover:shadow-md hover:border-primary-container/40 transition-all"
      onClick={onClick}
      type="button"
    >
      <div className="flex justify-between items-start mb-3">
        <span className={`${card.priorityClasses} text-[10px] px-2 py-0.5 rounded-full uppercase tracking-tighter font-bold`}>
          {card.priorityLabel}
        </span>
      </div>
      <h4 className="text-[15px] font-bold text-on-surface mb-1 leading-snug">{card.title}</h4>
      <p className="text-secondary text-xs mb-4">{card.client}</p>
      <div className="flex items-center justify-between">
        <span className="font-bold text-on-surface text-sm">{card.amount !== null ? formatAmount(card.amount) : '—'}</span>
        <div
          className="w-7 h-7 rounded-full border-2 border-white bg-primary-container text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm"
          title={card.assignee}
        >
          {getInitials(card.assignee)}
        </div>
      </div>
    </button>
  );
}

export default function DgOpportunitesPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('KANBAN');
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
    const cards: OpportunityCard[] = projects.map((project) => {
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
          <div className="flex items-center bg-white border border-outline-variant rounded-lg p-1">
            {(['KANBAN', 'LISTE'] as ViewMode[]).map((mode) => (
              <button
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                  viewMode === mode ? 'bg-primary text-white' : 'text-secondary hover:bg-surface-container'
                }`}
                key={mode}
                onClick={() => setViewMode(mode)}
                type="button"
              >
                <span className="material-symbols-outlined text-[15px]">{mode === 'KANBAN' ? 'view_kanban' : 'table_rows'}</span>
                {mode === 'KANBAN' ? 'Kanban' : 'Liste'}
              </button>
            ))}
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
      ) : viewMode === 'KANBAN' ? (
        <div className="flex gap-6 overflow-x-auto custom-scrollbar pb-4">
          {columns.map((column) => (
            <div className="min-w-[300px] w-[300px] flex flex-col gap-3" key={column.key}>
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${column.dotClasses}`} />
                  <span className="font-bold text-secondary uppercase text-[11px] tracking-widest">{column.label}</span>
                  <span className="bg-surface-container-high px-2 py-0.5 rounded text-[10px] font-bold text-secondary">{column.items.length}</span>
                </div>
                <span className="text-secondary text-[11px] font-bold">{formatAmount(columnTotal(column))}</span>
              </div>
              <div className="flex-1 bg-surface-container-low/50 border border-outline-variant/30 rounded-xl p-3 flex flex-col gap-3 min-h-[420px]">
                {column.items.length > 0 ? (
                  column.items.map((card) => (
                    <OpportunityCardView card={card} key={card.id} onClick={() => navigate(`/opportunites/${card.id}`)} />
                  ))
                ) : (
                  <div className="flex-1 flex items-center justify-center border-2 border-dashed border-outline-variant/20 rounded-lg min-h-[380px]">
                    <span className="text-secondary text-sm italic opacity-40">Aucune opportunité</span>
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
