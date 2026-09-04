import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function UserMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  if (!user) {
    return null;
  }

  const fullName = `${user.first_name} ${user.last_name}`.trim() || user.email;

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-3 pl-4 border-l border-outline-variant hover:opacity-80 transition-opacity"
        onClick={() => setOpen((prev) => !prev)}
        type="button"
      >
        <div className="text-right">
          <p className="font-label-md text-label-md text-on-surface">{fullName}</p>
          <p className="font-label-md text-[11px] leading-[14px] font-semibold text-on-surface-variant">
            {user.role_display}
          </p>
        </div>
        {user.profile_picture ? (
          <img
            alt={fullName}
            className="w-10 h-10 rounded-full border-2 border-primary-container object-cover"
            src={user.profile_picture}
          />
        ) : (
          <div className="w-10 h-10 rounded-full border-2 border-primary-container bg-primary-container flex items-center justify-center text-on-primary font-label-md text-label-md">
            {getInitials(fullName)}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg surface-card py-2 z-30">
          <div className="px-4 py-2 border-b border-outline-variant">
            <p className="font-body-sm text-body-sm text-on-surface font-medium">{fullName}</p>
            <p className="font-label-md text-label-md text-secondary">{user.role_display}</p>
          </div>
          <button
            className="w-full flex items-center gap-3 px-4 py-2.5 font-body-sm text-body-sm text-on-surface hover:bg-surface-container-high transition-colors"
            onClick={() => {
              setOpen(false);
              navigate('/parametres');
            }}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px] text-outline">settings</span>
            Paramètres
          </button>
          <button
            className="w-full flex items-center gap-3 px-4 py-2.5 font-body-sm text-body-sm text-error hover:bg-error-container transition-colors"
            onClick={handleLogout}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Déconnexion
          </button>
        </div>
      )}
    </div>
  );
}
