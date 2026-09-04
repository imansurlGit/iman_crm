import { useState, type FormEvent } from 'react';
import Modal from './ui/Modal';
import { ICON_CLASSES, INPUT_CLASSES, LABEL_CLASSES } from './ui/formStyles';
import {
  createContact,
  updateContact,
  ENTITY_TYPE_OPTIONS,
  SECTORS,
  SOURCES,
  type Contact,
  type ContactType,
  type EntityType,
} from '../services/contactService';

interface ProspectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** null = mode ajout, sinon contact en cours de modification. */
  contact: Contact | null;
  /** Type créé en mode ajout — sans effet en mode modification. */
  contactType?: ContactType;
}

const COMPACT_INPUT_CLASSES = INPUT_CLASSES.replace('py-2.5', 'py-2');

export default function ProspectFormModal({
  isOpen,
  onClose,
  onSaved,
  contact,
  contactType = 'PROSPECT',
}: ProspectFormModalProps) {
  const [entityType, setEntityType] = useState<EntityType>(contact?.entity_type ?? 'PME');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOrganization = entityType !== 'PARTICULIER';
  const noun = contactType === 'CLIENT' ? 'client' : 'prospect';

  function handleClose() {
    setEntityType(contact?.entity_type ?? 'PME');
    setError(null);
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      entity_type: entityType,
      name: String(formData.get('name') ?? '').trim(),
      company: isOrganization ? String(formData.get('company') ?? '') : '',
      sector: isOrganization ? String(formData.get('sector') ?? '') : '',
      email: String(formData.get('email') ?? ''),
      phone: String(formData.get('phone') ?? ''),
      address: String(formData.get('address') ?? ''),
      source: String(formData.get('source') ?? ''),
      notes: String(formData.get('notes') ?? ''),
    };

    try {
      if (contact) {
        await updateContact(contact.id, payload);
      } else {
        await createContact({ ...payload, contact_type: contactType });
      }
      onSaved();
      handleClose();
    } catch {
      setError(`Impossible d'enregistrer ce ${noun}. Vérifiez les champs saisis.`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      maxWidthClassName="max-w-2xl"
      title={contact ? `Modifier le ${noun}` : `Ajouter un ${noun}`}
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
            disabled={isSubmitting}
            form="prospect-form"
            type="submit"
          >
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </>
      }
    >
      <form className="space-y-3" id="prospect-form" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-0.5">
            <label className={LABEL_CLASSES} htmlFor="entity_type">
              {contactType === 'CLIENT' ? 'Type de client' : 'Type de prospect'}
            </label>
            <div className="relative">
              <span className={ICON_CLASSES}>category</span>
              <select
                className={`${COMPACT_INPUT_CLASSES} appearance-none`}
                id="entity_type"
                onChange={(event) => setEntityType(event.target.value as EntityType)}
                value={entityType}
              >
                {ENTITY_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-[20px] pointer-events-none">
                expand_more
              </span>
            </div>
          </div>

          <div className="space-y-0.5">
            <label className={LABEL_CLASSES} htmlFor="name">
              Nom complet
            </label>
            <div className="relative">
              <span className={ICON_CLASSES}>person</span>
              <input
                className={COMPACT_INPUT_CLASSES}
                defaultValue={contact?.name}
                id="name"
                name="name"
                placeholder="Ex : Aminata Souley"
                required
                type="text"
              />
            </div>
          </div>
        </div>

        {isOrganization && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <label className={LABEL_CLASSES} htmlFor="company">
                {entityType === 'INSTITUTION' ? 'Institution' : 'Entreprise'}
              </label>
              <div className="relative">
                <span className={ICON_CLASSES}>apartment</span>
                <input
                  className={COMPACT_INPUT_CLASSES}
                  defaultValue={contact?.company}
                  id="company"
                  name="company"
                  placeholder="Nom de l'organisation"
                  required
                  type="text"
                />
              </div>
            </div>
            <div className="space-y-0.5">
              <label className={LABEL_CLASSES} htmlFor="sector">
                Secteur d'activité
              </label>
              <div className="relative">
                <span className={ICON_CLASSES}>business_center</span>
                <select
                  className={`${COMPACT_INPUT_CLASSES} appearance-none`}
                  defaultValue={contact?.sector ?? ''}
                  id="sector"
                  name="sector"
                >
                  <option value="" disabled>
                    Choisir...
                  </option>
                  {SECTORS.map((sector) => (
                    <option key={sector} value={sector}>
                      {sector}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-[20px] pointer-events-none">
                  expand_more
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-0.5">
            <label className={LABEL_CLASSES} htmlFor="email">
              Email
            </label>
            <div className="relative">
              <span className={ICON_CLASSES}>mail</span>
              <input
                className={COMPACT_INPUT_CLASSES}
                defaultValue={contact?.email}
                id="email"
                name="email"
                placeholder="prenom.nom@exemple.com"
                required
                type="email"
              />
            </div>
          </div>

          <div className="space-y-0.5">
            <label className={LABEL_CLASSES} htmlFor="phone">
              Téléphone
            </label>
            <div className="relative">
              <span className={ICON_CLASSES}>call</span>
              <input
                className={COMPACT_INPUT_CLASSES}
                defaultValue={contact?.phone}
                id="phone"
                name="phone"
                placeholder="+227 90 00 00 00"
                required
                type="tel"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-0.5">
            <label className={LABEL_CLASSES} htmlFor="address">
              Adresse
            </label>
            <div className="relative">
              <span className={ICON_CLASSES}>location_on</span>
              <input
                className={COMPACT_INPUT_CLASSES}
                defaultValue={contact?.address}
                id="address"
                name="address"
                placeholder="Quartier, ville"
                type="text"
              />
            </div>
          </div>

          <div className="space-y-0.5">
            <label className={LABEL_CLASSES} htmlFor="source">
              Source
            </label>
            <div className="relative">
              <span className={ICON_CLASSES}>travel_explore</span>
              <select
                className={`${COMPACT_INPUT_CLASSES} appearance-none`}
                defaultValue={contact?.source ?? ''}
                id="source"
                name="source"
              >
                <option value="" disabled>
                  Choisir...
                </option>
                {SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-[20px] pointer-events-none">
                expand_more
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-0.5">
          <label className={LABEL_CLASSES} htmlFor="notes">
            Notes
          </label>
          <textarea
            className="w-full px-3 py-2 bg-white border border-outline-variant rounded focus:ring-1 focus:ring-primary-container focus:border-on-primary-fixed-variant input-transition font-body-md outline-none resize-none"
            defaultValue={contact?.notes}
            id="notes"
            name="notes"
            placeholder="Contexte, besoins exprimés..."
            rows={2}
          />
        </div>

        {error && <p className="text-body-sm text-error">{error}</p>}
      </form>
    </Modal>
  );
}
