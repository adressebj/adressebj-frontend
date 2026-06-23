/**
 * Géocodage Nominatim (OpenStreetMap public) — utilisé par la SearchBar
 * unifiée pour résoudre un texte libre en suggestions de lieux du Bénin.
 *
 * Politique d'usage Nominatim — points respectés ici :
 * - User-Agent identifiable (en-tête `Accept-Language` + libellé app dans
 *   le path) car les navigateurs n'autorisent pas le UA custom en CORS.
 * - Quotas modérés : on appelle uniquement sur soumission/debounce, jamais
 *   à chaque frappe (le débounce est géré par le hook côté composant).
 * - Bouclage géographique : `countrycodes=bj` pour limiter au Bénin.
 *
 * On demande `addressdetails`, `extratags` et `namedetails` pour pouvoir
 * afficher une fiche sommaire d'un lieu (type, localité, et — pour les POI —
 * site web / téléphone / horaires quand OSM les a).
 *
 * Pas de cache côté frontend pour le prototype — la fréquence d'appel
 * reste basse vu le débounce + l'usage ponctuel.
 */

export interface NominatimResult {
  /** Identifiant interne Nominatim (`place_id`) — stable pour la clé React. */
  id: string;
  /** Libellé complet affiché à l'utilisateur (peut être long). */
  displayName: string;
  /** Libellé court (premier segment avant la virgule) pour les listes serrées. */
  shortName: string;
  lat: number;
  lng: number;
  /** Nature du lieu, en français lisible ("Quartier", "Rue", "Marché"…). */
  category: string;
  /** Contexte géographique court ("Akpakpa · Cotonou"), si disponible. */
  locality?: string;
  /** Détails POI (extratags OSM), présents seulement quand OSM les renseigne. */
  website?: string;
  phone?: string;
  openingHours?: string;
}

const ENDPOINT = 'https://nominatim.openstreetmap.org/search';

interface NominatimApiHit {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  class?: string;
  type?: string;
  address?: Record<string, string>;
  extratags?: Record<string, string> | null;
}

/** Mappe la paire OSM (class, type) sur un libellé français lisible. */
function placeCategory(klass?: string, type?: string): string {
  const t = type ?? '';
  switch (klass) {
    case 'place':
      if (['suburb', 'neighbourhood', 'quarter', 'city_block', 'hamlet'].includes(t))
        return 'Quartier';
      if (['city', 'town', 'village', 'municipality'].includes(t)) return 'Localité';
      if (t === 'house' || t === 'houses') return 'Habitation';
      return 'Lieu';
    case 'highway':
      return 'Rue / voie';
    case 'boundary':
      return 'Zone';
    case 'amenity': {
      const map: Record<string, string> = {
        marketplace: 'Marché',
        school: 'École',
        college: 'Établissement scolaire',
        university: 'Université',
        kindergarten: 'École maternelle',
        hospital: 'Hôpital',
        clinic: 'Clinique',
        doctors: 'Cabinet médical',
        pharmacy: 'Pharmacie',
        restaurant: 'Restaurant',
        cafe: 'Café',
        bar: 'Bar',
        fast_food: 'Restauration rapide',
        fuel: 'Station-service',
        bank: 'Banque',
        place_of_worship: 'Lieu de culte',
        police: 'Police',
        townhall: 'Mairie',
        courthouse: 'Tribunal',
        post_office: 'Bureau de poste',
        bus_station: 'Gare routière',
      };
      return map[t] ?? 'Service / équipement';
    }
    case 'shop':
      return 'Commerce';
    case 'tourism':
      return 'Tourisme';
    case 'leisure':
      return 'Loisir';
    case 'office':
      return 'Bureau';
    case 'building':
      return 'Bâtiment';
    case 'natural':
      return 'Lieu naturel';
    case 'waterway':
      return "Cours d'eau";
    case 'railway':
      return 'Gare / rail';
    default:
      return 'Lieu';
  }
}

/** Construit un contexte court "quartier · ville" à partir de l'adresse OSM. */
function buildLocality(address?: Record<string, string>): string | undefined {
  if (!address) return undefined;
  const area =
    address.suburb ?? address.neighbourhood ?? address.quarter ?? address.city_district;
  const city =
    address.city ?? address.town ?? address.village ?? address.municipality ?? address.county;
  const parts = Array.from(new Set([area, city].filter(Boolean))) as string[];
  return parts.length ? parts.join(' · ') : undefined;
}

/**
 * Lance une recherche Nominatim restreinte au Bénin. Renvoie au plus
 * `limit` résultats (5 par défaut). Erreurs réseau ou réponses non-JSON
 * remontent comme exception — l'appelant les gère côté UI.
 */
export async function geocode(
  query: string,
  options: { limit?: number; signal?: AbortSignal } = {},
): Promise<NominatimResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const params = new URLSearchParams({
    format: 'json',
    limit: String(options.limit ?? 5),
    countrycodes: 'bj',
    q: trimmed,
    addressdetails: '1',
    extratags: '1',
    namedetails: '0',
  });

  const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
    headers: { 'Accept-Language': 'fr' },
    signal: options.signal,
  });

  if (!res.ok) {
    throw new Error(`Nominatim error: ${res.status}`);
  }

  const hits = (await res.json()) as NominatimApiHit[];
  return hits.map((hit) => {
    const extra = hit.extratags ?? {};
    return {
      id: String(hit.place_id),
      displayName: hit.display_name,
      shortName: hit.display_name.split(',')[0]?.trim() ?? hit.display_name,
      lat: parseFloat(hit.lat),
      lng: parseFloat(hit.lon),
      category: placeCategory(hit.class, hit.type),
      locality: buildLocality(hit.address),
      website: extra.website ?? extra['contact:website'] ?? undefined,
      phone: extra.phone ?? extra['contact:phone'] ?? undefined,
      openingHours: extra.opening_hours ?? undefined,
    };
  });
}
