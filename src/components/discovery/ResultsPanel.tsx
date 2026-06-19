'use client';

import { Compass, RefreshCw, SearchX } from 'lucide-react';
import { ResultCard } from './ResultCard';
import type { DiscoveryItem } from '@/types/api';

export interface ResultsPanelProps {
  /** Items affichables (DOMICILE muets déjà exclus par le parent). */
  items: DiscoveryItem[];
  loading: boolean;
  error: boolean;
  activeCode: string | null;
  onActivate: (code: string | null) => void;
  onLocate: (item: DiscoveryItem) => void;
  onRetry: () => void;
  /** Vrai si au moins un filtre catégorie est actif (adapte le message vide). */
  hasFilters: boolean;
  onClearFilters: () => void;
}

/**
 * Corps scrollable du rail (desktop) / bottom-sheet (mobile) : liste de cartes
 * de résultats, avec états chargement (skeleton), vide et erreur soignés.
 */
export function ResultsPanel({
  items,
  loading,
  error,
  activeCode,
  onActivate,
  onLocate,
  onRetry,
  hasFilters,
  onClearFilters,
}: ResultsPanelProps) {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-light text-danger">
          <RefreshCw className="h-6 w-6" aria-hidden="true" />
        </span>
        <p className="font-display font-semibold text-text-primary">
          Le chargement a échoué
        </p>
        <p className="max-w-xs text-sm text-text-muted">
          Impossible de récupérer les adresses de cette zone.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 inline-flex items-center gap-2 rounded-full bg-primary px-5 h-11 font-semibold text-text-inverse shadow-sm hover:bg-primary-hover transition-all tap-press"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Réessayer
        </button>
      </div>
    );
  }

  if (loading && items.length === 0) {
    return (
      <ul className="flex flex-col gap-2.5 p-3" aria-label="Chargement des adresses">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="card flex gap-3 p-2.5 rounded-2xl">
            <span className="w-[120px] aspect-video shrink-0 rounded-xl skeleton-shimmer" />
            <span className="flex flex-1 flex-col gap-2 py-1">
              <span className="h-4 w-24 rounded skeleton-shimmer" />
              <span className="h-3 w-20 rounded skeleton-shimmer" />
              <span className="mt-auto h-3.5 w-28 rounded skeleton-shimmer" />
            </span>
          </li>
        ))}
      </ul>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <div className="relative flex flex-col items-center justify-center gap-3 px-6 py-14 text-center motif-paper">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-surface text-primary ring-1 ring-primary/15 hover:-translate-y-1 transition-transform duration-500">
          {hasFilters ? (
            <SearchX className="h-6 w-6" aria-hidden="true" />
          ) : (
            <Compass className="h-6 w-6 animate-[pulse_4s_cubic-bezier(0.4,0,0.6,1)_infinite]" aria-hidden="true" />
          )}
        </span>
        <p className="font-display font-semibold text-text-primary">
          Aucune adresse par ici
        </p>
        <p className="max-w-xs text-sm text-text-muted">
          {hasFilters
            ? 'Aucun résultat pour ces filtres dans cette zone. Élargissez la recherche ou dézoomez.'
            : 'Déplacez ou dézoomez la carte pour explorer d’autres quartiers.'}
        </p>
        {hasFilters ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-1 inline-flex items-center gap-2 rounded-full border border-border-strong px-5 h-11 font-semibold text-text-primary hover:border-primary hover:bg-primary-surface transition-all tap-press"
          >
            Réinitialiser les filtres
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2.5 p-3">
      {items.map((item, idx) => (
        <ResultCard
          key={item.code}
          index={idx}
          item={item}
          active={activeCode === item.code}
          onActivate={onActivate}
          onLocate={onLocate}
        />
      ))}
    </ul>
  );
}

export default ResultsPanel;
