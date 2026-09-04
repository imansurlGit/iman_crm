import { useEffect } from 'react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Défaut : "Succès". */
  title?: string;
  /** Message dynamique décrivant l'action qui vient de réussir. */
  message: string;
  /** Ferme automatiquement le modal après ce délai (ms). Désactivé si absent. */
  autoCloseMs?: number;
}

export default function SuccessModal({ isOpen, onClose, title = 'Succès', message, autoCloseMs }: SuccessModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !autoCloseMs) return;
    const timer = setTimeout(onClose, autoCloseMs);
    return () => clearTimeout(timer);
  }, [isOpen, autoCloseMs, onClose]);

  if (!isOpen) return null;

  return (
    <div className="success-modal-backdrop fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="success-modal-card relative bg-white rounded-xl surface-card w-full max-w-sm text-center px-8 py-10">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center">
          <div className="success-modal-ring flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            <svg fill="none" height="32" viewBox="0 0 24 24" width="32">
              <circle cx="12" cy="12" fill="#e8f5e9" r="11" />
              <path
                className="success-modal-check"
                d="M7 12.5l3 3 7-7"
                pathLength={1}
                stroke="#228b57"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </div>
        </div>

        <h2 className="font-headline-md text-headline-md text-on-surface mb-2">{title}</h2>
        <p className="font-body-md text-body-md text-secondary">{message}</p>

        <button
          className="mt-8 w-full py-2.5 rounded bg-on-primary-fixed-variant text-white font-body-sm text-body-sm font-bold hover:bg-primary transition-colors"
          onClick={onClose}
          type="button"
        >
          OK
        </button>
      </div>
    </div>
  );
}
