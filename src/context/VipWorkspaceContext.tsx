import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useAuth } from './AuthContext';
import { listAllTasks, type Task } from '../services/taskService';
import { listProjects, updateProjectStatus, type Project, type ProjectStatus } from '../services/projectService';

// Suivi production du VIP (Chef Division Visibilité, Infrastructure et
// Production) : chaque prestation affectée à sa division EST une "commande
// de production" — son statut (à lancer / en cours / terminé) est dérivé de
// l'avancement réel des tâches qui lui sont rattachées, ses consignes sont
// `Prestation.note` (voir PrestationChiefView.tsx). Aucun champ "type"
// (impression/déploiement), "quantité" ou "lieu" n'existe côté backend — le
// prototype qui les inventait n'a pas été repris ; faire évoluer le statut se
// fait en cochant les tâches sur la fiche du projet, pas ici.

export type OrderStatus = 'A_LANCER' | 'EN_COURS' | 'TERMINE';

export interface ProductionOrder {
  id: number;
  projectId: number;
  projectStatus: ProjectStatus;
  titre: string;
  client: string;
  projet: string;
  instructions: string;
  statut: OrderStatus;
  echeance: string;
  doneTasks: number;
  totalTasks: number;
}

function deriveStatus(doneTasks: number, totalTasks: number): OrderStatus {
  if (totalTasks === 0 || doneTasks === 0) return 'A_LANCER';
  if (doneTasks >= totalTasks) return 'TERMINE';
  return 'EN_COURS';
}

interface VipWorkspaceContextValue {
  orders: ProductionOrder[];
  isLoading: boolean;
  /** Bascule le projet vers `PRET_POUR_LIVRAISON` — la Livraison devient
   * alors l'étape courante du dossier commercial (voir commercialWorkflow.ts). */
  markExecutionComplete: (projectId: number) => Promise<void>;
}

const VipWorkspaceContext = createContext<VipWorkspaceContextValue | undefined>(undefined);

export function VipWorkspaceProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [rawProjects, setRawProjects] = useState<Project[]>([]);
  const [rawTasks, setRawTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    Promise.all([listProjects(), listAllTasks()])
      .then(([projects, tasks]) => {
        setRawProjects(projects);
        setRawTasks(tasks);
      })
      .finally(() => setIsLoading(false));
  }, [user]);

  const orders = useMemo<ProductionOrder[]>(() => {
    if (!user?.division_name) return [];
    const result: ProductionOrder[] = [];
    for (const project of rawProjects) {
      for (const prestation of project.prestations) {
        if (prestation.division_name !== user.division_name) continue;
        const prestationTasks = rawTasks.filter((t) => t.prestation === prestation.id);
        const doneTasks = prestationTasks.filter((t) => t.done).length;
        result.push({
          id: prestation.id,
          projectId: project.id,
          projectStatus: project.status,
          titre: prestation.label,
          client: project.client_name,
          projet: project.name,
          instructions: prestation.note,
          statut: deriveStatus(doneTasks, prestationTasks.length),
          echeance: prestation.deadline,
          doneTasks,
          totalTasks: prestationTasks.length,
        });
      }
    }
    return result;
  }, [rawProjects, rawTasks, user?.division_name]);

  async function markExecutionComplete(projectId: number) {
    const updated = await updateProjectStatus(projectId, 'PRET_POUR_LIVRAISON');
    setRawProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  return (
    <VipWorkspaceContext.Provider value={{ orders, isLoading, markExecutionComplete }}>{children}</VipWorkspaceContext.Provider>
  );
}

export function useVipWorkspace() {
  const context = useContext(VipWorkspaceContext);
  if (!context) {
    throw new Error("useVipWorkspace doit être utilisé à l'intérieur de VipWorkspaceProvider");
  }
  return context;
}
