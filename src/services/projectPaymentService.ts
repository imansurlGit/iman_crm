import { api } from './api';

// Journal des encaissements d'un projet — permet un paiement échelonné en
// autant de fois que nécessaire, plutôt que le seul acompte/solde. Réservé à
// la Comptabilité en écriture (voir `ProjectPaymentViewSet` côté backend) ;
// `Project.deposit_received`/`final_payment_received` se mettent à jour tout
// seuls dès que le total franchit `deposit_amount` puis `budget`.

export type PaymentMethod = 'VIREMENT' | 'CHEQUE' | 'ESPECES' | 'MOBILE_MONEY';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  VIREMENT: 'Virement bancaire',
  CHEQUE: 'Chèque',
  ESPECES: 'Espèces',
  MOBILE_MONEY: 'Mobile Money',
};

export const PAYMENT_METHOD_ICONS: Record<PaymentMethod, string> = {
  VIREMENT: 'account_balance',
  CHEQUE: 'receipt',
  ESPECES: 'payments',
  MOBILE_MONEY: 'smartphone',
};

export interface ProjectPayment {
  id: number;
  project: number;
  /** Montant en FCFA, renvoyé par l'API sous forme de chaîne (DecimalField). */
  amount: string;
  method: PaymentMethod;
  method_display: string;
  note: string;
  recorded_by: number | null;
  recorded_by_name: string | null;
  paid_at: string;
  created_at: string;
}

export interface NewProjectPaymentPayload {
  project: number;
  amount: string;
  method: PaymentMethod;
  note: string;
  paid_at: string;
}

export async function listProjectPayments(projectId?: number): Promise<ProjectPayment[]> {
  const response = await api.get<ProjectPayment[]>('/project-payments/', {
    params: projectId ? { project: projectId } : undefined,
  });
  return response.data;
}

/** Réservé à la Comptabilité (+ Admin) — voir `ProjectPaymentViewSet.perform_create`. */
export async function createProjectPayment(data: NewProjectPaymentPayload): Promise<ProjectPayment> {
  const response = await api.post<ProjectPayment>('/project-payments/', data);
  return response.data;
}
