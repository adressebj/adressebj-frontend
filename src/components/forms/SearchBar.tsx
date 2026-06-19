'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MapPin, Search, X } from 'lucide-react';
import { geocode, type NominatimResult } from '@/lib/nominatim';
import { classNames } from '@/lib/utils';

/**
 * Format des codes AdresseBJ : 3 lettres majuscules de zone, tiret, 4 chars
 * alphanumériques. Conforme à la convention `AKP-XXXX` du backend.
 */
const CODE_RE = /^[A-Z]{3}-[A-Z0-9]{4}$/;

const NOMINATIM_DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 3;

export interface SearchBarProps {
  /** Variante visuelle — par défaut adaptée à la landing. */
  variant?: 'landing' | 'map';
  /** Texte initial (utile quand la barre est remontée d'une URL). */
  initialQuery?: string;
}

/**
 * Barre de recherche unifiée du CDC §10 — accepte indistinctement :
 *
 *  1. Un **code adresse** (regex `AAA-XXXX`) → redirige vers `/a/:code`.
 *     Détection synchrone, pas d'appel réseau, validation instantanée.
 *
 *  2. Un **lieu en texte libre** → géocodage Nominatim (debounce 400ms,
 *     limité au Bénin via `countrycodes=bj`) → liste de suggestions
 *     cliquables. Sélection → redirige vers `/carte?lat=…&lng=…`.
 *
 * Le composant ne demande jamais à l'utilisateur de choisir un "mode" —
 * la détection est implicite. Le placeholder le rappelle (« Code ou
 * lieu… »).
 */
export function SearchBar({ variant = 'landing', initialQuery = '' }: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // AbortController courant pour annuler la requête en vol quand l'utilisateur
  // continue à taper — évite que la dernière réponse n'écrase un état plus
  // récent.
  const inflightRef = useRef<AbortController | null>(null);

  // Normalisation côté détection : on uppercase, trim, et test la regex.
  // Le sous-set de codes est déjà cadré, pas besoin d'aller plus loin.
  const trimmed = query.trim();
  const isCodeFormat = useMemo(
    () => CODE_RE.test(trimmed.toUpperCase()),
    [trimmed],
  );

  // Debounce les requêtes Nominatim — pas d'appel sur format code, ni si
  // la query est trop courte pour être pertinente.
  useEffect(() => {
    if (isCodeFormat) {
      setResults([]);
      setSearching(false);
      return;
    }
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    inflightRef.current?.abort();
    inflightRef.current = controller;
    setSearching(true);

    const timer = setTimeout(() => {
      void geocode(trimmed, { signal: controller.signal })
        .then((hits) => {
          if (!controller.signal.aborted) setResults(hits);
        })
        .catch((err) => {
          // L'AbortError est attendu — l'utilisateur a continué à taper.
          if ((err as { name?: string })?.name === 'AbortError') return;
          if (!controller.signal.aborted) setResults([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, NOMINATIM_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, isCodeFormat]);

  // Soumission via Enter : si format code → nav directe ; sinon prend la
  // première suggestion Nominatim si disponible.
  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isCodeFormat) {
        router.push(`/a/${trimmed.toUpperCase()}`);
        return;
      }
      const first = results[0];
      if (first) {
        router.push(`/carte?lat=${first.lat}&lng=${first.lng}`);
      }
    },
    [isCodeFormat, trimmed, results, router],
  );

  const handlePickResult = useCallback(
    (hit: NominatimResult) => {
      router.push(`/carte?lat=${hit.lat}&lng=${hit.lng}`);
    },
    [router],
  );

  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
  }, []);

  const showDropdown =
    open &&
    !isCodeFormat &&
    trimmed.length >= MIN_QUERY_LENGTH &&
    (results.length > 0 || searching);

  return (
    <div className="relative w-full">
      <form
        onSubmit={handleSubmit}
        role="search"
        className={classNames(
          'flex items-center gap-2 rounded-full bg-surface border border-border shadow-sm transition-all',
          'focus-within:ring-[3px] focus-within:ring-primary/20 focus-within:border-primary focus-within:shadow-md',
          variant === 'landing' ? 'p-2' : 'p-1.5',
        )}
      >
        <span className="pl-2 text-text-muted" aria-hidden="true">
          {searching ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Search className="h-5 w-5" />
          )}
        </span>
        <input
          ref={inputRef}
          type="text"
          inputMode="search"
          autoComplete="off"
          aria-label="Recherche par code ou par lieu"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          placeholder="Code AKP-XXXX ou nom d'un lieu"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Léger délai pour que le clic sur une suggestion ait le temps
            // d'être capté avant que le dropdown ne ferme.
            setTimeout(() => setOpen(false), 120);
          }}
          className={classNames(
            'flex-1 min-w-0 bg-transparent outline-none text-text-primary placeholder:text-text-muted',
            variant === 'landing' ? 'h-12 text-base' : 'h-10 text-sm',
          )}
        />
        {trimmed.length > 0 ? (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Effacer la recherche"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-text-muted hover:bg-surface-muted transition-colors"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
        <button
          type="submit"
          disabled={
            trimmed.length === 0 ||
            (!isCodeFormat && trimmed.length < MIN_QUERY_LENGTH)
          }
          aria-label="Rechercher"
          className={classNames(
            'inline-flex items-center justify-center rounded-full bg-primary text-text-inverse',
            'transition-all duration-150 active:scale-[0.97]',
            'hover:bg-primary-hover hover:shadow-md',
            'disabled:bg-surface-muted disabled:text-text-muted disabled:cursor-not-allowed disabled:shadow-none',
            variant === 'landing' ? 'h-10 w-10' : 'h-9 w-9',
          )}
        >
          <Search
            className={variant === 'landing' ? 'h-5 w-5' : 'h-4 w-4'}
            aria-hidden="true"
          />
        </button>
      </form>

      {/* Hint contextuel — orientation discrète sur les deux modes possibles. */}
      {variant === 'landing' && trimmed.length === 0 ? (
        <p className="mt-2 text-xs text-text-muted text-center">
          Astuce : tapez un code <strong>AKP-XXXX</strong> pour aller direct à
          une adresse.
        </p>
      ) : null}

      {/* Dropdown des suggestions Nominatim — animation fade-up légère. */}
      {showDropdown ? (
        <ul
          role="listbox"
          aria-label="Suggestions de lieux"
          className="absolute left-0 right-0 top-full mt-2 z-30 max-h-80 overflow-y-auto rounded-xl bg-surface border border-border shadow-lg animate-fade-up"
        >
          {searching && results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-text-muted">
              Recherche en cours…
            </li>
          ) : results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-text-muted">
              Aucun lieu trouvé. Essayez un code <strong>AKP-XXXX</strong>.
            </li>
          ) : (
            results.map((hit) => (
              <li key={hit.id}>
                <button
                  type="button"
                  onClick={() => handlePickResult(hit)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-surface-muted transition-colors cursor-pointer"
                >
                  <MapPin
                    className="h-4 w-4 mt-0.5 text-text-muted shrink-0"
                    aria-hidden="true"
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block font-medium text-text-primary truncate">
                      {hit.shortName}
                    </span>
                    <span className="block text-xs text-text-muted truncate">
                      {hit.displayName}
                    </span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

export default SearchBar;
