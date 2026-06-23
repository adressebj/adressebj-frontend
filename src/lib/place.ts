// Lieu OpenStreetMap sélectionné depuis la recherche par nom — transporté de la
// SearchBar vers /carte via un paramètre d'URL (partageable), pour y afficher
// une fiche sommaire. Distinct d'une adresse AdresseBJ (qui a un code).
import type { NominatimResult } from '@/lib/nominatim';

export interface SelectedPlace {
  name: string;
  category: string;
  lat: number;
  lng: number;
  locality?: string;
  website?: string;
  phone?: string;
  openingHours?: string;
  displayName?: string;
}

// Clés compactes pour limiter la longueur de l'URL.
interface Packed {
  n: string;
  c: string;
  a: number;
  o: number;
  l?: string;
  w?: string;
  p?: string;
  h?: string;
  d?: string;
}

export function encodePlace(r: NominatimResult): string {
  const packed: Packed = {
    n: r.shortName,
    c: r.category,
    a: r.lat,
    o: r.lng,
    l: r.locality,
    w: r.website,
    p: r.phone,
    h: r.openingHours,
    d: r.displayName,
  };
  // encodeURIComponent → ASCII sûr avant btoa (texte français/UTF-8).
  return btoa(encodeURIComponent(JSON.stringify(packed)));
}

export function decodePlace(param: string | null | undefined): SelectedPlace | null {
  if (!param) return null;
  try {
    const json = decodeURIComponent(atob(param));
    const p = JSON.parse(json) as Packed;
    if (typeof p.n !== 'string' || !Number.isFinite(p.a) || !Number.isFinite(p.o)) {
      return null;
    }
    return {
      name: p.n,
      category: p.c,
      lat: p.a,
      lng: p.o,
      locality: p.l,
      website: p.w,
      phone: p.p,
      openingHours: p.h,
      displayName: p.d,
    };
  } catch {
    return null;
  }
}
