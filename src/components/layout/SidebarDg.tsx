import { NavLink } from 'react-router-dom';
import { LOGO_URL } from '../../constants/brand';

interface DgNavItem {
  label: string;
  to: string;
  icon: string;
}

interface DgNavSection {
  label?: string;
  items: DgNavItem[];
}

// Menu dédié au rôle DG (Direction Générale) — même traitement compact que
// SidebarCdv.tsx / SidebarCommercial.tsx / SidebarDeveloppeur.tsx / SidebarGraphiste.tsx.
// Reprend pour l'instant les items existants du DG (portés depuis les
// sections génériques `roles: ['DG']` de Sidebar.tsx) — le contenu du menu
// reste à retravailler.
const NAV_SECTIONS: DgNavSection[] = [
  {
    items: [{ label: 'Tableau de bord', to: '/dashboard', icon: 'space_dashboard' }],
  },
  {
    label: 'Ventes',
    items: [
      { label: 'Contacts', to: '/dg/contacts', icon: 'contacts' },
      { label: 'Opportunités', to: '/dg/opportunites', icon: 'emoji_objects' },
      { label: 'Projets', to: '/dg/projets', icon: 'account_tree' },
      { label: 'Finance', to: '/dg/finance', icon: 'account_balance_wallet' },
    ],
  },
  {
    label: 'Collaboration',
    items: [
      { label: 'Mes tâches', to: '/dg/taches', icon: 'checklist' },
      { label: 'Mon Agenda', to: '/dg/calendrier', icon: 'calendar_month' },
      { label: 'Messagerie', to: '/messagerie', icon: 'mail' },
      { label: 'Documents', to: '/documents', icon: 'folder_open' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Validations', to: '/dg/validations', icon: 'verified' },
      { label: 'Analytics', to: '/dg/analytics', icon: 'monitoring' },
    ],
  },
];

export default function SidebarDg() {
  return (
    <aside className="hidden lg:flex lg:flex-col w-[212px] shrink-0 relative overflow-hidden bg-black text-white border-r border-white/10">
      {/* Effets de brillance — halo doux en haut + reflet diagonal */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.14),_transparent_55%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-12 -top-24 h-56 rotate-[8deg] bg-gradient-to-b from-white/10 to-transparent blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent"
      />

      <div className="relative flex flex-col h-full">
        <div className="flex items-center gap-2.5 px-4 h-16 border-b border-white/10 shrink-0">
          <div className="h-10 w-10 rounded-lg bg-white p-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.35)] shrink-0">
            <img alt="Logo Agence Iman" className="h-full w-full object-contain" src={LOGO_URL} />
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="font-headline-md text-[14px] font-bold tracking-tight truncate">Agence Iman</span>
            <span className="font-label-md text-[8px] text-white/40 uppercase tracking-widest">Direction Générale</span>
          </div>
        </div>

        <nav className="flex-1 px-2.5 py-3 overflow-y-auto">
          {NAV_SECTIONS.map((section, index) => (
            <div key={section.label ?? `section-${index}`}>
              {index > 0 && <div className="my-3 border-t border-white/10" />}
              {section.label && (
                <p className="px-2.5 mb-1.5 text-[9px] font-bold uppercase tracking-wider text-white/35">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    className={({ isActive }) =>
                      `group flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12.5px] transition-all duration-150 ${
                        isActive
                          ? 'bg-gradient-to-r from-primary to-primary/70 text-white font-semibold shadow-[0_2px_12px_rgba(139,26,14,0.55)]'
                          : 'text-white/55 font-medium hover:bg-white/[0.07] hover:text-white'
                      }`
                    }
                    key={item.to}
                    to={item.to}
                  >
                    <span className="material-symbols-outlined text-[17px] shrink-0">{item.icon}</span>
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
