// TODO: la liste des congés reste statique — aucun modèle de congé n'existe
// encore côté backend (voir AdchCongesPage). Comptes, effectifs et agenda du
// DG (via le contact réel « Interne (Agence) ») sont réels.

import { useEffect, useMemo, useState } from 'react';
import { listUsers, type CurrentUser } from '../services/userService';
import { getOrCreateAgencyContact } from '../services/contactService';
import { listEvents, EVENT_TYPE_OPTIONS, type ProspectEvent } from '../services/eventService';

const CARD_CLASSES = 'bg-white rounded-lg border border-outline-variant';

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
    return <p className="font-body-sm text-body-sm text-secondary">Chargement...</p>;
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-gutter">
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">Gestion du Capital Humain</h2>
          <p className="text-secondary mt-1 text-sm">Comptes, agenda du DG et congés — vue d'ensemble RH.</p>
        </div>
        <a
          className="flex items-center gap-1.5 bg-primary text-white pl-3 pr-4 py-2 rounded-full text-xs font-bold shadow-sm hover:shadow-md hover:bg-on-primary-fixed-variant active:scale-95 transition-all shrink-0"
          href="/utilisateurs"
        >
          <span className="material-symbols-outlined text-[16px]">group</span>
          Gérer les utilisateurs
        </a>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-gutter">
        <div className={`${CARD_CLASSES} p-4 flex items-center gap-3`}>
          <span className="material-symbols-outlined text-primary-container text-2xl shrink-0">groups</span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">Effectif total</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{users.length}</span>
          </div>
        </div>
        <div className={`${CARD_CLASSES} p-4 flex items-center gap-3`}>
          <span className="material-symbols-outlined text-emerald-600 text-2xl shrink-0">check_circle</span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">Comptes actifs</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{activeUsers.length}</span>
          </div>
        </div>
        <div className={`${CARD_CLASSES} p-4 flex items-center gap-3 ${inactiveUsers.length > 0 ? 'border-amber-300' : ''}`}>
          <span className={`material-symbols-outlined text-2xl shrink-0 ${inactiveUsers.length > 0 ? 'text-amber-600' : 'text-primary-container'}`}>
            person_off
          </span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">Comptes inactifs</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{inactiveUsers.length}</span>
          </div>
        </div>
        <div className={`${CARD_CLASSES} p-4 flex items-center gap-3`}>
          <span className="material-symbols-outlined text-amber-600 text-2xl shrink-0">beach_access</span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">En congé aujourd'hui</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{congesEnCours.length}</span>
          </div>
        </div>
        <div className={`${CARD_CLASSES} p-4 flex items-center gap-3`}>
          <span className="material-symbols-outlined text-primary-container text-2xl shrink-0">event</span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">RDV du DG aujourd'hui</span>
            <span className="font-headline-md text-headline-md text-on-surface leading-tight">{todaysEvents.length}</span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-12 gap-gutter">
        {/* Agenda du DG - aujourd'hui */}
        <div className={`${CARD_CLASSES} col-span-12 lg:col-span-6 flex flex-col`}>
          <div className="p-5 border-b border-outline-variant flex items-center justify-between">
            <h4 className="font-headline-md text-lg font-bold text-primary">Agenda du DG — Aujourd'hui</h4>
            <span className="text-[10px] font-bold text-primary bg-primary-fixed px-3 py-1 rounded-full">EN DIRECT</span>
          </div>
          <div className="p-4 flex-1 space-y-2.5">
            {todaysEvents.length > 0 ? (
              todaysEvents.map((event) => {
                const meta = EVENT_TYPE_OPTIONS.find((option) => option.value === event.event_type);
                return (
                  <div className="flex items-center gap-3 px-3.5 py-2.5 bg-surface-container-low rounded-lg" key={event.id}>
                    <span className="text-xs font-bold text-outline w-12 shrink-0">{formatTime(event.starts_at)}</span>
                    <span className="material-symbols-outlined text-[18px] text-primary shrink-0">{meta?.icon ?? 'event'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-on-surface truncate">{event.title}</p>
                      {event.location && <p className="text-xs text-secondary truncate">{event.location}</p>}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-secondary">Aucun rendez-vous prévu aujourd'hui.</p>
            )}
          </div>
          <a
            className="p-4 w-full text-center bg-surface-container-high text-primary text-sm font-bold hover:bg-surface-container-highest transition-all border-t border-outline-variant"
            href="/adch/agenda-dg"
          >
            Gérer l'agenda du DG
          </a>
        </div>

        {/* Congés en cours */}
        <div className={`${CARD_CLASSES} col-span-12 lg:col-span-6 flex flex-col`}>
          <div className="p-5 border-b border-outline-variant flex items-center justify-between">
            <h4 className="font-headline-md text-lg font-bold text-primary">Congés en cours</h4>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-full">{congesEnCours.length}</span>
          </div>
          <div className="p-4 flex-1 space-y-2.5">
            {congesEnCours.length > 0 ? (
              congesEnCours.map((entry) => (
                <div className="flex items-center gap-3 px-3.5 py-2.5 bg-surface-container-low rounded-lg" key={entry.user.id}>
                  <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-[11px] font-bold shrink-0">
                    {getInitials(`${entry.user.first_name} ${entry.user.last_name}`)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-on-surface truncate">
                      {entry.user.first_name} {entry.user.last_name}
                    </p>
                    <p className="text-xs text-secondary truncate">{entry.user.role_display}</p>
                  </div>
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-full shrink-0">
                    {entry.du} → {entry.au}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-secondary">Personne en congé pour l'instant.</p>
            )}
          </div>
          <a
            className="p-4 w-full text-center bg-surface-container-high text-primary text-sm font-bold hover:bg-surface-container-highest transition-all border-t border-outline-variant"
            href="/adch/conges"
          >
            Gérer les congés
          </a>
        </div>
      </section>

      {/* Derniers comptes */}
      <section className={`${CARD_CLASSES} p-6`}>
        <h4 className="font-headline-md text-lg font-bold text-primary mb-4">Derniers comptes créés</h4>
        <div className="space-y-2">
          {recentAccounts.map((account) => (
            <div className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-surface-container-low rounded-lg transition-colors" key={account.id}>
              <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-[11px] font-bold shrink-0">
                {getInitials(`${account.first_name} ${account.last_name}`)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-on-surface truncate">
                  {account.first_name} {account.last_name}
                </p>
                <p className="text-xs text-secondary truncate">
                  {account.role_display}
                  {account.division_name && ` · ${account.division_name}`}
                </p>
              </div>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                  account.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {account.is_active ? 'Actif' : 'Inactif'}
              </span>
              <span className="text-xs text-secondary shrink-0 w-20 text-right">{formatShortDate(account.date_joined)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
