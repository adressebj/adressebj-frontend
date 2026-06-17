'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Locate, Search } from 'lucide-react';
import { CATEGORIES, FILTERABLE_CATEGORIES, type Category } from '@/lib/categories';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { classNames } from '@/lib/utils';
import type {
  DiscoveryCategory,
  DiscoveryItem,
} from '@/types/api';

// La carte est purement client (Leaflet touche `window`). Skeleton gris
// pendant l'hydratation pour éviter le flash blanc.
const DiscoveryMap = dynamic(
  () =>
    import('@/components/map/DiscoveryMap').then((m) => m.DiscoveryMap),
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
// de la landing qui résout un lieu en coordonnées Nominatim).
const COTONOU_CENTER = { lat: 6.3676, lng: 2.4252 };

// Délai après la dernière bbox notifiée avant de refaire l'appel API. Le
// CDC §10 insiste sur le debounce pour éviter de saturer le mock comme
// l'endpoint réel pendant le pan/zoom continu.
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

  // Centre initial — par défaut Cotonou, mais respecte ?lat=&lng= venant
  // d'une recherche Nominatim sur la landing.
  const initialCenter = (() => {
    const lat = parseFloat(searchParams?.get('lat') ?? '');
    const lng = parseFloat(searchParams?.get('lng') ?? '');
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
    return COTONOU_CENTER;
  })();

  const [items, setItems] = useState<DiscoveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  // Sélection multi-catégories. Vide = "Tous" actif (aucun filtre).
  const [selected, setSelected] = useState<Set<Category>>(new Set());

  // Stocker la dernière bbox vue + un timer pour le debounce.
  const lastBoundsRef = useRef<{
    west: number; south: number; east: number; north: number;
  } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refetch dès qu'on a une bbox + à chaque changement de filtre.
  const loadItems = useCallback(async () => {
    const bbox = lastBoundsRef.current;
    if (!bbox) return;
    setLoading(true);
    try {
      const { items: hits } = await api.discoveryMap({
        bbox,
        categories: selected.size > 0
          ? (Array.from(selected) as DiscoveryCategory[])
          : undefined,
      });
      setItems(hits);
    } catch {
      toast.show({
        message: 'Impossible de charger les adresses sur la carte.',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [selected, toast]);

  // Quand le filtre change, refetch immédiat (le bbox actuel sert).
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

  const toggleCategory = (cat: Category) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const handleItemSelect = useCallback(
    (code: string) => {
      router.push(`/a/${code}`);
    },
    [router],
  );

  // Compteur affiché sous les filtres — compte uniquement les marqueurs
  // non-DOMICILE car les DOMICILE sont volontairement invisibles à
  // l'attention (matrice de visibilité CDC).
  const nonDomicileCount = items.filter((it) => !it.muted).length;

  return (
    <div className="fixed inset-0 flex flex-col bg-bg">
      {/* Header sticky — bouton retour, titre, loupe (ouvre la SearchBar de
         la landing dans un futur incrément). */}
      <header className="relative z-30 flex items-center justify-between gap-2 h-14 px-3 bg-surface/85 backdrop-blur-md border-b border-border">
        <Link
          href="/"
          aria-label="Retour à l'accueil"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-text-primary hover:bg-surface-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <h1 className="font-display font-semibold text-lg text-text-primary">
          Découvrir
        </h1>
        <Link
          href="/"
          aria-label="Rechercher"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-text-primary hover:bg-surface-muted transition-colors"
        >
          <Search className="h-5 w-5" aria-hidden="true" />
        </Link>
      </header>

      {/* Barre de filtres + compteur. Scrollable horizontalement sur mobile. */}
      <div className="relative z-20 bg-surface/85 backdrop-blur-md border-b border-border">
        <div
          role="listbox"
          aria-label="Filtres par catégorie"
          aria-multiselectable="true"
          className="flex items-center gap-2 px-3 py-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <Chip
            label="Tous"
            active={selected.size === 0}
            onClick={() => setSelected(new Set())}
          />
          {FILTERABLE_CATEGORIES.map((cat) => {
            const Icon = CATEGORIES[cat].icon;
            return (
              <Chip
                key={cat}
                label={CATEGORIES[cat].label}
                icon={<Icon className="h-3.5 w-3.5" aria-hidden="true" />}
                active={selected.has(cat)}
                onClick={() => toggleCategory(cat)}
              />
            );
          })}
        </div>
        <div className="px-4 pb-2">
          <p className="text-xs text-text-muted">
            {loading
              ? 'Chargement…'
              : nonDomicileCount === 0
                ? 'Aucune adresse visible dans cette portion de carte'
                : `${nonDomicileCount} adresse${nonDomicileCount > 1 ? 's' : ''} visible${nonDomicileCount > 1 ? 's' : ''} ici`}
          </p>
        </div>
      </div>

      {/* Carte plein écran (occupe tout le reste de la hauteur). */}
      <div className="relative flex-1 isolate">
        <DiscoveryMap
          items={items}
          initialCenter={initialCenter}
          initialZoom={14}
          showUserLocation
          onBoundsChange={handleBoundsChange}
          onItemSelect={handleItemSelect}
        />

        {/* FAB de recentrage — pour l'instant un simple reload sur le centre
           Cotonou. L'utilisateur peut aussi cliquer son point bleu sur la
           carte si la géoloc est disponible. */}
        <button
          type="button"
          aria-label="Recentrer sur ma position"
          onClick={() => {
            if (typeof navigator === 'undefined' || !navigator.geolocation) {
              toast.show({
                message: 'Géolocalisation indisponible sur cet appareil.',
                variant: 'error',
              });
              return;
            }
            navigator.geolocation.getCurrentPosition(
              () => {
                // Recharger la page avec ?lat=&lng= déclencherait un reset,
                // mais on préfère laisser la carte tranquille. Pour le
                // prototype, on toast un succès — un incrément futur
                // exposera le `map` au parent pour le panTo programmatic.
                toast.show({
                  message: 'Position acquise — pannez la carte pour explorer.',
                  variant: 'success',
                });
              },
              () => {
                toast.show({
                  message: "Impossible d'obtenir votre position. Vérifiez vos permissions.",
                  variant: 'error',
                });
              },
              { enableHighAccuracy: true, timeout: 5_000 },
            );
          }}
          className="absolute bottom-6 right-4 z-20 inline-flex items-center justify-center h-14 w-14 rounded-full bg-primary text-text-inverse shadow-lg hover:bg-primary-hover hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
        >
          <Locate className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function Chip({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onClick}
      className={classNames(
        'inline-flex shrink-0 items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium border transition-colors cursor-pointer',
        active
          ? 'bg-primary border-primary text-text-inverse shadow-sm'
          : 'bg-surface border-border text-text-muted hover:text-text-primary hover:border-border-strong',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
