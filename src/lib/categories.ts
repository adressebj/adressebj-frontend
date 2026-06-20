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
  /**
   * Couleur d'identité de la catégorie (hex). Sert partout : icône mise en
   * avant sur la fiche/la sélection, teinte du badge, couleur du marqueur sur
   * la carte, accent du filtre. Palette désaturée et accordée à la marque
   * (assez sombre pour rester lisible sur fond papier comme sur fond blanc),
   * pensée pour différencier les huit catégories d'un coup d'œil sans virer à
   * l'arc-en-ciel criard. `DOMICILE` reprend le vert primary de la marque.
   */
  color: string;
}

export const CATEGORIES: Record<Category, CategoryMeta> = {
  DOMICILE:       { label: 'Domicile',                       icon: Home,            color: '#0E6B43' },
  COMMERCE:       { label: 'Commerce',                       icon: Store,           color: '#3A5BA0' },
  RESTAURATION:   { label: 'Restauration',                   icon: UtensilsCrossed, color: '#C2410C' },
  SANTE:          { label: 'Santé',                          icon: Cross,           color: '#BE123C' },
  EDUCATION:      { label: 'Éducation',                      icon: GraduationCap,   color: '#6D28D9' },
  ADMINISTRATION: { label: 'Administration / service public', icon: Landmark,       color: '#0F766E' },
  LOISIR:         { label: 'Loisir',                          icon: Music,          color: '#B83280' },
  AUTRE:          { label: 'Autre',                           icon: MapPin,         color: '#6B5E4E' },
};

/**
 * Fond très légèrement teinté de la couleur de catégorie — pour les badges et
 * surfaces sélectionnées. `color-mix` garde une seule source de vérité (la
 * couleur) au lieu de dupliquer une seconde teinte par catégorie.
 */
export function categoryTint(color: string, percent = 12): string {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}

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
