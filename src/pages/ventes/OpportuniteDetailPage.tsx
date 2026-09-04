import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getProject,
  startProject,
  formatProjectDeadline,
  PRIORITY_BADGE_CLASSES,
  STATUS_BADGE_CLASSES,
  type Project,
} from '../../services/projectService';
import { getContact, type Contact } from '../../services/contactService';
import CelebrationModal from '../../components/CelebrationModal';

const CARD_TITLE_CLASSES = 'font-headline-md text-base font-bold text-on-surface';
const PRIMARY_BUTTON_CLASSES =
  'px-4 py-2 text-sm bg-primary-container text-on-primary font-semibold rounded transition-transform active:scale-95 hover:bg-primary';

function formatFCFA(value: string | null): string {
  if (!value) return 'Non défini';
  const amount = Number(value);
  if (Number.isNaN(amount)) return 'Non défini';
  return `${amount.toLocaleString('fr-FR')} FCFA`;
}

function formatDeadlineDate(value: string | null): string {
  if (!value) return 'Non définie';
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function OpportuniteDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const canRecordPayments = user?.role === 'COMPTABLE_GENERAL' || user?.role === 'ASSISTANT_COMPTABLE';
  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient] = useState<Contact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    const projectId = Number(id);
    if (!projectId) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    getProject(projectId)
      .then((data) => {
        setProject(data);
        return getContact(data.client);
      })
      .then(setClient)
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [id]);

  async function handleStart() {
    if (!project) return;
    setStartError(null);
    setIsStarting(true);
    try {
      const updated = await startProject(project.id);
      setProject(updated);
      setShowCelebration(true);
    } catch {
      setStartError("Impossible de démarrer le projet pour l'instant.");
    } finally {
      setIsStarting(false);
    }
  }

  function handleCelebrationClose() {
    setShowCelebration(false);
    navigate('/projets');
  }

  if (isLoading) {
    return <p className="font-body-sm text-body-sm text-secondary">Chargement...</p>;
  }

  if (notFound || !project) {
    return (
      <div className="space-y-3">
        <p className="font-body-sm text-body-sm text-secondary">Cette opportunité est introuvable.</p>
        <button className="text-primary text-sm font-semibold hover:underline" onClick={() => navigate('/opportunites')} type="button">
          Retour aux opportunités
        </button>
      </div>
    );
  }

  const missingRequirements: string[] = [];
  if (!project.deadline) missingRequirements.push('une échéance');
  if (!project.budget) missingRequirements.push('un budget');
  if (project.prestations.length === 0) missingRequirements.push('au moins une prestation');
  if (project.requires_deposit && !project.deposit_received) missingRequirements.push("l'acompte reçu");
  const isReadyToStart = missingRequirements.length === 0;
  const isProject = project.kind === 'PROJET';

  return (
    <div className="flex flex-col gap-gutter">
      {/* Header */}
      <section className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div>
          <nav className="flex items-center gap-1.5 mb-2 text-on-surface-variant text-xs font-medium">
            <button
              className="hover:text-primary transition-colors cursor-pointer"
              onClick={() => navigate('/opportunites')}
              type="button"
            >
              Opportunités
            </button>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-on-surface">Détails</span>
          </nav>
          <h2 className="font-headline-md text-xl font-bold text-on-surface tracking-tight">{project.name}</h2>
          <div className="flex flex-wrap items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5 text-sm font-bold text-on-surface">
              <span className="material-symbols-outlined text-[18px] text-primary">apartment</span>
              {client?.company || project.client_name}
            </div>
            {client?.phone && (
              <div className="flex items-center gap-1.5 text-sm text-secondary">
                <span className="material-symbols-outlined text-[18px]">call</span>
                {client.phone}
              </div>
            )}
            {client?.email && (
              <div className="flex items-center gap-1.5 text-sm text-secondary">
                <span className="material-symbols-outlined text-[18px]">mail</span>
                {client.email}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${STATUS_BADGE_CLASSES[project.status]}`}>
              {project.status_display}
            </span>
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${PRIORITY_BADGE_CLASSES[project.priority]}`}
            >
              {project.priority_display}
            </span>
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${
                isProject ? 'bg-emerald-100 text-emerald-700' : 'bg-primary/5 border border-primary/20 text-primary'
              }`}
            >
              {project.kind_display}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          {isProject ? (
            <div className="flex items-center gap-1.5 px-4 py-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              Projet démarré
            </div>
          ) : (
            <button
              className={`${PRIMARY_BUTTON_CLASSES} flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-container`}
              disabled={!isReadyToStart || isStarting}
              onClick={handleStart}
              title={isReadyToStart ? undefined : `Complétez d'abord : ${missingRequirements.join(', ')}.`}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
              {isStarting ? 'Démarrage...' : 'Démarrer le projet'}
            </button>
          )}
          {startError && <span className="text-xs text-error font-semibold max-w-[220px] text-right">{startError}</span>}
          {!isProject && !isReadyToStart && !startError && (
            <span className="text-[11px] text-secondary max-w-[220px] text-right">Manque : {missingRequirements.join(', ')}.</span>
          )}
        </div>
      </section>

      {/* Infos clés */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
        <div className="bg-surface-container-lowest border border-outline-variant p-4">
          <span className="text-secondary text-xs font-medium block mb-1">Budget estimé</span>
          <span className="font-headline-md text-lg font-bold text-on-surface">{formatFCFA(project.budget)}</span>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-4">
          <span className="text-secondary text-xs font-medium block mb-1">Acompte</span>
          <span className="font-headline-md text-lg font-bold text-on-surface">
            {project.requires_deposit ? formatFCFA(project.deposit_amount) : 'Non requis'}
          </span>
          {project.requires_deposit && (
            <div className="mt-2">
              {project.deposit_received ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  Reçu
                </span>
              ) : canRecordPayments ? (
                <button
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                  onClick={() => navigate('/finance')}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[14px]">payments</span>
                  Enregistrer l'encaissement
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-secondary">
                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                  En attente de la Comptabilité
                </span>
              )}
            </div>
          )}
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-4">
          <span className="text-secondary text-xs font-medium block mb-1">Échéance visée</span>
          <span className="font-headline-md text-lg font-bold text-on-surface">{formatDeadlineDate(project.deadline)}</span>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-4">
          <span className="text-secondary text-xs font-medium block mb-1">Probabilité</span>
          <span className="font-headline-md text-lg font-bold text-on-surface">
            {project.probability !== null ? `${project.probability}%` : '—'}
          </span>
        </div>
      </section>

      {/* Besoin exprimé */}
      {project.description && (
        <section className="bg-surface-container-lowest border border-outline-variant p-5">
          <h3 className={`${CARD_TITLE_CLASSES} mb-3`}>Besoin exprimé</h3>
          <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-line">{project.description}</p>
        </section>
      )}

      {/* Prestations */}
      <section className="bg-surface-container-lowest border border-outline-variant p-5">
        <h3 className={`${CARD_TITLE_CLASSES} mb-4 flex items-center gap-2`}>
          Prestations
          <span className="bg-surface-container-high px-1.5 py-0.5 rounded-full text-[11px] font-bold text-secondary">
            {project.prestations.length}
          </span>
        </h3>
        {project.prestations.length > 0 ? (
          <div className="space-y-2">
            {project.prestations.map((prestation) => (
              <div
                className="flex items-center justify-between px-4 py-3 bg-white border border-outline-variant rounded-lg"
                key={prestation.id}
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-primary">layers</span>
                  <span className="text-sm font-medium text-on-surface">{prestation.label}</span>
                </div>
                <span className="text-xs text-secondary">{formatProjectDeadline(prestation.deadline)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-secondary">
            Aucune prestation renseignée pour l'instant — requis avant de démarrer le projet.
          </p>
        )}
      </section>

      <CelebrationModal
        isOpen={showCelebration}
        message={
          <>
            <strong className="text-on-surface">{project.name}</strong> est maintenant un projet confirmé.
          </>
        }
        onClose={handleCelebrationClose}
        title="Projet démarré !"
      />
    </div>
  );
}
