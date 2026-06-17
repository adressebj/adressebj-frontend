'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  Copy,
  Flag,
  LogIn,
  MapPin,
  Navigation as NavigationIcon,
  QrCode,
  RotateCw,
  Share2,
  WifiOff,
} from 'lucide-react';
import { StarRating } from '@/components/forms/StarRating';
import { CategoryBadge } from '@/components/address/CategoryBadge';
import { QRCodeDisplay } from '@/components/address/QRCodeDisplay';
import { ReliabilityBadge } from '@/components/address/ReliabilityBadge';
import { StepsList } from '@/components/address/StepsList';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { ApiError, api } from '@/lib/api';
import { classNames } from '@/lib/utils';
import type { PublicAddress } from '@/types/api';

const MapNavigator = dynamic(
  () => import('@/components/map/MapNavigator').then((m) => m.MapNavigator),
  {
    ssr: false,
    loading: () => <div className="w-full h-[320px] bg-surface-muted animate-pulse" />,
  },
);

export interface AddressViewProps {
  code: string;
}

type ViewState =
  | { kind: 'loading' }
  | { kind: 'ok'; address: PublicAddress }
  | { kind: 'not_found' }
  | { kind: 'inactive'; deactivatedAt: string | null }
  | { kind: 'error' };

const DIRECTION_OPTIONS = [
  { value: '', label: 'Indiquez le sens (optionnel)' },
  { value: 'sens-unique-nord-sud', label: 'Sens unique nord → sud' },
  { value: 'sens-unique-sud-nord', label: 'Sens unique sud → nord' },
  { value: 'sens-unique-est-ouest', label: 'Sens unique est → ouest' },
  { value: 'sens-unique-ouest-est', label: 'Sens unique ouest → est' },
  { value: 'double-sens', label: 'Double sens' },
];

const ENTRY_SIDE_OPTIONS = [
  { value: '', label: "Indiquez le côté (optionnel)" },
  { value: 'gauche', label: 'Côté gauche en arrivant' },
  { value: 'droite', label: 'Côté droit en arrivant' },
  { value: 'face', label: 'Face à un repère visible' },
];

export function AddressView({ code }: AddressViewProps) {
  const router = useRouter();
  const toast = useToast();
  const { isAuthenticated } = useAuth();

  const [state, setState] = useState<ViewState>({ kind: 'loading' });
  const [isOffline, setIsOffline] = useState(false);

  // Auth-gate dialog — shown when an anonymous visitor tries an action that
  // the cas d'usage diagram requires authentication for (Signaler, Soumettre
  // une précision terrain). Stores which action triggered it so we can
  // resume the right modal after /auth?next= completes.
  const [authGate, setAuthGate] = useState<{
    action: 'report' | 'contribute';
    label: string;
  } | null>(null);

  const [voting, setVoting] = useState(false);
  // 1-5 star evaluation — l'API upsert garantit qu'une nouvelle note remplace
  // l'ancienne (CDC v5 §8). Le score courant vient du PublicAddress.myRating.
  const [stars, setStars] = useState(0);

  const [qrOpen, setQrOpen] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportMessage, setReportMessage] = useState('');
  const [reporting, setReporting] = useState(false);

  const [arrived, setArrived] = useState(false);
  const [contributionOpen, setContributionOpen] = useState(false);
  const [direction, setDirection] = useState('');
  const [entrySide, setEntrySide] = useState('');
  const [contributing, setContributing] = useState(false);

  const mapRef = useRef<HTMLDivElement | null>(null);
  // Capture departure time at mount so /visits/confirm has a meaningful pair.
  const departAtRef = useRef<string>(new Date().toISOString());

  const loadAddress = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const address = await api.publicAddress(code);
      setState({ kind: 'ok', address });
      if (address.myRating != null) {
        setStars(address.myRating);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404) {
          setState({ kind: 'not_found' });
          return;
        }
        if (err.status === 410) {
          const deactivatedAt =
            (err.extra?.deactivated_at as string | null | undefined) ?? null;
          setState({ kind: 'inactive', deactivatedAt });
          return;
        }
      }
      setState({ kind: 'error' });
    }
  }, [code]);

  useEffect(() => {
    void loadAddress();
  }, [loadAddress]);

  // Initial offline flag + listeners — banner stays in sync without polling.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOffline(!navigator.onLine);
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const handleStartNavigation = useCallback(() => {
    mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Marque le début effectif du trajet côté serveur (CDC Backend §9
    // POST /visits/start) — best-effort, n'interrompt jamais l'utilisateur.
    void api
      .startVisit({ addressCode: code, startedAt: new Date().toISOString() })
      .catch(() => {});
  }, [code]);

  const handleShare = useCallback(async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: `Adresse ${code}`, url });
        return;
      } catch {
        // User cancelled or share unavailable — fall through to clipboard.
      }
    }
    try {
      await navigator.clipboard?.writeText?.(url);
      toast.show({ message: 'Lien copié !', variant: 'success' });
    } catch {
      toast.show({
        message: 'Impossible de copier le lien. Essayez à la main.',
        variant: 'error',
      });
    }
  }, [code, toast]);

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard?.writeText?.(code);
      toast.show({ message: 'Code copié !', variant: 'success' });
    } catch {
      toast.show({
        message: 'Impossible de copier le code.',
        variant: 'error',
      });
    }
  }, [code, toast]);

  const handleRate = useCallback(
    async (score: 1 | 2 | 3 | 4 | 5) => {
      if (voting) return;
      setVoting(true);
      try {
        const res = await api.upsertRating(code, score);
        setStars(score);
        // Mise à jour optimiste de la moyenne pour rendre l'effet visible
        // immédiatement (sinon il faudrait recharger l'adresse).
        setState((prev) =>
          prev.kind === 'ok'
            ? {
                kind: 'ok',
                address: {
                  ...prev.address,
                  averageRating: res.newAverage,
                  ratingCount: res.ratingCount,
                  myRating: score,
                },
              }
            : prev,
        );
        toast.show({
          message: 'Merci pour votre évaluation !',
          variant: 'success',
        });
      } catch {
        toast.show({
          message: "Impossible d'enregistrer votre évaluation. Réessayez.",
          variant: 'error',
        });
      } finally {
        setVoting(false);
      }
    },
    [code, voting, toast],
  );

  // Open the auth gate dialog for the given action, or run `onAuthed` if the
  // visitor is already authenticated. Used by every post_arrivée extension.
  const guardOrOpen = useCallback(
    (
      action: 'report' | 'contribute',
      label: string,
      onAuthed: () => void,
    ) => {
      if (!isAuthenticated) {
        setAuthGate({ action, label });
        return;
      }
      onAuthed();
    },
    [isAuthenticated],
  );

  const handleArrival = useCallback(async () => {
    setArrived(true);
    // Always record the visit (anonymous arrivals still feed the ETA model
    // backend-side), but only surface the contribution form when the visitor
    // is authenticated — the cas d'usage gates contribution behind login.
    if (isAuthenticated) {
      setContributionOpen(true);
    }
    try {
      await api.confirmArrival({
        addressCode: code,
        departAt: departAtRef.current,
        arrivedAt: new Date().toISOString(),
      });
    } catch {
      // Best-effort: arrival confirmation is not user-blocking. The toast on
      // the next action will still surface real failures.
    }
  }, [code, isAuthenticated]);

  const handleReportSubmit = useCallback(async () => {
    const trimmed = reportMessage.trim();
    if (!trimmed) {
      toast.show({
        message: 'Décrivez brièvement le problème avant d’envoyer.',
        variant: 'error',
      });
      return;
    }
    setReporting(true);
    try {
      await api.reportAddress(code, trimmed);
      toast.show({ message: 'Signalement envoyé.', variant: 'success' });
      setReportOpen(false);
      setReportMessage('');
    } catch {
      toast.show({
        message: "Impossible d'envoyer le signalement. Réessayez.",
        variant: 'error',
      });
    } finally {
      setReporting(false);
    }
  }, [code, reportMessage, toast]);

  const handleContributionSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!direction && !entrySide) {
        toast.show({
          message: 'Choisissez au moins un champ avant de partager.',
          variant: 'info',
        });
        return;
      }
      setContributing(true);
      try {
        await api.submitContribution(code, {
          circulationDirection: direction || undefined,
          entrySide: entrySide || undefined,
        });
        toast.show({
          message: 'Merci pour votre contribution !',
          variant: 'success',
        });
        setContributionOpen(false);
        setDirection('');
        setEntrySide('');
      } catch {
        toast.show({
          message: "Impossible d'envoyer votre contribution. Réessayez.",
          variant: 'error',
        });
      } finally {
        setContributing(false);
      }
    },
    [code, direction, entrySide, toast],
  );

  const inactiveCopy = useMemo(() => {
    if (state.kind !== 'inactive') return null;
    if (!state.deactivatedAt) {
      return "Cette adresse n'est plus active.";
    }
    const formatted = new Date(state.deactivatedAt).toLocaleDateString('fr-FR');
    return `Cette adresse n'est plus active depuis le ${formatted}.`;
  }, [state]);

  // ────────────────────────────────────────────────────────────────────────
  // Render — state machine first, happy path last.
  // ────────────────────────────────────────────────────────────────────────

  if (state.kind === 'loading') {
    return (
      <main className="min-h-screen flex flex-col">
        <Skeleton width="100%" height={280} className="!rounded-none" />
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-6 flex flex-col gap-4">
          <Skeleton width={160} height={32} />
          <Skeleton width={200} height={20} />
          <Skeleton width="100%" height={18} count={4} />
        </div>
        <Skeleton width="100%" height={320} className="!rounded-none" />
      </main>
    );
  }

  if (state.kind === 'not_found') {
    return (
      <StateCard
        title="Aucune adresse trouvée pour ce code."
        body="Vérifiez le code reçu sur WhatsApp ou auprès de votre interlocuteur."
        actionHref="/"
        actionLabel="Retour à l’accueil"
        icon={<AlertTriangle className="h-6 w-6 text-text-muted" aria-hidden="true" />}
      />
    );
  }

  if (state.kind === 'inactive') {
    return (
      <StateCard
        title="Cette adresse n'est plus active."
        body={inactiveCopy ?? "Cette adresse n'est plus active."}
        actionHref="/"
        actionLabel="Retour à l’accueil"
        icon={<AlertTriangle className="h-6 w-6 text-accent" aria-hidden="true" />}
      />
    );
  }

  if (state.kind === 'error') {
    return (
      <StateCard
        title="Impossible de charger cette adresse."
        body="Une erreur réseau s’est produite. Vérifiez votre connexion."
        onAction={() => void loadAddress()}
        actionLabel="Réessayer"
        actionIcon={<RotateCw className="h-4 w-4" aria-hidden="true" />}
        icon={<WifiOff className="h-6 w-6 text-danger" aria-hidden="true" />}
      />
    );
  }

  const { address } = state;
  return (
    <main className="min-h-screen flex flex-col bg-bg">
      {/* Top app bar — back, code, share */}
      <header className="bg-surface sticky top-0 z-30 flex items-center justify-between px-4 h-16 w-full shadow-sm">
        <button
          type="button"
          onClick={() => router.push('/')}
          aria-label="Retour"
          className="flex items-center justify-center p-2 rounded-full text-text-primary hover:bg-surface-muted transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-6 w-6" aria-hidden="true" />
        </button>
        <h1 className="font-display font-semibold text-2xl text-text-primary">
          {address.code}
        </h1>
        <button
          type="button"
          onClick={() => void handleShare()}
          aria-label="Partager"
          className="flex items-center justify-center p-2 rounded-full text-text-primary hover:bg-surface-muted transition-colors cursor-pointer"
        >
          <Share2 className="h-6 w-6" aria-hidden="true" />
        </button>
      </header>

      {isOffline ? (
        <div
          role="status"
          className="w-full bg-surface-muted text-text-primary text-xs px-4 py-2 text-center border-b border-dashed border-border"
        >
          Mode hors-connexion — données issues du cache.
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-3xl flex flex-col gap-3 pb-12">
        {/* Photo — full bleed with status pill overlay + soft dark gradient
           en bas pour donner du contraste à la pill et préparer l'œil au
           contenu de la carte qui suit. */}
        <div className="relative w-full aspect-video bg-surface-muted overflow-hidden">
          <Image
            src={address.photoUrl}
            alt={`Portail de l’adresse ${address.code}`}
            fill
            priority
            sizes="100vw"
            className="object-cover animate-fade-up"
            unoptimized
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/30 to-transparent pointer-events-none"
          />
          <span className="absolute top-4 right-4 px-3 py-1 rounded-full bg-[#DCFCE7] text-[#166534] text-xs font-medium shadow-sm backdrop-blur-sm animate-fade-up stagger-1">
            Validée
          </span>
        </div>

        {/* Info card — code, zone, reliability, quick actions */}
        <section className="mx-4 card rounded-xl p-4">
          <h2 className="font-display font-bold text-2xl text-primary mb-1">
            {address.code}
          </h2>
          <p className="text-sm text-text-muted flex items-center gap-1 mb-3">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {address.quartier.name}
          </p>
          <div className="mb-4">
            <CategoryBadge category={address.category} size="sm" />
          </div>
          <div className="flex items-center gap-2 mb-6">
            <ReliabilityBadge
              averageRating={address.averageRating}
              ratingCount={address.ratingCount}
              size="sm"
            />
            <span className="text-sm text-text-muted">
              {address.visitCount} visite{address.visitCount > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex justify-around border-t border-border pt-4">
            {[
              { icon: QrCode, label: 'QR Code', onClick: () => setQrOpen(true) },
              { icon: Share2, label: 'Partager', onClick: () => void handleShare() },
              { icon: Copy, label: 'Copier', onClick: () => void handleCopyCode() },
            ].map(({ icon: Icon, label, onClick }) => (
              <button
                key={label}
                type="button"
                onClick={onClick}
                className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-primary-surface tap-press transition-colors cursor-pointer group"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-surface text-primary ring-1 ring-primary/15 transition-transform duration-200 group-hover:scale-110 group-active:scale-95">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-xs text-text-muted font-medium">{label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Instructions card */}
        <section
          aria-labelledby="instructions-title"
          className="mx-4 card rounded-xl p-4"
        >
          <h3
            id="instructions-title"
            className="font-display font-semibold text-h3 text-text-primary mb-4"
          >
            Instructions d’accès
          </h3>
          <StepsList steps={address.instructions.steps} />
        </section>

        {/* Map card + navigation CTA */}
        <section ref={mapRef} className="mx-4 card rounded-xl p-4">
          <div className="rounded-lg overflow-hidden mb-4">
            <MapNavigator
              destination={{ lat: address.gps.lat, lng: address.gps.lng }}
              onArrival={handleArrival}
            />
          </div>
          <Button
            variant="primary"
            size="lg"
            onClick={handleStartNavigation}
            leadingIcon={<NavigationIcon className="h-5 w-5" aria-hidden="true" />}
            fullWidth
            className="rounded-xl"
          >
            Lancer la navigation
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={handleArrival}
            disabled={arrived}
            fullWidth
            className="rounded-xl mt-3"
          >
            {arrived ? 'Arrivée enregistrée' : "J'y suis"}
          </Button>
        </section>

        {/* Rating card — 5 stars (StarRating component). Une nouvelle note
           remplace l'ancienne via PUT /addresses/:code/rating (upsert). Si
           la note est ≤ 2, on propose discrètement le signalement (CDC §8). */}
        <section aria-labelledby="rating-title" className="mx-4 card rounded-xl p-4">
          <h3
            id="rating-title"
            className="text-sm font-semibold text-text-primary mb-4 text-center"
          >
            {stars > 0
              ? `Votre note actuelle : ${stars}/5. Modifiable à tout moment.`
              : isAuthenticated
                ? 'Ces instructions étaient-elles utiles ?'
                : 'Connectez-vous pour évaluer cette adresse.'}
          </h3>
          <StarRating
            currentScore={stars > 0 ? stars : null}
            disabled={voting || !isAuthenticated}
            disabledHint={
              !isAuthenticated ? 'Connectez-vous pour évaluer' : undefined
            }
            onRate={(n) => {
              if (!isAuthenticated) {
                guardOrOpen('contribute', 'évaluer cette adresse', () => {});
                return;
              }
              void handleRate(n as 1 | 2 | 3 | 4 | 5);
            }}
          />
          {stars > 0 && stars <= 2 ? (
            <p className="mt-4 text-center text-sm text-text-muted animate-fade-up">
              Souhaitez-vous{' '}
              <button
                type="button"
                onClick={() => setReportOpen(true)}
                className="font-medium text-danger underline underline-offset-2 cursor-pointer"
              >
                signaler un problème
              </button>{' '}
              sur cette adresse ?
            </p>
          ) : null}
        </section>

        {/* Action étendue — Signaler une adresse (post_consultation_adresse).
           La précision terrain reste l'unique mécanisme contributif visiteur :
           elle apparaît automatiquement après « J'y suis » (post_arrivée). */}
        <div className="mt-4 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() =>
              guardOrOpen('report', 'Signaler un problème', () =>
                setReportOpen(true),
              )
            }
            className="flex items-center gap-2 text-danger text-sm hover:underline underline-offset-4 cursor-pointer"
          >
            <Flag className="h-4 w-4" aria-hidden="true" />
            Signaler un problème
          </button>
        </div>

        {contributionOpen ? (
          <section
            aria-labelledby="contribution-title"
            className={classNames(
              'mx-4 rounded-xl bg-surface p-4',
              'border border-border shadow-sm',
              'flex flex-col gap-4',
            )}
          >
            <header className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="contribution-title"
                  className="font-display font-bold text-h3 text-text-primary"
                >
                  Aidez les prochains visiteurs
                </h2>
                <p className="text-sm text-text-muted mt-1">
                  Partage 100% optionnel. Vos précisions seront validées par un
                  administrateur avant d’être publiées.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setContributionOpen(false)}
                className="text-xs font-semibold text-text-muted hover:text-text-primary"
                aria-label="Fermer le formulaire de contribution"
              >
                Fermer
              </button>
            </header>

            <form onSubmit={handleContributionSubmit} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-text-primary">
                  Sens de circulation
                </span>
                <select
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                  className="h-11 rounded-md border border-border bg-surface px-3 text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {DIRECTION_OPTIONS.map((opt) => (
                    <option key={opt.value || 'none-dir'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-text-primary">Côté d’entrée</span>
                <select
                  value={entrySide}
                  onChange={(e) => setEntrySide(e.target.value)}
                  className="h-11 rounded-md border border-border bg-surface px-3 text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {ENTRY_SIDE_OPTIONS.map((opt) => (
                    <option key={opt.value || 'none-side'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={contributing}
                  fullWidth
                >
                  Partager ma contribution
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => setContributionOpen(false)}
                  fullWidth
                >
                  Pas maintenant
                </Button>
              </div>
            </form>
          </section>
        ) : null}

        <footer className="mx-4 pt-4 border-t border-dashed border-border">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="text-sm text-text-muted hover:text-text-primary inline-flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Retour à l’accueil
          </button>
        </footer>
      </div>

      <Modal isOpen={qrOpen} onClose={() => setQrOpen(false)} title={`QR Code ${address.code}`}>
        <QRCodeDisplay
          code={address.code}
          url={typeof window !== 'undefined' ? window.location.href : `/a/${address.code}`}
        />
      </Modal>

      <Modal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Signaler un problème"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setReportOpen(false)}
              size="md"
              disabled={reporting}
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleReportSubmit()}
              size="md"
              loading={reporting}
            >
              Envoyer
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-text-muted">
            Précisez ce qui ne correspond pas (photo, instructions, position…)
            pour aider l’administrateur à corriger.
          </p>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-text-primary">
              Description du problème
            </span>
            <textarea
              value={reportMessage}
              onChange={(e) => setReportMessage(e.target.value)}
              rows={4}
              maxLength={500}
              className="rounded-md border border-border bg-surface px-3 py-2 text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
        </div>
      </Modal>

      {/* Auth gate — bloque les actions qui requièrent une connexion */}
      <Modal
        isOpen={authGate !== null}
        onClose={() => setAuthGate(null)}
        title="Connexion requise"
        footer={
          <>
            <Button
              variant="ghost"
              size="md"
              onClick={() => setAuthGate(null)}
            >
              Plus tard
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                const next = `/a/${address.code}`;
                router.push(`/auth?next=${encodeURIComponent(next)}`);
              }}
              leadingIcon={<LogIn className="h-4 w-4" aria-hidden="true" />}
            >
              Se connecter
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-primary leading-relaxed">
          Pour <strong>{authGate?.label.toLowerCase()}</strong>, créez votre
          compte AdresseBJ en 30 secondes (numéro de téléphone +
          code&nbsp;OTP). Vous reviendrez ensuite directement à cette adresse.
        </p>
      </Modal>
    </main>
  );
}

interface StateCardProps {
  title: string;
  body: string;
  icon?: React.ReactNode;
  actionLabel: string;
  actionIcon?: React.ReactNode;
  actionHref?: string;
  onAction?: () => void;
}

function StateCard({
  title,
  body,
  icon,
  actionHref,
  actionLabel,
  actionIcon,
  onAction,
}: StateCardProps) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <section
        className={classNames(
          'w-full max-w-md bg-surface text-text-primary',
          'rounded-lg border border-border shadow-md p-6 sm:p-8',
          'flex flex-col gap-4',
        )}
        role="alert"
      >
        {icon ? <div>{icon}</div> : null}
        <h1 className="font-display font-bold text-h2">{title}</h1>
        <p className="text-body text-text-muted">{body}</p>
        {actionHref ? (
          <Link href={actionHref} className="self-start">
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
            className="self-start"
            leadingIcon={actionIcon}
          >
            {actionLabel}
          </Button>
        ) : null}
      </section>
    </main>
  );
}

export default AddressView;
