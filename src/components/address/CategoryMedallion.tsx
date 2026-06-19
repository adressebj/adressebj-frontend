import { classNames } from '@/lib/utils';
import { CATEGORIES } from '@/lib/categories';
import type { AddressCategory } from '@/types/api';

export interface CategoryMedallionProps {
  category: AddressCategory;
  className?: string;
}

/**
 * Identité de catégorie pour la fiche-repère : l'icône est posée dans un
 * **médaillon en losange** — la forme signature du motif Fon/kente de la marque
 * (cf. `.motif-paper`) — ce qui distingue immédiatement AdresseBJ d'une énième
 * pilule générique. Le libellé est traité comme un titre éditorial (Fraunces)
 * sous un sur-titre discret.
 *
 * L'icône reste droite (contre-rotation) ; seule la plaque tourne à 45°.
 */
export function CategoryMedallion({ category, className }: CategoryMedallionProps) {
  const meta = CATEGORIES[category];
  const Icon = meta.icon;
  return (
    <div className={classNames('flex items-center gap-3', className)}>
      <span
        className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center"
        aria-hidden="true"
      >
        {/* Plaque losange — fond papier + liseré or fin (accent de marque). */}
        <span className="absolute inset-0 rotate-45 rounded-[12px] bg-primary-surface border border-accent/40 shadow-sm" />
        {/* Losange interne ajouré — écho du motif textile, très discret. */}
        <span className="absolute inset-[6px] rotate-45 rounded-[8px] border border-primary/15" />
        <Icon className="relative h-5 w-5 text-primary" strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
          Catégorie
        </p>
        <p className="font-display font-semibold text-base leading-tight text-text-primary line-clamp-2">
          {meta.label}
        </p>
      </div>
    </div>
  );
}

export default CategoryMedallion;
