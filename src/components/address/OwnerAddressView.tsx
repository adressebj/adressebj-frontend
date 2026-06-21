'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  Globe,
  MapPin,
  Pencil,
  Printer,
  RotateCw,
  Share2,
  Trash2,
} from 'lucide-react';
import { CategoryMedallion } from '@/components/address/CategoryMedallion';
import { FieldNotesList } from '@/components/address/FieldNotesList';
import { RatingSummary } from '@/components/address/RatingSummary';
import { RevisionHistory } from '@/components/address/RevisionHistory';
import { StepsList } from '@/components/address/StepsList';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { ApiError, api } from '@/lib/api';
import { classNames } from '@/lib/utils';
import type { AddressRevision, FieldNote, PublicAddress } from '@/types/api';

// Carte de visualisation non interactive — le propriétaire veut juste voir le
// pin de marque, pas naviguer. ssr:false : Leaflet touche `window` à l'import.
const MiniMap = dynamic(
  () => import('@/components/map/MapNavigator').then((m) => m.MapNavigator),
  {
    ssr: false,
    loading: () => <div className="w-full h-full bg-surface-muted animate-pulse" />,
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

  useEffect(() => {
    load();
  }, [load]);

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard?.writeText?.(code);
      toast.show({ message: 'Code copié !', variant: 'success' });
    } catch {
      toast.show({ message: 'Impossible de copier le code.', variant: 'error' });
    }
  }, [code, toast]);

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
        message: 'Impossible de mettre à jour le réglage. Réessayez.',
        variant: 'error',
      });
    } finally {
      setTogglingDiscovery(false);
    }
  }, [code, discoverable, togglingDiscovery, toast]);

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

  // ── États ────────────────────────────────────────────────────────────────

  if (state.kind === 'loading') {
    return (
      <main className="relative min-h-screen bg-bg lg:h-screen lg:overflow-hidden">
        <div className="fixed inset-x-0 top-0 h-[50vh] z-0 lg:absolute lg:inset-y-0 lg:left-[26rem] lg:right-0 lg:h-auto">
          <div className="w-full h-full skeleton-shimmer" />
        </div>
        <div className="relative z-10 mt-[42vh] lg:mt-0 lg:fixed lg:inset-y-0 lg:left-0 lg:w-[26rem]">
          <div className="bg-surface rounded-t-[var(--radius-2xl)] lg:rounded-none border-t lg:border-t-0 lg:border-r border-border min-h-[58vh] lg:min-h-screen p-5 sm:p-7 flex flex-col gap-6">
            <Skeleton width={180} height={40} />
            <Skeleton width="100%" height={56} className="!rounded-[var(--radius-lg)]" />
            <Skeleton width={140} height={24} />
            <Skeleton width="100%" height={18} count={4} />
          </div>
        </div>
      </main>
    );
  }

  if (state.kind === 'not_found') {
    return (
      <OwnerStateCard
        title="Cette adresse n'est plus accessible."
        body="Elle a pu être désactivée ou supprimée. Revenez à vos adresses pour en consulter d'autres."
        icon={<AlertTriangle className="h-7 w-7 text-text-muted" aria-hidden="true" />}
        actionHref="/dashboard"
        actionLabel="Retour à mes adresses"
      />
    );
  }

  if (state.kind === 'error') {
    return (
      <OwnerStateCard
        title="Impossible de charger cette adresse."
        body="Une erreur réseau s'est produite. Vérifiez votre connexion."
        icon={<RotateCw className="h-7 w-7 text-danger" aria-hidden="true" />}
        onAction={load}
        actionLabel="Réessayer"
        actionIcon={<RotateCw className="h-4 w-4" aria-hidden="true" />}
      />
    );
  }

  const { address } = state;
  const createdAtFmt = new Date(address.createdAt).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const canConfirm = confirmCode.trim().toUpperCase() === code && !deactivating;

  const quickActions = [
    {
      icon: Eye,
      label: 'Aperçu visiteur',
      href: `/a/${code}`,
    },
    {
      icon: Copy,
      label: 'Copier le code',
      onClick: () => void handleCopyCode(),
    },
  ];

  return (
    <main className="relative min-h-screen bg-bg lg:h-screen lg:overflow-hidden">
      {/* ── CARTE-CANVAS — pin de marque, non interactive (visualisation). ── */}
      <div className="fixed inset-x-0 top-0 h-[50vh] z-0 lg:absolute lg:inset-y-0 lg:left-[26rem] lg:right-0 lg:h-auto">
        <MiniMap destination={address.gps} interactive={false} className="w-full h-full" />

        {/* Chrome flottant minimal — retour à mes adresses (langage `/a/:code`). */}
        <div
          className="absolute inset-x-0 top-0 z-[400] flex items-center justify-between gap-2 p-3 pointer-events-none"
          style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
        >
          <Link
            href="/dashboard"
            aria-label="Retour à mes adresses"
            className="pointer-events-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-text-primary shadow-md border border-border tap-press hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* ── PANNEAU PAPIER SOLIDE — arbre de contenu unique. ── */}
      <div className="relative z-10 mt-[42vh] lg:mt-0 lg:fixed lg:inset-y-0 lg:left-0 lg:w-[26rem] lg:overflow-y-auto">
        <div className="bg-surface rounded-t-[var(--radius-2xl)] lg:rounded-none border-t lg:border-t-0 lg:border-r border-border shadow-[0_-12px_40px_-12px_rgba(26,20,12,0.18)] lg:shadow-lg min-h-[58vh] lg:min-h-full">
          {/* Poignée décorative (affordance « feuille ») — mobile seulement. */}
          <div className="flex justify-center pt-3 pb-1 lg:hidden" aria-hidden="true">
            <div className="h-1.5 w-10 rounded-full bg-border-strong" />
          </div>

          <div className="px-5 sm:px-7 pt-5 pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-12 flex flex-col gap-8">
            {/* ── PLAQUE IDENTITÉ ── */}
            <header className="animate-fade-up flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <CategoryMedallion category={address.category} />
                <div className="flex items-center gap-1.5 shrink-0">
                  {quickActions.map(({ icon: Icon, label, href, onClick }) =>
                    href ? (
                      <Link
                        key={label}
                        href={href}
                        aria-label={label}
                        title={label}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-surface-muted border border-border text-text-primary hover:bg-primary hover:text-text-inverse hover:border-primary tap-press transition-colors"
                      >
                        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                      </Link>
                    ) : (
                      <button
                        key={label}
                        type="button"
                        onClick={onClick}
                        aria-label={label}
                        title={label}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-surface-muted border border-border text-text-primary hover:bg-primary hover:text-text-inverse hover:border-primary tap-press transition-colors cursor-pointer"
                      >
                        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div>
                <h1 className="code-type text-4xl sm:text-5xl font-black text-text-primary leading-none">
                  {address.code}
                </h1>
                <p className="mt-2.5 flex items-center gap-1.5 text-sm font-medium text-text-muted">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span className="truncate">{address.quartier.name}</span>
                </p>
              </div>

              {/* Statut de visibilité + date de création (méta propriétaire). */}
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs">
                {discoverable === false ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted text-text-muted px-2.5 py-1 font-semibold border border-border">
                    <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                    Masquée de la carte
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success-light/50 text-success px-2.5 py-1 font-semibold">
                    <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                    Visible sur la carte
                  </span>
                )}
                <span className="text-text-muted">· Créée le {createdAtFmt}</span>
              </div>

              {/* Bloc note + visites — la performance de l'adresse. */}
              <RatingSummary
                averageRating={address.averageRating}
                ratingCount={address.ratingCount}
                visitCount={address.visitCount}
                className="animate-fade-up stagger-1"
              />
            </header>

            {/* ── ACTIONS CLÉS (Partager / Modifier) ── */}
            <div className="animate-fade-up stagger-1 flex flex-col gap-3">
              <Link href={`/dashboard/address/${code}/share`} className="block">
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  leadingIcon={<Share2 className="h-5 w-5" aria-hidden="true" />}
                  className="rounded-[var(--radius-lg)] font-bold shadow-sm"
                >
                  Partager / QR Code
                </Button>
              </Link>
              <Link href={`/dashboard/address/${code}/edit`} className="block">
                <Button
                  variant="secondary"
                  size="lg"
                  fullWidth
                  leadingIcon={<Edit3 className="h-5 w-5" aria-hidden="true" />}
                  className="rounded-[var(--radius-lg)] font-bold border-border-strong bg-surface-muted hover:bg-border"
                >
                  Modifier l&apos;adresse
                </Button>
              </Link>
            </div>

            {/* ── PHOTO DU PORTAIL ── */}
            <figure className="animate-fade-up stagger-2 relative w-full aspect-[4/3] sm:aspect-[16/10] overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface-muted">
              <Image
                src={address.photoUrl}
                alt={`Portail de l'adresse ${address.code}`}
                fill
                sizes="(min-width: 1024px) 26rem, 100vw"
                className="object-cover"
                unoptimized
              />
            </figure>

            {/* ── INSTRUCTIONS D'ACCÈS (+ modifier) ── */}
            <section aria-labelledby="owner-instructions" className="animate-fade-up stagger-3">
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <h2
                  id="owner-instructions"
                  className="font-display font-bold text-2xl text-text-primary"
                >
                  Les derniers mètres
                </h2>
                <Link
                  href={`/dashboard/address/${code}/edit`}
                  aria-label="Modifier les instructions"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary hover:bg-primary-surface transition-colors"
                >
                  <Pencil className="h-[18px] w-[18px]" aria-hidden="true" />
                </Link>
              </div>
              <p className="mb-6 max-w-prose text-sm text-text-muted">
                Les repères que suivront vos visiteurs pour les derniers mètres.
              </p>
              <StepsList steps={address.instructions.steps} />
            </section>

            {/* ── HISTORIQUE DES MODIFICATIONS (versioning CDC v5 §4) ── */}
            {revisions.length > 0 ? (
              <section aria-labelledby="owner-history" className="animate-fade-up">
                <h2
                  id="owner-history"
                  className="font-display font-bold text-2xl text-text-primary mb-5"
                >
                  Historique des modifications
                </h2>
                <RevisionHistory revisions={revisions} />
              </section>
            ) : null}

            {/* ── OBSERVATIONS TERRAIN — remontées des visiteurs. ── */}
            {notes.length > 0 ? (
              <section aria-labelledby="owner-field-notes" className="animate-fade-up">
                <h2
                  id="owner-field-notes"
                  className="font-display font-bold text-2xl text-text-primary mb-2"
                >
                  Retours des visiteurs
                </h2>
                <p className="text-sm text-text-muted mb-5">
                  Ce que les visiteurs ont signalé après être venus chez vous.
                </p>
                <FieldNotesList notes={notes} />
              </section>
            ) : null}

            {/* ── POSITION GPS ── */}
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="code-type">
                {address.gps.lat.toFixed(5)}°, {address.gps.lng.toFixed(5)}°
              </span>
            </div>

            {/* ── RÉGLAGES & GESTION ── */}
            <section
              aria-label="Réglages de l'adresse"
              className="animate-fade-up rounded-[var(--radius-lg)] border border-border bg-surface-muted/60 p-2"
            >
              <button
                type="button"
                onClick={() =>
                  window.open(
                    `/dashboard/address/${code}/print`,
                    '_blank',
                    'noopener,noreferrer',
                  )
                }
                className="w-full flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-3 text-left text-sm font-medium text-text-primary hover:bg-surface transition-colors cursor-pointer"
              >
                <Printer className="h-5 w-5 shrink-0 text-text-muted" aria-hidden="true" />
                Imprimer le QR Code
              </button>

              {discoverable != null ? (
                <button
                  type="button"
                  onClick={() => void handleToggleDiscovery()}
                  disabled={togglingDiscovery}
                  className="w-full flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-3 text-left text-sm font-medium text-text-primary hover:bg-surface transition-colors cursor-pointer disabled:opacity-60"
                >
                  {discoverable ? (
                    <EyeOff className="h-5 w-5 shrink-0 text-text-muted" aria-hidden="true" />
                  ) : (
                    <Globe className="h-5 w-5 shrink-0 text-text-muted" aria-hidden="true" />
                  )}
                  <span className="flex flex-col">
                    <span>
                      {discoverable
                        ? 'Retirer de la carte publique'
                        : 'Réafficher sur la carte publique'}
                    </span>
                    <span className="text-xs font-normal text-text-muted">
                      {discoverable
                        ? 'Restera joignable par son code et son lien.'
                        : 'Repérable par tous depuis la carte.'}
                    </span>
                  </span>
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => setDeactivateOpen(true)}
                className="w-full flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-3 text-left text-sm font-semibold text-danger hover:bg-danger-light/40 transition-colors cursor-pointer"
              >
                <Trash2 className="h-5 w-5 shrink-0" aria-hidden="true" />
                Désactiver l&apos;adresse
              </button>
            </section>

            <footer className="pt-6 border-t border-dashed border-border flex justify-center lg:justify-start">
              <Link
                href="/dashboard"
                className="text-sm font-semibold text-text-muted hover:text-text-primary inline-flex items-center gap-2 cursor-pointer tap-press px-4 py-2 rounded-full hover:bg-surface-muted"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Retour à mes adresses
              </Link>
            </footer>
          </div>
        </div>
      </div>

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
            <span className="code-type font-bold">{code}</span> sera
            définitivement retiré. Les liens et QR codes partagés ne
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
    </main>
  );
}

interface OwnerStateCardProps {
  title: string;
  body: string;
  icon?: React.ReactNode;
  actionLabel: string;
  actionIcon?: React.ReactNode;
  actionHref?: string;
  onAction?: () => void;
}

function OwnerStateCard({
  title,
  body,
  icon,
  actionHref,
  actionLabel,
  actionIcon,
  onAction,
}: OwnerStateCardProps) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-bg motif-paper">
      <section
        role="alert"
        className={classNames(
          'w-full max-w-md bg-surface text-text-primary',
          'rounded-[var(--radius-xl)] border border-border shadow-lg p-7 sm:p-9',
          'flex flex-col gap-4 items-start',
        )}
      >
        {icon ? (
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-muted border border-border">
            {icon}
          </div>
        ) : null}
        <h1 className="font-display font-bold text-h2">{title}</h1>
        <p className="text-body text-text-muted">{body}</p>
        {actionHref ? (
          <Link href={actionHref} className="self-start mt-1">
            <Button variant="primary" size="md">
              {actionLabel}
            </Button>
          </Link>
        ) : null}
        {onAction ? (
          <Button
            variant="primary"
            size="md"
            onClick={onAction}
            className="self-start mt-1"
            leadingIcon={actionIcon}
          >
            {actionLabel}
          </Button>
        ) : null}
      </section>
    </main>
  );
}

export default OwnerAddressView;
