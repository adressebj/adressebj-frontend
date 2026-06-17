'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { classNames } from '@/lib/utils';

export interface StarRatingProps {
  /** Évaluation actuelle de l'utilisateur (1-5). `null` = jamais évalué.
      Si défini, ces étoiles sont pré-sélectionnées au montage. */
  currentScore: number | null;
  /** Callback appelé sur clic d'une étoile (1-5). Gestion optimiste
      attendue côté parent — la sélection s'affiche immédiatement. */
  onRate: (score: number) => void;
  /** Désactive l'interaction. Utilisé pour visiteurs anonymes ou pendant
      qu'un appel API est en vol. Le tooltip explique pourquoi. */
  disabled?: boolean;
  /** Tooltip affiché au survol quand `disabled` (ex : "Connectez-vous"). */
  disabledHint?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Label aria du groupe — défaut "Note de 1 à 5 étoiles". */
  ariaLabel?: string;
}

const SIZES = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-9 w-9',
} as const;

/**
 * Cinq étoiles cliquables. Survol prévisualise la sélection (uniquement si
 * non désactivé). Un clic appelle `onRate(score)` — sans état de loading
 * interne : le parent gère l'optimisme. Si `currentScore` est défini, les
 * étoiles correspondantes restent peintes jusqu'à ce que l'utilisateur
 * survole une autre valeur.
 *
 * Accessibilité : chaque étoile a un `aria-label` ("3 étoiles"), un rôle
 * `radio` et est activable au clavier. Le conteneur expose `role=radiogroup`.
 */
export function StarRating({
  currentScore,
  onRate,
  disabled = false,
  disabledHint,
  size = 'lg',
  ariaLabel = 'Note de 1 à 5 étoiles',
}: StarRatingProps) {
  // Hover preview — synchronisé avec le state courant si rien n'est survolé.
  const [hovered, setHovered] = useState<number | null>(null);
  // Score affiché = hover si présent, sinon currentScore.
  const displayed = hovered ?? currentScore ?? 0;

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex justify-center gap-2"
      title={disabled ? disabledHint : undefined}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= displayed;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={currentScore === n}
            aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
            disabled={disabled}
            onMouseEnter={() => !disabled && setHovered(n)}
            onMouseLeave={() => !disabled && setHovered(null)}
            onFocus={() => !disabled && setHovered(n)}
            onBlur={() => !disabled && setHovered(null)}
            onClick={() => !disabled && onRate(n)}
            className={classNames(
              'p-1 rounded-md transition-transform duration-150',
              disabled
                ? 'cursor-not-allowed opacity-60'
                : 'cursor-pointer hover:scale-110 active:scale-90',
              'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30',
            )}
          >
            <Star
              className={classNames(
                SIZES[size],
                'transition-colors duration-150',
                filled ? 'text-accent drop-shadow-sm' : 'text-border-strong',
              )}
              fill={filled ? 'currentColor' : 'none'}
              aria-hidden="true"
            />
          </button>
        );
      })}
    </div>
  );
}

export default StarRating;
