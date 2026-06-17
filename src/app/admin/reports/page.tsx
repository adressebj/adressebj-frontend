'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import type { Report } from '@/types/api';

export default function AdminReportsPage() {
  const toast = useToast();
  const [reports, setReports] = useState<Report[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .adminReports()
      .then((list) => {
        if (!cancelled) setReports(list);
      })
      .catch(() => {
        if (!cancelled) {
          toast.show({ message: 'Impossible de charger les signalements.', variant: 'error' });
          setReports([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const pending = (reports ?? []).filter((r) => !r.resolved);

  return (
    <section className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 py-6 flex flex-col gap-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-[32px] leading-[38px] tracking-[-0.01em] text-text-primary">
            Signalements
          </h1>
          <p className="text-sm text-text-muted">
            Triés par date, les plus récents en premier.
          </p>
        </div>
        {reports ? (
          <Badge variant={pending.length > 0 ? 'danger' : 'success'}>
            {pending.length} en attente
          </Badge>
        ) : null}
      </header>

      {reports === null ? (
        <div className="space-y-3">
          <Skeleton width="100%" height={70} count={3} />
        </div>
      ) : pending.length === 0 ? (
        <div className="bg-surface border border-border shadow-sm rounded-lg p-6">
          <p className="text-text-primary">
            Aucun signalement en attente. Tout va bien&nbsp;!
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {pending.map((report) => (
            <li
              key={report.id}
              className="bg-surface border border-border shadow-sm rounded-lg p-4 flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold tracking-[0.1em] text-text-primary">
                  {report.addressId}
                </p>
                <p className="text-sm text-text-muted line-clamp-2">
                  {report.message ?? 'Aucun message.'}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {new Date(report.createdAt).toLocaleString('fr-FR')}
                </p>
              </div>
              <Link href={`/admin/reports/${report.id}`}>
                <Button
                  variant="primary"
                  size="sm"
                  trailingIcon={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
                >
                  Traiter
                </Button>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
