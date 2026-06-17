'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import type { DiscoveryItem } from '@/types/api';
import { CATEGORIES } from '@/lib/categories';

export interface DiscoveryMapBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface DiscoveryMapProps {
  /** Marqueurs à afficher. Fournis par le parent qui requête `/map/addresses`. */
  items: DiscoveryItem[];
  /** Centre initial de la carte (et zoom). */
  initialCenter: { lat: number; lng: number };
  initialZoom?: number;
  /** Callback appelé après chaque moveend/zoomend (le parent recharge alors
   *  les items via la nouvelle bbox). */
  onBoundsChange?: (bounds: DiscoveryMapBounds) => void;
  /** Si fourni, ajoute un marqueur "ma position" + le récupère via géoloc. */
  showUserLocation?: boolean;
  /** Code adresse cliquée — le parent route vers `/a/:code`. */
  onItemSelect?: (code: string) => void;
}

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '© OpenStreetMap contributors';

// HTML des marqueurs — SVG inline pour ne pas dépendre des PNG par défaut de
// Leaflet (qui 404 sur les sous-routes Next).
function coloredMarkerHtml(iconSvg: string): string {
  return `
    <div style="
      position: relative;
      width: 32px; height: 32px;
      transform: translate(-50%, -100%);
    ">
      <div style="
        position: absolute; inset: 0;
        background: var(--color-primary);
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      "></div>
      <div style="
        position: absolute;
        top: 6px; left: 6px;
        width: 20px; height: 20px;
        display: flex; align-items: center; justify-content: center;
        color: white;
      ">${iconSvg}</div>
    </div>
  `;
}

function mutedDotHtml(): string {
  return `
    <div style="
      width: 8px; height: 8px;
      background: #C4BDB6;
      border-radius: 50%;
      opacity: 0.55;
      transform: translate(-50%, -50%);
    "></div>
  `;
}

// SVG simplifiés (16x16) par catégorie — évite de pull lucide-react dans
// l'arborescence Leaflet (qui tourne hors React).
const CATEGORY_SVG: Record<string, string> = {
  COMMERCE: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 11 1.5-6h11L19 11"/><path d="M5 11h14v9H5z"/><path d="M9 11v4"/><path d="M15 11v4"/></svg>',
  RESTAURATION: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Z"/></svg>',
  SANTE: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z"/></svg>',
  EDUCATION: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6"/><path d="M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
  ADMINISTRATION: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 22h18"/><path d="M6 18V11"/><path d="M10 18V11"/><path d="M14 18V11"/><path d="M18 18V11"/><path d="M12 2 2 7h20Z"/></svg>',
  LOISIR: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
  AUTRE: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>',
};

/**
 * Carte Leaflet publique (`/carte`). Affiche les marqueurs reçus en props,
 * applique la matrice de visibilité du CDC (DOMICILE → dot muet sans popup,
 * autres → marqueur coloré avec popup d'aperçu cliquable).
 *
 * Le parent gère le rechargement des items via `onBoundsChange` (debounce
 * recommandé côté parent pour éviter un appel à chaque pan).
 *
 * **À importer toujours via `dynamic(..., { ssr: false })`** — Leaflet
 * touche `window` à l'import et planterait en SSR.
 */
export function DiscoveryMap({
  items,
  initialCenter,
  initialZoom = 14,
  onBoundsChange,
  showUserLocation = false,
  onItemSelect,
}: DiscoveryMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Stocker l'API Leaflet + handles internes sur des refs pour pouvoir
  // muter les marqueurs sans détruire la carte à chaque change d'`items`.
  const stateRef = useRef<{
    L: typeof import('leaflet') | null;
    map: import('leaflet').Map | null;
    markersLayer: import('leaflet').LayerGroup | null;
    destroy: () => void;
  } | null>(null);

  // Stocker la dernière callback dans un ref pour éviter de recréer la map
  // si le parent passe une nouvelle référence de fonction à chaque render.
  const onBoundsChangeRef = useRef(onBoundsChange);
  const onItemSelectRef = useRef(onItemSelect);
  useEffect(() => {
    onBoundsChangeRef.current = onBoundsChange;
    onItemSelectRef.current = onItemSelect;
  });

  // Initialisation unique : import dynamique de Leaflet, création de la
  // carte, layer de tuiles, layer-group réservé aux marqueurs.
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    void (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView([initialCenter.lat, initialCenter.lng], initialZoom);

      L.tileLayer(TILE_URL, {
        attribution: TILE_ATTRIBUTION,
        maxZoom: 19,
      }).addTo(map);

      const markersLayer = L.layerGroup().addTo(map);

      // Notifie le parent au démarrage avec la bbox initiale + à chaque
      // mouvement utilisateur (le parent debounce avant de requêter).
      const emitBounds = () => {
        const b = map.getBounds();
        onBoundsChangeRef.current?.({
          west: b.getWest(),
          south: b.getSouth(),
          east: b.getEast(),
          north: b.getNorth(),
        });
      };
      emitBounds();
      map.on('moveend', emitBounds);
      map.on('zoomend', emitBounds);

      // Marqueur "ma position" — bleu pulsant, géolocalisation best-effort.
      if (showUserLocation && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (cancelled) return;
            L.circleMarker([pos.coords.latitude, pos.coords.longitude], {
              radius: 7,
              color: '#1A7F50',
              weight: 3,
              fillColor: '#2DA86B',
              fillOpacity: 0.85,
            }).addTo(map);
          },
          () => undefined,
          { enableHighAccuracy: true, maximumAge: 60_000, timeout: 5_000 },
        );
      }

      stateRef.current = {
        L,
        map,
        markersLayer,
        destroy: () => {
          map.off('moveend', emitBounds);
          map.off('zoomend', emitBounds);
          map.remove();
        },
      };
    })();

    return () => {
      cancelled = true;
      stateRef.current?.destroy();
      stateRef.current = null;
    };
    // Volontairement vide — la carte est créée une seule fois ; les changements
    // d'items sont gérés par l'effet ci-dessous.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rebuild des marqueurs à chaque changement d'`items`. On efface le
  // layer-group puis on rajoute — c'est moins coûteux que de diff, et les
  // volumes attendus restent modérés (< 200 marqueurs par bbox).
  useEffect(() => {
    const state = stateRef.current;
    if (!state || !state.L || !state.markersLayer) return;
    const { L, markersLayer } = state;
    markersLayer.clearLayers();

    for (const item of items) {
      if (item.muted) {
        // DOMICILE → point gris discret, aucun popup, clic ouvre /a/:code.
        const dot = L.divIcon({
          html: mutedDotHtml(),
          className: '',
          iconSize: [8, 8],
          iconAnchor: [4, 4],
        });
        const m = L.marker([item.lat, item.lng], { icon: dot });
        m.on('click', () => onItemSelectRef.current?.(item.code));
        m.addTo(markersLayer);
      } else {
        // Marqueur en clair — goutte verte + icône catégorie + popup aperçu.
        const svg = CATEGORY_SVG[item.category] ?? CATEGORY_SVG.AUTRE;
        const icon = L.divIcon({
          html: coloredMarkerHtml(svg),
          className: '',
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });
        const preview = item.preview;
        const popupHtml = preview
          ? `
            <div style="min-width: 200px; font-family: var(--font-body)">
              <div style="
                width: 100%; aspect-ratio: 16/9;
                background: url('${preview.photoUrl}') center/cover #F0EDE8;
                border-radius: 8px; margin-bottom: 8px;
              "></div>
              <div style="
                font-family: var(--font-display);
                font-weight: 700;
                font-size: 18px;
                color: var(--color-primary);
                letter-spacing: 0.05em;
              ">${item.code}</div>
              <div style="font-size: 12px; color: var(--color-text-muted); margin-bottom: 8px">
                ${CATEGORIES[item.category].label} · ${preview.quartierName}
              </div>
              <button
                type="button"
                data-discovery-code="${item.code}"
                style="
                  display: block; width: 100%;
                  padding: 8px 12px;
                  background: var(--color-primary); color: white;
                  border: 0; border-radius: 8px;
                  font-weight: 600; font-size: 14px;
                  cursor: pointer;
                ">Voir l'adresse</button>
            </div>
          `
          : `<div>${item.code}</div>`;
        const m = L.marker([item.lat, item.lng], { icon });
        m.bindPopup(popupHtml, { closeButton: true, maxWidth: 240 });
        m.on('popupopen', (e) => {
          const root = (e as { popup: { getElement(): HTMLElement | null } }).popup.getElement();
          const btn = root?.querySelector<HTMLButtonElement>(
            `button[data-discovery-code="${item.code}"]`,
          );
          btn?.addEventListener('click', () => onItemSelectRef.current?.(item.code), {
            once: true,
          });
        });
        m.addTo(markersLayer);
      }
    }
  }, [items]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-roledescription="carte de découverte des adresses"
      // isolation pour confiner les z-index Leaflet (mémoire projet).
      className="w-full h-full bg-surface-muted"
      style={{ isolation: 'isolate' }}
    />
  );
}

export default DiscoveryMap;
