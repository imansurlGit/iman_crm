import { useNavigate, useParams } from 'react-router-dom';
import { usePartenariatDossiers, type Dossier } from '../context/PartenariatDossiersContext';
import { formatMontant, formatPeriode } from '../services/partnershipDossierService';
import { CONVENTION_STATUS_CLASSES, CONVENTION_STATUS_LABELS, STEP_DEFINITIONS, stepIndex } from '../data/partenariatDossiers';

const CARD_TITLE_CLASSES = 'font-headline-md text-base font-bold text-on-surface';
const ADVANCE_BUTTON_CLASSES =
  'flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white text-sm font-bold rounded-lg hover:bg-on-primary-fixed-variant transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-primary';

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

interface CurrentStepPanelProps {
  dossier: Dossier;
}

function CurrentStepPanel({ dossier }: CurrentStepPanelProps) {
  const { advanceStep, setConventionStatus, setPaymentReceived, setBilanValide } = usePartenariatDossiers();

  switch (dossier.current_step) {
    case 'CREATION':
      return (
        <div className="space-y-2">
          <p className="text-xs text-secondary">
            {dossier.head_marketing_name ?? 'Le Head of Marketing'} sera notifié(e) automatiquement dès la transmission du dossier.
          </p>
          <button className={ADVANCE_BUTTON_CLASSES} onClick={() => advanceStep(dossier.id)} type="button">
            <span className="material-symbols-outlined text-[18px]">forward_to_inbox</span>
            Transmettre au Head of Marketing
          </button>
        </div>
      );
    case 'TRANSMISSION':
      return (
        <div className="space-y-2">
          <p className="text-xs text-secondary">
            Ajoute une réunion de qualification au calendrier collaboratif et une tâche de préparation de la fiche
            signalétique.
          </p>
          <button className={ADVANCE_BUTTON_CLASSES} onClick={() => advanceStep(dossier.id)} type="button">
            <span className="material-symbols-outlined text-[18px]">forum</span>
            Démarrer les discussions
          </button>
        </div>
      );
    case 'DISCUSSIONS':
      return (
        <button className={ADVANCE_BUTTON_CLASSES} onClick={() => advanceStep(dossier.id)} type="button">
          <span className="material-symbols-outlined text-[18px]">handshake</span>
          Enregistrer l'accord de principe
        </button>
      );
    case 'ACCORD_PRINCIPE':
      return (
        <button className={ADVANCE_BUTTON_CLASSES} onClick={() => advanceStep(dossier.id)} type="button">
          <span className="material-symbols-outlined text-[18px]">draft</span>
          Lancer la préparation de la convention
        </button>
      );
    case 'PREPARATION_CONVENTION':
      return (
        <button className={ADVANCE_BUTTON_CLASSES} onClick={() => advanceStep(dossier.id)} type="button">
          <span className="material-symbols-outlined text-[18px]">send</span>
          Envoyer la convention pour signature
        </button>
      );
    case 'SIGNATURE_CONVENTION': {
      const isSigned = dossier.convention_status === 'SIGNEE';
      return (
        <div className="space-y-2">
          <span
            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${CONVENTION_STATUS_CLASSES[dossier.convention_status]}`}
          >
            {CONVENTION_STATUS_LABELS[dossier.convention_status]}
          </span>
          <div className="flex flex-wrap gap-2">
            {!isSigned && (
              <button
                className="flex items-center gap-1.5 px-4 py-2.5 border border-outline-variant text-on-surface text-sm font-bold rounded-lg hover:bg-surface-container-high transition-colors"
                onClick={() => setConventionStatus(dossier.id, 'SIGNEE')}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">verified</span>
                Marquer la convention comme signée
              </button>
            )}
            <button
              className={ADVANCE_BUTTON_CLASSES}
              disabled={!isSigned}
              onClick={() => advanceStep(dossier.id)}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">payments</span>
              Passer au paiement initial
            </button>
          </div>
          {!isSigned && (
            <p className="text-xs text-error flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">error</span>
              La convention doit être signée avant de continuer.
            </p>
          )}
        </div>
      );
    }
    case 'PAIEMENT_INITIAL': {
      if (!dossier.requires_payment) {
        return (
          <div className="space-y-2">
            <p className="text-xs text-secondary">Aucun paiement requis pour ce dossier.</p>
            <button className={ADVANCE_BUTTON_CLASSES} onClick={() => advanceStep(dossier.id)} type="button">
              <span className="material-symbols-outlined text-[18px]">design_services</span>
              Passer aux supports de communication
            </button>
          </div>
        );
      }
      return (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {!dossier.payment_received && (
              <button
                className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-colors"
                onClick={() => setPaymentReceived(dossier.id)}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                Enregistrer le paiement reçu
              </button>
            )}
            <button
              className={ADVANCE_BUTTON_CLASSES}
              disabled={!dossier.payment_received}
              onClick={() => advanceStep(dossier.id)}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">design_services</span>
              Passer aux supports de communication
            </button>
          </div>
          {!dossier.payment_received && (
            <p className="text-xs text-error flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">block</span>
              Étape bloquée : le paiement initial n'a pas encore été reçu.
            </p>
          )}
        </div>
      );
    }
    case 'SUPPORTS_COMMUNICATION':
      return (
        <div className="space-y-2">
          <p className="text-xs text-secondary">
            Crée les tâches d'installation et de suivi terrain, et transfère le dossier aux équipes de production.
          </p>
          <button className={ADVANCE_BUTTON_CLASSES} onClick={() => advanceStep(dossier.id)} type="button">
            <span className="material-symbols-outlined text-[18px]">local_shipping</span>
            Lancer le déploiement
          </button>
        </div>
      );
    case 'DEPLOIEMENT':
      return (
        <button className={ADVANCE_BUTTON_CLASSES} onClick={() => advanceStep(dossier.id)} type="button">
          <span className="material-symbols-outlined text-[18px]">celebration</span>
          Marquer l'événement comme réalisé
        </button>
      );
    case 'REALISATION':
      return (
        <button className={ADVANCE_BUTTON_CLASSES} onClick={() => advanceStep(dossier.id)} type="button">
          <span className="material-symbols-outlined text-[18px]">assessment</span>
          Passer au bilan
        </button>
      );
    case 'BILAN':
      return (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {!dossier.bilan_valide && (
              <button
                className="flex items-center gap-1.5 px-4 py-2.5 border border-outline-variant text-on-surface text-sm font-bold rounded-lg hover:bg-surface-container-high transition-colors"
                onClick={() => setBilanValide(dossier.id)}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">upload_file</span>
                Déposer et valider le bilan
              </button>
            )}
            <button
              className={ADVANCE_BUTTON_CLASSES}
              disabled={!dossier.bilan_valide}
              onClick={() => advanceStep(dossier.id)}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">task_alt</span>
              Clôturer le dossier
            </button>
          </div>
          {!dossier.bilan_valide && (
            <p className="text-xs text-error flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">block</span>
              La clôture n'est possible qu'une fois le bilan déposé et validé.
            </p>
          )}
        </div>
      );
    case 'CLOTURE':
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-700 text-sm font-semibold">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          Dossier clôturé — aucune action supplémentaire requise.
        </div>
      );
    default:
      return null;
  }
}

export default function PartenariatDossierDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { dossiers, isLoading, toggleTask } = usePartenariatDossiers();

  const dossier = dossiers.find((d) => d.id === Number(id));

  if (isLoading) {
    return <p className="font-body-sm text-body-sm text-secondary">Chargement...</p>;
  }

  if (!dossier) {
    return (
      <div className="space-y-3">
        <p className="font-body-sm text-body-sm text-secondary">Ce dossier partenariat est introuvable.</p>
        <button className="text-primary text-sm font-semibold hover:underline" onClick={() => navigate('/partenariats/dossiers')} type="button">
          Retour aux dossiers
        </button>
      </div>
    );
  }

  const currentIndex = stepIndex(dossier.current_step);
  const sortedTimeline = [...dossier.timeline].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div className="flex flex-col gap-gutter">
      {/* Header */}
      <section className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div>
          <nav className="flex items-center gap-1.5 mb-2 text-on-surface-variant text-xs font-medium">
            <button className="hover:text-primary transition-colors cursor-pointer" onClick={() => navigate('/partenariats/dossiers')} type="button">
              Dossiers de partenariat
            </button>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-on-surface">{dossier.reference}</span>
          </nav>
          <h2 className="font-headline-md text-xl font-bold text-on-surface tracking-tight">{dossier.partenaire_name}</h2>
          <div className="flex flex-wrap items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5 text-sm font-bold text-on-surface">
              <span className="material-symbols-outlined text-[18px] text-primary">person</span>
              {dossier.contact_name}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-secondary">
              <span className="material-symbols-outlined text-[18px]">event</span>
              {dossier.evenement}
            </div>
            {formatPeriode(dossier.evenement_debut, dossier.evenement_fin) && (
              <div className="flex items-center gap-1.5 text-sm text-secondary">
                <span className="material-symbols-outlined text-[18px]">date_range</span>
                {formatPeriode(dossier.evenement_debut, dossier.evenement_fin)}
              </div>
            )}
            <div className="flex items-center gap-1.5 text-sm text-secondary">
              <span className="material-symbols-outlined text-[18px]">payments</span>
              {formatMontant(dossier.montant)}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-primary/5 border border-primary/20 text-primary">
              {STEP_DEFINITIONS[currentIndex].label}
            </span>
            {dossier.urgent && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-error text-white">Urgent</span>
            )}
          </div>
        </div>
      </section>

      {/* Colonnes */}
      <div className="grid grid-cols-12 gap-gutter items-start">
        {/* Colonne gauche : étapes + journal */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-gutter">
          <div className="bg-surface-container-lowest border border-outline-variant p-5">
            <h3 className={`${CARD_TITLE_CLASSES} mb-5`}>Étapes du workflow</h3>
            <div className="flex flex-col">
              {STEP_DEFINITIONS.map((step, index) => {
                const isDone = index < currentIndex;
                const isCurrent = index === currentIndex;
                return (
                  <div className="flex gap-3" key={step.key}>
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          isDone
                            ? 'bg-primary text-white'
                            : isCurrent
                              ? 'bg-white border-2 border-primary text-primary shadow-[0_0_0_4px_rgba(139,26,14,0.15)]'
                              : 'bg-surface-container-high text-secondary'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">{isDone ? 'check' : step.icon}</span>
                      </div>
                      {index < STEP_DEFINITIONS.length - 1 && (
                        <div className={`w-[2px] flex-1 min-h-[16px] ${isDone ? 'bg-primary' : 'bg-outline-variant'}`} />
                      )}
                    </div>
                    <div className={`flex-1 min-w-0 ${index < STEP_DEFINITIONS.length - 1 ? 'pb-5' : ''}`}>
                      <p
                        className={`text-sm ${
                          isCurrent ? 'font-bold text-on-surface' : isDone ? 'font-medium text-on-surface' : 'text-secondary'
                        }`}
                      >
                        {step.label}
                      </p>
                      {isCurrent && (
                        <div className="mt-3 p-3.5 bg-surface-container-low rounded-lg">
                          <CurrentStepPanel dossier={dossier} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant p-5">
            <h3 className={`${CARD_TITLE_CLASSES} mb-4`}>Journal du dossier</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {sortedTimeline.map((entry) => (
                <div className="flex gap-3" key={entry.id}>
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      entry.kind === 'ACTION' ? 'bg-primary-container/10 text-primary' : 'bg-surface-container-high text-secondary'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">{entry.kind === 'ACTION' ? 'bolt' : 'smart_toy'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-on-surface">{entry.label}</p>
                    <p className="text-[11px] text-secondary">
                      {entry.author_name ?? '—'} · {formatDateTime(entry.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Colonne droite : résumé, convention, paiement, tâches */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-gutter">
          <div className="bg-surface-container-lowest border border-outline-variant p-5">
            <h3 className={`${CARD_TITLE_CLASSES} mb-4`}>Résumé</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-secondary">Responsable Marketing</dt>
                <dd className="font-semibold text-on-surface text-right">{dossier.head_marketing_name ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-secondary">Créé le</dt>
                <dd className="font-semibold text-on-surface text-right">{formatDateTime(dossier.created_at)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-secondary">Montant</dt>
                <dd className="font-semibold text-on-surface text-right">{formatMontant(dossier.montant)}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant p-5">
            <h3 className={`${CARD_TITLE_CLASSES} mb-3`}>Convention</h3>
            <span
              className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${CONVENTION_STATUS_CLASSES[dossier.convention_status]}`}
            >
              {CONVENTION_STATUS_LABELS[dossier.convention_status]}
            </span>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant p-5">
            <h3 className={`${CARD_TITLE_CLASSES} mb-3`}>Paiement initial</h3>
            {dossier.requires_payment ? (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                  dossier.payment_received ? 'bg-emerald-100 text-emerald-700' : 'bg-error-container text-error'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">{dossier.payment_received ? 'check_circle' : 'schedule'}</span>
                {dossier.payment_received ? 'Reçu' : 'En attente'}
              </span>
            ) : (
              <span className="text-sm text-secondary">Non requis pour ce dossier</span>
            )}
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant p-5">
            <h3 className={`${CARD_TITLE_CLASSES} mb-3 flex items-center gap-2`}>
              Tâches de suivi
              <span className="bg-surface-container-high px-1.5 py-0.5 rounded-full text-[11px] font-bold text-secondary">
                {dossier.tasks.filter((t) => t.done).length}/{dossier.tasks.length}
              </span>
            </h3>
            {dossier.tasks.length > 0 ? (
              <div className="space-y-2">
                {dossier.tasks.map((task) => (
                  <label className="flex items-start gap-2.5 text-sm cursor-pointer" key={task.id}>
                    <input
                      checked={task.done}
                      className="w-4 h-4 mt-0.5 accent-primary shrink-0"
                      onChange={() => toggleTask(dossier.id, task.id)}
                      type="checkbox"
                    />
                    <span className={task.done ? 'line-through text-secondary' : 'text-on-surface'}>{task.label}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-secondary">Aucune tâche générée pour l'instant.</p>
            )}
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant p-5">
            <h3 className={`${CARD_TITLE_CLASSES} mb-3`}>Contact partenaire</h3>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-primary-container text-white flex items-center justify-center text-xs font-bold shrink-0">
                {getInitials(dossier.contact_name)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-on-surface truncate">{dossier.contact_name}</p>
                <p className="text-xs text-secondary truncate">{dossier.partenaire_name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
