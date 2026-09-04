import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGraphisteWorkspace } from '../context/GraphisteWorkspaceContext';
import type { DocumentStatus } from '../services/documentService';

const RESULT_LABELS: Record<DocumentStatus, string> = {
  A_VALIDER: 'En attente',
  VALIDE: 'Validé',
  MODIFICATIONS_DEMANDEES: 'Modifications demandées',
  REJETE: 'Rejeté',
  PIECE_JOINTE: 'Pièce jointe',
};

const RESULT_CLASSES: Record<DocumentStatus, string> = {
  A_VALIDER: 'bg-amber-100 text-amber-700',
  VALIDE: 'bg-emerald-100 text-emerald-700',
  MODIFICATIONS_DEMANDEES: 'bg-orange-100 text-orange-700',
  REJETE: 'bg-red-100 text-red-700',
  PIECE_JOINTE: 'bg-gray-100 text-gray-700',
};

const RESULT_ICONS: Record<DocumentStatus, string> = {
  A_VALIDER: 'schedule',
  VALIDE: 'check_circle',
  MODIFICATIONS_DEMANDEES: 'edit_note',
  REJETE: 'block',
  PIECE_JOINTE: 'attach_file',
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function GraphisteValidationsPage() {
  const navigate = useNavigate();
  const { documents, isLoading } = useGraphisteWorkspace();
  const [resultFilter, setResultFilter] = useState<DocumentStatus | ''>('');

  const filteredDocuments = useMemo(
    () =>
      documents
        .filter((doc) => !resultFilter || doc.status === resultFilter)
        .sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at)),
    [documents, resultFilter],
  );

  const pendingCount = documents.filter((d) => d.status === 'A_VALIDER').length;
  const modifCount = documents.filter((d) => d.status === 'MODIFICATIONS_DEMANDEES').length;
  const validatedCount = documents.filter((d) => d.status === 'VALIDE').length;
  const rejectedCount = documents.filter((d) => d.status === 'REJETE').length;

  return (
    <div className="flex flex-col gap-gutter">
      <section>
        <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">Mes validations</h2>
        <p className="text-secondary mt-1 text-sm">Le résultat des fichiers que vous avez envoyés pour validation.</p>
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
        {(Object.entries(RESULT_LABELS) as [DocumentStatus, string][]).map(([value, label]) => (
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
          filteredDocuments.map((document) => {
            const latestReview = [...document.reviews].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
            return (
              <div
                className={`bg-white border rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-4 ${
                  document.status === 'REJETE' || document.status === 'MODIFICATIONS_DEMANDEES' ? 'border-error/30' : 'border-outline-variant'
                }`}
                key={document.id}
              >
                <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${RESULT_CLASSES[document.status]}`}>
                  <span className="material-symbols-outlined text-[22px]">{RESULT_ICONS[document.status]}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-on-surface">{document.label}</p>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-surface-container-high text-secondary">
                      {document.document_type_display}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${RESULT_CLASSES[document.status]}`}>
                      {RESULT_LABELS[document.status]}
                    </span>
                  </div>
                  <p className="text-xs text-secondary mt-0.5">{document.project_name ?? document.contact_name ?? '—'}</p>
                  {latestReview && latestReview.comment && (
                    <p className="text-xs text-on-surface-variant italic mt-2 px-2.5 py-1.5 bg-surface-container-low rounded">
                      « {latestReview.comment} » — {latestReview.author_name}
                    </p>
                  )}
                  <p className="text-[11px] text-secondary mt-1.5">
                    Envoyé le {formatDateTime(document.uploaded_at)}
                    {latestReview && ` · Décidé le ${formatDateTime(latestReview.created_at)}`}
                  </p>
                </div>
                <button
                  className="text-xs font-bold text-primary hover:underline shrink-0"
                  onClick={() => navigate(`/documents/${document.id}`)}
                  type="button"
                >
                  Voir le document
                </button>
              </div>
            );
          })}
        {!isLoading && filteredDocuments.length === 0 && (
          <div className="text-center text-secondary text-sm py-10 bg-white border border-dashed border-outline-variant rounded-lg">
            Aucun envoi ne correspond à ce filtre.
          </div>
        )}
      </div>
    </div>
  );
}
