import { classNames } from '@/lib/utils';
import { CATEGORIES } from '@/lib/categories';
import type { AddressCategory } from '@/types/api';

export interface CategoryMedallionProps {
  category: AddressCategory;
  className?: string;
}

/**
 * Identité de catégorie pour la fiche-repère. L'icône est désormais **mise en
 * avant nue**, dans la couleur d'identité de la catégorie (cf. `CATEGORIES`) —
 * plus de plaque losange : c'est la couleur + l'icône qui signent la catégorie,
 * de façon cohérente avec le badge, le marqueur de carte et le filtre. Le
 * libellé reste traité en titre éditorial (Fraunces) sous un sur-titre discret.
 */
export function CategoryMedallion({ category, className }: CategoryMedallionProps) {
  const meta = CATEGORIES[category];
  const Icon = meta.icon;
  return (
    <div className={classNames('flex items-center gap-3.5', className)}>
      <Icon
        className="h-8 w-8 shrink-0"
        style={{ color: meta.color }}
        strokeWidth={2}
        aria-hidden="true"
      />
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
