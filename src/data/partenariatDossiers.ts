// Métadonnées pures du workflow partenariat (libellés, icônes, ordre des
// étapes) — les dossiers eux-mêmes sont réels, voir
// services/partnershipDossierService.ts et context/PartenariatDossiersContext.tsx.

export type DossierStep =
  | 'CREATION'
  | 'TRANSMISSION'
  | 'DISCUSSIONS'
  | 'ACCORD_PRINCIPE'
  | 'PREPARATION_CONVENTION'
  | 'SIGNATURE_CONVENTION'
  | 'PAIEMENT_INITIAL'
  | 'SUPPORTS_COMMUNICATION'
  | 'DEPLOIEMENT'
  | 'REALISATION'
  | 'BILAN'
  | 'CLOTURE';

export interface StepDefinition {
  key: DossierStep;
  label: string;
  shortLabel: string;
  icon: string;
}

export const STEP_DEFINITIONS: StepDefinition[] = [
  { key: 'CREATION', label: 'Création du dossier partenariat', shortLabel: 'Création', icon: 'note_add' },
  { key: 'TRANSMISSION', label: 'Transmission au Head of Marketing', shortLabel: 'Transmission', icon: 'forward_to_inbox' },
  {
    key: 'DISCUSSIONS',
    label: 'Discussions, qualification, réunions et fiche signalétique',
    shortLabel: 'Discussions',
    icon: 'forum',
  },
  { key: 'ACCORD_PRINCIPE', label: 'Accord de principe', shortLabel: 'Accord de principe', icon: 'handshake' },
  { key: 'PREPARATION_CONVENTION', label: 'Préparation de la convention', shortLabel: 'Préparation convention', icon: 'draft' },
  {
    key: 'SIGNATURE_CONVENTION',
    label: 'Envoi et signature de la convention',
    shortLabel: 'Signature',
    icon: 'edit_document',
  },
  { key: 'PAIEMENT_INITIAL', label: 'Paiement initial si nécessaire', shortLabel: 'Paiement initial', icon: 'payments' },
  {
    key: 'SUPPORTS_COMMUNICATION',
    label: 'Mise au format et création des supports de communication',
    shortLabel: 'Supports de com.',
    icon: 'design_services',
  },
  {
    key: 'DEPLOIEMENT',
    label: "Déploiement, installation et préparation de l'événement",
    shortLabel: 'Déploiement',
    icon: 'local_shipping',
  },
  { key: 'REALISATION', label: "Réalisation de l'événement", shortLabel: 'Événement', icon: 'celebration' },
  { key: 'BILAN', label: 'Bilan', shortLabel: 'Bilan', icon: 'assessment' },
  { key: 'CLOTURE', label: 'Clôture', shortLabel: 'Clôture', icon: 'task_alt' },
];

export function stepIndex(step: DossierStep): number {
  return STEP_DEFINITIONS.findIndex((s) => s.key === step);
}

export type ConventionStatus = 'NON_DEMARREE' | 'EN_PREPARATION' | 'ENVOYEE' | 'SIGNEE';

export const CONVENTION_STATUS_LABELS: Record<ConventionStatus, string> = {
  NON_DEMARREE: 'Non démarrée',
  EN_PREPARATION: 'En préparation',
  ENVOYEE: 'Envoyée pour signature',
  SIGNEE: 'Signée',
};

export const CONVENTION_STATUS_CLASSES: Record<ConventionStatus, string> = {
  NON_DEMARREE: 'bg-gray-100 text-gray-700',
  EN_PREPARATION: 'bg-amber-100 text-amber-700',
  ENVOYEE: 'bg-blue-100 text-blue-700',
  SIGNEE: 'bg-emerald-100 text-emerald-700',
};
