import { classNames } from '@/lib/utils';

export type LogoSize = 'sm' | 'md' | 'lg';

export interface LogoProps {
  size?: LogoSize;
  /** Affiche le glyphe rond à gauche du wordmark. Désactivé par défaut. */
  withGlyph?: boolean;
  /** Sans le wordmark, glyphe seul. */
  iconOnly?: boolean;
  className?: string;
}

const SIZES: Record<
  LogoSize,
  { glyph: string; text: string; gap: string }
> = {
  sm: { glyph: 'h-5 w-5', text: 'text-base', gap: 'gap-1.5' },
  md: { glyph: 'h-6 w-6', text: 'text-xl',   gap: 'gap-2'   },
  lg: { glyph: 'h-8 w-8', text: 'text-2xl',  gap: 'gap-2.5' },
};

/**
 * Logo officiel d'AdresseBJ.
 *
 * Wordmark sobre : « Adresse » en couleur de texte principale, « BJ » en
 * accent vert plus gras, lus comme un seul mot. Le glyphe rond (cercle vert
 * + point central) est optionnel et reste discret quand activé.
 */
export function Logo({
  size = 'md',
  withGlyph = false,
  iconOnly = false,
  className,
}: LogoProps) {
  const sz = SIZES[size];
  const showGlyph = withGlyph || iconOnly;
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
            'font-display font-bold leading-none tracking-tight',
            sz.text,
          )}
        >
          <span className="text-text-primary">Adresse</span>
          <span className="text-primary">BJ</span>
        </span>
      ) : null}
    </span>
  );
}

interface LogoGlyphProps {
  className?: string;
}

function LogoGlyph({ className }: LogoGlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={classNames('shrink-0 text-primary', className)}
    >
      {/* Anneau vert plein épais. */}
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      {/* Point central : repère précis. */}
      <circle cx="12" cy="12" r="3.2" fill="currentColor" />
    </svg>
  );
}

export default Logo;
