import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listDocuments, reviewDocument, type Document, type DocumentStatus, type ReviewDecision } from '../services/documentService';

const TYPE_ICONS: Record<string, string> = {
  VISUEL: 'image',
  FICHE_BAT: 'fact_check',
  DEVIS: 'request_quote',
  FACTURE: 'receipt_long',
  CONTRAT: 'description',
  CONVENTION: 'handshake',
  BRIEF: 'assignment',
  PRESENTATION: 'slideshow',
  LIVRABLE_FINAL: 'inventory_2',
  JUSTIFICATIF: 'task',
  RAPPORT: 'summarize',
};

const STATUT_CLASSES: Record<DocumentStatus, string> = {
  A_VALIDER: 'bg-amber-100 text-amber-700',
  MODIFICATIONS_DEMANDEES: 'bg-orange-100 text-orange-700',
  VALIDE: 'bg-emerald-100 text-emerald-700',
  REJETE: 'bg-red-100 text-red-700',
  PIECE_JOINTE: 'bg-surface-container-high text-secondary',
};

const HISTORY_DOT_CLASSES: Record<ReviewDecision, string> = {
  SOUMIS: 'bg-secondary',
  A_VALIDER: 'bg-secondary',
  VALIDE: 'bg-emerald-500',
  MODIFICATIONS_DEMANDEES: 'bg-orange-500',
  REJETE: 'bg-error',
} as Record<ReviewDecision, string>;

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const COMPACT_INPUT_CLASSES =
  'w-full px-3 py-2 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container outline-none';
const LABEL_TEXT_CLASSES = 'font-label-md text-label-md text-on-surface-variant uppercase tracking-wide';

export default function CentreValidationPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [decisionComment, setDecisionComment] = useState('');
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [isDeciding, setIsDeciding] = useState(false);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    listDocuments({ validator: user.id })
      .then((docs) => {
        setItems(docs);
        setSelectedId((prev) => prev ?? docs[0]?.id ?? null);
      })
      .finally(() => setIsLoading(false));
  }, [user]);

  const sortedItems = useMemo(() => {
    const STATUS_ORDER: Record<DocumentStatus, number> = {
      A_VALIDER: 0,
      MODIFICATIONS_DEMANDEES: 1,
      VALIDE: 2,
      REJETE: 3,
      PIECE_JOINTE: 4,
    };
    const query = search.trim().toLowerCase();
    return items
      .filter(
        (item) =>
          !query ||
          item.label.toLowerCase().includes(query) ||
          (item.contact_name ?? '').toLowerCase().includes(query) ||
          (item.project_name ?? '').toLowerCase().includes(query),
      )
      .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.uploaded_at.localeCompare(a.uploaded_at));
  }, [items, search]);

  const selectedItem = items.find((item) => item.id === selectedId) ?? null;
  const pendingCount = items.filter((item) => item.status === 'A_VALIDER').length;

  function selectItem(itemId: number) {
    setSelectedId(itemId);
    setDecisionComment('');
    setDecisionError(null);
  }

  async function handleDecision(decision: Extract<ReviewDecision, 'VALIDE' | 'MODIFICATIONS_DEMANDEES' | 'REJETE'>) {
    if (!selectedItem || isDeciding) return;
    if (decision !== 'VALIDE' && !decisionComment.trim()) {
      setDecisionError('Un commentaire est requis pour demander une modification ou rejeter.');
      return;
    }
    setIsDeciding(true);
    try {
      const updated = await reviewDocument(selectedItem.id, decision, decisionComment.trim());
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setDecisionComment('');
      setDecisionError(null);
    } finally {
      setIsDeciding(false);
    }
  }

  return (
    <div className="flex flex-col gap-gutter h-full">
      <section>
        <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">Centre de validation</h2>
        <p className="text-secondary mt-1 text-sm">
          Devis, fiches BAT, visuels et livrables soumis pour votre validation, avant diffusion.
        </p>
      </section>

      <div className="bg-white border border-outline-variant rounded-xl shadow-sm overflow-hidden flex h-[calc(100vh-220px)] min-h-[560px]">
        {/* Liste des dossiers */}
        <div className="w-80 shrink-0 border-r border-outline-variant flex flex-col">
          <div className="p-3 border-b border-outline-variant space-y-2">
            <p className="font-headline-md text-sm font-bold text-on-surface px-1">Dossiers de validation ({pendingCount})</p>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-outline">
                <span className="material-symbols-outlined text-sm">search</span>
              </span>
              <input
                className="w-full bg-surface-container border border-outline-variant rounded py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-primary-container transition-all"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher..."
                type="text"
                value={search}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {isLoading && <p className="px-4 py-6 text-center text-xs text-secondary">Chargement...</p>}
            {!isLoading &&
              sortedItems.map((item) => (
                <button
                  className={`w-full text-left px-4 py-3 border-b border-outline-variant/50 border-l-4 transition-colors ${
                    selectedItem?.id === item.id
                      ? 'bg-primary-container/10 border-l-primary'
                      : 'border-l-transparent hover:bg-surface-container-low'
                  }`}
                  key={item.id}
                  onClick={() => selectItem(item.id)}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUT_CLASSES[item.status]}`}>
                      {item.status_display}
                    </span>
                    <span className="text-[10px] text-secondary shrink-0">{formatDate(item.uploaded_at)}</span>
                  </div>
                  <p className="text-sm font-semibold text-on-surface leading-snug">{item.label || item.document_type_display}</p>
                  <p className="text-[11px] text-secondary mt-0.5">Soumis par : {item.uploaded_by_name ?? '—'}</p>
                </button>
              ))}
            {!isLoading && sortedItems.length === 0 && (
              <p className="px-4 py-6 text-center text-xs text-secondary">Aucun dossier ne correspond.</p>
            )}
          </div>
        </div>

        {/* Détail du dossier */}
        <div className="flex-1 min-w-0 overflow-y-auto custom-scrollbar">
          {selectedItem ? (
            <div className="p-6 flex flex-col gap-5">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-secondary">
                    <span className="material-symbols-outlined text-[16px] text-primary">
                      {TYPE_ICONS[selectedItem.document_type] ?? 'description'}
                    </span>
                    Processus de validation d'agence
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase shrink-0 ${STATUT_CLASSES[selectedItem.status]}`}>
                    {selectedItem.status_display}
                  </span>
                </div>
                <h3 className="font-headline-md text-lg font-bold text-on-surface mt-1">
                  {selectedItem.label || selectedItem.document_type_display}
                </h3>
                <p className="text-sm text-secondary mt-1">{selectedItem.contact_name || selectedItem.project_name || '—'}</p>
                <button
                  className="flex items-center gap-1.5 mt-2 text-sm text-primary font-semibold hover:underline w-fit"
                  onClick={() => navigate(`/documents/${selectedItem.id}`)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">description</span>
                  Voir le document
                </button>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-secondary mb-3">Validateurs</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedItem.validators_detail.map((validator) => (
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-container-low border border-outline-variant text-on-surface"
                      key={validator.id}
                    >
                      {validator.name}
                    </span>
                  ))}
                </div>
                {selectedItem.validators_detail.length === 0 && (
                  <p className="text-xs text-secondary mt-2">Aucun validateur désigné.</p>
                )}
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-secondary mb-3">Cycle de relecture &amp; historique</p>
                <div className="space-y-4">
                  {selectedItem.reviews.map((entry, index) => (
                    <div className="flex gap-3" key={entry.id}>
                      <div className="flex flex-col items-center">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${HISTORY_DOT_CLASSES[entry.decision]}`} />
                        {index < selectedItem.reviews.length - 1 && <div className="w-px flex-1 bg-outline-variant mt-1" />}
                      </div>
                      <div className="flex-1 pb-1 min-w-0">
                        <p className="text-[11px] text-secondary">{formatDateTime(entry.created_at)}</p>
                        <p className="text-sm text-on-surface mt-0.5">
                          <span className="font-semibold">{entry.author_name ?? '—'}</span>{' '}
                          <span className="text-secondary">
                            — statut :{' '}
                            <span className={`font-bold ${entry.decision === 'REJETE' ? 'text-error' : 'text-on-surface'}`}>
                              {entry.decision_display}
                            </span>
                          </span>
                        </p>
                        {entry.comment && (
                          <p className="text-sm text-on-surface-variant italic mt-1.5 px-3 py-2 bg-surface-container-low rounded-lg">
                            {entry.comment}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {selectedItem.reviews.length === 0 && <p className="text-xs text-secondary">Aucun historique pour l'instant.</p>}
                </div>
              </div>

              {selectedItem.status === 'A_VALIDER' && (
                <div className="border border-outline-variant rounded-lg p-4 bg-surface-container-lowest">
                  <p className="flex items-center gap-1.5 text-sm font-bold text-on-surface mb-3">
                    <span className="material-symbols-outlined text-[18px] text-primary">gpp_maybe</span>
                    Formuler une décision
                  </p>
                  <label className={LABEL_TEXT_CLASSES} htmlFor="decision-comment">
                    Commentaire <span className="normal-case font-normal text-secondary">(requis pour modification ou rejet)</span>
                  </label>
                  <textarea
                    className={`${COMPACT_INPUT_CLASSES} resize-none h-20 mt-1`}
                    id="decision-comment"
                    onChange={(event) => {
                      setDecisionComment(event.target.value);
                      setDecisionError(null);
                    }}
                    placeholder="Indiquez précisément ce qui doit être corrigé, ou un mot de validation..."
                    value={decisionComment}
                  />
                  {decisionError && <p className="text-xs text-error font-semibold mt-1.5">{decisionError}</p>}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-error text-white text-xs font-bold rounded-lg hover:bg-error/90 transition-colors disabled:opacity-50"
                      disabled={isDeciding}
                      onClick={() => handleDecision('REJETE')}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">block</span>
                      Rejeter définitivement
                    </button>
                    <button
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
                      disabled={isDeciding}
                      onClick={() => handleDecision('MODIFICATIONS_DEMANDEES')}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit_note</span>
                      Demander des modifications
                    </button>
                    <button
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors ml-auto disabled:opacity-50"
                      disabled={isDeciding}
                      onClick={() => handleDecision('VALIDE')}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      Valider
                    </button>
                  </div>
                </div>
              )}

              {selectedItem.status === 'MODIFICATIONS_DEMANDEES' && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold bg-orange-50 border border-orange-200 text-orange-700">
                  <span className="material-symbols-outlined text-[18px]">schedule</span>
                  En attente du renvoi de l'auteur après corrections.
                </div>
              )}

              {(selectedItem.status === 'VALIDE' || selectedItem.status === 'REJETE') && (
                <div
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold ${
                    selectedItem.status === 'VALIDE'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                      : 'bg-red-50 border border-red-200 text-error'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {selectedItem.status === 'VALIDE' ? 'check_circle' : 'cancel'}
                  </span>
                  Dossier {selectedItem.status === 'VALIDE' ? 'validé et signé' : 'rejeté définitivement'} — aucune action supplémentaire requise.
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-secondary">
              {isLoading ? 'Chargement...' : 'Aucun document en attente de votre validation.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
