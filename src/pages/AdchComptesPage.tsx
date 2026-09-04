// TODO: le statut "connecté maintenant" et le journal de connexions sont
// statiques — aucun suivi de session/audit n'existe encore côté backend.
// Le reste (identité, rôle, division, statut du compte, dernière connexion
// réelle via `last_login`) est réel (`listUsers`).

import { useEffect, useMemo, useState } from 'react';
import { listUsers, type CurrentUser } from '../services/userService';

const CARD_CLASSES = 'bg-white rounded-lg border border-outline-variant';
const SEARCH_INPUT_CLASSES =
  'w-full bg-surface-container border border-outline-variant py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary-container transition-all';

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

  useEffect(() => {
    listUsers()
      .then((data) => {
        setUsers(data);
        setSelectedId(data[0]?.id ?? null);
      })
      .finally(() => setIsLoading(false));
  }, []);

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
    return <p className="font-body-sm text-body-sm text-secondary">Chargement...</p>;
  }

  return (
    <div className="flex flex-col gap-gutter">
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">Comptes &amp; connexions</h2>
          <p className="text-secondary mt-1 text-sm">Fiches des utilisateurs, statut de connexion et journal d'activité.</p>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        <div className={`${CARD_CLASSES} p-4 flex items-center gap-3`}>
          <span className="material-symbols-outlined text-primary-container text-2xl shrink-0">group</span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">Comptes au total</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{users.length}</span>
          </div>
        </div>
        <div className={`${CARD_CLASSES} p-4 flex items-center gap-3`}>
          <span className="material-symbols-outlined text-emerald-600 text-2xl shrink-0">wifi</span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">Connectés maintenant</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{connectedCount}</span>
          </div>
        </div>
        <div className={`${CARD_CLASSES} p-4 flex items-center gap-3`}>
          <span className="material-symbols-outlined text-gray-500 text-2xl shrink-0">person_off</span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">Comptes désactivés</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{users.filter((u) => !u.is_active).length}</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-12 gap-gutter items-start">
        {/* Liste */}
        <div className={`${CARD_CLASSES} col-span-12 lg:col-span-5 flex flex-col`}>
          <div className="p-3 border-b border-outline-variant">
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-outline">
                <span className="material-symbols-outlined text-sm">search</span>
              </span>
              <input
                className={SEARCH_INPUT_CLASSES}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un utilisateur..."
                type="text"
                value={search}
              />
            </div>
          </div>
          <div className="divide-y divide-outline-variant max-h-[560px] overflow-y-auto custom-scrollbar">
            {filteredUsers.map((user) => {
              const connected = isConnectedNow(user);
              return (
                <button
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    selectedId === user.id ? 'bg-primary-fixed/20' : 'hover:bg-surface-container-low'
                  }`}
                  key={user.id}
                  onClick={() => setSelectedId(user.id)}
                  type="button"
                >
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-xs font-bold overflow-hidden">
                      {user.profile_picture ? (
                        <img alt="" className="w-full h-full object-cover" src={user.profile_picture} />
                      ) : (
                        getInitials(`${user.first_name} ${user.last_name}`)
                      )}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                        connected ? 'bg-emerald-500' : 'bg-gray-300'
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-on-surface truncate">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-xs text-secondary truncate">{user.role_display}</p>
                  </div>
                  {!user.is_active && (
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 shrink-0">
                      Inactif
                    </span>
                  )}
                </button>
              );
            })}
            {filteredUsers.length === 0 && (
              <div className="px-4 py-8 text-center text-secondary text-sm">Aucun utilisateur ne correspond à votre recherche.</div>
            )}
          </div>
        </div>

        {/* Fiche */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-gutter">
          {selectedUser ? (
            <>
              <div className={`${CARD_CLASSES} p-5`}>
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <div className="w-16 h-16 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-lg font-bold overflow-hidden">
                      {selectedUser.profile_picture ? (
                        <img alt="" className="w-full h-full object-cover" src={selectedUser.profile_picture} />
                      ) : (
                        getInitials(`${selectedUser.first_name} ${selectedUser.last_name}`)
                      )}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${
                        isConnectedNow(selectedUser) ? 'bg-emerald-500' : 'bg-gray-300'
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-headline-md text-lg font-bold text-on-surface truncate">
                      {selectedUser.first_name} {selectedUser.last_name}
                    </h3>
                    <p className="text-sm text-secondary truncate">{selectedUser.email}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-primary/5 border border-primary/20 text-primary">
                        {selectedUser.role_display}
                      </span>
                      {selectedUser.division_name && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-surface-container-high text-secondary">
                          {selectedUser.division_name}
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          selectedUser.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {selectedUser.is_active ? 'Compte actif' : 'Compte désactivé'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          isConnectedNow(selectedUser) ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {isConnectedNow(selectedUser) ? 'Connecté maintenant' : 'Hors ligne'}
                      </span>
                    </div>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-outline-variant text-sm">
                  <div>
                    <dt className="text-secondary text-xs uppercase font-bold tracking-wide">Compte créé le</dt>
                    <dd className="font-semibold text-on-surface mt-0.5">{formatDateTime(selectedUser.date_joined)}</dd>
                  </div>
                  <div>
                    <dt className="text-secondary text-xs uppercase font-bold tracking-wide">Dernière connexion</dt>
                    <dd className="font-semibold text-on-surface mt-0.5">
                      {selectedUser.last_login ? formatDateTime(selectedUser.last_login) : 'Jamais connecté(e)'}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className={`${CARD_CLASSES} p-5`}>
                <h4 className="font-headline-md text-base font-bold text-on-surface mb-4">Journal de connexions</h4>
                <div className="space-y-3">
                  {fakeLogsFor(selectedUser).map((entry, index) => (
                    <div className="flex items-start gap-3" key={index}>
                      <div className="w-7 h-7 rounded-full bg-primary-container/10 text-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[14px]">
                          {entry.label.includes('Mot de passe') ? 'lock_reset' : 'login'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-on-surface">{entry.label}</p>
                        <p className="text-[11px] text-secondary">
                          {entry.device} · {entry.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className={`${CARD_CLASSES} p-8 text-center text-secondary text-sm`}>Sélectionnez un utilisateur.</div>
          )}
        </div>
      </div>
    </div>
  );
}
