'use client';

import { useId } from 'react';
import { classNames } from '@/lib/utils';

export type LogoSize = 'sm' | 'md' | 'lg' | 'xl';

export interface LogoProps {
  size?: LogoSize;
  /** Affiche la plaque-code à gauche du wordmark. Activé par défaut. */
  withGlyph?: boolean;
  /** Plaque seule, sans wordmark (favicon / PWA / espaces réduits). */
  iconOnly?: boolean;
  /** Variante claire pour fonds sombres (canvas profond). */
  tone?: 'default' | 'inverse';
  className?: string;
}

const SIZES: Record<
  LogoSize,
  { glyph: string; text: string; gap: string }
> = {
  sm: { glyph: 'h-6 w-auto',   text: 'text-base', gap: 'gap-0.5' },
  md: { glyph: 'h-7 w-auto',   text: 'text-xl',   gap: 'gap-1'   },
  lg: { glyph: 'h-9 w-auto',   text: 'text-2xl',  gap: 'gap-1'   },
  xl: { glyph: 'h-12 w-auto',  text: 'text-3xl',  gap: 'gap-1.5' },
};

// Variante « lettrine » : le pin-A remplace le A initial de AdresseBJ.
//
// Géométrie du glyphe (viewBox 0 0 30 34) : le A intérieur va de l'apex
// y=6 aux pieds y=23 (cap = 17 unités) ; la pointe du pin descend à y=33.
// On dimensionne pour que ce cap = la hauteur de capitale du texte :
//   glyphe = 1.5em  →  1 unité = 1.5/34 ≈ 0.0441em  →  cap ≈ 0.75em
// On cale par vertical-align pour que les pieds du A reposent EXACTEMENT
// sur la ligne de base : pieds à 11 unités du bas de la boîte ⇒ -0.485em.
// La pointe déborde donc ~0.44em sous la ligne (le pin « planté »).
const LETTER_GLYPH =
  'inline-block h-[1.5em] w-auto align-[-0.41em] -ml-[0.04em] -mr-[0.18em]';
const LETTER_SIZES: Record<LogoSize, { text: string }> = {
  sm: { text: 'text-base' },
  md: { text: 'text-xl'   },
  lg: { text: 'text-2xl'  },
  xl: { text: 'text-3xl'  },
};

/**
 * Logo officiel d'AdresseBJ — identité « Repère », direction n°2 :
 * le pin qui forme un « A ».
 *
 * Le glyphe est une goutte de localisation (pin) dont le contre-forme
 * intérieur dessine un « A » : on lit « lieu » et « Adresse » d'un seul coup.
 * Vert forêt pour le pin, ivoire pour les jambes du A, or pour la barre — le
 * « repère » exact.
 *
 * Wordmark sobre en sans : « Adresse » en encre, « BJ » en vert — lus comme
 * un seul mot. La display éditoriale (Fraunces) reste réservée aux titres.
 */
export function Logo({
  size = 'md',
  withGlyph = true,
  iconOnly = false,
  tone = 'default',
  className,
}: LogoProps) {
  const sz = SIZES[size];
  const lsz = LETTER_SIZES[size];
  const inverse = tone === 'inverse';

  if (iconOnly) {
    return (
      <span
        className={classNames('inline-flex items-center', className)}
        aria-label="AdresseBJ"
      >
        <LogoGlyph className={sz.glyph} />
      </span>
    );
  }

  // Wordmark texte simple, sans pin (appelants qui passent withGlyph={false}).
  if (!withGlyph) {
    return (
      <span
        className={classNames(
          'inline-flex items-baseline font-body font-bold leading-none tracking-[-0.03em]',
          lsz.text,
          className,
        )}
        aria-label="AdresseBJ"
      >
        <span className={inverse ? 'text-text-inverse' : 'text-text-primary'}>
          Adresse
        </span>
        {/* « BJ » toujours en or — wordmark officiel unique (clair comme sombre). */}
      <span className="text-accent">BJ</span>
      </span>
    );
  }

  // Variante lettrine : le pin-A remplace le « A » de AdresseBJ.
  return (
    <span
      className={classNames(
        'inline-block whitespace-nowrap font-body font-bold leading-none tracking-[-0.03em]',
        lsz.text,
        className,
      )}
      aria-label="AdresseBJ"
    >
      <LogoGlyph className={LETTER_GLYPH} />
      <span className={inverse ? 'text-text-inverse' : 'text-text-primary'}>
        dresse
      </span>
      {/* « BJ » toujours en or — wordmark officiel unique (clair comme sombre). */}
      <span className="text-accent">BJ</span>
    </span>
  );
}

interface LogoGlyphProps {
  className?: string;
}

/**
 * Glyphe pin-A. Goutte de localisation en vert dégradé ; à l'intérieur, un
 * « A » à hauteur de capitale (jambes ivoire, barre transversale or). Le pin
 * enveloppe le A : tête au-dessus de l'apex, pointe sous la ligne de base.
 *
 * viewBox 30×34 — A : apex y6, pieds y23 (cap 17u) ; pointe du pin y33.
 */
function LogoGlyph({ className }: LogoGlyphProps) {
  // Id de dégradé UNIQUE par instance : deux logos sur une même page (ex. le
  // panneau marque + l'en-tête mobile de /auth) ne doivent pas partager l'id,
  // sinon un logo référence le paint-server d'un autre — cassé si ce dernier
  // est dans un sous-arbre display:none. (Colons de useId retirés pour url().)
  const gradientId = `abj-pin-${useId().replace(/:/g, '')}`;
  return (
    <svg
      viewBox="0 0 30 34"
      aria-hidden="true"
      className={classNames('shrink-0', className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary-light)" />
          <stop offset="55%" stopColor="var(--color-primary)" />
          <stop offset="100%" stopColor="var(--color-primary-dark)" />
        </linearGradient>
      </defs>
      {/* Goutte : tête circulaire (centre 15,15 · r 13), pointe en 15,33. */}
      <path
        d="M15 33 C 13 30.5, 4 23.5, 2 15 A 13 13 0 1 1 28 15 C 26 23.5, 17 30.5, 15 33 Z"
        fill={`url(#${gradientId})`}
      />
      {/* Jambes du A (ivoire) — apex y6, pieds y23, à hauteur de capitale. */}
      <path
        d="M7.5 23 L15 6 L22.5 23"
        fill="none"
        stroke="var(--color-bg)"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Barre transversale (or) — le repère. */}
      <path
        d="M9.9 17.5 L20.1 17.5"
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default Logo;
