'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Locate } from 'lucide-react';
import { type Category } from '@/lib/categories';
import { api } from '@/lib/api';
import { decodePlace } from '@/lib/place';
import { useToast } from '@/components/ui/Toast';
import { SearchBar } from '@/components/forms/SearchBar';
import { CategoryFilters } from '@/components/discovery/CategoryFilters';
import { PlaceCard } from '@/components/discovery/PlaceCard';
import { ResultsPanel } from '@/components/discovery/ResultsPanel';
import { BottomSheet } from '@/components/discovery/BottomSheet';
import type { DiscoveryMapApi } from '@/components/map/DiscoveryMap';
import type { DiscoveryCategory, DiscoveryItem } from '@/types/api';

// La carte est purement client (Leaflet touche `window`). Skeleton pendant
// l'hydratation pour éviter le flash blanc.
const DiscoveryMap = dynamic(
  () => import('@/components/map/DiscoveryMap').then((m) => m.DiscoveryMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full h-full bg-surface-muted animate-pulse"
        aria-label="Chargement de la carte"
      />
    ),
  },
);

// Centre par défaut : Cotonou (le centre couvre le plus de marqueurs seedés).
// Si la query string fournit `?lat=&lng=`, on respecte (vient de la SearchBar
// qui résout un lieu en coordonnées Nominatim).
const COTONOU_CENTER = { lat: 6.3676, lng: 2.4252 };

// Délai après la dernière bbox notifiée avant de refaire l'appel API (CDC §10).
const BOUNDS_DEBOUNCE_MS = 350;

export default function CartePage() {
  return (
    <Suspense
      fallback={
        <div
          className="w-full h-screen bg-surface-muted animate-pulse"
          aria-label="Chargement de la carte"
        />
      }
    >
      <CartePageInner />
    </Suspense>
  );
}

function CartePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  // Centre initial — par défaut Cotonou, mais respecte ?lat=&lng= venant d'une
  // recherche Nominatim.
  const initialCenter = (() => {
    const lat = parseFloat(searchParams?.get('lat') ?? '');
    const lng = parseFloat(searchParams?.get('lng') ?? '');
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    return COTONOU_CENTER;
  })();

  const [items, setItems] = useState<DiscoveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Sélection multi-catégories. Vide = "Tous" actif (aucun filtre).
  const [selected, setSelected] = useState<Set<Category>>(new Set());
  // Code mis en avant (survol liste ↔ marqueur).
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);

  // API impérative de la carte (FAB géoloc, vol vers un résultat).
  const mapApiRef = useRef<DiscoveryMapApi | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Lieu OSM recherché par nom (décodé de l'URL) → fiche sommaire + marqueur.
  const placeParam = searchParams?.get('place');
  const selectedPlace = useMemo(() => decodePlace(placeParam), [placeParam]);

  // Marqueur « lieu recherché » + vol vers lui, dès que la carte est prête.
  useEffect(() => {
    if (!mapReady) return;
    const map = mapApiRef.current;
    if (!map) return;
    if (selectedPlace) {
      map.setSearchPoint({ lat: selectedPlace.lat, lng: selectedPlace.lng });
      map.flyTo(selectedPlace.lat, selectedPlace.lng, 16);
    } else {
      map.setSearchPoint(null);
    }
  }, [mapReady, selectedPlace]);

  const handleClosePlace = useCallback(() => {
    mapApiRef.current?.setSearchPoint(null);
    router.replace('/carte');
  }, [router]);

  // Dernière bbox vue + timer de debounce.
  const lastBoundsRef = useRef<{
    west: number; south: number; east: number; north: number;
  } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadItems = useCallback(async () => {
    const bbox = lastBoundsRef.current;
    if (!bbox) return;
    setLoading(true);
    setError(false);
    try {
      const { items: hits } = await api.discoveryMap({
        bbox,
        categories:
          selected.size > 0
            ? (Array.from(selected) as DiscoveryCategory[])
            : undefined,
      });
      setItems(hits);
    } catch {
      setError(true);
      toast.show({
        message: 'Impossible de charger les adresses sur la carte.',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [selected, toast]);

  // Refetch immédiat au changement de filtre (la bbox courante sert).
  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const handleBoundsChange = useCallback(
    (bounds: { west: number; south: number; east: number; north: number }) => {
      lastBoundsRef.current = bounds;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void loadItems();
      }, BOUNDS_DEBOUNCE_MS);
    },
    [loadItems],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const toggleCategory = useCallback((cat: Category) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => setSelected(new Set()), []);

  const handleItemSelect = useCallback(
    (code: string) => router.push(`/a/${code}`),
    [router],
  );

  const handleLocate = useCallback((item: DiscoveryItem) => {
    mapApiRef.current?.flyTo(item.lat, item.lng);
    setActiveCode(item.code);
    setSheetExpanded(false);
  }, []);

  const handleRecenter = useCallback(async () => {
    const mapApi = mapApiRef.current;
    if (!mapApi) return;
    const ok = await mapApi.flyToUser();
    if (!ok) {
      toast.show({
        message:
          'Impossible d’obtenir votre position. Vérifiez vos permissions ou la disponibilité de la géolocalisation.',
        variant: 'error',
      });
    }
  }, [toast]);

  // La liste n'affiche que les marqueurs non muets (DOMICILE invisibles à
  // l'attention — matrice de visibilité CDC).
  const listItems = items.filter((it) => !it.muted);
  const hasFilters = selected.size > 0;

  const countLabel = loading
    ? 'Chargement…'
    : error
      ? 'Chargement impossible'
      : listItems.length === 0
        ? 'Aucune adresse visible ici'
        : `${listItems.length} adresse${listItems.length > 1 ? 's' : ''} visible${listItems.length > 1 ? 's' : ''} ici`;

  const placeCardEl = selectedPlace ? (
    <PlaceCard place={selectedPlace} onClose={handleClosePlace} />
  ) : null;

  const resultsPanel = (
    <ResultsPanel
      items={listItems}
      loading={loading}
      error={error}
      activeCode={activeCode}
      onActivate={setActiveCode}
      onLocate={handleLocate}
      onRetry={loadItems}
      hasFilters={hasFilters}
      onClearFilters={clearFilters}
    />
  );

  return (
    <div className="fixed inset-0 bg-bg">
      {/* ── ZONE CARTE — occupe tout l'espace ── */}
      <div className="absolute inset-0 isolate">
        <DiscoveryMap
          items={items}
          initialCenter={initialCenter}
          initialZoom={14}
          showUserLocation
          activeCode={activeCode}
          onBoundsChange={handleBoundsChange}
          onItemSelect={handleItemSelect}
          onItemActivate={setActiveCode}
          onReady={(mapApi) => {
            mapApiRef.current = mapApi;
            setMapReady(true);
          }}
        />

        {/* Chrome flottant mobile — barre de recherche (Solid paper). */}
        <div
          className="lg:hidden absolute inset-x-0 top-0 z-20 flex items-center gap-2 p-3 pointer-events-none"
          style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
        >
          <Link
            href="/"
            aria-label="Retour à l'accueil"
            className="pointer-events-auto bg-surface inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-text-primary shadow-md border border-border tap-press"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <div className="flex-1 min-w-0 pointer-events-auto">
            <SearchBar variant="map" />
          </div>
        </div>

        {/* FAB recentrage — réel : vole vers la position utilisateur. */}
        <button
          type="button"
          aria-label="Recentrer sur ma position"
          onClick={handleRecenter}
          className="absolute right-4 bottom-36 lg:right-6 lg:bottom-6 z-20 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-text-inverse shadow-lg hover:bg-primary-hover hover:scale-105 active:scale-95 transition-all"
        >
          <Locate className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>

      {/* ── PANNEAU FLOTTANT DESKTOP — Solid Paper ── */}
      <aside className="hidden lg:flex absolute top-4 left-4 bottom-4 w-[420px] flex-col rounded-[var(--radius-xl)] bg-surface border border-border-strong shadow-lg z-20 overflow-hidden">
        <div className="flex items-center gap-4 px-6 py-5 border-b border-border shrink-0 bg-surface">
          <Link
            href="/"
            aria-label="Retour à l'accueil"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-text-muted hover:border-primary hover:text-primary hover:bg-primary-surface transition-all tap-press"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-display font-bold text-2xl tracking-tight text-primary">
              Découvrir
            </h1>
            <p className="text-sm font-medium text-text-muted mt-0.5" aria-live="polite">
              {countLabel}
            </p>
          </div>
        </div>

        <div className="px-6 py-5 border-b border-border shrink-0 space-y-4 bg-surface">
          <SearchBar variant="map" />
          <CategoryFilters
            selected={selected}
            onToggle={toggleCategory}
            onClear={clearFilters}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-bg">
          {placeCardEl ? <div className="p-4 pb-0">{placeCardEl}</div> : null}
          {resultsPanel}
        </div>
      </aside>


      {/* ── BOTTOM-SHEET MOBILE — compteur + filtres (peek), liste (corps) ── */}
      <BottomSheet
        expanded={sheetExpanded}
        onExpandedChange={setSheetExpanded}
        peek={
          <div className="px-4 pb-3 pt-1 space-y-2.5">
            {placeCardEl}
            <p
              className="font-display font-semibold text-text-primary"
              aria-live="polite"
            >
              {countLabel}
            </p>
            <CategoryFilters
              selected={selected}
              onToggle={toggleCategory}
              onClear={clearFilters}
            />
          </div>
        }
      >
        {resultsPanel}
      </BottomSheet>
    </div>
  );
}
