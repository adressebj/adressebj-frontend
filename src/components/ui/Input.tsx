'use client';

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { classNames } from '@/lib/utils';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string;
  hint?: string;
  error?: string | null;
  leadingIcon?: ReactNode;
  containerClassName?: string;
}

// Label is required — placeholder-only inputs are forbidden by the style guide.
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leadingIcon, className, id, containerClassName, ...rest },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  const hasError = Boolean(error);

  return (
    <div className={classNames('flex flex-col gap-1.5', containerClassName)}>
      <label
        htmlFor={inputId}
        className="text-sm font-medium text-text-primary"
      >
        {label}
      </label>
      <div className="relative">
        {leadingIcon ? (
          <span
            className="absolute inset-y-0 left-3 flex items-center text-text-muted"
            aria-hidden="true"
          >
            {leadingIcon}
          </span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy}
          className={classNames(
            'block w-full h-12 rounded-md bg-surface font-body text-base text-text-primary placeholder:text-text-muted',
            'border-[1.5px] outline-none transition-colors',
            'focus:border-primary focus:ring-[3px] focus:ring-primary/20',
            hasError
              ? 'border-danger focus:border-danger focus:ring-danger/20'
              : 'border-border-strong',
            leadingIcon ? 'pl-11 pr-3.5' : 'px-3.5',
            className,
          )}
          {...rest}
        />
      </div>
      {hint && !hasError ? (
        <p id={hintId} className="text-xs text-text-muted">
          {hint}
        </p>
      ) : null}
      {hasError ? (
        <p id={errorId} className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
});

export default Input;
