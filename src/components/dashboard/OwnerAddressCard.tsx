import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, Footprints, MapPin, Star } from 'lucide-react';
import { AddressStatusBadge } from '@/components/address/AddressStatusBadge';
import { CategoryBadge } from '@/components/address/CategoryBadge';
import { classNames } from '@/lib/utils';
import type { OwnerAddress } from '@/types/api';

export interface OwnerAddressCardProps {
  address: OwnerAddress;
  className?: string;
}

/**
 * Fiche d'adresse du registre propriétaire (accueil `/dashboard`). Met le
 * `code` en objet typographique signature (`.code-type`), pose le portail en
 * bannière avec le statut de modération en surimpression, et résume la
 * performance (note + visites). Toute la carte est un lien vers la vue détail.
 */
export function OwnerAddressCard({ address, className }: OwnerAddressCardProps) {
  const rated = address.ratingCount > 0 && address.averageRating != null;

  return (
    <Link
      href={`/dashboard/address/${address.code}`}
      aria-label={`Voir l'adresse ${address.code}`}
      className={classNames(
        'card card-interactive group flex flex-col overflow-hidden',
        className,
      )}
    >
      {/* ── Portail en bannière + statut en surimpression ── */}
      <figure className="relative aspect-[16/10] w-full overflow-hidden bg-surface-muted">
        <Image
          src={address.photoUrl}
          alt={`Portail ${address.code}`}
          fill
          sizes="(min-width: 640px) 22rem, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          unoptimized
        />
        <span className="absolute left-3 top-3 drop-shadow-sm">
          <AddressStatusBadge status={address.status} />
        </span>
      </figure>

      {/* ── Identité + performance ── */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="code-type text-2xl font-black leading-none text-text-primary">
            {address.code}
          </h3>
          <ChevronRight
            className="h-5 w-5 shrink-0 text-text-muted transition-transform duration-200 group-hover:translate-x-1 group-hover:text-primary"
            aria-hidden="true"
          />
        </div>

        <p className="flex items-center gap-1.5 text-sm text-text-muted">
          <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="truncate">
            {address.quartier?.name ?? 'Quartier inconnu'}
          </span>
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1">
          <CategoryBadge category={address.category} size="sm" />
          <span className="flex items-center gap-3 text-xs font-medium text-text-muted">
            {rated ? (
              <span className="inline-flex items-center gap-1">
                <Star
                  className="h-3.5 w-3.5 fill-accent text-accent"
                  aria-hidden="true"
                />
                {address.averageRating!.toFixed(1).replace('.', ',')}
              </span>
            ) : (
              <span>Pas encore notée</span>
            )}
            <span className="inline-flex items-center gap-1">
              <Footprints
                className="h-3.5 w-3.5 text-primary"
                aria-hidden="true"
              />
              {address.visitCount}
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}

export default OwnerAddressCard;
