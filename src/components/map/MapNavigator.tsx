'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

export interface MapNavigatorApi {
  /** Recentre en douceur sur la destination (fly-to signature). */
  flyToDestination: () => void;
  /** Géolocalise, place le point « moi », trace l'itinéraire animé vers la
   *  destination et cadre les deux. `false` si géoloc/route indisponible. */
  startNavigation: () => Promise<boolean>;
}

export interface MapNavigatorProps {
  destination: { lat: number; lng: number };
  /** Appelé quand le visiteur est détecté à proximité de la destination
   *  (≈ arrivée). Best-effort : dépend de la disponibilité de la géoloc. */
  onArrival?: () => void;
  className?: string;
  /**
   * When false the map is a static visualisation: all gestures are locked,
   * the zoom control is hidden, and no geolocation / OSRM routing is attempted.
   * Use it for owner mini-maps and form previews. Defaults to true.
   */
  interactive?: boolean;
  /** Reçoit l'API impérative dès que la carte est prête (mode interactif). */
  onReady?: (api: MapNavigatorApi) => void;
}

// CARTO Voyager — fond clair désaturé, tonalité chaude proche du « papier » du
// design system (le filtre chaud global `.leaflet-layer` l'harmonise encore).
// Aligné sur la carte de découverte pour une signature carte unique.
const TILE_URL =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>';
const TILE_SUBDOMAINS = 'abcd';

// Rayon (m) sous lequel on considère le visiteur arrivé.
const ARRIVAL_RADIUS_M = 45;

// Pin de destination — goutte de marque `.abj-pin` + drapeau (lecture
// « point d'arrivée »). SVG inline : Leaflet tourne hors React.
const DEST_PIN_HTML = `
  <div class="abj-pin">
    <div class="abj-pin__drop"></div>
    <div class="abj-pin__icon">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>
    </div>
  </div>`;

const USER_DOT_HTML = `
  <div class="abj-userdot">
    <div class="abj-userdot__pulse animate-soft-pulse"></div>
    <div class="abj-userdot__core"></div>
  </div>`;

export function MapNavigator({
  destination,
  onArrival,
  className,
  interactive = true,
  onReady,
}: MapNavigatorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Handles internes — permettent de piloter la carte sans relancer l'effet.
  const stateRef = useRef<{
    L: typeof import('leaflet');
    map: import('leaflet').Map;
    userMarker: import('leaflet').Marker | null;
    routeLayer: import('leaflet').GeoJSON | null;
    arrivalFired: boolean;
    destroy: () => void;
  } | null>(null);

  // Callbacks dans des refs : évite de recréer la carte au changement de
  // référence de fonction côté parent.
  const onArrivalRef = useRef(onArrival);
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onArrivalRef.current = onArrival;
    onReadyRef.current = onReady;
  });

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    void (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: true,
        dragging: interactive,
        scrollWheelZoom: interactive,
        doubleClickZoom: interactive,
        boxZoom: interactive,
        keyboard: interactive,
        touchZoom: interactive,
      }).setView([destination.lat, destination.lng], 16);

      if (interactive) {
        L.control.zoom({ position: 'topright' }).addTo(map);
      }
      map.attributionControl.setPosition('bottomright');

      L.tileLayer(TILE_URL, {
        attribution: TILE_ATTRIBUTION,
        subdomains: TILE_SUBDOMAINS,
        maxZoom: 20,
      }).addTo(map);

      const destIcon = L.divIcon({
        html: DEST_PIN_HTML,
        className: '',
        iconSize: [34, 34],
        iconAnchor: [17, 34],
      });
      L.marker([destination.lat, destination.lng], { icon: destIcon }).addTo(map);

      const placeUserMarker = (lat: number, lng: number) => {
        const state = stateRef.current;
        if (!state) return;
        const icon = L.divIcon({
          html: USER_DOT_HTML,
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

      const maybeFireArrival = (lat: number, lng: number) => {
        const state = stateRef.current;
        if (!state || state.arrivalFired) return;
        const dist = map.distance([lat, lng], [destination.lat, destination.lng]);
        if (dist <= ARRIVAL_RADIUS_M) {
          state.arrivalFired = true;
          onArrivalRef.current?.();
        }
      };

      // Trace l'itinéraire OSRM de la position utilisateur vers la destination,
      // animé (`animate-route`), à la couleur de marque. Best-effort.
      const startNavigation = () =>
        new Promise<boolean>((resolve) => {
          if (
            !interactive ||
            typeof navigator === 'undefined' ||
            !navigator.geolocation
          ) {
            resolve(false);
            return;
          }
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              if (cancelled) {
                resolve(false);
                return;
              }
              const { latitude: userLat, longitude: userLng } = pos.coords;
              placeUserMarker(userLat, userLng);
              maybeFireArrival(userLat, userLng);
              try {
                const url =
                  `https://router.project-osrm.org/route/v1/driving/` +
                  `${userLng},${userLat};${destination.lng},${destination.lat}` +
                  `?overview=full&geometries=geojson`;
                const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
                const data = await res.json();
                if (cancelled) {
                  resolve(false);
                  return;
                }
                const state = stateRef.current;
                if (data?.code === 'Ok' && data.routes?.length > 0 && state) {
                  state.routeLayer?.remove();
                  state.routeLayer = L.geoJSON(data.routes[0].geometry, {
                    style: {
                      color: '#0E6B43',
                      weight: 5,
                      opacity: 0.9,
                      lineCap: 'round',
                    },
                  }).addTo(map);
                  map.fitBounds(
                    L.latLngBounds(
                      [userLat, userLng],
                      [destination.lat, destination.lng],
                    ),
                    { padding: [56, 56] },
                  );
                  resolve(true);
                  return;
                }
              } catch {
                // OSRM best-effort — on garde au moins le point « moi ».
              }
              // Pas de route : on cadre quand même les deux points.
              map.fitBounds(
                L.latLngBounds([userLat, userLng], [destination.lat, destination.lng]),
                { padding: [56, 56] },
              );
              resolve(true);
            },
            () => resolve(false),
            { enableHighAccuracy: true, maximumAge: 30_000, timeout: 8_000 },
          );
        });

      stateRef.current = {
        L,
        map,
        userMarker: null,
        routeLayer: null,
        arrivalFired: false,
        destroy: () => map.remove(),
      };

      if (interactive) {
        onReadyRef.current?.({
          flyToDestination: () => {
            map.flyTo([destination.lat, destination.lng], 16, { duration: 0.9 });
          },
          startNavigation,
        });
      }
    })();

    return () => {
      cancelled = true;
      stateRef.current?.destroy();
      stateRef.current = null;
    };
  }, [destination.lat, destination.lng, interactive]);

  return (
    <div
      className={className}
      aria-label="Carte de navigation"
      // isolation: isolate force un nouveau stacking context — les z-index
      // internes de Leaflet (panes 200-700, controls 1000) restent confinés
      // ici au lieu de transpercer modales, navbar sticky ou sidebar.
      style={{ isolation: 'isolate' }}
    >
      <div
        ref={containerRef}
        role="application"
        aria-roledescription="carte"
        className="w-full h-full min-h-[320px] bg-surface-muted"
      />
    </div>
  );
}

export default MapNavigator;
