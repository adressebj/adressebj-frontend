'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ReliabilityBadge } from '@/components/address/ReliabilityBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useRequireAdmin } from '@/hooks/useRequireAdmin';
import { api } from '@/lib/api';
import { classNames } from '@/lib/utils';

type StatusFilter = 'all' | 'active' | 'inactive' | 'reported';

interface AdminAddressItem {
  code: string;
  quartier: { name: string } | null;
  ownerPhone: string;
  isActive: boolean;
  reliabilityScore: number | null;
  reportCount: number;
  createdAt: string;
}

interface ListPayload {
  items: AdminAddressItem[];
  total: number;
  page: number;
  limit: number;
}

const PAGE_SIZE = 20;
const STATUS_TABS: Array<{ key: StatusFilter; label: string }> = [
  { key: 'all', label: 'Toutes' },
  { key: 'active', label: 'Actives' },
  { key: 'inactive', label: 'Inactives' },
  { key: 'reported', label: 'Signalées' },
];

export default function AdminAddressesPage() {
  useRequireAdmin();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListPayload | null>(null);
  const [deactivating, setDeactivating] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    const timer = window.setTimeout(() => {
      api
        .adminAddresses({ search: search.trim() || undefined, status, page, limit: PAGE_SIZE })
        .then((payload) => {
          if (!cancelled) setData(payload);
        })
        .catch(() => {
          if (!cancelled) {
            toast.show({
              message: 'Impossible de charger les adresses.',
              variant: 'error',
            });
            setData({ items: [], total: 0, page, limit: PAGE_SIZE });
          }
        });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search, status, page, toast]);

  const handleDeactivate = async (code: string) => {
    setDeactivating(code);
    try {
      await api.adminDeactivateAddress(code);
      setData((current) =>
        current
          ? {
              ...current,
              items: current.items.map((item) =>
                item.code === code ? { ...item, isActive: false } : item,
              ),
            }
          : current,
      );
      toast.show({ message: `Adresse ${code} désactivée.`, variant: 'success' });
    } catch {
      toast.show({ message: 'Action impossible.', variant: 'error' });
    } finally {
      setDeactivating(null);
    }
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <section className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 py-6 flex flex-col gap-6">
      <header>
        <h1 className="font-display font-bold text-[32px] leading-[38px] tracking-[-0.01em] text-text-primary">
          Supervision des adresses
        </h1>
        <p className="text-sm text-text-muted">
          Filtrez par statut, recherchez par code, quartier ou numéro de téléphone.
        </p>
      </header>

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex-1 max-w-md">
          <Input
            label="Recherche"
            placeholder="AKP-7X3K, Akpakpa, +22960…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            leadingIcon={<Search className="h-4 w-4" aria-hidden="true" />}
          />
        </div>
        <div
          role="tablist"
          aria-label="Filtres statut"
          className="inline-flex items-center gap-1 bg-surface-muted rounded-md p-1 self-start"
        >
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={status === tab.key}
              onClick={() => {
                setStatus(tab.key);
                setPage(1);
              }}
              className={classNames(
                'px-3 py-1.5 text-sm font-medium rounded-sm',
                status === tab.key
                  ? 'bg-surface text-text-primary'
                  : 'text-text-muted hover:text-text-primary',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-surface rounded-lg border border-border shadow-sm overflow-x-auto">
        {!data ? (
          <div className="p-5 space-y-3">
            <Skeleton width="100%" height={20} count={6} />
          </div>
        ) : data.items.length === 0 ? (
          <p className="p-6 text-text-muted text-sm">Aucune adresse ne correspond à vos filtres.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-xs uppercase tracking-[0.08em] text-text-muted">
              <tr>
                <th className="text-left px-4 py-3">Code</th>
                <th className="text-left px-4 py-3">Quartier</th>
                <th className="text-left px-4 py-3">Téléphone</th>
                <th className="text-left px-4 py-3">Fiabilité</th>
                <th className="text-right px-4 py-3">Signalements</th>
                <th className="text-left px-4 py-3">Créée</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.code} className="border-t border-dashed border-border">
                  <td className="px-4 py-3 font-display font-bold tracking-[0.1em] whitespace-nowrap">
                    <Link
                      href={`/admin/addresses/${item.code}`}
                      className="text-primary hover:underline"
                    >
                      {item.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-primary">
                    {item.quartier?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                    {item.ownerPhone}
                  </td>
                  <td className="px-4 py-3">
                    <ReliabilityBadge score={item.reliabilityScore} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {item.reportCount > 0 ? (
                      <Badge variant="danger" size="sm">
                        {item.reportCount}
                      </Badge>
                    ) : (
                      <span className="text-text-muted">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                    {new Date(item.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {item.isActive ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={deactivating === item.code}
                        onClick={() => void handleDeactivate(item.code)}
                      >
                        Désactiver
                      </Button>
                    ) : (
                      <Badge variant="neutral" size="sm">
                        Inactive
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data && data.total > PAGE_SIZE ? (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-between text-sm text-text-muted"
        >
          <span>
            Page {data.page} sur {totalPages} · {data.total} résultats
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Précédente
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Suivante
            </Button>
          </div>
        </nav>
      ) : null}
    </section>
  );
}
