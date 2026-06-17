'use client';

import { useState, type FormEvent } from 'react';
import { Loader2, Search } from 'lucide-react';
import { classNames, formatAddressCode, isValidAddressCodeFormat } from '@/lib/utils';

export interface CodeSearchInputProps {
  onSearch: (code: string) => void;
  defaultValue?: string;
  loading?: boolean;
}

const FORMAT_ERROR = 'Format invalide. Exemple : AKP-7X3K';

export function CodeSearchInput({
  onSearch,
  defaultValue = '',
  loading = false,
}: CodeSearchInputProps) {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formatted = formatAddressCode(value);
    if (!isValidAddressCodeFormat(formatted)) {
      setError(FORMAT_ERROR);
      return;
    }
    setError(null);
    onSearch(formatted);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full" noValidate>
      <div
        className={classNames(
          'relative w-full rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)]',
        )}
      >
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="text"
          aria-label="Code adresse"
          placeholder="Ex: AKP-2847"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (error) setError(null);
          }}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'code-search-error' : undefined}
          className={classNames(
            'w-full h-12 pl-12 pr-32 rounded-xl border-[1.5px] bg-surface text-base text-text-primary',
            'placeholder:text-text-muted/70 transition-shadow outline-none',
            'focus:border-primary focus:ring-[3px] focus:ring-primary/20',
            error ? 'border-danger' : 'border-border-strong',
          )}
        />
        <button
          type="submit"
          disabled={loading}
          className={classNames(
            'absolute right-1 top-1 bottom-1 px-4 rounded-lg bg-primary text-text-inverse text-sm font-medium',
            'shadow-sm transition-[background-color,transform] duration-150 ease-out cursor-pointer',
            'hover:bg-primary-hover active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
            'flex items-center justify-center gap-2',
          )}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : null}
          Rechercher
        </button>
      </div>
      {error ? (
        <p id="code-search-error" className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

export default CodeSearchInput;
