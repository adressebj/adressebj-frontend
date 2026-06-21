'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, ChevronRight, MapPin, User, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { StepsList } from '@/components/address/StepsList';
import { useToast } from '@/components/ui/Toast';
import { ApiError, api } from '@/lib/api';
import type { ModerationQueueItem } from '@/types/api';

const MiniMap = dynamic(
  () => import('@/components/map/MapNavigator').then((m) => m.MapNavigator),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[240px] bg-surface-muted animate-pulse rounded-md" />
    ),
  },
);

const REJECT_REASONS = [
  'Photo illisible ou non représentative',
  "Position GPS clairement erronée",
  'Instructions incomplètes ou ambiguës',
  'Doublon avec une adresse existante',
  'Autre',
] as const;

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ok'; item: ModerationQueueItem }
  | { kind: 'not_found' }
  | { kind: 'error' };

interface RouteParams {
  params: Promise<{ code: string }>;
}

export default function AdminQueueItemPage({ params }: RouteParams) {
  const { code: raw } = use(params);
  const code = raw.toUpperCase();
  const router = useRouter();
  const toast = useToast();

  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [approving, setApproving] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState<string>(REJECT_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .adminModerationQueueItem(code)
      .then((item) => {
        if (!cancelled) setState({ kind: 'ok', item });
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setState({ kind: 'not_found' });
        } else {
          setState({ kind: 'error' });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const handleApprove = useCallback(async () => {
    setApproving(true);
    try {
      await api.adminDecideQueueItem(code, { status: 'approved' });
      toast.show({ message: `Adresse ${code} validée.`, variant: 'success' });
      router.push('/admin/moderation/queue');
    } catch {
      toast.show({ message: 'Validation impossible.', variant: 'error' });
    } finally {
      setApproving(false);
    }
  }, [code, router, toast]);

  const handleReject = useCallback(async () => {
    const reason =
      rejectReason === 'Autre' ? customReason.trim() : rejectReason;
    if (!reason) {
      toast.show({
        message: 'Précisez le motif du rejet.',
        variant: 'error',
      });
      return;
    }
    setRejecting(true);
    try {
      await api.adminDecideQueueItem(code, { status: 'rejected', reason });
      toast.show({ message: `Adresse ${code} rejetée.`, variant: 'success' });
      router.push('/admin/moderation/queue');
    } catch {
      toast.show({ message: 'Rejet impossible.', variant: 'error' });
    } finally {
      setRejecting(false);
    }
  }, [code, customReason, rejectReason, router, toast]);

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
        <h1 className="font-display font-bold text-h2">Soumission introuvable</h1>
        <p className="text-text-muted">
          Cette adresse n&apos;est plus dans la file (déjà traitée ou retirée).
        </p>
        <Link href="/admin/moderation/queue" className="self-center">
          <Button variant="primary" size="md">
            Retour à la file
          </Button>
        </Link>
      </section>
    );
  }

  if (state.kind === 'error') {
    return (
      <section className="mx-auto w-full max-w-md px-4 py-12 text-center flex flex-col gap-3">
        <h1 className="font-display font-bold text-h2">
          Erreur de chargement
        </h1>
        <Button
          variant="primary"
          size="md"
          onClick={() => router.refresh()}
          className="self-center"
        >
          Réessayer
        </Button>
      </section>
    );
  }

  const { item } = state;
  const submittedFmt = new Date(item.submittedAt).toLocaleString('fr-FR');

  return (
    <section className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8 flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <nav
            aria-label="Fil d'Ariane"
            className="flex items-center gap-2 text-xs text-text-muted mb-2"
          >
            <Link href="/admin/moderation" className="hover:text-primary">
              Modération
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <Link
              href="/admin/moderation/queue"
              className="hover:text-primary"
            >
              File de traitement
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-semibold text-primary">{item.code}</span>
          </nav>
          <h1 className="font-display font-bold text-[32px] leading-[38px] tracking-[-0.01em] text-text-primary">
            {item.code}
          </h1>
          <p className="text-sm text-text-muted">{item.quartierName}</p>
        </div>
        <Link
          href="/admin/moderation/queue"
          className="text-sm text-text-muted hover:text-text-primary inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> File
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <article className="card rounded-xl overflow-hidden">
            <div className="relative w-full aspect-video bg-surface-muted">
              <Image
                src={item.photoUrl}
                alt={`Photo de l'adresse ${item.code}`}
                fill
                sizes="(max-width: 1024px) 100vw, 800px"
                className="object-cover"
                unoptimized
              />
            </div>
          </article>

          <article className="card rounded-xl p-5 flex flex-col gap-3">
            <h2 className="font-display font-semibold text-h3 text-text-primary">
              Instructions soumises
            </h2>
            <StepsList steps={item.steps} />
            <p className="text-sm text-text-muted italic border-t border-border pt-3 mt-1">
              “{item.assembledText}”
            </p>
          </article>

          <article className="card rounded-xl p-5 flex flex-col gap-3">
            <h2 className="font-display font-semibold text-h3 text-text-primary">
              Localisation
            </h2>
            <div className="rounded-lg overflow-hidden">
              <MiniMap destination={item.gps} interactive={false} />
            </div>
            <p className="text-xs text-text-muted flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {item.gps.lat.toFixed(4)}° N, {item.gps.lng.toFixed(4)}° E ·
              Précision ~{item.gpsAccuracyMeters} m
            </p>
          </article>
        </div>

        <aside className="flex flex-col gap-4">
          <article className="card rounded-xl p-5 flex flex-col gap-3">
            <h2 className="font-display font-semibold text-h3 text-text-primary">
              Soumission
            </h2>
            <p className="text-sm text-text-muted flex items-center gap-2">
              <User className="h-4 w-4" aria-hidden="true" />
              {item.ownerPhoneMasked}
            </p>
            <p className="text-sm text-text-muted">
              Soumise le {submittedFmt}
            </p>
          </article>

          <article className="card rounded-xl p-5 flex flex-col gap-3">
            <h2 className="font-display font-semibold text-h3 text-text-primary">
              Décision
            </h2>
            <Button
              type="button"
              variant="primary"
              size="lg"
              fullWidth
              loading={approving}
              onClick={() => void handleApprove()}
              leadingIcon={<Check className="h-5 w-5" aria-hidden="true" />}
            >
              Valider l&apos;adresse
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              fullWidth
              onClick={() => setRejectOpen(true)}
              leadingIcon={<X className="h-5 w-5" aria-hidden="true" />}
              className="!text-danger hover:!bg-danger-light/40"
            >
              Rejeter
            </Button>
            <p className="text-xs text-text-muted">
              Votre décision est notifiée au soumissionnaire par notification
              push.
            </p>
          </article>
        </aside>
      </div>

      <Modal
        isOpen={rejectOpen}
        onClose={() => {
          if (!rejecting) setRejectOpen(false);
        }}
        title="Motif du rejet"
        footer={
          <>
            <Button
              variant="ghost"
              size="md"
              onClick={() => setRejectOpen(false)}
              disabled={rejecting}
            >
              Annuler
            </Button>
            <Button
              variant="danger"
              size="md"
              loading={rejecting}
              onClick={() => void handleReject()}
            >
              Confirmer le rejet
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-text-muted">
            Le motif est communiqué au soumissionnaire. Soyez clair pour l&apos;aider
            à corriger.
          </p>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-text-primary">Motif</span>
            <select
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="h-11 rounded-md border border-border bg-surface px-3 text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {REJECT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          {rejectReason === 'Autre' ? (
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-text-primary">
                Précisez le motif
              </span>
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={3}
                maxLength={500}
                className="rounded-md border border-border bg-surface px-3 py-2 text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
          ) : null}
        </div>
      </Modal>
    </section>
  );
}
