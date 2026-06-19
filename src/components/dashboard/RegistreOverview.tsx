import { CheckCircle2, Clock, Footprints, Star } from 'lucide-react';
import { classNames } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import type { OwnerAddress } from '@/types/api';

export interface RegistreOverviewProps {
  addresses: OwnerAddress[];
  className?: string;
}

interface Tile {
  key: string;
  value: string;
  label: string;
  icon: LucideIcon;
  /** Métrique de « performance » (visites, note) — ressort en or sur le bandeau. */
  gold: boolean;
  /** Donnée présente — sinon valeur + icône passent en sourdine. */
  filled: boolean;
}

/**
 * Bandeau d'aperçu du registre — **un seul objet-signature** plutôt qu'une
 * rangée de cartes génériques : une plaque sombre `canvas-deep` texturée du
 * motif losange (écho des plaques de `/a/[code]`), découpée en cellules par des
 * hairlines. Les comptes (publiées, en attente) sont en blanc ; les métriques
 * de performance (visites, note) ressortent en or. Calculs **client-side**
 * depuis la liste — aucun endpoint stats dédié.
 */
export function RegistreOverview({ addresses, className }: RegistreOverviewProps) {
  const published = addresses.filter((a) => a.status === 'PUBLIEE').length;
  const pending = addresses.filter(
    (a) => a.status === 'EN_ATTENTE_VALIDATION',
  ).length;
  const totalVisits = addresses.reduce((sum, a) => sum + (a.visitCount ?? 0), 0);

  const rated = addresses.filter(
    (a) => a.ratingCount > 0 && a.averageRating != null,
  );
  const avgRating =
    rated.length > 0
      ? rated.reduce((sum, a) => sum + (a.averageRating ?? 0), 0) / rated.length
      : null;

  const tiles: Tile[] = [
    {
      key: 'published',
      value: String(published),
      label: published > 1 ? 'Publiées' : 'Publiée',
      icon: CheckCircle2,
      gold: false,
      filled: published > 0,
    },
    {
      key: 'pending',
      value: String(pending),
      label: 'En attente',
      icon: Clock,
      gold: false,
      filled: pending > 0,
    },
    {
      key: 'visits',
      value: String(totalVisits),
      label: totalVisits > 1 ? 'Visites' : 'Visite',
      icon: Footprints,
      gold: true,
      filled: totalVisits > 0,
    },
    {
      key: 'rating',
      value: avgRating != null ? avgRating.toFixed(1).replace('.', ',') : '·',
      label: 'Note moyenne',
      icon: Star,
      gold: true,
      filled: avgRating != null,
    },
  ];

  return (
    <dl
      aria-label="Aperçu de votre registre"
      className={classNames(
        // gap-px + fond clair = hairlines entre cellules ; cellules sombres.
        'grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-lg)]',
        'border border-white/10 bg-white/10 shadow-md sm:grid-cols-4',
        className,
      )}
    >
      {tiles.map((tile) => {
        const Icon = tile.icon;
        const iconClass = !tile.filled
          ? 'text-white/30'
          : tile.gold
            ? 'text-accent'
            : 'text-primary-light';
        const valueClass =
          tile.gold && tile.filled ? 'text-accent' : 'text-text-inverse';
        return (
          <div
            key={tile.key}
            className="relative flex flex-col gap-2 bg-canvas-deep motif-light p-4 sm:p-5"
          >
            <Icon className={classNames('h-4 w-4', iconClass)} aria-hidden="true" />
            <dd
              className={classNames(
                'code-type font-black text-3xl leading-none tabular-nums',
                valueClass,
              )}
            >
              {tile.value}
            </dd>
            <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">
              {tile.label}
            </dt>
          </div>
        );
      })}
    </dl>
  );
}

export default RegistreOverview;
