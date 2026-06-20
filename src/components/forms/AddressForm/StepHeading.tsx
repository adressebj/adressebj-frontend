import { classNames } from '@/lib/utils';

export interface StepHeadingProps {
  /** Numéro d'étape affiché en sur-titre discret (ex. « Étape 2 sur 4 »). */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;
}

/**
 * En-tête d'étape du wizard — échelle typographique **unique** pour les quatre
 * étapes (avant : `text-h3` ici, `text-2xl` là). Sur-titre optionnel en petites
 * capitales (rappel du langage éditorial « Repère »), titre Fraunces, sous-titre
 * d'accompagnement.
 */
export function StepHeading({
  eyebrow,
  title,
  subtitle,
  className,
}: StepHeadingProps) {
  return (
    <header className={classNames('flex flex-col gap-1.5', className)}>
      {eyebrow ? (
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-muted">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="font-display font-bold text-2xl leading-tight text-text-primary">
        {title}
      </h2>
      {subtitle ? (
        <p className="text-sm text-text-muted leading-relaxed max-w-prose">
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}

export default StepHeading;
