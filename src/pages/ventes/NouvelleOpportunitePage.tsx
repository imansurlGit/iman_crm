import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getContact, listContacts, type Contact } from '../../services/contactService';
import { createOpportunity, createPrestation } from '../../services/projectService';
import SuccessModal from '../../components/SuccessModal';

const PRESTATION_TYPES = ['Branding', 'Digital', 'Stratégie', 'Production', 'Print', 'Événementiel', 'Conseil', 'Rédaction'];

interface PrestationRow {
  key: string;
  type: string;
  label: string;
}

function createEmptyRow(): PrestationRow {
  return { key: crypto.randomUUID(), type: '', label: '' };
}

export default function NouvelleOpportunitePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedClientId = searchParams.get('client');
  const prefilledDescription = searchParams.get('description') ?? '';

  const [preselectedContact, setPreselectedContact] = useState<Contact | null>(null);
  const [prospects, setProspects] = useState<Contact[]>([]);
  const [clients, setClients] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [clientId, setClientId] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [isContactMenuOpen, setIsContactMenuOpen] = useState(false);
  const contactMenuRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [rows, setRows] = useState<PrestationRow[]>([createEmptyRow()]);

  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedClientId) {
      getContact(Number(preselectedClientId))
        .then(setPreselectedContact)
        .finally(() => setIsLoading(false));
    } else {
      Promise.all([listContacts('PROSPECT'), listContacts('CLIENT')])
        .then(([prospectsData, clientsData]) => {
          setProspects(prospectsData);
          setClients(clientsData);
        })
        .finally(() => setIsLoading(false));
    }
  }, [preselectedClientId]);

  const allContacts = useMemo(() => [...prospects, ...clients], [prospects, clients]);

  const selectedClient = useMemo(() => {
    if (preselectedContact) return preselectedContact;
    return allContacts.find((c) => c.id === Number(clientId)) ?? null;
  }, [preselectedContact, allContacts, clientId]);

  const contactQuery = contactSearch.trim().toLowerCase();
  function matchesContactSearch(contact: Contact) {
    return (
      !contactQuery || contact.name.toLowerCase().includes(contactQuery) || contact.company.toLowerCase().includes(contactQuery)
    );
  }

  const filteredProspects = prospects.filter(matchesContactSearch);
  const filteredClients = clients.filter(matchesContactSearch);

  useEffect(() => {
    if (!isContactMenuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (contactMenuRef.current && !contactMenuRef.current.contains(event.target as Node)) {
        setIsContactMenuOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsContactMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isContactMenuOpen]);

  function selectContact(contact: Contact) {
    setClientId(String(contact.id));
    setIsContactMenuOpen(false);
    setContactSearch('');
  }

  function updateRow(key: string, patch: Partial<Pick<PrestationRow, 'type' | 'label'>>) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((prev) => [...prev, createEmptyRow()]);
  }

  function removeRow(key: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((row) => row.key !== key) : prev));
  }

  const canSubmit = !!selectedClient && name.trim().length > 0 && dueDate.trim().length > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || !selectedClient || isSubmitting) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const deadlineIso = new Date(dueDate).toISOString();
      const project = await createOpportunity({
        client: selectedClient.id,
        name: name.trim(),
        description: prefilledDescription,
        deadline: deadlineIso,
      });

      const validRows = rows.filter((row) => row.label.trim().length > 0);
      if (validRows.length > 0) {
        await Promise.all(
          validRows.map((row) =>
            createPrestation({
              project: project.id,
              label: row.type ? `${row.type} — ${row.label.trim()}` : row.label.trim(),
              deadline: deadlineIso,
              division: null,
            }),
          ),
        );
      }

      setShowSuccess(true);
    } catch {
      setSubmitError("Impossible de créer l'opportunité pour l'instant. Réessayez.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSuccessClose() {
    setShowSuccess(false);
    navigate(-1);
  }

  if (isLoading) {
    return <p className="font-body-sm text-body-sm text-secondary">Chargement...</p>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <nav className="flex items-center gap-1.5 mb-2 text-on-surface-variant text-xs font-medium">
          <button className="hover:text-primary transition-colors cursor-pointer" onClick={() => navigate('/opportunites')} type="button">
            Opportunités
          </button>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-on-surface">Nouvelle</span>
        </nav>
        <h2 className="font-headline-md text-headline-md text-on-surface">Nouvelle opportunité</h2>
        <p className="text-secondary text-sm mt-1">Le strict nécessaire pour démarrer le suivi — le reste se complète plus tard.</p>
      </div>

      <form className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-8">
          {/* Colonne gauche — informations de base */}
          <div className="flex flex-col gap-5">
            <div className="space-y-1">
              <label className="font-label-md text-label-md text-on-surface-variant uppercase" htmlFor="client">
                Contact
              </label>
              {preselectedContact ? (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded bg-surface-container-low border border-outline-variant/50 text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-[18px] text-primary">apartment</span>
                  <span className="truncate">{preselectedContact.company || preselectedContact.name}</span>
                  <span className="ml-auto px-2 py-0.5 rounded-full bg-surface-container text-[10px] font-bold uppercase tracking-wide text-secondary shrink-0">
                    {preselectedContact.contact_type_display}
                  </span>
                </div>
              ) : (
                <div className="relative" ref={contactMenuRef}>
                  <button
                    className="w-full pl-10 pr-8 py-2.5 bg-white border border-outline-variant rounded text-sm text-left relative focus:ring-1 focus:ring-primary-container focus:border-on-primary-fixed-variant outline-none"
                    id="client"
                    onClick={() => setIsContactMenuOpen((prev) => !prev)}
                    type="button"
                  >
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">apartment</span>
                    <span className={selectedClient ? 'text-on-surface' : 'text-outline'}>
                      {selectedClient ? selectedClient.company || selectedClient.name : 'Choisir un contact...'}
                    </span>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-[20px] pointer-events-none">
                      {isContactMenuOpen ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>

                  {isContactMenuOpen && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-outline-variant rounded-lg shadow-lg flex flex-col overflow-hidden">
                      <div className="p-2 border-b border-outline-variant shrink-0">
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[16px]">
                            search
                          </span>
                          <input
                            autoFocus
                            className="w-full pl-8 pr-2 py-1.5 bg-surface-container-low border border-outline-variant rounded text-sm outline-none focus:ring-1 focus:ring-primary-container"
                            onChange={(event) => setContactSearch(event.target.value)}
                            placeholder="Rechercher un contact..."
                            type="text"
                            value={contactSearch}
                          />
                        </div>
                      </div>
                      <div className="max-h-64 overflow-y-auto py-1">
                        {filteredProspects.length > 0 && (
                          <div>
                            <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-secondary">Prospects</p>
                            {filteredProspects.map((contact) => (
                              <button
                                className="w-full text-left px-3 py-2 text-sm text-on-surface hover:bg-surface-container-low transition-colors truncate"
                                key={contact.id}
                                onClick={() => selectContact(contact)}
                                type="button"
                              >
                                {contact.company || contact.name}
                              </button>
                            ))}
                          </div>
                        )}
                        {filteredClients.length > 0 && (
                          <div>
                            <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-secondary">Clients</p>
                            {filteredClients.map((contact) => (
                              <button
                                className="w-full text-left px-3 py-2 text-sm text-on-surface hover:bg-surface-container-low transition-colors truncate"
                                key={contact.id}
                                onClick={() => selectContact(contact)}
                                type="button"
                              >
                                {contact.company || contact.name}
                              </button>
                            ))}
                          </div>
                        )}
                        {filteredProspects.length === 0 && filteredClients.length === 0 && (
                          <p className="px-3 py-4 text-center text-xs text-secondary">Aucun contact ne correspond</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="font-label-md text-label-md text-on-surface-variant uppercase" htmlFor="name">
                Titre
              </label>
              <input
                className="w-full px-3 py-2.5 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container focus:border-on-primary-fixed-variant outline-none"
                id="name"
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex : Refonte identité visuelle"
                type="text"
                value={name}
              />
            </div>

            <div className="space-y-1">
              <label className="font-label-md text-label-md text-on-surface-variant uppercase" htmlFor="dueDate">
                Échéance visée
              </label>
              <input
                className="w-full px-3 py-2.5 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container focus:border-on-primary-fixed-variant outline-none"
                id="dueDate"
                onChange={(event) => setDueDate(event.target.value)}
                type="date"
                value={dueDate}
              />
            </div>
          </div>

          {/* Colonne droite — prestations */}
          <div className="flex flex-col gap-2 lg:border-l lg:border-outline-variant lg:pl-8">
            <div className="flex items-center justify-between">
              <label className="font-label-md text-label-md text-on-surface-variant uppercase">Prestations</label>
              <span className="text-xs text-secondary">
                {rows.length} ligne{rows.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex flex-col gap-2.5">
              {rows.map((row, index) => (
                <div className="flex items-center gap-2 p-2.5 rounded-lg border border-outline-variant bg-surface-container-low/40" key={row.key}>
                  <div className="w-7 h-7 rounded-lg bg-tertiary/10 text-tertiary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[16px]">add_task</span>
                  </div>
                  <div className="relative w-36 shrink-0">
                    <select
                      className="w-full py-2 pl-2.5 pr-6 bg-white border border-outline-variant rounded appearance-none text-sm focus:ring-1 focus:ring-primary-container outline-none"
                      onChange={(event) => updateRow(row.key, { type: event.target.value })}
                      value={row.type}
                    >
                      <option value="">Type...</option>
                      {PRESTATION_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 text-outline text-sm pointer-events-none">
                      expand_more
                    </span>
                  </div>
                  <input
                    className="flex-1 min-w-0 py-2 px-2.5 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container outline-none"
                    onChange={(event) => updateRow(row.key, { label: event.target.value })}
                    placeholder={`Prestation ${index + 1} (ex : maquette logo)`}
                    type="text"
                    value={row.label}
                  />
                  <button
                    className="p-1.5 text-outline hover:text-error hover:bg-error-container/30 rounded-lg transition-colors shrink-0 disabled:opacity-30 disabled:pointer-events-none"
                    disabled={rows.length === 1}
                    onClick={() => removeRow(row.key)}
                    title="Retirer cette prestation"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              ))}
            </div>
            <button
              className="w-full py-2 border-2 border-dashed border-outline-variant rounded-lg text-secondary text-xs font-semibold hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1.5"
              onClick={addRow}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Ajouter une prestation
            </button>
          </div>
        </div>

        {submitError && <p className="text-xs text-error font-semibold mt-5">{submitError}</p>}
        <button
          className="w-full flex items-center justify-center gap-1.5 bg-primary text-white py-3 rounded-full text-sm font-bold shadow-sm hover:shadow-md hover:bg-on-primary-fixed-variant active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none mt-6"
          disabled={!canSubmit || isSubmitting}
          type="submit"
        >
          <span className="material-symbols-outlined text-[18px]">emoji_objects</span>
          {isSubmitting ? 'Création en cours...' : "Créer l'opportunité"}
        </button>
      </form>

      <SuccessModal
        isOpen={showSuccess}
        message={`« ${name} » a été créée avec succès pour ${selectedClient?.company || selectedClient?.name || 'ce contact'}.`}
        onClose={handleSuccessClose}
        title="Opportunité créée"
      />
    </div>
  );
}
