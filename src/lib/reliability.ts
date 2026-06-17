export type ReliabilityLevel = 'high' | 'medium' | 'low' | 'unknown';

// ─── Score composite legacy (0-100) ─────────────────────────────────────────
// Utilisé par les pages admin qui consomment encore le score brut backend.
export function scoreToLevel(score: number | null): ReliabilityLevel {
  if (score === null || score === 0) return 'unknown';
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

// ─── Moyenne d'évaluations 1-5 (CDC §4) ─────────────────────────────────────
// `count` permet de distinguer "Pas encore évaluée" (count=0) d'une note
// présente. Les seuils 4.0 / 2.5 correspondent au tableau CDC §4.
export function ratingToLevel(
  average: number | null,
  count: number,
): ReliabilityLevel {
  if (average === null || count === 0) return 'unknown';
  if (average >= 4.0) return 'high';
  if (average >= 2.5) return 'medium';
  return 'low';
}

// Format public : "3,7/5 · 23 évaluations" ou "Pas encore évaluée".
// La virgule (et non le point) suit l'usage typographique français.
export function formatRating(average: number | null, count: number): string {
  if (average === null || count === 0) return 'Pas encore évaluée';
  const noteFr = average.toFixed(1).replace('.', ',');
  return `${noteFr}/5 · ${count} évaluation${count > 1 ? 's' : ''}`;
}

export const RELIABILITY_CONFIG: Record<
  ReliabilityLevel,
  { label: string; color: string; bg: string; dot: string }
> = {
  high:    { label: 'Adresse fiable',      color: 'text-[#15803D]',  bg: 'bg-[#DCFCE7]',     dot: 'bg-primary'       },
  medium:  { label: 'Fiabilité moyenne',   color: 'text-[#C2410C]',  bg: 'bg-warning-light', dot: 'bg-warning'       },
  low:     { label: 'Fiabilité faible',    color: 'text-danger',     bg: 'bg-danger-light',  dot: 'bg-danger'        },
  unknown: { label: 'Pas encore évaluée',  color: 'text-text-muted', bg: 'bg-surface-muted', dot: 'bg-border-strong' },
};
