import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { listDocuments, resubmitDocument, type Document, type DocumentStatus } from '../../services/documentService';

// Un commercial ne valide pas les devis/documents, il les soumet et attend
// une décision (CDV, DG...) : c'est donc un suivi de mes envois, pas un
// centre d'approbation (contrairement à /centre-validation, réservé aux
// chefs de division CDN/CDV/CDM qui, eux, arbitrent).

type SubmissionStatus = Exclude<DocumentStatus, 'PIECE_JOINTE'>;

const RESULT_LABELS: Record<SubmissionStatus, string> = {
  A_VALIDER: 'En attente',
  VALIDE: 'Validé',
  MODIFICATIONS_DEMANDEES: 'Modifications demandées',
  REJETE: 'Rejeté',
};

const RESULT_CLASSES: Record<SubmissionStatus, string> = {
  A_VALIDER: 'bg-amber-100 text-amber-700',
  VALIDE: 'bg-emerald-100 text-emerald-700',
  MODIFICATIONS_DEMANDEES: 'bg-orange-100 text-orange-700',
  REJETE: 'bg-red-100 text-red-700',
};

const RESULT_ICONS: Record<SubmissionStatus, string> = {
  A_VALIDER: 'schedule',
  VALIDE: 'check_circle',
  MODIFICATIONS_DEMANDEES: 'edit_note',
  REJETE: 'block',
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function CommercialValidationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resultFilter, setResultFilter] = useState<SubmissionStatus | ''>('');

  const [resubmittingId, setResubmittingId] = useState<number | null>(null);
  const [resubmitComment, setResubmitComment] = useState('');
  const [resubmitFile, setResubmitFile] = useState<File | null>(null);
  const [isResubmitting, setIsResubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    listDocuments({ uploaded_by: user.id })
      .then((docs) => setSubmissions(docs.filter((doc) => doc.validators.length > 0)))
      .finally(() => setIsLoading(false));
  }, [user]);

  const filteredSubmissions = useMemo(
    () =>
      submissions
        .filter((s) => !resultFilter || s.status === resultFilter)
        .sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at)),
    [submissions, resultFilter],
  );

  const pendingCount = submissions.filter((s) => s.status === 'A_VALIDER').length;
  const modifCount = submissions.filter((s) => s.status === 'MODIFICATIONS_DEMANDEES').length;
  const validatedCount = submissions.filter((s) => s.status === 'VALIDE').length;
  const rejectedCount = submissions.filter((s) => s.status === 'REJETE').length;

  function openResubmit(doc: Document) {
    setResubmittingId(doc.id);
    setResubmitComment('');
    setResubmitFile(null);
  }

  async function handleResubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resubmittingId || isResubmitting) return;
    setIsResubmitting(true);
    try {
      const updated = await resubmitDocument(resubmittingId, resubmitComment.trim(), resubmitFile);
      setSubmissions((prev) => prev.map((doc) => (doc.id === updated.id ? updated : doc)));
      setResubmittingId(null);
    } finally {
      setIsResubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-gutter">
      <section>
        <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">Mes validations</h2>
        <p className="text-secondary mt-1 text-sm">Le résultat des devis et documents que vous avez envoyés pour validation.</p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
        <div className="bg-surface-container-lowest border border-outline-variant p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-amber-600 text-2xl shrink-0">schedule</span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">En attente</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{pendingCount}</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-orange-600 text-2xl shrink-0">edit_note</span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">Modifications demandées</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{modifCount}</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-emerald-600 text-2xl shrink-0">check_circle</span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">Validés</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{validatedCount}</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-error text-2xl shrink-0">block</span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">Rejetés</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{rejectedCount}</span>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
            resultFilter === '' ? 'bg-primary text-white border-primary' : 'border-outline-variant text-secondary hover:bg-surface-container-high'
          }`}
          onClick={() => setResultFilter('')}
          type="button"
        >
          Tous
        </button>
        {(Object.entries(RESULT_LABELS) as [SubmissionStatus, string][]).map(([value, label]) => (
          <button
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
              resultFilter === value ? 'bg-primary text-white border-primary' : 'border-outline-variant text-secondary hover:bg-surface-container-high'
            }`}
            key={value}
            onClick={() => setResultFilter(value)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {isLoading && <p className="text-sm text-secondary py-6 text-center">Chargement...</p>}

        {!isLoading &&
          filteredSubmissions.map((submission) => {
            const status = submission.status as SubmissionStatus;
            const lastReview = submission.reviews.at(-1);
            return (
              <div
                className={`bg-white border rounded-lg p-4 flex flex-col gap-4 ${
                  status === 'REJETE' || status === 'MODIFICATIONS_DEMANDEES' ? 'border-error/30' : 'border-outline-variant'
                }`}
                key={submission.id}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${RESULT_CLASSES[status]}`}>
                    <span className="material-symbols-outlined text-[22px]">{RESULT_ICONS[status]}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-on-surface">{submission.label || submission.document_type_display}</p>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-surface-container-high text-secondary">
                        {submission.document_type}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${RESULT_CLASSES[status]}`}>
                        {RESULT_LABELS[status]}
                      </span>
                    </div>
                    <p className="text-xs text-secondary mt-0.5">{submission.contact_name || submission.project_name || '—'}</p>
                    {lastReview?.comment && (
                      <p className="text-xs text-on-surface-variant italic mt-2 px-2.5 py-1.5 bg-surface-container-low rounded">
                        « {lastReview.comment} » — {lastReview.author_name ?? '—'}
                      </p>
                    )}
                    <p className="text-[11px] text-secondary mt-1.5">
                      Envoyé le {formatDateTime(submission.uploaded_at)}
                      {status !== 'A_VALIDER' && lastReview && ` · Décidé le ${formatDateTime(lastReview.created_at)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {status === 'MODIFICATIONS_DEMANDEES' && resubmittingId !== submission.id && (
                      <button className="text-xs font-bold text-primary hover:underline" onClick={() => openResubmit(submission)} type="button">
                        Renvoyer
                      </button>
                    )}
                    <button
                      className="text-xs font-bold text-primary hover:underline"
                      onClick={() => navigate(`/documents/${submission.id}`)}
                      type="button"
                    >
                      Voir le document
                    </button>
                  </div>
                </div>

                {resubmittingId === submission.id && (
                  <form className="border-t border-outline-variant pt-3 space-y-2" onSubmit={handleResubmit}>
                    <label className="flex items-center gap-2 px-3 py-2 bg-surface-container-low border border-dashed border-outline-variant rounded text-sm cursor-pointer hover:border-primary/40 transition-colors">
                      <span className="material-symbols-outlined text-[16px] text-primary shrink-0">upload_file</span>
                      <span className={resubmitFile ? 'text-on-surface truncate' : 'text-outline'}>
                        {resubmitFile ? resubmitFile.name : 'Remplacer le fichier (optionnel)'}
                      </span>
                      <input className="hidden" onChange={(event) => setResubmitFile(event.target.files?.[0] ?? null)} type="file" />
                    </label>
                    <textarea
                      className="w-full px-3 py-2 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container outline-none resize-none h-16"
                      onChange={(event) => setResubmitComment(event.target.value)}
                      placeholder="Ce qui a été corrigé depuis la dernière remarque..."
                      value={resubmitComment}
                    />
                    <div className="flex gap-2">
                      <button
                        className="px-3.5 py-2 border border-outline-variant text-on-surface text-xs font-bold rounded-lg hover:bg-surface-container-high transition-colors"
                        onClick={() => setResubmittingId(null)}
                        type="button"
                      >
                        Annuler
                      </button>
                      <button
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-on-primary-fixed-variant transition-colors disabled:opacity-50"
                        disabled={isResubmitting}
                        type="submit"
                      >
                        <span className="material-symbols-outlined text-[16px]">send</span>
                        {isResubmitting ? 'Envoi...' : 'Renvoyer pour validation'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        {!isLoading && filteredSubmissions.length === 0 && (
          <div className="text-center text-secondary text-sm py-10 bg-white border border-dashed border-outline-variant rounded-lg">
            Aucun envoi ne correspond à ce filtre.
          </div>
        )}
      </div>
    </div>
  );
}
