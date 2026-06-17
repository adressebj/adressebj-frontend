import { classNames } from '@/lib/utils';

export interface StepsListProps {
  steps: string[];
  className?: string;
}

// Mobile-first: numbered circles big enough to read at a glance while moving.
export function StepsList({ steps, className }: StepsListProps) {
  if (!steps || steps.length === 0) return null;

  return (
    <ol
      className={classNames('flex flex-col gap-4', className)}
      aria-label="Instructions d'accès"
    >
      {steps.map((step, idx) => (
        <li key={`${idx}-${step}`} className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-text-inverse flex items-center justify-center text-xs font-bold"
          >
            {idx + 1}
          </span>
          <p className="text-base leading-tight text-text-muted">
            {step}
          </p>
        </li>
      ))}
    </ol>
  );
}

export default StepsList;
