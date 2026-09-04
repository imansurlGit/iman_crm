// Centre de Validation - Direction Générale (DG)
// Reprend exactement le flux réel de CentreValidationPage.tsx (mêmes appels
// listDocuments/reviewDocument) avec l'habillage visuel des pages DG.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { listDocuments, reviewDocument, type Document, type DocumentStatus, type ReviewDecision } from '../../services/documentService';
import { LABEL_CLASSES } from '../../components/ui/formStyles';

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

const STATUS_BADGE_CLASSES: Record<DocumentStatus, string> = {
  A_VALIDER: 'bg-amber-50 text-amber-700 border-amber-200',
  MODIFICATIONS_DEMANDEES: 'bg-orange-50 text-orange-700 border-orange-200',
  VALIDE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJETE: 'bg-rose-50 text-rose-700 border-rose-200',
  PIECE_JOINTE: 'bg-slate-100 text-slate-600 border-slate-200',
};

const HISTORY_DOT_CLASSES: Record<ReviewDecision, string> = {
  SOUMIS: 'bg-slate-400',
  A_VALIDER: 'bg-slate-400',
  VALIDE: 'bg-emerald-500',
  MODIFICATIONS_DEMANDEES: 'bg-amber-500',
  REJETE: 'bg-rose-500',
} as Record<ReviewDecision, string>;

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function DgValidationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [decisionComment, setDecisionComment] = useState('');
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [isDeciding, setIsDeciding] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

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
      showToast(
        decision === 'VALIDE' ? 'Document validé.' : decision === 'REJETE' ? 'Document rejeté.' : 'Modifications demandées.',
      );
    } finally {
      setIsDeciding(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-12 max-w-[1480px] mx-auto text-slate-800 animate-fadeIn">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs font-medium border border-slate-700 animate-fadeIn">
          <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
          {toastMessage}
        </div>
      )}

      {/* ==================================================================== */}
      {/* EN-TÊTE                                                              */}
      {/* ==================================================================== */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">verified</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-headline-md text-xl font-extrabold text-slate-900 tracking-tight">Centre de Validation</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary">
                Direction Générale
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">
              Devis, fiches BAT, visuels et livrables soumis pour votre validation, avant diffusion.
            </p>
          </div>
        </div>

        {pendingCount > 0 && (
          <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="material-symbols-outlined text-[16px]">hourglass_top</span>
            {pendingCount} à valider
          </span>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ================================================================== */}
        {/* LISTE DES DOSSIERS                                                  */}
        {/* ================================================================== */}
        <section className="lg:col-span-4 bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden flex flex-col h-[calc(100vh-260px)] min-h-[520px]">
          <div className="p-4 border-b border-slate-100 space-y-2.5 shrink-0">
            <p className="text-sm font-bold text-slate-900">Dossiers de validation</p>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
              <input
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white transition-all"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un dossier..."
                type="text"
                value={search}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100">
            {isLoading && <p className="px-4 py-6 text-center text-xs text-slate-400">Chargement...</p>}

            {!isLoading &&
              sortedItems.map((item) => (
                <button
                  className={`w-full text-left px-4 py-3.5 border-l-4 transition-colors ${
                    selectedItem?.id === item.id ? 'bg-primary/5 border-l-primary' : 'border-l-transparent hover:bg-slate-50'
                  }`}
                  key={item.id}
                  onClick={() => selectItem(item.id)}
                  type="button"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[16px]">{TYPE_ICONS[item.document_type] ?? 'description'}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">{item.label || item.document_type_display}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">Soumis par {item.uploaded_by_name ?? '—'}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_BADGE_CLASSES[item.status]}`}>
                          {item.status_display}
                        </span>
                        <span className="text-[10px] text-slate-400">{formatDate(item.uploaded_at)}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}

            {!isLoading && sortedItems.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-14 text-slate-400 text-xs">
                <span className="material-symbols-outlined text-[28px] text-slate-300">task_alt</span>
                Aucun dossier ne correspond.
              </div>
            )}
          </div>
        </section>

        {/* ================================================================== */}
        {/* DÉTAIL DU DOSSIER                                                   */}
        {/* ================================================================== */}
        <section className="lg:col-span-8 bg-white rounded-2xl border border-slate-100 shadow-xs p-6 min-h-[520px]">
          {selectedItem ? (
            <div className="flex flex-col gap-5">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    <span className="material-symbols-outlined text-[16px] text-primary">
                      {TYPE_ICONS[selectedItem.document_type] ?? 'description'}
                    </span>
                    Processus de validation d'agence
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 ${STATUS_BADGE_CLASSES[selectedItem.status]}`}>
                    {selectedItem.status_display}
                  </span>
                </div>
                <h2 className="font-headline-md text-lg font-bold text-slate-900 mt-1">
                  {selectedItem.label || selectedItem.document_type_display}
                </h2>
                <p className="text-sm text-slate-500 mt-1">{selectedItem.contact_name || selectedItem.project_name || '—'}</p>
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
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Validateurs</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedItem.validators_detail.map((validator) => (
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700"
                      key={validator.id}
                    >
                      {validator.name}
                    </span>
                  ))}
                </div>
                {selectedItem.validators_detail.length === 0 && (
                  <p className="text-xs text-slate-400 mt-2">Aucun validateur désigné.</p>
                )}
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Cycle de relecture &amp; historique</p>
                <div className="space-y-4">
                  {selectedItem.reviews.map((entry, index) => (
                    <div className="flex gap-3" key={entry.id}>
                      <div className="flex flex-col items-center">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${HISTORY_DOT_CLASSES[entry.decision]}`} />
                        {index < selectedItem.reviews.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1" />}
                      </div>
                      <div className="flex-1 pb-1 min-w-0">
                        <p className="text-[11px] text-slate-400">{formatDateTime(entry.created_at)}</p>
                        <p className="text-sm text-slate-800 mt-0.5">
                          <span className="font-semibold">{entry.author_name ?? '—'}</span>{' '}
                          <span className="text-slate-500">
                            — statut :{' '}
                            <span className={`font-bold ${entry.decision === 'REJETE' ? 'text-rose-600' : 'text-slate-800'}`}>
                              {entry.decision_display}
                            </span>
                          </span>
                        </p>
                        {entry.comment && (
                          <p className="text-sm text-slate-600 italic mt-1.5 px-3 py-2 bg-slate-50 rounded-lg">{entry.comment}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {selectedItem.reviews.length === 0 && <p className="text-xs text-slate-400">Aucun historique pour l'instant.</p>}
                </div>
              </div>

              {selectedItem.status === 'A_VALIDER' && (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
                  <p className="flex items-center gap-1.5 text-sm font-bold text-slate-900 mb-3">
                    <span className="material-symbols-outlined text-[18px] text-primary">gpp_maybe</span>
                    Formuler une décision
                  </p>
                  <label className={LABEL_CLASSES} htmlFor="decision-comment">
                    Commentaire <span className="normal-case font-normal text-slate-400">(requis pour modification ou rejet)</span>
                  </label>
                  <textarea
                    className="w-full px-3 py-2 bg-white border border-outline-variant rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none transition-all resize-none h-20 mt-1"
                    id="decision-comment"
                    onChange={(event) => {
                      setDecisionComment(event.target.value);
                      setDecisionError(null);
                    }}
                    placeholder="Indiquez précisément ce qui doit être corrigé, ou un mot de validation..."
                    value={decisionComment}
                  />
                  {decisionError && <p className="text-xs text-rose-600 font-semibold mt-1.5">{decisionError}</p>}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-300 text-rose-700 text-xs font-bold hover:bg-rose-50 transition-colors disabled:opacity-50"
                      disabled={isDeciding}
                      onClick={() => handleDecision('REJETE')}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">block</span>
                      Rejeter définitivement
                    </button>
                    <button
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-300 text-amber-700 text-xs font-bold hover:bg-amber-50 transition-colors disabled:opacity-50"
                      disabled={isDeciding}
                      onClick={() => handleDecision('MODIFICATIONS_DEMANDEES')}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit_note</span>
                      Demander des modifications
                    </button>
                    <button
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors ml-auto disabled:opacity-50"
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
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-amber-50 border border-amber-200 text-amber-700">
                  <span className="material-symbols-outlined text-[18px]">schedule</span>
                  En attente du renvoi de l'auteur après corrections.
                </div>
              )}

              {(selectedItem.status === 'VALIDE' || selectedItem.status === 'REJETE') && (
                <div
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold ${
                    selectedItem.status === 'VALIDE'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                      : 'bg-rose-50 border border-rose-200 text-rose-700'
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
            <div className="h-full flex items-center justify-center text-sm text-slate-400">
              {isLoading ? 'Chargement...' : 'Aucun document en attente de votre validation.'}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
