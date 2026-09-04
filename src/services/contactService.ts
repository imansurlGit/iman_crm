import { api } from './api';

export type ContactType = 'PROSPECT' | 'CLIENT' | 'PARTENAIRE' | 'INTERNE';
export type EntityType = 'PARTICULIER' | 'PME' | 'INSTITUTION' | 'GRANDE_ENTREPRISE';
export type Stage =
  | 'PRISE_DE_CONTACT'
  | 'QUALIFICATION'
  | 'ECHANGES'
  | 'CHIFFRAGE_OFFRE'
  | 'CONVERSION_CLIENT';

export interface Contact {
  id: number;
  contact_type: ContactType;
  contact_type_display: string;
  entity_type: EntityType;
  entity_type_display: string;
  name: string;
  company: string;
  sector: string;
  email: string;
  phone: string;
  address: string;
  source: string;
  notes: string;
  stage: Stage;
  stage_display: string;
  score: number;
  next_followup_at: string | null;
  assigned_to: number | null;
  assigned_to_name: string | null;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  converted_at: string | null;
}

export interface NewContactPayload {
  contact_type: ContactType;
  entity_type: EntityType;
  name: string;
  company: string;
  sector: string;
  email: string;
  phone: string;
  address: string;
  source: string;
  notes: string;
}

export type ContactUpdatePayload = Partial<NewContactPayload> & { stage?: Stage; next_followup_at?: string | null };

export const ENTITY_TYPE_OPTIONS: { value: EntityType; label: string }[] = [
  { value: 'PARTICULIER', label: 'Particulier' },
  { value: 'PME', label: 'PME' },
  { value: 'INSTITUTION', label: 'Institution' },
  { value: 'GRANDE_ENTREPRISE', label: 'Grande Entreprise' },
];

export const STAGE_OPTIONS: { value: Stage; label: string }[] = [
  { value: 'PRISE_DE_CONTACT', label: 'Prise de Contact' },
  { value: 'QUALIFICATION', label: 'Qualification' },
  { value: 'ECHANGES', label: 'Échanges' },
  { value: 'CHIFFRAGE_OFFRE', label: 'Chiffrage & Offre' },
  { value: 'CONVERSION_CLIENT', label: 'Conversion Client' },
];

export const STAGE_BADGE_CLASSES: Record<Stage, string> = {
  PRISE_DE_CONTACT: 'bg-red-50 text-red-700 border-red-200',
  QUALIFICATION: 'bg-amber-50 text-amber-700 border-amber-200',
  ECHANGES: 'bg-blue-50 text-blue-700 border-blue-200',
  CHIFFRAGE_OFFRE: 'bg-purple-50 text-purple-700 border-purple-200',
  CONVERSION_CLIENT: 'bg-green-50 text-green-700 border-green-200',
};

// Secteurs adaptés au contexte nigérien.
export const SECTORS = [
  'Agriculture',
  'BTP',
  'Télécommunications',
  'Finance',
  'Santé',
  'Éducation',
  'Administration publique',
  'Commerce',
  'Autre',
];

export const SOURCES = [
  'Réseaux sociaux',
  'Recommandation',
  'Conférence / Salon professionnel',
  'Site web',
  'Appel à froid',
  'Autre',
];

export async function listContacts(contactType: ContactType): Promise<Contact[]> {
  const response = await api.get<Contact[]>('/contacts/', { params: { contact_type: contactType } });
  return response.data;
}

export async function getContact(id: number): Promise<Contact> {
  const response = await api.get<Contact>(`/contacts/${id}/`);
  return response.data;
}

/** Le contact « Interne (Agence) » sert de point d'ancrage pour tout ce qui
 * n'est lié à aucun client précis (agenda du DG, tâches personnelles de la
 * direction...). Rien ne garantit qu'il ait déjà été créé — on le crée à la
 * demande plutôt que de bloquer ces fonctionnalités tant qu'un admin ne l'a
 * pas fait manuellement. */
export async function getOrCreateAgencyContact(): Promise<Contact> {
  const existing = await listContacts('INTERNE');
  if (existing[0]) return existing[0];
  return createContact({
    contact_type: 'INTERNE',
    entity_type: 'GRANDE_ENTREPRISE',
    name: 'Agence Iman',
    company: 'Agence Iman',
    sector: '',
    email: 'contact@agenceiman.com',
    phone: '+227 00 00 00 00',
    address: '',
    source: '',
    notes: "Contact interne — utilisé pour l'agenda du DG et les tâches internes de la direction.",
  });
}

export async function createContact(data: NewContactPayload): Promise<Contact> {
  const response = await api.post<Contact>('/contacts/', data);
  return response.data;
}

export async function updateContact(id: number, data: ContactUpdatePayload): Promise<Contact> {
  const response = await api.patch<Contact>(`/contacts/${id}/`, data);
  return response.data;
}

export async function transferContact(id: number, assignedToId: number): Promise<Contact> {
  const response = await api.post<Contact>(`/contacts/${id}/transfer/`, { assigned_to: assignedToId });
  return response.data;
}

export async function convertToClient(id: number): Promise<Contact> {
  const response = await api.post<Contact>(`/contacts/${id}/convert/`);
  return response.data;
}
