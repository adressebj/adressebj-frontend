'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, MapPin, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { classNames } from '@/lib/utils';
import { api, ApiError } from '@/lib/api';
import type { GeoJsonPolygon, Quartier } from '@/types/api';

export interface StepQuartierValue {
  quartierId: string;
  quartierName: string;
  // Polygone GeoJSON optionnel passé à Step 2 GPS pour vérifier que la
  // position acquise tombe bien dans le quartier choisi. Absent en mode
  // mock si le quartier n'a pas de géométrie — le check est alors
  // gracieusement ignoré.
  quartierPolygon?: GeoJsonPolygon | null;
}

export interface StepQuartierProps {
  value: StepQuartierValue | null;
  onComplete: (value: StepQuartierValue) => void;
}

export function StepQuartier({ value, onComplete }: StepQuartierProps) {
  const [quartiers, setQuartiers] = useState<Quartier[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(value?.quartierId ?? null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await api.quartiers();
        if (!cancelled) setQuartiers(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? 'Impossible de charger les quartiers.'
              : 'Une erreur est survenue.',
          );
          setQuartiers([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!quartiers) return [];
    const needle = search.trim().toLowerCase();
    if (!needle) return quartiers;
    return quartiers.filter(
      (q) =>
        q.name.toLowerCase().includes(needle) ||
        q.prefix.toLowerCase().includes(needle),
    );
  }, [quartiers, search]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedId || !quartiers) return;
    const quartier = quartiers.find((q) => q.id === selectedId);
    if (!quartier) return;
    onComplete({
      quartierId: quartier.id,
      quartierName: quartier.name,
      quartierPolygon: quartier.polygon ?? null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h2 className="font-display font-semibold text-h3 text-text-primary">
          Où se situe votre adresse&nbsp;?
        </h2>
        <p className="text-sm text-text-muted">
          Sélectionnez le quartier ou l’arrondissement correspondant à la
          nouvelle adresse.
        </p>
      </header>

      <Input
        label="Rechercher un quartier"
        placeholder="Rechercher un quartier..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        leadingIcon={<Search className="h-4 w-4" aria-hidden="true" />}
      />

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <ul
        role="radiogroup"
        aria-label="Quartiers disponibles"
        className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-1"
      >
        {quartiers === null ? (
          <li>
            <Skeleton width="100%" height={88} count={3} />
          </li>
        ) : filtered.length === 0 ? (
          <li className="text-sm text-text-muted py-3 text-center md:col-span-2">
            Aucun quartier ne correspond à votre recherche.
          </li>
        ) : (
          filtered.map((quartier) => {
            const checked = selectedId === quartier.id;
            return (
              <li key={quartier.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  onClick={() => setSelectedId(quartier.id)}
                  className={classNames(
                    'relative w-full flex flex-col text-left rounded-xl p-4',
                    'transition-all duration-200 active:scale-[0.98] cursor-pointer',
                    checked
                      ? 'bg-primary-surface border-2 border-primary shadow-sm'
                      : 'bg-surface border border-border-strong shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]',
                  )}
                >
                  <span className="flex justify-between items-start w-full mb-2">
                    <span className="flex items-center gap-2">
                      <MapPin
                        className={classNames(
                          'h-5 w-5 shrink-0',
                          checked ? 'text-primary' : 'text-text-muted',
                        )}
                        fill={checked ? 'currentColor' : 'none'}
                        aria-hidden="true"
                      />
                      <span
                        className={classNames(
                          'font-display font-semibold text-h3',
                          checked ? 'text-primary' : 'text-text-primary',
                        )}
                      >
                        {quartier.name}
                      </span>
                    </span>
                    {checked ? (
                      <span
                        aria-hidden="true"
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-text-inverse"
                      >
                        <Check className="h-4 w-4" />
                      </span>
                    ) : null}
                  </span>
                  <span className="text-sm text-text-muted">
                    Préfixe {quartier.prefix}
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={!selectedId}
        fullWidth
        className="rounded-full"
        trailingIcon={<ArrowRight className="h-5 w-5" aria-hidden="true" />}
      >
        Continuer
      </Button>
    </form>
  );
}

export default StepQuartier;
