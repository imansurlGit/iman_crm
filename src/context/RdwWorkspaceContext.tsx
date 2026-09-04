import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useAuth } from './AuthContext';
import { listAllTasks, type Task } from '../services/taskService';
import { listProjects, type Project, type ProjectStatus } from '../services/projectService';
import { listDivisionMembers, type CurrentUser } from '../services/userService';

// Le RDW (Responsable Développement Web) n'a pas d'autorité de chef de
// division côté backend (seul le CDN l'est) : son "équipe" et ses "projets"
// sont dérivés de la même division ("Numérique") que lui, exactement comme
// pour ChefDivisionTachesPage.tsx — vue transversale réelle, pas de modèle
// dédié "équipe"/"charge de travail".

export interface RdwTeamMember {
  id: number;
  name: string;
  roleDisplay: string;
  /** Intitulé de la tâche la plus proche à échéance, à défaut d'un vrai champ "focus". */
  focus: string;
  pendingCount: number;
  overdueCount: number;
  /** Indicatif : capé à 100%, ~20% par tâche en cours — aucune notion de capacité réelle côté backend. */
  workload: number;
}

export interface RdwProject {
  id: number;
  name: string;
  clientName: string;
  deadline: string | null;
  status: ProjectStatus;
  statusDisplay: string;
  avancement: number;
  remainingTasks: number;
}

// Avancement indicatif dérivé du statut réel du projet — même mapping que
// DeveloppeurWorkspaceContext.tsx/GraphisteWorkspaceContext.tsx.
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

interface RdwWorkspaceContextValue {
  team: RdwTeamMember[];
  projects: RdwProject[];
  tasks: Task[];
  isLoading: boolean;
}

const RdwWorkspaceContext = createContext<RdwWorkspaceContextValue | undefined>(undefined);

export function RdwWorkspaceProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [rawTasks, setRawTasks] = useState<Task[]>([]);
  const [rawProjects, setRawProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<CurrentUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    Promise.all([listAllTasks(), listProjects(), user.division ? listDivisionMembers(user.division) : Promise.resolve([])])
      .then(([allTasks, allProjects, allMembers]) => {
        setRawTasks(allTasks);
        setRawProjects(allProjects);
        setMembers(allMembers);
      })
      .finally(() => setIsLoading(false));
  }, [user]);

  const prestationToProject = useMemo(() => {
    const map = new Map<number, Project>();
    for (const project of rawProjects) {
      for (const prestation of project.prestations) {
        if (prestation.division_name === user?.division_name) map.set(prestation.id, project);
      }
    }
    return map;
  }, [rawProjects, user?.division_name]);

  // Tâches de prestation de toute la division — pas seulement celles du RDW.
  const tasks = useMemo(
    () => rawTasks.filter((t) => t.task_type === 'PRESTATION' && !!t.prestation && prestationToProject.has(t.prestation)),
    [rawTasks, prestationToProject],
  );

  const developers = useMemo(() => members.filter((m) => m.role === 'DEVELOPPEUR'), [members]);

  const team = useMemo<RdwTeamMember[]>(() => {
    const now = new Date();
    return developers.map((dev) => {
      const devTasks = tasks.filter((t) => t.assignee === dev.id);
      const pending = devTasks.filter((t) => !t.done);
      const overdue = pending.filter((t) => t.due_at && new Date(t.due_at) < now);
      const nextTask = [...pending].sort((a, b) => (a.due_at ?? '').localeCompare(b.due_at ?? ''))[0];
      const project = nextTask?.prestation ? prestationToProject.get(nextTask.prestation) : undefined;
      return {
        id: dev.id,
        name: `${dev.first_name} ${dev.last_name}`.trim() || dev.email,
        roleDisplay: dev.role_display,
        focus: nextTask ? `${nextTask.label}${project ? ` — ${project.name}` : ''}` : 'Aucune tâche en cours',
        pendingCount: pending.length,
        overdueCount: overdue.length,
        workload: Math.min(100, pending.length * 20),
      };
    });
  }, [developers, tasks, prestationToProject]);

  const projects = useMemo<RdwProject[]>(() => {
    const map = new Map<number, RdwProject>();
    for (const project of prestationToProject.values()) {
      if (!map.has(project.id)) {
        map.set(project.id, {
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
    }
    for (const task of tasks) {
      if (task.done || !task.prestation) continue;
      const project = prestationToProject.get(task.prestation);
      if (project) map.get(project.id)!.remainingTasks += 1;
    }
    return Array.from(map.values());
  }, [prestationToProject, tasks]);

  return <RdwWorkspaceContext.Provider value={{ team, projects, tasks, isLoading }}>{children}</RdwWorkspaceContext.Provider>;
}

export function useRdwWorkspace() {
  const context = useContext(RdwWorkspaceContext);
  if (!context) {
    throw new Error("useRdwWorkspace doit être utilisé à l'intérieur de RdwWorkspaceProvider");
  }
  return context;
}
