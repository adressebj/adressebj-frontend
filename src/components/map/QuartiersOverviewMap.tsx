'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import type { GeoJsonPolygon, Quartier } from '@/types/api';

export interface QuartiersOverviewMapProps {
  quartiers: Array<Quartier & { addressCount?: number }>;
  className?: string;
}

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '© OpenStreetMap contributors';
const DEFAULT_CENTER: [number, number] = [6.37, 2.41];

function isPolygon(value: unknown): value is GeoJsonPolygon {
  return Boolean(
    value &&
      typeof value === 'object' &&
      (value as { type?: string }).type === 'Polygon' &&
      Array.isArray((value as { coordinates?: unknown }).coordinates),
  );
}

export function QuartiersOverviewMap({ quartiers, className }: QuartiersOverviewMapProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!ref.current) return;
      const L = (await import('leaflet')).default;
      if (cancelled || !ref.current) return;

      const map = L.map(ref.current).setView(DEFAULT_CENTER, 12);
      L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);

      const polygons = quartiers.filter((q) => isPolygon(q.polygon));
      if (polygons.length === 0) {
        // No geometry yet — drop a small reminder dot at the default center
        // so the map isn't visually empty. circleMarker avoids loading the
        // default PNG icons, which 404 under nested routes like /admin.
        L.circleMarker(DEFAULT_CENTER, {
          radius: 6,
          color: '#1B5E3B',
          weight: 2,
          fillColor: '#2E8B57',
          fillOpacity: 0.8,
        }).addTo(map);
      } else {
        polygons.forEach((quartier) => {
          const layer = L.geoJSON(quartier.polygon as GeoJsonPolygon, {
            style: {
              color: quartier.isActive ? '#1B5E3B' : '#6B6560',
              weight: 2,
              fillOpacity: 0.18,
              fillColor: quartier.isActive ? '#2E8B57' : '#B8AFA3',
            },
          });
          layer.bindTooltip(`${quartier.name} (${quartier.prefix})`);
          layer.addTo(map);
        });
        const bounds = L.geoJSON(
          polygons.map((q) => q.polygon as GeoJsonPolygon) as never,
        ).getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [24, 24] });
        }
      }

      cleanupRef.current = () => map.remove();
    })();

    return () => {
      cancelled = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [quartiers]);

  return (
    <div className={className} style={{ isolation: 'isolate' }}>
      <div
        ref={ref}
        role="application"
        aria-roledescription="carte"
        className="w-full h-[420px] bg-surface-muted"
      />
    </div>
  );
}

export default QuartiersOverviewMap;
