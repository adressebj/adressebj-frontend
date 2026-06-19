'use client';

import { CATEGORIES, FILTERABLE_CATEGORIES, type Category } from '@/lib/categories';
import { classNames } from '@/lib/utils';
import { LayoutGrid } from 'lucide-react';

export interface CategoryFiltersProps {
  selected: Set<Category>;
  onToggle: (cat: Category) => void;
  onClear: () => void;
}

/**
 * Rangée de chips de filtre catégorie, scrollable horizontalement. « Tous »
 * remet à zéro ; les autres sont des bascules multi-sélection. Réutilisable
 * dans le rail desktop comme dans la bottom-sheet mobile.
 */
export function CategoryFilters({ selected, onToggle, onClear }: CategoryFiltersProps) {
  return (
    <div
      role="listbox"
      aria-label="Filtres par catégorie"
      aria-multiselectable="true"
      className="no-scrollbar flex items-center gap-2.5 overflow-x-auto snap-x snap-mandatory px-2 py-2 -mx-2"
    >
      <Chip 
        label="Tous" 
        icon={<LayoutGrid className="h-4 w-4" aria-hidden="true" />}
        active={selected.size === 0} 
        onClick={onClear} 
      />
      {FILTERABLE_CATEGORIES.map((cat) => {
        const Icon = CATEGORIES[cat].icon;
        return (
          <Chip
            key={cat}
            label={CATEGORIES[cat].label}
            icon={<Icon className="h-4 w-4" aria-hidden="true" />}
            active={selected.has(cat)}
            onClick={() => onToggle(cat)}
          />
        );
      })}
    </div>
  );
}

function Chip({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onClick}
      className={classNames(
        'snap-start inline-flex shrink-0 items-center gap-2 h-10 px-4 rounded-full text-sm font-medium border transition-all cursor-pointer tap-press',
        active
          ? 'bg-primary border-primary text-text-inverse scale-105'
          : 'bg-surface border-border text-text-muted hover:text-text-primary hover:border-border-strong hover:bg-surface-muted hover:scale-105',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

export default CategoryFilters;
