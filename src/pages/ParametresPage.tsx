import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateCurrentUser, changePassword, listUsers, type CurrentUser } from '../services/userService';
import { LABEL_CLASSES } from '../components/ui/formStyles';

// Rôles autorisés à lister tous les comptes — doit rester cohérent avec
// `core.permissions.CanManageUsers` côté backend (sinon l'appel /users/ échoue).
const USER_MANAGEMENT_ROLES = ['ADMIN', 'ADCH'];

// TODO: aucune notion de présence temps réel côté backend — le statut
// en ligne/hors ligne est déduit de façon statique et déterministe (id de
// l'utilisateur) pour peupler la démo, à remplacer par un vrai suivi de session.
function isOnline(userId: number): boolean {
  return userId % 3 !== 0;
}

// TODO: le journal d'activité reste statique — aucun modèle backend
// n'existe encore pour tracer les connexions/actions du compte.
const ACTIVITY_LOG = [
  { icon: 'login', iconBg: 'bg-primary', label: 'Connexion depuis Niamey, Niger', time: 'Il y a 2 heures' },
  { icon: 'lock_reset', iconBg: 'bg-tertiary-container', label: 'Mot de passe modifié', time: 'Il y a 12 jours' },
  { icon: 'edit', iconBg: 'bg-blue-500', label: 'Profil mis à jour', time: 'Il y a 3 semaines' },
  { icon: 'login', iconBg: 'bg-primary', label: 'Connexion depuis Niamey, Niger', time: 'Il y a 1 mois' },
];

const COMPACT_INPUT_CLASSES =
  'w-full pl-9 pr-3 py-1.5 bg-white border border-outline-variant rounded focus:ring-1 focus:ring-primary-container focus:border-on-primary-fixed-variant input-transition text-sm outline-none';
const COMPACT_ICON_CLASSES =
  'material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[16px]';

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase() || '?';
}

function formatMemberSince(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

export default function ParametresPage() {
  const { user, refreshUser } = useAuth();

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  const [allUsers, setAllUsers] = useState<CurrentUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const canSeeAllUsers = !!user?.role && USER_MANAGEMENT_ROLES.includes(user.role);

  useEffect(() => {
    if (!user) return;
    setFirstName(user.first_name);
    setLastName(user.last_name);
  }, [user]);

  useEffect(() => {
    if (!canSeeAllUsers) return;
    setIsLoadingUsers(true);
    listUsers()
      .then(setAllUsers)
      .catch(() => setAllUsers([]))
      .finally(() => setIsLoadingUsers(false));
  }, [canSeeAllUsers]);

  if (!user) return null;

  async function handlePhotoChange(file: File | null) {
    if (!file) return;
    setPhotoError(null);
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('profile_picture', file);
      await updateCurrentUser(formData);
      await refreshUser();
    } catch {
      setPhotoError('Impossible de mettre à jour la photo.');
    } finally {
      setPreviewUrl(null);
      URL.revokeObjectURL(localUrl);
      setIsUploadingPhoto(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(false);

    const wantsPasswordChange = !!(currentPassword || newPassword || confirmPassword);
    if (wantsPasswordChange) {
      if (!currentPassword) {
        setFormError('Renseignez votre mot de passe actuel pour le modifier.');
        return;
      }
      if (newPassword.length < 8) {
        setFormError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setFormError('Les deux mots de passe ne correspondent pas.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await updateCurrentUser({ first_name: firstName, last_name: lastName });
      if (wantsPasswordChange) {
        await changePassword(currentPassword, newPassword);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
      await refreshUser();
      setFormSuccess(true);
    } catch {
      setFormError(
        'Impossible d’enregistrer les modifications. Vérifiez les champs (mot de passe actuel correct, nouveau mot de passe valide...).',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const avatarSrc = previewUrl ?? user.profile_picture;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="font-headline-md text-headline-md text-on-surface">Paramètres du compte</h2>
        <p className="text-secondary text-sm mt-1">Gérez vos informations personnelles et votre sécurité.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
        {/* Colonne profil */}
        <aside className="lg:col-span-4 lg:sticky lg:top-6 flex flex-col gap-gutter">
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-8 flex flex-col items-center text-center">
            <div className="relative">
              {avatarSrc ? (
                <img
                  alt=""
                  className="w-32 h-32 rounded-full object-cover border-4 border-primary-container shadow-md"
                  src={avatarSrc}
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-tertiary flex items-center justify-center text-white text-4xl font-bold shadow-md">
                  {getInitials(user.first_name, user.last_name)}
                </div>
              )}
              {isUploadingPhoto && (
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-[24px] animate-spin">progress_activity</span>
                </div>
              )}
              <label
                className="absolute bottom-1 right-1 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-md border-2 border-white cursor-pointer hover:bg-on-primary-fixed-variant transition-colors"
                htmlFor="profile_picture"
                title="Changer la photo"
              >
                <span className="material-symbols-outlined text-[18px]">photo_camera</span>
              </label>
              <input
                accept="image/*"
                className="hidden"
                id="profile_picture"
                onChange={(event) => handlePhotoChange(event.target.files?.[0] ?? null)}
                type="file"
              />
            </div>

            {photoError && <p className="text-xs text-error font-medium mt-3">{photoError}</p>}

            <h3 className="text-xl font-bold text-on-surface mt-5">
              {user.first_name} {user.last_name}
            </h3>
            <span className="mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-primary/10 text-primary">
              {user.role_display}
            </span>

            <div className="w-full mt-6 pt-6 border-t border-outline-variant space-y-3 text-left">
              <div className="flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">mail</span>
                <span className="text-on-surface-variant truncate">{user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">calendar_month</span>
                <span className="text-on-surface-variant">Membre depuis {formatMemberSince(user.date_joined)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-6">
            <h3 className="text-sm font-bold text-on-surface mb-4">Journal d'activité</h3>
            <div className="relative space-y-5 before:absolute before:left-[13px] before:top-1 before:bottom-1 before:w-[2px] before:bg-outline-variant/30">
              {ACTIVITY_LOG.map((entry, index) => (
                <div className="relative pl-9" key={index}>
                  <div
                    className={`absolute left-0 top-0 w-7 h-7 ${entry.iconBg} rounded-full flex items-center justify-center border-4 border-white shadow-sm`}
                  >
                    <span className="material-symbols-outlined text-[12px] text-white">{entry.icon}</span>
                  </div>
                  <p className="text-xs font-semibold text-on-surface">{entry.label}</p>
                  <p className="text-[11px] text-secondary">{entry.time}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Colonne formulaire */}
        <div className="lg:col-span-8 flex flex-col gap-gutter">
          <section className="bg-white rounded-xl border border-outline-variant shadow-sm p-8">
            <h3 className="text-base font-bold text-on-surface mb-1">Modifier mes informations</h3>
            <p className="text-sm text-secondary mb-6">
              L'email et la fonction ne peuvent pas être modifiés ici. Laissez les champs de mot de passe vides si
              vous ne souhaitez pas le changer.
            </p>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={LABEL_CLASSES} htmlFor="first_name">
                    Prénom
                  </label>
                  <div className="relative">
                    <span className={COMPACT_ICON_CLASSES}>person</span>
                    <input
                      className={COMPACT_INPUT_CLASSES}
                      id="first_name"
                      onChange={(event) => setFirstName(event.target.value)}
                      required
                      type="text"
                      value={firstName}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className={LABEL_CLASSES} htmlFor="last_name">
                    Nom
                  </label>
                  <div className="relative">
                    <span className={COMPACT_ICON_CLASSES}>badge</span>
                    <input
                      className={COMPACT_INPUT_CLASSES}
                      id="last_name"
                      onChange={(event) => setLastName(event.target.value)}
                      required
                      type="text"
                      value={lastName}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-1 border-t border-outline-variant">
                <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mt-4 mb-3">
                  Mot de passe
                </p>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className={LABEL_CLASSES} htmlFor="current_password">
                      Mot de passe actuel
                    </label>
                    <div className="relative">
                      <span className={COMPACT_ICON_CLASSES}>lock</span>
                      <input
                        className={COMPACT_INPUT_CLASSES}
                        id="current_password"
                        onChange={(event) => setCurrentPassword(event.target.value)}
                        type="password"
                        value={currentPassword}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className={LABEL_CLASSES} htmlFor="new_password">
                        Nouveau mot de passe
                      </label>
                      <div className="relative">
                        <span className={COMPACT_ICON_CLASSES}>lock_reset</span>
                        <input
                          className={COMPACT_INPUT_CLASSES}
                          id="new_password"
                          minLength={8}
                          onChange={(event) => setNewPassword(event.target.value)}
                          type="password"
                          value={newPassword}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className={LABEL_CLASSES} htmlFor="confirm_password">
                        Confirmer
                      </label>
                      <div className="relative">
                        <span className={COMPACT_ICON_CLASSES}>check_circle</span>
                        <input
                          className={COMPACT_INPUT_CLASSES}
                          id="confirm_password"
                          minLength={8}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                          type="password"
                          value={confirmPassword}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {formError && <p className="text-sm text-error font-medium">{formError}</p>}
              {formSuccess && <p className="text-sm text-green-700 font-medium">Modifications enregistrées avec succès.</p>}

              <div className="flex justify-end pt-2">
                <button
                  className="px-5 py-2.5 rounded bg-on-primary-fixed-variant text-white font-body-sm text-body-sm font-bold hover:bg-primary transition-colors disabled:opacity-50"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? 'Enregistrement...' : 'Modifier'}
                </button>
              </div>
            </form>
          </section>

          {canSeeAllUsers && (
            <section className="bg-white rounded-xl border border-outline-variant shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-on-surface">Utilisateurs de l'agence</h3>
                <span className="text-xs text-secondary">
                  {allUsers.length} compte{allUsers.length !== 1 ? 's' : ''}
                </span>
              </div>
              {isLoadingUsers ? (
                <p className="text-sm text-secondary">Chargement...</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {allUsers.map((teamMember) => {
                    const online = isOnline(teamMember.id);
                    return (
                      <div className="flex items-center gap-3 p-3 rounded-lg border border-outline-variant" key={teamMember.id}>
                        <div className="relative shrink-0">
                          {teamMember.profile_picture ? (
                            <img
                              alt=""
                              className="w-10 h-10 rounded-full object-cover"
                              src={teamMember.profile_picture}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-tertiary flex items-center justify-center text-white text-xs font-bold">
                              {getInitials(teamMember.first_name, teamMember.last_name)}
                            </div>
                          )}
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                              online ? 'bg-green-500' : 'bg-red-500'
                            }`}
                            title={online ? 'En ligne' : 'Hors ligne'}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-on-surface truncate">
                            {teamMember.first_name} {teamMember.last_name}
                          </p>
                          <p className="text-xs text-secondary truncate">{teamMember.role_display}</p>
                        </div>
                      </div>
                    );
                  })}
                  {allUsers.length === 0 && <p className="text-sm text-secondary col-span-full">Aucun utilisateur trouvé.</p>}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
