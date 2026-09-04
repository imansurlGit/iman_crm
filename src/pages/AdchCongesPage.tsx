// TODO: le statut de congé reste local à cette page — aucun modèle de congé
// n'existe encore côté backend. Les employés eux-mêmes (nom, rôle, division,
// photo) sont réels (`listUsers`).

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { listUsers, type CurrentUser } from '../services/userService';
import Modal from '../components/ui/Modal';
import { LABEL_CLASSES } from '../components/ui/formStyles';

const CARD_CLASSES = 'bg-white rounded-lg border border-outline-variant';
const SEARCH_INPUT_CLASSES =
  'w-full bg-surface-container border border-outline-variant py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary-container transition-all';

interface CongeRecord {
  du: string;
  au: string;
  motif: string;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AdchCongesPage() {
  const [users, setUsers] = useState<CurrentUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [conges, setConges] = useState<Record<number, CongeRecord>>({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<CurrentUser | null>(null);
  const [du, setDu] = useState(todayIso());
  const [au, setAu] = useState(todayIso());
  const [motif, setMotif] = useState('');

  useEffect(() => {
    listUsers()
      .then((data) => {
        setUsers(data);
        const active = data.filter((u) => u.is_active);
        // Démonstration statique : deux membres réels de l'effectif marqués
        // en congé pour illustrer la fonctionnalité (voir TODO en tête de fichier).
        const seeded: Record<number, CongeRecord> = {};
        if (active[1]) seeded[active[1].id] = { du: '2026-08-19', au: '2026-08-24', motif: 'Congés annuels' };
        if (active[3]) seeded[active[3].id] = { du: '2026-08-21', au: '2026-08-22', motif: 'Congé maladie' };
        setConges(seeded);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const today = todayIso();

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter(
      (user) =>
        !query ||
        `${user.first_name} ${user.last_name}`.toLowerCase().includes(query) ||
        user.role_display.toLowerCase().includes(query) ||
        (user.division_name ?? '').toLowerCase().includes(query),
    );
  }, [users, search]);

  const onLeaveCount = Object.entries(conges).filter(([, c]) => c.du <= today && today <= c.au).length;

  function openModal(user: CurrentUser) {
    setSelectedUser(user);
    const existing = conges[user.id];
    setDu(existing?.du ?? todayIso());
    setAu(existing?.au ?? todayIso());
    setMotif(existing?.motif ?? '');
    setIsModalOpen(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUser) return;
    setConges((prev) => ({ ...prev, [selectedUser.id]: { du, au, motif: motif.trim() || 'Congés' } }));
    setIsModalOpen(false);
  }

  function handleClearConge(userId: number) {
    setConges((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }

  if (isLoading) {
    return <p className="font-body-sm text-body-sm text-secondary">Chargement...</p>;
  }

  return (
    <div className="flex flex-col gap-gutter">
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">Congés</h2>
          <p className="text-secondary mt-1 text-sm">Indiquez si un employé est en congé — visible par toute l'équipe.</p>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        <div className={`${CARD_CLASSES} p-4 flex items-center gap-3`}>
          <span className="material-symbols-outlined text-primary-container text-2xl shrink-0">groups</span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">Effectif total</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{users.length}</span>
          </div>
        </div>
        <div className={`${CARD_CLASSES} p-4 flex items-center gap-3 ${onLeaveCount > 0 ? 'border-amber-300' : ''}`}>
          <span className={`material-symbols-outlined text-2xl shrink-0 ${onLeaveCount > 0 ? 'text-amber-600' : 'text-primary-container'}`}>
            beach_access
          </span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">En congé aujourd'hui</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{onLeaveCount}</span>
          </div>
        </div>
        <div className={`${CARD_CLASSES} p-4 flex items-center gap-3`}>
          <span className="material-symbols-outlined text-emerald-600 text-2xl shrink-0">event_available</span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">Congés planifiés</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{Object.keys(conges).length}</span>
          </div>
        </div>
      </section>

      <div className="relative max-w-md">
        <span className="absolute inset-y-0 left-3 flex items-center text-outline">
          <span className="material-symbols-outlined text-sm">search</span>
        </span>
        <input
          className={SEARCH_INPUT_CLASSES}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher un employé..."
          type="text"
          value={search}
        />
      </div>

      <section className={`${CARD_CLASSES} divide-y divide-outline-variant overflow-hidden`}>
        {filteredUsers.map((user) => {
          const conge = conges[user.id];
          const isOnLeave = !!conge && conge.du <= today && today <= conge.au;
          const isUpcoming = !!conge && conge.du > today;
          return (
            <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-container-low transition-colors" key={user.id}>
              <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                {user.profile_picture ? (
                  <img alt="" className="w-full h-full object-cover" src={user.profile_picture} />
                ) : (
                  getInitials(`${user.first_name} ${user.last_name}`)
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-on-surface truncate">
                  {user.first_name} {user.last_name}
                </p>
                <p className="text-xs text-secondary truncate">
                  {user.role_display}
                  {user.division_name && ` · ${user.division_name}`}
                </p>
              </div>
              {conge ? (
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                      isOnLeave ? 'bg-amber-100 text-amber-700' : isUpcoming ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {isOnLeave ? 'En congé' : isUpcoming ? 'À venir' : 'Terminé'} · {formatDate(conge.du)} → {formatDate(conge.au)}
                  </span>
                  <button
                    className="w-7 h-7 flex items-center justify-center rounded text-secondary hover:bg-surface-container-high hover:text-on-surface transition-colors"
                    onClick={() => handleClearConge(user.id)}
                    title="Retirer le congé"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              ) : (
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 shrink-0">Disponible</span>
              )}
              <button
                className="text-xs font-bold text-primary hover:underline shrink-0"
                onClick={() => openModal(user)}
                type="button"
              >
                {conge ? 'Modifier' : 'Marquer en congé'}
              </button>
            </div>
          );
        })}
        {filteredUsers.length === 0 && (
          <div className="px-5 py-8 text-center text-secondary text-sm">Aucun employé ne correspond à votre recherche.</div>
        )}
      </section>

      <Modal
        footer={
          <>
            <button
              className="px-5 py-2.5 rounded border border-outline-variant text-on-surface font-body-sm text-body-sm hover:bg-surface-container-high transition-colors"
              onClick={() => setIsModalOpen(false)}
              type="button"
            >
              Annuler
            </button>
            <button
              className="px-5 py-2.5 rounded bg-on-primary-fixed-variant text-white font-body-sm text-body-sm font-bold hover:bg-primary transition-colors"
              form="conge-form"
              type="submit"
            >
              Enregistrer
            </button>
          </>
        }
        isOpen={isModalOpen}
        maxWidthClassName="max-w-sm"
        onClose={() => setIsModalOpen(false)}
        title={selectedUser ? `Congé — ${selectedUser.first_name} ${selectedUser.last_name}` : 'Congé'}
      >
        <form className="space-y-3" id="conge-form" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={LABEL_CLASSES} htmlFor="conge-du">
                Du
              </label>
              <input
                className="w-full px-3 py-2 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container outline-none"
                id="conge-du"
                onChange={(event) => setDu(event.target.value)}
                required
                type="date"
                value={du}
              />
            </div>
            <div className="space-y-1.5">
              <label className={LABEL_CLASSES} htmlFor="conge-au">
                Au
              </label>
              <input
                className="w-full px-3 py-2 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container outline-none"
                id="conge-au"
                onChange={(event) => setAu(event.target.value)}
                required
                type="date"
                value={au}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className={LABEL_CLASSES} htmlFor="conge-motif">
              Motif
            </label>
            <input
              className="w-full px-3 py-2 bg-white border border-outline-variant rounded text-sm focus:ring-1 focus:ring-primary-container outline-none"
              id="conge-motif"
              onChange={(event) => setMotif(event.target.value)}
              placeholder="Ex : Congés annuels"
              type="text"
              value={motif}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
