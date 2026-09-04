import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { createDocument } from '../services/documentService';
import { getDivisionChiefLabel, getDivisionIcon, listDivisions, type Division } from '../services/divisionService';
import { getProject, updatePrestation, type Project } from '../services/projectService';

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const LABEL_CLASSES = 'font-label-md text-label-md text-on-surface-variant uppercase tracking-wide';
const COMPACT_INPUT_CLASSES =
  'w-full px-3 py-2 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container outline-none';
const CARD_CLASSES = 'bg-white border border-outline-variant rounded-xl p-6 shadow-sm';

export default function ProjetAffectationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPrestationId = searchParams.get('prestation');

  const [project, setProject] = useState<Project | null>(null);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [divisionId, setDivisionId] = useState('');
  const [note, setNote] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    setLoadError(false);
    Promise.all([getProject(Number(id)), listDivisions()])
      .then(([projectData, divisionsData]) => {
        setProject(projectData);
        setDivisions(divisionsData);
        if (preselectedPrestationId) {
          setSelectedIds(new Set([Number(preselectedPrestationId)]));
        }
      })
      .catch(() => setLoadError(true))
      .finally(() => setIsLoading(false));
  }, [id, preselectedPrestationId]);

  const selectedDivision = useMemo(() => divisions.find((d) => d.id === Number(divisionId)) ?? null, [divisions, divisionId]);
  const chiefLabel = selectedDivision ? getDivisionChiefLabel(selectedDivision.name) : null;

  function toggleSelected(prestationId: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(prestationId)) next.delete(prestationId);
      else next.add(prestationId);
      return next;
    });
  }

  function handleFilesChange(event: ChangeEvent<HTMLInputElement>) {
    setFiles((prev) => [...prev, ...Array.from(event.target.files ?? [])]);
    event.target.value = '';
  }

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((file) => file.name !== name));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project || !divisionId || selectedIds.size === 0) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await Promise.all(
        Array.from(selectedIds).map((prestationId) =>
          updatePrestation(prestationId, { division: Number(divisionId), note: note.trim() || undefined }),
        ),
      );
      await Promise.all(
        files.map((file) => {
          const formData = new FormData();
          formData.append('owner_type', 'PROJECT');
          formData.append('project', String(project.id));
          formData.append('document_type', 'BRIEF');
          formData.append('label', file.name);
          formData.append('file', file);
          return createDocument(formData);
        }),
      );
      navigate(`/projets/${project.id}`);
    } catch {
      setSubmitError("Impossible d'enregistrer cette affectation. Vérifiez les champs et réessayez.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <p className="font-body-sm text-body-sm text-secondary">Chargement...</p>;
  }

  if (loadError || !project) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="text-secondary text-sm mb-4">Ce projet est introuvable.</p>
        <button className="text-sm font-bold text-primary hover:underline" onClick={() => navigate('/projets')} type="button">
          Retour aux projets
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <nav className="flex items-center gap-1.5 mb-2 text-on-surface-variant text-xs font-medium">
          <button className="hover:text-primary transition-colors cursor-pointer" onClick={() => navigate('/projets')} type="button">
            Projets
          </button>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <button className="hover:text-primary transition-colors cursor-pointer" onClick={() => navigate(`/projets/${project.id}`)} type="button">
            {project.name}
          </button>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-on-surface">Nouvelle affectation</span>
        </nav>
        <h2 className="font-headline-md text-headline-md text-on-surface">Nouvelle affectation</h2>
        <p className="text-secondary text-sm mt-1">
          Choisissez les prestations à confier à une division ; son chef sera notifié à l'enregistrement.
        </p>
      </div>

      <form className="grid grid-cols-1 lg:grid-cols-3 gap-gutter items-start" onSubmit={handleSubmit}>
        {/* Colonne principale */}
        <div className="lg:col-span-2 flex flex-col gap-gutter">
          <section className={CARD_CLASSES}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-headline-md text-base font-bold text-on-surface">Prestations à affecter</h3>
              <span className="text-xs text-secondary">
                {selectedIds.size} / {project.prestations.length} sélectionnée{selectedIds.size > 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs text-secondary mb-5">Sélectionnez une ou plusieurs prestations.</p>

            <div className="space-y-2.5">
              {project.prestations.map((prestation) => {
                const selected = selectedIds.has(prestation.id);
                return (
                  <label
                    className={`flex items-center gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                      selected ? 'border-primary bg-primary-container/10 shadow-sm' : 'border-outline-variant hover:border-primary-container hover:bg-surface-container-low'
                    }`}
                    key={prestation.id}
                  >
                    <input checked={selected} className="sr-only" onChange={() => toggleSelected(prestation.id)} type="checkbox" />
                    <span
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        selected ? 'bg-primary border-primary' : 'border-outline'
                      }`}
                    >
                      {selected && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
                    </span>
                    <div className="w-9 h-9 rounded-lg bg-primary-container/10 text-primary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[18px]">add_task</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-on-surface truncate">{prestation.label}</p>
                      <p className="text-xs text-secondary">{formatDateTime(prestation.deadline)}</p>
                    </div>
                    {prestation.division_name ? (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-surface-container text-secondary shrink-0">
                        <span className="material-symbols-outlined text-[13px]">{getDivisionIcon(prestation.division_name)}</span>
                        {prestation.division_name}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-surface-container text-secondary italic shrink-0">
                        Non affectée
                      </span>
                    )}
                  </label>
                );
              })}
              {project.prestations.length === 0 && (
                <div className="text-center text-secondary text-sm py-8 border border-dashed border-outline-variant rounded-lg">
                  Ce projet n'a aucune prestation pour l'instant — ajoutez-en une depuis la fiche projet.
                </div>
              )}
            </div>
          </section>

          <div className="flex items-center justify-end gap-4">
            {submitError && <p className="text-xs text-error font-medium">{submitError}</p>}
            <button
              className="py-2 text-sm font-semibold text-secondary hover:text-on-surface transition-colors"
              onClick={() => navigate(`/projets/${project.id}`)}
              type="button"
            >
              Annuler
            </button>
            <button
              className="flex items-center gap-1.5 bg-primary text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-sm hover:shadow-md hover:bg-on-primary-fixed-variant active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none"
              disabled={!divisionId || selectedIds.size === 0 || isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Enregistrement...' : 'Affecter à la division'}
            </button>
          </div>
        </div>

        {/* Colonne latérale sticky */}
        <aside className="lg:sticky lg:top-6 flex flex-col gap-gutter">
          <section className={CARD_CLASSES}>
            <h3 className="font-headline-md text-base font-bold text-on-surface mb-4">Affecter à une division</h3>

            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">
                {selectedDivision ? getDivisionIcon(selectedDivision.name) : 'category'}
              </span>
              <select
                className={`${COMPACT_INPUT_CLASSES} appearance-none pl-10 pr-8`}
                onChange={(event) => setDivisionId(event.target.value)}
                value={divisionId}
              >
                <option value="" disabled>
                  Choisir une division...
                </option>
                {divisions.map((division) => (
                  <option key={division.id} value={division.id}>
                    {division.name}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">
                expand_more
              </span>
            </div>

            {chiefLabel && (
              <p className="text-[11px] text-secondary flex items-center gap-1 mt-3 pt-3 border-t border-outline-variant">
                <span className="material-symbols-outlined text-[13px] shrink-0">notifications</span>
                {chiefLabel} sera notifié à l'enregistrement.
              </p>
            )}
          </section>

          <section className={CARD_CLASSES}>
            <div className="space-y-1 mb-4">
              <label className={LABEL_CLASSES} htmlFor="note">
                Note <span className="normal-case font-normal text-secondary">(optionnelle)</span>
              </label>
              <textarea
                className={`${COMPACT_INPUT_CLASSES} resize-none`}
                id="note"
                onChange={(event) => setNote(event.target.value)}
                placeholder="Précisions utiles pour la division : contexte, attentes, contraintes..."
                rows={3}
                value={note}
              />
            </div>

            <div className="space-y-1">
              <label className={LABEL_CLASSES}>
                Fichiers joints <span className="normal-case font-normal text-secondary">(optionnels)</span>
              </label>
              <label
                className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-outline-variant rounded-lg py-6 cursor-pointer hover:border-primary hover:bg-surface-container-low/50 transition-colors text-center"
                htmlFor="files"
              >
                <span className="material-symbols-outlined text-[22px] text-secondary">upload_file</span>
                <span className="text-xs font-semibold text-secondary px-2">Cliquez pour joindre un ou plusieurs fichiers</span>
              </label>
              <input className="hidden" id="files" multiple onChange={handleFilesChange} type="file" />
              {files.length > 0 && (
                <ul className="space-y-1.5 mt-2">
                  {files.map((file) => (
                    <li className="flex items-center gap-2 px-2.5 py-1.5 bg-surface-container-low rounded text-xs" key={file.name}>
                      <span className="material-symbols-outlined text-[14px] text-secondary shrink-0">description</span>
                      <span className="truncate flex-1">{file.name}</span>
                      <button className="text-secondary hover:text-error shrink-0" onClick={() => removeFile(file.name)} type="button">
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </aside>
      </form>
    </div>
  );
}
