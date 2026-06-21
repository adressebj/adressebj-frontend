'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Eye,
  Footprints,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  QrCode,
  Star,
  type LucideIcon,
} from 'lucide-react';
import { AddressCodeDisplay } from '@/components/address/AddressCodeDisplay';
import { AddressStatusBadge } from '@/components/address/AddressStatusBadge';
import { CategoryBadge } from '@/components/address/CategoryBadge';
import { ShareButton } from '@/components/address/ShareButton';
import { Button } from '@/components/ui/Button';
import { classNames } from '@/lib/utils';
import type { OwnerAddress } from '@/types/api';

export interface OwnerAddressPanelProps {
  address: OwnerAddress;
  className?: string;
}

/**
 * Panneau d'adresse « héros » du registre (`/dashboard`). Objet pleine largeur
 * — média portail à gauche (desktop) / en bannière (mobile), corps à droite
 * avec code signature copiable, quartier, performance compacte et actions de
 * partage. Le partage n'est actif que sur une adresse publiée et active ; les
 * autres statuts orientent vers l'action utile (Modifier) ou expliquent
 * l'indisponibilité. Le détail est accessible via la photo et le menu ⋯.
 */
export function OwnerAddressPanel({ address, className }: OwnerAddressPanelProps) {
  const detailHref = `/dashboard/address/${address.code}`;
  // Le partage ne se déclenche qu'au clic (CSR, window toujours présent) ;
  // le fallback origin vide au SSR est volontaire et sans effet.
  const publicUrl =
    (typeof window !== 'undefined' ? window.location.origin : '') +
    `/a/${address.code}`;
  const rated = address.ratingCount > 0 && address.averageRating != null;
  const canShare = address.status === 'PUBLIEE' && address.isActive;

  // Légende quand le partage est indisponible — on n'invite pas à partager un
  // lien public qui n'est pas (encore) live.
  const unavailableCaption = !address.isActive
    ? 'Désactivée'
    : address.status === 'EN_ATTENTE_VALIDATION'
      ? 'Bientôt partageable'
      : 'Brouillon';

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Menu ⋯ : fermeture au clic extérieur + Échap (même pattern que le menu
  // avatar de la navbar).
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  return (
    <article
      className={classNames(
        'card overflow-hidden flex flex-col sm:flex-row',
        !address.isActive && 'opacity-75',
        className,
      )}
    >
      {/* ── Média : portail + statut en surimpression, lien vers la fiche ── */}
      <Link
        href={detailHref}
        aria-label={`Voir l'adresse ${address.code}`}
        className="group relative block aspect-[16/10] overflow-hidden bg-surface-muted sm:aspect-auto sm:w-56 sm:shrink-0"
      >
        <Image
          src={address.photoUrl}
          alt={`Portail ${address.code}`}
          fill
          sizes="(min-width: 640px) 14rem, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          unoptimized
        />
        <span className="absolute left-3 top-3 drop-shadow-sm">
          <AddressStatusBadge status={address.status} />
        </span>
      </Link>

      {/* ── Corps ── */}
      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <AddressCodeDisplay code={address.code} size="md" />

          <div ref={menuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Plus d'actions"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-muted hover:text-text-primary cursor-pointer"
            >
              <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
            </button>

            {menuOpen ? (
              <div
                role="menu"
                aria-label="Actions de l'adresse"
                className="absolute right-0 top-full z-10 mt-2 w-52 origin-top-right rounded-2xl border border-border/70 bg-surface p-1.5 shadow-lg animate-fade-up"
              >
                <PanelMenuLink href={detailHref} icon={Eye}>
                  Voir la fiche
                </PanelMenuLink>
                <PanelMenuLink href={`/a/${address.code}`} icon={Eye}>
                  Aperçu visiteur
                </PanelMenuLink>
                <PanelMenuLink href={`${detailHref}/edit`} icon={Pencil}>
                  Modifier
                </PanelMenuLink>
                <PanelMenuLink href={`${detailHref}/print`} icon={QrCode}>
                  QR / Imprimer
                </PanelMenuLink>
              </div>
            ) : null}
          </div>
        </div>

        <p className="flex items-center gap-1.5 text-sm text-text-muted">
          <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="truncate">
            {address.quartier?.name ?? 'Quartier inconnu'}
          </span>
        </p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
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
              <Footprints className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              {address.visitCount}
            </span>
          </span>
        </div>

        {/* ── Actions : partage (publiée) / modifier (rejetée) / indispo ── */}
        <div className="mt-auto flex items-center gap-2 pt-1">
          {canShare ? (
            <ShareButton
              url={publicUrl}
              title={`Adresse ${address.code}`}
              text={`Voici mon adresse AdresseBJ : ${address.code}`}
              variant="primary"
              size="sm"
            />
          ) : address.status === 'REJETEE' && address.isActive ? (
            <Link href={`${detailHref}/edit`}>
              <Button
                variant="primary"
                size="sm"
                leadingIcon={<Pencil className="h-4 w-4" aria-hidden="true" />}
              >
                Modifier
              </Button>
            </Link>
          ) : (
            <>
              <Button
                variant="primary"
                size="sm"
                disabled
                leadingIcon={<MessageCircle className="h-4 w-4" aria-hidden="true" />}
              >
                Partager
              </Button>
              <span className="text-xs text-text-muted">{unavailableCaption}</span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function PanelMenuLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-muted transition-colors hover:bg-surface-muted hover:text-text-primary"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span>{children}</span>
    </Link>
  );
}

export default OwnerAddressPanel;
