// Le "dossier client" n'est pas une entité à part en base : c'est une vue
// dérivée d'un Contact (prospect/client) et de son Project éventuel
// (opportunité puis projet). Ce fichier ne contient que des métadonnées de
// présentation et la logique pure de dérivation de l'étape courante — voir
// le tableau de correspondance dans le plan de cette fonctionnalité.

import type { Contact, Stage } from '../services/contactService';
import type { Project, ProjectStatus } from '../services/projectService';
import type { Document } from '../services/documentService';

export type CommercialStep =
  | 'PRISE_CONTACT'
  | 'QUALIFICATION'
  | 'CADRAGE'
  | 'DEVIS'
  | 'GAGNE_PERDU'
  | 'ACOMPTE'
  | 'PRODUCTION'
  | 'VALIDATION_CLIENT'
  | 'FICHE_BAT'
  | 'EXECUTION'
  | 'LIVRAISON'
  | 'PAIEMENT_FINAL'
  | 'CLOTURE';

export interface StepDefinition {
  key: CommercialStep;
  label: string;
  shortLabel: string;
  icon: string;
}

export const STEP_DEFINITIONS: StepDefinition[] = [
  { key: 'PRISE_CONTACT', label: "Prise de contact par l'équipe vente", shortLabel: 'Prise de contact', icon: 'call' },
  { key: 'QUALIFICATION', label: 'Qualification du besoin', shortLabel: 'Qualification', icon: 'psychology' },
  { key: 'CADRAGE', label: 'Échanges, réunions et cadrage', shortLabel: 'Cadrage', icon: 'forum' },
  { key: 'DEVIS', label: 'Devis ou facture initiale', shortLabel: 'Devis', icon: 'request_quote' },
  { key: 'GAGNE_PERDU', label: 'Opportunité gagnée ou perdue', shortLabel: 'Gagné / Perdu', icon: 'sports_score' },
  { key: 'ACOMPTE', label: 'Acompte si nécessaire', shortLabel: 'Acompte', icon: 'payments' },
  { key: 'PRODUCTION', label: 'Conception / production', shortLabel: 'Conception', icon: 'design_services' },
  { key: 'VALIDATION_CLIENT', label: 'Validation client', shortLabel: 'Validation client', icon: 'fact_check' },
  { key: 'FICHE_BAT', label: 'Fiche BAT si applicable', shortLabel: 'Fiche BAT', icon: 'edit_document' },
  {
    key: 'EXECUTION',
    label: 'Impression / production finale / exécution',
    shortLabel: 'Exécution',
    icon: 'precision_manufacturing',
  },
  { key: 'LIVRAISON', label: 'Livraison', shortLabel: 'Livraison', icon: 'local_shipping' },
  { key: 'PAIEMENT_FINAL', label: 'Paiement final', shortLabel: 'Paiement final', icon: 'account_balance_wallet' },
  { key: 'CLOTURE', label: 'Clôture', shortLabel: 'Clôture', icon: 'task_alt' },
];

export function stepIndex(step: CommercialStep): number {
  return STEP_DEFINITIONS.findIndex((s) => s.key === step);
}

export type RecordType = 'PROSPECT' | 'OPPORTUNITE' | 'PROJET' | 'PERDU';

export const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  PROSPECT: 'Prospection',
  OPPORTUNITE: 'Opportunité',
  PROJET: 'Client',
  PERDU: 'Perdu',
};

export const RECORD_TYPE_CLASSES: Record<RecordType, string> = {
  PROSPECT: 'bg-blue-100 text-blue-700',
  OPPORTUNITE: 'bg-amber-100 text-amber-700',
  PROJET: 'bg-emerald-100 text-emerald-700',
  PERDU: 'bg-gray-200 text-gray-700',
};

const PROSPECTION_STAGE_TO_STEP: Partial<Record<Stage, CommercialStep>> = {
  PRISE_DE_CONTACT: 'PRISE_CONTACT',
  QUALIFICATION: 'QUALIFICATION',
  ECHANGES: 'CADRAGE',
};

const PROJET_STATUS_TO_STEP: Partial<Record<ProjectStatus, CommercialStep>> = {
  NOUVEAU: 'PRODUCTION',
  A_TRAITER: 'PRODUCTION',
  EN_COURS: 'PRODUCTION',
  EN_VALIDATION_INTERNE: 'PRODUCTION',
  EN_VALIDATION_CLIENT: 'VALIDATION_CLIENT',
  EN_CORRECTION: 'VALIDATION_CLIENT',
};

export function deriveRecordType(project: Project | null): RecordType {
  if (!project) return 'PROSPECT';
  if (project.status === 'PERDUE') return 'PERDU';
  return project.kind === 'PROJET' ? 'PROJET' : 'OPPORTUNITE';
}

/** Un devis (Document du projet, type DEVIS) validé signale que la décision
 * gagné/perdu reste à prendre — la validation se fait toujours après la
 * création de l'opportunité, jamais avant. */
function hasValidatedDevis(project: Project, documents: Document[]): boolean {
  return documents.some(
    (doc) => doc.document_type === 'DEVIS' && doc.owner_type === 'PROJECT' && doc.project === project.id && doc.status === 'VALIDE',
  );
}

/** Calcule l'étape courante du parcours commercial à partir des vraies
 * données. Tant que le contact n'a pas atteint « Chiffrage & Offre » (ou
 * n'est pas déjà client), l'étape suit directement `Contact.stage` — la
 * création d'une opportunité n'y change rien. Une fois à ce stade (ou
 * au-delà), c'est le `Project` (kind/status/deposit_decided/
 * deposit_received/final_payment_received) qui fait foi ; la fiche BAT est
 * représentée par un `Document(document_type=FICHE_BAT)`. */
export function deriveCurrentStep(contact: Contact, project: Project | null, documents: Document[] = []): CommercialStep {
  const isPastProspection = contact.contact_type === 'CLIENT' || contact.stage === 'CONVERSION_CLIENT';

  if (!isPastProspection && contact.stage !== 'CHIFFRAGE_OFFRE') {
    return PROSPECTION_STAGE_TO_STEP[contact.stage] ?? 'PRISE_CONTACT';
  }

  if (!project) {
    return 'DEVIS';
  }

  if (project.status === 'PERDUE') {
    return 'GAGNE_PERDU';
  }

  if (project.kind === 'OPPORTUNITE') {
    if (!hasValidatedDevis(project, documents)) return 'DEVIS';
    // Le montant final (renseigné via "Opportunité gagnée") est le seul
    // signal qui distingue "décision prise" de "encore en attente" — aucune
    // opportunité n'a de budget avant cette étape (voir NouvelleOpportunitePage).
    return project.budget !== null ? 'ACOMPTE' : 'GAGNE_PERDU';
  }

  if (project.status === 'PRET_POUR_EXECUTION') {
    const batDocument = documents.find((doc) => doc.document_type === 'FICHE_BAT');
    return batDocument && batDocument.status !== 'VALIDE' ? 'FICHE_BAT' : 'EXECUTION';
  }

  // La division responsable (par défaut le VIP) bascule elle-même le projet
  // ici une fois l'exécution terminée — voir VipWorkspaceContext.markExecutionComplete.
  if (project.status === 'PRET_POUR_LIVRAISON') {
    return 'LIVRAISON';
  }

  if (project.status === 'LIVRE') {
    return project.final_payment_received ? 'CLOTURE' : 'PAIEMENT_FINAL';
  }

  if (project.status === 'CLOTURE') {
    return 'CLOTURE';
  }

  return PROJET_STATUS_TO_STEP[project.status] ?? 'PRODUCTION';
}

export function isDossierBlocked(contact: Contact, project: Project | null, documents: Document[] = []): boolean {
  const step = deriveCurrentStep(contact, project, documents);
  if (step === 'ACOMPTE' && project) {
    return project.deposit_decided && project.requires_deposit && !project.deposit_received;
  }
  if (step === 'VALIDATION_CLIENT' && project) {
    return project.status === 'EN_CORRECTION';
  }
  if (step === 'FICHE_BAT') {
    return true;
  }
  if (step === 'PAIEMENT_FINAL' && project) {
    return !project.final_payment_received;
  }
  return false;
}

export function isRelanceDue(contact: Contact): boolean {
  return contact.next_followup_at !== null && new Date(contact.next_followup_at) <= new Date();
}
