'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Loader2, MapPin, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useRequireAdmin } from '@/hooks/useRequireAdmin';
import { api } from '@/lib/api';
import { classNames } from '@/lib/utils';
import type { Quartier } from '@/types/api';

const QuartiersOverviewMap = dynamic(
  () =>
    import('@/components/map/QuartiersOverviewMap').then(
      (m) => m.QuartiersOverviewMap,
    ),
  {
    ssr: false,
    loading: () => <div className="w-full h-[420px] bg-surface-muted animate-pulse" />,
  },
);

type AdminQuartier = Quartier & { addressCount: number };
type View = 'list' | 'map';

export default function AdminQuartiersPage() {
  useRequireAdmin();
  const toast = useToast();
  const [quartiers, setQuartiers] = useState<AdminQuartier[] | null>(null);
  const [view, setView] = useState<View>('list');
  const [toggling, setToggling] = useState<string | null>(null);

  const load = () => {
    setQuartiers(null);
    api
      .adminQuartiers()
      .then(setQuartiers)
      .catch(() => {
        toast.show({ message: 'Impossible de charger les quartiers.', variant: 'error' });
        setQuartiers([]);
      });
  };

  useEffect(load, []);

  const toggleQuartier = async (quartier: AdminQuartier) => {
    setToggling(quartier.id);
    try {
      await api.adminUpdateQuartier(quartier.id, { isActive: !quartier.isActive });
      setQuartiers((current) =>
        current
          ? current.map((q) =>
              q.id === quartier.id ? { ...q, isActive: !q.isActive } : q,
            )
          : current,
      );
      toast.show({
        message: quartier.isActive ? 'Quartier désactivé.' : 'Quartier activé.',
        variant: 'success',
      });
    } catch {
      toast.show({
        message: 'Action impossible pour l’instant.',
        variant: 'error',
      });
    } finally {
      setToggling(null);
    }
  };

  return (
    <section className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 py-6 flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display font-bold text-[32px] leading-[38px] tracking-[-0.01em] text-text-primary">
            Quartiers
          </h1>
          <p className="text-sm text-text-muted">
            Référentiel importé depuis OpenStreetMap (Overpass), ajusté
            manuellement.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            role="tablist"
            aria-label="Vue quartiers"
            className="inline-flex items-center gap-1 bg-surface-muted rounded-md p-1"
          >
            {(['list', 'map'] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={classNames(
                  'px-3 py-1.5 text-sm font-medium rounded-sm',
                  view === v
                    ? 'bg-surface text-text-primary'
                    : 'text-text-muted hover:text-text-primary',
                )}
              >
                {v === 'list' ? 'Liste' : 'Carte'}
              </button>
            ))}
          </div>
          <Link href="/admin/quartiers/new">
            <Button
              variant="primary"
              size="sm"
              leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
            >
              Créer un quartier
            </Button>
          </Link>
        </div>
      </header>

      {view === 'list' ? (
        <div className="bg-surface rounded-lg border border-border shadow-sm overflow-hidden">
          {quartiers === null ? (
            <div className="p-5 space-y-3">
              <Skeleton width="100%" height={20} count={4} />
            </div>
          ) : quartiers.length === 0 ? (
            <p className="p-6 text-text-muted text-sm">Aucun quartier enregistré.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-xs uppercase tracking-[0.08em] text-text-muted">
                <tr>
                  <th className="text-left px-4 py-3">Préfixe</th>
                  <th className="text-left px-4 py-3">Nom</th>
                  <th className="text-right px-4 py-3">Adresses</th>
                  <th className="text-left px-4 py-3">Statut</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {quartiers.map((quartier) => (
                  <tr key={quartier.id} className="border-t border-dashed border-border">
                    <td className="px-4 py-3 font-display font-bold tracking-[0.1em] text-text-primary">
                      {quartier.prefix}
                    </td>
                    <td className="px-4 py-3 text-text-primary">
                      <Link
                        href={`/admin/quartiers/${quartier.id}`}
                        className="hover:text-primary"
                      >
                        {quartier.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-text-muted">
                      {quartier.addressCount}
                    </td>
                    <td className="px-4 py-3">
                      {quartier.isActive ? (
                        <Badge variant="success">Actif</Badge>
                      ) : (
                        <Badge variant="neutral">Inactif</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={toggling === quartier.id}
                        onClick={() => void toggleQuartier(quartier)}
                      >
                        {quartier.isActive ? 'Désactiver' : 'Activer'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="bg-surface rounded-lg border border-border shadow-sm overflow-hidden">
          {quartiers === null ? (
            <div className="h-[420px] flex items-center justify-center gap-2 text-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Chargement de la carte…
            </div>
          ) : (
            <>
              <QuartiersOverviewMap quartiers={quartiers} />
              <p className="p-3 text-xs text-text-muted inline-flex items-center gap-2">
                <MapPin className="h-3 w-3 text-primary" aria-hidden="true" />
                Vert : quartiers actifs · Gris : quartiers désactivés. Les
                polygones manquants seront importés via l’API Overpass.
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
