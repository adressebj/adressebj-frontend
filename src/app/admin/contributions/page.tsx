'use client';

import { useCallback, useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import type { Contribution } from '@/types/api';

export default function AdminContributionsPage() {
  const toast = useToast();
  const [items, setItems] = useState<Contribution[] | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(() => {
    setItems(null);
    api
      .adminContributions('PENDING')
      .then(setItems)
      .catch(() => {
        toast.show({
          message: 'Impossible de charger les contributions.',
          variant: 'error',
        });
        setItems([]);
      });
  }, [toast]);

  useEffect(load, [load]);

  const handleAction = useCallback(
    async (id: string, action: 'approved' | 'rejected') => {
      setActing(id);
      try {
        await api.adminUpdateContribution(id, { status: action });
        setItems((current) => current?.filter((c) => c.id !== id) ?? current);
        toast.show({
          message: action === 'approved' ? 'Contribution publiée.' : 'Contribution rejetée.',
          variant: 'success',
        });
      } catch {
        toast.show({ message: 'Action impossible.', variant: 'error' });
      } finally {
        setActing(null);
      }
    },
    [toast],
  );

  return (
    <section className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 py-6 flex flex-col gap-6">
      <header>
        <h1 className="font-display font-bold text-[32px] leading-[38px] tracking-[-0.01em] text-text-primary">
          Contributions terrain
        </h1>
        <p className="text-sm text-text-muted">
          Validez ou rejetez les précisions remontées par les visiteurs.
        </p>
      </header>

      {/* Rappel doctrine modération (CDC v5 §8) — approuver une contribution
         publie la précision telle quelle. Le contenu de l'adresse n'est
         jamais réécrit côté modération : seul le propriétaire édite. */}
      <aside
        role="note"
        className="flex items-start gap-2.5 rounded-md border border-info/30 bg-info-light px-4 py-3"
      >
        <Info className="h-4 w-4 text-info shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-sm text-text-primary leading-relaxed">
          <span className="font-semibold">Approuver ≠ modifier l&apos;adresse.</span>{' '}
          Approuver publie la précision telle qu&apos;elle a été remontée par
          le visiteur. Pour corriger le contenu officiel d&apos;une adresse,
          seul son propriétaire peut le faire depuis son tableau de bord.
        </p>
      </aside>

      {items === null ? (
        <div className="space-y-3">
          <Skeleton width="100%" height={120} count={2} />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-surface border border-border shadow-sm rounded-lg p-6">
          <p className="text-text-primary">
            Aucune contribution en attente.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((contribution) => (
            <li
              key={contribution.id}
              className="bg-surface border border-border shadow-sm rounded-lg p-5 flex flex-col gap-3"
            >
              <header className="flex items-center justify-between gap-2">
                <p className="font-display font-bold tracking-[0.1em] text-text-primary">
                  {contribution.addressCode ?? contribution.addressId}
                </p>
                <Badge variant="warning">En attente</Badge>
              </header>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {contribution.direction ? (
                  <div>
                    <dt className="text-xs uppercase tracking-[0.1em] text-text-muted">
                      Sens de circulation
                    </dt>
                    <dd className="text-text-primary mt-1">{contribution.direction}</dd>
                  </div>
                ) : null}
                {contribution.entrySide ? (
                  <div>
                    <dt className="text-xs uppercase tracking-[0.1em] text-text-muted">
                      Côté d’entrée
                    </dt>
                    <dd className="text-text-primary mt-1">{contribution.entrySide}</dd>
                  </div>
                ) : null}
              </dl>
              <p className="text-xs text-text-muted">
                Soumis le {new Date(contribution.createdAt).toLocaleString('fr-FR')}
              </p>
              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-dashed border-border">
                <Button
                  variant="primary"
                  size="md"
                  loading={acting === contribution.id}
                  disabled={acting !== null && acting !== contribution.id}
                  onClick={() => void handleAction(contribution.id, 'approved')}
                >
                  Publier
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  loading={acting === contribution.id}
                  disabled={acting !== null && acting !== contribution.id}
                  onClick={() => void handleAction(contribution.id, 'rejected')}
                >
                  Rejeter
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
