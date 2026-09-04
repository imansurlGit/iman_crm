import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listContacts, type Contact } from '../../services/contactService';
import ProspectFormModal from '../../components/ProspectFormModal';

const SELECT_CLASSES =
  'bg-surface-container border border-outline-variant py-2 pl-9 pr-8 text-sm focus:outline-none focus:border-primary-container transition-all appearance-none';

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

interface Trend {
  label: string;
  direction: 'up' | 'down' | 'neutral';
}

/** Compare deux valeurs et rend une tendance honnête : pas de pourcentage
 * fantaisiste quand on n'a pas assez d'historique pour le justifier. */
function compareValues(current: number, previous: number | null): Trend {
  if (previous === null) {
    return { label: 'Historique insuffisant', direction: 'neutral' };
  }
  if (previous === 0) {
    return current > 0 ? { label: 'Nouveau ce mois-ci', direction: 'up' } : { label: 'Stable', direction: 'neutral' };
  }
  const change = Math.round(((current - previous) / previous) * 1000) / 10;
  if (change === 0) return { label: 'Stable', direction: 'neutral' };
  return { label: `${change > 0 ? '+' : ''}${change}% vs mois dernier`, direction: change > 0 ? 'up' : 'down' };
}

interface ClientKpisProps {
  clients: Contact[];
}

function ClientKpis({ clients }: ClientKpisProps) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const convertedBefore = (date: Date) => clients.filter((c) => c.converted_at && new Date(c.converted_at) < date);
  const convertedThisMonth = clients.filter((c) => c.converted_at && new Date(c.converted_at) >= monthStart);
  const convertedLastMonth = clients.filter((c) => {
    if (!c.converted_at) return false;
    const date = new Date(c.converted_at);
    return date >= lastMonthStart && date < monthStart;
  });
  const priorToThisMonth = convertedBefore(monthStart);

  const withoutCommercial = clients.filter((c) => !c.assigned_to_name);

  const sectorCounts = clients.reduce<Record<string, number>>((acc, c) => {
    if (!c.sector) return acc;
    acc[c.sector] = (acc[c.sector] ?? 0) + 1;
    return acc;
  }, {});
  const topSector = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1])[0];

  const kpis: { label: string; icon: string; value: string; suffix?: string; trend?: Trend; alert?: boolean }[] = [
    {
      label: 'Total Clients',
      icon: 'groups',
      value: String(clients.length),
      trend: compareValues(clients.length, priorToThisMonth.length),
    },
    {
      label: 'Nouveaux ce mois',
      icon: 'new_releases',
      value: String(convertedThisMonth.length),
      trend: compareValues(convertedThisMonth.length, convertedLastMonth.length),
    },
    {
      label: 'Sans commercial',
      icon: 'person_off',
      value: String(withoutCommercial.length),
      alert: withoutCommercial.length > 0,
    },
    {
      label: 'Secteur dominant',
      icon: 'business_center',
      value: topSector ? topSector[0] : '—',
      suffix: topSector ? `${topSector[1]} client${topSector[1] > 1 ? 's' : ''}` : undefined,
    },
  ];

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className={`bg-surface-container-lowest border p-4 flex items-center gap-3 ${
            kpi.alert ? 'border-error/30' : 'border-outline-variant'
          }`}
        >
          <span
            className={`material-symbols-outlined text-2xl shrink-0 ${
              kpi.alert ? 'text-error' : 'text-primary-container'
            }`}
          >
            {kpi.icon}
          </span>
          <div className="min-w-0">
            <span className="text-secondary text-xs font-medium block truncate">{kpi.label}</span>
            <div className="flex items-baseline gap-1">
              <span className="font-headline-md text-headline-md text-on-surface leading-tight truncate">
                {kpi.value}
              </span>
              {kpi.suffix && <span className="text-sm text-secondary truncate">{kpi.suffix}</span>}
            </div>
            {kpi.trend && (
              <div
                className={`flex items-center gap-1 text-[11px] font-bold ${
                  kpi.trend.direction === 'up'
                    ? 'text-green-700'
                    : kpi.trend.direction === 'down'
                      ? 'text-primary-container'
                      : 'text-secondary'
                }`}
              >
                {kpi.trend.direction !== 'neutral' && (
                  <span className="material-symbols-outlined text-xs">
                    {kpi.trend.direction === 'up' ? 'trending_up' : 'trending_down'}
                  </span>
                )}
                <span className="truncate">{kpi.trend.label}</span>
              </div>
            )}
            {kpi.alert && (
              <span className="text-[11px] font-bold text-error">À traiter en priorité</span>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}

export default function ClientsPage() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [repFilter, setRepFilter] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function loadContacts() {
    setIsLoading(true);
    try {
      setContacts(await listContacts('CLIENT'));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadContacts();
  }, []);

  const reps = useMemo(
    () => Array.from(new Set(contacts.map((c) => c.assigned_to_name).filter((name): name is string => !!name))).sort(),
    [contacts]
  );
  const hasUnassigned = useMemo(() => contacts.some((c) => !c.assigned_to_name), [contacts]);
  const sectors = useMemo(
    () => Array.from(new Set(contacts.map((c) => c.sector).filter((sector): sector is string => !!sector))).sort(),
    [contacts]
  );

  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return contacts.filter((contact) => {
      const matchesQuery =
        !query ||
        contact.name.toLowerCase().includes(query) ||
        contact.company.toLowerCase().includes(query) ||
        contact.email.toLowerCase().includes(query);
      const matchesRep =
        !repFilter || (repFilter === '__unassigned__' ? !contact.assigned_to_name : contact.assigned_to_name === repFilter);
      const matchesSector = !sectorFilter || contact.sector === sectorFilter;
      return matchesQuery && matchesRep && matchesSector;
    });
  }, [contacts, search, repFilter, sectorFilter]);

  return (
    <div className="flex flex-col gap-gutter">
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">Clients</h2>
          <p className="font-body-md text-body-md text-secondary mt-2">
            Les prospects convertis en client — suivez leurs projets et leur relation depuis leur fiche.
          </p>
        </div>
        <button
          className="flex items-center gap-2 bg-on-primary-fixed-variant text-white px-4 py-2 text-sm rounded font-bold hover:bg-primary transition-colors"
          onClick={() => setIsModalOpen(true)}
          type="button"
        >
          <span className="material-symbols-outlined text-lg">person_add</span>
          Nouveau Client
        </button>
      </section>

      <ClientKpis clients={contacts} />

      <section className="bg-surface-container-lowest border border-outline-variant overflow-hidden flex flex-col">
        <div className="p-gutter border-b border-outline-variant flex flex-col md:flex-row md:items-center gap-4 bg-surface">
          <div className="relative flex-1 md:max-w-xl">
            <span className="absolute inset-y-0 left-3 flex items-center text-outline">
              <span className="material-symbols-outlined text-sm">search</span>
            </span>
            <input
              className="w-full bg-surface-container border border-outline-variant py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary-container transition-all"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un client..."
              type="text"
              value={search}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-outline pointer-events-none">
                <span className="material-symbols-outlined text-sm">person</span>
              </span>
              <select className={SELECT_CLASSES} onChange={(event) => setRepFilter(event.target.value)} value={repFilter}>
                <option value="">Tous les commerciaux</option>
                {reps.map((rep) => (
                  <option key={rep} value={rep}>
                    {rep}
                  </option>
                ))}
                {hasUnassigned && <option value="__unassigned__">Non assigné</option>}
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline text-sm pointer-events-none">
                expand_more
              </span>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-outline pointer-events-none">
                <span className="material-symbols-outlined text-sm">business_center</span>
              </span>
              <select
                className={SELECT_CLASSES}
                onChange={(event) => setSectorFilter(event.target.value)}
                value={sectorFilter}
              >
                <option value="">Tous les secteurs</option>
                {sectors.map((sector) => (
                  <option key={sector} value={sector}>
                    {sector}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline text-sm pointer-events-none">
                expand_more
              </span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-secondary font-label-md text-label-md uppercase tracking-widest border-b border-outline-variant">
                <th className="px-gutter py-4 font-semibold">Contact</th>
                <th className="px-gutter py-4 font-semibold">Secteur</th>
                <th className="px-gutter py-4 font-semibold">Projets liés</th>
                <th className="px-gutter py-4 font-semibold">Commercial</th>
                <th className="px-gutter py-4 font-semibold">Statut</th>
                <th className="px-gutter py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filteredContacts.map((contact) => (
                <tr className="hover:bg-surface-container-low transition-colors" key={contact.id}>
                  <td className="px-gutter py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-on-primary text-xs font-bold shrink-0">
                        {getInitials(contact.name)}
                      </div>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-bold text-primary-container text-body-md truncate">{contact.name}</span>
                        {contact.company && (
                          <span className="text-sm font-semibold text-on-surface-variant truncate">
                            {contact.company}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs font-bold text-on-surface">
                          <span className="material-symbols-outlined text-[14px]">call</span>
                          {contact.phone}
                        </span>
                        <span className="text-xs text-secondary font-label-md lowercase truncate">{contact.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-gutter py-5">
                    {contact.sector ? (
                      <span className="flex items-center gap-1.5 text-sm text-on-surface-variant">
                        <span className="material-symbols-outlined text-[16px] text-secondary">business_center</span>
                        {contact.sector}
                      </span>
                    ) : (
                      <span className="text-sm text-secondary">—</span>
                    )}
                  </td>
                  <td className="px-gutter py-5">
                    <span className="text-xs text-secondary italic">Aucun projet</span>
                  </td>
                  <td className="px-gutter py-5">
                    {contact.assigned_to_name ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary-container flex items-center justify-center text-on-primary text-[10px] font-bold">
                          {getInitials(contact.assigned_to_name)}
                        </div>
                        <span className="text-sm font-medium">{contact.assigned_to_name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-error font-semibold italic">Non assigné</span>
                    )}
                  </td>
                  <td className="px-gutter py-5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Client Actif
                    </span>
                  </td>
                  <td className="px-gutter py-5 text-right">
                    <button
                      className="w-8 h-8 inline-flex items-center justify-center text-xs font-bold bg-primary-container text-on-primary hover:bg-primary transition-all shadow-sm rounded-lg"
                      onClick={() => navigate(`/clients/${contact.id}`)}
                      title="Voir Détail"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">visibility</span>
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && filteredContacts.length === 0 && (
                <tr>
                  <td className="px-gutter py-8 text-center text-secondary font-body-sm" colSpan={6}>
                    Aucun client ne correspond à votre recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ProspectFormModal
        contact={null}
        contactType="CLIENT"
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={loadContacts}
      />
    </div>
  );
}
