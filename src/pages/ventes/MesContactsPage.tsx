import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ScoreRing from '../../components/ScoreRing';
import ProspectFormModal from '../../components/ProspectFormModal';
import { useAuth } from '../../context/AuthContext';
import { listContacts, STAGE_BADGE_CLASSES, type Contact } from '../../services/contactService';

type ContactTab = 'PROSPECT' | 'CLIENT';

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

export default function MesContactsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ContactTab>('PROSPECT');
  const [prospects, setProspects] = useState<Contact[]>([]);
  const [clients, setClients] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  async function loadContacts() {
    setIsLoading(true);
    try {
      const [allProspects, allClients] = await Promise.all([listContacts('PROSPECT'), listContacts('CLIENT')]);
      setProspects(allProspects.filter((contact) => contact.assigned_to === user?.id));
      setClients(allClients.filter((contact) => contact.assigned_to === user?.id));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const contacts = activeTab === 'PROSPECT' ? prospects : clients;

  function openCreateModal() {
    setEditingContact(null);
    setIsModalOpen(true);
  }

  function openEditModal(contact: Contact) {
    setEditingContact(contact);
    setIsModalOpen(true);
  }

  const sectors = useMemo(
    () => Array.from(new Set(clients.map((c) => c.sector).filter((sector): sector is string => !!sector))).sort(),
    [clients],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return contacts.filter((contact) => {
      const matchesQuery =
        !query ||
        contact.name.toLowerCase().includes(query) ||
        contact.company.toLowerCase().includes(query) ||
        contact.phone.toLowerCase().includes(query) ||
        contact.email.toLowerCase().includes(query);
      const matchesSector = activeTab !== 'CLIENT' || !sectorFilter || contact.sector === sectorFilter;
      return matchesQuery && matchesSector;
    });
  }, [contacts, search, sectorFilter, activeTab]);

  const prospectAvgScore = prospects.length
    ? Math.round(prospects.reduce((sum, c) => sum + c.score, 0) / prospects.length)
    : 0;
  const prospectReadyToConvert = prospects.filter((c) => c.stage === 'CHIFFRAGE_OFFRE').length;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const clientsConvertedThisMonth = clients.filter((c) => c.converted_at && new Date(c.converted_at) >= monthStart).length;
  const sectorCounts = clients.reduce<Record<string, number>>((acc, c) => {
    if (!c.sector) return acc;
    acc[c.sector] = (acc[c.sector] ?? 0) + 1;
    return acc;
  }, {});
  const topSector = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1])[0];

  const kpis: { label: string; icon: string; value: string; suffix?: string }[] =
    activeTab === 'PROSPECT'
      ? [
          { label: 'Prospects', icon: 'person_search', value: String(prospects.length) },
          { label: 'Score moyen', icon: 'ads_click', value: String(prospectAvgScore), suffix: '/100' },
          { label: 'Prêts à convertir', icon: 'handshake', value: String(prospectReadyToConvert) },
        ]
      : [
          { label: 'Clients', icon: 'apartment', value: String(clients.length) },
          { label: 'Nouveaux ce mois', icon: 'new_releases', value: String(clientsConvertedThisMonth) },
          {
            label: 'Secteur dominant',
            icon: 'business_center',
            value: topSector ? topSector[0] : '—',
            suffix: topSector ? `${topSector[1]} client${topSector[1] > 1 ? 's' : ''}` : undefined,
          },
        ];

  return (
    <div className="flex flex-col gap-3">
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">Mes contacts</h2>
          <p className="text-sm text-secondary mt-0.5">Le catalogue des prospects et clients dont vous avez la charge.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1 p-1 bg-surface-container border border-outline-variant rounded-xl">
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'PROSPECT' ? 'bg-white text-on-surface shadow-sm' : 'text-secondary hover:text-on-surface'
              }`}
              onClick={() => setActiveTab('PROSPECT')}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">person_search</span>
              Prospects
            </button>
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'CLIENT' ? 'bg-white text-on-surface shadow-sm' : 'text-secondary hover:text-on-surface'
              }`}
              onClick={() => setActiveTab('CLIENT')}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">apartment</span>
              Clients
            </button>
          </div>
          <button
            className="flex items-center gap-1.5 bg-on-primary-fixed-variant text-white pl-3 pr-4 py-2 rounded-full text-xs font-bold shadow-sm hover:shadow-md hover:bg-primary active:scale-95 transition-all"
            onClick={openCreateModal}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            {activeTab === 'PROSPECT' ? 'Ajouter un prospect' : 'Nouveau client'}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {kpis.map((kpi) => (
          <div className="bg-surface-container-lowest border border-outline-variant p-3 flex items-center gap-2.5" key={kpi.label}>
            <span className="material-symbols-outlined text-primary-container text-xl shrink-0">{kpi.icon}</span>
            <div className="min-w-0">
              <span className="text-secondary text-[11px] font-medium block truncate">{kpi.label}</span>
              <div className="flex items-baseline gap-1">
                <span className="font-headline-md text-lg font-bold text-on-surface leading-tight truncate">{kpi.value}</span>
                {kpi.suffix && <span className="text-xs text-secondary truncate">{kpi.suffix}</span>}
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="bg-surface-container-lowest border border-outline-variant overflow-hidden flex flex-col">
        <div className="p-3 border-b border-outline-variant flex flex-col md:flex-row md:items-center gap-3 bg-surface">
          <div className="relative flex-1 md:max-w-xl">
            <span className="absolute inset-y-0 left-3 flex items-center text-outline">
              <span className="material-symbols-outlined text-sm">search</span>
            </span>
            <input
              className="w-full bg-surface-container border border-outline-variant py-1.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary-container transition-all"
              onChange={(event) => setSearch(event.target.value)}
              placeholder={activeTab === 'PROSPECT' ? 'Rechercher un de mes prospects...' : 'Rechercher un de mes clients...'}
              type="text"
              value={search}
            />
          </div>
          {activeTab === 'CLIENT' && (
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-outline pointer-events-none">
                <span className="material-symbols-outlined text-sm">business_center</span>
              </span>
              <select className={SELECT_CLASSES} onChange={(event) => setSectorFilter(event.target.value)} value={sectorFilter}>
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
          )}
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-secondary font-label-md text-label-md uppercase tracking-widest border-b border-outline-variant">
                <th className="px-4 py-2.5 font-semibold">Contact</th>
                {activeTab === 'PROSPECT' ? (
                  <>
                    <th className="px-4 py-2.5 font-semibold">Téléphone</th>
                    <th className="px-4 py-2.5 font-semibold">Étape</th>
                    <th className="px-4 py-2.5 font-semibold text-center">Score</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-2.5 font-semibold">Secteur</th>
                    <th className="px-4 py-2.5 font-semibold">Statut</th>
                  </>
                )}
                <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {activeTab === 'PROSPECT'
                ? filtered.map((contact) => (
                    <tr className="hover:bg-surface-container-low transition-colors" key={contact.id}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary text-[11px] font-bold shrink-0">
                            {getInitials(contact.name)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-primary-container text-sm truncate">{contact.name}</span>
                            <span className="text-xs text-secondary truncate">{contact.company || contact.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-1 text-sm text-on-surface">
                          <span className="material-symbols-outlined text-[15px] text-primary">call</span>
                          {contact.phone}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 text-[11px] font-bold border ${STAGE_BADGE_CLASSES[contact.stage]}`}>
                          {contact.stage_display}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <ScoreRing score={contact.score} />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            className="w-7 h-7 inline-flex items-center justify-center text-secondary border border-outline-variant hover:bg-surface-container-low hover:text-on-surface transition-all rounded"
                            onClick={() => openEditModal(contact)}
                            title="Modifier"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button
                            className="w-7 h-7 inline-flex items-center justify-center bg-primary-container text-on-primary hover:bg-primary transition-all shadow-sm rounded"
                            onClick={() => navigate(`/prospection/${contact.id}`)}
                            title="Voir / Mettre à jour"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                : filtered.map((contact) => (
                    <tr className="hover:bg-surface-container-low transition-colors" key={contact.id}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary text-[11px] font-bold shrink-0">
                            {getInitials(contact.name)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-primary-container text-sm truncate">{contact.name}</span>
                            <span className="text-xs text-secondary truncate">{contact.company || contact.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        {contact.sector ? (
                          <span className="flex items-center gap-1.5 text-sm text-on-surface-variant">
                            <span className="material-symbols-outlined text-[15px] text-secondary">business_center</span>
                            {contact.sector}
                          </span>
                        ) : (
                          <span className="text-sm text-secondary">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          Client Actif
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          className="w-7 h-7 inline-flex items-center justify-center bg-primary-container text-on-primary hover:bg-primary transition-all shadow-sm rounded"
                          onClick={() => navigate(`/clients/${contact.id}`)}
                          title="Voir Détail"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                        </button>
                      </td>
                    </tr>
                  ))}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-secondary font-body-sm" colSpan={5}>
                    {activeTab === 'PROSPECT'
                      ? 'Aucun prospect ne correspond à votre recherche.'
                      : 'Aucun client ne correspond à votre recherche.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ProspectFormModal
        contact={activeTab === 'PROSPECT' ? editingContact : null}
        contactType={activeTab}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={loadContacts}
      />
    </div>
  );
}
