'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Ban, Eye, Search } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useRequireAdmin } from '@/hooks/useRequireAdmin';
import { api } from '@/lib/api';
import { classNames } from '@/lib/utils';
import type { AdminHabitant, HabitantStatus } from '@/types/api';

type StatusFilter = 'all' | HabitantStatus;

const STATUS_LABELS: Record<HabitantStatus, string> = {
  verified: 'Vérifié',
  unverified: 'Non vérifié',
  disabled: 'Désactivé',
};

const STATUS_VARIANT: Record<HabitantStatus, 'success' | 'warning' | 'danger'> = {
  verified: 'success',
  unverified: 'warning',
  disabled: 'danger',
};

export default function AdminHabitantsPage() {
  useRequireAdmin();
  const toast = useToast();
  const [habitants, setHabitants] = useState<AdminHabitant[] | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setHabitants(null);
    api
      .adminHabitants()
      .then((list) => {
        if (!cancelled) setHabitants(list);
      })
      .catch(() => {
        if (!cancelled) {
          toast.show({
            message: 'Impossible de charger les habitants.',
            variant: 'error',
          });
          setHabitants([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const filtered = useMemo(() => {
    if (!habitants) return [];
    const needle = search.trim().toLowerCase();
    return habitants.filter((h) => {
      if (status !== 'all' && h.status !== status) return false;
      if (!needle) return true;
      return (
        h.phone.toLowerCase().includes(needle) ||
        (h.email ?? '').toLowerCase().includes(needle)
      );
    });
  }, [habitants, search, status]);

  const totalCount = habitants?.length ?? null;

  const handleToggleDisable = async (habitant: AdminHabitant) => {
    if (habitant.status === 'disabled') return;
    setToggling(habitant.id);
    try {
      await api.adminUpdateHabitant(habitant.id, { status: 'disabled' });
      setHabitants((current) =>
        current
          ? current.map((h) =>
              h.id === habitant.id ? { ...h, status: 'disabled' } : h,
            )
          : current,
      );
      toast.show({
        message: `Compte ${habitant.phone} désactivé.`,
        variant: 'success',
      });
    } catch {
      toast.show({ message: 'Action impossible.', variant: 'error' });
    } finally {
      setToggling(null);
    }
  };

  return (
    <section className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8 flex flex-col gap-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display font-bold text-[32px] leading-[38px] tracking-[-0.01em] text-text-primary">
              Habitants
            </h1>
            {totalCount !== null ? (
              <Badge variant="neutral" size="md">
                {totalCount.toLocaleString('fr-FR')} utilisateur
                {totalCount > 1 ? 's' : ''}
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-text-muted mt-1">
            Gérez les comptes citoyens et leurs adresses.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 md:max-w-xl flex-1">
          <div className="flex-1">
            <Input
              label="Rechercher"
              placeholder="Numéro ou email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leadingIcon={<Search className="h-4 w-4" aria-hidden="true" />}
            />
          </div>
          <label className="text-xs text-text-muted flex flex-col gap-1 min-w-[160px]">
            Statut
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              className="h-11 rounded-md border border-border-strong bg-surface px-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="all">Tous</option>
              <option value="verified">Vérifiés</option>
              <option value="unverified">Non vérifiés</option>
              <option value="disabled">Désactivés</option>
            </select>
          </label>
        </div>
      </header>

      <section className="card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Avatar
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Numéro
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Inscrit
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Adresses
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Statut
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {habitants === null ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-t border-border">
                    <td colSpan={6} className="p-4">
                      <Skeleton width="100%" height={28} />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-text-muted"
                  >
                    Aucun habitant ne correspond à ces filtres.
                  </td>
                </tr>
              ) : (
                filtered.map((h) => (
                  <tr
                    key={h.id}
                    className="border-t border-border hover:bg-surface-muted/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Avatar phone={h.phone} />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/habitants/${h.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {h.phone}
                      </Link>
                      {h.email ? (
                        <p className="text-xs text-text-muted">{h.email}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {formatRelative(h.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {h.addressCount} adresse
                      {h.addressCount > 1 ? 's' : ''}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={STATUS_VARIANT[h.status]}
                        size="sm"
                      >
                        {STATUS_LABELS[h.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/admin/habitants/${h.id}`}
                          aria-label={`Voir le profil de ${h.phone}`}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-md text-primary hover:bg-primary-surface transition-colors"
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => void handleToggleDisable(h)}
                          disabled={
                            h.status === 'disabled' || toggling === h.id
                          }
                          aria-label={`Désactiver ${h.phone}`}
                          className={classNames(
                            'inline-flex items-center justify-center w-9 h-9 rounded-md transition-colors',
                            h.status === 'disabled'
                              ? 'text-text-muted opacity-40 cursor-not-allowed'
                              : 'text-danger hover:bg-danger-light/40 cursor-pointer',
                          )}
                        >
                          <Ban className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function Avatar({ phone }: { phone: string }) {
  // Derive initials from the last 4 digits — phones are the only stable
  // identifier in this app, so the avatar mirrors the phone display.
  const tail = phone.replace(/\D+/g, '').slice(-4);
  const initials = `${tail.slice(0, 2)}`;
  return (
    <span
      aria-hidden="true"
      className="inline-flex w-9 h-9 items-center justify-center rounded-full bg-primary-surface text-primary text-sm font-bold"
    >
      {initials}
    </span>
  );
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days < 1) return 'Aujourd’hui';
  if (days < 2) return 'Hier';
  if (days < 7) return `Il y a ${days} jours`;
  return new Date(iso).toLocaleDateString('fr-FR');
}
