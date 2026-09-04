import { api } from './api';

export type ProjectStatus =
  | 'NOUVEAU'
  | 'A_TRAITER'
  | 'EN_COURS'
  | 'EN_VALIDATION_INTERNE'
  | 'EN_VALIDATION_CLIENT'
  | 'EN_CORRECTION'
  | 'PRET_POUR_EXECUTION'
  | 'PRET_POUR_LIVRAISON'
  | 'LIVRE'
  | 'CLOTURE'
  | 'BLOQUE'
  | 'PERDUE';

export const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'NOUVEAU', label: 'Nouveau' },
  { value: 'A_TRAITER', label: 'À traiter' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'EN_VALIDATION_INTERNE', label: 'En validation interne' },
  { value: 'EN_VALIDATION_CLIENT', label: 'En validation client' },
  { value: 'EN_CORRECTION', label: 'En correction' },
  { value: 'PRET_POUR_EXECUTION', label: 'Prêt pour exécution' },
  { value: 'PRET_POUR_LIVRAISON', label: 'Prêt pour livraison' },
  { value: 'LIVRE', label: 'Livré' },
  { value: 'CLOTURE', label: 'Clôturé' },
  { value: 'BLOQUE', label: 'Bloqué' },
  { value: 'PERDUE', label: 'Perdue' },
];

export type ProjectKind = 'OPPORTUNITE' | 'PROJET';

export type ProjectPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export const PRIORITY_OPTIONS: { value: ProjectPriority; label: string }[] = [
  { value: 'LOW', label: 'Faible' },
  { value: 'MEDIUM', label: 'Moyenne' },
  { value: 'HIGH', label: 'Élevée' },
];

export const PRIORITY_BADGE_CLASSES: Record<ProjectPriority, string> = {
  HIGH: 'text-error bg-error-container/40',
  MEDIUM: 'text-primary bg-primary-fixed/40',
  LOW: 'text-secondary bg-secondary-fixed/40',
};

export const STATUS_BADGE_CLASSES: Record<ProjectStatus, string> = {
  NOUVEAU: 'text-blue-700 bg-blue-100',
  A_TRAITER: 'text-amber-700 bg-amber-100',
  EN_COURS: 'text-indigo-700 bg-indigo-100',
  EN_VALIDATION_INTERNE: 'text-purple-700 bg-purple-100',
  EN_VALIDATION_CLIENT: 'text-pink-700 bg-pink-100',
  EN_CORRECTION: 'text-orange-700 bg-orange-100',
  PRET_POUR_EXECUTION: 'text-teal-700 bg-teal-100',
  PRET_POUR_LIVRAISON: 'text-cyan-700 bg-cyan-100',
  LIVRE: 'text-green-700 bg-green-100',
  CLOTURE: 'text-gray-700 bg-gray-100',
  BLOQUE: 'text-red-700 bg-red-100',
  PERDUE: 'text-gray-700 bg-gray-200',
};

export function getProjectDivisions(project: Project): string[] {
  const names = project.prestations
    .map((p) => p.division_name)
    .filter((name): name is string => name !== null);
  return Array.from(new Set(names));
}

export function formatProjectDeadline(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export interface Prestation {
  id: number;
  project: number;
  /** Division assignée plus tard — absente à la création du projet. */
  division: number | null;
  division_name: string | null;
  label: string;
  /** Échéance complète (date + heure), ISO 8601. */
  deadline: string;
  /** Consignes du détenteur transmises au chef de division lors de l'affectation. */
  note: string;
}

export interface Project {
  id: number;
  kind: ProjectKind;
  kind_display: string;
  client: number;
  client_name: string;
  name: string;
  description: string;
  /** Échéance globale complète (date + heure), ISO 8601. `null` pour une opportunité pas encore confirmée. */
  deadline: string | null;
  priority: ProjectPriority;
  priority_display: string;
  /** Montant en FCFA, renvoyé par l'API sous forme de chaîne (DecimalField). `null` pour une opportunité sans budget estimé. */
  budget: string | null;
  /** Probabilité de conclusion (%), propre aux opportunités. */
  probability: number | null;
  requires_deposit: boolean;
  /** Montant en FCFA, `null` si aucun acompte n'est requis. */
  deposit_amount: string | null;
  /** Distingue "pas encore répondu" de "réponse = non requis" (voir l'étape Acompte). */
  deposit_decided: boolean;
  /** Coché uniquement par la Comptabilité, jamais par le commercial — mis à
   * jour automatiquement dès que la somme des `ProjectPayment` atteint
   * `deposit_amount` (voir `ProjectPaymentViewSet`). */
  deposit_received: boolean;
  /** Idem, une fois la somme des paiements ≥ `budget`. */
  final_payment_received: boolean;
  /** Somme des `ProjectPayment` du projet, FCFA sous forme de chaîne. */
  collected_amount: string;
  status: ProjectStatus;
  status_display: string;
  prestations: Prestation[];
  converted_at: string | null;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
}

export interface NewPrestationPayload {
  label: string;
  deadline: string;
}

export interface NewProjectPayload {
  client: number;
  name: string;
  description: string;
  deadline: string;
  priority: ProjectPriority;
  budget: string;
  requires_deposit: boolean;
  deposit_amount: string | null;
  prestations: NewPrestationPayload[];
}

export interface NewOpportunityPayload {
  client: number;
  name: string;
  description: string;
  deadline?: string;
  budget?: string;
  priority?: ProjectPriority;
  requires_deposit?: boolean;
  deposit_amount?: string | null;
}

export async function listProjects(params?: { client?: number; kind?: ProjectKind }): Promise<Project[]> {
  const response = await api.get<Project[]>('/projects/', { params });
  return response.data;
}

export async function getProject(id: number): Promise<Project> {
  const response = await api.get<Project>(`/projects/${id}/`);
  return response.data;
}

export async function createProject(data: NewProjectPayload): Promise<Project> {
  const response = await api.post<Project>('/projects/', { ...data, kind: 'PROJET' });
  return response.data;
}

export async function createOpportunity(data: NewOpportunityPayload): Promise<Project> {
  const response = await api.post<Project>('/projects/', { ...data, kind: 'OPPORTUNITE', prestations: [] });
  return response.data;
}

export async function updateProjectStatus(id: number, status: ProjectStatus): Promise<Project> {
  const response = await api.patch<Project>(`/projects/${id}/`, { status });
  return response.data;
}

/** Transforme une opportunité (kind=OPPORTUNITE) en projet confirmé. Exige que
 * l'échéance, le budget et au moins une prestation soient déjà renseignés,
 * et que l'acompte ait été reçu si un acompte est requis (contrôlé aussi
 * côté serveur, voir `ProjectSerializer.validate`). */
export async function startProject(id: number): Promise<Project> {
  const response = await api.patch<Project>(`/projects/${id}/`, { kind: 'PROJET' });
  return response.data;
}

/** Répond à la question "un acompte est-il nécessaire ?" pour la première
 * (et unique) fois — `deposit_decided` empêche de la reposer ensuite. */
export async function setDepositDecision(id: number, requiresDeposit: boolean, depositAmount: string | null): Promise<Project> {
  const response = await api.patch<Project>(`/projects/${id}/`, {
    requires_deposit: requiresDeposit,
    deposit_amount: requiresDeposit ? depositAmount : null,
    deposit_decided: true,
  });
  return response.data;
}

/** Opportunité gagnée, une fois son devis validé — fixe le montant final. */
export async function markOpportunityWon(id: number, budget: string): Promise<Project> {
  const response = await api.patch<Project>(`/projects/${id}/`, { budget });
  return response.data;
}

/** Opportunité perdue — `reason` remplace la description (besoin exprimé,
 * devenu sans objet une fois l'affaire perdue). */
export async function markOpportunityLost(id: number, reason: string): Promise<Project> {
  const response = await api.patch<Project>(`/projects/${id}/`, { status: 'PERDUE', description: reason });
  return response.data;
}

/** Confirme la livraison à la date choisie (pré-remplie depuis `deadline`,
 * modifiable) — fixe `status = LIVRE` et met `deadline` à jour si elle a
 * changé. L'appelant crée en plus un `Event(LIVRAISON)` pour que la date
 * apparaisse sur le calendrier collaboratif (voir `eventService.ts`). */
export async function confirmDelivery(id: number, deliveredAt: string): Promise<Project> {
  const response = await api.patch<Project>(`/projects/${id}/`, { status: 'LIVRE', deadline: deliveredAt });
  return response.data;
}

export interface NewPrestationCreatePayload {
  project: number;
  label: string;
  deadline: string;
  division: number | null;
  /** Consignes transmises au chef de division notifié à la création — voir `PrestationViewSet.perform_create`. */
  note?: string;
}

export interface PrestationUpdatePayload {
  label?: string;
  deadline?: string;
  division?: number | null;
  /** Consignes transmises au chef de division notifié — persistées sur la prestation. */
  note?: string;
}

/** Affecter une division déclenche une notification pour son chef côté
 * backend (voir `PrestationViewSet.perform_create/perform_update`). */
export async function createPrestation(data: NewPrestationCreatePayload): Promise<Prestation> {
  const response = await api.post<Prestation>('/prestations/', data);
  return response.data;
}

export async function updatePrestation(id: number, data: PrestationUpdatePayload): Promise<Prestation> {
  const response = await api.patch<Prestation>(`/prestations/${id}/`, data);
  return response.data;
}

export async function deletePrestation(id: number): Promise<void> {
  await api.delete(`/prestations/${id}/`);
}
