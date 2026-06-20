import { classNames } from '@/lib/utils';
import { CATEGORIES } from '@/lib/categories';
import type { AddressCategory } from '@/types/api';

export interface CategoryBadgeProps {
  category: AddressCategory;
  size?: 'sm' | 'md';
  className?: string;
}

const SIZES: Record<NonNullable<CategoryBadgeProps['size']>, string> = {
  sm: 'text-xs gap-1.5',
  md: 'text-sm gap-2',
};

const ICON_SIZES: Record<NonNullable<CategoryBadgeProps['size']>, string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
};

/**
 * Identité catégorie cohérente partout — vue publique, vue propriétaire,
 * dashboard, modération. Comme sur la fiche et la carte : **icône nue mise en
 * avant** dans la couleur de la catégorie + libellé assorti, sans pastille ni
 * cadre. C'est la couleur + l'icône qui signent la catégorie.
 */
export function CategoryBadge({
  category,
  size = 'md',
  className,
}: CategoryBadgeProps) {
  const meta = CATEGORIES[category];
  const Icon = meta.icon;
  return (
    <span
      className={classNames('inline-flex items-center font-semibold', SIZES[size], className)}
      style={{ color: meta.color }}
      aria-label={`Catégorie : ${meta.label}`}
    >
      <Icon className={ICON_SIZES[size]} aria-hidden="true" />
      <span>{meta.label}</span>
    </span>
  );
}

export default CategoryBadge;
