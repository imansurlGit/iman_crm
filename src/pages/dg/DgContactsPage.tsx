// Contacts Direction Générale (DG)
// Vue stratégique et consolidée : Prospects, Clients, Partenaires
// Branchée sur les vraies données (`Contact` côté backend).

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Modal from '../../components/ui/Modal';
import { ICON_CLASSES, LABEL_CLASSES } from '../../components/ui/formStyles';
import {
  listContacts,
  createContact,
  updateContact,
  transferContact,
  STAGE_BADGE_CLASSES,
  SECTORS,
  SOURCES,
  type Contact,
  type ContactType,
} from '../../services/contactService';
import { listDirectory, type CurrentUser } from '../../services/userService';

type Onglet = 'PROSPECTS' | 'CLIENTS' | 'PARTENAIRES';
type NewContactType = Extract<ContactType, 'PROSPECT' | 'CLIENT' | 'PARTENAIRE'>;

const TAB_META: Record<Onglet, { label: string; icon: string }> = {
  PROSPECTS: { label: 'Prospects', icon: 'person_search' },
  CLIENTS: { label: 'Clients', icon: 'apartment' },
  PARTENAIRES: { label: 'Partenaires', icon: 'handshake' },
};

const NEW_CONTACT_TYPE_META: Record<NewContactType, { label: string; icon: string; helper: string }> = {
  PROSPECT: { label: 'Prospect', icon: 'person_search', helper: 'Un contact en cours de qualification, pas encore client.' },
  CLIENT: { label: 'Client', icon: 'apartment', helper: 'Un compte actif ayant déjà signé une prestation.' },
  PARTENAIRE: { label: 'Partenaire', icon: 'handshake', helper: 'Un partenaire institutionnel ou média.' },
};

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatRelativeDate(value: string): string {
  const date = new Date(value);
  const diffDays = Math.round((new Date().setHours(0, 0, 0, 0) - date.setHours(0, 0, 0, 0)) / 86_400_000);
  if (diffDays <= 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function formatShortDate(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

const COMPACT_INPUT_CLASSES =
  'w-full px-3 py-2 bg-white border border-outline-variant rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none transition-all';
// Même style que les inputs à icône (ProspectFormModal.tsx) — icône ancrée à
// gauche, input décalé par du padding.
const ICON_INPUT_CLASSES =
  'w-full pl-10 pr-3 py-2 bg-white border border-outline-variant rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none transition-all';

export default function DgContactsPage() {
  const [activeTab, setActiveTab] = useState<Onglet>('PROSPECTS');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [directory, setDirectory] = useState<CurrentUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('Tous les secteurs');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // Modal Ajouter / Modifier
  const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Contact | null>(null);
  const [newName, setNewName] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newSector, setNewSector] = useState(SECTORS[0]);
  const [newType, setNewType] = useState<NewContactType>('PROSPECT');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newSource, setNewSource] = useState(SOURCES[0]);
  const [newNotes, setNewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Modal Transfert
  const [transferTarget, setTransferTarget] = useState<Contact | null>(null);
  const [transferTo, setTransferTo] = useState<number | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([listContacts('PROSPECT'), listContacts('CLIENT'), listContacts('PARTENAIRE'), listDirectory()])
      .then(([prospects, clients, partenaires, dir]) => {
        setContacts([...prospects, ...clients, ...partenaires]);
        setDirectory(dir);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Statistiques calculées
  const stats = useMemo(() => {
    const total = contacts.length;
    const prospectsCount = contacts.filter((c) => c.contact_type === 'PROSPECT').length;
    const clientsCount = contacts.filter((c) => c.contact_type === 'CLIENT').length;
    const partenairesCount = contacts.filter((c) => c.contact_type === 'PARTENAIRE').length;

    return { total, prospectsCount, clientsCount, partenairesCount };
  }, [contacts]);

  // Filtrage
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return contacts.filter((row) => {
      const matchTab =
        (activeTab === 'PROSPECTS' && row.contact_type === 'PROSPECT') ||
        (activeTab === 'CLIENTS' && row.contact_type === 'CLIENT') ||
        (activeTab === 'PARTENAIRES' && row.contact_type === 'PARTENAIRE');
      const matchSector = sectorFilter === 'Tous les secteurs' || row.sector === sectorFilter;
      const matchQuery =
        !query ||
        row.name.toLowerCase().includes(query) ||
        row.company.toLowerCase().includes(query) ||
        row.sector.toLowerCase().includes(query) ||
        row.phone.toLowerCase().includes(query) ||
        (row.assigned_to_name && row.assigned_to_name.toLowerCase().includes(query));

      return matchTab && matchSector && matchQuery;
    });
  }, [contacts, activeTab, sectorFilter, search]);

  function openAddModal(type: NewContactType) {
    setEditTarget(null);
    setFormError(null);
    setNewType(type);
    setNewName('');
    setNewCompany('');
    setNewSector(SECTORS[0]);
    setNewPhone('');
    setNewEmail('');
    setNewSource(SOURCES[0]);
    setNewNotes('');
    setIsTypeMenuOpen(false);
    setIsAddOpen(true);
  }

  function openEditModal(row: Contact) {
    setEditTarget(row);
    setFormError(null);
    setNewType(row.contact_type as NewContactType);
    setNewName(row.name);
    setNewCompany(row.company);
    setNewSector(row.sector || SECTORS[0]);
    setNewPhone(row.phone);
    setNewEmail(row.email);
    setNewSource(row.source || SOURCES[0]);
    setNewNotes(row.notes ?? '');
    setIsAddOpen(true);
  }

  async function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newName.trim() || !newCompany.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editTarget) {
        const updated = await updateContact(editTarget.id, {
          name: newName.trim(),
          company: newCompany.trim(),
          sector: newSector,
          phone: newPhone.trim(),
          email: newEmail.trim(),
          notes: newNotes.trim(),
          ...(editTarget.contact_type === 'PROSPECT' ? { source: newSource } : {}),
        });
        setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        const created = await createContact({
          contact_type: newType,
          entity_type: 'PME',
          name: newName.trim(),
          company: newCompany.trim(),
          sector: newSector,
          email: newEmail.trim(),
          phone: newPhone.trim(),
          address: '',
          source: newType === 'PROSPECT' ? newSource : '',
          notes: newNotes.trim(),
        });
        setContacts((prev) => [created, ...prev]);
      }
      setEditTarget(null);
      setIsAddOpen(false);
    } catch {
      setFormError('Une erreur est survenue. Vérifiez les champs et réessayez.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function openTransferModal(row: Contact) {
    setTransferTarget(row);
    setTransferTo(row.assigned_to ?? directory[0]?.id ?? null);
  }

  async function handleTransferSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!transferTarget || transferTo === null || isTransferring) return;
    setIsTransferring(true);
    try {
      const updated = await transferContact(transferTarget.id, transferTo);
      setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setTransferTarget(null);
    } finally {
      setIsTransferring(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-12 max-w-[1480px] mx-auto text-slate-800 animate-fadeIn">
      {/* ==================================================================== */}
      {/* EN-TÊTE DE LA PAGE                                                   */}
      {/* ==================================================================== */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-headline-md text-xl font-extrabold text-slate-900 tracking-tight">
            Répertoire des Contacts
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Vue consolidée des relations d'affaires : prospects qualifiés, comptes clients et partenaires institutionnels.
          </p>
        </div>

        <div className="relative shrink-0">
          <button
            className="flex items-center gap-1.5 bg-primary hover:bg-on-primary-fixed-variant text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs hover:shadow-md active:scale-95 transition-all"
            onClick={() => setIsTypeMenuOpen((prev) => !prev)}
            type="button"
          >
            <span className="material-symbols-outlined text-[17px]">person_add</span>
            Nouveau Contact
            <span className="material-symbols-outlined text-[17px]">{isTypeMenuOpen ? 'expand_less' : 'expand_more'}</span>
          </button>

          {isTypeMenuOpen && (
            <>
              <button
                aria-label="Fermer le menu"
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setIsTypeMenuOpen(false)}
                type="button"
              />
              <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-20 p-1.5 space-y-0.5">
                {(Object.keys(NEW_CONTACT_TYPE_META) as NewContactType[]).map((type) => (
                  <button
                    className="w-full flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-slate-50 text-left transition-colors"
                    key={type}
                    onClick={() => openAddModal(type)}
                    type="button"
                  >
                    <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[17px]">{NEW_CONTACT_TYPE_META[type].icon}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-bold text-slate-900">{NEW_CONTACT_TYPE_META[type].label}</span>
                      <span className="block text-[10px] text-slate-400 leading-snug">{NEW_CONTACT_TYPE_META[type].helper}</span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ==================================================================== */}
      {/* STATISTIQUES ÉPURÉES (4 CARTES SOBRES)                               */}
      {/* ==================================================================== */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Total Contacts</span>
            <span className="material-symbols-outlined text-slate-400 text-[18px]">groups</span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight font-headline-md">{stats.total}</div>
        </div>

        <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/60 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 text-xs font-medium mb-1">
            <span>Prospects en cours</span>
            <span className="material-symbols-outlined text-amber-600 text-[18px]">person_search</span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight font-headline-md">{stats.prospectsCount}</div>
        </div>

        <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/60 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 text-xs font-medium mb-1">
            <span>Comptes Clients</span>
            <span className="material-symbols-outlined text-emerald-600 text-[18px]">apartment</span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight font-headline-md">{stats.clientsCount}</div>
        </div>

        <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-200/60 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 text-xs font-medium mb-1">
            <span>Partenaires</span>
            <span className="material-symbols-outlined text-purple-600 text-[18px]">handshake</span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight font-headline-md">{stats.partenairesCount}</div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* BARRE DE CONTRÔLE : ONGLETS, RECHERCHE ET FILTRE SECTEUR             */}
      {/* ==================================================================== */}
      <section className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs">
        {/* Onglets */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100/80 p-1 rounded-xl">
          {(Object.keys(TAB_META) as Onglet[]).map((tab) => {
            const count = contacts.filter(
              (c) =>
                (tab === 'PROSPECTS' && c.contact_type === 'PROSPECT') ||
                (tab === 'CLIENTS' && c.contact_type === 'CLIENT') ||
                (tab === 'PARTENAIRES' && c.contact_type === 'PARTENAIRE'),
            ).length;

            return (
              <button
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === tab ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                key={tab}
                onClick={() => setActiveTab(tab)}
                type="button"
              >
                <span className="material-symbols-outlined text-[15px]">{TAB_META[tab].icon}</span>
                {TAB_META[tab].label}
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeTab === tab ? 'bg-primary/10 text-primary' : 'bg-slate-200/70 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Recherche et Filtre Secteur */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <select
              aria-label="Filtrer par secteur d'activité"
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 outline-none focus:ring-1 focus:ring-primary cursor-pointer pr-8"
              onChange={(e) => setSectorFilter(e.target.value)}
              value={sectorFilter}
            >
              <option value="Tous les secteurs">Tous les secteurs</option>
              {SECTORS.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </div>

          <div className="relative flex-1 sm:w-64">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
              <span className="material-symbols-outlined text-[16px]">search</span>
            </span>
            <input
              className="w-full bg-slate-50 border border-slate-200 py-1.5 pl-9 pr-3 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white transition-all text-slate-800 placeholder-slate-400"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher contact, entreprise..."
              type="text"
              value={search}
            />
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* TABLEAU DES CONTACTS AVEC DESIGN ÉPURÉ                              */}
      {/* ==================================================================== */}
      <section className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                <th className="px-4 py-3.5">{activeTab === 'PROSPECTS' ? 'Contact' : 'Contact & Entreprise'}</th>
                {activeTab === 'PROSPECTS' && <th className="px-4 py-3.5">Entreprise</th>}
                <th className="px-4 py-3.5">Coordonnées</th>
                <th className="px-4 py-3.5">{activeTab === 'PROSPECTS' ? 'Étape' : 'Secteur'}</th>
                <th className="px-4 py-3.5">Suivi & Affectation</th>
                <th className="px-4 py-3.5 text-right">{activeTab === 'PROSPECTS' ? 'Source' : 'Type'}</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading && (
                <tr>
                  <td className="px-5 py-10 text-center text-slate-400 text-xs" colSpan={activeTab === 'PROSPECTS' ? 7 : 6}>
                    Chargement...
                  </td>
                </tr>
              )}

              {!isLoading &&
                filteredRows.map((row) => (
                  <tr className="hover:bg-slate-50/80 transition-colors" key={row.id}>
                    {/* Contact (Prospects) ou Contact & Entreprise (Clients / Partenaires) */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-[11px] font-bold shrink-0">
                          {getInitials(row.name)}
                        </div>
                        <div className="min-w-0">
                          {activeTab === 'PROSPECTS' ? (
                            <>
                              <p className="font-bold text-slate-900 truncate leading-snug">{row.name}</p>
                              <p className="text-[11px] text-slate-500 truncate">{row.entity_type_display}</p>
                            </>
                          ) : (
                            <>
                              <p className="font-bold text-slate-900 truncate leading-snug">{row.company}</p>
                              <p className="text-[11px] text-slate-500 truncate">{row.name}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Entreprise (Prospects uniquement) */}
                    {activeTab === 'PROSPECTS' && (
                      <td className="px-4 py-3.5 text-slate-700 font-medium truncate">{row.company}</td>
                    )}

                    {/* Coordonnées */}
                    <td className="px-4 py-3.5">
                      <div className="text-[11px]">
                        <p className="font-medium text-slate-800">{row.phone || '—'}</p>
                        <p className="text-slate-400 truncate">{row.email || '—'}</p>
                      </div>
                    </td>

                    {/* Étape (Prospects) ou Secteur (Clients / Partenaires) */}
                    <td className="px-4 py-3.5 text-slate-600 font-medium">
                      {activeTab === 'PROSPECTS' ? (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${STAGE_BADGE_CLASSES[row.stage]}`}>
                          {row.stage_display}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">{row.sector}</span>
                      )}
                    </td>

                    {/* Responsable & Affectation */}
                    <td className="px-4 py-3.5">
                      {row.assigned_to_name ? (
                        <div>
                          <p className="font-semibold text-slate-900 text-[11px]">{row.assigned_to_name}</p>
                          {row.next_followup_at && (
                            <p className="text-[10px] text-amber-600">Relance : {formatShortDate(row.next_followup_at)}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] italic text-slate-400">Non affecté</span>
                      )}
                    </td>

                    {/* Source (Prospects) ou Type (Clients / Partenaires) */}
                    <td className="px-4 py-3.5 text-right font-label-md">
                      {activeTab === 'PROSPECTS' ? (
                        <span className="font-normal text-slate-600 text-[11px]">{row.source || '—'}</span>
                      ) : (
                        <span className="font-bold text-slate-900 text-[11px]">{row.entity_type_display}</span>
                      )}
                      <span className="block text-[10px] text-slate-400">{formatRelativeDate(row.updated_at)}</span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="w-7 h-7 inline-flex items-center justify-center text-blue-600 border border-blue-200 hover:bg-blue-50 rounded-lg transition-colors"
                          onClick={() => setSelectedContact(row)}
                          title="Voir la fiche détaillée"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                        </button>
                        <button
                          className="w-7 h-7 inline-flex items-center justify-center text-amber-600 border border-amber-200 hover:bg-amber-50 rounded-lg transition-colors"
                          onClick={() => openEditModal(row)}
                          title="Modifier le contact"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button
                          className="w-7 h-7 inline-flex items-center justify-center text-primary border border-primary/30 hover:bg-primary/10 rounded-lg transition-colors"
                          onClick={() => openTransferModal(row)}
                          title="Transférer / affecter à un responsable"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px]">move_up</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

              {!isLoading && filteredRows.length === 0 && (
                <tr>
                  <td className="px-5 py-10 text-center text-slate-400 text-xs" colSpan={activeTab === 'PROSPECTS' ? 7 : 6}>
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-slate-300 text-[32px]">folder_off</span>
                      <span>Aucun contact ne correspond aux critères sélectionnés.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* MODAL : NOUVEAU / MODIFIER CONTACT (composant partagé)                */}
      {/* ==================================================================== */}
      <Modal
        footer={
          <>
            <button
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition-colors"
              onClick={() => {
                setIsAddOpen(false);
                setEditTarget(null);
              }}
              type="button"
            >
              Annuler
            </button>
            <button
              className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-on-primary-fixed-variant transition-colors disabled:opacity-50"
              disabled={isSubmitting}
              form="dg-contact-form"
              type="submit"
            >
              {isSubmitting
                ? 'Enregistrement...'
                : editTarget
                  ? 'Enregistrer les modifications'
                  : `Ajouter ${newType === 'PROSPECT' ? 'le prospect' : newType === 'CLIENT' ? 'le client' : 'le partenaire'}`}
            </button>
          </>
        }
        isOpen={isAddOpen}
        maxWidthClassName="max-w-xl"
        onClose={() => {
          setIsAddOpen(false);
          setEditTarget(null);
        }}
        title={editTarget ? `Modifier — ${editTarget.company}` : `Ajouter un ${NEW_CONTACT_TYPE_META[newType].label.toLowerCase()}`}
      >
        <form className="space-y-3" id="dg-contact-form" onSubmit={handleFormSubmit}>
          {newType === 'PROSPECT' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <label className={LABEL_CLASSES} htmlFor="np-name">
                    Nom complet *
                  </label>
                  <div className="relative">
                    <span className={ICON_CLASSES}>person</span>
                    <input
                      className={ICON_INPUT_CLASSES}
                      id="np-name"
                      onChange={(event) => setNewName(event.target.value)}
                      placeholder="Ex : Aminata Souley"
                      required
                      type="text"
                      value={newName}
                    />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <label className={LABEL_CLASSES} htmlFor="np-company">
                    Entreprise *
                  </label>
                  <div className="relative">
                    <span className={ICON_CLASSES}>apartment</span>
                    <input
                      className={ICON_INPUT_CLASSES}
                      id="np-company"
                      onChange={(event) => setNewCompany(event.target.value)}
                      placeholder="Nom de l'organisation"
                      required
                      type="text"
                      value={newCompany}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <label className={LABEL_CLASSES} htmlFor="np-sector">
                    Secteur d'activité
                  </label>
                  <div className="relative">
                    <span className={ICON_CLASSES}>business_center</span>
                    <select
                      className={`${ICON_INPUT_CLASSES} appearance-none`}
                      id="np-sector"
                      onChange={(event) => setNewSector(event.target.value)}
                      value={newSector}
                    >
                      {SECTORS.map((sector) => (
                        <option key={sector} value={sector}>
                          {sector}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <label className={LABEL_CLASSES} htmlFor="np-phone">
                    Téléphone
                  </label>
                  <div className="relative">
                    <span className={ICON_CLASSES}>call</span>
                    <input
                      className={ICON_INPUT_CLASSES}
                      id="np-phone"
                      onChange={(event) => setNewPhone(event.target.value)}
                      placeholder="+227 90 00 00 00"
                      type="text"
                      value={newPhone}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <label className={LABEL_CLASSES} htmlFor="np-email">
                    Email
                  </label>
                  <div className="relative">
                    <span className={ICON_CLASSES}>mail</span>
                    <input
                      className={ICON_INPUT_CLASSES}
                      id="np-email"
                      onChange={(event) => setNewEmail(event.target.value)}
                      placeholder="prenom.nom@exemple.com"
                      type="email"
                      value={newEmail}
                    />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <label className={LABEL_CLASSES} htmlFor="np-source">
                    Source du lead
                  </label>
                  <div className="relative">
                    <span className={ICON_CLASSES}>travel_explore</span>
                    <select
                      className={`${ICON_INPUT_CLASSES} appearance-none`}
                      id="np-source"
                      onChange={(event) => setNewSource(event.target.value)}
                      value={newSource}
                    >
                      {SOURCES.map((src) => (
                        <option key={src} value={src}>
                          {src}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <label className={LABEL_CLASSES} htmlFor="np-company">
                    Entreprise *
                  </label>
                  <div className="relative">
                    <span className={ICON_CLASSES}>apartment</span>
                    <input
                      className={ICON_INPUT_CLASSES}
                      id="np-company"
                      onChange={(event) => setNewCompany(event.target.value)}
                      placeholder="Nom entreprise"
                      required
                      type="text"
                      value={newCompany}
                    />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <label className={LABEL_CLASSES} htmlFor="np-sector">
                    Secteur d'activité
                  </label>
                  <div className="relative">
                    <span className={ICON_CLASSES}>business_center</span>
                    <select
                      className={`${ICON_INPUT_CLASSES} appearance-none`}
                      id="np-sector"
                      onChange={(event) => setNewSector(event.target.value)}
                      value={newSector}
                    >
                      {SECTORS.map((sector) => (
                        <option key={sector} value={sector}>
                          {sector}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <label className={LABEL_CLASSES} htmlFor="np-name">
                    Interlocuteur *
                  </label>
                  <div className="relative">
                    <span className={ICON_CLASSES}>person</span>
                    <input
                      className={ICON_INPUT_CLASSES}
                      id="np-name"
                      onChange={(event) => setNewName(event.target.value)}
                      placeholder="Nom complet"
                      required
                      type="text"
                      value={newName}
                    />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <label className={LABEL_CLASSES} htmlFor="np-phone">
                    Téléphone
                  </label>
                  <div className="relative">
                    <span className={ICON_CLASSES}>call</span>
                    <input
                      className={ICON_INPUT_CLASSES}
                      id="np-phone"
                      onChange={(event) => setNewPhone(event.target.value)}
                      placeholder="+227 -- -- -- --"
                      type="text"
                      value={newPhone}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-0.5">
                <label className={LABEL_CLASSES} htmlFor="np-email">
                  Email
                </label>
                <div className="relative">
                  <span className={ICON_CLASSES}>mail</span>
                  <input
                    className={ICON_INPUT_CLASSES}
                    id="np-email"
                    onChange={(event) => setNewEmail(event.target.value)}
                    placeholder="email@domaine.ne"
                    type="email"
                    value={newEmail}
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-0.5">
            <label className={LABEL_CLASSES} htmlFor="np-notes">
              Notes
            </label>
            <textarea
              className="w-full px-3 py-2 bg-white border border-outline-variant rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none transition-all resize-none"
              id="np-notes"
              onChange={(event) => setNewNotes(event.target.value)}
              placeholder="Contexte, besoins exprimés..."
              rows={2}
              value={newNotes}
            />
          </div>

          {formError && <p className="text-xs text-rose-600 font-semibold">{formError}</p>}
        </form>
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL : AFFECTATION / TRANSFERT DE PROSPECT                          */}
      {/* ==================================================================== */}
      <Modal
        footer={
          <>
            <button
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition-colors"
              onClick={() => setTransferTarget(null)}
              type="button"
            >
              Annuler
            </button>
            <button
              className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-on-primary-fixed-variant transition-colors disabled:opacity-50"
              disabled={isTransferring}
              form="dg-transfer-form"
              type="submit"
            >
              {isTransferring ? 'Enregistrement...' : 'Confirmer'}
            </button>
          </>
        }
        isOpen={!!transferTarget}
        maxWidthClassName="max-w-sm"
        onClose={() => setTransferTarget(null)}
        title={transferTarget ? `Affecter — ${transferTarget.company}` : 'Affectation'}
      >
        <form className="space-y-3" id="dg-transfer-form" onSubmit={handleTransferSubmit}>
          <div className="space-y-1">
            <label className={LABEL_CLASSES} htmlFor="transfer-to">
              Déléguer à un responsable / commercial
            </label>
            <select
              className={COMPACT_INPUT_CLASSES}
              id="transfer-to"
              onChange={(event) => setTransferTo(Number(event.target.value))}
              value={transferTo ?? ''}
            >
              {directory.map((member) => (
                <option key={member.id} value={member.id}>
                  {`${member.first_name} ${member.last_name}`.trim() || member.email}
                  {member.role_display ? ` — ${member.role_display}` : ''}
                </option>
              ))}
            </select>
          </div>
        </form>
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL : VOLET FICHE CONTACT RAPIDE                                   */}
      {/* ==================================================================== */}
      {selectedContact && (
        <Modal
          footer={
            <button
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
              onClick={() => setSelectedContact(null)}
              type="button"
            >
              Fermer
            </button>
          }
          isOpen={!!selectedContact}
          maxWidthClassName="max-w-md"
          onClose={() => setSelectedContact(null)}
          title={`Fiche Contact — ${selectedContact.company}`}
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0">
                {getInitials(selectedContact.name)}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{selectedContact.company}</h4>
                <p className="text-slate-500">{selectedContact.name}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-slate-600">
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Secteur</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">{selectedContact.sector || '—'}</span>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">
                  {selectedContact.contact_type === 'PROSPECT' ? 'Étape' : 'Type'}
                </span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {selectedContact.contact_type === 'PROSPECT' ? selectedContact.stage_display : selectedContact.entity_type_display}
                </span>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Téléphone</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">{selectedContact.phone || '—'}</span>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Email</span>
                <span className="font-semibold text-slate-800 mt-0.5 block truncate">{selectedContact.email || '—'}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Responsable du compte</span>
                <span className="font-bold text-slate-900 mt-0.5 block">
                  {selectedContact.assigned_to_name || 'Non affecté'}
                </span>
              </div>
              {selectedContact.next_followup_at && (
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Prochaine relance</span>
                  <span className="font-bold text-primary font-label-md mt-0.5 block">
                    {formatShortDate(selectedContact.next_followup_at)}
                  </span>
                </div>
              )}
            </div>

            {selectedContact.notes && (
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Notes</span>
                <p className="text-slate-700">{selectedContact.notes}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
