import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getContact, STAGE_OPTIONS, type Contact } from '../../services/contactService';
import { listInteractions, INTERACTION_TYPE_OPTIONS, type Interaction } from '../../services/interactionService';
import { listProjects, STATUS_BADGE_CLASSES, formatProjectDeadline, type Project } from '../../services/projectService';

type TabKey = 'APERCU' | 'PROSPECTION' | 'PROJETS' | 'FINANCES';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'APERCU', label: 'Vue d’ensemble', icon: 'account_circle' },
  { key: 'PROSPECTION', label: 'Prospection', icon: 'person_search' },
  { key: 'PROJETS', label: 'Projets', icon: 'account_tree' },
  { key: 'FINANCES', label: 'Finances', icon: 'account_balance_wallet' },
];

const CARD_CLASSES = 'bg-white rounded-xl border border-outline-variant';

const INTERACTION_ICON_BY_TYPE = Object.fromEntries(
  INTERACTION_TYPE_OPTIONS.map((option) => [option.value, option.icon]),
) as Record<Interaction['interaction_type'], string>;

const ATTACHMENT_ICON_BY_EXT: Record<string, string> = {
  pdf: 'picture_as_pdf',
  xlsx: 'table_chart',
  xls: 'table_chart',
  docx: 'description',
  doc: 'description',
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
};

function attachmentIcon(url: string): string {
  const extension = url.split('.').pop()?.split('?')[0]?.toLowerCase() ?? '';
  return ATTACHMENT_ICON_BY_EXT[extension] ?? 'attach_file';
}

function attachmentName(url: string): string {
  try {
    return decodeURIComponent(url.split('/').pop() ?? url);
  } catch {
    return url;
  }
}

function formatInteractionTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatFcfa(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} FCFA`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function projectFinancials(project: Project) {
  const budget = Number(project.budget ?? 0) || 0;
  const depositAmount = Number(project.deposit_amount ?? 0) || 0;
  const paid = project.final_payment_received ? budget : project.deposit_received ? depositAmount : 0;
  return { budget, paid, due: budget - paid };
}

function InteractionRow({ item }: { item: Interaction }) {
  return (
    <div className="flex items-start gap-3 bg-surface-container-low/60 rounded-lg p-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-primary/10 text-primary">
        <span className="material-symbols-outlined text-[16px]">{INTERACTION_ICON_BY_TYPE[item.interaction_type]}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-on-surface">{item.title || item.interaction_type_display}</span>
          <span className="text-[11px] text-secondary shrink-0">{formatInteractionTimestamp(item.occurred_at)}</span>
        </div>
        {item.description && <p className="text-sm text-on-surface-variant mt-0.5 leading-relaxed">{item.description}</p>}
        {item.attachment && (
          <a
            className="mt-2 inline-flex items-center gap-1.5 bg-white border border-outline-variant rounded-lg px-2.5 py-1.5 text-xs font-semibold text-on-surface hover:border-primary/40 hover:text-primary transition-colors"
            href={item.attachment}
            rel="noreferrer"
            target="_blank"
          >
            <span className="material-symbols-outlined text-[15px] text-secondary">{attachmentIcon(item.attachment)}</span>
            <span className="truncate max-w-[220px]">{attachmentName(item.attachment)}</span>
            <span className="material-symbols-outlined text-[14px] text-secondary">download</span>
          </a>
        )}
      </div>
    </div>
  );
}

export default function ClientDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [contact, setContact] = useState<Contact | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('APERCU');

  useEffect(() => {
    const contactId = Number(id);
    if (!contactId) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    Promise.all([getContact(contactId), listProjects({ client: contactId, kind: 'PROJET' }), listInteractions(contactId)])
      .then(([contactData, projectsData, interactionsData]) => {
        setContact(contactData);
        setProjects(projectsData);
        setInteractions(interactionsData);
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return <p className="font-body-sm text-body-sm text-secondary">Chargement...</p>;
  }

  if (notFound || !contact) {
    return (
      <div className="space-y-3">
        <p className="font-body-sm text-body-sm text-secondary">Ce client est introuvable.</p>
        <button className="text-primary text-sm font-semibold hover:underline" onClick={() => navigate('/clients')} type="button">
          Retour aux clients
        </button>
      </div>
    );
  }

  const isConvertedProspect = Boolean(contact.converted_at);
  const clientSince = contact.converted_at ?? contact.created_at;
  const currentStageIndex = Math.max(0, STAGE_OPTIONS.findIndex((s) => s.value === contact.stage));

  const preConversionInteractions = isConvertedProspect
    ? interactions
        .filter((item) => new Date(item.occurred_at).getTime() <= new Date(contact.converted_at as string).getTime())
        .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
    : [];
  const postConversionInteractions = interactions
    .filter((item) => !isConvertedProspect || new Date(item.occurred_at).getTime() > new Date(contact.converted_at as string).getTime())
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());

  const financials = projects.map((project) => ({ project, ...projectFinancials(project) }));
  const totalGenere = financials.reduce((sum, f) => sum + f.budget, 0);
  const totalEncaisse = financials.reduce((sum, f) => sum + f.paid, 0);
  const soldeDu = totalGenere - totalEncaisse;

  const ongoingProject = projects.find((project) => project.status !== 'LIVRE' && project.status !== 'CLOTURE');

  const titleParts = [contact.name, contact.sector].filter(Boolean);

  return (
    <div className="max-w-6xl mx-auto">
      {/* En-tête compte */}
      <div className={`${CARD_CLASSES} overflow-hidden`}>
        <div className="h-16 bg-[linear-gradient(120deg,#680200_0%,#8a1a0e_100%)]" />
        <div className="px-8 pt-4 pb-6 flex flex-wrap items-start gap-4">
          <div className="w-14 h-14 -mt-10 rounded-xl bg-white text-primary flex items-center justify-center border border-outline-variant shadow-md shrink-0">
            <span className="material-symbols-outlined text-[26px]">apartment</span>
          </div>
          <div className="flex-1 min-w-[220px]">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-headline-md text-xl font-bold text-on-surface">{contact.company || contact.name}</h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                <span className="material-symbols-outlined text-[12px]">verified</span>
                Client actif
              </span>
            </div>
            <p className="text-sm text-secondary mt-0.5">{titleParts.length > 0 ? titleParts.join(' · ') : contact.entity_type_display}</p>
          </div>
          <button
            className="px-4 py-2 text-sm bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors shrink-0"
            onClick={() => navigate(`/projets/nouveau?client=${contact.id}`)}
            type="button"
          >
            Nouveau projet
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-outline-variant px-8 py-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">Client depuis</p>
            <p className="text-sm font-bold text-on-surface mt-1">{formatDate(clientSince)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">Projets</p>
            <p className="text-sm font-bold text-on-surface mt-1">{projects.length}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">CA généré</p>
            <p className="text-sm font-bold text-on-surface mt-1">{formatFcfa(totalGenere)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">Solde dû</p>
            <p className={`text-sm font-bold mt-1 ${soldeDu > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
              {soldeDu > 0 ? formatFcfa(soldeDu) : 'À jour'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="flex items-center gap-1 border-b border-outline-variant mt-6 mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${
              activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-secondary hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Onglet : Vue d'ensemble */}
      {activeTab === 'APERCU' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-gutter items-start">
          <div className={`${CARD_CLASSES} p-5 lg:col-span-2`}>
            <h3 className="font-headline-md text-base font-bold text-on-surface mb-4">Informations générales</h3>
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-2.5 text-sm">
                <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">call</span>
                <span className="text-on-surface">{contact.phone || '—'}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">mail</span>
                <span className="text-on-surface truncate">{contact.email || '—'}</span>
              </div>
              {contact.address && (
                <div className="flex items-center gap-2.5 text-sm">
                  <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">location_on</span>
                  <span className="text-on-surface">{contact.address}</span>
                </div>
              )}
              {contact.sector && (
                <div className="flex items-center gap-2.5 text-sm">
                  <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">business_center</span>
                  <span className="text-on-surface">{contact.sector}</span>
                </div>
              )}
            </div>

            <div className="mt-5 pt-5 border-t border-outline-variant">
              <p className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-2">Commercial assigné</p>
              {contact.assigned_to_name ? (
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-xs font-bold shrink-0">
                    {getInitials(contact.assigned_to_name)}
                  </div>
                  <span className="text-sm font-semibold text-on-surface">{contact.assigned_to_name}</span>
                </div>
              ) : (
                <p className="text-sm text-secondary">Non assigné</p>
              )}
            </div>

            <div className="mt-5 pt-5 border-t border-outline-variant">
              <p className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-2">Origine</p>
              <div className="flex items-start gap-2 text-sm text-on-surface-variant leading-relaxed">
                <span className="material-symbols-outlined text-[18px] text-emerald-600 shrink-0">
                  {isConvertedProspect ? 'workspace_premium' : 'domain_add'}
                </span>
                <p>
                  {isConvertedProspect ? (
                    <>
                      Converti depuis un prospect le <span className="font-semibold text-on-surface">{formatDate(contact.converted_at as string)}</span>.
                    </>
                  ) : (
                    <>
                      Enregistré directement comme client le <span className="font-semibold text-on-surface">{formatDate(contact.created_at)}</span>.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className={`${CARD_CLASSES} p-5 lg:col-span-3`}>
            <h3 className="font-headline-md text-base font-bold text-on-surface mb-4">Activité récente</h3>
            <div className="space-y-2">
              {postConversionInteractions.map((item) => (
                <InteractionRow item={item} key={item.id} />
              ))}
              {postConversionInteractions.length === 0 && (
                <p className="text-sm text-secondary">Aucun échange enregistré pour le moment.</p>
              )}
            </div>

            {ongoingProject && (
              <div className="mt-5 pt-5 border-t border-outline-variant">
                <p className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-2">Projet en cours</p>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-on-surface">{ongoingProject.name}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE_CLASSES[ongoingProject.status]}`}>
                    {ongoingProject.status_display}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Onglet : Prospection */}
      {activeTab === 'PROSPECTION' && (
        <div className="flex flex-col gap-gutter">
          {isConvertedProspect ? (
            <>
              <div className={`${CARD_CLASSES} p-5`}>
                <div className="flex items-center justify-between gap-3 mb-5">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-primary">Parcours avant conversion</h3>
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-full">
                    Prospect converti
                  </span>
                </div>

                <div className="flex items-start">
                  {STAGE_OPTIONS.flatMap((stage, index) => {
                    const isReached = index <= currentStageIndex;
                    const card = (
                      <div className="flex flex-col items-center gap-1.5 shrink-0 w-28" key={stage.value}>
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${
                            isReached ? 'bg-primary text-white' : 'bg-surface-container-high text-secondary'
                          }`}
                        >
                          {index === STAGE_OPTIONS.length - 1 ? (
                            <span className="material-symbols-outlined text-[16px]">workspace_premium</span>
                          ) : (
                            index + 1
                          )}
                        </div>
                        <span className={`text-xs font-bold text-center leading-tight ${isReached ? 'text-on-surface' : 'text-secondary'}`}>
                          {stage.label}
                        </span>
                      </div>
                    );
                    if (index === STAGE_OPTIONS.length - 1) return [card];
                    const connectorDone = index < currentStageIndex;
                    const connector = (
                      <div
                        className={`flex-1 min-w-[12px] h-0.5 mt-4 mx-1 rounded-full ${connectorDone ? 'bg-primary' : 'bg-outline-variant/40'}`}
                        key={`${stage.value}-connector`}
                      />
                    );
                    return [card, connector];
                  })}
                </div>

                <div className="mt-6 flex items-start justify-between gap-4 rounded-lg border border-outline-variant/70 p-3.5 bg-surface-container-low/50">
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    <span className="mr-1.5">🎉</span>
                    <span className="font-bold text-on-surface">Converti en client{contact.assigned_to_name ? ` — suivi par ${contact.assigned_to_name}` : ''}</span>
                  </p>
                  <span className="shrink-0 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">
                    {formatDate(contact.converted_at as string)}
                  </span>
                </div>
              </div>

              <div className={`${CARD_CLASSES} p-5`}>
                <h3 className="font-headline-md text-base font-bold text-on-surface mb-5">Historique de prospection</h3>
                <div className="space-y-2">
                  {preConversionInteractions.map((item) => (
                    <InteractionRow item={item} key={item.id} />
                  ))}
                  {preConversionInteractions.length === 0 && (
                    <p className="text-sm text-secondary">Aucun échange enregistré avant la conversion.</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className={`${CARD_CLASSES} p-8 flex flex-col items-center justify-center gap-2 text-center`}>
              <span className="material-symbols-outlined text-[28px] text-secondary opacity-60">domain_add</span>
              <p className="text-sm text-secondary">
                Ce client a été enregistré directement, sans étape de prospection préalable.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Onglet : Projets */}
      {activeTab === 'PROJETS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
          {financials.map(({ project, budget, paid, due }) => {
            const progressPct = budget > 0 ? Math.round((paid / budget) * 100) : 0;
            return (
              <div className={`${CARD_CLASSES} p-5`} key={project.id}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">account_tree</span>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${STATUS_BADGE_CLASSES[project.status]}`}>
                    {project.status_display}
                  </span>
                </div>
                <button
                  className="text-sm font-bold text-on-surface hover:text-primary transition-colors text-left"
                  onClick={() => navigate(`/projets/${project.id}`)}
                  type="button"
                >
                  {project.name}
                </button>
                <p className="text-xs text-secondary mt-0.5">Échéance : {formatProjectDeadline(project.deadline)}</p>

                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-secondary">Montant</span>
                  <span className="font-bold text-on-surface">{formatFcfa(budget)}</span>
                </div>
                <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progressPct}%` }} />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[11px] text-secondary">{formatFcfa(paid)} encaissé</span>
                  <span className={`text-[11px] font-semibold ${due > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                    {due > 0 ? `Solde : ${formatFcfa(due)}` : 'Payé'}
                  </span>
                </div>
              </div>
            );
          })}
          {financials.length === 0 && (
            <div className={`${CARD_CLASSES} p-8 md:col-span-2 flex flex-col items-center justify-center gap-2 text-center`}>
              <span className="material-symbols-outlined text-[28px] text-secondary opacity-60">account_tree</span>
              <p className="text-sm text-secondary">Aucun projet pour ce client pour le moment.</p>
            </div>
          )}
        </div>
      )}

      {/* Onglet : Finances */}
      {activeTab === 'FINANCES' && (
        <div className="flex flex-col gap-gutter">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-gutter">
            <div className={`${CARD_CLASSES} p-5`}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">Chiffre d&apos;affaires généré</p>
              <p className="text-2xl font-bold text-on-surface mt-2">{formatFcfa(totalGenere)}</p>
              <p className="text-xs text-secondary mt-1">Sur {projects.length} projet{projects.length > 1 ? 's' : ''}</p>
            </div>
            <div className={`${CARD_CLASSES} p-5`}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">Total encaissé</p>
              <p className="text-2xl font-bold text-emerald-700 mt-2">{formatFcfa(totalEncaisse)}</p>
              <p className="text-xs text-secondary mt-1">
                {totalGenere > 0 ? Math.round((totalEncaisse / totalGenere) * 100) : 0}% du chiffre d&apos;affaires généré
              </p>
            </div>
            <div className={`${CARD_CLASSES} p-5 ${soldeDu > 0 ? 'bg-red-50/40 border-red-200' : ''}`}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">Solde dû</p>
              <p className={`text-2xl font-bold mt-2 ${soldeDu > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                {soldeDu > 0 ? formatFcfa(soldeDu) : '0 FCFA'}
              </p>
              <p className="text-xs text-secondary mt-1">{soldeDu > 0 ? 'Créance en attente de règlement' : 'Compte à jour'}</p>
            </div>
          </div>

          <div className={`${CARD_CLASSES} p-5`}>
            <h3 className="font-headline-md text-base font-bold text-on-surface mb-4">Détail par projet</h3>
            {financials.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] font-bold uppercase tracking-wide text-secondary border-b border-outline-variant">
                      <th className="pb-2 pr-3">Projet</th>
                      <th className="pb-2 pr-3">Statut</th>
                      <th className="pb-2 pr-3 text-right">Montant</th>
                      <th className="pb-2 pr-3 text-right">Encaissé</th>
                      <th className="pb-2 text-right">Solde dû</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financials.map(({ project, budget, paid, due }) => (
                      <tr className="border-b border-outline-variant/60 last:border-0" key={project.id}>
                        <td className="py-2.5 pr-3 font-semibold text-on-surface">{project.name}</td>
                        <td className="py-2.5 pr-3">
                          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${STATUS_BADGE_CLASSES[project.status]}`}>
                            {project.status_display}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-right text-on-surface">{formatFcfa(budget)}</td>
                        <td className="py-2.5 pr-3 text-right text-emerald-700">{formatFcfa(paid)}</td>
                        <td className={`py-2.5 text-right font-semibold ${due > 0 ? 'text-red-700' : 'text-secondary'}`}>
                          {due > 0 ? formatFcfa(due) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-outline-variant font-bold">
                      <td className="pt-2.5 pr-3 text-on-surface">Total</td>
                      <td className="pt-2.5 pr-3" />
                      <td className="pt-2.5 pr-3 text-right text-on-surface">{formatFcfa(totalGenere)}</td>
                      <td className="pt-2.5 pr-3 text-right text-emerald-700">{formatFcfa(totalEncaisse)}</td>
                      <td className={`pt-2.5 text-right ${soldeDu > 0 ? 'text-red-700' : 'text-secondary'}`}>
                        {soldeDu > 0 ? formatFcfa(soldeDu) : '—'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-sm text-secondary">Aucun projet pour ce client pour le moment.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
