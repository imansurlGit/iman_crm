import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import Modal from '../components/ui/Modal';
import { ICON_CLASSES, INPUT_CLASSES, LABEL_CLASSES } from '../components/ui/formStyles';
import { listDivisions, type Division } from '../services/divisionService';
import {
  createUser,
  deleteUser,
  listRoles,
  listUsers,
  updateUser,
  type CurrentUser,
  type RoleOption,
} from '../services/userService';

export default function UsersPage() {
  const [users, setUsers] = useState<CurrentUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<CurrentUser | null>(null);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  async function loadUsers() {
    setIsLoading(true);
    try {
      setUsers(await listUsers());
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
    listRoles()
      .then(setRoles)
      .catch(() => setRoles([]));
    listDivisions()
      .then(setDivisions)
      .catch(() => setDivisions([]));
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;
    setFormError(null);
  }, [isModalOpen]);

  function openCreateModal() {
    setEditingUser(null);
    setPreviewUrl(null);
    setIsModalOpen(true);
  }

  function openEditModal(user: CurrentUser) {
    setEditingUser(user);
    setPreviewUrl(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setPreviewUrl(null);
  }

  function handlePictureChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  async function handleDelete(user: CurrentUser) {
    const fullName = `${user.first_name} ${user.last_name}`.trim() || user.email;
    if (!window.confirm(`Supprimer ${fullName} ? Cette action est irréversible.`)) return;
    await deleteUser(user.id);
    loadUsers();
  }

  async function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const picture = formData.get('profile_picture');
    if (picture instanceof File && picture.size === 0) {
      formData.delete('profile_picture');
    }

    try {
      if (editingUser) {
        await updateUser(editingUser.id, formData);
      } else {
        await createUser(formData);
      }
      loadUsers();
      closeModal();
    } catch {
      setFormError(
        "Impossible d'enregistrer cet utilisateur. Vérifiez les champs (email déjà utilisé, fonction déjà occupée par quelqu'un d'autre...)."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users
      .filter((user) => {
        if (!query) return true;
        const fullName = `${user.first_name} ${user.last_name}`.trim();
        return (
          fullName.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          (user.role_display ?? '').toLowerCase().includes(query) ||
          (user.division_name ?? '').toLowerCase().includes(query)
        );
      })
      .filter((user) => !divisionFilter || String(user.division) === divisionFilter);
  }, [users, search, divisionFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paginatedUsers = filteredUsers.slice(pageStart, pageStart + PAGE_SIZE);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-2.5">
            Gestion des utilisateurs
            <span className="bg-surface-container-high px-2.5 py-1 rounded-full text-sm font-bold text-secondary">
              {filteredUsers.length}
            </span>
          </h2>
          <p className="font-body-md text-body-md text-secondary mt-2">
            Gérez les comptes et les fonctions de l'équipe Iman.
          </p>
        </div>
        <button
          className="flex items-center gap-2 bg-on-primary-fixed-variant text-white px-5 py-2.5 rounded font-body-sm text-body-sm font-bold hover:bg-primary transition-colors"
          onClick={openCreateModal}
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Ajouter un utilisateur
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 md:max-w-md">
          <span className="absolute inset-y-0 left-3 flex items-center text-outline">
            <span className="material-symbols-outlined text-sm">search</span>
          </span>
          <input
            className="w-full bg-surface-container border border-outline-variant py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary-container transition-all rounded"
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Rechercher un utilisateur, un email, une fonction..."
            type="text"
            value={search}
          />
        </div>
        <div className="relative">
          <span className="absolute inset-y-0 left-3 flex items-center text-outline pointer-events-none">
            <span className="material-symbols-outlined text-sm">account_tree</span>
          </span>
          <select
            className="bg-surface-container border border-outline-variant py-2 pl-10 pr-8 text-sm focus:outline-none focus:border-primary-container transition-all appearance-none rounded"
            onChange={(event) => {
              setDivisionFilter(event.target.value);
              setPage(1);
            }}
            value={divisionFilter}
          >
            <option value="">Toutes les divisions</option>
            {divisions.map((division) => (
              <option key={division.id} value={division.id}>
                {division.name}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline text-sm pointer-events-none">
            expand_more
          </span>
        </div>
      </div>

      <div className="surface-card bg-white rounded-lg overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-surface-container-low">
            <tr>
              <th className="px-6 py-3 font-label-md text-label-md text-secondary uppercase">Utilisateur</th>
              <th className="px-6 py-3 font-label-md text-label-md text-secondary uppercase">Email</th>
              <th className="px-6 py-3 font-label-md text-label-md text-secondary uppercase">Fonction</th>
              <th className="px-6 py-3 font-label-md text-label-md text-secondary uppercase">Division</th>
              <th className="px-6 py-3 font-label-md text-label-md text-secondary uppercase">Statut</th>
              <th className="px-6 py-3 font-label-md text-label-md text-secondary uppercase text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {paginatedUsers.map((user) => {
              const fullName = `${user.first_name} ${user.last_name}`.trim() || user.email;
              return (
                <tr key={user.id}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {user.profile_picture ? (
                        <img
                          alt={fullName}
                          className="w-9 h-9 rounded-full object-cover"
                          src={user.profile_picture}
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-on-primary font-label-md text-label-md">
                          {fullName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="font-body-md text-on-surface font-medium">{fullName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-body-sm text-secondary">{user.email}</td>
                  <td className="px-6 py-4 font-body-sm text-on-surface">{user.role_display || '—'}</td>
                  <td className="px-6 py-4 font-body-sm text-on-surface">{user.division_name || '—'}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                        user.is_active
                          ? 'bg-primary-container/20 text-primary'
                          : 'bg-surface-container text-outline'
                      }`}
                    >
                      {user.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      aria-label="Modifier"
                      className="p-2 text-outline hover:text-primary hover:bg-surface-container-high rounded-full transition-colors"
                      onClick={() => openEditModal(user)}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                    <button
                      aria-label="Supprimer"
                      className="p-2 text-outline hover:text-error hover:bg-error-container rounded-full transition-colors"
                      onClick={() => handleDelete(user)}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </td>
                </tr>
              );
            })}
            {!isLoading && filteredUsers.length === 0 && (
              <tr>
                <td className="px-6 py-8 text-center text-secondary font-body-sm" colSpan={6}>
                  {users.length === 0 ? 'Aucun utilisateur pour le moment.' : 'Aucun utilisateur ne correspond à votre recherche.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredUsers.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="font-body-sm text-body-sm text-secondary">
            Affichage {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filteredUsers.length)} sur {filteredUsers.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              className="w-9 h-9 inline-flex items-center justify-center border border-outline-variant text-on-surface rounded-lg hover:bg-surface-container-high transition-colors disabled:opacity-40 disabled:pointer-events-none"
              disabled={currentPage === 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <span className="font-body-sm text-body-sm text-on-surface px-2">
              Page {currentPage} / {totalPages}
            </span>
            <button
              className="w-9 h-9 inline-flex items-center justify-center border border-outline-variant text-on-surface rounded-lg hover:bg-surface-container-high transition-colors disabled:opacity-40 disabled:pointer-events-none"
              disabled={currentPage === totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingUser ? "Modifier l'utilisateur" : 'Ajouter un utilisateur'}
        footer={
          <>
            <button
              className="px-5 py-2.5 rounded border border-outline-variant text-on-surface font-body-sm text-body-sm hover:bg-surface-container-high transition-colors"
              onClick={closeModal}
              type="button"
            >
              Annuler
            </button>
            <button
              className="px-5 py-2.5 rounded bg-on-primary-fixed-variant text-white font-body-sm text-body-sm font-bold hover:bg-primary transition-colors disabled:opacity-50"
              disabled={isSubmitting}
              form="user-form"
              type="submit"
            >
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </>
        }
      >
        <form className="space-y-4" id="user-form" onSubmit={handleFormSubmit}>
          <div className="flex items-center gap-4">
            {previewUrl || editingUser?.profile_picture ? (
              <img
                alt=""
                className="w-16 h-16 rounded-full object-cover border-2 border-primary-container shrink-0"
                src={previewUrl ?? editingUser?.profile_picture ?? undefined}
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center text-outline shrink-0">
                <span className="material-symbols-outlined text-[28px]">person</span>
              </div>
            )}
            <div className="flex-1 space-y-1">
              <label className={LABEL_CLASSES} htmlFor="profile_picture">
                Photo de profil
              </label>
              <input
                accept="image/*"
                className="w-full text-body-sm text-secondary file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-surface-container-high file:text-on-surface file:font-body-sm file:font-medium hover:file:bg-surface-container-highest"
                id="profile_picture"
                name="profile_picture"
                onChange={handlePictureChange}
                type="file"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={LABEL_CLASSES} htmlFor="first_name">
                Prénom
              </label>
              <div className="relative">
                <span className={ICON_CLASSES}>person</span>
                <input
                  className={INPUT_CLASSES}
                  defaultValue={editingUser?.first_name}
                  id="first_name"
                  name="first_name"
                  placeholder="Ex : Aminata"
                  required
                  type="text"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className={LABEL_CLASSES} htmlFor="last_name">
                Nom
              </label>
              <div className="relative">
                <span className={ICON_CLASSES}>badge</span>
                <input
                  className={INPUT_CLASSES}
                  defaultValue={editingUser?.last_name}
                  id="last_name"
                  name="last_name"
                  placeholder="Ex : Souley"
                  required
                  type="text"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={LABEL_CLASSES} htmlFor="email">
                Email
              </label>
              <div className="relative">
                <span className={ICON_CLASSES}>mail</span>
                <input
                  className={INPUT_CLASSES}
                  defaultValue={editingUser?.email}
                  id="email"
                  name="email"
                  placeholder="user@iman.ne"
                  required
                  type="email"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className={LABEL_CLASSES} htmlFor="role">
                Fonction
              </label>
              <div className="relative">
                <span className={ICON_CLASSES}>work</span>
                <select
                  className={`${INPUT_CLASSES} appearance-none`}
                  defaultValue={editingUser?.role ?? ''}
                  id="role"
                  name="role"
                >
                  <option value="">—</option>
                  {roles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-[20px] pointer-events-none">
                  expand_more
                </span>
              </div>
            </div>
          </div>

          <div className={`grid gap-4 ${editingUser ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <div className="space-y-1">
              <label className={LABEL_CLASSES} htmlFor="division">
                Division
              </label>
              <div className="relative">
                <span className={ICON_CLASSES}>account_tree</span>
                <select
                  className={`${INPUT_CLASSES} appearance-none`}
                  defaultValue={editingUser?.division ?? ''}
                  id="division"
                  name="division"
                >
                  <option value="">—</option>
                  {divisions.map((division) => (
                    <option key={division.id} value={division.id}>
                      {division.name}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-[20px] pointer-events-none">
                  expand_more
                </span>
              </div>
            </div>

            {!editingUser && (
              <div className="space-y-1">
                <label className={LABEL_CLASSES} htmlFor="password">
                  Mot de passe
                </label>
                <div className="relative">
                  <span className={ICON_CLASSES}>lock</span>
                  <input
                    className={INPUT_CLASSES}
                    defaultValue="1234"
                    id="password"
                    minLength={4}
                    name="password"
                    placeholder="Mot de passe provisoire"
                    required
                    type="text"
                  />
                </div>
              </div>
            )}
          </div>
          {!editingUser && (
            <p className="font-body-sm text-body-sm text-secondary -mt-2">
              Mot de passe provisoire — l'utilisateur pourra le changer après sa première connexion.
            </p>
          )}

          {formError && <p className="text-body-sm text-error">{formError}</p>}
        </form>
      </Modal>
    </div>
  );
}
