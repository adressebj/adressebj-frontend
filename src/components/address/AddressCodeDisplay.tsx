'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { classNames } from '@/lib/utils';

export interface AddressCodeDisplayProps {
  code: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showCopyButton?: boolean;
}

// Address codes are the brand's signature — monospace, bold, slightly tracked.
// sm for list rows, md (1.5rem) for cards/owner view, lg (2rem) for /a/[code].
const SIZES: Record<NonNullable<AddressCodeDisplayProps['size']>, string> = {
  sm: 'text-[1.125rem] px-3 py-1.5',
  md: 'text-[1.5rem] px-4 py-2',
  lg: 'text-[2rem] px-5 py-3',
};

export function AddressCodeDisplay({
  code,
  size = 'md',
  showCopyButton = true,
  className,
}: AddressCodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      }
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — fall through silently; UI stays unchanged
    }
  };

  return (
    <div
      className={classNames(
        'inline-flex items-center gap-3 bg-surface-muted rounded-md border border-dashed border-border',
        className,
      )}
    >
      <span
        aria-label={`Code adresse ${code}`}
        className={classNames(
          'font-mono font-bold text-text-primary tracking-[0.05em]',
          SIZES[size],
        )}
      >
        {code}
      </span>
      {showCopyButton ? (
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'Code copié' : 'Copier le code adresse'}
          className="mr-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-light"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Copié !
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              Copier
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}

export default AddressCodeDisplay;
