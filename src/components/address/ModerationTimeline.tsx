import { Check, Clock, X } from 'lucide-react';
import { classNames } from '@/lib/utils';

type NodeState = 'done' | 'active' | 'future' | 'error';

interface TimelineNode {
  label: string;
  state: NodeState;
}

export interface ModerationTimelineProps {
  /** Adresse en attente de validation ou dont la dernière révision a été refusée. */
  status: 'EN_ATTENTE_VALIDATION' | 'REJETEE';
}

/**
 * Suivi de modération en 3 étapes — transforme « l'attente » en progression
 * lisible (Soumise → En analyse → Publiée). L'étape courante pulse en or (le
 * « repère » de la marque). Remplace à elle seule le badge de statut.
 */
export function ModerationTimeline({ status }: ModerationTimelineProps) {
  const rejected = status === 'REJETEE';

  const nodes: TimelineNode[] = rejected
    ? [
        { label: 'Soumise', state: 'done' },
        { label: 'Analyse', state: 'done' },
        { label: 'Refusée', state: 'error' },
      ]
    : [
        { label: 'Soumise', state: 'done' },
        { label: 'En analyse', state: 'active' },
        { label: 'Publiée', state: 'future' },
      ];
  // Connecteur menant à chaque nœud (sauf le premier) : « rempli » si l'étape
  // est atteinte (done/active/error), « à venir » sinon.
  const connectorReached = [
    nodes[1].state !== 'future',
    nodes[2].state !== 'future',
  ];

  return (
    <div
      className={classNames(
        'flex flex-col gap-4 rounded-[var(--radius-lg)] border p-4',
        rejected
          ? 'border-danger/25 bg-danger-light/40'
          : 'border-accent/30 bg-accent-light/40',
      )}
    >
      {/* Piste : nœuds + connecteurs alignés sur le centre des pastilles. */}
      <div className="flex items-start">
        <TimelineDot node={nodes[0]} />
        <Connector reached={connectorReached[0]} rejected={rejected} />
        <TimelineDot node={nodes[1]} />
        <Connector reached={connectorReached[1]} rejected={rejected} />
        <TimelineDot node={nodes[2]} />
      </div>

      <p className="text-sm text-text-muted leading-relaxed">
        {rejected
          ? 'Vos dernières modifications n’ont pas été retenues. Ajustez votre adresse, puis soumettez-la à nouveau.'
          : 'Votre adresse est en cours de vérification par nos modérateurs. Vous pouvez déjà la consulter ; elle deviendra partageable et visible publiquement une fois validée.'}
      </p>
    </div>
  );
}

function TimelineDot({ node }: { node: TimelineNode }) {
  const { state, label } = node;
  return (
    <div className="flex w-16 shrink-0 flex-col items-center gap-2 text-center">
      <span className="relative inline-flex h-6 w-6 items-center justify-center">
        {state === 'active' ? (
          <span
            aria-hidden="true"
            className="absolute inline-flex h-full w-full rounded-full bg-accent/40 animate-ping"
          />
        ) : null}
        <span
          className={classNames(
            'relative inline-flex h-6 w-6 items-center justify-center rounded-full',
            state === 'done'
              ? 'bg-primary text-text-inverse'
              : state === 'active'
                ? 'bg-accent text-text-inverse shadow-sm'
                : state === 'error'
                  ? 'bg-danger text-text-inverse'
                  : 'border border-border bg-surface text-text-muted',
          )}
        >
          {state === 'done' ? (
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          ) : state === 'active' ? (
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          ) : state === 'error' ? (
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
          )}
        </span>
      </span>
      <span
        className={classNames(
          'text-[11px] font-semibold leading-tight',
          state === 'future' ? 'text-text-muted' : 'text-text-primary',
        )}
      >
        {label}
      </span>
    </div>
  );
}

function Connector({
  reached,
  rejected,
}: {
  reached: boolean;
  rejected: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={classNames(
        'mt-3 h-0.5 flex-1 rounded-full',
        reached ? (rejected ? 'bg-danger/60' : 'bg-primary') : 'bg-border',
      )}
    />
  );
}

export default ModerationTimeline;
