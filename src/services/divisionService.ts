import { api } from './api';

export interface Division {
  id: number;
  name: string;
}

export async function listDivisions(): Promise<Division[]> {
  const response = await api.get<Division[]>('/divisions/');
  return response.data;
}

const DIVISION_ICONS: Record<string, string> = {
  Ventes: 'payments',
  Marketing: 'campaign',
  Numérique: 'language',
  'Visibilité, Infrastructure et Production': 'videocam',
  Comptabilité: 'account_balance_wallet',
};

export function getDivisionIcon(name: string): string {
  return DIVISION_ICONS[name] ?? 'category';
}

// Doit rester cohérent avec `core.models.DIVISION_CHIEF_ROLES` côté backend :
// c'est ce titulaire qui reçoit une notification quand une prestation est
// affectée à la division correspondante.
const DIVISION_CHIEF_LABELS: Record<string, string> = {
  Ventes: 'le CDV',
  Marketing: 'le CDM',
  Numérique: 'le CDN',
  'Visibilité, Infrastructure et Production': 'le VIP',
  Comptabilité: 'le Comptable Général',
};

export function getDivisionChiefLabel(name: string): string | null {
  return DIVISION_CHIEF_LABELS[name] ?? null;
}
