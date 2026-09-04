import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartenariatDossiers } from '../context/PartenariatDossiersContext';
import {
  createContact,
  listContacts,
  ENTITY_TYPE_OPTIONS,
  SECTORS,
  SOURCES,
  type Contact,
  type EntityType,
} from '../services/contactService';
import { ICON_CLASSES, INPUT_CLASSES, LABEL_CLASSES } from '../components/ui/formStyles';

const COMPACT_INPUT_CLASSES = INPUT_CLASSES.replace('py-2.5', 'py-2');

export default function NouveauDossierPartenariatPage() {
  const navigate = useNavigate();
  const { addDossier } = usePartenariatDossiers();

  const [partenaires, setPartenaires] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Partenaire : on tape, on choisit un partenaire existant (nouvelle affaire
  // pour lui) ou on le crée à la volée — le dossier et son événement se
  // créent dans la foulée, comme un prospect + une opportunité en une fois.
  const [partenaireQuery, setPartenaireQuery] = useState('');
  const [isPartenaireMenuOpen, setIsPartenaireMenuOpen] = useState(false);
  const partenaireMenuRef = useRef<HTMLDivElement>(null);
  const [selectedPartenaireId, setSelectedPartenaireId] = useState<number | null>(null);
  const [isCreatingPartenaire, setIsCreatingPartenaire] = useState(false);

  const [entityType, setEntityType] = useState<EntityType>('PME');
  const [company, setCompany] = useState('');
  const [sector, setSector] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');

  const [evenement, setEvenement] = useState('');
  const [evenementDebut, setEvenementDebut] = useState('');
  const [evenementFin, setEvenementFin] = useState('');
  const [montant, setMontant] = useState('');
  const [requiresPayment, setRequiresPayment] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    listContacts('PARTENAIRE')
      .then(setPartenaires)
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!isPartenaireMenuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (partenaireMenuRef.current && !partenaireMenuRef.current.contains(event.target as Node)) {
        setIsPartenaireMenuOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsPartenaireMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isPartenaireMenuOpen]);

  const partenaireMatches = useMemo(() => {
    const query = partenaireQuery.trim().toLowerCase();
    if (!query) return partenaires;
    return partenaires.filter((p) => (p.company || p.name).toLowerCase().includes(query));
  }, [partenaires, partenaireQuery]);

  const exactMatchExists = partenaires.some(
    (p) => (p.company || p.name).toLowerCase() === partenaireQuery.trim().toLowerCase(),
  );

  const selectedPartenaire = useMemo(
    () => partenaires.find((p) => p.id === selectedPartenaireId) ?? null,
    [partenaires, selectedPartenaireId],
  );

  const isOrganization = entityType !== 'PARTICULIER';

  function selectExistingPartenaire(contact: Contact) {
    setSelectedPartenaireId(contact.id);
    setIsCreatingPartenaire(false);
    setPartenaireQuery(contact.company || contact.name);
    setIsPartenaireMenuOpen(false);
  }

  function chooseCreatePartenaire() {
    setSelectedPartenaireId(null);
    setIsCreatingPartenaire(true);
    setIsPartenaireMenuOpen(false);
  }

  function handlePartenaireQueryChange(value: string) {
    setPartenaireQuery(value);
    setSelectedPartenaireId(null);
    setIsCreatingPartenaire(false);
    setIsPartenaireMenuOpen(true);
  }

  const canSubmit =
    (!!selectedPartenaireId || (isCreatingPartenaire && !!email.trim() && !!phone.trim())) &&
    partenaireQuery.trim().length > 0 &&
    evenement.trim().length > 0 &&
    evenementDebut.length > 0 &&
    evenementFin.length > 0 &&
    evenementFin >= evenementDebut &&
    montant.trim().length > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || isSubmitting) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      let partenaireId = selectedPartenaireId;
      if (isCreatingPartenaire) {
        const created = await createContact({
          contact_type: 'PARTENAIRE',
          entity_type: entityType,
          name: partenaireQuery.trim(),
          company: isOrganization ? company.trim() || partenaireQuery.trim() : '',
          sector: isOrganization ? sector : '',
          email: email.trim(),
          phone: phone.trim(),
          address: address.trim(),
          source,
          notes: notes.trim(),
        });
        partenaireId = created.id;
      }
      if (!partenaireId) return;
      const dossier = await addDossier({
        partenaire: partenaireId,
        evenement: evenement.trim(),
        evenement_debut: evenementDebut,
        evenement_fin: evenementFin,
        montant,
        requires_payment: requiresPayment,
      });
      navigate(`/partenariats/dossiers/${dossier.id}`);
    } catch {
      setSubmitError('Impossible de créer ce dossier pour l’instant. Vérifiez les champs et réessayez.');
    } finally {
      setIsSubmitting(false);
    }
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
            onClick={() => navigate('/partenariats/dossiers')}
            type="button"
          >
            Dossiers de partenariat
          </button>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-on-surface">Nouveau</span>
        </nav>
        <h2 className="font-headline-md text-headline-md text-on-surface">Nouveau dossier partenariat</h2>
        <p className="text-secondary mt-1 text-sm">
          Le partenaire et son événement se créent ensemble — comme pour une nouvelle opportunité.
        </p>
      </div>

      <form className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Colonne gauche — le partenaire */}
          <div className="flex flex-col gap-4">
            <p className="font-label-md text-label-md text-primary uppercase tracking-wide">1. Le partenaire</p>

            <div className="space-y-1 relative" ref={partenaireMenuRef}>
              <label className={LABEL_CLASSES} htmlFor="partenaire">
                Contact partenaire
              </label>
              <input
                autoComplete="off"
                className={COMPACT_INPUT_CLASSES.replace('pl-10', 'pl-3')}
                id="partenaire"
                onChange={(event) => handlePartenaireQueryChange(event.target.value)}
                onFocus={() => setIsPartenaireMenuOpen(true)}
                placeholder="Taper le nom du partenaire..."
                type="text"
                value={partenaireQuery}
              />
              {selectedPartenaire && (
                <p className="text-[11px] text-emerald-700 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  Partenaire existant — nouvelle affaire pour {selectedPartenaire.company || selectedPartenaire.name}.
                </p>
              )}
              {isCreatingPartenaire && (
                <p className="text-[11px] text-primary flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">person_add</span>
                  Nouveau partenaire — sera créé avec ce dossier.
                </p>
              )}

              {isPartenaireMenuOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 z-20 max-h-52 overflow-y-auto bg-white border border-outline-variant rounded-lg shadow-lg py-1.5">
                  {partenaireMatches.map((contact) => (
                    <button
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors text-left"
                      key={contact.id}
                      onClick={() => selectExistingPartenaire(contact)}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px] text-secondary shrink-0">handshake</span>
                      {contact.company || contact.name}
                    </button>
                  ))}
                  {partenaireQuery.trim() && !exactMatchExists && (
                    <button
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm font-bold text-primary hover:bg-primary-container/10 transition-colors text-left border-t border-outline-variant"
                      onClick={chooseCreatePartenaire}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px] shrink-0">add_circle</span>
                      Créer « {partenaireQuery.trim()} » comme nouveau partenaire
                    </button>
                  )}
                  {partenaireMatches.length === 0 && !partenaireQuery.trim() && (
                    <p className="px-3 py-2 text-xs text-secondary italic">
                      Aucun partenaire pour l'instant — commencez à taper pour en créer un.
                    </p>
                  )}
                </div>
              )}
            </div>

            {isCreatingPartenaire && (
              <div className="flex flex-col gap-3 p-3 rounded-lg border border-outline-variant/60 bg-surface-container-low/40">
                <div className="space-y-1">
                  <label className={LABEL_CLASSES} htmlFor="entity_type">
                    Type de partenaire
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

                {isOrganization && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className={LABEL_CLASSES} htmlFor="company">
                        {entityType === 'INSTITUTION' ? 'Institution' : 'Entreprise'}
                      </label>
                      <div className="relative">
                        <span className={ICON_CLASSES}>apartment</span>
                        <input
                          className={COMPACT_INPUT_CLASSES}
                          id="company"
                          onChange={(event) => setCompany(event.target.value)}
                          placeholder="Nom de l'organisation"
                          type="text"
                          value={company}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className={LABEL_CLASSES} htmlFor="sector">
                        Secteur d'activité
                      </label>
                      <div className="relative">
                        <span className={ICON_CLASSES}>business_center</span>
                        <select
                          className={`${COMPACT_INPUT_CLASSES} appearance-none`}
                          id="sector"
                          onChange={(event) => setSector(event.target.value)}
                          value={sector}
                        >
                          <option value="" disabled>
                            Choisir...
                          </option>
                          {SECTORS.map((option) => (
                            <option key={option} value={option}>
                              {option}
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
                  <div className="space-y-1">
                    <label className={LABEL_CLASSES} htmlFor="email">
                      Email
                    </label>
                    <div className="relative">
                      <span className={ICON_CLASSES}>mail</span>
                      <input
                        className={COMPACT_INPUT_CLASSES}
                        id="email"
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="prenom.nom@exemple.com"
                        required
                        type="email"
                        value={email}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className={LABEL_CLASSES} htmlFor="phone">
                      Téléphone
                    </label>
                    <div className="relative">
                      <span className={ICON_CLASSES}>call</span>
                      <input
                        className={COMPACT_INPUT_CLASSES}
                        id="phone"
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="+227 90 00 00 00"
                        required
                        type="tel"
                        value={phone}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className={LABEL_CLASSES} htmlFor="address">
                      Adresse
                    </label>
                    <div className="relative">
                      <span className={ICON_CLASSES}>location_on</span>
                      <input
                        className={COMPACT_INPUT_CLASSES}
                        id="address"
                        onChange={(event) => setAddress(event.target.value)}
                        placeholder="Quartier, ville"
                        type="text"
                        value={address}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className={LABEL_CLASSES} htmlFor="source">
                      Source
                    </label>
                    <div className="relative">
                      <span className={ICON_CLASSES}>travel_explore</span>
                      <select
                        className={`${COMPACT_INPUT_CLASSES} appearance-none`}
                        id="source"
                        onChange={(event) => setSource(event.target.value)}
                        value={source}
                      >
                        <option value="" disabled>
                          Choisir...
                        </option>
                        {SOURCES.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-[20px] pointer-events-none">
                        expand_more
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className={LABEL_CLASSES} htmlFor="notes">
                    Notes
                  </label>
                  <textarea
                    className="w-full px-3 py-2 bg-white border border-outline-variant rounded focus:ring-1 focus:ring-primary-container focus:border-on-primary-fixed-variant input-transition font-body-md outline-none resize-none"
                    id="notes"
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Contexte, comment ce partenaire a été approché..."
                    rows={2}
                    value={notes}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Colonne droite — l'événement / le partenariat */}
          <div className="flex flex-col gap-4 lg:border-l lg:border-outline-variant lg:pl-8">
            <p className="font-label-md text-label-md text-primary uppercase tracking-wide">2. L'événement</p>

            <div className="space-y-1">
              <label className={LABEL_CLASSES} htmlFor="evenement">
                Nom de l'événement
              </label>
              <div className="relative">
                <span className={ICON_CLASSES}>event</span>
                <input
                  className={COMPACT_INPUT_CLASSES}
                  id="evenement"
                  onChange={(event) => setEvenement(event.target.value)}
                  placeholder="Ex : Foire Internationale de Niamey 2026"
                  type="text"
                  value={evenement}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={LABEL_CLASSES} htmlFor="evenement-debut">
                  Début de l'événement
                </label>
                <div className="relative">
                  <span className={ICON_CLASSES}>calendar_today</span>
                  <input
                    className={COMPACT_INPUT_CLASSES}
                    id="evenement-debut"
                    onChange={(event) => {
                      setEvenementDebut(event.target.value);
                      if (evenementFin && evenementFin < event.target.value) setEvenementFin(event.target.value);
                    }}
                    type="date"
                    value={evenementDebut}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className={LABEL_CLASSES} htmlFor="evenement-fin">
                  Fin de l'événement
                </label>
                <div className="relative">
                  <span className={ICON_CLASSES}>event_available</span>
                  <input
                    className={COMPACT_INPUT_CLASSES}
                    id="evenement-fin"
                    min={evenementDebut || undefined}
                    onChange={(event) => setEvenementFin(event.target.value)}
                    type="date"
                    value={evenementFin}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className={LABEL_CLASSES} htmlFor="montant">
                Montant du partenariat (FCFA)
              </label>
              <div className="relative">
                <span className={ICON_CLASSES}>payments</span>
                <input
                  className={COMPACT_INPUT_CLASSES}
                  id="montant"
                  min="1"
                  onChange={(event) => setMontant(event.target.value)}
                  placeholder="Ex : 2000000"
                  type="number"
                  value={montant}
                />
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-sm text-on-surface cursor-pointer">
              <input
                checked={requiresPayment}
                className="w-4 h-4 accent-primary"
                onChange={(event) => setRequiresPayment(event.target.checked)}
                type="checkbox"
              />
              Un paiement initial est requis avant de démarrer ce partenariat
            </label>
          </div>
        </div>

        {submitError && <p className="text-xs text-error font-semibold mt-5">{submitError}</p>}
        <button
          className="w-full flex items-center justify-center gap-1.5 bg-primary text-white py-3 rounded-full text-sm font-bold shadow-sm hover:shadow-md hover:bg-on-primary-fixed-variant active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none mt-6"
          disabled={!canSubmit || isSubmitting}
          type="submit"
        >
          <span className="material-symbols-outlined text-[18px]">handshake</span>
          {isSubmitting ? 'Création en cours...' : 'Créer le dossier'}
        </button>
      </form>
    </div>
  );
}
