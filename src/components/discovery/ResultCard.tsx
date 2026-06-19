'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { Crosshair } from 'lucide-react';
import { CATEGORIES } from '@/lib/categories';
import { classNames } from '@/lib/utils';
import type { DiscoveryItem } from '@/types/api';

export interface ResultCardProps {
  item: DiscoveryItem;
  active: boolean;
  /** Survol/focus de la carte → met en avant le marqueur (`null` à la sortie). */
  onActivate: (code: string | null) => void;
  /** « Centrer sur la carte » — vole vers le marqueur sans quitter la page. */
  onLocate: (item: DiscoveryItem) => void;
  /** Rang dans la liste — pilote le délai de l'entrée en cascade. */
  index?: number;
}

/**
 * Carte de résultat du rail/bottom-sheet de découverte. Cliquer la carte ouvre
 * l'adresse (`/a/:code`) ; le bouton boussole recentre la carte ; le survol
 * surligne le marqueur correspondant (synchro liste ↔ carte).
 */
export function ResultCard({
  item,
  active,
  onActivate,
  onLocate,
  index = 0,
}: ResultCardProps) {
  const ref = useRef<HTMLLIElement>(null);
  const preview = item.preview;
  const Icon = CATEGORIES[item.category].icon;

  // Quand le marqueur correspondant est survolé sur la carte, ramener la carte
  // liste dans le viewport (no-op si déjà visible).
  useEffect(() => {
    if (active) {
      ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [active]);

  return (
    <li
      ref={ref}
      onMouseEnter={() => onActivate(item.code)}
      onMouseLeave={() => onActivate(null)}
      onFocus={() => onActivate(item.code)}
      onBlur={() => onActivate(null)}
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
      className={classNames(
        'group relative card card-interactive overflow-hidden animate-fade-up rounded-2xl',
        active ? 'border-primary ring-1 ring-primary/30' : '',
      )}
    >
      <Link
        href={`/a/${item.code}`}
        className="flex gap-3 p-2.5 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <span className="shrink-0 w-[120px] aspect-video overflow-hidden rounded-xl bg-surface-muted relative">
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-110"
            style={
              preview?.photoUrl
                ? { backgroundImage: `url('${preview.photoUrl}')` }
                : undefined
            }
          />
        </span>
        <span className="flex min-w-0 flex-1 flex-col py-0.5">
          <span className="code-type text-lg font-bold text-primary leading-none">
            {item.code}
          </span>
          <span className="mt-1.5 flex items-center gap-1.5 text-xs text-text-muted">
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{CATEGORIES[item.category].label}</span>
          </span>
          <span className="mt-auto truncate text-sm font-medium text-text-primary">
            {preview?.quartierName ?? '—'}
          </span>
        </span>
      </Link>

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          onLocate(item);
        }}
        aria-label={`Centrer la carte sur ${item.code}`}
        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-text-muted shadow-sm backdrop-blur transition-all duration-200 opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 focus-visible:opacity-100 focus-visible:scale-100 hover:text-primary hover:bg-surface tap-press"
      >
        <Crosshair className="h-4 w-4" aria-hidden="true" />
      </button>
    </li>
  );
}

export default ResultCard;
