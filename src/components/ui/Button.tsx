'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { classNames } from '@/lib/utils';

export type ButtonVariant =
  | 'primary'
  | 'accent'
  | 'secondary'
  | 'danger'
  | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

// Boutons « Repère » : pilules confiantes (rounded-full), ombre douce qui
// se lève au survol. Primaire vert, accent or (CTA chaud), secondaire cerné,
// danger plein, ghost transparent.
const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-text-inverse shadow-sm hover:bg-primary-hover hover:shadow-md',
  accent:
    'bg-accent text-text-primary shadow-sm hover:bg-accent-hover hover:shadow-md',
  secondary:
    'bg-surface text-primary border border-border-strong hover:border-primary hover:bg-primary-surface',
  danger:
    'bg-danger text-text-inverse shadow-sm hover:bg-[#A52F22] hover:shadow-md',
  ghost:
    'bg-transparent text-text-muted hover:bg-surface-muted hover:text-text-primary',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-sm gap-1.5',
  md: 'h-11 px-5 text-body gap-2',
  lg: 'h-13 px-7 text-body gap-2.5',
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
        'inline-flex items-center justify-center font-body font-semibold rounded-full select-none',
        'transition-[background-color,border-color,transform,box-shadow] duration-200 ease-out active:scale-[0.97]',
        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
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
