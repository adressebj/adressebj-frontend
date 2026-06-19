import { classNames } from '@/lib/utils';

export interface StepsListProps {
  steps: string[];
  className?: string;
}

/**
 * Itinéraire en timeline verticale : chaque étape est un marqueur numéroté
 * relié au suivant par un filet — la lecture devient un « parcours », écho de
 * l'élément signature carte du design system. Reste un
 * `<ol aria-label="Instructions d'accès">` (contrat d'accessibilité figé).
 */
export function StepsList({ steps, className }: StepsListProps) {
  if (!steps || steps.length === 0) return null;

  return (
    <ol
      className={classNames('relative flex flex-col', className)}
      aria-label="Instructions d'accès"
    >
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        return (
          <li
            key={`${idx}-${step}`}
            className="animate-fade-up relative flex gap-5 pb-8 last:pb-0"
            style={{ animationDelay: `${Math.min(idx, 6) * 60}ms` }}
          >
            {/* Filet de liaison vers l'étape suivante. */}
            {!isLast ? (
              <span
                aria-hidden="true"
                className="absolute left-4 top-10 -bottom-2 w-px -translate-x-1/2 bg-border-strong"
              />
            ) : null}

            {/* Marqueur cercle plein premium. */}
            <span
              aria-hidden="true"
              className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-text-inverse shadow-sm"
            >
              <span className="text-xs font-bold leading-none">{idx + 1}</span>
            </span>

            <p className="pt-0.5 text-lg leading-snug text-text-primary font-medium">
              {step}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export default StepsList;
