import { classNames } from '@/lib/utils';

export type LogoSize = 'sm' | 'md' | 'lg' | 'xl';

export interface LogoProps {
  size?: LogoSize;
  /** Affiche le glyphe losange à gauche du wordmark. Activé par défaut. */
  withGlyph?: boolean;
  /** Glyphe seul, sans wordmark. */
  iconOnly?: boolean;
  /** Variante claire pour fonds sombres (canvas profond). */
  tone?: 'default' | 'inverse';
  className?: string;
}

const SIZES: Record<
  LogoSize,
  { glyph: string; text: string; gap: string }
> = {
  sm: { glyph: 'h-6 w-6',  text: 'text-base', gap: 'gap-2'   },
  md: { glyph: 'h-7 w-7',  text: 'text-xl',   gap: 'gap-2.5' },
  lg: { glyph: 'h-9 w-9',  text: 'text-2xl',  gap: 'gap-3'   },
  xl: { glyph: 'h-12 w-12', text: 'text-3xl', gap: 'gap-3.5' },
};

/**
 * Logo officiel d'AdresseBJ — identité « Repère ».
 *
 * Le glyphe est un losange (motif Fon / kente béninois) qui se lit aussi
 * comme un marqueur de lieu : sa pointe basse en fait un pin, et le point
 * d'or central est le « repère » précis. Vert forêt + or.
 *
 * Wordmark sobre en sans : « Adresse » en encre, « BJ » en vert — lus comme
 * un seul mot. La display éditoriale (Fraunces) est réservée aux titres.
 */
export function Logo({
  size = 'md',
  withGlyph = true,
  iconOnly = false,
  tone = 'default',
  className,
}: LogoProps) {
  const sz = SIZES[size];
  const showGlyph = withGlyph || iconOnly;
  const inverse = tone === 'inverse';
  return (
    <span
      className={classNames(
        'inline-flex items-center',
        showGlyph ? sz.gap : '',
        className,
      )}
      aria-label="AdresseBJ"
    >
      {showGlyph ? <LogoGlyph className={sz.glyph} /> : null}
      {!iconOnly ? (
        <span
          className={classNames(
            'font-body font-bold leading-none tracking-[-0.03em]',
            sz.text,
          )}
        >
          <span className={inverse ? 'text-text-inverse' : 'text-text-primary'}>
            Adresse
          </span>
          <span className={inverse ? 'text-accent' : 'text-primary'}>BJ</span>
        </span>
      ) : null}
    </span>
  );
}

interface LogoGlyphProps {
  className?: string;
}

/**
 * Glyphe losange-pin. Deux teintes : corps vert dégradé + point d'or.
 * Une fine pointe basse donne la lecture « marqueur de lieu ».
 */
function LogoGlyph({ className }: LogoGlyphProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={classNames('shrink-0', className)}
    >
      <defs>
        <linearGradient id="abj-glyph" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary-light)" />
          <stop offset="55%" stopColor="var(--color-primary)" />
          <stop offset="100%" stopColor="var(--color-primary-dark)" />
        </linearGradient>
      </defs>
      {/* Losange-pin : sommet court en haut, longue pointe en bas. */}
      <path
        d="M16 1.5 L28.5 13 L16 30.5 L3.5 13 Z"
        fill="url(#abj-glyph)"
      />
      {/* Cadre intérieur — rappel du motif textile, fin. */}
      <path
        d="M16 7 L23.5 13 L16 22.5 L8.5 13 Z"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.22"
        strokeWidth="1.1"
      />
      {/* Le repère précis : point d'or. */}
      <circle cx="16" cy="13" r="3" fill="var(--color-accent)" />
    </svg>
  );
}

export default Logo;
