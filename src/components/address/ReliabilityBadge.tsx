import { classNames } from '@/lib/utils';
import {
  RELIABILITY_CONFIG,
  formatRating,
  ratingToLevel,
  scoreToLevel,
  type ReliabilityLevel,
} from '@/lib/reliability';

export interface ReliabilityBadgeProps {
  /** Moyenne arithmétique des notes 1-5 (CDC §4). `null` = pas d'évaluation. */
  averageRating?: number | null;
  /** Nombre d'évaluations correspondant à `averageRating`. */
  ratingCount?: number;
  /** Legacy — score composite 0-100 (pages admin). Si défini, prime sur
      averageRating et l'affichage tombe sur l'ancien libellé textuel. */
  score?: number | null;
  size?: 'sm' | 'md';
  className?: string;
}

const SIZES: Record<NonNullable<ReliabilityBadgeProps['size']>, string> = {
  sm: 'text-xs px-2 py-0.5 gap-1.5',
  md: 'text-sm px-3 py-1 gap-2',
};

const DOT_SIZES: Record<NonNullable<ReliabilityBadgeProps['size']>, string> = {
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
};

/**
 * Badge de fiabilité — deux modes selon les props :
 *
 *  1. Mode public CDC (`averageRating` + `ratingCount`) : affiche "3,7/5 ·
 *     23 évaluations" avec une couleur sémantique. C'est la version
 *     visiteur attendue sur `/a/:code`.
 *
 *  2. Mode legacy (`score` 0-100) : ancien libellé textuel "Adresse fiable"
 *     etc. Conservé pour les pages admin qui consomment encore le score
 *     composite brut.
 *
 * Le score brut numérique n'est jamais rendu (CDC §4).
 */
export function ReliabilityBadge({
  averageRating,
  ratingCount = 0,
  score,
  size = 'md',
  className,
}: ReliabilityBadgeProps) {
  // Détection du mode : si averageRating ou ratingCount sont fournis, on
  // est en mode public ; sinon on bascule sur le score legacy.
  const useRating =
    averageRating !== undefined || ratingCount > 0 || score === undefined;

  const level: ReliabilityLevel = useRating
    ? ratingToLevel(averageRating ?? null, ratingCount)
    : scoreToLevel(score ?? null);

  const label = useRating
    ? formatRating(averageRating ?? null, ratingCount)
    : RELIABILITY_CONFIG[level].label;

  const config = RELIABILITY_CONFIG[level];

  return (
    <span
      data-level={level}
      role="status"
      aria-label={
        useRating ? `Note ${label}` : RELIABILITY_CONFIG[level].label
      }
      className={classNames(
        'inline-flex items-center font-medium rounded-full',
        config.bg,
        config.color,
        SIZES[size],
        className,
      )}
    >
      <span
        className={classNames(
          'rounded-full border border-surface',
          config.dot,
          DOT_SIZES[size],
        )}
        aria-hidden="true"
      />
      <span>{label}</span>
    </span>
  );
}

export default ReliabilityBadge;
