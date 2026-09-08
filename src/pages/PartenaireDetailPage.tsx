// Fiche partenaire — branchée sur le vrai `Contact` (contact_type=PARTENAIRE)
// et sur ses vrais dossiers de partenariat (`PartnershipDossier`, voir
// PartenariatDossiersContext). Le détail pas-à-pas d'un dossier (les 12
// étapes) vit déjà dans PartenariatDossierDetailPage.tsx — cette page-ci est
// la vue « partenaire » qui liste ses dossiers et permet d'y naviguer.

import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Modal from '../components/ui/Modal';
import { ICON_CLASSES, LABEL_CLASSES } from '../components/ui/formStyles';
import { getContact, updateContact, SECTORS, type Contact } from '../services/contactService';
import { usePartenariatDossiers } from '../context/PartenariatDossiersContext';
import { STEP_DEFINITIONS, stepIndex } from '../data/partenariatDossiers';
import { formatMontant } from '../services/partnershipDossierService';

const CARD_CLASSES = 'bg-white rounded-2xl border border-slate-100 shadow-xs';
const ICON_INPUT_CLASSES =
  'w-full pl-10 pr-3 py-2 bg-white border border-outline-variant rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none transition-all';

function getInitials(value: string) {
  return value
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function PartenaireDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { dossiers } = usePartenariatDossiers();

  const [contact, setContact] = useState<Contact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [company, setCompany] = useState('');
  const [name, setName] = useState('');
  const [sector, setSector] = useState(SECTORS[0]);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const contactId = Number(id);
    if (!contactId) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    getContact(contactId)
      .then(setContact)
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-slate-400 text-xs">
        <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
        Chargement...
      </div>
    );
  }

  if (notFound || !contact) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-slate-500">Ce partenaire est introuvable.</p>
        <button className="text-primary text-sm font-semibold hover:underline" onClick={() => navigate('/partenaires')} type="button">
          Retour aux partenaires
        </button>
      </div>
    );
  }

  const contactDossiers = dossiers
    .filter((d) => d.partenaire === contact.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const activeDossiers = contactDossiers.filter((d) => d.current_step !== 'CLOTURE');
  const closedDossiers = contactDossiers.filter((d) => d.current_step === 'CLOTURE');
  const totalEngage = contactDossiers.reduce((sum, d) => sum + Number(d.montant), 0);

  function openEditModal() {
    setFormError(null);
    setCompany(contact!.company);
    setName(contact!.name);
    setSector(contact!.sector || SECTORS[0]);
    setPhone(contact!.phone);
    setEmail(contact!.email);
    setNotes(contact!.notes ?? '');
    setIsEditOpen(true);
  }

  async function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!company.trim() || !name.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      const updated = await updateContact(contact!.id, {
        company: company.trim(),
        name: name.trim(),
        sector,
        phone: phone.trim(),
        email: email.trim(),
        notes: notes.trim(),
      });
      setContact(updated);
      setIsEditOpen(false);
    } catch {
      setFormError('Une erreur est survenue. Vérifiez les champs et réessayez.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-16 text-slate-800 animate-fadeIn">
      {/* Fil d'Ariane */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500">
        <Link className="hover:text-primary transition-colors" to="/partenaires">
          Partenaires
        </Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-slate-900 font-semibold">{contact.company}</span>
      </nav>

      {/* En-tête identité */}
      <div className={`${CARD_CLASSES} overflow-hidden`}>
        <div className="h-16 bg-[linear-gradient(120deg,#680200_0%,#8a1a0e_100%)]" />
        <div className="px-8 pt-4 pb-6 flex flex-wrap items-start gap-4">
          <div className="w-14 h-14 -mt-10 rounded-xl bg-white text-primary flex items-center justify-center border border-slate-200 shadow-md shrink-0 font-bold text-base">
            {getInitials(contact.company || contact.name)}
          </div>
          <div className="flex-1 min-w-[220px]">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-headline-md text-xl font-bold text-slate-900">{contact.company}</h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                <span className="material-symbols-outlined text-[12px]">handshake</span>
                Partenaire
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{[contact.name, contact.sector].filter(Boolean).join(' · ')}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              className="px-4 py-2 text-xs font-bold border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
              onClick={openEditModal}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px] align-middle mr-1">edit</span>
              Modifier
            </button>
            <button
              className="px-4 py-2 text-xs font-bold bg-primary text-white rounded-xl hover:bg-on-primary-fixed-variant transition-colors"
              onClick={() => navigate('/partenariats/dossiers/nouveau')}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px] align-middle mr-1">add</span>
              Nouveau dossier
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-slate-100 px-8 py-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Partenaire depuis</p>
            <p className="text-sm font-bold text-slate-900 mt-1">{formatDate(contact.created_at)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Dossiers actifs</p>
            <p className="text-sm font-bold text-slate-900 mt-1">{activeDossiers.length}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Dossiers clôturés</p>
            <p className="text-sm font-bold text-slate-900 mt-1">{closedDossiers.length}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Montant total engagé</p>
            <p className="text-sm font-bold text-slate-900 mt-1">{formatMontant(String(totalEngage))}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3.5 items-start">
        {/* Informations générales */}
        <div className={`${CARD_CLASSES} p-5 lg:col-span-2`}>
          <h3 className="font-headline-md text-sm font-bold text-slate-900 mb-4">Informations générales</h3>
          <div className="space-y-3 text-left">
            <div className="flex items-center gap-2.5 text-sm">
              <span className="material-symbols-outlined text-[18px] text-slate-400 shrink-0">call</span>
              <span className="text-slate-800">{contact.phone || '—'}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              <span className="material-symbols-outlined text-[18px] text-slate-400 shrink-0">mail</span>
              <span className="text-slate-800 truncate">{contact.email || '—'}</span>
            </div>
            {contact.sector && (
              <div className="flex items-center gap-2.5 text-sm">
                <span className="material-symbols-outlined text-[18px] text-slate-400 shrink-0">business_center</span>
                <span className="text-slate-800">{contact.sector}</span>
              </div>
            )}
          </div>

          {contact.notes && (
            <div className="mt-5 pt-5 border-t border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Notes</p>
              <p className="text-sm text-slate-700 leading-relaxed">{contact.notes}</p>
            </div>
          )}
        </div>

        {/* Dossiers de partenariat */}
        <div className={`${CARD_CLASSES} p-5 lg:col-span-3`}>
          <h3 className="font-headline-md text-sm font-bold text-slate-900 mb-4">Dossiers de partenariat</h3>
          <div className="space-y-2">
            {contactDossiers.map((dossier) => {
              const index = stepIndex(dossier.current_step);
              return (
                <button
                  className="w-full flex items-center gap-3 px-3.5 py-3 bg-slate-50/80 rounded-xl hover:bg-slate-100 transition-colors text-left"
                  key={dossier.id}
                  onClick={() => navigate(`/partenariats/dossiers/${dossier.id}`)}
                  type="button"
                >
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">{STEP_DEFINITIONS[index].icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {dossier.reference} — {dossier.evenement}
                      </p>
                      {dossier.urgent && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 shrink-0">
                          Urgent
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {STEP_DEFINITIONS[index].label} · {formatMontant(dossier.montant)}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-slate-400 shrink-0">chevron_right</span>
                </button>
              );
            })}
            {contactDossiers.length === 0 && (
              <p className="text-xs text-slate-400">Aucun dossier de partenariat pour ce partenaire pour le moment.</p>
            )}
          </div>
        </div>
      </div>

      {/* Modal : modifier partenaire */}
      <Modal
        footer={
          <>
            <button
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition-colors"
              onClick={() => setIsEditOpen(false)}
              type="button"
            >
              Annuler
            </button>
            <button
              className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-on-primary-fixed-variant transition-colors disabled:opacity-50"
              disabled={isSubmitting}
              form="partenaire-detail-form"
              type="submit"
            >
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </>
        }
        isOpen={isEditOpen}
        maxWidthClassName="max-w-xl"
        onClose={() => setIsEditOpen(false)}
        title={`Modifier — ${contact.company}`}
      >
        <form className="space-y-3" id="partenaire-detail-form" onSubmit={handleFormSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <label className={LABEL_CLASSES} htmlFor="pd-company">
                Entreprise *
              </label>
              <div className="relative">
                <span className={ICON_CLASSES}>apartment</span>
                <input
                  className={ICON_INPUT_CLASSES}
                  id="pd-company"
                  onChange={(event) => setCompany(event.target.value)}
                  required
                  type="text"
                  value={company}
                />
              </div>
            </div>
            <div className="space-y-0.5">
              <label className={LABEL_CLASSES} htmlFor="pd-sector">
                Secteur d'activité
              </label>
              <div className="relative">
                <span className={ICON_CLASSES}>business_center</span>
                <select
                  className={`${ICON_INPUT_CLASSES} appearance-none`}
                  id="pd-sector"
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
              <label className={LABEL_CLASSES} htmlFor="pd-name">
                Interlocuteur *
              </label>
              <div className="relative">
                <span className={ICON_CLASSES}>person</span>
                <input
                  className={ICON_INPUT_CLASSES}
                  id="pd-name"
                  onChange={(event) => setName(event.target.value)}
                  required
                  type="text"
                  value={name}
                />
              </div>
            </div>
            <div className="space-y-0.5">
              <label className={LABEL_CLASSES} htmlFor="pd-phone">
                Téléphone
              </label>
              <div className="relative">
                <span className={ICON_CLASSES}>call</span>
                <input
                  className={ICON_INPUT_CLASSES}
                  id="pd-phone"
                  onChange={(event) => setPhone(event.target.value)}
                  type="text"
                  value={phone}
                />
              </div>
            </div>
          </div>

          <div className="space-y-0.5">
            <label className={LABEL_CLASSES} htmlFor="pd-email">
              Email
            </label>
            <div className="relative">
              <span className={ICON_CLASSES}>mail</span>
              <input
                className={ICON_INPUT_CLASSES}
                id="pd-email"
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                value={email}
              />
            </div>
          </div>

          <div className="space-y-0.5">
            <label className={LABEL_CLASSES} htmlFor="pd-notes">
              Notes
            </label>
            <textarea
              className="w-full px-3 py-2 bg-white border border-outline-variant rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none transition-all resize-none"
              id="pd-notes"
              onChange={(event) => setNotes(event.target.value)}
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
