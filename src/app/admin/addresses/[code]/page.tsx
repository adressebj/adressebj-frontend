'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Flag,
  MapPin,
  Phone,
  Power,
  RotateCw,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { StepsList } from '@/components/address/StepsList';
import { ReliabilityBadge } from '@/components/address/ReliabilityBadge';
import { useToast } from '@/components/ui/Toast';
import { ApiError, api } from '@/lib/api';
import type { AdminAddressDetail } from '@/types/api';

const MiniMap = dynamic(
  () => import('@/components/map/MapNavigator').then((m) => m.MapNavigator),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[240px] bg-surface-muted animate-pulse rounded-md" />
    ),
  },
);

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ok'; detail: AdminAddressDetail }
  | { kind: 'not_found' }
  | { kind: 'error' };

interface RouteParams {
  params: Promise<{ code: string }>;
}

export default function AdminAddressDetailPage({ params }: RouteParams) {
  const { code: raw } = use(params);
  const code = raw.toUpperCase();
  const router = useRouter();
  const toast = useToast();

  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [acting, setActing] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const load = useCallback(() => {
    setState({ kind: 'loading' });
    api
      .adminAddressDetail(code)
      .then((detail) => setState({ kind: 'ok', detail }))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setState({ kind: 'not_found' });
        } else {
          setState({ kind: 'error' });
        }
      });
  }, [code]);

  useEffect(load, [load]);

  const handleDeactivate = useCallback(async () => {
    if (state.kind !== 'ok') return;
    setActing(true);
    try {
      await api.adminDeactivateAddress(code);
      setState({
        kind: 'ok',
        detail: { ...state.detail, isActive: false },
      });
      toast.show({
        message: `Adresse ${code} désactivée. L'habitant a été notifié.`,
        variant: 'success',
      });
      setConfirmDeactivate(false);
    } catch {
      toast.show({ message: 'Action impossible.', variant: 'error' });
    } finally {
      setActing(false);
    }
  }, [code, state, toast]);

  const handleReactivate = useCallback(async () => {
    if (state.kind !== 'ok') return;
    setActing(true);
    try {
      await api.adminReactivateAddress(code);
      setState({
        kind: 'ok',
        detail: { ...state.detail, isActive: true },
      });
      toast.show({ message: 'Adresse réactivée.', variant: 'success' });
    } catch {
      toast.show({ message: 'Action impossible.', variant: 'error' });
    } finally {
      setActing(false);
    }
  }, [code, state, toast]);

  if (state.kind === 'loading') {
    return (
      <section className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 py-6 flex flex-col gap-6">
        <Skeleton width={240} height={28} />
        <Skeleton width="100%" height={320} />
        <Skeleton width="100%" height={120} />
      </section>
    );
  }

  if (state.kind === 'not_found') {
    return (
      <section className="mx-auto w-full max-w-md px-4 py-12 text-center flex flex-col gap-3">
        <h1 className="font-display font-bold text-h2">Adresse introuvable</h1>
        <Link href="/admin/addresses" className="self-center">
          <Button variant="primary" size="md">
            Retour à la liste
          </Button>
        </Link>
      </section>
    );
  }

  if (state.kind === 'error') {
    return (
      <section className="mx-auto w-full max-w-md px-4 py-12 text-center flex flex-col gap-3">
        <h1 className="font-display font-bold text-h2">Erreur de chargement</h1>
        <Button
          variant="primary"
          size="md"
          onClick={load}
          className="self-center"
          leadingIcon={<RotateCw className="h-4 w-4" aria-hidden="true" />}
        >
          Réessayer
        </Button>
      </section>
    );
  }

  const { detail } = state;
  const { address } = detail;
  const pendingReports = detail.reports.filter((r) => !r.resolved);
  const resolvedReports = detail.reports.filter((r) => r.resolved);

  return (
    <section className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8 flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <nav
            aria-label="Fil d'Ariane"
            className="flex items-center gap-2 text-xs text-text-muted mb-2"
          >
            <Link href="/admin/addresses" className="hover:text-primary">
              Adresses
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-semibold text-primary">{address.code}</span>
          </nav>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display font-bold text-[32px] leading-[38px] tracking-[-0.01em] text-text-primary">
              {address.code}
            </h1>
            {detail.isActive ? (
              <Badge variant="success" size="md">
                Active
              </Badge>
            ) : (
              <Badge variant="neutral" size="md">
                Désactivée
              </Badge>
            )}
            {pendingReports.length > 0 ? (
              <Badge variant="danger" size="md">
                {pendingReports.length} signalement
                {pendingReports.length > 1 ? 's' : ''} en attente
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-text-muted mt-1">{address.quartier.name}</p>
        </div>
        <Link
          href="/admin/addresses"
          className="text-sm text-text-muted hover:text-text-primary inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Liste
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <article className="card rounded-xl overflow-hidden">
            <div className="relative w-full aspect-video bg-surface-muted">
              <Image
                src={address.photoUrl}
                alt={`Portail ${address.code}`}
                fill
                sizes="(max-width: 1024px) 100vw, 800px"
                className="object-cover"
                unoptimized
              />
            </div>
          </article>

          <article className="card rounded-xl p-5 flex flex-col gap-3">
            <h2 className="font-display font-semibold text-h3 text-text-primary">
              Instructions d&apos;accès
            </h2>
            <StepsList steps={address.instructions.steps} />
          </article>

          <article className="card rounded-xl p-5 flex flex-col gap-3">
            <h2 className="font-display font-semibold text-h3 text-text-primary">
              Localisation
            </h2>
            <div className="rounded-lg overflow-hidden">
              <MiniMap destination={address.gps} interactive={false} />
            </div>
            <p className="text-xs text-text-muted flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {address.gps.lat.toFixed(4)}° N, {address.gps.lng.toFixed(4)}° E
            </p>
          </article>

          <article className="card rounded-xl p-5 flex flex-col gap-4">
            <header className="flex items-center justify-between">
              <h2 className="font-display font-semibold text-h3 text-text-primary">
                Historique des signalements ({detail.reports.length})
              </h2>
            </header>
            {detail.reports.length === 0 ? (
              <p className="text-sm text-text-muted">
                Aucun signalement pour cette adresse.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {[...pendingReports, ...resolvedReports].map((r) => (
                  <li
                    key={r.id}
                    className="flex items-start gap-3 p-3 rounded-md border border-border"
                  >
                    <span
                      aria-hidden="true"
                      className={
                        r.resolved
                          ? 'text-text-muted'
                          : 'text-danger'
                      }
                    >
                      {r.resolved ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Flag className="h-4 w-4" />
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary">
                        {r.message ?? 'Aucun message.'}
                      </p>
                      <p className="text-xs text-text-muted mt-1">
                        {new Date(r.createdAt).toLocaleString('fr-FR')}{' '}
                        {r.resolved ? '· Résolu' : '· En attente'}
                      </p>
                    </div>
                    {!r.resolved ? (
                      <Link
                        href={`/admin/reports/${r.id}`}
                        className="text-xs text-primary hover:underline"
                      >
                        Examiner
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>

        <aside className="flex flex-col gap-4">
          <article className="card rounded-xl p-5 flex flex-col gap-3">
            <h2 className="font-display font-semibold text-h3 text-text-primary">
              Propriétaire
            </h2>
            <p className="text-sm text-text-muted flex items-center gap-2">
              <Phone className="h-4 w-4" aria-hidden="true" />
              {detail.ownerPhoneMasked}
            </p>
            <p className="text-sm text-text-muted">
              Créée le{' '}
              {new Date(address.createdAt).toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </article>

          <article className="card rounded-xl p-5 flex flex-col gap-3">
            <h2 className="font-display font-semibold text-h3 text-text-primary">
              Fiabilité
            </h2>
            <ReliabilityBadge score={address.reliabilityScore} size="md" />
            <p className="text-sm text-text-muted">
              {address.visitCount} visite{address.visitCount > 1 ? 's' : ''}{' '}
              enregistrée{address.visitCount > 1 ? 's' : ''}
            </p>
          </article>

          <article className="card rounded-xl p-5 flex flex-col gap-3">
            <h2 className="font-display font-semibold text-h3 text-text-primary">
              Actions
            </h2>
            {detail.isActive ? (
              <Button
                type="button"
                variant="ghost"
                size="lg"
                fullWidth
                onClick={() => setConfirmDeactivate(true)}
                leadingIcon={<Power className="h-4 w-4" aria-hidden="true" />}
                className="!text-danger hover:!bg-danger-light/40"
              >
                Désactiver l&apos;adresse
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="lg"
                fullWidth
                loading={acting}
                onClick={() => void handleReactivate()}
                leadingIcon={
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                }
              >
                Réactiver l&apos;adresse
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="md"
              fullWidth
              onClick={() => router.push(`/a/${address.code}`)}
            >
              Voir comme visiteur
            </Button>
          </article>
        </aside>
      </div>

      <Modal
        isOpen={confirmDeactivate}
        onClose={() => {
          if (!acting) setConfirmDeactivate(false);
        }}
        title="Désactiver cette adresse"
        footer={
          <>
            <Button
              variant="ghost"
              size="md"
              onClick={() => setConfirmDeactivate(false)}
              disabled={acting}
            >
              Annuler
            </Button>
            <Button
              variant="danger"
              size="md"
              loading={acting}
              onClick={() => void handleDeactivate()}
              leadingIcon={
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              }
            >
              Désactiver
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-primary leading-relaxed">
          L&apos;adresse <strong>{address.code}</strong> ne sera plus
          consultable publiquement. Le propriétaire sera notifié par SMS et
          notification push. L&apos;action est réversible.
        </p>
      </Modal>
    </section>
  );
}
