import { api } from './api';

export type DocumentOwnerType = 'CONTACT' | 'PROJECT';

export type DocumentType =
  | 'CONTRAT'
  | 'CONVENTION'
  | 'DEVIS'
  | 'FACTURE'
  | 'BRIEF'
  | 'FICHE_BAT'
  | 'VISUEL'
  | 'PRESENTATION'
  | 'LIVRABLE_FINAL'
  | 'JUSTIFICATIF'
  | 'RAPPORT';

export type DocumentStatus = 'A_VALIDER' | 'VALIDE' | 'MODIFICATIONS_DEMANDEES' | 'REJETE' | 'PIECE_JOINTE';

export type ReviewDecision = 'SOUMIS' | 'VALIDE' | 'MODIFICATIONS_DEMANDEES' | 'REJETE';

export interface DocumentReview {
  id: number;
  author: number | null;
  author_name: string | null;
  decision: ReviewDecision;
  decision_display: string;
  comment: string;
  created_at: string;
}

export type AnnotationKind = 'PIN' | 'CIRCLE';

export interface DocumentAnnotation {
  id: number;
  version: number;
  kind: AnnotationKind;
  x: number;
  y: number;
  width: number | null;
  height: number | null;
  comment: string;
  author: number | null;
  author_name: string | null;
  resolved: boolean;
  created_at: string;
}

export interface DocumentVersion {
  id: number;
  file: string;
  uploaded_by: number | null;
  uploaded_by_name: string | null;
  uploaded_at: string;
  annotations: DocumentAnnotation[];
}

export interface Document {
  id: number;
  owner_type: DocumentOwnerType;
  owner_type_display: string;
  contact: number | null;
  contact_name: string | null;
  project: number | null;
  project_name: string | null;
  task: number | null;
  prestation: number | null;
  document_type: DocumentType;
  document_type_display: string;
  status: DocumentStatus;
  status_display: string;
  /** Vide (ou `null`, selon la sérialisation DRF d'un FileField non renseigné) si le document est un lien plutôt qu'un fichier. */
  file: string | null;
  link: string;
  label: string;
  uploaded_by: number | null;
  uploaded_by_name: string | null;
  validators: number[];
  validator_names: string[];
  validators_detail: { id: number; name: string }[];
  reviews: DocumentReview[];
  versions: DocumentVersion[];
  uploaded_at: string;
}

export async function createDocument(data: FormData): Promise<Document> {
  const response = await api.post<Document>('/documents/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function listDocuments(params?: {
  project?: number;
  contact?: number;
  task?: number;
  prestation?: number;
  validator?: number;
  uploaded_by?: number;
}): Promise<Document[]> {
  const response = await api.get<Document[]>('/documents/', { params });
  return response.data;
}

export async function getDocument(id: number): Promise<Document> {
  const response = await api.get<Document>(`/documents/${id}/`);
  return response.data;
}

export async function deleteDocument(id: number): Promise<void> {
  await api.delete(`/documents/${id}/`);
}

export async function updateDocumentStatus(id: number, status: DocumentStatus): Promise<Document> {
  const response = await api.patch<Document>(`/documents/${id}/`, { status });
  return response.data;
}

/** Décision d'un validateur sur un document en attente (`A_VALIDER`). Un
 * commentaire est requis par le serveur pour tout sauf `VALIDE`. */
export async function reviewDocument(
  id: number,
  decision: Extract<ReviewDecision, 'VALIDE' | 'MODIFICATIONS_DEMANDEES' | 'REJETE'>,
  comment: string,
): Promise<Document> {
  const response = await api.post<Document>(`/documents/${id}/review/`, { decision, comment });
  return response.data;
}

/** Renvoie un document dont le statut est `MODIFICATIONS_DEMANDEES` pour
 * une nouvelle relecture — réservé à son auteur. */
export async function resubmitDocument(id: number, comment: string, file?: File | null): Promise<Document> {
  const formData = new FormData();
  formData.append('comment', comment);
  if (file) formData.append('file', file);
  const response = await api.post<Document>(`/documents/${id}/resubmit/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

/** Remplace la liste complète des validateurs — réservé à un validateur déjà
 * désigné (voir `DocumentSerializer.validate`). Prend l'ensemble complet des
 * ids voulus, pas une simple addition. */
export async function updateDocumentValidators(id: number, validatorIds: number[]): Promise<Document> {
  const response = await api.patch<Document>(`/documents/${id}/`, { validators: validatorIds });
  return response.data;
}

/** Réservé aux validateurs désignés du document porté par cette version. */
export async function createDocumentAnnotation(data: {
  version: number;
  kind: AnnotationKind;
  x: number;
  y: number;
  width?: number;
  height?: number;
  comment: string;
}): Promise<DocumentAnnotation> {
  const response = await api.post<DocumentAnnotation>('/document-annotations/', data);
  return response.data;
}

export async function toggleDocumentAnnotationResolved(id: number, resolved: boolean): Promise<DocumentAnnotation> {
  const response = await api.patch<DocumentAnnotation>(`/document-annotations/${id}/`, { resolved });
  return response.data;
}
