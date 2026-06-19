'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import type { AddressCategory } from '@/types/api';

export interface RegistrePin {
  code: string;
  lat: number;
  lng: number;
  category: AddressCategory;
}

export interface RegistreMapProps {
  pins: RegistrePin[];
  className?: string;
}

// CARTO Voyager — même fond chaud que `/carte` et la fiche détail : signature
// carte unique sur tout le site.
const TILE_URL =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>';
const TILE_SUBDOMAINS = 'abcd';

// SVG (16x16) par catégorie — copie locale (Leaflet tourne hors React, on évite
// de tirer lucide dans son arborescence). Inclut DOMICILE, visible côté
// propriétaire contrairement à la carte publique où il est muet.
const CATEGORY_SVG: Record<string, string> = {
  DOMICILE: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>',
  COMMERCE: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 11 1.5-6h11L19 11"/><path d="M5 11h14v9H5z"/><path d="M9 11v4"/><path d="M15 11v4"/></svg>',
  RESTAURATION: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Z"/></svg>',
  SANTE: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z"/></svg>',
  EDUCATION: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6"/><path d="M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
  ADMINISTRATION: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 22h18"/><path d="M6 18V11"/><path d="M10 18V11"/><path d="M14 18V11"/><path d="M18 18V11"/><path d="M12 2 2 7h20Z"/></svg>',
  LOISIR: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
  AUTRE: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>',
};

function pinHtml(category: AddressCategory): string {
  const svg = CATEGORY_SVG[category] ?? CATEGORY_SVG.AUTRE;
  return `
    <div class="abj-pin animate-pin-appear">
      <div class="abj-pin__drop"></div>
      <div class="abj-pin__icon">${svg}</div>
    </div>
  `;
}

/**
 * Aperçu cartographique **non interactif** du registre : tous les pins du
 * propriétaire posés sur le fond CARTO Voyager de marque, cadrés en
 * `fitBounds`. Exergue du thème carte sur l'accueil — pas de navigation, pas de
 * popup. Gestes verrouillés (visualisation pure).
 *
 * **À importer via `dynamic(..., { ssr: false })`** — Leaflet touche `window`
 * à l'import.
 */
export function RegistreMap({ pins, className }: RegistreMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current || pins.length === 0) return;
    let cancelled = false;
    let map: import('leaflet').Map | null = null;

    void (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !containerRef.current) return;

      map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: true,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        touchZoom: false,
      }).setView([pins[0].lat, pins[0].lng], 15);
      map.attributionControl.setPosition('bottomright');

      L.tileLayer(TILE_URL, {
        attribution: TILE_ATTRIBUTION,
        subdomains: TILE_SUBDOMAINS,
        maxZoom: 20,
      }).addTo(map);

      for (const pin of pins) {
        const icon = L.divIcon({
          html: pinHtml(pin.category),
          className: '',
          iconSize: [34, 34],
          iconAnchor: [17, 34],
        });
        L.marker([pin.lat, pin.lng], {
          icon,
          interactive: false,
          keyboard: false,
        }).addTo(map);
      }

      // Cadre tous les pins. Un seul pin → vue rapprochée fixe ; plusieurs →
      // bounds avec marge pour ne pas coller les gouttes aux bords.
      if (pins.length === 1) {
        map.setView([pins[0].lat, pins[0].lng], 16);
      } else {
        const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng]));
        map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16 });
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
      map = null;
    };
  }, [pins]);

  if (pins.length === 0) return null;

  return (
    <div
      className={className}
      aria-label="Aperçu de vos adresses sur la carte"
      // isolation: confine les z-index internes de Leaflet (cf. mémoire projet).
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

export default RegistreMap;
