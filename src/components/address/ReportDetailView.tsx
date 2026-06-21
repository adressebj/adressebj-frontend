'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { AddressCodeDisplay } from '@/components/address/AddressCodeDisplay';
import { StepsList } from '@/components/address/StepsList';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import type { PublicAddress, Report } from '@/types/api';

export interface ReportDetailViewProps {
  id: string;
}

type ActionKey = 'resolve' | 'deactivate' | 'ignore' | null;

export function ReportDetailView({ id }: ReportDetailViewProps) {
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState<{
    report: Report;
    address: PublicAddress | null;
  } | null>(null);
  const [pending, setPending] = useState<ActionKey>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .adminReport(id)
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch(() => {
        if (!cancelled) {
          toast.show({ message: 'Signalement introuvable.', variant: 'error' });
          router.replace('/admin/reports');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, router, toast]);

  const finish = useCallback(
    (message: string) => {
      toast.show({ message, variant: 'success' });
      router.push('/admin/reports');
    },
    [router, toast],
  );

  const handleResolve = useCallback(async () => {
    setPending('resolve');
    try {
      await api.adminUpdateReport(id, { status: 'resolved' });
      finish('Signalement marqué comme résolu.');
    } catch {
      toast.show({ message: 'Action impossible.', variant: 'error' });
    } finally {
      setPending(null);
    }
  }, [finish, id, toast]);

  const handleIgnore = useCallback(async () => {
    setPending('ignore');
    try {
      await api.adminUpdateReport(id, { status: 'ignored' });
      finish('Signalement ignoré.');
    } catch {
      toast.show({ message: 'Action impossible.', variant: 'error' });
    } finally {
      setPending(null);
    }
  }, [finish, id, toast]);

  const handleDeactivate = useCallback(async () => {
    if (!data?.address) return;
    setPending('deactivate');
    try {
      await api.adminDeactivateAddress(data.address.code);
      // The CDC asks for an owner notification — the backend triggers it on
      // its side; the frontend just acknowledges success here.
      finish(`Adresse ${data.address.code} désactivée. L'habitant a été notifié.`);
    } catch {
      toast.show({ message: 'Action impossible.', variant: 'error' });
    } finally {
      setPending(null);
    }
  }, [data, finish, toast]);

  if (!data) {
    return (
      <section className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-6 flex flex-col gap-4">
        <Skeleton width={200} height={28} />
        <Skeleton width="100%" height={200} count={2} />
      </section>
    );
  }

  const { report, address } = data;

  return (
    <section className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-6 flex flex-col gap-6">
      <Link
        href="/admin/reports"
        className="text-sm text-text-muted hover:text-text-primary inline-flex items-center gap-1 self-start"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Tous les signalements
      </Link>

      <header>
        <h1 className="font-display font-bold text-h2 text-text-primary">
          Signalement
        </h1>
        <p className="text-xs uppercase tracking-[0.1em] text-text-muted mt-1">
          Reçu le {new Date(report.createdAt).toLocaleString('fr-FR')}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <article
          aria-labelledby="report-address"
          className="bg-surface rounded-lg border border-border shadow-sm p-5 flex flex-col gap-4"
        >
          <h2
            id="report-address"
            className="font-display font-bold text-h3 text-text-primary"
          >
            Adresse concernée
          </h2>
          {address ? (
            <>
              <div className="relative w-full h-48 bg-surface-muted overflow-hidden rounded-md">
                <Image
                  src={address.photoUrl}
                  alt={`Portail ${address.code}`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 480px"
                  className="object-cover"
                  unoptimized
                />
              </div>
              <AddressCodeDisplay code={address.code} size="sm" showCopyButton={false} />
              <StepsList steps={address.instructions.steps} />
            </>
          ) : (
            <p className="text-sm text-text-muted">
              L’adresse référencée par ce signalement n’existe plus.
            </p>
          )}
        </article>

        <aside
          aria-labelledby="report-actions"
          className="bg-surface rounded-lg border border-border shadow-sm p-5 flex flex-col gap-4"
        >
          <h2
            id="report-actions"
            className="font-display font-bold text-h3 text-text-primary"
          >
            Message du signalement
          </h2>
          <p className="text-sm text-text-primary leading-relaxed whitespace-pre-line">
            {report.message ?? 'Aucun message fourni.'}
          </p>
          <div className="flex flex-col gap-2 pt-2 border-t border-dashed border-border">
            <Button
              variant="primary"
              size="md"
              loading={pending === 'resolve'}
              disabled={pending !== null && pending !== 'resolve'}
              onClick={() => void handleResolve()}
            >
              Marquer résolu
            </Button>
            <Button
              variant="danger"
              size="md"
              loading={pending === 'deactivate'}
              disabled={!address || (pending !== null && pending !== 'deactivate')}
              onClick={() => void handleDeactivate()}
              leadingIcon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
            >
              Désactiver l’adresse
            </Button>
            <Button
              variant="ghost"
              size="md"
              loading={pending === 'ignore'}
              disabled={pending !== null && pending !== 'ignore'}
              onClick={() => void handleIgnore()}
            >
              Ignorer
            </Button>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default ReportDetailView;
