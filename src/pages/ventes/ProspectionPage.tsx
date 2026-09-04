import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../../components/ui/Modal';
import ScoreRing from '../../components/ScoreRing';
import ProspectFormModal from '../../components/ProspectFormModal';
import SuccessModal from '../../components/SuccessModal';
import {
  STAGE_BADGE_CLASSES,
  STAGE_OPTIONS,
  listContacts,
  transferContact,
  type Contact,
} from '../../services/contactService';
import { listCommercials, type CurrentUser } from '../../services/userService';

const SELECT_CLASSES =
  'bg-surface-container border border-outline-variant py-2 pl-9 pr-8 text-sm focus:outline-none focus:border-primary-container transition-all appearance-none';

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

interface Trend {
  label: string;
  direction: 'up' | 'down' | 'neutral';
}

/** Compare deux valeurs et rend une tendance honnête : pas de pourcentage
 * fantaisiste quand on n'a pas assez d'historique pour le justifier. */
function compareValues(current: number, previous: number | null, unit: 'percent' | 'points' = 'percent'): Trend {
  if (previous === null) {
    return { label: 'Historique insuffisant', direction: 'neutral' };
  }
  if (previous === 0) {
    return current > 0 ? { label: 'Nouveau ce mois-ci', direction: 'up' } : { label: 'Stable', direction: 'neutral' };
  }
  if (unit === 'points') {
    const delta = Math.round((current - previous) * 10) / 10;
    if (delta === 0) return { label: 'Stable', direction: 'neutral' };
    return { label: `${delta > 0 ? '+' : ''}${delta} pts vs mois dernier`, direction: delta > 0 ? 'up' : 'down' };
  }
  const change = Math.round(((current - previous) / previous) * 1000) / 10;
  if (change === 0) return { label: 'Stable', direction: 'neutral' };
  return { label: `${change > 0 ? '+' : ''}${change}% vs mois dernier`, direction: change > 0 ? 'up' : 'down' };
}

function average(list: Contact[]): number {
  return list.length ? list.reduce((sum, contact) => sum + contact.score, 0) / list.length : 0;
}

interface ProspectKpisProps {
  contacts: Contact[];
}

function ProspectKpis({ contacts }: ProspectKpisProps) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const priorToThisMonth = contacts.filter((contact) => new Date(contact.created_at) < monthStart);
  const createdLastMonth = contacts.filter((contact) => {
    const createdAt = new Date(contact.created_at);
    return createdAt >= lastMonthStart && createdAt < monthStart;
  });
  const createdThisMonth = contacts.filter((contact) => new Date(contact.created_at) >= monthStart);

  const total = contacts.length;
  const avgScore = Math.round(average(contacts));
  const newThisMonth = createdThisMonth.length;
  const closedCount = contacts.filter((contact) => contact.stage === 'CONVERSION_CLIENT').length;
  const closingRate = total ? Math.round((closedCount / total) * 1000) / 10 : 0;

  const priorClosedCount = priorToThisMonth.filter((contact) => contact.stage === 'CONVERSION_CLIENT').length;
  const priorClosingRate = priorToThisMonth.length ? (priorClosedCount / priorToThisMonth.length) * 100 : null;

  const kpis: { label: string; icon: string; value: string; suffix?: string; trend: Trend }[] = [
    {
      label: 'Total Prospects',
      icon: 'analytics',
      value: String(total),
      trend: compareValues(total, priorToThisMonth.length),
    },
    {
      label: 'Score Moyen',
      icon: 'ads_click',
      value: String(avgScore),
      suffix: '/100',
      trend: compareValues(avgScore, priorToThisMonth.length ? average(priorToThisMonth) : null, 'points'),
    },
    {
      label: 'Nouveaux ce mois',
      icon: 'new_releases',
      value: String(newThisMonth),
      trend: compareValues(newThisMonth, createdLastMonth.length),
    },
    {
      label: 'Taux de Clôture',
      icon: 'handshake',
      value: `${closingRate}%`,
      trend: compareValues(closingRate, priorClosingRate, 'points'),
    },
  ];

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="bg-surface-container-lowest border border-outline-variant p-4 flex items-center gap-3"
        >
          <span className="material-symbols-outlined text-primary-container text-2xl shrink-0">{kpi.icon}</span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">{kpi.label}</span>
            <div className="flex items-baseline gap-1">
              <span className="font-headline-md text-headline-md text-on-surface leading-tight">{kpi.value}</span>
              {kpi.suffix && <span className="text-sm text-secondary">{kpi.suffix}</span>}
            </div>
            <div
              className={`flex items-center gap-1 text-[11px] font-bold ${
                kpi.trend.direction === 'up'
                  ? 'text-green-700'
                  : kpi.trend.direction === 'down'
                    ? 'text-primary-container'
                    : 'text-secondary'
              }`}
            >
              {kpi.trend.direction !== 'neutral' && (
                <span className="material-symbols-outlined text-xs">
                  {kpi.trend.direction === 'up' ? 'trending_up' : 'trending_down'}
                </span>
              )}
              <span className="truncate">{kpi.trend.label}</span>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}

interface TransferProspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact | null;
  onTransferred: () => void;
  onSuccess: (message: string) => void;
}

function TransferProspectModal({ isOpen, onClose, contact, onTransferred, onSuccess }: TransferProspectModalProps) {
  const [commercials, setCommercials] = useState<CurrentUser[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedId(null);
    setError(null);
    setIsLoading(true);
    listCommercials()
      .then(setCommercials)
      .catch(() => setError('Impossible de charger la liste des commerciaux.'))
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  const availableCommercials = commercials.filter((commercial) => commercial.id !== contact?.assigned_to);
  const currentAssignee = commercials.find((commercial) => commercial.id === contact?.assigned_to);

  function handleClose() {
    setSelectedId(null);
    setError(null);
    onClose();
  }

  async function handleConfirm() {
    if (!contact || selectedId === null) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const targetCommercial = availableCommercials.find((commercial) => commercial.id === selectedId);
      const targetName = targetCommercial
        ? `${targetCommercial.first_name} ${targetCommercial.last_name}`.trim() || targetCommercial.email
        : 'ce commercial';
      await transferContact(contact.id, selectedId);
      onTransferred();
      handleClose();
      onSuccess(`${contact.name} a été transféré à ${targetName} avec succès.`);
    } catch {
      setError('Le transfert a échoué. Réessayez.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Transférer le prospect"
      footer={
        <>
          <button
            className="px-5 py-2.5 rounded border border-outline-variant text-on-surface font-body-sm text-body-sm hover:bg-surface-container-high transition-colors"
            onClick={handleClose}
            type="button"
          >
            Annuler
          </button>
          <button
            className="px-5 py-2.5 rounded bg-on-primary-fixed-variant text-white font-body-sm text-body-sm font-bold hover:bg-primary transition-colors disabled:opacity-50"
            disabled={selectedId === null || isSubmitting}
            onClick={handleConfirm}
            type="button"
          >
            {isSubmitting ? 'Transfert...' : 'Transférer'}
          </button>
        </>
      }
    >
      <p className="font-body-md text-body-md text-secondary mb-3">
        Choisissez le commercial qui reprendra <strong className="text-on-surface">{contact?.name}</strong>.
      </p>

      {contact?.assigned_to_name && (
        <div className="flex items-center gap-3 p-3 mb-4 rounded border border-outline-variant bg-surface-container-low">
          {currentAssignee?.profile_picture ? (
            <img
              alt={contact.assigned_to_name}
              className="w-8 h-8 rounded-full object-cover"
              src={currentAssignee.profile_picture}
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-on-surface text-xs font-bold">
              {getInitials(contact.assigned_to_name)}
            </div>
          )}
          <div>
            <p className="text-[11px] text-secondary uppercase font-bold tracking-wide">Actuellement en charge</p>
            <p className="font-body-sm text-body-sm text-on-surface font-semibold">{contact.assigned_to_name}</p>
          </div>
        </div>
      )}

      {isLoading && <p className="text-body-sm text-secondary">Chargement...</p>}
      {error && <p className="text-body-sm text-error mb-2">{error}</p>}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {availableCommercials.map((commercial) => {
          const fullName = `${commercial.first_name} ${commercial.last_name}`.trim() || commercial.email;
          return (
            <label
              key={commercial.id}
              className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition-colors ${
                selectedId === commercial.id
                  ? 'border-primary bg-primary-container/10'
                  : 'border-outline-variant hover:bg-surface-container-high'
              }`}
            >
              <input
                checked={selectedId === commercial.id}
                className="accent-primary"
                name="commercial"
                onChange={() => setSelectedId(commercial.id)}
                type="radio"
                value={commercial.id}
              />
              {commercial.profile_picture ? (
                <img alt={fullName} className="w-8 h-8 rounded-full object-cover" src={commercial.profile_picture} />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary text-xs font-bold">
                  {getInitials(fullName)}
                </div>
              )}
              <span className="font-body-sm text-body-sm text-on-surface">{fullName}</span>
            </label>
          );
        })}
        {!isLoading && availableCommercials.length === 0 && (
          <p className="text-body-sm text-secondary">Aucun commercial disponible.</p>
        )}
      </div>
    </Modal>
  );
}

interface ProspectsTableProps {
  contacts: Contact[];
  onEdit: (contact: Contact) => void;
  onRefresh: () => void;
  onTransferSuccess: (message: string) => void;
}

function ProspectsTable({ contacts, onEdit, onRefresh, onTransferSuccess }: ProspectsTableProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [repFilter, setRepFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [transferTarget, setTransferTarget] = useState<Contact | null>(null);

  const reps = useMemo(
    () => Array.from(new Set(contacts.map((contact) => contact.assigned_to_name).filter((name): name is string => !!name))).sort(),
    [contacts]
  );

  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return contacts.filter((contact) => {
      const matchesQuery =
        !query ||
        contact.name.toLowerCase().includes(query) ||
        contact.company.toLowerCase().includes(query) ||
        contact.email.toLowerCase().includes(query) ||
        contact.phone.toLowerCase().includes(query);
      const matchesRep = !repFilter || contact.assigned_to_name === repFilter;
      const matchesStage = !stageFilter || contact.stage === stageFilter;
      return matchesQuery && matchesRep && matchesStage;
    });
  }, [contacts, search, repFilter, stageFilter]);

  return (
    <section className="bg-surface-container-lowest border border-outline-variant overflow-hidden flex flex-col">
      {/* Filtres/Actions */}
      <div className="p-gutter border-b border-outline-variant flex flex-col md:flex-row md:items-center gap-4 bg-surface">
        <div className="relative flex-1 md:max-w-xl">
          <span className="absolute inset-y-0 left-3 flex items-center text-outline">
            <span className="material-symbols-outlined text-sm">search</span>
          </span>
          <input
            className="w-full bg-surface-container border border-outline-variant py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary-container transition-all"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un prospect..."
            type="text"
            value={search}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-outline pointer-events-none">
              <span className="material-symbols-outlined text-sm">person</span>
            </span>
            <select
              className={SELECT_CLASSES}
              onChange={(event) => setRepFilter(event.target.value)}
              value={repFilter}
            >
              <option value="">Tous les commerciaux</option>
              {reps.map((rep) => (
                <option key={rep} value={rep}>
                  {rep}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline text-sm pointer-events-none">
              expand_more
            </span>
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-outline pointer-events-none">
              <span className="material-symbols-outlined text-sm">flag</span>
            </span>
            <select
              className={SELECT_CLASSES}
              onChange={(event) => setStageFilter(event.target.value)}
              value={stageFilter}
            >
              <option value="">Tous les statuts</option>
              {STAGE_OPTIONS.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline text-sm pointer-events-none">
              expand_more
            </span>
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low text-secondary font-label-md text-label-md uppercase tracking-widest border-b border-outline-variant">
              <th className="px-gutter py-4 font-semibold">Contact</th>
              <th className="px-gutter py-4 font-semibold">Étape</th>
              <th className="px-gutter py-4 font-semibold">Commercial</th>
              <th className="px-gutter py-4 font-semibold text-center">Score</th>
              <th className="px-gutter py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {filteredContacts.map((contact) => (
              <tr className="hover:bg-surface-container-low transition-colors group" key={contact.id}>
                <td className="px-gutter py-5">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-primary-container text-body-md">{contact.name}</span>
                    {contact.company && (
                      <span className="text-sm font-semibold text-on-surface-variant">{contact.company}</span>
                    )}
                    <span className="flex items-center gap-1 text-xs font-bold text-on-surface">
                      <span className="material-symbols-outlined text-[14px]">call</span>
                      {contact.phone}
                    </span>
                    <span className="text-xs text-secondary font-label-md lowercase">{contact.email}</span>
                  </div>
                </td>
                <td className="px-gutter py-5">
                  <span className={`px-3 py-1 text-xs font-bold border ${STAGE_BADGE_CLASSES[contact.stage]}`}>
                    {contact.stage_display}
                  </span>
                </td>
                <td className="px-gutter py-5">
                  {contact.assigned_to_name ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary-container flex items-center justify-center text-on-primary text-[10px] font-bold">
                        {getInitials(contact.assigned_to_name)}
                      </div>
                      <span className="text-sm font-medium">{contact.assigned_to_name}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-secondary italic">Non assigné</span>
                  )}
                </td>
                <td className="px-gutter py-5 text-center">
                  <ScoreRing score={contact.score} />
                </td>
                <td className="px-gutter py-5 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      className="w-8 h-8 flex items-center justify-center text-xs font-semibold border border-outline-variant text-secondary hover:bg-surface-container-low hover:text-on-surface transition-all rounded-lg"
                      onClick={() => onEdit(contact)}
                      title="Modifier"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button
                      className="w-8 h-8 flex items-center justify-center text-xs font-semibold border border-outline-variant text-secondary hover:bg-surface-container-low hover:text-on-surface transition-all rounded-lg"
                      onClick={() => setTransferTarget(contact)}
                      title="Transférer à un autre commercial"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                    </button>
                    <button
                      className="w-8 h-8 flex items-center justify-center text-xs font-bold bg-primary-container text-on-primary hover:bg-primary transition-all shadow-sm rounded-lg"
                      onClick={() => navigate(`/prospection/${contact.id}`)}
                      title="Voir Détail"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">visibility</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredContacts.length === 0 && (
              <tr>
                <td className="px-gutter py-8 text-center text-secondary font-body-sm" colSpan={5}>
                  Aucun prospect ne correspond à votre recherche.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <TransferProspectModal
        contact={transferTarget}
        isOpen={transferTarget !== null}
        onClose={() => setTransferTarget(null)}
        onSuccess={onTransferSuccess}
        onTransferred={onRefresh}
      />
    </section>
  );
}

export default function ProspectionPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function loadContacts() {
    setIsLoading(true);
    try {
      setContacts(await listContacts('PROSPECT'));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadContacts();
  }, []);

  function openCreateModal() {
    setEditingContact(null);
    setIsModalOpen(true);
  }

  function openEditModal(contact: Contact) {
    setEditingContact(contact);
    setIsModalOpen(true);
  }

  return (
    <div className="flex flex-col gap-gutter">
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <nav className="flex text-xs text-secondary gap-2 mb-1 font-medium">
            <span className="hover:underline cursor-pointer">CRM</span>
            <span>/</span>
            <span className="text-on-surface">Gestion des Prospects</span>
          </nav>
          <h3 className="font-headline-md text-headline-md text-on-surface">Gestion des Prospects</h3>
        </div>
        <button
          className="bg-primary-container hover:bg-primary text-on-primary px-4 py-2 text-sm font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
          onClick={openCreateModal}
          type="button"
        >
          <span className="material-symbols-outlined text-lg">person_add</span>
          Ajouter un Prospect
        </button>
      </section>

      <ProspectKpis contacts={contacts} />
      {!isLoading && (
        <ProspectsTable
          contacts={contacts}
          onEdit={openEditModal}
          onRefresh={loadContacts}
          onTransferSuccess={setSuccessMessage}
        />
      )}

      <ProspectFormModal
        contact={editingContact}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={loadContacts}
      />

      <SuccessModal
        isOpen={successMessage !== null}
        onClose={() => setSuccessMessage(null)}
        message={successMessage ?? ''}
        title="Transfert réussi"
        autoCloseMs={4000}
      />
    </div>
  );
}
