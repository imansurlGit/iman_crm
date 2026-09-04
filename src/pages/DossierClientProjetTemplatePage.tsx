import { useNavigate } from 'react-router-dom';

// TODO: gabarit statique — proposition de design pour la page de détail d'un
// dossier une fois qu'il est devenu "Client" (Project kind=PROJET). Le
// workflow n'est plus une progression de vente (prospection -> devis) mais un
// suivi de production/livraison : prestations, validation client, documents,
// paiement. L'ancienne checklist en 12 étapes verticale est remplacée par un
// stepper horizontal compact ne montrant que les étapes de production, et
// l'historique commercial (prospection, devis) est relégué à une bande
// résumée en bas plutôt qu'à la vedette. À fusionner dans
// DossierClientDetailPage.tsx une fois le design validé.

const CARD_TITLE_CLASSES = 'font-headline-md text-base font-bold text-on-surface';

const PRODUCTION_STEPS = [
  { key: 'PRODUCTION', label: 'Conception', icon: 'design_services' },
  { key: 'VALIDATION_CLIENT', label: 'Validation client', icon: 'fact_check' },
  { key: 'FICHE_BAT', label: 'Fiche BAT', icon: 'edit_document' },
  { key: 'EXECUTION', label: 'Exécution', icon: 'precision_manufacturing' },
  { key: 'LIVRAISON', label: 'Livraison', icon: 'local_shipping' },
  { key: 'PAIEMENT_FINAL', label: 'Paiement final', icon: 'account_balance_wallet' },
  { key: 'CLOTURE', label: 'Clôture', icon: 'task_alt' },
];

const CURRENT_STEP_INDEX = 0; // "Conception" en cours, pour la démo

const PRESTATIONS = [
  { name: 'Conception logo & charte graphique', assignee: 'Aïssa Karimou', status: 'Terminé' as const },
  { name: 'Maquette site vitrine', assignee: 'Boubacar Rabé', status: 'En cours' as const },
  { name: 'Rédaction des contenus', assignee: 'Aïssa Karimou', status: 'À faire' as const },
  { name: 'Intégration & mise en ligne', assignee: 'Boubacar Rabé', status: 'À faire' as const },
];

const PRESTATION_STATUS_CLASSES: Record<string, string> = {
  Terminé: 'bg-emerald-100 text-emerald-700',
  'En cours': 'bg-blue-100 text-blue-700',
  'À faire': 'bg-surface-container-high text-secondary',
};

const DOCUMENTS = [
  { label: 'Devis initial', status: 'Validé', icon: 'request_quote', classes: 'bg-emerald-100 text-emerald-700' },
  { label: 'Fiche BAT', status: 'À valider', icon: 'edit_document', classes: 'bg-amber-100 text-amber-700' },
  { label: 'Facture finale', status: 'À venir', icon: 'receipt_long', classes: 'bg-surface-container-high text-secondary' },
];

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function DossierClientProjetTemplatePage() {
  const navigate = useNavigate();

  const montantTotal = 2_400_000;
  const montantPaye = 1_200_000;
  const soldeDu = montantTotal - montantPaye;
  const paidRatio = Math.round((montantPaye / montantTotal) * 100);

  return (
    <div className="flex flex-col gap-gutter">
      {/* Header */}
      <section className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div>
          <nav className="flex items-center gap-1.5 mb-2 text-on-surface-variant text-xs font-medium">
            <button className="hover:text-primary transition-colors cursor-pointer" onClick={() => navigate('/dossiers-clients')} type="button">
              Dossiers clients
            </button>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-on-surface">Nigelec</span>
          </nav>
          <div className="flex items-center gap-2.5">
            <h2 className="font-headline-md text-xl font-bold text-on-surface tracking-tight">Nigelec</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700">
              Client
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5 text-sm font-bold text-on-surface">
              <span className="material-symbols-outlined text-[18px] text-primary">person</span>
              Fatouma Idrissa
            </div>
            <div className="flex items-center gap-1.5 text-sm text-secondary">
              <span className="material-symbols-outlined text-[18px]">design_services</span>
              Refonte identité visuelle & site vitrine
            </div>
            <div className="flex items-center gap-1.5 text-sm text-secondary">
              <span className="material-symbols-outlined text-[18px]">payments</span>
              {montantTotal.toLocaleString('fr-FR')} FCFA
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200/80 rounded-xl pl-3 pr-4 py-2 shadow-sm shrink-0">
          <div className="w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-[18px]">local_shipping</span>
          </div>
          <div className="leading-tight">
            <p className="text-[9px] uppercase tracking-wider font-bold text-blue-700">Livraison prévue</p>
            <p className="text-sm font-bold text-blue-900 whitespace-nowrap">10 sept. 2026</p>
          </div>
        </div>
      </section>

      {/* Suivi de production — stepper horizontal, ne montre que les étapes de production */}
      <section className="bg-surface-container-lowest border border-outline-variant p-5">
        <h3 className={`${CARD_TITLE_CLASSES} mb-5`}>Suivi de production</h3>
        <div className="flex items-start">
          {PRODUCTION_STEPS.map((step, index) => {
            const isDone = index < CURRENT_STEP_INDEX;
            const isCurrent = index === CURRENT_STEP_INDEX;
            return (
              <div className="flex-1 flex flex-col items-center relative" key={step.key}>
                {index > 0 && (
                  <div
                    className={`absolute top-4 right-1/2 w-full h-[2px] ${index <= CURRENT_STEP_INDEX ? 'bg-primary' : 'bg-outline-variant'}`}
                  />
                )}
                <div
                  className={`relative w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    isDone
                      ? 'bg-primary text-white'
                      : isCurrent
                        ? 'bg-white border-2 border-primary text-primary shadow-[0_0_0_4px_rgba(139,26,14,0.15)]'
                        : 'bg-surface-container-high text-secondary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{isDone ? 'check' : step.icon}</span>
                </div>
                <p className={`mt-2 text-[11px] text-center leading-tight ${isCurrent ? 'font-bold text-on-surface' : isDone ? 'font-medium text-on-surface' : 'text-secondary'}`}>
                  {step.label}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Colonnes */}
      <div className="grid grid-cols-12 gap-gutter items-start">
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-gutter">
          {/* Prestations */}
          <div className="bg-surface-container-lowest border border-outline-variant p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className={CARD_TITLE_CLASSES}>Prestations</h3>
              <span className="text-xs text-secondary font-medium">1/4 terminées</span>
            </div>
            <div className="space-y-2">
              {PRESTATIONS.map((prestation) => (
                <div className="flex items-center gap-3 bg-white border border-outline-variant/60 rounded-lg p-3" key={prestation.name}>
                  <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">design_services</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-on-surface truncate">{prestation.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-4 h-4 rounded-full bg-primary-container text-white flex items-center justify-center text-[8px] font-bold shrink-0">
                        {getInitials(prestation.assignee)}
                      </div>
                      <span className="text-[11px] text-secondary truncate">{prestation.assignee}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${PRESTATION_STATUS_CLASSES[prestation.status]}`}>
                    {prestation.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Validation client */}
          <div className="bg-surface-container-lowest border border-outline-variant p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className={CARD_TITLE_CLASSES}>Validation client</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-surface-container-high text-secondary">
                Pas encore envoyé
              </span>
            </div>
            <p className="text-xs text-secondary">
              Envoyez les livrables au client pour validation dès que la conception est prête. L'historique des allers-retours
              (envoi, retours, révisions) apparaîtra ici.
            </p>
          </div>

          {/* Documents */}
          <div className="bg-surface-container-lowest border border-outline-variant p-5">
            <h3 className={`${CARD_TITLE_CLASSES} mb-4`}>Documents</h3>
            <div className="space-y-2">
              {DOCUMENTS.map((doc) => (
                <div className="flex items-center gap-3 bg-white border border-outline-variant/60 rounded-lg p-3" key={doc.label}>
                  <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">{doc.icon}</span>
                  <p className="text-sm font-semibold text-on-surface flex-1">{doc.label}</p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${doc.classes}`}>{doc.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Historique commercial — relégué en bande résumée, plus la vedette */}
          <div className="bg-surface-container-low border border-dashed border-outline-variant p-4 flex items-center gap-3">
            <span className="material-symbols-outlined text-secondary text-[18px] shrink-0">history</span>
            <p className="text-xs text-secondary flex-1">
              Prospection terminée le 2 juin 2026 · Devis validé le 15 juin 2026 · Acompte reçu le 18 juin 2026
            </p>
            <button className="text-xs font-bold text-primary hover:underline shrink-0" type="button">
              Voir l'historique complet
            </button>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 flex flex-col gap-gutter">
          {/* Paiement */}
          <div className="bg-surface-container-lowest border border-outline-variant p-5">
            <h3 className={`${CARD_TITLE_CLASSES} mb-4`}>Paiement</h3>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="flex-1 h-2 rounded-full bg-surface-container-high overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${paidRatio}%` }} />
              </div>
              <span className="text-[11px] font-bold text-secondary shrink-0">{paidRatio}%</span>
            </div>
            <dl className="space-y-3 text-sm mt-4">
              <div className="flex justify-between gap-3">
                <dt className="text-secondary">Montant total</dt>
                <dd className="font-semibold text-on-surface text-right">{montantTotal.toLocaleString('fr-FR')} FCFA</dd>
              </div>
              <div className="flex justify-between gap-3 items-center">
                <dt className="text-secondary">Acompte</dt>
                <dd className="text-right">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase bg-emerald-100 text-emerald-700">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    Reçu
                  </span>
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-secondary">Solde dû</dt>
                <dd className="font-bold text-red-700 text-right">{soldeDu.toLocaleString('fr-FR')} FCFA</dd>
              </div>
              <div className="flex justify-between gap-3 items-center">
                <dt className="text-secondary">Paiement final</dt>
                <dd className="text-right">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase bg-error-container text-error">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    En attente
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          {/* Contact */}
          <div className="bg-surface-container-lowest border border-outline-variant p-5">
            <h3 className={`${CARD_TITLE_CLASSES} mb-3`}>Contact</h3>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-full bg-primary-container text-white flex items-center justify-center text-xs font-bold shrink-0">
                FI
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-on-surface truncate">Fatouma Idrissa</p>
                <p className="text-xs text-secondary truncate">Nigelec</p>
              </div>
            </div>
            <div className="space-y-2 text-xs text-on-surface-variant">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[15px] text-secondary shrink-0">call</span>
                <span className="truncate">+227 90 12 34 56</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[15px] text-secondary shrink-0">mail</span>
                <span className="truncate">f.idrissa@nigelec.ne</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[15px] text-secondary shrink-0">business_center</span>
                <span className="truncate">Énergie</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-surface-container-lowest border border-outline-variant p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className={`${CARD_TITLE_CLASSES} flex items-center gap-2`}>
                Notes
                <span className="bg-surface-container-high px-1.5 py-0.5 rounded-full text-[11px] font-bold text-secondary">1</span>
              </h3>
              <button className="text-xs font-bold text-primary hover:underline" type="button">
                + Ajouter
              </button>
            </div>
            <div className="bg-white border border-outline-variant/60 rounded-lg p-3">
              <p className="text-sm text-on-surface-variant line-clamp-2">
                Le client souhaite une palette proche du bleu institutionnel actuel — éviter une rupture trop forte avec
                l'existant.
              </p>
              <p className="text-[11px] text-outline mt-1">Rose Marie · 20 juin 2026</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
