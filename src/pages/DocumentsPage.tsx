import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/ui/Modal';
import { LABEL_CLASSES } from '../components/ui/formStyles';
import { listContacts } from '../services/contactService';
import {
  createDocument,
  deleteDocument,
  listDocuments,
  type Document,
  type DocumentOwnerType,
  type DocumentStatus,
  type DocumentType,
} from '../services/documentService';
import { listProjects } from '../services/projectService';

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  CONTRAT: 'Contrat',
  CONVENTION: 'Convention',
  DEVIS: 'Devis',
  FACTURE: 'Facture',
  BRIEF: 'Brief',
  FICHE_BAT: 'Fiche BAT',
  VISUEL: 'Visuel',
  PRESENTATION: 'Présentation',
  LIVRABLE_FINAL: 'Livrable final',
  JUSTIFICATIF: 'Justificatif',
  RAPPORT: 'Rapport',
};

const DOCUMENT_TYPE_CLASSES: Record<DocumentType, string> = {
  CONTRAT: 'bg-blue-100 text-blue-700',
  CONVENTION: 'bg-indigo-100 text-indigo-700',
  DEVIS: 'bg-amber-100 text-amber-700',
  FACTURE: 'bg-emerald-100 text-emerald-700',
  BRIEF: 'bg-purple-100 text-purple-700',
  FICHE_BAT: 'bg-teal-100 text-teal-700',
  VISUEL: 'bg-pink-100 text-pink-700',
  PRESENTATION: 'bg-orange-100 text-orange-700',
  LIVRABLE_FINAL: 'bg-cyan-100 text-cyan-700',
  JUSTIFICATIF: 'bg-gray-100 text-gray-700',
  RAPPORT: 'bg-lime-100 text-lime-700',
};

const STATUS_LABELS: Record<DocumentStatus, string> = {
  A_VALIDER: 'À valider',
  VALIDE: 'Validé',
  MODIFICATIONS_DEMANDEES: 'Modifications demandées',
  REJETE: 'Rejeté',
  PIECE_JOINTE: 'Pièce jointe',
};

const STATUS_CLASSES: Record<DocumentStatus, string> = {
  A_VALIDER: 'bg-amber-100 text-amber-700',
  VALIDE: 'bg-emerald-100 text-emerald-700',
  MODIFICATIONS_DEMANDEES: 'bg-orange-100 text-orange-700',
  REJETE: 'bg-red-100 text-red-700',
  PIECE_JOINTE: 'bg-gray-100 text-gray-700',
};

interface OwnerOption {
  id: number;
  name: string;
  typeLabel?: string;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'];

function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

interface FileFormatMeta {
  icon: string;
  label: string;
  classes: string;
}

/** Format réel du fichier (image, PDF, Office, lien...) — distinct de
 * `document_type`, qui est la catégorie métier (devis, contrat...). Affiché
 * en gros sur la vignette pour reconnaître un document au premier coup d'œil. */
function getFileFormatMeta(doc: Document): FileFormatMeta {
  if (!doc.file) return { icon: 'link', label: 'Lien', classes: 'bg-sky-50 text-sky-500' };
  const ext = getFileExtension(doc.file.split('/').pop() ?? doc.file);
  if (IMAGE_EXTENSIONS.includes(ext)) return { icon: 'image', label: 'Image', classes: 'bg-blue-50 text-blue-500' };
  if (ext === 'pdf') return { icon: 'picture_as_pdf', label: 'PDF', classes: 'bg-red-50 text-red-500' };
  if (['doc', 'docx'].includes(ext)) return { icon: 'description', label: 'Document', classes: 'bg-indigo-50 text-indigo-500' };
  if (['xls', 'xlsx'].includes(ext)) return { icon: 'table_chart', label: 'Tableur', classes: 'bg-emerald-50 text-emerald-500' };
  if (['ppt', 'pptx'].includes(ext)) return { icon: 'slideshow', label: 'Présentation', classes: 'bg-orange-50 text-orange-500' };
  if (['zip', 'rar', '7z'].includes(ext)) return { icon: 'folder_zip', label: 'Archive', classes: 'bg-amber-50 text-amber-500' };
  return { icon: 'draft', label: 'Fichier', classes: 'bg-gray-50 text-gray-500' };
}

const SEARCH_INPUT_CLASSES =
  'w-full bg-surface-container border border-outline-variant py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary-container transition-all';
const COMPACT_INPUT_CLASSES =
  'w-full px-3 py-2 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container outline-none';

export default function DocumentsPage() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<DocumentType | ''>('');

  const [contactOptions, setContactOptions] = useState<OwnerOption[]>([]);
  const [projectOptions, setProjectOptions] = useState<OwnerOption[]>([]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newOwnerType, setNewOwnerType] = useState<DocumentOwnerType>('CONTACT');
  const [newOwnerId, setNewOwnerId] = useState('');
  const [newDocType, setNewDocType] = useState<DocumentType | ''>('');
  const [newStatus, setNewStatus] = useState<Extract<DocumentStatus, 'PIECE_JOINTE' | 'A_VALIDER'>>('PIECE_JOINTE');
  const [newLabel, setNewLabel] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function loadDocuments() {
    setIsLoading(true);
    listDocuments()
      .then(setDocuments)
      .catch(() => setDocuments([]))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    loadDocuments();
    Promise.all([listContacts('CLIENT'), listContacts('PROSPECT'), listContacts('PARTENAIRE'), listContacts('INTERNE')])
      .then(([clients, prospects, partenaires, internes]) => {
        const merged = [...clients, ...prospects, ...partenaires, ...internes]
          .map((contact) => ({ id: contact.id, name: contact.company || contact.name, typeLabel: contact.contact_type_display }))
          .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
        setContactOptions(merged);
      })
      .catch(() => setContactOptions([]));
    listProjects({ kind: 'PROJET' })
      .then((projects) => setProjectOptions(projects.map((project) => ({ id: project.id, name: project.name }))))
      .catch(() => setProjectOptions([]));
  }, []);

  const ownerNameFor = (doc: Document) => (doc.owner_type === 'CONTACT' ? doc.contact_name : doc.project_name) ?? '—';

  const filteredDocuments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return documents.filter((doc) => {
      const matchesQuery =
        !query || doc.label.toLowerCase().includes(query) || ownerNameFor(doc).toLowerCase().includes(query);
      const matchesType = !typeFilter || doc.document_type === typeFilter;
      return matchesQuery && matchesType;
    });
  }, [documents, search, typeFilter]);

  const documentTypes = Object.entries(DOCUMENT_TYPE_LABELS) as [DocumentType, string][];
  const ownerOptions = newOwnerType === 'CONTACT' ? contactOptions : projectOptions;

  function openAddModal() {
    setIsAddOpen(true);
    setNewOwnerType('CONTACT');
    setNewOwnerId('');
    setNewDocType('');
    setNewStatus('PIECE_JOINTE');
    setNewLabel('');
    setNewFile(null);
    setIsDraggingFile(false);
    setSubmitError(null);
  }

  function closeAddModal() {
    setIsAddOpen(false);
  }

  async function handleAddSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newOwnerId || !newDocType || !newFile) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const formData = new FormData();
      formData.append('owner_type', newOwnerType);
      formData.append(newOwnerType === 'CONTACT' ? 'contact' : 'project', newOwnerId);
      formData.append('document_type', newDocType);
      formData.append('status', newStatus);
      formData.append('label', newLabel.trim() || newFile.name);
      formData.append('file', newFile);
      await createDocument(formData);
      closeAddModal();
      loadDocuments();
    } catch {
      setSubmitError("Impossible d'ajouter ce document. Vérifiez les champs et réessayez.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(doc: Document) {
    if (!window.confirm(`Supprimer « ${doc.label} » ? Cette action est irréversible.`)) return;
    await deleteDocument(doc.id);
    loadDocuments();
  }

  return (
    <div className="flex flex-col gap-gutter">
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">Documents & Livrables</h2>
          <p className="text-secondary mt-1 text-sm">
            Le mini-GED de l'agence : contrats, devis, factures, briefs et livrables, classés par contact ou par projet.
          </p>
        </div>
        <button
          className="flex items-center gap-1.5 bg-primary text-white pl-3 pr-4 py-2 rounded-full text-xs font-bold shadow-sm hover:shadow-md hover:bg-on-primary-fixed-variant active:scale-95 transition-all shrink-0"
          onClick={openAddModal}
          type="button"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Ajouter un document
        </button>
      </section>

      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-3 flex items-center text-outline">
            <span className="material-symbols-outlined text-sm">search</span>
          </span>
          <input
            className={SEARCH_INPUT_CLASSES}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un document, un contact, un projet..."
            type="text"
            value={search}
          />
        </div>
        <div className="relative w-full md:w-64 shrink-0">
          <span className="absolute inset-y-0 left-3 flex items-center text-outline pointer-events-none">
            <span className="material-symbols-outlined text-sm">filter_list</span>
          </span>
          <select
            className="w-full bg-surface-container border border-outline-variant rounded py-2 pl-10 pr-8 text-sm appearance-none focus:outline-none focus:border-primary-container transition-all"
            onChange={(event) => setTypeFilter(event.target.value as DocumentType | '')}
            value={typeFilter}
          >
            <option value="">Tous les types</option>
            {documentTypes.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-sm pointer-events-none">
            expand_more
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-secondary text-sm">Chargement des documents...</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredDocuments.map((doc) => {
            const format = getFileFormatMeta(doc);
            return (
              <div
                className="relative group bg-white border border-outline-variant rounded-2xl overflow-hidden hover:shadow-md transition-shadow"
                key={doc.id}
              >
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="w-7 h-7 inline-flex items-center justify-center bg-white/95 text-secondary hover:text-primary rounded-lg shadow-sm transition-colors"
                    onClick={() => navigate(`/documents/${doc.id}`)}
                    title="Voir"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                  </button>
                  <button
                    className="w-7 h-7 inline-flex items-center justify-center bg-white/95 text-secondary hover:text-error rounded-lg shadow-sm transition-colors"
                    onClick={() => handleDelete(doc)}
                    title="Supprimer"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>

                {/* Bandeau : format réel du fichier, reconnaissable au premier coup d'œil */}
                <div className={`h-24 flex flex-col items-center justify-center gap-1.5 ${format.classes}`}>
                  <span className="material-symbols-outlined text-[32px]">{format.icon}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest">{format.label}</span>
                </div>

                <div className="p-3 flex flex-col gap-1.5">
                  <p className="text-sm font-semibold text-on-surface leading-snug line-clamp-2" title={doc.label}>
                    {doc.label}
                  </p>

                  <div className="flex items-center gap-1 text-[11px] text-secondary min-w-0">
                    <span className="material-symbols-outlined text-[12px] shrink-0">
                      {doc.owner_type === 'CONTACT' ? 'apartment' : 'account_tree'}
                    </span>
                    <span className="truncate">{ownerNameFor(doc)}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${DOCUMENT_TYPE_CLASSES[doc.document_type]}`}
                    >
                      {DOCUMENT_TYPE_LABELS[doc.document_type]}
                    </span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${STATUS_CLASSES[doc.status]}`}
                    >
                      {STATUS_LABELS[doc.status]}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 mt-0.5 border-t border-outline-variant/30">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-5 h-5 rounded-full bg-primary-container text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                        {getInitials(doc.uploaded_by_name ?? '?')}
                      </div>
                      <span className="text-[10px] text-secondary truncate">{doc.uploaded_by_name ?? 'Inconnu'}</span>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] text-secondary shrink-0">
                      <span className="material-symbols-outlined text-[12px]">schedule</span>
                      {formatDate(doc.uploaded_at)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredDocuments.length === 0 && (
            <div className="col-span-full text-center text-secondary text-sm py-8 bg-white border border-dashed border-outline-variant rounded-lg">
              Aucun document ne correspond à votre recherche.
            </div>
          )}
        </div>
      )}

      <Modal
        footer={
          <>
            <button
              className="px-5 py-2.5 rounded border border-outline-variant text-on-surface font-body-sm text-body-sm hover:bg-surface-container-high transition-colors"
              onClick={closeAddModal}
              type="button"
            >
              Annuler
            </button>
            <button
              className="px-5 py-2.5 rounded bg-on-primary-fixed-variant text-white font-body-sm text-body-sm font-bold hover:bg-primary transition-colors disabled:opacity-50"
              disabled={!newOwnerId || !newDocType || !newFile || isSubmitting}
              form="add-document-form"
              type="submit"
            >
              {isSubmitting ? 'Ajout...' : 'Ajouter le document'}
            </button>
          </>
        }
        isOpen={isAddOpen}
        maxWidthClassName="max-w-lg"
        onClose={closeAddModal}
        title="Ajouter un document"
      >
        <form className="space-y-4" id="add-document-form" onSubmit={handleAddSubmit}>
          <div className="space-y-1.5">
            <label className={LABEL_CLASSES}>Rattaché à</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
                  newOwnerType === 'CONTACT'
                    ? 'border-primary bg-primary-container/10 text-on-surface'
                    : 'border-outline-variant text-secondary hover:bg-surface-container-high'
                }`}
                onClick={() => {
                  setNewOwnerType('CONTACT');
                  setNewOwnerId('');
                }}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">apartment</span>
                Contact
              </button>
              <button
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
                  newOwnerType === 'PROJECT'
                    ? 'border-primary bg-primary-container/10 text-on-surface'
                    : 'border-outline-variant text-secondary hover:bg-surface-container-high'
                }`}
                onClick={() => {
                  setNewOwnerType('PROJECT');
                  setNewOwnerId('');
                }}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">account_tree</span>
                Projet
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={LABEL_CLASSES} htmlFor="new-document-owner">
              {newOwnerType === 'CONTACT' ? 'Contact' : 'Projet'}
            </label>
            <select
              className={`${COMPACT_INPUT_CLASSES} appearance-none`}
              id="new-document-owner"
              onChange={(event) => setNewOwnerId(event.target.value)}
              required
              value={newOwnerId}
            >
              <option value="" disabled>
                {newOwnerType === 'CONTACT' ? 'Choisir un contact...' : 'Choisir un projet...'}
              </option>
              {ownerOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                  {option.typeLabel ? ` (${option.typeLabel})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={LABEL_CLASSES} htmlFor="new-document-type">
              Type de document
            </label>
            <select
              className={`${COMPACT_INPUT_CLASSES} appearance-none`}
              id="new-document-type"
              onChange={(event) => setNewDocType(event.target.value as DocumentType | '')}
              required
              value={newDocType}
            >
              <option value="" disabled>
                Choisir un type...
              </option>
              {documentTypes.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={LABEL_CLASSES}>Statut</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
                  newStatus === 'PIECE_JOINTE'
                    ? 'border-primary bg-primary-container/10 text-on-surface'
                    : 'border-outline-variant text-secondary hover:bg-surface-container-high'
                }`}
                onClick={() => setNewStatus('PIECE_JOINTE')}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">attach_file</span>
                Pièce jointe
              </button>
              <button
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
                  newStatus === 'A_VALIDER'
                    ? 'border-primary bg-primary-container/10 text-on-surface'
                    : 'border-outline-variant text-secondary hover:bg-surface-container-high'
                }`}
                onClick={() => setNewStatus('A_VALIDER')}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">rate_review</span>
                À valider
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={LABEL_CLASSES} htmlFor="new-document-label">
              Libellé <span className="normal-case text-secondary font-normal">(facultatif)</span>
            </label>
            <input
              className={COMPACT_INPUT_CLASSES}
              id="new-document-label"
              onChange={(event) => setNewLabel(event.target.value)}
              placeholder="Ex : Contrat signé 2026"
              type="text"
              value={newLabel}
            />
          </div>

          <div className="space-y-1.5">
            <label className={LABEL_CLASSES}>Fichier</label>
            {newFile ? (
              <div className="flex items-center gap-3 px-3.5 py-3 bg-surface-container-low border border-outline-variant rounded-lg">
                <div className="w-9 h-9 rounded-lg bg-primary-container/10 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">description</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-on-surface truncate">{newFile.name}</p>
                  <p className="text-[11px] text-secondary">{formatFileSize(newFile.size)}</p>
                </div>
                <button
                  className="p-1.5 text-secondary hover:text-error transition-colors shrink-0"
                  onClick={() => setNewFile(null)}
                  title="Retirer le fichier"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            ) : (
              <label
                className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg py-8 text-sm cursor-pointer transition-colors text-center ${
                  isDraggingFile
                    ? 'border-primary bg-primary-container/10 text-primary'
                    : 'border-outline-variant text-secondary hover:border-primary hover:text-primary'
                }`}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setIsDraggingFile(false);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDraggingFile(true);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDraggingFile(false);
                  const file = event.dataTransfer.files?.[0] ?? null;
                  if (file) setNewFile(file);
                }}
              >
                <span className="material-symbols-outlined text-[28px]">upload_file</span>
                Glissez un fichier ici ou cliquez pour parcourir
                <input className="hidden" onChange={(event) => setNewFile(event.target.files?.[0] ?? null)} type="file" />
              </label>
            )}
          </div>

          {submitError && <p className="text-xs text-error font-medium">{submitError}</p>}
        </form>
      </Modal>
    </div>
  );
}
