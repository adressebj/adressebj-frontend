'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Copy,
  Flag,
  Home,
  LogIn,
  MapPin,
  Navigation as NavigationIcon,
  QrCode,
  RotateCw,
  Share2,
  Star,
  WifiOff,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { CategoryMedallion } from '@/components/address/CategoryMedallion';
import { FeedbackPrompt } from '@/components/address/FeedbackPrompt';
import { FieldNotesList } from '@/components/address/FieldNotesList';
import { QRCodeDisplay } from '@/components/address/QRCodeDisplay';
import { RatingSummary } from '@/components/address/RatingSummary';
import { StepsList } from '@/components/address/StepsList';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { ApiError, api } from '@/lib/api';
import { classNames } from '@/lib/utils';
import type { MapNavigatorApi } from '@/components/map/MapNavigator';
import type { FieldNote, PublicAddress } from '@/types/api';

const MapNavigator = dynamic(
  () => import('@/components/map/MapNavigator').then((m) => m.MapNavigator),
  {
    ssr: false,
    loading: () => <div className="w-full h-full bg-surface-muted animate-pulse" />,
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

  // 1-5 star evaluation — l'API upsert garantit qu'une nouvelle note remplace
  // l'ancienne (CDC v5 §8). Le score courant vient du PublicAddress.myRating.
  const [stars, setStars] = useState(0);

  const [qrOpen, setQrOpen] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportMessage, setReportMessage] = useState('');
  const [reporting, setReporting] = useState(false);

  const [arrived, setArrived] = useState(false);
  // Le parcours est séquentiel : « J'y suis » n'apparaît qu'après le lancement
  // d'une navigation, et le dialogue de retour (note → contribution) n'est
  // présenté qu'à l'arrivée confirmée — la note porte sur un trajet réellement
  // effectué (CDC §327).
  const [navigationStarted, setNavigationStarted] = useState(false);
  // Dialogue de retour présenté explicitement à l'arrivée (note + contribution).
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Informations terrain approuvées (lecture seule) — texte libre publié après
  // modération (CDC Frontend §549/753). Masqué si vide.
  const [fieldNotes, setFieldNotes] = useState<FieldNote[]>([]);

  // API impérative de la carte (fly-to à l'ouverture, tracé d'itinéraire).
  const mapApiRef = useRef<MapNavigatorApi | null>(null);
  // Capture departure time at mount so /visits/confirm has a meaningful pair.
  const departAtRef = useRef<string>(new Date().toISOString());

  const fetchAddress = useCallback(async () => {
    try {
      const address = await api.publicAddress(code);
      setState({ kind: 'ok', address });
      if (address.myRating != null) {
        setStars(address.myRating);
      }
      // Informations terrain publiées — best-effort, ne bloque jamais la fiche.
      api
        .listFieldNotes(code)
        .then((res) => setFieldNotes(res.items))
        .catch(() => setFieldNotes([]));
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

  // Montage : on récupère sans re-poser « loading » (l'état initial l'est déjà).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch async : les setState ont lieu après await
    void fetchAddress();
  }, [fetchAddress]);

  // Retry (« Réessayer ») : repose « loading » puis recharge.
  const loadAddress = useCallback(async () => {
    setState({ kind: 'loading' });
    await fetchAddress();
  }, [fetchAddress]);

  // Initial offline flag + listeners — banner stays in sync without polling.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync initial avec navigator.onLine (système externe)
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
    setNavigationStarted(true);
    // Trace l'itinéraire animé sur la carte signature (best-effort géoloc).
    void mapApiRef.current?.startNavigation();
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

  // Enregistre la note (upsert) et met à jour la moyenne affichée de façon
  // optimiste. Lève en cas d'échec — le dialogue de retour gère le retour UX
  // (transition d'étape en cas de succès, toast d'erreur sinon).
  const handleRate = useCallback(
    async (score: number) => {
      const res = await api.upsertRating(code, score as 1 | 2 | 3 | 4 | 5);
      setStars(score);
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
    },
    [code],
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
    // Présente EXPLICITEMENT le dialogue de retour (note → contribution) au
    // moment de l'arrivée — pour tout le monde : un anonyme y est invité à se
    // connecter (CDC §327). L'arrivée elle-même est anonyme.
    setFeedbackOpen(true);
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
  }, [code]);

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

  // Envoie une observation terrain (texte libre). La note part en modération :
  // elle n'apparaît publiquement qu'une fois approuvée — on ne l'ajoute donc
  // pas à la liste affichée. Lève en cas d'échec (le dialogue gère le retour).
  const submitNote = useCallback(
    async (message: string) => {
      await api.createFieldNote(code, { message });
    },
    [code],
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
      <StateCard
        title="Aucune adresse trouvée pour ce code."
        body="Vérifiez le code reçu sur WhatsApp ou auprès de votre interlocuteur."
        actionHref="/"
        actionLabel="Retour à l’accueil"
        icon={<AlertTriangle className="h-7 w-7 text-text-muted" aria-hidden="true" />}
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
        icon={<AlertTriangle className="h-7 w-7 text-accent" aria-hidden="true" />}
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
        icon={<WifiOff className="h-7 w-7 text-danger" aria-hidden="true" />}
      />
    );
  }

  const { address } = state;

  const quickActions = [
    { icon: QrCode, label: 'QR Code', onClick: () => setQrOpen(true) },
    { icon: Share2, label: 'Partager', onClick: () => void handleShare() },
    { icon: Copy, label: 'Copier le code', onClick: () => void handleCopyCode() },
  ];

  const steps = address.instructions.steps;

  return (
    <main className="relative min-h-screen bg-bg lg:h-screen lg:overflow-hidden">
      {/* ── CARTE-CANVAS (signature) — hero plein sur mobile, panneau droit
          pleine hauteur sur desktop. fly-to vers le pin de marque à
          l'ouverture, tracé d'itinéraire au lancement de la navigation. ── */}
      <div className="fixed inset-x-0 top-0 h-[50vh] z-0 lg:absolute lg:inset-y-0 lg:left-[26rem] lg:right-0 lg:h-auto">
        <MapNavigator
          destination={{ lat: address.gps.lat, lng: address.gps.lng }}
          onArrival={handleArrival}
          className="w-full h-full"
          onReady={(mapApi) => {
            mapApiRef.current = mapApi;
            // Fly-to signature peu après le montage de la carte.
            window.setTimeout(() => mapApi.flyToDestination(), 350);
          }}
        />

        {/* Chrome flottant minimal — retour accueil + logo (langage `/carte`). */}
        <div
          className="absolute inset-x-0 top-0 z-[400] flex items-center justify-between gap-2 p-3 pointer-events-none"
          style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
        >
          <Link
            href="/"
            aria-label="Retour à l’accueil"
            className="pointer-events-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-text-primary shadow-md border border-border tap-press hover:text-primary transition-colors lg:hidden"
          >
            <Home className="h-5 w-5" aria-hidden="true" />
          </Link>
          <Link
            href="/"
            aria-label="Accueil AdresseBJ"
            className="pointer-events-auto hidden lg:inline-flex items-center rounded-full bg-surface/95 px-3 py-2 shadow-md border border-border backdrop-blur-sm"
          >
            <Logo iconOnly className="h-6 w-6" />
          </Link>
        </div>
      </div>

      {/* ── SURFACE PAPIER SOLIDE — arbre de contenu unique (feuille mobile /
          panneau gauche desktop). Pas de glassmorphisme. ── */}
      <div className="relative z-10 mt-[42vh] lg:mt-0 lg:fixed lg:inset-y-0 lg:left-0 lg:w-[26rem] lg:overflow-y-auto">
        <div className="bg-surface rounded-t-[var(--radius-2xl)] lg:rounded-none border-t lg:border-t-0 lg:border-r border-border shadow-[0_-12px_40px_-12px_rgba(26,20,12,0.18)] lg:shadow-lg min-h-[58vh] lg:min-h-full">
          {/* Poignée décorative (affordance « feuille ») — mobile seulement. */}
          <div className="flex justify-center pt-3 pb-1 lg:hidden" aria-hidden="true">
            <div className="h-1.5 w-10 rounded-full bg-border-strong" />
          </div>

          {isOffline ? (
            <div
              role="status"
              className="mx-4 mt-2 rounded-xl bg-surface-muted text-text-primary text-xs px-3 py-2 text-center border border-dashed border-border-strong"
            >
              Mode hors-connexion. Données issues du cache.
            </div>
          ) : null}

          <div className="px-5 sm:px-7 pt-5 pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-12 flex flex-col gap-8">
            {/* ── PLAQUE IDENTITÉ ── */}
            <header className="animate-fade-up flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <CategoryMedallion category={address.category} />
                {/* Actions rapides — QR / Partager / Copier. */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {quickActions.map(({ icon: Icon, label, onClick }) => (
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
                  ))}
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

              {/* Bloc confiance éditorial — note + étoiles or + visites. */}
              <RatingSummary
                averageRating={address.averageRating}
                ratingCount={address.ratingCount}
                visitCount={address.visitCount}
                className="animate-fade-up stagger-1"
              />
            </header>

            {/* ── ACTIONS CLÉS ──
                Au départ : seul « Itinéraire ». « J'y suis » n'apparaît
                qu'une fois la navigation lancée (rien à confirmer avant). */}
            <div className="animate-fade-up stagger-1 flex flex-col gap-3">
              <Button
                variant="primary"
                size="lg"
                onClick={handleStartNavigation}
                aria-label="Lancer la navigation"
                leadingIcon={<NavigationIcon className="h-5 w-5" aria-hidden="true" />}
                className="w-full rounded-[var(--radius-lg)] font-bold shadow-sm"
              >
                {navigationStarted ? 'Relancer l’itinéraire' : 'Itinéraire'}
              </Button>
              {navigationStarted ? (
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={handleArrival}
                  disabled={arrived}
                  className="w-full rounded-[var(--radius-lg)] font-bold border-border-strong bg-surface-muted hover:bg-border"
                >
                  {arrived ? 'Arrivée confirmée' : 'J’y suis'}
                </Button>
              ) : null}
            </div>

            {/* ── PHOTO DU PORTAIL — ancre de reconnaissance ── */}
            <figure className="animate-fade-up stagger-2 relative w-full aspect-[4/3] sm:aspect-[16/10] overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface-muted">
              <Image
                src={address.photoUrl}
                alt={`Portail de l’adresse ${address.code}`}
                fill
                priority
                sizes="(min-width: 1024px) 26rem, 100vw"
                className="object-cover"
                unoptimized
              />
            </figure>

            {/* ── ITINÉRAIRE — liste d'instructions ── */}
            <section aria-labelledby="instructions-title" className="animate-fade-up stagger-3">
              <h2
                id="instructions-title"
                className="mb-1.5 font-display font-bold text-2xl text-text-primary"
              >
                Les derniers mètres
              </h2>
              <p className="mb-6 max-w-prose text-sm text-text-muted">
                Repères du propriétaire, depuis un point connu du quartier.
              </p>
              <StepsList steps={steps} />
            </section>

            {/* ── INFORMATIONS TERRAIN (contributions validées, lecture seule) ──
                Texte libre publié après modération (CDC Frontend §549/753).
                Toute la section disparaît s'il n'y en a aucune. */}
            {fieldNotes.length > 0 ? (
              <section
                aria-labelledby="terrain-title"
                className="animate-fade-up"
              >
                <h2
                  id="terrain-title"
                  className="font-display font-bold text-2xl text-text-primary mb-2"
                >
                  Informations terrain
                </h2>
                <p className="text-sm text-text-muted mb-5">
                  Les conseils de personnes qui sont déjà venues jusqu&apos;ici.
                </p>
                <FieldNotesList notes={fieldNotes} />
              </section>
            ) : null}

            {/* ── ACTIONS SECONDAIRES ──
                Le retour (note + contribution) est présenté dans un dialogue à
                l'arrivée. Ici on garde un accès permanent : « Donner mon avis »
                pour rouvrir le dialogue après arrivée, et « Signaler un
                problème » toujours accessible (CDC §327). */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              {arrived ? (
                <button
                  type="button"
                  onClick={() => setFeedbackOpen(true)}
                  className="flex items-center gap-2 text-primary text-sm font-semibold hover:text-primary-hover transition-colors cursor-pointer"
                >
                  <Star className="h-4 w-4" aria-hidden="true" />
                  Donner mon avis
                </button>
              ) : null}
              <button
                type="button"
                onClick={() =>
                  guardOrOpen('report', 'signaler un problème', () =>
                    setReportOpen(true),
                  )
                }
                className="flex items-center gap-2 text-text-muted text-sm font-medium hover:text-text-primary transition-colors cursor-pointer"
              >
                <Flag className="h-4 w-4" aria-hidden="true" />
                Signaler un problème
              </button>
            </div>

            <footer className="pt-6 border-t border-dashed border-border flex justify-center lg:justify-start">
              <Link
                href="/carte"
                className="text-sm font-semibold text-text-muted hover:text-text-primary inline-flex items-center gap-2 cursor-pointer tap-press px-4 py-2 rounded-full hover:bg-surface-muted"
              >
                <MapPin className="h-4 w-4" aria-hidden="true" /> Explorer la carte
              </Link>
            </footer>
          </div>
        </div>
      </div>

      {/* Dialogue de retour présenté explicitement à l'arrivée. */}
      <FeedbackPrompt
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        isAuthenticated={isAuthenticated}
        currentRating={stars > 0 ? stars : null}
        onRate={handleRate}
        onSubmitNote={submitNote}
        onRequireAuth={() => {
          setFeedbackOpen(false);
          setAuthGate({ action: 'contribute', label: 'noter cette adresse' });
        }}
      />

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
            <Button variant="ghost" size="md" onClick={() => setAuthGate(null)}>
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
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-bg motif-paper">
      <section
        className={classNames(
          'w-full max-w-md bg-surface text-text-primary',
          'rounded-[var(--radius-xl)] border border-border shadow-lg p-7 sm:p-9',
          'flex flex-col gap-4 items-start',
        )}
        role="alert"
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

export default AddressView;
