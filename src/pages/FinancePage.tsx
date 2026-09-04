import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProject, listProjects, formatProjectDeadline, type Project } from '../services/projectService';
import {
  listProjectPayments,
  createProjectPayment,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_ICONS,
  type PaymentMethod,
  type ProjectPayment,
} from '../services/projectPaymentService';
import Modal from '../components/ui/Modal';
import { LABEL_CLASSES } from '../components/ui/formStyles';

// Suivi des encaissements de la Comptabilité — dès qu'une opportunité a un
// budget, elle apparaît ici. Le paiement peut être échelonné en autant de
// fois que nécessaire (voir ProjectPayment côté backend) : la Comptabilité
// enregistre chaque encaissement dans le grand livre du projet, et
// `deposit_received`/`final_payment_received` se mettent à jour tout seuls
// dès que le total franchit l'acompte puis le budget.

type RowStatus = 'ATTENTE_ACOMPTE' | 'PARTIEL' | 'SOLDE' | 'EN_ATTENTE';

const STATUS_LABELS: Record<RowStatus, string> = {
  ATTENTE_ACOMPTE: 'Acompte en attente',
  PARTIEL: 'Partiellement encaissé',
  SOLDE: 'Soldé',
  EN_ATTENTE: "Rien d'encaissé",
};

const STATUS_CLASSES: Record<RowStatus, string> = {
  ATTENTE_ACOMPTE: 'bg-red-100 text-red-700',
  PARTIEL: 'bg-amber-100 text-amber-700',
  SOLDE: 'bg-emerald-100 text-emerald-700',
  EN_ATTENTE: 'bg-gray-100 text-gray-700',
};

function toAmount(value: string | null): number {
  if (!value) return 0;
  const amount = Number(value);
  return Number.isNaN(amount) ? 0 : amount;
}

function formatFCFA(value: number): string {
  return `${value.toLocaleString('fr-FR')} FCFA`;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function todayDateString(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

function nowTimeString(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(11, 16);
}

interface Row {
  project: Project;
  budget: number;
  depositAmount: number;
  collected: number;
  remaining: number;
  status: RowStatus;
}

function buildRow(project: Project): Row {
  const budget = toAmount(project.budget);
  const depositAmount = toAmount(project.deposit_amount);
  const collected = toAmount(project.collected_amount);
  const remaining = Math.max(0, budget - collected);

  let status: RowStatus = 'EN_ATTENTE';
  if (project.requires_deposit && !project.deposit_received) status = 'ATTENTE_ACOMPTE';
  else if (budget > 0 && collected >= budget) status = 'SOLDE';
  else if (collected > 0) status = 'PARTIEL';

  return { project, budget, depositAmount, collected, remaining, status };
}

const SEARCH_INPUT_CLASSES =
  'w-full bg-surface-container border border-outline-variant py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary-container transition-all';
const COMPACT_INPUT_CLASSES =
  'w-full px-3 py-2 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container outline-none';

const STATUS_FILTERS: { value: RowStatus | ''; label: string }[] = [
  { value: '', label: 'Tous' },
  { value: 'ATTENTE_ACOMPTE', label: 'Acompte en attente' },
  { value: 'PARTIEL', label: 'Partiels' },
  { value: 'SOLDE', label: 'Soldés' },
  { value: 'EN_ATTENTE', label: "Rien d'encaissé" },
];

export default function FinancePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canRecord = user?.role === 'COMPTABLE_GENERAL' || user?.role === 'ASSISTANT_COMPTABLE';

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RowStatus | ''>('');

  const [ledgerProjectId, setLedgerProjectId] = useState<number | null>(null);
  const [payments, setPayments] = useState<ProjectPayment[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('VIREMENT');
  const [date, setDate] = useState(todayDateString());
  const [time, setTime] = useState(nowTimeString());
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    listProjects()
      .then((data) => setProjects(data.filter((p) => p.budget !== null)))
      .finally(() => setIsLoading(false));
  }, []);

  const rows = useMemo(() => projects.map(buildRow), [projects]);

  const totalBudget = useMemo(() => rows.reduce((sum, r) => sum + r.budget, 0), [rows]);
  const totalCollected = useMemo(() => rows.reduce((sum, r) => sum + r.collected, 0), [rows]);
  const totalRemaining = useMemo(() => rows.reduce((sum, r) => sum + r.remaining, 0), [rows]);
  const pendingDeposits = useMemo(() => rows.filter((r) => r.status === 'ATTENTE_ACOMPTE'), [rows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery =
        !query ||
        row.project.name.toLowerCase().includes(query) ||
        row.project.client_name.toLowerCase().includes(query);
      const matchesFilter = !statusFilter || row.status === statusFilter;
      return matchesQuery && matchesFilter;
    });
  }, [rows, search, statusFilter]);

  const ledgerRow = rows.find((r) => r.project.id === ledgerProjectId) ?? null;

  function openLedger(projectId: number) {
    setLedgerProjectId(projectId);
    setPayments([]);
    setIsLoadingPayments(true);
    resetForm();
    listProjectPayments(projectId)
      .then(setPayments)
      .finally(() => setIsLoadingPayments(false));
  }

  function closeLedger() {
    setLedgerProjectId(null);
  }

  function resetForm() {
    setAmount('');
    setMethod('VIREMENT');
    setDate(todayDateString());
    setTime(nowTimeString());
    setNote('');
    setSubmitError(null);
  }

  async function handleSubmitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ledgerRow || isSubmitting) return;
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const created = await createProjectPayment({
        project: ledgerRow.project.id,
        amount: String(parsedAmount),
        method,
        note: note.trim(),
        paid_at: new Date(`${date}T${time}`).toISOString(),
      });
      setPayments((prev) => [created, ...prev]);
      const updatedProject = await getProject(ledgerRow.project.id);
      setProjects((prev) => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
      resetForm();
    } catch {
      setSubmitError("Impossible d'enregistrer ce paiement. Vérifiez le montant et réessayez.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function goToProject(project: Project) {
    navigate(project.kind === 'OPPORTUNITE' ? `/opportunites/${project.id}` : `/projets/${project.id}`);
  }

  if (isLoading) {
    return <p className="font-body-sm text-body-sm text-secondary">Chargement...</p>;
  }

  return (
    <div className="flex flex-col gap-gutter">
      <section>
        <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">Finance</h2>
        <p className="text-secondary mt-1 text-sm">
          Suivi des encaissements — chaque opportunité ayant un budget apparaît ici, paiement échelonné compris.
        </p>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
        <div className="bg-surface-container-lowest border border-outline-variant p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-primary-container text-2xl shrink-0">account_tree</span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">Budget total</span>
            <span className="font-headline-md text-base font-bold text-on-surface leading-tight">{formatFCFA(totalBudget)}</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-emerald-600 text-2xl shrink-0">payments</span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">Encaissé</span>
            <span className="font-headline-md text-base font-bold text-emerald-700 leading-tight">{formatFCFA(totalCollected)}</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-amber-600 text-2xl shrink-0">account_balance_wallet</span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">Reste à percevoir</span>
            <span className="font-headline-md text-base font-bold text-amber-700 leading-tight">{formatFCFA(totalRemaining)}</span>
          </div>
        </div>
        <div className={`bg-surface-container-lowest border p-4 flex items-center gap-3 ${pendingDeposits.length > 0 ? 'border-error/30' : 'border-outline-variant'}`}>
          <span className={`material-symbols-outlined text-2xl shrink-0 ${pendingDeposits.length > 0 ? 'text-error' : 'text-primary-container'}`}>
            schedule
          </span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">Acomptes en attente</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{pendingDeposits.length}</span>
          </div>
        </div>
      </section>

      {/* Filtres */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 md:max-w-xl">
          <span className="absolute inset-y-0 left-3 flex items-center text-outline">
            <span className="material-symbols-outlined text-sm">search</span>
          </span>
          <input
            className={SEARCH_INPUT_CLASSES}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un projet ou un client..."
            type="text"
            value={search}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <button
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                statusFilter === filter.value
                  ? 'bg-primary text-white border-primary'
                  : 'border-outline-variant text-secondary hover:bg-surface-container-high'
              }`}
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="px-6 py-4 font-bold text-secondary text-[11px] uppercase tracking-widest">Projet</th>
                <th className="px-6 py-4 font-bold text-secondary text-[11px] uppercase tracking-widest">Client</th>
                <th className="px-6 py-4 font-bold text-secondary text-[11px] uppercase tracking-widest">Budget</th>
                <th className="px-6 py-4 font-bold text-secondary text-[11px] uppercase tracking-widest">Encaissé</th>
                <th className="px-6 py-4 font-bold text-secondary text-[11px] uppercase tracking-widest">Reste à percevoir</th>
                <th className="px-6 py-4 font-bold text-secondary text-[11px] uppercase tracking-widest">Statut</th>
                <th className="px-6 py-4 font-bold text-secondary text-[11px] uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {filteredRows.map((row) => {
                const { project } = row;
                return (
                  <tr className="hover:bg-surface-container-lowest transition-colors" key={project.id}>
                    <td className="px-6 py-4">
                      <button className="text-left" onClick={() => goToProject(project)} type="button">
                        <p className="font-bold text-primary text-sm hover:underline">{project.name}</p>
                        <p className="text-[11px] text-secondary mt-0.5">
                          {project.kind_display}
                          {project.deadline && ` · Échéance ${formatProjectDeadline(project.deadline)}`}
                        </p>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-on-surface text-sm">{project.client_name}</td>
                    <td className="px-6 py-4 text-on-surface font-semibold text-sm">{formatFCFA(row.budget)}</td>
                    <td className="px-6 py-4 font-semibold text-sm text-emerald-700">{formatFCFA(row.collected)}</td>
                    <td className={`px-6 py-4 font-semibold text-sm ${row.remaining > 0 ? 'text-amber-700' : 'text-secondary'}`}>
                      {formatFCFA(row.remaining)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_CLASSES[row.status]}`}>
                        {STATUS_LABELS[row.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-primary-container text-on-primary hover:bg-primary transition-all shadow-sm rounded-lg"
                        onClick={() => openLedger(project.id)}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">payments</span>
                        {row.status === 'SOLDE' ? 'Grand livre' : 'Encaisser'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredRows.length === 0 && (
                <tr>
                  <td className="px-6 py-8 text-center text-secondary font-body-sm" colSpan={7}>
                    Aucun projet ne correspond à votre recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grand livre du projet — historique + enregistrement d'un encaissement */}
      <Modal
        isOpen={ledgerProjectId !== null}
        maxWidthClassName="max-w-lg"
        onClose={closeLedger}
        title="Grand livre du projet"
      >
        {ledgerRow && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-base font-bold text-on-surface">{ledgerRow.project.name}</p>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${STATUS_CLASSES[ledgerRow.status]}`}>
                  {STATUS_LABELS[ledgerRow.status]}
                </span>
              </div>
              <p className="text-sm text-secondary">{ledgerRow.project.client_name}</p>
              {ledgerRow.project.requires_deposit && (
                <p className="text-xs text-secondary mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">
                    {ledgerRow.project.deposit_received ? 'check_circle' : 'schedule'}
                  </span>
                  Acompte {formatFCFA(ledgerRow.depositAmount)} — {ledgerRow.project.deposit_received ? 'reçu' : 'en attente'}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 bg-surface-container-low rounded-lg p-3">
              <div>
                <p className="text-[10px] uppercase text-secondary font-bold">Budget</p>
                <p className="text-sm font-bold text-on-surface">{formatFCFA(ledgerRow.budget)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-secondary font-bold">Encaissé</p>
                <p className="text-sm font-bold text-emerald-700">{formatFCFA(ledgerRow.collected)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-secondary font-bold">Reste</p>
                <p className={`text-sm font-bold ${ledgerRow.remaining > 0 ? 'text-amber-700' : 'text-secondary'}`}>
                  {formatFCFA(ledgerRow.remaining)}
                </p>
              </div>
            </div>

            <div>
              <p className={LABEL_CLASSES}>Historique des encaissements</p>
              <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto">
                {isLoadingPayments ? (
                  <p className="text-xs text-secondary italic">Chargement...</p>
                ) : payments.length > 0 ? (
                  payments.map((payment) => (
                    <div
                      className="flex items-center justify-between gap-2 text-xs px-3 py-2 bg-white border border-outline-variant rounded"
                      key={payment.id}
                    >
                      <div className="flex items-center gap-1.5 text-on-surface-variant min-w-0">
                        <span className="material-symbols-outlined text-[14px] text-secondary shrink-0">
                          {PAYMENT_METHOD_ICONS[payment.method]}
                        </span>
                        <span className="truncate">
                          {formatDateTime(payment.paid_at)} · {payment.recorded_by_name ?? '—'}
                          {payment.note && ` · ${payment.note}`}
                        </span>
                      </div>
                      <span className="font-bold text-emerald-700 shrink-0">{formatFCFA(toAmount(payment.amount))}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-secondary italic">Aucun paiement enregistré pour l'instant.</p>
                )}
              </div>
            </div>

            {canRecord ? (
              ledgerRow.remaining > 0 ? (
                <form className="flex flex-col gap-2 pt-2 border-t border-outline-variant" onSubmit={handleSubmitPayment}>
                  <p className={LABEL_CLASSES}>Enregistrer un encaissement</p>
                  <input
                    className={COMPACT_INPUT_CLASSES}
                    max={ledgerRow.remaining}
                    min="1"
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder={`Montant reçu (FCFA) — reste ${formatFCFA(ledgerRow.remaining)}`}
                    required
                    type="number"
                    value={amount}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className={COMPACT_INPUT_CLASSES}
                      onChange={(event) => setDate(event.target.value)}
                      required
                      type="date"
                      value={date}
                    />
                    <input
                      className={COMPACT_INPUT_CLASSES}
                      onChange={(event) => setTime(event.target.value)}
                      required
                      type="time"
                      value={time}
                    />
                  </div>
                  <select
                    className={`${COMPACT_INPUT_CLASSES} appearance-none`}
                    onChange={(event) => setMethod(event.target.value as PaymentMethod)}
                    value={method}
                  >
                    {(Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][]).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <input
                    className={COMPACT_INPUT_CLASSES}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Note (optionnel) — ex : acompte, 2e versement..."
                    type="text"
                    value={note}
                  />
                  {submitError && <p className="text-xs text-error font-medium">{submitError}</p>}
                  <button
                    className="px-3 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-on-primary-fixed-variant transition-colors disabled:opacity-50"
                    disabled={isSubmitting}
                    type="submit"
                  >
                    {isSubmitting ? 'Enregistrement...' : 'Enregistrer le paiement'}
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-700 text-sm font-semibold">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  Projet soldé
                </div>
              )
            ) : (
              <p className="text-xs text-secondary italic">Seule la Comptabilité peut enregistrer un encaissement.</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
