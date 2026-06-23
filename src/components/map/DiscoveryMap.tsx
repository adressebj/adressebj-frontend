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

/** API impérative exposée au parent via `onReady` — pilote la carte (FAB
 *  géoloc, vol vers un résultat cliqué dans la liste) sans recréer le composant
 *  ni s'appuyer sur le forwarding de ref (fragile avec `next/dynamic`). */
export interface DiscoveryMapApi {
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  flyToUser: () => Promise<boolean>;
  /** Place (ou retire avec `null`) un marqueur distinct « lieu recherché »
   *  (résultat Nominatim), différent des gouttes d'adresses AdresseBJ. */
  setSearchPoint: (point: { lat: number; lng: number } | null) => void;
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
  /** Code adresse choisie (clic popup / carte liste) — le parent route vers
   *  `/a/:code`. */
  onItemSelect?: (code: string) => void;
  /** Survol/sortie d'un marqueur — synchronise la mise en avant côté liste.
   *  `null` au mouseout. */
  onItemActivate?: (code: string | null) => void;
  /** Code actuellement mis en avant (survol d'une carte liste) — surligne le
   *  marqueur correspondant. */
  activeCode?: string | null;
  /** Reçoit l'API impérative dès que la carte est prête. */
  onReady?: (api: DiscoveryMapApi) => void;
}

// CARTO Voyager — fond clair désaturé, tonalité chaude proche du « papier »
// du design system. Gratuit avec attribution (OSM + CARTO).
const TILE_URL =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>';
const TILE_SUBDOMAINS = 'abcd';

// HTML des marqueurs — classés (`.abj-*` dans globals.css) pour piloter
// hover/actif en CSS, et SVG inline pour ne pas dépendre des PNG par défaut de
// Leaflet (qui 404 sur les sous-routes Next).
function coloredMarkerHtml(
  iconSvg: string,
  fresh: boolean,
  color: string,
): string {
  // `--pin-color` colore la goutte selon la catégorie (cf. `.abj-pin__drop`
  // dans globals.css) ; l'état actif (or) reste piloté par `.is-active`.
  return `
    <div class="abj-pin${fresh ? ' animate-pin-appear' : ''}" style="--pin-color: ${color}">
      <div class="abj-pin__drop"></div>
      <div class="abj-pin__icon">${iconSvg}</div>
    </div>
  `;
}

function mutedDotHtml(): string {
  return `<div class="abj-dot"></div>`;
}

function userDotHtml(): string {
  return `
    <div class="abj-userdot">
      <div class="abj-userdot__pulse animate-soft-pulse"></div>
      <div class="abj-userdot__core"></div>
    </div>
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

// Marqueur "lieu recherché" (Nominatim) — goutte or + loupe, distinct des
// gouttes vertes d'adresses AdresseBJ.
const SEARCH_SVG =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>';

interface MarkerEntry {
  marker: import('leaflet').Marker;
  muted: boolean;
}

/**
 * Carte Leaflet publique (`/carte`). Affiche les marqueurs reçus en props,
 * applique la matrice de visibilité du CDC (DOMICILE → dot muet sans popup,
 * autres → marqueur coloré avec popup d'aperçu cliquable).
 *
 * Le parent gère le rechargement des items via `onBoundsChange` (debounce
 * recommandé côté parent pour éviter un appel à chaque pan). Les marqueurs sont
 * **diffés** (ajout/suppression par code) pour ne pas « re-tomber » à chaque
 * pan et garder l'état actif stable.
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
  onItemActivate,
  activeCode = null,
  onReady,
}: DiscoveryMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Stocker l'API Leaflet + handles internes sur des refs pour pouvoir
  // muter les marqueurs sans détruire la carte à chaque change d'`items`.
  const stateRef = useRef<{
    L: typeof import('leaflet');
    map: import('leaflet').Map;
    markersLayer: import('leaflet').LayerGroup;
    userMarker: import('leaflet').Marker | null;
    userPos: { lat: number; lng: number } | null;
    destroy: () => void;
  } | null>(null);

  // Index code → marqueur, pour differ sans tout reconstruire.
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map());
  // Marqueur unique du lieu recherché (Nominatim), piloté impérativement.
  const searchMarkerRef = useRef<import('leaflet').Marker | null>(null);

  // Dernières callbacks dans des refs : évite de recréer la map quand le parent
  // passe une nouvelle référence de fonction à chaque render.
  const onBoundsChangeRef = useRef(onBoundsChange);
  const onItemSelectRef = useRef(onItemSelect);
  const onItemActivateRef = useRef(onItemActivate);
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onBoundsChangeRef.current = onBoundsChange;
    onItemSelectRef.current = onItemSelect;
    onItemActivateRef.current = onItemActivate;
    onReadyRef.current = onReady;
  });

  // Initialisation unique : import dynamique de Leaflet, création de la
  // carte, layer de tuiles, layer-group réservé aux marqueurs.
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    // Map d'index stable (useRef) — capturée pour un nettoyage sûr au démontage.
    const registry = markersRef.current;

    void (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: true,
      }).setView([initialCenter.lat, initialCenter.lng], initialZoom);

      // Contrôle de zoom repositionné en haut à droite (le coin bas est pris
      // par le FAB géoloc + la bottom-sheet mobile). Masqué sur mobile via CSS
      // (pinch-zoom natif). Attribution à gauche, remontée sur mobile pour
      // rester visible au-dessus de la feuille repliée (licence OSM/CARTO).
      L.control.zoom({ position: 'topright' }).addTo(map);
      map.attributionControl.setPosition('bottomleft');

      L.tileLayer(TILE_URL, {
        attribution: TILE_ATTRIBUTION,
        subdomains: TILE_SUBDOMAINS,
        maxZoom: 20,
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

      const placeUserMarker = (lat: number, lng: number) => {
        const state = stateRef.current;
        if (!state) return;
        state.userPos = { lat, lng };
        const icon = L.divIcon({
          html: userDotHtml(),
          className: '',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
        if (state.userMarker) {
          state.userMarker.setLatLng([lat, lng]);
        } else {
          state.userMarker = L.marker([lat, lng], {
            icon,
            interactive: false,
            keyboard: false,
            zIndexOffset: -100,
          }).addTo(map);
        }
      };

      stateRef.current = {
        L,
        map,
        markersLayer,
        userMarker: null,
        userPos: null,
        destroy: () => {
          map.off('moveend', emitBounds);
          map.off('zoomend', emitBounds);
          searchMarkerRef.current?.remove();
          searchMarkerRef.current = null;
          map.remove();
        },
      };

      // Marqueur "ma position" — best-effort au démarrage si demandé.
      if (
        showUserLocation &&
        typeof navigator !== 'undefined' &&
        navigator.geolocation
      ) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (cancelled) return;
            placeUserMarker(pos.coords.latitude, pos.coords.longitude);
          },
          () => undefined,
          { enableHighAccuracy: true, maximumAge: 60_000, timeout: 5_000 },
        );
      }

      // Expose l'API impérative au parent.
      onReadyRef.current?.({
        flyTo: (lat, lng, zoom) => {
          map.flyTo([lat, lng], zoom ?? Math.max(map.getZoom(), 16), {
            duration: 0.8,
          });
        },
        flyToUser: () =>
          new Promise<boolean>((resolve) => {
            const state = stateRef.current;
            if (state?.userPos) {
              map.flyTo([state.userPos.lat, state.userPos.lng], 16, {
                duration: 0.8,
              });
              resolve(true);
              return;
            }
            if (
              typeof navigator === 'undefined' ||
              !navigator.geolocation
            ) {
              resolve(false);
              return;
            }
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                placeUserMarker(pos.coords.latitude, pos.coords.longitude);
                map.flyTo(
                  [pos.coords.latitude, pos.coords.longitude],
                  16,
                  { duration: 0.8 },
                );
                resolve(true);
              },
              () => resolve(false),
              { enableHighAccuracy: true, timeout: 5_000 },
            );
          }),
        setSearchPoint: (point) => {
          if (searchMarkerRef.current) {
            searchMarkerRef.current.remove();
            searchMarkerRef.current = null;
          }
          if (!point) return;
          const icon = L.divIcon({
            html: coloredMarkerHtml(SEARCH_SVG, true, 'var(--color-accent)'),
            className: '',
            iconSize: [34, 34],
            iconAnchor: [17, 34],
          });
          searchMarkerRef.current = L.marker([point.lat, point.lng], {
            icon,
            interactive: false,
            keyboard: false,
            zIndexOffset: 500,
          }).addTo(map);
        },
      });
    })();

    return () => {
      cancelled = true;
      stateRef.current?.destroy();
      stateRef.current = null;
      registry.clear();
    };
    // Volontairement vide — la carte est créée une seule fois ; les changements
    // d'items sont gérés par l'effet ci-dessous.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Diff des marqueurs à chaque changement d'`items` : on ajoute les nouveaux
  // codes, on retire ceux disparus, on laisse les existants en place (pas de
  // « re-drop » pendant le pan, état actif préservé).
  useEffect(() => {
    const state = stateRef.current;
    if (!state) return;
    const { L, markersLayer } = state;
    const registry = markersRef.current;

    const nextCodes = new Set(items.map((it) => it.code));

    // Suppressions.
    for (const [code, entry] of registry) {
      if (!nextCodes.has(code)) {
        markersLayer.removeLayer(entry.marker);
        registry.delete(code);
      }
    }

    // Ajouts.
    for (const item of items) {
      if (registry.has(item.code)) continue;

      if (item.muted) {
        // DOMICILE → point gris discret, aucun popup, clic ouvre /a/:code.
        const dot = L.divIcon({
          html: mutedDotHtml(),
          className: '',
          iconSize: [9, 9],
          iconAnchor: [4, 4],
        });
        const m = L.marker([item.lat, item.lng], { icon: dot });
        m.on('click', () => onItemSelectRef.current?.(item.code));
        m.on('mouseover', () => onItemActivateRef.current?.(item.code));
        m.on('mouseout', () => onItemActivateRef.current?.(null));
        m.addTo(markersLayer);
        registry.set(item.code, { marker: m, muted: true });
      } else {
        // Marqueur en clair — goutte verte + icône catégorie + popup aperçu.
        const svg = CATEGORY_SVG[item.category] ?? CATEGORY_SVG.AUTRE;
        const icon = L.divIcon({
          html: coloredMarkerHtml(svg, true, CATEGORIES[item.category].color),
          className: '',
          iconSize: [34, 34],
          iconAnchor: [17, 34],
          popupAnchor: [0, -34],
        });
        const preview = item.preview;
        const popupHtml = preview
          ? `
            <div style="font-family: var(--font-body)">
              <div style="
                width: 100%; aspect-ratio: 16/9;
                background: url('${preview.photoUrl}') center/cover var(--color-surface-muted);
              "></div>
              <div style="padding: 12px 14px 14px">
                <div class="code-type" style="
                  font-family: var(--font-mono);
                  font-weight: 700;
                  font-size: 18px;
                  color: var(--color-primary);
                ">${item.code}</div>
                <div style="font-size: 12px; color: var(--color-text-muted); margin: 2px 0 10px">
                  ${CATEGORIES[item.category].label} · ${preview.quartierName}
                </div>
                <button
                  type="button"
                  data-discovery-code="${item.code}"
                  style="
                    display: block; width: 100%;
                    padding: 9px 12px;
                    background: var(--color-primary); color: #fff;
                    border: 0; border-radius: var(--radius-md);
                    font-family: var(--font-body);
                    font-weight: 600; font-size: 14px;
                    cursor: pointer;
                  ">Voir l'adresse</button>
              </div>
            </div>
          `
          : `<div style="padding:12px 14px" class="code-type">${item.code}</div>`;
        const m = L.marker([item.lat, item.lng], { icon });
        m.bindPopup(popupHtml, {
          closeButton: true,
          maxWidth: 240,
          className: 'abj-popup',
        });
        m.on('mouseover', () => onItemActivateRef.current?.(item.code));
        m.on('mouseout', () => onItemActivateRef.current?.(null));
        m.on('popupopen', (e) => {
          const root = (
            e as { popup: { getElement(): HTMLElement | null } }
          ).popup.getElement();
          const btn = root?.querySelector<HTMLButtonElement>(
            `button[data-discovery-code="${item.code}"]`,
          );
          btn?.addEventListener(
            'click',
            () => onItemSelectRef.current?.(item.code),
            { once: true },
          );
        });
        m.addTo(markersLayer);
        registry.set(item.code, { marker: m, muted: false });
      }
    }
  }, [items]);

  // Mise en avant du marqueur actif (survol d'une carte liste) — bascule une
  // classe sur l'élément DOM du marqueur sans reconstruire la couche.
  useEffect(() => {
    const registry = markersRef.current;
    for (const [code, entry] of registry) {
      const el = entry.marker.getElement();
      const root = el?.firstElementChild as HTMLElement | null;
      if (!root) continue;
      root.classList.toggle('is-active', code === activeCode);
      entry.marker.setZIndexOffset(code === activeCode ? 1000 : 0);
    }
  }, [activeCode, items]);

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
