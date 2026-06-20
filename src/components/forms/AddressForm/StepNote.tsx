import { classNames } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type StepNoteVariant = 'info' | 'primary' | 'warning' | 'danger';

export interface StepNoteProps {
  variant?: StepNoteVariant;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
  /** Passé à `role`/`aria-live` quand la note annonce un changement d'état. */
  role?: string;
}

const STYLES: Record<StepNoteVariant, { box: string; icon: string }> = {
  info: { box: 'bg-surface-muted border-border', icon: 'text-text-muted' },
  primary: { box: 'bg-primary-surface border-primary/20', icon: 'text-primary' },
  warning: { box: 'bg-warning-light border-warning/30', icon: 'text-warning' },
  danger: { box: 'bg-danger-light border-danger/30', icon: 'text-danger' },
};

/**
 * Bannière d'information d'étape — icône + texte dans une boîte arrondie
 * teintée. Remplace les blocs ad hoc dupliqués dans chaque étape (radius et
 * espacements qui divergeaient). Radius `--radius-md` constant.
 */
export function StepNote({
  variant = 'info',
  icon: Icon,
  children,
  className,
  role,
}: StepNoteProps) {
  const styles = STYLES[variant];
  return (
    <div
      role={role}
      className={classNames(
        'flex items-start gap-2.5 rounded-[var(--radius-md)] border px-4 py-3',
        styles.box,
        className,
      )}
    >
      <Icon
        className={classNames('h-4 w-4 shrink-0 mt-0.5', styles.icon)}
        aria-hidden="true"
      />
      <p className="text-sm text-text-primary leading-relaxed">{children}</p>
    </div>
  );
}

export default StepNote;
