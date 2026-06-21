import { DoorOpen, Flag, type LucideIcon } from 'lucide-react';
import { classNames } from '@/lib/utils';

export interface StepsListProps {
  steps: string[];
  className?: string;
}

type NodeKind = 'start' | 'route' | 'arrival';

/**
 * Timeline « Les derniers mètres » : un parcours guidé, écrit par le
 * propriétaire, du repère de DÉPART jusqu'à l'ARRIVÉE (la porte). Les nœuds
 * disent leur rôle — départ (drapeau), étapes de trajet numérotées, arrivée
 * (porte, en or signature) — pour qu'on lise « pars d'ici → suis le chemin →
 * tu es à la porte » sans jamais supposer la position du visiteur. Reste un
 * `<ol aria-label="Instructions d'accès">` (contrat d'accessibilité figé).
 */
export function StepsList({ steps, className }: StepsListProps) {
  if (!steps || steps.length === 0) return null;
  const lastIndex = steps.length - 1;

  return (
    <ol
      className={classNames('relative flex flex-col', className)}
      aria-label="Instructions d'accès"
    >
      {steps.map((step, idx) => {
        const kind: NodeKind =
          idx === lastIndex ? 'arrival' : idx === 0 ? 'start' : 'route';
        const isLast = idx === lastIndex;
        // Filet vers l'étape suivante : pointillé juste après le départ (on
        // quitte le repère), dégradé chaud vers l'or à l'approche de l'arrivée,
        // solide entre deux étapes de trajet.
        const nextIsArrival = idx === lastIndex - 1;

        return (
          <li
            key={`${idx}-${step}`}
            className="animate-fade-up relative flex gap-4 pb-8 last:pb-0"
            style={{ animationDelay: `${Math.min(idx, 6) * 60}ms` }}
          >
            {!isLast ? (
              kind === 'start' ? (
                <span
                  aria-hidden="true"
                  className="absolute left-[18px] top-9 -bottom-2 -translate-x-1/2 border-l-2 border-dashed border-border-strong"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className={classNames(
                    'absolute left-[18px] top-9 -bottom-2 w-0.5 -translate-x-1/2 rounded-full',
                    nextIsArrival
                      ? 'bg-[linear-gradient(to_bottom,var(--color-border-strong),var(--color-accent))]'
                      : 'bg-border-strong',
                  )}
                />
              )
            ) : null}

            <StepMarker kind={kind} number={kind === 'route' ? idx : null} />

            <div className="pt-0.5">
              {kind !== 'route' ? (
                <p
                  className={classNames(
                    'text-[11px] font-bold uppercase tracking-[0.16em]',
                    kind === 'arrival' ? 'text-accent-text' : 'text-primary',
                  )}
                >
                  {kind === 'arrival' ? 'Arrivée' : 'Départ'}
                </p>
              ) : null}
              <p
                className={classNames(
                  'text-lg leading-snug text-text-primary',
                  kind === 'route' ? 'font-medium' : 'font-semibold',
                )}
              >
                {step}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const MARKER: Record<NodeKind, { className: string; icon?: LucideIcon }> = {
  start: { className: 'bg-primary text-text-inverse', icon: Flag },
  route: { className: 'bg-primary text-text-inverse' },
  arrival: {
    className: 'bg-accent text-canvas-deep ring-2 ring-accent/35',
    icon: DoorOpen,
  },
};

function StepMarker({ kind, number }: { kind: NodeKind; number: number | null }) {
  const meta = MARKER[kind];
  const Icon = meta.icon;
  return (
    <span
      aria-hidden="true"
      className={classNames(
        'relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-sm',
        meta.className,
      )}
    >
      {Icon ? (
        <Icon className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
      ) : (
        <span className="font-mono text-sm font-bold leading-none">{number}</span>
      )}
    </span>
  );
}

export default StepsList;
