import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useAuth } from './AuthContext';
import { listAllTasks, updateTask, type Task } from '../services/taskService';
import { listProjects, type Project, type ProjectStatus } from '../services/projectService';
import { listDocuments, type Document } from '../services/documentService';

// "Mes tâches" / "mes projets" du graphiste = les Task(task_type=PRESTATION)
// qui lui sont assignées, remontées jusqu'au Project via Prestation — même
// construction que DeveloppeurWorkspaceContext.tsx (contrairement à ce que
// suggérait l'ancien commentaire de data/graphisteWorkspace.ts, Task porte
// bien un `assignee` réel).
//
// Une tâche ne se marque plus "terminée" directement : elle suit le sort de
// sa dernière soumission (Document.task) — en attente, modifications
// demandées, rejetée, ou validée (auquel cas elle peut enfin être clôturée).

export type GraphisteTaskStatus =
  | 'A_FAIRE'
  | 'EN_ATTENTE_VALIDATION'
  | 'MODIFICATIONS_DEMANDEES'
  | 'REJETEE'
  | 'VALIDEE_A_CLOTURER'
  | 'TERMINEE';

export interface GraphisteTask extends Task {
  projectName: string;
  projectId: number | null;
  submissionStatus: GraphisteTaskStatus;
  lastDocumentId: number | null;
}

export interface GraphisteProject {
  id: number;
  name: string;
  clientName: string;
  deadline: string | null;
  status: ProjectStatus;
  statusDisplay: string;
  avancement: number;
  remainingTasks: number;
}

// Avancement indicatif dérivé du statut réel du projet — aucun champ dédié
// n'existe côté backend (même mapping que ProjetsPage.tsx/DeveloppeurWorkspaceContext.tsx).
const PROGRESS_BY_STATUS: Record<ProjectStatus, number> = {
  NOUVEAU: 5,
  A_TRAITER: 15,
  EN_COURS: 50,
  EN_VALIDATION_INTERNE: 70,
  EN_VALIDATION_CLIENT: 80,
  EN_CORRECTION: 60,
  PRET_POUR_EXECUTION: 90,
  PRET_POUR_LIVRAISON: 95,
  LIVRE: 100,
  CLOTURE: 100,
  BLOQUE: 40,
  PERDUE: 0,
};

export const SUBMISSION_STATUS_LABELS: Record<GraphisteTaskStatus, string> = {
  A_FAIRE: 'À faire',
  EN_ATTENTE_VALIDATION: 'En attente de validation',
  MODIFICATIONS_DEMANDEES: 'Modifications demandées',
  REJETEE: 'Rejetée',
  VALIDEE_A_CLOTURER: 'Validée — à clôturer',
  TERMINEE: 'Terminée',
};

export const SUBMISSION_STATUS_CLASSES: Record<GraphisteTaskStatus, string> = {
  A_FAIRE: 'bg-gray-100 text-gray-700',
  EN_ATTENTE_VALIDATION: 'bg-amber-100 text-amber-700',
  MODIFICATIONS_DEMANDEES: 'bg-orange-100 text-orange-700',
  REJETEE: 'bg-red-100 text-red-700',
  VALIDEE_A_CLOTURER: 'bg-blue-100 text-blue-700',
  TERMINEE: 'bg-emerald-100 text-emerald-700',
};

function deriveSubmissionStatus(task: Task, lastDocument: Document | undefined): GraphisteTaskStatus {
  if (task.done) return 'TERMINEE';
  if (!lastDocument) return 'A_FAIRE';
  switch (lastDocument.status) {
    case 'A_VALIDER':
      return 'EN_ATTENTE_VALIDATION';
    case 'MODIFICATIONS_DEMANDEES':
      return 'MODIFICATIONS_DEMANDEES';
    case 'REJETE':
      return 'REJETEE';
    case 'VALIDE':
      return 'VALIDEE_A_CLOTURER';
    default:
      return 'A_FAIRE';
  }
}

/** Destination du bouton "Traiter" — directement la page de détail du
 * document (existant, ou en mode création s'il n'y en a pas encore),
 * jamais une page intermédiaire. `null` si la tâche n'a rien d'exploitable
 * (aucun projet retrouvé, ce qui ne devrait pas arriver en pratique). */
export function getTaskProcessingUrl(task: GraphisteTask): string | null {
  if (task.submissionStatus === 'A_FAIRE' || task.submissionStatus === 'REJETEE') {
    if (!task.projectId) return null;
    return `/documents/nouveau?task=${task.id}&project=${task.projectId}&label=${encodeURIComponent(task.label)}`;
  }
  return task.lastDocumentId ? `/documents/${task.lastDocumentId}` : null;
}

interface GraphisteWorkspaceContextValue {
  tasks: GraphisteTask[];
  projects: GraphisteProject[];
  documents: Document[];
  isLoading: boolean;
  /** Ne clôt réellement la tâche que si sa dernière soumission est validée. */
  markTaskDone: (task: GraphisteTask) => Promise<void>;
}

const GraphisteWorkspaceContext = createContext<GraphisteWorkspaceContextValue | undefined>(undefined);

export function GraphisteWorkspaceProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [rawProjects, setRawProjects] = useState<Project[]>([]);
  const [myDocuments, setMyDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    Promise.all([listAllTasks(), listProjects(), listDocuments({ uploaded_by: user.id })])
      .then(([allTasks, allProjects, allDocuments]) => {
        setMyTasks(allTasks.filter((t) => t.task_type === 'PRESTATION' && t.assignee === user.id));
        setRawProjects(allProjects);
        setMyDocuments(allDocuments);
      })
      .finally(() => setIsLoading(false));
  }, [user]);

  const prestationToProject = useMemo(() => {
    const map = new Map<number, Project>();
    for (const project of rawProjects) {
      for (const prestation of project.prestations) {
        map.set(prestation.id, project);
      }
    }
    return map;
  }, [rawProjects]);

  // Document.Meta.ordering = ["-uploaded_at"], donc la première soumission
  // trouvée pour une tâche donnée est toujours la plus récente.
  const lastDocumentByTask = useMemo(() => {
    const map = new Map<number, Document>();
    for (const doc of myDocuments) {
      if (doc.task && !map.has(doc.task)) map.set(doc.task, doc);
    }
    return map;
  }, [myDocuments]);

  const tasks = useMemo<GraphisteTask[]>(
    () =>
      myTasks.map((task) => {
        const project = task.prestation ? prestationToProject.get(task.prestation) : undefined;
        const lastDocument = lastDocumentByTask.get(task.id);
        return {
          ...task,
          projectName: project?.name ?? '—',
          projectId: project?.id ?? null,
          submissionStatus: deriveSubmissionStatus(task, lastDocument),
          lastDocumentId: lastDocument?.id ?? null,
        };
      }),
    [myTasks, prestationToProject, lastDocumentByTask],
  );

  const projects = useMemo<GraphisteProject[]>(() => {
    const map = new Map<number, GraphisteProject>();
    for (const task of tasks) {
      if (!task.projectId) continue;
      if (!map.has(task.projectId)) {
        const project = prestationToProject.get(task.prestation!);
        if (!project) continue;
        map.set(task.projectId, {
          id: project.id,
          name: project.name,
          clientName: project.client_name,
          deadline: project.deadline,
          status: project.status,
          statusDisplay: project.status_display,
          avancement: PROGRESS_BY_STATUS[project.status] ?? 0,
          remainingTasks: 0,
        });
      }
      if (!task.done) map.get(task.projectId)!.remainingTasks += 1;
    }
    return Array.from(map.values());
  }, [tasks, prestationToProject]);

  async function markTaskDone(task: GraphisteTask) {
    if (task.done || task.submissionStatus !== 'VALIDEE_A_CLOTURER') return;
    const updated = await updateTask(task.id, { done: true });
    setMyTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
  }

  return (
    <GraphisteWorkspaceContext.Provider value={{ tasks, projects, documents: myDocuments, isLoading, markTaskDone }}>
      {children}
    </GraphisteWorkspaceContext.Provider>
  );
}

export function useGraphisteWorkspace() {
  const context = useContext(GraphisteWorkspaceContext);
  if (!context) {
    throw new Error("useGraphisteWorkspace doit être utilisé à l'intérieur de GraphisteWorkspaceProvider");
  }
  return context;
}
