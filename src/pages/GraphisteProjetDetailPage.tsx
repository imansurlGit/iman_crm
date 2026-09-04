import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useGraphisteWorkspace,
  getTaskProcessingUrl,
  SUBMISSION_STATUS_LABELS,
  SUBMISSION_STATUS_CLASSES,
  type GraphisteTask,
} from '../context/GraphisteWorkspaceContext';
import { formatTaskDueLabel, type TaskPriority } from '../services/taskService';
import { getProject, STATUS_BADGE_CLASSES, type Project } from '../services/projectService';
import { listDocuments, type Document } from '../services/documentService';

// Vue projet du graphiste : contexte du projet + ses propres tâches de
// prestation dessus — même construction que DeveloppeurProjetDetailPage.tsx,
// délibérément distincte de ProjetDetailPage.tsx (qui bascule vers le poste
// de travail du chef de division dès qu'une prestation appartient à sa
// division, ce qui n'est pas le rôle d'un simple membre d'équipe).

const PRIORITY_LABELS: Record<TaskPriority, string> = { HIGH: 'Élevée', MEDIUM: 'Moyenne', LOW: 'Faible' };
const PRIORITY_CLASSES: Record<TaskPriority, string> = {
  HIGH: 'bg-red-100 text-red-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LOW: 'bg-gray-100 text-gray-700',
};

const STATUS_ICONS: Record<GraphisteTask['submissionStatus'], string> = {
  A_FAIRE: 'radio_button_unchecked',
  EN_ATTENTE_VALIDATION: 'hourglass_top',
  MODIFICATIONS_DEMANDEES: 'edit_note',
  REJETEE: 'cancel',
  VALIDEE_A_CLOTURER: 'check_circle',
  TERMINEE: 'task_alt',
};

const STATUS_ICON_CLASSES: Record<GraphisteTask['submissionStatus'], string> = {
  A_FAIRE: 'bg-gray-100 text-gray-500',
  EN_ATTENTE_VALIDATION: 'bg-amber-100 text-amber-600',
  MODIFICATIONS_DEMANDEES: 'bg-orange-100 text-orange-600',
  REJETEE: 'bg-red-100 text-red-600',
  VALIDEE_A_CLOTURER: 'bg-blue-100 text-blue-600',
  TERMINEE: 'bg-emerald-100 text-emerald-600',
};

const DOCUMENT_STATUS_LABELS: Record<Document['status'], string> = {
  A_VALIDER: 'À valider',
  VALIDE: 'Validé',
  MODIFICATIONS_DEMANDEES: 'Modifications demandées',
  REJETE: 'Rejeté',
  PIECE_JOINTE: 'Pièce jointe',
};

const DOCUMENT_STATUS_CLASSES: Record<Document['status'], string> = {
  A_VALIDER: 'bg-amber-100 text-amber-700',
  VALIDE: 'bg-emerald-100 text-emerald-700',
  MODIFICATIONS_DEMANDEES: 'bg-orange-100 text-orange-700',
  REJETE: 'bg-red-100 text-red-700',
  PIECE_JOINTE: 'bg-gray-100 text-gray-700',
};

function isOverdue(task: GraphisteTask): boolean {
  return !task.done && !!task.due_at && new Date(task.due_at) < new Date();
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(value: string | null): string {
  if (!value) return 'Sans échéance';
  return new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function GraphisteProjetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tasks } = useGraphisteWorkspace();
  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    Promise.all([getProject(Number(id)), listDocuments({ project: Number(id) })])
      .then(([projectData, documentsData]) => {
        setProject(projectData);
        setDocuments(documentsData);
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  const myTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.projectId === Number(id))
        .sort((a, b) => (isOverdue(b) ? 1 : 0) - (isOverdue(a) ? 1 : 0) || (a.due_at ?? '').localeCompare(b.due_at ?? '')),
    [tasks, id],
  );

  if (isLoading) {
    return <p className="font-body-sm text-body-sm text-secondary">Chargement...</p>;
  }

  if (!project) {
    return (
      <div className="text-center text-secondary text-sm py-16 bg-white border border-dashed border-outline-variant rounded-lg">
        Projet introuvable.
      </div>
    );
  }

  const doneCount = myTasks.filter((t) => t.done).length;
  const progress = myTasks.length ? Math.round((doneCount / myTasks.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-gutter">
      <button
        className="flex items-center gap-1 text-xs font-bold text-secondary hover:text-on-surface transition-colors w-fit"
        onClick={() => navigate('/graphiste/projets')}
        type="button"
      >
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        Mes projets
      </button>

      {/* En-tête du projet */}
      <section className="bg-white border border-outline-variant rounded-xl p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-lg bg-primary-container/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">account_tree</span>
            </div>
            <div className="min-w-0">
              <h2 className="font-headline-md text-lg font-bold text-on-surface truncate">{project.name}</h2>
              <p className="text-sm text-secondary">{project.client_name}</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide shrink-0 ${STATUS_BADGE_CLASSES[project.status]}`}>
            {project.status_display}
          </span>
        </div>

        {project.description && (
          <p className="text-sm text-on-surface-variant mt-4 pt-4 border-t border-outline-variant">{project.description}</p>
        )}

        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-outline-variant text-xs text-secondary">
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">event</span>
            Échéance globale : {formatDateTime(project.deadline)}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">checklist</span>
            {doneCount}/{myTasks.length} de mes tâches terminées ({progress}%)
          </span>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter items-start">
        {/* Mes tâches sur ce projet */}
        <section className="lg:col-span-2 flex flex-col gap-2.5">
          <h3 className="font-headline-md text-base font-bold text-on-surface">Mes tâches sur ce projet</h3>
          {myTasks.map((task) => {
            const overdue = isOverdue(task);
            return (
              <div
                className={`flex items-center gap-4 px-4 py-3.5 bg-white border rounded-lg transition-colors ${
                  overdue ? 'border-error/40 bg-error-container/10' : 'border-outline-variant hover:border-outline'
                }`}
                key={task.id}
              >
                <span className={`flex items-center justify-center w-9 h-9 rounded-full shrink-0 ${STATUS_ICON_CLASSES[task.submissionStatus]}`}>
                  <span className="material-symbols-outlined text-[18px]">{STATUS_ICONS[task.submissionStatus]}</span>
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold truncate ${task.done ? 'line-through text-secondary' : 'text-on-surface'}`}>
                      {task.label}
                    </p>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${PRIORITY_CLASSES[task.priority]}`}>
                      {PRIORITY_LABELS[task.priority]}
                    </span>
                  </div>
                  {!task.done && (
                    <p className={`text-xs mt-0.5 ${overdue ? 'text-error font-bold' : 'text-secondary'}`}>{formatTaskDueLabel(task)}</p>
                  )}
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${SUBMISSION_STATUS_CLASSES[task.submissionStatus]}`}
                >
                  {SUBMISSION_STATUS_LABELS[task.submissionStatus]}
                </span>

                <button
                  className="flex items-center gap-1 px-3 py-1.5 border border-outline-variant text-on-surface text-xs font-bold rounded-lg hover:bg-surface-container-high transition-colors shrink-0 disabled:opacity-40"
                  disabled={!getTaskProcessingUrl(task)}
                  onClick={() => {
                    const url = getTaskProcessingUrl(task);
                    if (url) navigate(url);
                  }}
                  type="button"
                >
                  {task.done ? 'Voir' : 'Traiter'}
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>
            );
          })}
          {myTasks.length === 0 && (
            <div className="text-center text-secondary text-sm py-8 bg-white border border-dashed border-outline-variant rounded-lg">
              Aucune tâche ne vous est assignée sur ce projet.
            </div>
          )}
        </section>

        {/* Colonne latérale : prestations du projet + documents */}
        <aside className="flex flex-col gap-gutter">
          <section className="bg-white border border-outline-variant rounded-xl p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-secondary mb-2.5">
              Prestations ({project.prestations.length})
            </p>
            <div className="space-y-2">
              {project.prestations.map((prestation) => (
                <div className="px-3 py-2.5 bg-surface-container-low rounded-lg" key={prestation.id}>
                  <p className="text-sm font-semibold text-on-surface truncate">{prestation.label}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] text-secondary">{prestation.division_name ?? 'Non affectée'}</span>
                    <span className="text-[11px] text-secondary">{formatDate(prestation.deadline)}</span>
                  </div>
                </div>
              ))}
              {project.prestations.length === 0 && <p className="text-xs text-secondary italic">Aucune prestation pour l'instant.</p>}
            </div>
          </section>

          <section className="bg-white border border-outline-variant rounded-xl p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-secondary mb-2.5">
              Documents ({documents.length})
            </p>
            <div className="space-y-1.5">
              {documents.map((document) => (
                <button
                  className="w-full flex items-center gap-2.5 p-2 rounded-lg border border-outline-variant hover:border-primary hover:bg-surface-container-low transition-colors text-left"
                  key={document.id}
                  onClick={() => navigate(`/documents/${document.id}`)}
                  type="button"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary-container/10 text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">{document.file ? 'description' : 'link'}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-on-surface truncate">{document.label}</p>
                    <p className="text-[10px] text-secondary">{document.document_type_display}</p>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${DOCUMENT_STATUS_CLASSES[document.status]}`}>
                    {DOCUMENT_STATUS_LABELS[document.status]}
                  </span>
                </button>
              ))}
              {documents.length === 0 && <p className="text-xs text-secondary italic">Aucun document pour l'instant.</p>}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
