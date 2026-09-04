import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { listContacts, type Contact } from '../services/contactService';
import {
  createProject,
  PRIORITY_OPTIONS,
  type NewPrestationPayload,
  type ProjectPriority,
} from '../services/projectService';
import SuccessModal from '../components/SuccessModal';

type ProjectKind = 'EXTERNE' | 'INTERNE';

const PRIORITY_COLORS: Record<ProjectPriority, { selected: string; unselected: string }> = {
  HIGH: { selected: 'bg-error text-white', unselected: 'bg-error-container/40 text-error' },
  MEDIUM: { selected: 'bg-primary text-white', unselected: 'bg-primary-fixed/40 text-primary' },
  LOW: { selected: 'bg-secondary text-white', unselected: 'bg-secondary-fixed/60 text-secondary' },
};

interface PrestationRow {
  key: string;
  label: string;
  deadline: string;
}

function createEmptyRow(): PrestationRow {
  return { key: crypto.randomUUID(), label: '', deadline: '' };
}

export default function NouveauProjetPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedClientId = searchParams.get('client');

  const [clients, setClients] = useState<Contact[]>([]);
  const [internalContact, setInternalContact] = useState<Contact | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [projectKind, setProjectKind] = useState<ProjectKind>('EXTERNE');
  const [clientId, setClientId] = useState(preselectedClientId ?? '');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<ProjectPriority>('MEDIUM');
  const [budget, setBudget] = useState('');
  const [requiresDeposit, setRequiresDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [rows, setRows] = useState<PrestationRow[]>([createEmptyRow()]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    Promise.all([listContacts('CLIENT'), listContacts('INTERNE')])
      .then(([clientsData, internalData]) => {
        setClients(clientsData);
        setInternalContact(internalData[0] ?? null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const selectedClient = useMemo(() => {
    if (projectKind === 'INTERNE') return internalContact;
    return clients.find((c) => c.id === Number(clientId)) ?? null;
  }, [projectKind, internalContact, clients, clientId]);

  function updateRow(key: string, patch: Partial<PrestationRow>) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((prev) => [...prev, createEmptyRow()]);
  }

  function removeRow(key: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((row) => row.key !== key) : prev));
  }

  const rowsWithLateDeadline = useMemo(() => {
    if (!deadline) return new Set<string>();
    return new Set(rows.filter((row) => row.deadline && row.deadline > deadline).map((row) => row.key));
  }, [rows, deadline]);

  const completeRows = rows.filter((row) => row.label.trim() && row.deadline);

  const clientResolved = projectKind === 'INTERNE' ? !!internalContact : !!clientId;

  const budgetValue = Number(budget);
  const budgetValid = budget.trim().length > 0 && budgetValue > 0;
  const depositValue = Number(depositAmount);
  const depositValid =
    !requiresDeposit ||
    (depositAmount.trim().length > 0 && depositValue > 0 && (!budgetValid || depositValue <= budgetValue));

  const canSubmit =
    clientResolved &&
    name.trim().length > 0 &&
    !!deadline &&
    budgetValid &&
    depositValid &&
    completeRows.length > 0 &&
    completeRows.length === rows.length &&
    rowsWithLateDeadline.size === 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || !selectedClient) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const prestations: NewPrestationPayload[] = completeRows.map((row) => ({
        label: row.label.trim(),
        deadline: new Date(row.deadline).toISOString(),
      }));
      await createProject({
        client: selectedClient.id,
        name: name.trim(),
        description: description.trim(),
        deadline: new Date(deadline).toISOString(),
        priority,
        budget: budget.trim(),
        requires_deposit: requiresDeposit,
        deposit_amount: requiresDeposit ? depositAmount.trim() : null,
        prestations,
      });
      setShowSuccess(true);
    } catch {
      setError("Impossible de créer ce projet. Vérifiez les champs et réessayez.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSuccessClose() {
    setShowSuccess(false);
    navigate(preselectedClientId ? `/clients/${preselectedClientId}` : '/projets');
  }

  if (isLoading) {
    return <p className="font-body-sm text-body-sm text-secondary">Chargement...</p>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <nav className="flex items-center gap-1.5 mb-2 text-on-surface-variant text-xs font-medium">
          <button
            className="hover:text-primary transition-colors cursor-pointer"
            onClick={() => navigate('/projets')}
            type="button"
          >
            Projets
          </button>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-on-surface">Nouveau</span>
        </nav>
        <h2 className="font-headline-md text-headline-md text-on-surface">Nouveau Projet</h2>
        <p className="text-secondary text-sm mt-1">
          Un projet regroupe un ensemble de prestations ; leur division sera assignée plus tard.
        </p>
      </div>

      <form className="grid grid-cols-1 lg:grid-cols-3 gap-gutter items-start" onSubmit={handleSubmit}>
        {/* Colonne principale */}
        <div className="lg:col-span-2 flex flex-col gap-gutter">
          {/* Informations du projet */}
          <section className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm">
            <h3 className="font-headline-md text-base font-bold text-on-surface mb-5">Informations du projet</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-label-md text-label-md text-on-surface-variant uppercase" htmlFor="projectKind">
                    Type de projet
                  </label>
                  <div className="relative">
                    <select
                      className="w-full px-3 py-2.5 bg-white border border-outline-variant rounded appearance-none text-sm focus:ring-1 focus:ring-primary-container focus:border-on-primary-fixed-variant outline-none"
                      id="projectKind"
                      onChange={(event) => setProjectKind(event.target.value as ProjectKind)}
                      value={projectKind}
                    >
                      <option value="EXTERNE">Externe</option>
                      <option value="INTERNE">Interne</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-[20px] pointer-events-none">
                      expand_more
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="font-label-md text-label-md text-on-surface-variant uppercase">Priorité</label>
                  <div className="flex items-center gap-1.5">
                    {PRIORITY_OPTIONS.map((option) => {
                      const colors = PRIORITY_COLORS[option.value];
                      return (
                        <button
                          className={`flex-1 px-2 py-2 text-xs font-bold rounded-lg transition-all ${
                            priority === option.value ? colors.selected : colors.unselected
                          }`}
                          key={option.value}
                          onClick={() => setPriority(option.value)}
                          type="button"
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {projectKind === 'EXTERNE' ? (
                <div className="space-y-1">
                  <label className="font-label-md text-label-md text-on-surface-variant uppercase" htmlFor="client">
                    Client
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                      apartment
                    </span>
                    <select
                      className="w-full pl-10 pr-8 py-2.5 bg-white border border-outline-variant rounded appearance-none text-sm focus:ring-1 focus:ring-primary-container focus:border-on-primary-fixed-variant outline-none"
                      id="client"
                      onChange={(event) => setClientId(event.target.value)}
                      value={clientId}
                    >
                      <option value="" disabled>
                        Choisir un client...
                      </option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.company || client.name}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-[20px] pointer-events-none">
                      expand_more
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded bg-surface-container-low border border-outline-variant/50 text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-[18px] text-primary">apartment</span>
                  Projet interne — porté par l'agence, aucun client externe.
                </div>
              )}

              <div className="space-y-1">
                <label className="font-label-md text-label-md text-on-surface-variant uppercase" htmlFor="name">
                  Nom du projet
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
                <label className="font-label-md text-label-md text-on-surface-variant uppercase" htmlFor="deadline">
                  Échéance globale
                </label>
                <input
                  className="w-full px-3 py-2.5 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container focus:border-on-primary-fixed-variant outline-none"
                  id="deadline"
                  onChange={(event) => setDeadline(event.target.value)}
                  type="datetime-local"
                  value={deadline}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-label-md text-label-md text-on-surface-variant uppercase" htmlFor="budget">
                    Budget (FCFA)
                  </label>
                  <input
                    className="w-full px-3 py-2.5 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container focus:border-on-primary-fixed-variant outline-none"
                    id="budget"
                    min="0"
                    onChange={(event) => setBudget(event.target.value)}
                    placeholder="Ex : 2500000"
                    step="0.01"
                    type="number"
                    value={budget}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-label-md text-label-md text-on-surface-variant uppercase">Acompte requis ?</label>
                  <div className="flex items-center gap-1 p-1 bg-surface-container border border-outline-variant rounded-xl w-fit">
                    <button
                      className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        requiresDeposit ? 'bg-white text-on-surface shadow-sm' : 'text-secondary hover:text-on-surface'
                      }`}
                      onClick={() => setRequiresDeposit(true)}
                      type="button"
                    >
                      Oui
                    </button>
                    <button
                      className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        !requiresDeposit ? 'bg-white text-on-surface shadow-sm' : 'text-secondary hover:text-on-surface'
                      }`}
                      onClick={() => {
                        setRequiresDeposit(false);
                        setDepositAmount('');
                      }}
                      type="button"
                    >
                      Non
                    </button>
                  </div>
                </div>
              </div>

              {requiresDeposit && (
                <div className="space-y-1">
                  <label className="font-label-md text-label-md text-on-surface-variant uppercase" htmlFor="depositAmount">
                    Montant de l'acompte (FCFA)
                  </label>
                  <input
                    className={`w-full px-3 py-2.5 bg-white border rounded text-sm focus:ring-1 outline-none ${
                      depositAmount && !depositValid
                        ? 'border-error focus:ring-error'
                        : 'border-outline-variant focus:ring-primary-container focus:border-on-primary-fixed-variant'
                    }`}
                    id="depositAmount"
                    min="0"
                    onChange={(event) => setDepositAmount(event.target.value)}
                    placeholder="Ex : 500000"
                    step="0.01"
                    type="number"
                    value={depositAmount}
                  />
                  {depositAmount && !depositValid && (
                    <p className="text-[11px] text-error font-semibold">
                      L'acompte doit être supérieur à 0 et ne peut pas dépasser le budget.
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <label className="font-label-md text-label-md text-on-surface-variant uppercase" htmlFor="description">
                  Description
                </label>
                <textarea
                  className="w-full px-3 py-2.5 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container focus:border-on-primary-fixed-variant outline-none resize-none"
                  id="description"
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Contexte, objectifs, périmètre..."
                  rows={3}
                  value={description}
                />
              </div>
            </div>
          </section>

          {/* Prestations */}
          <section className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-headline-md text-base font-bold text-on-surface">Prestations</h3>
              <span className="text-xs text-secondary">{rows.length} ligne{rows.length > 1 ? 's' : ''}</span>
            </div>
            <p className="text-xs text-secondary mb-5">
              La division en charge de chaque prestation sera assignée plus tard ; son échéance ne peut pas dépasser
              celle du projet.
            </p>

            <div className="space-y-3">
              {rows.map((row, index) => {
                const isLate = rowsWithLateDeadline.has(row.key);
                return (
                  <div
                    className={`p-4 rounded-lg border transition-colors ${
                      isLate ? 'border-error/40 bg-error-container/10' : 'border-outline-variant bg-surface-container-low/40'
                    }`}
                    key={row.key}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary-container/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-[20px]">add_task</span>
                      </div>
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-[1.4fr_auto] gap-3">
                        <input
                          className="w-full py-2 px-2.5 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container outline-none"
                          onChange={(event) => updateRow(row.key, { label: event.target.value })}
                          placeholder={`Prestation ${index + 1} (ex : maquette logo)`}
                          type="text"
                          value={row.label}
                        />
                        <div className="flex items-center gap-2">
                          <input
                            className={`w-full py-2 px-2.5 bg-white border rounded text-sm focus:ring-1 outline-none ${
                              isLate
                                ? 'border-error focus:ring-error'
                                : 'border-outline-variant focus:ring-primary-container'
                            }`}
                            onChange={(event) => updateRow(row.key, { deadline: event.target.value })}
                            type="datetime-local"
                            value={row.deadline}
                          />
                          <button
                            className="p-2 text-outline hover:text-error hover:bg-error-container/30 rounded-lg transition-colors shrink-0 disabled:opacity-30 disabled:pointer-events-none"
                            disabled={rows.length === 1}
                            onClick={() => removeRow(row.key)}
                            title="Retirer cette prestation"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    {isLate && (
                      <p className="text-[11px] text-error font-semibold mt-2 ml-12">
                        Cette échéance dépasse l'échéance globale du projet.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              className="w-full mt-3 py-2.5 border-2 border-dashed border-outline-variant rounded-lg text-secondary text-sm font-semibold hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1.5"
              onClick={addRow}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Ajouter une prestation
            </button>
          </section>
        </div>

        {/* Colonne résumé */}
        <aside className="lg:sticky lg:top-6 flex flex-col gap-gutter">
          {/* Documents (statique pour le moment) */}
          <section className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-headline-md text-base font-bold text-on-surface">Documents</h3>
              <span className="px-2 py-0.5 rounded-full bg-surface-container text-[10px] font-bold uppercase tracking-wide text-secondary">
                Bientôt disponible
              </span>
            </div>
            <p className="text-xs text-secondary mb-5">
              Joignez les fichiers utiles au projet (brief, maquettes, contrat...).
            </p>

            <div className="border-2 border-dashed border-outline-variant rounded-lg py-8 flex flex-col items-center justify-center gap-2 text-center opacity-60 cursor-not-allowed select-none">
              <span className="material-symbols-outlined text-[28px] text-secondary">upload_file</span>
              <p className="text-sm font-semibold text-secondary">Glissez-déposez vos fichiers ici</p>
              <p className="text-xs text-secondary">ou cliquez pour parcourir — fonctionnalité à venir</p>
            </div>
          </section>

          <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col gap-4">
            {error && <p className="text-xs text-error font-medium">{error}</p>}

            <button
              className="w-full flex items-center justify-center gap-1.5 bg-primary text-white py-3 rounded-full text-sm font-bold shadow-sm hover:shadow-md hover:bg-on-primary-fixed-variant active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none"
              disabled={!canSubmit || isSubmitting}
              type="submit"
            >
              {isSubmitting ? (
                'Création...'
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                  Créer le projet
                </>
              )}
            </button>
          </div>
        </aside>
      </form>

      <SuccessModal
        isOpen={showSuccess}
        message={`« ${name} » a été créé avec succès pour ${selectedClient?.company || selectedClient?.name || 'ce client'}.`}
        onClose={handleSuccessClose}
        title="Projet créé"
      />
    </div>
  );
}
