import { Star, Footprints } from 'lucide-react';
import { classNames } from '@/lib/utils';
import { formatRating, ratingToLevel } from '@/lib/reliability';

export interface RatingSummaryProps {
  /** Moyenne arithmétique des notes 1-5 (CDC §4). `null` = pas d'évaluation. */
  averageRating?: number | null;
  /** Nombre d'évaluations qui ont nourri la moyenne. */
  ratingCount?: number;
  /** Nombre de visites confirmées — métrique jumelle (optionnelle). */
  visitCount?: number;
  className?: string;
}

// Mot de niveau (sémantique) — les étoiles restent or quoi qu'il arrive ;
// c'est ce libellé coloré qui porte le jugement de fiabilité.
const LEVEL_LABEL: Record<string, { text: string; color: string }> = {
  high: { text: 'Adresse fiable', color: 'text-success' },
  medium: { text: 'Fiabilité moyenne', color: 'text-warning' },
  low: { text: 'Fiabilité à confirmer', color: 'text-danger' },
  unknown: { text: 'Pas encore évaluée', color: 'text-text-muted' },
};

/**
 * Rangée de 5 étoiles avec remplissage **fractionnaire** : une base d'étoiles
 * ajourées (contour) recouverte d'une couche d'étoiles or rognée à la largeur
 * proportionnelle à la note. C'est l'objet de confiance signature de la fiche.
 */
function StarRow({ value, size = 16 }: { value: number; size?: number }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  const stars = Array.from({ length: 5 });
  return (
    <span
      className="relative inline-flex"
      role="img"
      aria-label={`${value.toFixed(1).replace('.', ',')} sur 5`}
    >
      <span className="flex gap-0.5 text-border-strong">
        {stars.map((_, i) => (
          <Star key={i} width={size} height={size} strokeWidth={1.75} aria-hidden="true" />
        ))}
      </span>
      <span
        className="absolute inset-0 flex gap-0.5 overflow-hidden text-accent"
        style={{ width: `${pct}%` }}
        aria-hidden="true"
      >
        {stars.map((_, i) => (
          <Star
            key={i}
            width={size}
            height={size}
            strokeWidth={1.75}
            className="shrink-0 fill-current"
          />
        ))}
      </span>
    </span>
  );
}

/**
 * Bloc de confiance éditorial pour la fiche-repère : la note moyenne en grand
 * (Fraunces), une rangée d'étoiles or à remplissage fractionnaire, le mot de
 * niveau coloré, et les visites confirmées en métrique jumelle. Remplace le
 * `ReliabilityBadge` pilule sur `/a/[code]` (qui reste utilisé ailleurs).
 */
export function RatingSummary({
  averageRating,
  ratingCount = 0,
  visitCount,
  className,
}: RatingSummaryProps) {
  const level = ratingToLevel(averageRating ?? null, ratingCount);
  const rated = level !== 'unknown' && averageRating != null;
  const meta = LEVEL_LABEL[level];

  return (
    <div
      role="status"
      aria-label={formatRating(averageRating ?? null, ratingCount)}
      className={classNames(
        'flex items-stretch rounded-[var(--radius-lg)] border border-border bg-surface',
        className,
      )}
    >
      {/* ── Bloc note ── */}
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {rated ? (
          <>
            <div className="flex items-baseline gap-1">
              <span className="font-display font-black text-3xl leading-none text-text-primary">
                {averageRating!.toFixed(1).replace('.', ',')}
              </span>
              <span className="text-sm font-semibold text-text-muted">/5</span>
            </div>
            <StarRow value={averageRating!} />
            <p className="text-xs font-medium">
              <span className={meta.color}>{meta.text}</span>
              <span className="text-text-muted">
                {' · '}
                {ratingCount} avis
              </span>
            </p>
          </>
        ) : (
          <>
            <StarRow value={0} />
            <p className="text-sm font-semibold text-text-primary">
              Pas encore évaluée
            </p>
            <p className="text-xs text-text-muted">
              Soyez le premier à noter cet itinéraire.
            </p>
          </>
        )}
      </div>

      {/* ── Bloc visites (métrique jumelle) ── */}
      {visitCount != null ? (
        <div className="flex flex-col items-center justify-center gap-1 border-l border-border px-5 py-4 min-w-[6.5rem]">
          <Footprints className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="font-display font-black text-2xl leading-none text-text-primary">
            {visitCount}
          </span>
          <span className="text-[11px] font-medium uppercase tracking-wide text-text-muted text-center leading-tight">
            visite{visitCount > 1 ? 's' : ''}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export default RatingSummary;
