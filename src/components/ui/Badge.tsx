import type { HTMLAttributes, ReactNode } from 'react';
import { classNames } from '@/lib/utils';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Show a leading status dot in the variant colour. */
  dot?: boolean;
  children: ReactNode;
}

// Pill chips with soft tinted backgrounds — the exact status palette from the
// design brief (published/pending/rejected/inactive families).
const VARIANTS: Record<BadgeVariant, { chip: string; dot: string }> = {
  success: { chip: 'bg-[#DCFCE7] text-[#166534]', dot: 'bg-success' },
  warning: { chip: 'bg-[#FEF3C7] text-[#92400E]', dot: 'bg-warning' },
  danger:  { chip: 'bg-[#FEE2E2] text-[#991B1B]', dot: 'bg-danger' },
  neutral: { chip: 'bg-surface-muted text-text-muted', dot: 'bg-border-strong' },
};

const SIZES: Record<BadgeSize, string> = {
  sm: 'text-xs px-2.5 py-0.5',
  md: 'text-sm px-3 py-1',
};

export function Badge({
  variant = 'neutral',
  size = 'sm',
  dot = false,
  className,
  children,
  ...rest
}: BadgeProps) {
  const styles = VARIANTS[variant];
  return (
    <span
      className={classNames(
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        styles.chip,
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {dot ? (
        <span
          aria-hidden="true"
          className={classNames('h-1.5 w-1.5 rounded-full', styles.dot)}
        />
      ) : null}
      {children}
    </span>
  );
}

export default Badge;
