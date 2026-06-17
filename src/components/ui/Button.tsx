'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { classNames } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

// Filled green primary, primary-outlined secondary, solid danger, transparent
// ghost — all radius-md (12px). Matches Design System §6.1.
//
// Filled variants get a subtle shadow that lifts on hover — gives buttons
// a tangible elevation without being heavy (Design System §5).
const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-text-inverse shadow-sm hover:bg-primary-hover hover:shadow-md',
  secondary:
    'bg-transparent text-primary border-2 border-primary hover:bg-primary-surface',
  danger:
    'bg-danger text-text-inverse shadow-sm hover:bg-[#B91C1C] hover:shadow-md',
  ghost:
    'bg-transparent text-text-muted hover:bg-surface-muted',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-body gap-2',
  lg: 'h-12 px-6 text-body gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    leadingIcon,
    trailingIcon,
    disabled,
    children,
    className,
    type = 'button',
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;
  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={classNames(
        'inline-flex items-center justify-center font-body font-medium rounded-md select-none',
        'transition-[background-color,transform,box-shadow] duration-200 ease-out active:scale-[0.97]',
        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/40',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer',
        fullWidth && 'w-full',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <>
          <Loader2 className="animate-spin h-4 w-4" aria-hidden="true" />
          <span className="opacity-80">{children}</span>
        </>
      ) : (
        <>
          {leadingIcon}
          {children}
          {trailingIcon}
        </>
      )}
    </button>
  );
});

export default Button;
