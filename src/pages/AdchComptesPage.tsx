// TODO: le statut "connecté maintenant" et le journal de connexions sont
// statiques — aucun suivi de session/audit n'existe encore côté backend.
// Le reste (identité, rôle, division, statut du compte, dernière connexion
// réelle via `last_login`) est réel (`listUsers`).

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { createUser, deleteUser, listRoles, listUsers, updateUser, type CurrentUser, type RoleOption } from '../services/userService';
import { listDivisions, type Division } from '../services/divisionService';
import Modal from '../components/ui/Modal';
import { ICON_CLASSES, LABEL_CLASSES } from '../components/ui/formStyles';

const ICON_INPUT_CLASSES =
  'w-full pl-10 pr-3 py-2 bg-white border border-outline-variant rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none transition-all';

interface FakeLogEntry {
  label: string;
  device: string;
  time: string;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function isConnectedNow(user: CurrentUser): boolean {
  return user.is_active && user.id % 3 !== 0;
}

function fakeLogsFor(user: CurrentUser): FakeLogEntry[] {
  const devices = ['Chrome · Windows', 'Application mobile · Android', 'Safari · macOS', 'Edge · Windows'];
  return [
    { label: 'Connexion réussie', device: devices[user.id % devices.length], time: 'Aujourd\'hui, 08:1' + (user.id % 10) },
    { label: 'Mot de passe modifié', device: devices[(user.id + 1) % devices.length], time: 'il y a 6 jours' },
    { label: 'Connexion réussie', device: devices[(user.id + 2) % devices.length], time: 'il y a 9 jours' },
  ];
}

export default function AdchComptesPage() {
  const [users, setUsers] = useState<CurrentUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<CurrentUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function loadUsers(selectId?: number | null) {
    const data = await listUsers();
    setUsers(data);
    setSelectedId((prev) => (selectId !== undefined ? selectId : (prev ?? data[0]?.id ?? null)));
  }

  useEffect(() => {
    loadUsers().finally(() => setIsLoading(false));
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
    await loadUsers(null);
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
        const updated = await updateUser(editingUser.id, formData);
        await loadUsers(updated.id);
      } else {
        const created = await createUser(formData);
        await loadUsers(created.id);
      }
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
    return users.filter(
      (user) =>
        !query ||
        `${user.first_name} ${user.last_name}`.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.role_display.toLowerCase().includes(query),
    );
  }, [users, search]);

  const selectedUser = users.find((user) => user.id === selectedId) ?? null;
  const connectedCount = users.filter(isConnectedNow).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-slate-400 text-xs">
        <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
        Chargement...
      </div>
    );
  }

  return (
    <div className="max-w-[1480px] mx-auto space-y-5 pb-16 text-slate-800 animate-fadeIn">
      {/* ==================================================================== */}
      {/* EN-TÊTE                                                              */}
      {/* ==================================================================== */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-headline-md text-xl font-extrabold text-slate-900 tracking-tight">Comptes &amp; connexions</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary">ADCH</span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">Fiches des utilisateurs, statut de connexion et journal d'activité.</p>
          </div>
        </div>
        <button
          className="flex items-center gap-1.5 bg-primary hover:bg-on-primary-fixed-variant text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs hover:shadow-md active:scale-95 transition-all shrink-0"
          onClick={openCreateModal}
          type="button"
        >
          <span className="material-symbols-outlined text-[16px]">person_add</span>
          Nouveau compte
        </button>
      </header>

      {/* ==================================================================== */}
      {/* KPIS                                                                 */}
      {/* ==================================================================== */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Comptes au total</span>
            <span className="material-symbols-outlined text-slate-400 text-[18px]">group</span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight font-headline-md">{users.length}</div>
        </div>
        <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/60 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 text-xs font-medium mb-1">
            <span>Connectés maintenant</span>
            <span className="material-symbols-outlined text-emerald-600 text-[18px]">wifi</span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight font-headline-md">{connectedCount}</div>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Comptes désactivés</span>
            <span className="material-symbols-outlined text-slate-400 text-[18px]">person_off</span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight font-headline-md">
            {users.filter((u) => !u.is_active).length}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ================================================================== */}
        {/* LISTE DES UTILISATEURS                                              */}
        {/* ================================================================== */}
        <section className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden flex flex-col h-[calc(100vh-260px)] min-h-[520px]">
          <div className="p-4 border-b border-slate-100 shrink-0">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
              <input
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white transition-all"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un utilisateur..."
                type="text"
                value={search}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100">
            {filteredUsers.map((user) => {
              const connected = isConnectedNow(user);
              return (
                <button
                  className={`w-full flex items-center gap-3 px-4 py-3.5 border-l-4 text-left transition-colors ${
                    selectedId === user.id ? 'bg-primary/5 border-l-primary' : 'border-l-transparent hover:bg-slate-50'
                  }`}
                  key={user.id}
                  onClick={() => setSelectedId(user.id)}
                  type="button"
                >
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold overflow-hidden">
                      {user.profile_picture ? (
                        <img alt="" className="w-full h-full object-cover" src={user.profile_picture} />
                      ) : (
                        getInitials(`${user.first_name} ${user.last_name}`)
                      )}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                        connected ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{user.role_display}</p>
                  </div>
                  {!user.is_active && (
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 shrink-0">
                      Inactif
                    </span>
                  )}
                </button>
              );
            })}
            {filteredUsers.length === 0 && (
              <div className="px-4 py-10 text-center text-slate-400 text-xs">Aucun utilisateur ne correspond à votre recherche.</div>
            )}
          </div>
        </section>

        {/* ================================================================== */}
        {/* FICHE UTILISATEUR                                                   */}
        {/* ================================================================== */}
        <section className="lg:col-span-7 flex flex-col gap-5">
          {selectedUser ? (
            <>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5">
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center text-lg font-bold overflow-hidden">
                      {selectedUser.profile_picture ? (
                        <img alt="" className="w-full h-full object-cover" src={selectedUser.profile_picture} />
                      ) : (
                        getInitials(`${selectedUser.first_name} ${selectedUser.last_name}`)
                      )}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${
                        isConnectedNow(selectedUser) ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-headline-md text-lg font-bold text-slate-900 truncate">
                        {selectedUser.first_name} {selectedUser.last_name}
                      </h2>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          aria-label="Modifier"
                          className="w-8 h-8 inline-flex items-center justify-center text-amber-600 border border-amber-200 hover:bg-amber-50 rounded-lg transition-colors"
                          onClick={() => openEditModal(selectedUser)}
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[17px]">edit</span>
                        </button>
                        <button
                          aria-label="Supprimer"
                          className="w-8 h-8 inline-flex items-center justify-center text-rose-600 border border-rose-200 hover:bg-rose-50 rounded-lg transition-colors"
                          onClick={() => handleDelete(selectedUser)}
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[17px]">delete</span>
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 truncate">{selectedUser.email}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-primary/10 border border-primary/20 text-primary">
                        {selectedUser.role_display}
                      </span>
                      {selectedUser.division_name && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-500">
                          {selectedUser.division_name}
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          selectedUser.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {selectedUser.is_active ? 'Compte actif' : 'Compte désactivé'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          isConnectedNow(selectedUser)
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {isConnectedNow(selectedUser) ? 'Connecté maintenant' : 'Hors ligne'}
                      </span>
                    </div>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-slate-100 text-sm">
                  <div>
                    <dt className="text-slate-400 text-[10px] uppercase font-bold tracking-wide">Compte créé le</dt>
                    <dd className="font-semibold text-slate-900 mt-0.5">{formatDateTime(selectedUser.date_joined)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 text-[10px] uppercase font-bold tracking-wide">Dernière connexion</dt>
                    <dd className="font-semibold text-slate-900 mt-0.5">
                      {selectedUser.last_login ? formatDateTime(selectedUser.last_login) : 'Jamais connecté(e)'}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5">
                <h3 className="font-headline-md text-sm font-bold text-slate-900 mb-3">Journal de connexions</h3>
                <div className="space-y-3">
                  {fakeLogsFor(selectedUser).map((entry, index) => (
                    <div className="flex items-start gap-3" key={index}>
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[14px]">
                          {entry.label.includes('Mot de passe') ? 'lock_reset' : 'login'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-800">{entry.label}</p>
                        <p className="text-[11px] text-slate-500">
                          {entry.device} · {entry.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-10 text-center text-slate-400 text-xs">
              Sélectionnez un utilisateur.
            </div>
          )}
        </section>
      </div>

      {/* ==================================================================== */}
      {/* MODAL : NOUVEAU / MODIFIER COMPTE                                    */}
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
              form="adch-user-form"
              type="submit"
            >
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </>
        }
      >
        <form className="space-y-3" id="adch-user-form" onSubmit={handleFormSubmit}>
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
