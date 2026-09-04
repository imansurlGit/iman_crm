import { api } from './api';
import type { ConventionStatus, DossierStep } from '../data/partenariatDossiers';

export interface ApiTimelineEntry {
  id: number;
  author: number | null;
  author_name: string | null;
  label: string;
  kind: 'SYSTEM' | 'ACTION';
  created_at: string;
}

export interface ApiPartnershipTask {
  id: number;
  dossier: number;
  label: string;
  done: boolean;
  created_at: string;
}

export interface ApiPartnershipDossier {
  id: number;
  reference: string;
  partenaire: number;
  partenaire_name: string;
  contact_name: string;
  evenement: string;
  evenement_debut: string | null;
  evenement_fin: string | null;
  montant: string;
  current_step: DossierStep;
  current_step_display: string;
  urgent: boolean;
  head_marketing: number | null;
  head_marketing_name: string | null;
  requires_payment: boolean;
  payment_received: boolean;
  convention_status: ConventionStatus;
  convention_status_display: string;
  bilan_valide: boolean;
  created_by: number | null;
  created_at: string;
  timeline: ApiTimelineEntry[];
  tasks: ApiPartnershipTask[];
}

export interface NewPartnershipDossierPayload {
  partenaire: number;
  evenement: string;
  evenement_debut: string;
  evenement_fin: string;
  montant: string;
  requires_payment: boolean;
}

export async function listPartnershipDossiers(): Promise<ApiPartnershipDossier[]> {
  const response = await api.get<ApiPartnershipDossier[]>('/partnership-dossiers/');
  return response.data;
}

export async function createPartnershipDossier(data: NewPartnershipDossierPayload): Promise<ApiPartnershipDossier> {
  const response = await api.post<ApiPartnershipDossier>('/partnership-dossiers/', data);
  return response.data;
}

export async function advancePartnershipDossier(id: number): Promise<ApiPartnershipDossier> {
  const response = await api.post<ApiPartnershipDossier>(`/partnership-dossiers/${id}/advance/`);
  return response.data;
}

export async function setPartnershipConventionStatus(id: number, status: ConventionStatus): Promise<ApiPartnershipDossier> {
  const response = await api.post<ApiPartnershipDossier>(`/partnership-dossiers/${id}/convention-status/`, { status });
  return response.data;
}

export async function markPartnershipPaymentReceived(id: number): Promise<ApiPartnershipDossier> {
  const response = await api.post<ApiPartnershipDossier>(`/partnership-dossiers/${id}/mark-payment-received/`);
  return response.data;
}

export async function markPartnershipBilanValide(id: number): Promise<ApiPartnershipDossier> {
  const response = await api.post<ApiPartnershipDossier>(`/partnership-dossiers/${id}/mark-bilan-valide/`);
  return response.data;
}

export async function togglePartnershipTask(id: number, done: boolean): Promise<ApiPartnershipTask> {
  const response = await api.patch<ApiPartnershipTask>(`/partnership-tasks/${id}/`, { done });
  return response.data;
}

/** `montant` est un DecimalField, sérialisé en chaîne (ex : "2000000.00"). */
export function formatMontant(value: string): string {
  return `${Number(value).toLocaleString('fr-FR')} FCFA`;
}

/** Dates au format 'YYYY-MM-DD'. */
export function formatPeriode(debut: string | null, fin: string | null): string {
  if (!debut || !fin) return '';
  const format = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  return debut === fin ? format(debut) : `Du ${format(debut)} au ${format(fin)}`;
}
