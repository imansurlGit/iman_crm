import { api } from './api';

export interface DivisionObjective {
  id: number;
  division: number;
  division_name: string;
  /** Toujours le 1er du mois, format YYYY-MM-DD. */
  month: string;
  /** Montant en FCFA, renvoyé par l'API sous forme de chaîne (DecimalField). */
  amount: string;
  set_by: number | null;
  set_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface DivisionObjectivePayload {
  division: number;
  month: string;
  amount: string;
}

export async function listDivisionObjectives(month: string): Promise<DivisionObjective[]> {
  const response = await api.get<DivisionObjective[]>('/division-objectives/', { params: { month } });
  return response.data;
}

export async function setDivisionObjective(data: DivisionObjectivePayload): Promise<DivisionObjective> {
  const response = await api.post<DivisionObjective>('/division-objectives/', data);
  return response.data;
}

export async function updateDivisionObjective(id: number, amount: string): Promise<DivisionObjective> {
  const response = await api.patch<DivisionObjective>(`/division-objectives/${id}/`, { amount });
  return response.data;
}
