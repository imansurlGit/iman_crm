import { NavLink } from 'react-router-dom';
import { LOGO_URL } from '../../constants/brand';
import { useAuth } from '../../context/AuthContext';
import SidebarCommercial from './SidebarCommercial';
import SidebarDeveloppeur from './SidebarDeveloppeur';
import SidebarGraphiste from './SidebarGraphiste';
import SidebarCdv from './SidebarCdv';
import SidebarComptable from './SidebarComptable';
import SidebarVip from './SidebarVip';
import SidebarDg from './SidebarDg';

interface NavItem {
  label: string;
  to: string;
  icon: string;
  /** Si défini, cet item n'est visible que pour ces fonctions (au sein d'une section par ailleurs commune). */
  roles?: string[];
}

interface NavSection {
  label?: string;
  items: NavItem[];
  /** Si défini, la section n'est visible que pour ces fonctions. */
  roles?: string[];
}

// Doit rester synchro avec `core.permissions.USER_MANAGEMENT_ROLES` côté backend.
// Le DG est un titre métier, pas un accès technique : il n'y figure pas.
const USER_MANAGEMENT_ROLES = ['ADMIN', 'ADCH'];

const NAV_SECTIONS: NavSection[] = [
  {
    items: [{ label: 'Tableau de bord', to: '/dashboard', icon: 'space_dashboard' }],
  },
  {
    label: 'Partenariats',
    roles: ['ADMIN'],
    items: [
      { label: 'Partenaires', to: '/partenaires', icon: 'handshake' },
      { label: 'Suivi partenariats', to: '/partenariats/suivi', icon: 'view_kanban' },
    ],
  },
  {
    label: 'Templates UI',
    roles: ['ADMIN'],
    items: [
      { label: 'Opportunite template', to: '/templates/opportunite', icon: 'auto_awesome' },
      { label: 'Prospect template 1', to: '/templates/prospect', icon: 'inventory_2' },
      { label: 'Prospect template 2 (CV)', to: '/templates/prospect-2', icon: 'badge' },
      { label: 'Client template', to: '/templates/client', icon: 'workspace_premium' },
      { label: 'Dashboard CDV template', to: '/templates/dashboard-cdv', icon: 'space_dashboard' },
      { label: 'Dashboard DG template', to: '/templates/dashboard-dg', icon: 'space_dashboard' },
    ],
  },
  {
    label: 'Opérations & Production',
    roles: ['CDM'],
    items: [
      { label: 'Projets', to: '/projets', icon: 'account_tree' },
      { label: 'Feuille de tâches', to: '/cdm/taches', icon: 'checklist' },
      { label: 'Calendrier collaboratif', to: '/calendrier-collaboratif', icon: 'calendar_month' },
    ],
  },
  {
    label: "Fiches & Carnet d'adresses",
    roles: ['CHARGE_PARTENARIAT'],
    items: [{ label: 'Partenaires', to: '/partenaires', icon: 'handshake' }],
  },
  {
    label: 'Opérations & Production',
    roles: ['CHARGE_PARTENARIAT'],
    items: [
      { label: 'Dossiers partenariat', to: '/partenariats/dossiers', icon: 'folder_shared' },
      { label: 'Feuilles de tâches', to: '/feuilles-de-taches', icon: 'checklist' },
      { label: 'Calendrier collaboratif', to: '/calendrier-collaboratif', icon: 'calendar_month' },
    ],
  },
  {
    label: 'Opérations & Production',
    roles: ['CDN'],
    items: [
      { label: 'Projets', to: '/projets', icon: 'account_tree' },
      { label: 'Feuille de tâches', to: '/cdn/taches', icon: 'checklist' },
      { label: 'Calendrier collaboratif', to: '/calendrier-collaboratif', icon: 'calendar_month' },
    ],
  },
  {
    label: 'Mon équipe',
    roles: ['RDW'],
    items: [
      { label: 'Mon équipe', to: '/rdw/equipe', icon: 'groups' },
      { label: 'Projets', to: '/rdw/projets', icon: 'account_tree' },
      { label: "Tâches de l'équipe", to: '/rdw/taches', icon: 'checklist' },
      { label: 'Calendrier collaboratif', to: '/calendrier-collaboratif', icon: 'calendar_month' },
    ],
  },
  {
    label: 'Ressources Humaines',
    roles: ['ADCH'],
    items: [
      { label: 'Agenda du DG', to: '/adch/agenda-dg', icon: 'event' },
      { label: 'Congés', to: '/adch/conges', icon: 'beach_access' },
      { label: 'Comptes & connexions', to: '/adch/comptes', icon: 'admin_panel_settings' },
      { label: 'Calendrier collaboratif', to: '/calendrier-collaboratif', icon: 'calendar_month' },
    ],
  },
  {
    roles: USER_MANAGEMENT_ROLES,
    items: [{ label: 'Gestion des utilisateurs', to: '/utilisateurs', icon: 'group' }],
  },
  {
    label: 'Communication & Marketing',
    items: [
      { label: 'Validations', to: '/centre-validation', icon: 'verified', roles: ['CDN', 'CDV', 'CDM'] },
      { label: 'Documents', to: '/documents', icon: 'folder_open' },
      { label: 'Messagerie', to: '/messagerie', icon: 'mail' },
    ],
  },
];

export default function Sidebar() {
  const { user } = useAuth();

  // Le rôle COMMERCIAL a désormais son propre menu, pensé pour son usage
  // quotidien plutôt que dérivé des sections génériques ci-dessous.
  if (user?.role === 'COMMERCIAL') {
    return <SidebarCommercial />;
  }

  if (user?.role === 'DEVELOPPEUR') {
    return <SidebarDeveloppeur />;
  }

  if (user?.role === 'GRAPHISTE') {
    return <SidebarGraphiste />;
  }

  if (user?.role === 'CDV') {
    return <SidebarCdv />;
  }

  if (user?.role === 'COMPTABLE_GENERAL' || user?.role === 'ASSISTANT_COMPTABLE') {
    return <SidebarComptable />;
  }

  if (user?.role === 'VIP') {
    return <SidebarVip />;
  }

  if (user?.role === 'DG') {
    return <SidebarDg />;
  }

  function isVisible(roles: string[] | undefined) {
    return !roles || (!!user?.role && roles.includes(user.role));
  }

  const visibleSections = NAV_SECTIONS.filter((section) => isVisible(section.roles))
    .map((section) => ({ ...section, items: section.items.filter((item) => isVisible(item.roles)) }))
    .filter((section) => section.items.length > 0);

  return (
    <aside className="hidden lg:flex lg:flex-col w-sidebar-width shrink-0 relative overflow-hidden bg-black text-white border-r border-white/10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.10),_transparent_55%)]"
      />

      <div className="relative flex flex-col h-full">
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-white/10">
          <img alt="Logo Agence Iman" className="h-8 w-8 rounded object-cover shrink-0" src={LOGO_URL} />
          <div className="flex flex-col leading-tight min-w-0">
            <span className="font-headline-md text-[14px] font-bold tracking-tight truncate">Agence Iman</span>
            <span className="font-label-md text-label-md text-white/40 uppercase tracking-widest text-[9px]">
              Iman CRM
            </span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {visibleSections.map((section, index) => (
            <div key={section.label ?? `section-${index}`}>
              {index > 0 && <div className="my-4 border-t border-white/10" />}
              {section.label && (
                <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/35">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-lg font-body-sm text-body-sm transition-colors ${
                        isActive ? 'bg-primary text-white font-medium' : 'text-white/60 hover:bg-white/5 hover:text-white'
                      }`
                    }
                  >
                    <span className="material-symbols-outlined text-[18px] shrink-0">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
