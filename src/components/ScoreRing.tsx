interface ScoreRingProps {
  score: number;
}

const RADIUS = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ScoreRing({ score }: ScoreRingProps) {
  const offset = CIRCUMFERENCE * (1 - score / 100);

  return (
    <div className="inline-flex items-center justify-center relative">
      <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
        <circle className="text-outline-variant" cx="20" cy="20" fill="transparent" r={RADIUS} stroke="currentColor" strokeWidth={3} />
        <circle
          className="text-primary-container"
          cx="20"
          cy="20"
          fill="transparent"
          r={RADIUS}
          stroke="currentColor"
          strokeWidth={3}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[10px] font-bold text-on-surface">{score}</span>
    </div>
  );
}
