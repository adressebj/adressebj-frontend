'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

export interface LocationCanvasProps {
  /** Point à afficher (position confirmée ou lecture live). `null` → carte
   *  d'ambiance centrée sur le Bénin, sans pin. */
  point: { lat: number; lng: number } | null;
  /** Rayon de précision en mètres — dessine l'anneau autour du pin (visualise
   *  l'incertitude GPS plutôt que de la réciter). */
  accuracyRadius?: number;
  className?: string;
}

// CARTO Voyager — même fond chaud que le reste du site (signature carte unique).
const TILE_URL =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>';
const TILE_SUBDOMAINS = 'abcd';

// Centre d'ambiance quand aucune position n'est encore captée (Cotonou).
const DEFAULT_CENTER = { lat: 6.3703, lng: 2.3912 };

// Pin de marque `.abj-pin` + glyphe localisation (Leaflet tourne hors React).
const PIN_HTML = `
  <div class="abj-pin animate-pin-appear">
    <div class="abj-pin__drop"></div>
    <div class="abj-pin__icon">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
    </div>
  </div>`;

interface MapState {
  L: typeof import('leaflet');
  map: import('leaflet').Map;
  marker: import('leaflet').Marker | null;
  circle: import('leaflet').Circle | null;
}

/**
 * Carte-canvas non interactive du wizard de création — plein cadre, le point se
 * met à jour **impérativement** (pas de recréation de la carte → aucun
 * scintillement quand la lecture GPS s'affine). Centre sur la position, avec un
 * anneau de précision optionnel.
 *
 * **À importer via `dynamic(..., { ssr: false })`** — Leaflet touche `window`.
 */
export function LocationCanvas({
  point,
  accuracyRadius,
  className,
}: LocationCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<MapState | null>(null);

  // On suit des primitives (pas l'objet `point`) : la carte ne se met à jour que
  // si les coordonnées changent réellement, sans dépendre de l'identité de l'objet.
  const lat = point?.lat ?? null;
  const lng = point?.lng ?? null;

  useEffect(() => {
    let cancelled = false;
    const centerLat = lat ?? DEFAULT_CENTER.lat;
    const centerLng = lng ?? DEFAULT_CENTER.lng;
    const zoom = lat != null && lng != null ? 17 : 13;

    void (async () => {
      if (!containerRef.current) return;

      // Création unique (première exécution). Les suivantes ne font que mettre
      // à jour la vue / le marqueur / l'anneau.
      if (!stateRef.current) {
        const L = (await import('leaflet')).default;
        if (cancelled || !containerRef.current || stateRef.current) return;
        const map = L.map(containerRef.current, {
          zoomControl: false,
          attributionControl: true,
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          boxZoom: false,
          keyboard: false,
          touchZoom: false,
        }).setView([centerLat, centerLng], zoom);
        map.attributionControl.setPosition('bottomright');
        L.tileLayer(TILE_URL, {
          attribution: TILE_ATTRIBUTION,
          subdomains: TILE_SUBDOMAINS,
          maxZoom: 20,
        }).addTo(map);
        stateRef.current = { L, map, marker: null, circle: null };
      }

      const state = stateRef.current;
      if (!state) return;
      const { L, map } = state;

      map.setView([centerLat, centerLng], zoom, { animate: false });

      // Anneau de précision (re-dessiné).
      state.circle?.remove();
      state.circle = null;
      if (lat != null && lng != null && accuracyRadius && accuracyRadius > 0) {
        state.circle = L.circle([lat, lng], {
          radius: Math.min(accuracyRadius, 3000),
          color: '#0E6B43',
          weight: 1.5,
          opacity: 0.5,
          fillColor: '#0E6B43',
          fillOpacity: 0.1,
        }).addTo(map);
      }

      // Marqueur.
      if (lat != null && lng != null) {
        if (state.marker) {
          state.marker.setLatLng([lat, lng]);
        } else {
          const icon = L.divIcon({
            html: PIN_HTML,
            className: '',
            iconSize: [34, 34],
            iconAnchor: [17, 34],
          });
          state.marker = L.marker([lat, lng], {
            icon,
            interactive: false,
            keyboard: false,
          }).addTo(map);
        }
      } else {
        state.marker?.remove();
        state.marker = null;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lat, lng, accuracyRadius]);

  // Destruction à la sortie.
  useEffect(
    () => () => {
      stateRef.current?.map.remove();
      stateRef.current = null;
    },
    [],
  );

  return (
    <div
      className={className}
      aria-label="Carte de votre position"
      // isolation : confine les z-index internes de Leaflet (cf. mémoire projet).
      style={{ isolation: 'isolate' }}
    >
      <div
        ref={containerRef}
        role="img"
        aria-roledescription="carte"
        className="w-full h-full bg-surface-muted pointer-events-none"
      />
    </div>
  );
}

export default LocationCanvas;
