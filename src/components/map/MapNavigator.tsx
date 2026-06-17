'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import { Navigation } from 'lucide-react';

export interface MapNavigatorProps {
  destination: { lat: number; lng: number };
  onArrival?: () => void;
  className?: string;
  /**
   * When false the map is a static visualisation: all gestures are locked,
   * the zoom control is hidden, and no geolocation / OSRM routing is attempted.
   * Use it for owner mini-maps and form previews. Defaults to true.
   */
  interactive?: boolean;
}

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '© OpenStreetMap contributors';

const DEST_ICON_HTML = `<div style="
  width: 28px; height: 28px;
  background: var(--color-primary);
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  border: 3px solid white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
"></div>`;

export function MapNavigator({
  destination,
  onArrival,
  className,
  interactive = true,
}: MapNavigatorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Stored on a ref so we can clean up on unmount without re-triggering effects.
  const mapStateRef = useRef<{ destroy: () => void } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    void (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: interactive,
        attributionControl: true,
        // Static visualisation maps lock every gesture so the page scrolls
        // normally and no panning is possible.
        dragging: interactive,
        scrollWheelZoom: interactive,
        doubleClickZoom: interactive,
        boxZoom: interactive,
        keyboard: interactive,
        touchZoom: interactive,
      }).setView([destination.lat, destination.lng], 16);

      L.tileLayer(TILE_URL, {
        attribution: TILE_ATTRIBUTION,
        maxZoom: 19,
      }).addTo(map);

      const destIcon = L.divIcon({
        html: DEST_ICON_HTML,
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });
      L.marker([destination.lat, destination.lng], { icon: destIcon }).addTo(map);

      // Best-effort: ask for user position, drop a marker, try to draw an
      // OSRM route. Any failure (denied permission, OSRM down) is silent —
      // the destination marker is always enough to be useful. Skipped entirely
      // for non-interactive maps, which exist only to show the pin.
      if (interactive && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            if (cancelled) return;
            const userLat = pos.coords.latitude;
            const userLng = pos.coords.longitude;
            L.circleMarker([userLat, userLng], {
              radius: 7,
              color: '#1A7F50',
              weight: 2,
              fillColor: '#2DA86B',
              fillOpacity: 0.9,
            }).addTo(map);

            try {
              const url =
                `https://router.project-osrm.org/route/v1/driving/` +
                `${userLng},${userLat};${destination.lng},${destination.lat}` +
                `?overview=full&geometries=geojson`;
              const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
              const data = await res.json();
              if (cancelled) return;
              if (data?.code === 'Ok' && data.routes?.length > 0) {
                L.geoJSON(data.routes[0].geometry, {
                  style: { color: '#1A7F50', weight: 4, opacity: 0.8 },
                }).addTo(map);
                const bounds = L.latLngBounds(
                  [userLat, userLng],
                  [destination.lat, destination.lng],
                );
                map.fitBounds(bounds, { padding: [40, 40] });
              }
            } catch {
              // OSRM is best-effort; ignore failures.
            }
          },
          () => {
            // Geolocation denied — keep the destination-only view.
          },
          { enableHighAccuracy: true, maximumAge: 30_000, timeout: 8_000 },
        );
      }

      mapStateRef.current = {
        destroy: () => map.remove(),
      };
    })();

    return () => {
      cancelled = true;
      mapStateRef.current?.destroy();
      mapStateRef.current = null;
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
        className="w-full h-[320px] bg-surface-muted"
      />
      {onArrival ? (
        <div className="sr-only">
          <button type="button" onClick={onArrival}>
            <Navigation aria-hidden="true" /> Marquer comme arrivé
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default MapNavigator;
