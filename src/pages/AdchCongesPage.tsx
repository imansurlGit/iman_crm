// TODO: le statut de congé reste local à cette page — aucun modèle de congé
// n'existe encore côté backend. Les employés eux-mêmes (nom, rôle, division,
// photo) sont réels (`listUsers`).

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { listUsers, type CurrentUser } from '../services/userService';
import Modal from '../components/ui/Modal';
import { LABEL_CLASSES } from '../components/ui/formStyles';

const INPUT_CLASSES =
  'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-1 focus:ring-primary focus:bg-white outline-none transition-all';

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
            <span className="material-symbols-outlined text-[20px]">beach_access</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-headline-md text-xl font-extrabold text-slate-900 tracking-tight">Congés</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary">ADCH</span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">Indiquez si un employé est en congé — visible par toute l'équipe.</p>
          </div>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* KPIS                                                                 */}
      {/* ==================================================================== */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Effectif total</span>
            <span className="material-symbols-outlined text-slate-400 text-[18px]">groups</span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight font-headline-md">{users.length}</div>
        </div>
        <div
          className={`p-4 rounded-xl border shadow-2xs flex flex-col justify-between ${
            onLeaveCount > 0 ? 'bg-amber-50/50 border-amber-200/60' : 'bg-slate-50 border-slate-200/70'
          }`}
        >
          <div className="flex items-center justify-between text-slate-600 text-xs font-medium mb-1">
            <span>En congé aujourd'hui</span>
            <span className={`material-symbols-outlined text-[18px] ${onLeaveCount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
              beach_access
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight font-headline-md">{onLeaveCount}</div>
        </div>
        <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/60 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 text-xs font-medium mb-1">
            <span>Congés planifiés</span>
            <span className="material-symbols-outlined text-emerald-600 text-[18px]">event_available</span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight font-headline-md">{Object.keys(conges).length}</div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* RECHERCHE + TABLEAU                                                  */}
      {/* ==================================================================== */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
            <input
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white transition-all"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un employé..."
              type="text"
              value={search}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                <th className="px-5 py-3.5">Employé</th>
                <th className="px-5 py-3.5">Statut</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredUsers.map((user) => {
                const conge = conges[user.id];
                const isOnLeave = !!conge && conge.du <= today && today <= conge.au;
                const isUpcoming = !!conge && conge.du > today;
                return (
                  <tr className="hover:bg-slate-50/80 transition-colors" key={user.id}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                          {user.profile_picture ? (
                            <img alt="" className="w-full h-full object-cover" src={user.profile_picture} />
                          ) : (
                            getInitials(`${user.first_name} ${user.last_name}`)
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {user.role_display}
                            {user.division_name && ` · ${user.division_name}`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {conge ? (
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                              isOnLeave
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : isUpcoming
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            {isOnLeave ? 'En congé' : isUpcoming ? 'À venir' : 'Terminé'} · {formatDate(conge.du)} → {formatDate(conge.au)}
                          </span>
                          <button
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                            onClick={() => handleClearConge(user.id)}
                            title="Retirer le congé"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Disponible
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        className="text-xs font-bold text-primary hover:underline"
                        onClick={() => openModal(user)}
                        type="button"
                      >
                        {conge ? 'Modifier' : 'Marquer en congé'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td className="px-5 py-10 text-center text-slate-400 text-xs" colSpan={3}>
                    Aucun employé ne correspond à votre recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* MODAL : MARQUER EN CONGÉ                                             */}
      {/* ==================================================================== */}
      <Modal
        footer={
          <>
            <button
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition-colors"
              onClick={() => setIsModalOpen(false)}
              type="button"
            >
              Annuler
            </button>
            <button
              className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-on-primary-fixed-variant transition-colors"
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
            <div className="space-y-1">
              <label className={LABEL_CLASSES} htmlFor="conge-du">
                Du
              </label>
              <input
                className={INPUT_CLASSES}
                id="conge-du"
                onChange={(event) => setDu(event.target.value)}
                required
                type="date"
                value={du}
              />
            </div>
            <div className="space-y-1">
              <label className={LABEL_CLASSES} htmlFor="conge-au">
                Au
              </label>
              <input
                className={INPUT_CLASSES}
                id="conge-au"
                onChange={(event) => setAu(event.target.value)}
                required
                type="date"
                value={au}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className={LABEL_CLASSES} htmlFor="conge-motif">
              Motif
            </label>
            <input
              className={INPUT_CLASSES}
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
