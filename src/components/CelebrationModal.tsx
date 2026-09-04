import { useEffect, useMemo, type ReactNode } from 'react';

interface CelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: ReactNode;
  emoji?: string;
  ctaLabel?: string;
  showConfetti?: boolean;
}

const CONFETTI_COLORS = ['#680200', '#ffb4a7', '#ffd166', '#06d6a0', '#118ab2', '#f4a261'];
const CONFETTI_COUNT = 70;

interface ConfettiPiece {
  id: number;
  left: number;
  color: string;
  width: number;
  height: number;
  duration: number;
  delay: number;
  rotate: number;
}

function generateConfetti(): ConfettiPiece[] {
  return Array.from({ length: CONFETTI_COUNT }, (_, id) => ({
    id,
    left: Math.random() * 100,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    width: 6 + Math.random() * 6,
    height: 10 + Math.random() * 6,
    duration: 2.2 + Math.random() * 1.8,
    delay: Math.random() * 0.5,
    rotate: Math.random() * 360,
  }));
}

export default function CelebrationModal({
  isOpen,
  onClose,
  title,
  message,
  emoji = '🎉',
  ctaLabel = 'Super !',
  showConfetti = true,
}: CelebrationModalProps) {
  const confetti = useMemo(() => (isOpen && showConfetti ? generateConfetti() : []), [isOpen, showConfetti]);

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
    <div className="success-modal-backdrop fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {confetti.map((piece) => (
          <span
            className="confetti-piece rounded-sm"
            key={piece.id}
            style={{
              left: `${piece.left}%`,
              width: piece.width,
              height: piece.height,
              backgroundColor: piece.color,
              animationDuration: `${piece.duration}s`,
              animationDelay: `${piece.delay}s`,
              transform: `rotate(${piece.rotate}deg)`,
            }}
          />
        ))}
      </div>

      <div className="success-modal-card relative bg-white rounded-xl surface-card w-full max-w-sm text-center px-8 py-10 z-10">
        <div className="celebration-badge mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary-fixed">
          <span className="text-5xl leading-none">{emoji}</span>
        </div>

        <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">{title}</h2>
        <p className="font-body-md text-body-md text-secondary">{message}</p>

        <button
          className="mt-8 w-full py-2.5 rounded bg-on-primary-fixed-variant text-white font-body-sm text-body-sm font-bold hover:bg-primary transition-colors"
          onClick={onClose}
          type="button"
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}
