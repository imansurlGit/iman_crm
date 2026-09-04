import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useDeveloppeurWorkspace,
  SUBMISSION_STATUS_LABELS,
  SUBMISSION_STATUS_CLASSES,
  type DeveloperTaskStatus,
} from '../context/DeveloppeurWorkspaceContext';
import { formatTaskDueLabel, type TaskPriority } from '../services/taskService';
import { createDocument } from '../services/documentService';
import { listDirectory, type CurrentUser } from '../services/userService';

// Les chefs de division et le DG sont habilités à valider (mêmes rôles que
// dans DocumentDetailPage.tsx, où le DG peut déjà être désigné validateur).
const VALIDATOR_ROLES = ['CDN', 'CDV', 'CDM', 'DG'];

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  HIGH: 'Élevée',
  MEDIUM: 'Moyenne',
  LOW: 'Faible',
};

const PRIORITY_CLASSES: Record<TaskPriority, string> = {
  HIGH: 'bg-red-100 text-red-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LOW: 'bg-gray-100 text-gray-700',
};

// Une nouvelle soumission n'a de sens que si aucune n'existe encore, ou si
// la précédente a été rejetée — sinon (en attente, modifications demandées,
// validée, terminée) l'action se passe ailleurs (DocumentDetailPage ou le
// bouton "Marquer comme terminée" ci-dessous).
const NEW_SUBMISSION_STATUSES: DeveloperTaskStatus[] = ['A_FAIRE', 'REJETEE'];

const COMPACT_INPUT_CLASSES =
  'w-full px-3 py-2 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container outline-none';

export default function DeveloppeurTacheDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tasks, isLoading: isWorkspaceLoading, markTaskDone } = useDeveloppeurWorkspace();

  const task = tasks.find((t) => t.id === Number(id));

  const [validators, setValidators] = useState<CurrentUser[]>([]);

  const [link, setLink] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [comment, setComment] = useState('');
  const [selectedValidatorIds, setSelectedValidatorIds] = useState<number[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMarkingDone, setIsMarkingDone] = useState(false);

  useEffect(() => {
    listDirectory().then((users) => setValidators(users.filter((u) => VALIDATOR_ROLES.includes(u.role ?? ''))));
  }, []);

  function toggleValidator(userId: number) {
    setSelectedValidatorIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!task || isSubmitting) return;
    if (!task.projectId) {
      setSubmitError('Projet introuvable pour cette tâche.');
      return;
    }
    if (!link.trim() && !file) {
      setSubmitError('Indiquez un lien ou joignez un fichier.');
      return;
    }
    if (selectedValidatorIds.length === 0) {
      setSubmitError('Choisissez au moins un validateur.');
      return;
    }
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('owner_type', 'PROJECT');
      formData.append('project', String(task.projectId));
      formData.append('task', String(task.id));
      formData.append('document_type', 'LIVRABLE_FINAL');
      formData.append('status', 'A_VALIDER');
      formData.append('label', task.label);
      if (link.trim()) formData.append('link', link.trim());
      if (file) formData.append('file', file);
      selectedValidatorIds.forEach((validatorId) => formData.append('validators', String(validatorId)));
      await createDocument(formData);
      setLink('');
      setFile(null);
      setComment('');
      setSelectedValidatorIds([]);
      setSubmitError(null);
      // La soumission déplace la tâche vers "En attente de validation" —
      // le contexte se rafraîchira au prochain chargement de la liste.
      navigate('/developpeur/taches');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleMarkDone() {
    if (!task || isMarkingDone) return;
    setIsMarkingDone(true);
    try {
      await markTaskDone(task);
      navigate('/developpeur/taches');
    } finally {
      setIsMarkingDone(false);
    }
  }

  if (isWorkspaceLoading) {
    return <p className="font-body-sm text-body-sm text-secondary">Chargement...</p>;
  }

  if (!task) {
    return (
      <div className="space-y-3">
        <p className="font-body-sm text-body-sm text-secondary">Cette tâche est introuvable.</p>
        <button className="text-primary text-sm font-semibold hover:underline" onClick={() => navigate('/developpeur/taches')} type="button">
          Retour à mes tâches
        </button>
      </div>
    );
  }

  const canSubmitNew = NEW_SUBMISSION_STATUSES.includes(task.submissionStatus);

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-gutter">
      <div>
        <nav className="flex items-center gap-1.5 mb-2 text-on-surface-variant text-xs font-medium">
          <button className="hover:text-primary transition-colors cursor-pointer" onClick={() => navigate('/developpeur/taches')} type="button">
            Mes tâches
          </button>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-on-surface">Traiter</span>
        </nav>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className="font-headline-md text-xl font-bold text-on-surface tracking-tight">{task.label}</h2>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${PRIORITY_CLASSES[task.priority]}`}>
            {PRIORITY_LABELS[task.priority]}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${SUBMISSION_STATUS_CLASSES[task.submissionStatus]}`}>
            {SUBMISSION_STATUS_LABELS[task.submissionStatus]}
          </span>
        </div>
        <p className="text-sm text-secondary mt-1">
          {task.projectName} · {formatTaskDueLabel(task)}
        </p>
        {task.description && <p className="text-sm text-on-surface-variant italic mt-2">« {task.description} »</p>}
      </div>

      {task.lastDocumentId && (
        <div className="bg-surface-container-lowest border border-outline-variant p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-headline-md text-base font-bold text-on-surface">Dernière soumission</h3>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${SUBMISSION_STATUS_CLASSES[task.submissionStatus]}`}>
              {SUBMISSION_STATUS_LABELS[task.submissionStatus]}
            </span>
          </div>
          <button
            className="text-xs font-bold text-primary hover:underline"
            onClick={() => navigate(`/documents/${task.lastDocumentId}`)}
            type="button"
          >
            Voir le document et son historique
          </button>
        </div>
      )}

      {task.submissionStatus === 'VALIDEE_A_CLOTURER' && (
        <div className="bg-blue-50 border border-blue-200 p-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-blue-900">Soumission validée</p>
            <p className="text-xs text-blue-800 mt-0.5">Vous pouvez maintenant clôturer cette tâche.</p>
          </div>
          <button
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 shrink-0"
            disabled={isMarkingDone}
            onClick={handleMarkDone}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            {isMarkingDone ? 'Enregistrement...' : 'Marquer comme terminée'}
          </button>
        </div>
      )}

      {canSubmitNew && (
        <form className="bg-surface-container-lowest border border-outline-variant p-5 flex flex-col gap-4" onSubmit={handleSubmit}>
          <h3 className="font-headline-md text-base font-bold text-on-surface">
            {task.submissionStatus === 'REJETEE' ? 'Nouvelle soumission' : 'Envoyer pour validation'}
          </h3>
          <p className="text-xs text-secondary -mt-2">
            Généralement un lien (environnement de recette, pull request, accès) — un fichier joint reste possible.
          </p>

          <div className="space-y-1.5">
            <label className="font-label-md text-label-md text-on-surface-variant uppercase" htmlFor="task-link">
              Lien
            </label>
            <input
              className={COMPACT_INPUT_CLASSES}
              id="task-link"
              onChange={(event) => {
                setLink(event.target.value);
                setSubmitError(null);
              }}
              placeholder="https://..."
              type="url"
              value={link}
            />
          </div>

          <div className="space-y-1.5">
            <label
              className="flex items-center gap-2 px-3 py-2.5 bg-white border border-dashed border-outline-variant rounded text-sm cursor-pointer hover:border-primary/40 transition-colors"
              htmlFor="task-file"
            >
              <span className="material-symbols-outlined text-[18px] text-primary shrink-0">upload_file</span>
              <span className={file ? 'text-on-surface truncate' : 'text-outline'}>
                {file ? file.name : 'Joindre un fichier (optionnel)...'}
              </span>
              <input
                className="hidden"
                id="task-file"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setSubmitError(null);
                }}
                type="file"
              />
            </label>
          </div>

          <div className="space-y-1.5">
            <label className="font-label-md text-label-md text-on-surface-variant uppercase" htmlFor="task-comment">
              Commentaire
            </label>
            <textarea
              className={`${COMPACT_INPUT_CLASSES} resize-none h-16`}
              id="task-comment"
              onChange={(event) => setComment(event.target.value)}
              placeholder="Ce qui a été fait, points d'attention pour la relecture..."
              value={comment}
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-label-md text-label-md text-on-surface-variant uppercase">Validateur(s)</label>
            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
              {validators.map((validatorUser) => (
                <label
                  className="flex items-center gap-2.5 px-3 py-2 bg-white border border-outline-variant rounded text-sm cursor-pointer hover:bg-surface-container-low transition-colors"
                  key={validatorUser.id}
                >
                  <input
                    checked={selectedValidatorIds.includes(validatorUser.id)}
                    className="w-4 h-4 text-primary focus:ring-primary rounded-sm border-outline"
                    onChange={() => {
                      toggleValidator(validatorUser.id);
                      setSubmitError(null);
                    }}
                    type="checkbox"
                  />
                  <span className="text-on-surface">
                    {validatorUser.first_name} {validatorUser.last_name}
                  </span>
                  <span className="ml-auto text-[10px] font-bold uppercase text-secondary shrink-0">{validatorUser.role_display}</span>
                </label>
              ))}
              {validators.length === 0 && <p className="text-xs text-secondary">Aucun validateur disponible pour l'instant.</p>}
            </div>
          </div>

          {submitError && <p className="text-xs text-error font-semibold">{submitError}</p>}

          <button
            className="flex items-center justify-center gap-1.5 bg-primary text-white py-2.5 rounded-full text-sm font-bold shadow-sm hover:shadow-md hover:bg-on-primary-fixed-variant active:scale-95 transition-all disabled:opacity-40"
            disabled={isSubmitting}
            type="submit"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
            {isSubmitting ? 'Envoi...' : 'Envoyer pour validation'}
          </button>
        </form>
      )}

      {task.submissionStatus === 'MODIFICATIONS_DEMANDEES' && (
        <div className="bg-surface-container-low border border-dashed border-outline-variant p-4 text-center">
          <p className="text-sm text-secondary">
            Des modifications ont été demandées — ouvrez le document ci-dessus pour envoyer une nouvelle version.
          </p>
        </div>
      )}

      {task.submissionStatus === 'EN_ATTENTE_VALIDATION' && (
        <div className="bg-surface-container-low border border-dashed border-outline-variant p-4 text-center">
          <p className="text-sm text-secondary">En attente de la décision du ou des validateurs.</p>
        </div>
      )}

      {task.submissionStatus === 'TERMINEE' && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          Tâche terminée — aucune action supplémentaire requise.
        </div>
      )}
    </div>
  );
}
