import { classNames } from '@/lib/utils';
import { CATEGORIES } from '@/lib/categories';
import type { AddressCategory } from '@/types/api';

export interface CategoryBadgeProps {
  category: AddressCategory;
  size?: 'sm' | 'md';
  className?: string;
}

const SIZES: Record<NonNullable<CategoryBadgeProps['size']>, string> = {
  sm: 'text-xs px-2 py-0.5 gap-1.5',
  md: 'text-sm px-3 py-1 gap-2',
};

const ICON_SIZES: Record<NonNullable<CategoryBadgeProps['size']>, string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
};

/**
 * Pastille catégorie cohérente partout — vue publique, vue propriétaire,
 * dashboard, modération. Reprend l'icône + le libellé FR de `CATEGORIES`
 * et applique le ton vert primary (l'élément n'a pas de gradation par
 * catégorie : c'est le badge le plus neutre du système).
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
      className={classNames(
        'inline-flex items-center font-medium rounded-full bg-primary-surface text-primary border border-primary/15',
        SIZES[size],
        className,
      )}
      aria-label={`Catégorie : ${meta.label}`}
    >
      <Icon className={ICON_SIZES[size]} aria-hidden="true" />
      <span>{meta.label}</span>
    </span>
  );
}

export default CategoryBadge;
