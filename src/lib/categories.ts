import {
  Cross,
  GraduationCap,
  Home,
  Landmark,
  MapPin,
  Music,
  Store,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import type { AddressCategory } from '@/types/api';

/**
 * Métadonnées de présentation pour les huit catégories d'adresse définies
 * par le CDC v5 §4. Le type canonique vit dans `types/api.ts` (contrat API) ;
 * ici on n'expose que les libellés FR et les icônes lucide associés.
 *
 * `DOMICILE` est traitée différemment côté carte publique : marqueur muet
 * sans popup d'aperçu (matrice de visibilité CDC Frontend §9 /carte).
 */
export type Category = AddressCategory;

export interface CategoryMeta {
  label: string;
  icon: LucideIcon;
}

export const CATEGORIES: Record<Category, CategoryMeta> = {
  DOMICILE:       { label: 'Domicile',                       icon: Home },
  COMMERCE:       { label: 'Commerce',                       icon: Store },
  RESTAURATION:   { label: 'Restauration',                   icon: UtensilsCrossed },
  SANTE:          { label: 'Santé',                          icon: Cross },
  EDUCATION:      { label: 'Éducation',                      icon: GraduationCap },
  ADMINISTRATION: { label: 'Administration / service public', icon: Landmark },
  LOISIR:         { label: 'Loisir',                          icon: Music },
  AUTRE:          { label: 'Autre',                           icon: MapPin },
};

/**
 * Catégories filtrables sur la carte publique — tout sauf `DOMICILE` qui
 * reste toujours en marqueur muet (pas de chip "Domiciles" possible).
 */
export const FILTERABLE_CATEGORIES: Category[] = [
  'COMMERCE',
  'RESTAURATION',
  'SANTE',
  'EDUCATION',
  'ADMINISTRATION',
  'LOISIR',
  'AUTRE',
];
