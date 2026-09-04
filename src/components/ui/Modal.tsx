import { useEffect, type PropsWithChildren, type ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  footer?: ReactNode;
  /** Classe Tailwind de largeur max (défaut : max-w-lg). */
  maxWidthClassName?: string;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  footer,
  maxWidthClassName = 'max-w-lg',
  children,
}: PropsWithChildren<ModalProps>) {
  useEffect(() => {
    if (!isOpen) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-white rounded-lg surface-card w-full max-h-[90vh] overflow-y-auto ${maxWidthClassName}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
          <h2 className="font-headline-md text-headline-md text-on-surface">{title}</h2>
          <button
            aria-label="Fermer"
            className="text-outline hover:text-on-surface transition-colors"
            onClick={onClose}
            type="button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-outline-variant flex justify-end gap-3">{footer}</div>
        )}
      </div>
    </div>
  );
}
