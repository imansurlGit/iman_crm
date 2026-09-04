import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listContacts, type Contact } from '../../services/contactService';
import { listProjects, type Project } from '../../services/projectService';
import { useAuth } from '../../context/AuthContext';
import {
  RECORD_TYPE_CLASSES,
  RECORD_TYPE_LABELS,
  STEP_DEFINITIONS,
  stepIndex,
  deriveCurrentStep,
  deriveRecordType,
  isDossierBlocked,
  isRelanceDue,
  type CommercialStep,
} from '../../utils/commercialWorkflow';

const SEARCH_INPUT_CLASSES =
  'w-full bg-surface-container border border-outline-variant py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary-container transition-all rounded-lg';

function formatAmount(value: string): string {
  const amount = Number(value);
  return Number.isNaN(amount) ? '—' : `${amount.toLocaleString('fr-FR')} FCFA`;
}

function formatDeadline(value: string | null): string {
  if (!value) return '';
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface DossierRow {
  contact: Contact;
  project: Project | null;
  step: CommercialStep;
  recordType: ReturnType<typeof deriveRecordType>;
  blocked: boolean;
  relanceDue: boolean;
}

export default function DossiersClientsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState<DossierRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stepFilter, setStepFilter] = useState<CommercialStep | ''>('');

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    Promise.all([listContacts('PROSPECT'), listContacts('CLIENT'), listProjects()])
      .then(([prospects, clients, projects]) => {
        const myContacts = [...prospects, ...clients].filter((contact) => contact.assigned_to === user.id);
        const latestProjectByContact = new Map<number, Project>();
        for (const project of projects) {
          const existing = latestProjectByContact.get(project.client);
          if (!existing || new Date(project.created_at) > new Date(existing.created_at)) {
            latestProjectByContact.set(project.client, project);
          }
        }
        const built = myContacts.map((contact) => {
          const project = latestProjectByContact.get(contact.id) ?? null;
          return {
            contact,
            project,
            step: deriveCurrentStep(contact, project),
            recordType: deriveRecordType(project),
            blocked: isDossierBlocked(contact, project),
            relanceDue: isRelanceDue(contact),
          };
        });
        setRows(built);
      })
      .finally(() => setIsLoading(false));
  }, [user]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter(
      (row) =>
        (!query ||
          row.contact.company.toLowerCase().includes(query) ||
          row.contact.name.toLowerCase().includes(query)) &&
        (!stepFilter || row.step === stepFilter),
    );
  }, [rows, search, stepFilter]);

  const activeCount = rows.length;
  const blockedCount = rows.filter((r) => r.blocked).length;
  const relanceCount = rows.filter((r) => r.relanceDue).length;
  const closedCount = rows.filter((r) => r.step === 'CLOTURE').length;

  return (
    <div className="flex flex-col gap-gutter">
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">Dossiers clients</h2>
          <p className="text-secondary mt-1 text-sm">
            De la prise de contact à la clôture — un dossier par prospect/client dont vous avez la charge.
          </p>
        </div>
        <button
          className="flex items-center gap-1.5 bg-primary text-white pl-3 pr-4 py-2 rounded-full text-xs font-bold shadow-sm hover:shadow-md hover:bg-on-primary-fixed-variant active:scale-95 transition-all shrink-0"
          onClick={() => navigate('/prospection')}
          type="button"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Nouveau dossier
        </button>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
        <div className="bg-surface-container-lowest border border-outline-variant p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-primary-container text-2xl shrink-0">folder_shared</span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">Dossiers actifs</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{activeCount}</span>
          </div>
        </div>
        <div className={`bg-surface-container-lowest border p-4 flex items-center gap-3 ${blockedCount > 0 ? 'border-error/30' : 'border-outline-variant'}`}>
          <span className={`material-symbols-outlined text-2xl shrink-0 ${blockedCount > 0 ? 'text-error' : 'text-primary-container'}`}>
            block
          </span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">Dossiers bloqués</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{blockedCount}</span>
          </div>
        </div>
        <div className={`bg-surface-container-lowest border p-4 flex items-center gap-3 ${relanceCount > 0 ? 'border-amber-300' : 'border-outline-variant'}`}>
          <span className={`material-symbols-outlined text-2xl shrink-0 ${relanceCount > 0 ? 'text-amber-600' : 'text-primary-container'}`}>
            notifications_active
          </span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">Relances à faire</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{relanceCount}</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-emerald-600 text-2xl shrink-0">task_alt</span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">Clôturés</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{closedCount}</span>
          </div>
        </div>
      </section>

      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-3 flex items-center text-outline">
            <span className="material-symbols-outlined text-sm">search</span>
          </span>
          <input
            className={SEARCH_INPUT_CLASSES}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un dossier, un client..."
            type="text"
            value={search}
          />
        </div>
        <div className="relative w-full md:w-64 shrink-0">
          <span className="absolute inset-y-0 left-3 flex items-center text-outline pointer-events-none">
            <span className="material-symbols-outlined text-sm">filter_list</span>
          </span>
          <select
            className="w-full bg-surface-container border border-outline-variant rounded-lg py-2 pl-10 pr-8 text-sm appearance-none focus:outline-none focus:border-primary-container transition-all"
            onChange={(event) => setStepFilter(event.target.value as CommercialStep | '')}
            value={stepFilter}
          >
            <option value="">Toutes les étapes</option>
            {STEP_DEFINITIONS.map((step) => (
              <option key={step.key} value={step.key}>
                {step.shortLabel}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-sm pointer-events-none">
            expand_more
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {isLoading && <p className="text-sm text-secondary py-6 text-center">Chargement...</p>}

        {!isLoading &&
          filtered.map((row) => {
            const { contact, project, step, recordType, blocked, relanceDue } = row;
            const index = stepIndex(step);
            const stepDef = STEP_DEFINITIONS[index];
            const progress = Math.round(((index + 1) / STEP_DEFINITIONS.length) * 100);
            const budget = project?.budget ? Number(project.budget) : null;
            return (
              <button
                className={`text-left bg-white border rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-4 hover:shadow-sm transition-all ${
                  blocked ? 'border-error/40' : 'border-outline-variant'
                }`}
                key={contact.id}
                onClick={() => navigate(`/dossiers-clients/${contact.id}`)}
                type="button"
              >
                <div className="w-11 h-11 rounded-lg bg-primary-container/10 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">{stepDef.icon}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-on-surface">{contact.company || contact.name}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${RECORD_TYPE_CLASSES[recordType]}`}>
                      {RECORD_TYPE_LABELS[recordType]}
                    </span>
                    {relanceDue && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-700">
                        Relance à faire
                      </span>
                    )}
                    {blocked && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-error-container text-error">
                        Bloqué
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-secondary mt-0.5">
                    {contact.name} · {contact.sector || 'Secteur non renseigné'}
                    {budget !== null && (
                      <>
                        {' · '}
                        {formatAmount(project!.budget as string)}
                        {project?.deadline && ` · Échéance : ${formatDeadline(project.deadline)}`}
                      </>
                    )}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 max-w-[220px] h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-[11px] text-secondary shrink-0">
                      Étape {index + 1}/{STEP_DEFINITIONS.length} · {stepDef.shortLabel}
                    </span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-secondary shrink-0">chevron_right</span>
              </button>
            );
          })}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center text-secondary text-sm py-10 bg-white border border-dashed border-outline-variant rounded-lg">
            Aucun dossier ne correspond à votre recherche.
          </div>
        )}
      </div>
    </div>
  );
}
