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
}

const ENDPOINT = 'https://nominatim.openstreetmap.org/search';

interface NominatimApiHit {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
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
    addressdetails: '0',
  });

  const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
    headers: { 'Accept-Language': 'fr' },
    signal: options.signal,
  });

  if (!res.ok) {
    throw new Error(`Nominatim error: ${res.status}`);
  }

  const hits = (await res.json()) as NominatimApiHit[];
  return hits.map((hit) => ({
    id: String(hit.place_id),
    displayName: hit.display_name,
    shortName: hit.display_name.split(',')[0]?.trim() ?? hit.display_name,
    lat: parseFloat(hit.lat),
    lng: parseFloat(hit.lon),
  }));
}
