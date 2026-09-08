// TODO: la liste des congés reste statique — aucun modèle de congé n'existe
// encore côté backend (voir AdchCongesPage). Comptes, effectifs et agenda du
// DG (via le contact réel « Interne (Agence) ») sont réels.

import { useEffect, useMemo, useState } from 'react';
import { listUsers, type CurrentUser } from '../services/userService';
import { getOrCreateAgencyContact } from '../services/contactService';
import { listEvents, EVENT_TYPE_OPTIONS, type ProspectEvent } from '../services/eventService';

interface CongeEntry {
  user: CurrentUser;
  du: string;
  au: string;
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatShortDate(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function DashboardAdchPage() {
  const [users, setUsers] = useState<CurrentUser[]>([]);
  const [todaysEvents, setTodaysEvents] = useState<ProspectEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([listUsers(), getOrCreateAgencyContact()])
      .then(([usersData, agency]) => {
        setUsers(usersData);
        return listEvents(agency.id);
      })
      .then((events) => {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(startOfDay);
        endOfDay.setDate(endOfDay.getDate() + 1);
        setTodaysEvents(
          events
            .filter((event) => new Date(event.starts_at) >= startOfDay && new Date(event.starts_at) < endOfDay)
            .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
        );
      })
      .finally(() => setIsLoading(false));
  }, []);

  const activeUsers = users.filter((u) => u.is_active);
  const inactiveUsers = users.filter((u) => !u.is_active);

  // Démonstration statique : personne n'a de champ "en congé" côté backend,
  // on illustre le concept avec deux membres réels de l'effectif.
  const congesEnCours: CongeEntry[] = useMemo(() => {
    if (activeUsers.length < 2) return [];
    return [
      { user: activeUsers[1], du: '19 août', au: '24 août' },
      { user: activeUsers[Math.min(3, activeUsers.length - 1)], du: '21 août', au: '22 août' },
    ];
  }, [activeUsers]);

  const recentAccounts = [...users].sort((a, b) => b.date_joined.localeCompare(a.date_joined)).slice(0, 5);

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
            <span className="material-symbols-outlined text-[20px]">badge</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-headline-md text-xl font-extrabold text-slate-900 tracking-tight">Gestion du Capital Humain</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary">ADCH</span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">Comptes, agenda du DG et congés — vue d'ensemble RH.</p>
          </div>
        </div>
        <a
          className="flex items-center gap-1.5 bg-primary hover:bg-on-primary-fixed-variant text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs hover:shadow-md active:scale-95 transition-all shrink-0"
          href="/utilisateurs"
        >
          <span className="material-symbols-outlined text-[16px]">group</span>
          Gérer les utilisateurs
        </a>
      </header>

      {/* ==================================================================== */}
      {/* KPIS                                                                 */}
      {/* ==================================================================== */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Effectif total</span>
            <span className="material-symbols-outlined text-slate-400 text-[18px]">groups</span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight font-headline-md">{users.length}</div>
        </div>

        <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/60 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 text-xs font-medium mb-1">
            <span>Comptes actifs</span>
            <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight font-headline-md">{activeUsers.length}</div>
        </div>

        <div
          className={`p-4 rounded-xl border shadow-2xs flex flex-col justify-between ${
            inactiveUsers.length > 0 ? 'bg-amber-50/50 border-amber-200/60' : 'bg-slate-50 border-slate-200/70'
          }`}
        >
          <div className="flex items-center justify-between text-slate-600 text-xs font-medium mb-1">
            <span>Comptes inactifs</span>
            <span className={`material-symbols-outlined text-[18px] ${inactiveUsers.length > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
              person_off
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight font-headline-md">{inactiveUsers.length}</div>
        </div>

        <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/60 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 text-xs font-medium mb-1">
            <span>En congé aujourd'hui</span>
            <span className="material-symbols-outlined text-amber-600 text-[18px]">beach_access</span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight font-headline-md">{congesEnCours.length}</div>
        </div>

        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200/60 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 text-xs font-medium mb-1">
            <span>RDV du DG aujourd'hui</span>
            <span className="material-symbols-outlined text-blue-600 text-[18px]">event</span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight font-headline-md">{todaysEvents.length}</div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* AGENDA DU DG + CONGÉS EN COURS                                       */}
      {/* ==================================================================== */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-headline-md text-sm font-bold text-slate-900">Agenda du DG — Aujourd'hui</h2>
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">EN DIRECT</span>
          </div>
          <div className="p-4 flex-1 space-y-2">
            {todaysEvents.length > 0 ? (
              todaysEvents.map((event) => {
                const meta = EVENT_TYPE_OPTIONS.find((option) => option.value === event.event_type);
                return (
                  <div className="flex items-center gap-3 px-3.5 py-2.5 bg-slate-50 rounded-xl" key={event.id}>
                    <span className="text-xs font-bold text-slate-400 w-12 shrink-0">{formatTime(event.starts_at)}</span>
                    <span className="material-symbols-outlined text-[18px] text-primary shrink-0">{meta?.icon ?? 'event'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 truncate">{event.title}</p>
                      {event.location && <p className="text-xs text-slate-500 truncate">{event.location}</p>}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">Aucun rendez-vous prévu aujourd'hui.</p>
            )}
          </div>
          <div className="p-4 pt-0">
            <a
              className="block w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors text-center"
              href="/adch/agenda-dg"
            >
              Gérer l'agenda du DG
            </a>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-headline-md text-sm font-bold text-slate-900">Congés en cours</h2>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              {congesEnCours.length}
            </span>
          </div>
          <div className="p-4 flex-1 space-y-2">
            {congesEnCours.length > 0 ? (
              congesEnCours.map((entry) => (
                <div className="flex items-center gap-3 px-3.5 py-2.5 bg-slate-50 rounded-xl" key={entry.user.id}>
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                    {getInitials(`${entry.user.first_name} ${entry.user.last_name}`)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {entry.user.first_name} {entry.user.last_name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{entry.user.role_display}</p>
                  </div>
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full shrink-0">
                    {entry.du} → {entry.au}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">Personne en congé pour l'instant.</p>
            )}
          </div>
          <div className="p-4 pt-0">
            <a
              className="block w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors text-center"
              href="/adch/conges"
            >
              Gérer les congés
            </a>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* DERNIERS COMPTES CRÉÉS                                               */}
      {/* ==================================================================== */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5">
        <h2 className="font-headline-md text-sm font-bold text-slate-900 mb-3">Derniers comptes créés</h2>
        <div className="space-y-1">
          {recentAccounts.map((account) => (
            <div className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-slate-50 rounded-xl transition-colors" key={account.id}>
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                {getInitials(`${account.first_name} ${account.last_name}`)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {account.first_name} {account.last_name}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {account.role_display}
                  {account.division_name && ` · ${account.division_name}`}
                </p>
              </div>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                  account.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {account.is_active ? 'Actif' : 'Inactif'}
              </span>
              <span className="text-xs text-slate-400 shrink-0 w-20 text-right">{formatShortDate(account.date_joined)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
