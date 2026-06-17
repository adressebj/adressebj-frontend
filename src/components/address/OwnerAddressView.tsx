'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Compass,
  Edit3,
  Eye,
  EyeOff,
  Globe,
  Printer,
  RotateCw,
  Share2,
  Trash2,
} from 'lucide-react';
import { CategoryBadge } from '@/components/address/CategoryBadge';
import { FieldNotesList } from '@/components/address/FieldNotesList';
import { ReliabilityBadge } from '@/components/address/ReliabilityBadge';
import { RevisionHistory } from '@/components/address/RevisionHistory';
import { StepsList } from '@/components/address/StepsList';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { ApiError, api } from '@/lib/api';
import type { AddressRevision, FieldNote, PublicAddress } from '@/types/api';

// Non-interactive visualisation map — owner just needs to see the pin, not
// navigate. ssr:false because Leaflet touches `window` at import time.
const MiniMap = dynamic(
  () => import('@/components/map/MapNavigator').then((m) => m.MapNavigator),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[220px] bg-surface-muted animate-pulse rounded-md" />
    ),
  },
);

export interface OwnerAddressViewProps {
  code: string;
}

type ViewState =
  | { kind: 'loading' }
  | { kind: 'ok'; address: PublicAddress }
  | { kind: 'not_found' }
  | { kind: 'error' };

export function OwnerAddressView({ code: rawCode }: OwnerAddressViewProps) {
  const code = rawCode.toUpperCase();
  const router = useRouter();
  const toast = useToast();

  const [state, setState] = useState<ViewState>({ kind: 'loading' });
  const [revisions, setRevisions] = useState<AddressRevision[]>([]);
  const [notes, setNotes] = useState<FieldNote[]>([]);
  const [discoverable, setDiscoverable] = useState<boolean | null>(null);
  const [togglingDiscovery, setTogglingDiscovery] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [confirmCode, setConfirmCode] = useState('');
  const [deactivating, setDeactivating] = useState(false);

  const load = useCallback(() => {
    setState({ kind: 'loading' });
    setRevisions([]);
    setNotes([]);
    api
      .ownerAddress(code)
      .then((address) => {
        setState({ kind: 'ok', address });
        setDiscoverable(address.mapDiscoverable);
      })
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 404 || err.status === 410)) {
          setState({ kind: 'not_found' });
        } else {
          setState({ kind: 'error' });
        }
      });
    api
      .addressRevisions(code)
      .then(({ items }) => setRevisions(items))
      .catch(() => setRevisions([]));
    api
      .listFieldNotes(code)
      .then(({ items }) => setNotes(items))
      .catch(() => setNotes([]));
  }, [code]);

  const handleToggleDiscovery = useCallback(async () => {
    if (discoverable == null || togglingDiscovery) return;
    const next = !discoverable;
    setTogglingDiscovery(true);
    try {
      await api.updateAddress(code, { mapDiscoverable: next });
      setDiscoverable(next);
      toast.show({
        message: next
          ? 'Adresse à nouveau visible sur la carte publique.'
          : 'Adresse retirée de la carte publique.',
        variant: 'success',
      });
    } catch {
      toast.show({
        message: "Impossible de mettre à jour le réglage. Réessayez.",
        variant: 'error',
      });
    } finally {
      setTogglingDiscovery(false);
    }
  }, [code, discoverable, togglingDiscovery, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDeactivate = useCallback(async () => {
    if (confirmCode.trim().toUpperCase() !== code) return;
    setDeactivating(true);
    try {
      await api.deactivateAddress(code);
      toast.show({ message: 'Adresse désactivée.', variant: 'success' });
      router.push('/dashboard');
    } catch {
      toast.show({
        message: "Impossible de désactiver pour l'instant. Réessayez.",
        variant: 'error',
      });
    } finally {
      setDeactivating(false);
    }
  }, [code, confirmCode, router, toast]);

  if (state.kind === 'loading') {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-6 flex flex-col gap-5">
        <Skeleton width="100%" height={240} />
        <Skeleton width={200} height={24} />
        <Skeleton width="100%" height={16} count={3} />
      </section>
    );
  }

  if (state.kind === 'not_found') {
    return (
      <section
        role="alert"
        className="mx-auto w-full max-w-md px-4 sm:px-6 py-12 flex flex-col gap-4"
      >
        <h1 className="font-display font-bold text-h2">
          Cette adresse n'est plus accessible.
        </h1>
        <p className="text-text-muted">
          Elle a pu être désactivée ou supprimée. Revenez à la liste pour en
          consulter d'autres.
        </p>
        <Link href="/dashboard" className="self-start">
          <Button variant="primary" size="md">
            Retour au tableau de bord
          </Button>
        </Link>
      </section>
    );
  }

  if (state.kind === 'error') {
    return (
      <section
        role="alert"
        className="mx-auto w-full max-w-md px-4 sm:px-6 py-12 flex flex-col gap-4"
      >
        <h1 className="font-display font-bold text-h2">
          Impossible de charger cette adresse.
        </h1>
        <Button
          variant="primary"
          size="md"
          onClick={load}
          leadingIcon={<RotateCw className="h-4 w-4" aria-hidden="true" />}
          className="self-start"
        >
          Réessayer
        </Button>
      </section>
    );
  }

  const { address } = state;
  const createdAtFmt = new Date(address.createdAt).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const canConfirm = confirmCode.trim().toUpperCase() === code && !deactivating;

  return (
    <section className="mx-auto w-full max-w-3xl flex flex-col gap-3 pb-12">
      {/* Top app bar */}
      <header className="sticky top-0 z-30 bg-surface flex items-center justify-between px-4 h-16 w-full shadow-sm">
        <Link
          href="/dashboard"
          aria-label="Mes adresses"
          className="w-10 h-10 flex items-center justify-center rounded-full text-text-muted hover:bg-surface-muted transition-colors"
        >
          <ArrowLeft className="h-6 w-6" aria-hidden="true" />
        </Link>
        <h1 className="font-display font-semibold text-h3 text-text-primary">
          Mon adresse
        </h1>
        <Link
          href={`/a/${code}`}
          aria-label="Voir comme un visiteur"
          className="w-10 h-10 flex items-center justify-center rounded-full text-text-muted hover:bg-surface-muted transition-colors"
        >
          <Eye className="h-5 w-5" aria-hidden="true" />
        </Link>
      </header>

      {/* Hero photo with status pill + soft bottom gradient */}
      <div className="relative w-full aspect-video bg-surface-muted overflow-hidden">
        <Image
          src={address.photoUrl}
          alt={`Portail de l'adresse ${address.code}`}
          fill
          sizes="(max-width: 768px) 100vw, 768px"
          className="object-cover animate-fade-up"
          unoptimized
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/30 to-transparent pointer-events-none"
        />
        <span className="absolute top-4 left-4 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#DCFCE7] text-[#166534] text-xs font-medium shadow-sm backdrop-blur-sm animate-fade-up stagger-1">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          Validée
        </span>
      </div>

      {/* Identity card */}
      <section className="mx-4 card rounded-xl p-4 animate-fade-up stagger-1">
        <h2 className="font-display font-bold text-[28px] leading-tight text-primary">
          {address.code}
        </h2>
        <p className="text-sm text-text-muted">{address.quartier.name}</p>
        <div className="mt-2">
          <CategoryBadge category={address.category} size="sm" />
        </div>
        <div className="flex items-center gap-2 mt-2">
          <ReliabilityBadge
            averageRating={address.averageRating}
            ratingCount={address.ratingCount}
            size="sm"
          />
          <span className="text-text-muted text-xs">•</span>
          <span className="text-xs text-text-muted">
            {address.visitCount} visite{address.visitCount > 1 ? 's' : ''}
          </span>
        </div>
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-text-muted italic">Créée le {createdAtFmt}</p>
        </div>
      </section>

      {/* Access instructions card */}
      <section aria-labelledby="owner-instructions" className="mx-4 card rounded-xl p-4 animate-fade-up stagger-2">
        <div className="flex items-center justify-between mb-3">
          <h3
            id="owner-instructions"
            className="font-display font-semibold text-h3 text-text-primary"
          >
            Instructions d'accès
          </h3>
          <Link
            href={`/dashboard/address/${code}/edit`}
            aria-label="Modifier les instructions"
            className="text-primary p-2 -mr-2 rounded-full hover:bg-surface-muted transition-colors"
          >
            <Edit3 className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
        <StepsList steps={address.instructions.steps} />
      </section>

      {/* Historique des révisions — versioning CDC v5 §4 */}
      {revisions.length > 0 ? (
        <section
          aria-labelledby="owner-history"
          className="mx-4 card rounded-xl p-4 animate-fade-up stagger-3"
        >
          <h3
            id="owner-history"
            className="font-display font-semibold text-h3 text-text-primary mb-3"
          >
            Historique des modifications
          </h3>
          <RevisionHistory revisions={revisions} />
        </section>
      ) : null}

      {/* Notes terrain — CDC Frontend §11 */}
      <section
        aria-labelledby="owner-field-notes"
        className="mx-4 card rounded-xl p-4 animate-fade-up stagger-3"
      >
        <h3
          id="owner-field-notes"
          className="font-display font-semibold text-h3 text-text-primary mb-1"
        >
          Observations terrain
        </h3>
        <p className="text-sm text-text-muted mb-4">
          Remontées libres laissées par les visiteurs après leur arrivée.
          Visibles uniquement par vous.
        </p>
        <FieldNotesList notes={notes} />
      </section>

      {/* Map card */}
      <section aria-labelledby="owner-map" className="mx-4 card rounded-xl p-4 animate-fade-up stagger-3">
        <h2 id="owner-map" className="sr-only">
          Position
        </h2>
        <div className="rounded-lg overflow-hidden mb-3">
          <MiniMap destination={address.gps} interactive={false} />
        </div>
        <div className="flex items-center gap-2 text-text-muted">
          <Compass className="h-4 w-4" aria-hidden="true" />
          <p className="text-xs">
            {address.gps.lat.toFixed(4)}° N, {address.gps.lng.toFixed(4)}° E
          </p>
        </div>
      </section>

      {/* Actions card */}
      <section
        aria-label="Actions sur l'adresse"
        className="mx-4 card rounded-xl p-4 flex flex-col gap-3 animate-fade-up stagger-4"
      >
        <Link href={`/dashboard/address/${code}/share`}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            className="rounded-xl"
            leadingIcon={<Share2 className="h-5 w-5" aria-hidden="true" />}
          >
            Partager / QR Code
          </Button>
        </Link>
        <Link href={`/dashboard/address/${code}/edit`}>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            className="rounded-xl"
            leadingIcon={<Edit3 className="h-5 w-5" aria-hidden="true" />}
          >
            Modifier l'adresse
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="lg"
          fullWidth
          className="rounded-xl"
          onClick={() =>
            window.open(
              `/dashboard/address/${code}/print`,
              '_blank',
              'noopener,noreferrer',
            )
          }
          leadingIcon={<Printer className="h-5 w-5" aria-hidden="true" />}
        >
          Imprimer le QR
        </Button>
        {discoverable != null ? (
          <Button
            variant="ghost"
            size="lg"
            fullWidth
            className="rounded-xl"
            onClick={() => void handleToggleDiscovery()}
            loading={togglingDiscovery}
            leadingIcon={
              discoverable ? (
                <EyeOff className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Globe className="h-5 w-5" aria-hidden="true" />
              )
            }
          >
            {discoverable
              ? 'Retirer de la carte publique'
              : 'Réafficher sur la carte publique'}
          </Button>
        ) : null}
        <div className="pt-2">
          <Button
            variant="ghost"
            size="lg"
            fullWidth
            className="rounded-xl !text-danger hover:!bg-danger-light/40"
            onClick={() => setDeactivateOpen(true)}
            leadingIcon={<Trash2 className="h-5 w-5" aria-hidden="true" />}
          >
            Désactiver l'adresse
          </Button>
          <p className="text-danger text-[11px] text-center mt-1 px-4 leading-tight opacity-80">
            L'adresse ne sera plus consultable publiquement
          </p>
        </div>
      </section>

      <Modal
        isOpen={deactivateOpen}
        onClose={() => {
          if (!deactivating) {
            setDeactivateOpen(false);
            setConfirmCode('');
          }
        }}
        title="Désactiver cette adresse"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setDeactivateOpen(false);
                setConfirmCode('');
              }}
              size="md"
              disabled={deactivating}
            >
              Annuler
            </Button>
            <Button
              variant="danger"
              size="md"
              loading={deactivating}
              disabled={!canConfirm}
              onClick={() => void handleDeactivate()}
            >
              Désactiver définitivement
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-primary leading-relaxed">
            Cette action est <strong>irréversible</strong>. Le code{' '}
            <span className="font-display font-bold tracking-[0.1em]">{code}</span>{' '}
            sera définitivement retiré. Les liens et QR codes partagés ne
            fonctionneront plus.
          </p>
          <Input
            label={`Saisissez ${code} pour confirmer`}
            value={confirmCode}
            onChange={(e) => setConfirmCode(e.target.value)}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </Modal>
    </section>
  );
}

export default OwnerAddressView;
