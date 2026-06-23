'use client';

import { Clock, ExternalLink, MapPin, Phone, X } from 'lucide-react';
import type { SelectedPlace } from '@/lib/place';

export interface PlaceCardProps {
  place: SelectedPlace;
  onClose: () => void;
}

/**
 * Fiche sommaire d'un lieu OpenStreetMap recherché par nom. Distincte d'une
 * adresse AdresseBJ (qui a un code) : on l'indique explicitement. Affiche le
 * type, la localité et — pour les POI — les détails OSM disponibles
 * (site web, téléphone, horaires).
 */
export function PlaceCard({ place, onClose }: PlaceCardProps) {
  const websiteHref = place.website
    ? place.website.startsWith('http')
      ? place.website
      : `https://${place.website}`
    : null;
  const websiteLabel = place.website?.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const hasDetails = Boolean(place.website || place.phone || place.openingHours);

  return (
    <div className="rounded-[var(--radius-lg)] border border-border-strong bg-surface shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-surface text-primary"
        >
          <MapPin className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center rounded-full bg-surface-muted text-text-muted px-2 py-0.5 text-[11px] font-semibold border border-border">
            {place.category}
          </span>
          <h2 className="font-display font-bold text-lg text-text-primary leading-tight mt-1 truncate">
            {place.name}
          </h2>
          {place.locality ? (
            <p className="text-sm text-text-muted truncate">{place.locality}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la fiche du lieu"
          className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-full text-text-muted hover:bg-surface-muted hover:text-text-primary transition-colors"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {hasDetails ? (
        <div className="flex flex-col gap-2 border-t border-border pt-3 text-sm">
          {websiteHref ? (
            <a
              href={websiteHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-primary hover:underline min-w-0"
            >
              <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{websiteLabel}</span>
            </a>
          ) : null}
          {place.phone ? (
            <a
              href={`tel:${place.phone.replace(/\s/g, '')}`}
              className="flex items-center gap-2 text-text-primary"
            >
              <Phone className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
              <span className="truncate">{place.phone}</span>
            </a>
          ) : null}
          {place.openingHours ? (
            <p className="flex items-center gap-2 text-text-muted">
              <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{place.openingHours}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      <p className="flex items-center gap-1.5 text-xs text-text-muted">
        <span
          aria-hidden="true"
          className="inline-block h-2 w-2 rounded-full bg-accent"
        />
        Lieu OpenStreetMap — repère géographique, pas une adresse AdresseBJ.
      </p>
    </div>
  );
}

export default PlaceCard;
