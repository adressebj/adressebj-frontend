'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react';
import { classNames } from '@/lib/utils';

export interface OtpInputProps {
  length?: number;
  onComplete: (code: string) => void;
  onChange?: (code: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  ariaLabel?: string;
}

const isDigit = (value: string) => /^\d$/.test(value);

export function OtpInput({
  length = 6,
  onComplete,
  onChange,
  disabled = false,
  autoFocus = true,
  ariaLabel = 'Code de vérification',
}: OtpInputProps) {
  const baseId = useId();
  const [values, setValues] = useState<string[]>(() => Array(length).fill(''));
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (autoFocus && refs.current[0]) refs.current[0].focus();
  }, [autoFocus]);

  // Stash the latest callbacks on refs so the notify effect doesn't have to
  // depend on them — otherwise an unmemoised parent callback would re-fire
  // onComplete on every render cycle, causing a re-verify loop.
  const onChangeRef = useRef(onChange);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onChangeRef.current = onChange;
    onCompleteRef.current = onComplete;
  });

  // Notify the parent AFTER commit. Calling onComplete inside the setValues
  // updater (the previous approach) violated React's "no setState in another
  // component during render" rule when the parent's handler did setVerifying.
  useEffect(() => {
    const joined = values.join('');
    onChangeRef.current?.(joined);
    if (joined.length === length && values.every((c) => isDigit(c))) {
      onCompleteRef.current(joined);
    }
  }, [values, length]);

  const setAt = (index: number, value: string) => {
    setValues((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  };

  const focusIndex = (index: number) => {
    const target = refs.current[Math.max(0, Math.min(length - 1, index))];
    target?.focus();
    target?.select?.();
  };

  const handleChange = (index: number) => (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    if (raw === '') {
      setAt(index, '');
      return;
    }
    // Last typed character wins — easier on mobile keyboards that may insert
    // multiple chars when auto-correcting.
    const next = raw.slice(-1);
    if (!isDigit(next)) return;
    setAt(index, next);
    if (index < length - 1) focusIndex(index + 1);
  };

  const handleKeyDown = (index: number) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      if (values[index]) {
        setAt(index, '');
        return;
      }
      event.preventDefault();
      if (index > 0) {
        setAt(index - 1, '');
        focusIndex(index - 1);
      }
      return;
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      focusIndex(index - 1);
    } else if (event.key === 'ArrowRight' && index < length - 1) {
      event.preventDefault();
      focusIndex(index + 1);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text').replace(/\D+/g, '');
    if (!pasted) return;
    event.preventDefault();
    const digits = pasted.slice(0, length).split('');
    setValues((current) => {
      const next = [...current];
      for (let i = 0; i < length; i += 1) {
        next[i] = digits[i] ?? '';
      }
      return next;
    });
    focusIndex(Math.min(digits.length, length - 1));
  };

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      // gap réduit sur mobile pour que 6 cellules + séparateur tiennent dans
      // la card à 320px sans déborder ; gap-2 dès sm+ pour respirer.
      className="flex items-center justify-center gap-1 sm:gap-2"
    >
      {values.map((value, idx) => (
        <input
          key={idx}
          ref={(el) => {
            refs.current[idx] = el;
          }}
          id={`${baseId}-${idx}`}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          autoComplete={idx === 0 ? 'one-time-code' : 'off'}
          aria-label={`Chiffre ${idx + 1} sur ${length}`}
          value={value}
          disabled={disabled}
          onChange={handleChange(idx)}
          onKeyDown={handleKeyDown(idx)}
          onPaste={handlePaste}
          onFocus={(e) => e.currentTarget.select()}
          className={classNames(
            // 40×56 mobile / 48×56 dès sm — calibré pour qu'à 320px les 6
            // cellules + le séparateur (ml-1) tiennent exactement dans la
            // card avec padding p-3, sans déborder.
            'h-14 w-10 sm:w-12 text-center font-display font-semibold text-xl sm:text-2xl',
            'text-text-primary border-2 rounded-md',
            'transition-[border-color,background-color,box-shadow,transform] duration-200 ease-out',
            'focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/20',
            'disabled:bg-surface-muted disabled:text-text-muted',
            value
              ? 'border-primary bg-primary-surface shadow-sm scale-105'
              : 'border-border-strong bg-surface',
            idx === length / 2 && length % 2 === 0 ? 'ml-1 sm:ml-2' : '',
          )}
        />
      ))}
    </div>
  );
}

export default OtpInput;
