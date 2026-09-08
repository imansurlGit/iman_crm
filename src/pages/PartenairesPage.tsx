// Répertoire des partenaires — branché sur les vraies données (`Contact`
// avec contact_type=PARTENAIRE) et croisé avec les vrais dossiers de
// partenariat (`PartnershipDossier`, voir PartenariatDossiersContext) pour
// afficher le dossier en cours de chaque partenaire.

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/ui/Modal';
import { ICON_CLASSES, LABEL_CLASSES } from '../components/ui/formStyles';
import {
  createContact,
  listContacts,
  updateContact,
  SECTORS,
  type Contact,
} from '../services/contactService';
import { usePartenariatDossiers } from '../context/PartenariatDossiersContext';
import { STEP_DEFINITIONS, stepIndex } from '../data/partenariatDossiers';

type StatusFilter = 'ALL' | 'AVEC_DOSSIER' | 'SANS_DOSSIER';

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Tous les partenaires' },
  { value: 'AVEC_DOSSIER', label: 'Avec dossier actif' },
  { value: 'SANS_DOSSIER', label: 'Sans dossier actif' },
];

const ICON_INPUT_CLASSES =
  'w-full pl-10 pr-3 py-2 bg-white border border-outline-variant rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none transition-all';

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function PartenairesPage() {
  const navigate = useNavigate();
  const { dossiers } = usePartenariatDossiers();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('Tous les secteurs');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Contact | null>(null);
  const [company, setCompany] = useState('');
  const [name, setName] = useState('');
  const [sector, setSector] = useState(SECTORS[0]);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    listContacts('PARTENAIRE')
      .then(setContacts)
      .finally(() => setIsLoading(false));
  }, []);

  const rows = useMemo(
    () =>
      contacts.map((contact) => {
        const contactDossiers = dossiers.filter((d) => d.partenaire === contact.id);
        const activeDossier = contactDossiers.find((d) => d.current_step !== 'CLOTURE') ?? null;
        return { contact, dossiersCount: contactDossiers.length, activeDossier };
      }),
    [contacts, dossiers],
  );

  const kpis = useMemo(() => {
    const total = rows.length;
    const withActive = rows.filter((r) => r.activeDossier).length;
    const closedDossiers = dossiers.filter(
      (d) => d.current_step === 'CLOTURE' && contacts.some((c) => c.id === d.partenaire),
    ).length;
    return { total, withActive, withoutActive: total - withActive, closedDossiers };
  }, [rows, dossiers, contacts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(({ contact, activeDossier }) => {
      const matchQuery =
        !q ||
        contact.company.toLowerCase().includes(q) ||
        contact.name.toLowerCase().includes(q) ||
        contact.sector.toLowerCase().includes(q);
      const matchSector = sectorFilter === 'Tous les secteurs' || contact.sector === sectorFilter;
      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'AVEC_DOSSIER' && activeDossier) ||
        (statusFilter === 'SANS_DOSSIER' && !activeDossier);
      return matchQuery && matchSector && matchStatus;
    });
  }, [rows, search, sectorFilter, statusFilter]);

  function openCreateModal() {
    setEditTarget(null);
    setFormError(null);
    setCompany('');
    setName('');
    setSector(SECTORS[0]);
    setPhone('');
    setEmail('');
    setNotes('');
    setIsModalOpen(true);
  }

  function openEditModal(contact: Contact) {
    setEditTarget(contact);
    setFormError(null);
    setCompany(contact.company);
    setName(contact.name);
    setSector(contact.sector || SECTORS[0]);
    setPhone(contact.phone);
    setEmail(contact.email);
    setNotes(contact.notes ?? '');
    setIsModalOpen(true);
  }

  async function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!company.trim() || !name.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editTarget) {
        const updated = await updateContact(editTarget.id, {
          company: company.trim(),
          name: name.trim(),
          sector,
          phone: phone.trim(),
          email: email.trim(),
          notes: notes.trim(),
        });
        setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        const created = await createContact({
          contact_type: 'PARTENAIRE',
          entity_type: 'PME',
          name: name.trim(),
          company: company.trim(),
          sector,
          email: email.trim(),
          phone: phone.trim(),
          address: '',
          source: '',
          notes: notes.trim(),
        });
        setContacts((prev) => [created, ...prev]);
      }
      setIsModalOpen(false);
      setEditTarget(null);
    } catch {
      setFormError('Une erreur est survenue. Vérifiez les champs et réessayez.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-[1480px] mx-auto space-y-5 pb-16 text-slate-800 animate-fadeIn">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">handshake</span>
          </div>
          <div className="min-w-0">
            <h2 className="font-headline-md text-xl font-extrabold text-slate-900 tracking-tight">Répertoire des partenaires</h2>
            <p className="text-slate-500 text-xs mt-0.5">
              Vue consolidée de tous les partenaires — du premier contact aux dossiers en cours.
            </p>
          </div>
        </div>
        <button
          className="flex items-center gap-1.5 bg-primary text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs hover:bg-on-primary-fixed-variant active:scale-95 transition-all shrink-0"
          onClick={openCreateModal}
          type="button"
        >
          <span className="material-symbols-outlined text-[17px]">person_add</span>
          Nouveau partenaire
        </button>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Total partenaires</span>
            <span className="material-symbols-outlined text-slate-400 text-[18px]">groups</span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight font-headline-md">{kpis.total}</div>
        </div>
        <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/60 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 text-xs font-medium mb-1">
            <span>Avec dossier actif</span>
            <span className="material-symbols-outlined text-emerald-600 text-[18px]">folder_shared</span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight font-headline-md">{kpis.withActive}</div>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Sans dossier actif</span>
            <span className="material-symbols-outlined text-slate-400 text-[18px]">person_search</span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight font-headline-md">{kpis.withoutActive}</div>
        </div>
        <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-200/60 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 text-xs font-medium mb-1">
            <span>Dossiers clôturés</span>
            <span className="material-symbols-outlined text-purple-600 text-[18px]">task_alt</span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight font-headline-md">{kpis.closedDossiers}</div>
        </div>
      </section>

      {/* Barre de contrôle */}
      <section className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex flex-wrap items-center gap-1 bg-slate-100/80 p-1 rounded-xl">
          {STATUS_FILTERS.map((f) => (
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === f.value ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              type="button"
            >
              {f.label}
            </button>
          ))}
        </div>

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
              placeholder="Rechercher un partenaire..."
              type="text"
              value={search}
            />
          </div>
        </div>
      </section>

      {/* Tableau */}
      <section className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                <th className="px-4 py-3.5">Partenaire</th>
                <th className="px-4 py-3.5">Coordonnées</th>
                <th className="px-4 py-3.5">Secteur</th>
                <th className="px-4 py-3.5">Dossier en cours</th>
                <th className="px-4 py-3.5 text-right">Dossiers</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading && (
                <tr>
                  <td className="px-5 py-10 text-center text-slate-400 text-xs" colSpan={6}>
                    Chargement...
                  </td>
                </tr>
              )}

              {!isLoading &&
                filtered.map(({ contact, dossiersCount, activeDossier }) => (
                  <tr
                    className="group cursor-pointer hover:bg-slate-50/80 transition-colors"
                    key={contact.id}
                    onClick={() => navigate(`/partenaires/${contact.id}`)}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-[11px] font-bold shrink-0">
                          {getInitials(contact.company || contact.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate leading-snug group-hover:text-primary transition-colors">
                            {contact.company}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">{contact.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-[11px]">
                        <p className="font-medium text-slate-800">{contact.phone || '—'}</p>
                        <p className="text-slate-400 truncate">{contact.email || '—'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">{contact.sector || '—'}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      {activeDossier ? (
                        <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-2.5 py-1">
                          <span className="material-symbols-outlined text-[13px] text-primary">
                            {STEP_DEFINITIONS[stepIndex(activeDossier.current_step)].icon}
                          </span>
                          <span className="text-[11px] font-semibold text-primary">
                            {STEP_DEFINITIONS[stepIndex(activeDossier.current_step)].shortLabel}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] italic text-slate-400">Aucun dossier actif</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-slate-900 text-[11px]">{dossiersCount}</td>
                    <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="w-7 h-7 inline-flex items-center justify-center text-blue-600 border border-blue-200 hover:bg-blue-50 rounded-lg transition-colors"
                          onClick={() => navigate(`/partenaires/${contact.id}`)}
                          title="Voir la fiche détaillée"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                        </button>
                        <button
                          className="w-7 h-7 inline-flex items-center justify-center text-amber-600 border border-amber-200 hover:bg-amber-50 rounded-lg transition-colors"
                          onClick={() => openEditModal(contact)}
                          title="Modifier le partenaire"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td className="px-5 py-10 text-center text-slate-400 text-xs" colSpan={6}>
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-slate-300 text-[32px]">search_off</span>
                      <span>Aucun partenaire ne correspond aux critères sélectionnés.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal : nouveau / modifier partenaire */}
      <Modal
        footer={
          <>
            <button
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition-colors"
              onClick={() => {
                setIsModalOpen(false);
                setEditTarget(null);
              }}
              type="button"
            >
              Annuler
            </button>
            <button
              className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-on-primary-fixed-variant transition-colors disabled:opacity-50"
              disabled={isSubmitting}
              form="partenaire-form"
              type="submit"
            >
              {isSubmitting ? 'Enregistrement...' : editTarget ? 'Enregistrer les modifications' : 'Ajouter le partenaire'}
            </button>
          </>
        }
        isOpen={isModalOpen}
        maxWidthClassName="max-w-xl"
        onClose={() => {
          setIsModalOpen(false);
          setEditTarget(null);
        }}
        title={editTarget ? `Modifier — ${editTarget.company}` : 'Ajouter un partenaire'}
      >
        <form className="space-y-3" id="partenaire-form" onSubmit={handleFormSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <label className={LABEL_CLASSES} htmlFor="pp-company">
                Entreprise *
              </label>
              <div className="relative">
                <span className={ICON_CLASSES}>apartment</span>
                <input
                  className={ICON_INPUT_CLASSES}
                  id="pp-company"
                  onChange={(event) => setCompany(event.target.value)}
                  placeholder="Nom de l'organisation"
                  required
                  type="text"
                  value={company}
                />
              </div>
            </div>
            <div className="space-y-0.5">
              <label className={LABEL_CLASSES} htmlFor="pp-sector">
                Secteur d'activité
              </label>
              <div className="relative">
                <span className={ICON_CLASSES}>business_center</span>
                <select
                  className={`${ICON_INPUT_CLASSES} appearance-none`}
                  id="pp-sector"
                  onChange={(event) => setSector(event.target.value)}
                  value={sector}
                >
                  {SECTORS.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <label className={LABEL_CLASSES} htmlFor="pp-name">
                Interlocuteur *
              </label>
              <div className="relative">
                <span className={ICON_CLASSES}>person</span>
                <input
                  className={ICON_INPUT_CLASSES}
                  id="pp-name"
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nom complet"
                  required
                  type="text"
                  value={name}
                />
              </div>
            </div>
            <div className="space-y-0.5">
              <label className={LABEL_CLASSES} htmlFor="pp-phone">
                Téléphone
              </label>
              <div className="relative">
                <span className={ICON_CLASSES}>call</span>
                <input
                  className={ICON_INPUT_CLASSES}
                  id="pp-phone"
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+227 -- -- -- --"
                  type="text"
                  value={phone}
                />
              </div>
            </div>
          </div>

          <div className="space-y-0.5">
            <label className={LABEL_CLASSES} htmlFor="pp-email">
              Email
            </label>
            <div className="relative">
              <span className={ICON_CLASSES}>mail</span>
              <input
                className={ICON_INPUT_CLASSES}
                id="pp-email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="email@domaine.ne"
                type="email"
                value={email}
              />
            </div>
          </div>

          <div className="space-y-0.5">
            <label className={LABEL_CLASSES} htmlFor="pp-notes">
              Notes
            </label>
            <textarea
              className="w-full px-3 py-2 bg-white border border-outline-variant rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none transition-all resize-none"
              id="pp-notes"
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Contexte, historique de la relation..."
              rows={2}
              value={notes}
            />
          </div>

          {formError && <p className="text-xs text-rose-600 font-semibold">{formError}</p>}
        </form>
      </Modal>
    </div>
  );
}
