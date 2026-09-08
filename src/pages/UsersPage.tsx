import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import Modal from '../components/ui/Modal';
import { ICON_CLASSES, LABEL_CLASSES } from '../components/ui/formStyles';
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

const ICON_INPUT_CLASSES =
  'w-full pl-10 pr-3 py-2 bg-white border border-outline-variant rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none transition-all';

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
    <div className="max-w-[1480px] mx-auto space-y-5 pb-16 text-slate-800 animate-fadeIn">
      {/* ==================================================================== */}
      {/* EN-TÊTE                                                              */}
      {/* ==================================================================== */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">group</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-headline-md text-xl font-extrabold text-slate-900 tracking-tight">Gestion des utilisateurs</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary">
                {filteredUsers.length}
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">Gérez les comptes et les fonctions de l'équipe Iman.</p>
          </div>
        </div>
        <button
          className="flex items-center gap-1.5 bg-primary hover:bg-on-primary-fixed-variant text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs hover:shadow-md active:scale-95 transition-all shrink-0"
          onClick={openCreateModal}
          type="button"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Ajouter un utilisateur
        </button>
      </header>

      {/* ==================================================================== */}
      {/* RECHERCHE + FILTRE DIVISION                                          */}
      {/* ==================================================================== */}
      <section className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs">
        <div className="relative flex-1 md:max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
          <input
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white transition-all"
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Rechercher un utilisateur, un email, une fonction..."
            type="text"
            value={search}
          />
        </div>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none">
            account_tree
          </span>
          <select
            className="bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-8 text-xs font-medium text-slate-700 outline-none focus:ring-1 focus:ring-primary cursor-pointer appearance-none"
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
          <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[16px] pointer-events-none">
            expand_more
          </span>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* TABLEAU DES UTILISATEURS                                             */}
      {/* ==================================================================== */}
      <section className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                <th className="px-5 py-3.5">Utilisateur</th>
                <th className="px-5 py-3.5">Email</th>
                <th className="px-5 py-3.5">Fonction</th>
                <th className="px-5 py-3.5">Division</th>
                <th className="px-5 py-3.5">Statut</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedUsers.map((user) => {
                const fullName = `${user.first_name} ${user.last_name}`.trim() || user.email;
                return (
                  <tr className="hover:bg-slate-50/80 transition-colors" key={user.id}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {user.profile_picture ? (
                          <img alt={fullName} className="w-9 h-9 rounded-full object-cover shrink-0" src={user.profile_picture} />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                            {fullName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="font-bold text-slate-900">{fullName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{user.email}</td>
                    <td className="px-5 py-3.5 text-slate-700">{user.role_display || '—'}</td>
                    <td className="px-5 py-3.5 text-slate-700">{user.division_name || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          user.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {user.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          aria-label="Modifier"
                          className="w-7 h-7 inline-flex items-center justify-center text-amber-600 border border-amber-200 hover:bg-amber-50 rounded-lg transition-colors"
                          onClick={() => openEditModal(user)}
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button
                          aria-label="Supprimer"
                          className="w-7 h-7 inline-flex items-center justify-center text-rose-600 border border-rose-200 hover:bg-rose-50 rounded-lg transition-colors"
                          onClick={() => handleDelete(user)}
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!isLoading && filteredUsers.length === 0 && (
                <tr>
                  <td className="px-5 py-10 text-center text-slate-400 text-xs" colSpan={6}>
                    {users.length === 0 ? 'Aucun utilisateur pour le moment.' : 'Aucun utilisateur ne correspond à votre recherche.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* PAGINATION                                                           */}
      {/* ==================================================================== */}
      {filteredUsers.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Affichage {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filteredUsers.length)} sur {filteredUsers.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              className="w-8 h-8 inline-flex items-center justify-center border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:pointer-events-none"
              disabled={currentPage === 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <span className="text-xs font-semibold text-slate-700 px-2">
              Page {currentPage} / {totalPages}
            </span>
            <button
              className="w-8 h-8 inline-flex items-center justify-center border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:pointer-events-none"
              disabled={currentPage === totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL : AJOUTER / MODIFIER UN UTILISATEUR                            */}
      {/* ==================================================================== */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingUser ? "Modifier l'utilisateur" : 'Ajouter un utilisateur'}
        footer={
          <>
            <button
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition-colors"
              onClick={closeModal}
              type="button"
            >
              Annuler
            </button>
            <button
              className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-on-primary-fixed-variant transition-colors disabled:opacity-50"
              disabled={isSubmitting}
              form="user-form"
              type="submit"
            >
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </>
        }
      >
        <form className="space-y-3" id="user-form" onSubmit={handleFormSubmit}>
          <div className="flex items-center gap-4">
            {previewUrl || editingUser?.profile_picture ? (
              <img
                alt=""
                className="w-16 h-16 rounded-full object-cover border-2 border-primary/20 shrink-0"
                src={previewUrl ?? editingUser?.profile_picture ?? undefined}
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                <span className="material-symbols-outlined text-[28px]">person</span>
              </div>
            )}
            <div className="flex-1 space-y-1">
              <label className={LABEL_CLASSES} htmlFor="profile_picture">
                Photo de profil
              </label>
              <input
                accept="image/*"
                className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 file:text-xs file:font-semibold hover:file:bg-slate-200"
                id="profile_picture"
                name="profile_picture"
                onChange={handlePictureChange}
                type="file"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <label className={LABEL_CLASSES} htmlFor="first_name">
                Prénom
              </label>
              <div className="relative">
                <span className={ICON_CLASSES}>person</span>
                <input
                  className={ICON_INPUT_CLASSES}
                  defaultValue={editingUser?.first_name}
                  id="first_name"
                  name="first_name"
                  placeholder="Ex : Aminata"
                  required
                  type="text"
                />
              </div>
            </div>
            <div className="space-y-0.5">
              <label className={LABEL_CLASSES} htmlFor="last_name">
                Nom
              </label>
              <div className="relative">
                <span className={ICON_CLASSES}>badge</span>
                <input
                  className={ICON_INPUT_CLASSES}
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <label className={LABEL_CLASSES} htmlFor="email">
                Email
              </label>
              <div className="relative">
                <span className={ICON_CLASSES}>mail</span>
                <input
                  className={ICON_INPUT_CLASSES}
                  defaultValue={editingUser?.email}
                  id="email"
                  name="email"
                  placeholder="user@iman.ne"
                  required
                  type="email"
                />
              </div>
            </div>
            <div className="space-y-0.5">
              <label className={LABEL_CLASSES} htmlFor="role">
                Fonction
              </label>
              <div className="relative">
                <span className={ICON_CLASSES}>work</span>
                <select
                  className={`${ICON_INPUT_CLASSES} appearance-none`}
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
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none">
                  expand_more
                </span>
              </div>
            </div>
          </div>

          <div className={`grid gap-3 ${editingUser ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <div className="space-y-0.5">
              <label className={LABEL_CLASSES} htmlFor="division">
                Division
              </label>
              <div className="relative">
                <span className={ICON_CLASSES}>account_tree</span>
                <select
                  className={`${ICON_INPUT_CLASSES} appearance-none`}
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
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none">
                  expand_more
                </span>
              </div>
            </div>

            {!editingUser && (
              <div className="space-y-0.5">
                <label className={LABEL_CLASSES} htmlFor="password">
                  Mot de passe
                </label>
                <div className="relative">
                  <span className={ICON_CLASSES}>lock</span>
                  <input
                    className={ICON_INPUT_CLASSES}
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
            <p className="text-[11px] text-slate-400">
              Mot de passe provisoire — l'utilisateur pourra le changer après sa première connexion.
            </p>
          )}

          {formError && <p className="text-xs text-rose-600 font-semibold">{formError}</p>}
        </form>
      </Modal>
    </div>
  );
}
