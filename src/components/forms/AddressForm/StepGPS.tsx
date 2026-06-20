'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Check, Crosshair, Info, Loader2, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { classNames } from '@/lib/utils';
import { StepHeading } from './StepHeading';
import { StepNote } from './StepNote';

const MapPreview = dynamic(
  () => import('@/components/map/MapNavigator').then((m) => m.MapNavigator),
  {
    ssr: false,
    loading: () => <div className="w-full h-[320px] bg-surface-muted animate-pulse" />,
  },
);

export interface StepGpsValue {
  lat: number;
  lng: number;
}

export interface GpsReading {
  lat: number;
  lng: number;
  accuracy: number;
}

export interface StepGpsProps {
  value: StepGpsValue | null;
  onComplete: (value: StepGpsValue) => void;
  /** Remonte la meilleure lecture courante (mode panneau) pour alimenter la
   *  carte-canvas du wizard. Ignoré quand `showMap` est vrai. */
  onReading?: (reading: GpsReading | null) => void;
  /**
   * `true` (défaut) : la carte est rendue **dans** l'étape (page d'édition,
   * carte autonome). `false` : pas de carte ici — c'est la carte-canvas du
   * wizard qui l'affiche ; l'étape ne rend que ses contrôles dans le panneau.
   */
  showMap?: boolean;
}

// Seuil de précision GPS au-dessus duquel on considère que la position
// "porte-à-porte" est fiable. 15m est le compromis : sous ce seuil un
// livreur arrive devant le bon portail ; au-dessus, il peut hésiter entre
// deux maisons voisines.
export const ACCURACY_THRESHOLD_METERS = 15;
// Plafond dur : au-dessus, la position n'est plus exploitable pour une adresse
// porte-à-porte. Une précision de plusieurs centaines de mètres trahit en
// général une géolocalisation par IP (appareil sans GPS, ex. ordinateur) plutôt
// qu'un vrai relevé satellite. On refuse alors la validation et on bascule vers
// la saisie manuelle, au lieu de laisser créer une adresse inutilisable.
export const ACCURACY_HARD_CAP_METERS = 150;
// Au bout de ce délai, même si la précision plafonne au-dessus du seuil,
// on autorise la validation (avec un avertissement). Évite de bloquer
// indéfiniment un utilisateur dans un quartier à mauvais signal.
const TIMEOUT_BEFORE_RELAX_MS = 30_000;

const COORD_PATTERN = /^-?\d+(?:\.\d+)?$/;

type ManualReason = 'denied' | 'unsupported' | 'imprecise';

type UiState =
  | { kind: 'idle' }
  | { kind: 'acquiring'; reading: GpsReading | null; relaxed: boolean }
  | { kind: 'manual'; reason: ManualReason };

export function StepGPS({
  value,
  onComplete,
  onReading,
  showMap = true,
}: StepGpsProps) {
  const [ui, setUi] = useState<UiState>(() =>
    value
      ? {
          kind: 'acquiring',
          reading: { lat: value.lat, lng: value.lng, accuracy: 0 },
          relaxed: true,
        }
      : { kind: 'idle' },
  );
  const [manualLat, setManualLat] = useState(value ? String(value.lat) : '');
  const [manualLng, setManualLng] = useState(value ? String(value.lng) : '');
  const [manualError, setManualError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const relaxTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Meilleure précision vue — sert à ne remonter que les améliorations vers la
  // carte-canvas (évite de la faire sauter sur des lectures bruitées).
  const bestRef = useRef<GpsReading | null>(value ? { ...value, accuracy: 0 } : null);
  const onReadingRef = useRef(onReading);
  useEffect(() => {
    onReadingRef.current = onReading;
  });

  const stopWatch = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (relaxTimeoutRef.current !== null) {
      clearTimeout(relaxTimeoutRef.current);
      relaxTimeoutRef.current = null;
    }
  }, []);

  const startWatch = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setUi({ kind: 'manual', reason: 'unsupported' });
      return;
    }
    stopWatch();
    bestRef.current = null;
    onReadingRef.current?.(null);
    setUi({ kind: 'acquiring', reading: null, relaxed: false });

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const incoming: GpsReading = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        // On garde le meilleur échantillon vu — `watchPosition` peut émettre
        // des lectures bruitées entre deux bonnes mesures ; ne pas régresser, et
        // ne remonter à la carte-canvas que les améliorations.
        if (!bestRef.current || incoming.accuracy < bestRef.current.accuracy) {
          bestRef.current = incoming;
          onReadingRef.current?.(incoming);
          setUi((current) =>
            current.kind === 'acquiring'
              ? { ...current, reading: incoming }
              : current,
          );
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setUi({ kind: 'manual', reason: 'denied' });
        }
        // Sinon on laisse `acquiring` actif — le navigateur peut récupérer.
      },
      { enableHighAccuracy: true, timeout: 60_000, maximumAge: 0 },
    );

    relaxTimeoutRef.current = setTimeout(() => {
      setUi((current) =>
        current.kind === 'acquiring' ? { ...current, relaxed: true } : current,
      );
    }, TIMEOUT_BEFORE_RELAX_MS);
  }, [stopWatch]);

  // Démarrage automatique de la capture au montage quand aucune position n'a
  // encore été saisie. En édition / retour arrière, la valeur préexistante est
  // déjà affichée par l'initialiseur (pas de nouveau watch).
  useEffect(() => {
    if (ui.kind === 'idle' && !value) {
      startWatch();
    }
  }, [ui.kind, value, startWatch]);

  // Cleanup à la sortie du step.
  useEffect(() => () => stopWatch(), [stopWatch]);

  const handleManualSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !COORD_PATTERN.test(manualLat.trim()) ||
      !COORD_PATTERN.test(manualLng.trim())
    ) {
      setManualError(
        'Latitude et longitude doivent être des nombres décimaux (ex : 6.3676).',
      );
      return;
    }
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setManualError('Coordonnées hors limites.');
      return;
    }
    setManualError(null);
    onReadingRef.current?.({ lat, lng, accuracy: 0 });
    onComplete({ lat, lng });
  };

  const handleValidate = (lat: number, lng: number) => {
    onComplete({ lat, lng });
  };

  // Précision trop dégradée pour valider : on arrête la capture et on propose
  // la saisie manuelle (le GPS de l'appareil ne donnera rien de mieux).
  const handleGiveUpForManual = useCallback(() => {
    stopWatch();
    setUi({ kind: 'manual', reason: 'imprecise' });
  }, [stopWatch]);

  return (
    <div className="flex flex-col gap-5">
      <StepHeading
        title="Où se trouve votre porte ?"
        subtitle="Placez-vous devant votre porte, dehors, et restez immobile quelques secondes : la précision s’affine au fil du temps."
      />

      {ui.kind === 'acquiring' ? (
        <AcquiringPanel
          reading={ui.reading}
          relaxed={ui.relaxed}
          showMap={showMap}
          onValidate={handleValidate}
          onRestart={startWatch}
          onManual={handleGiveUpForManual}
        />
      ) : null}

      {ui.kind === 'manual' ? (
        <ManualPanel
          reason={ui.reason}
          manualLat={manualLat}
          manualLng={manualLng}
          manualError={manualError}
          onLatChange={setManualLat}
          onLngChange={setManualLng}
          onSubmit={handleManualSubmit}
          onRetry={startWatch}
        />
      ) : null}

      {ui.kind === 'idle' ? (
        <Button
          type="button"
          variant="primary"
          size="lg"
          fullWidth
          onClick={startWatch}
          leadingIcon={<Crosshair className="h-5 w-5" aria-hidden="true" />}
        >
          Capturer ma position
        </Button>
      ) : null}
    </div>
  );
}

interface AcquiringPanelProps {
  reading: GpsReading | null;
  relaxed: boolean;
  showMap: boolean;
  onValidate: (lat: number, lng: number) => void;
  onRestart: () => void;
  onManual: () => void;
}

function AcquiringPanel({
  reading,
  relaxed,
  showMap,
  onValidate,
  onRestart,
  onManual,
}: AcquiringPanelProps) {
  if (!reading) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <Loader2
          className="h-9 w-9 animate-spin text-primary"
          aria-hidden="true"
        />
        <div className="flex flex-col gap-1">
          <p className="font-display font-semibold text-lg text-text-primary">
            Recherche de votre position…
          </p>
          <p className="text-sm text-text-muted max-w-sm">
            Patientez quelques secondes. Si rien ne se passe, vérifiez que vous
            avez autorisé la localisation pour ce site.
          </p>
        </div>
      </div>
    );
  }

  const accuracy = Math.round(reading.accuracy);
  const isPrecise = accuracy <= ACCURACY_THRESHOLD_METERS;
  const tooImprecise = accuracy > ACCURACY_HARD_CAP_METERS;
  const canValidate = !tooImprecise && (isPrecise || relaxed);

  const validateButton = (
    <Button
      type="button"
      variant="primary"
      size="lg"
      fullWidth
      disabled={!canValidate}
      onClick={() => onValidate(reading.lat, reading.lng)}
      leadingIcon={
        canValidate ? (
          <Check className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        )
      }
    >
      {canValidate
        ? 'Je suis devant ma porte'
        : `Précision en cours… (${accuracy} m)`}
    </Button>
  );

  const manualButton = (
    <Button
      type="button"
      variant="primary"
      size="lg"
      fullWidth
      onClick={onManual}
      leadingIcon={<Crosshair className="h-5 w-5" aria-hidden="true" />}
    >
      Saisir mes coordonnées
    </Button>
  );

  const restartButton = (
    <Button
      type="button"
      variant="ghost"
      size="md"
      onClick={onRestart}
      leadingIcon={<RotateCw className="h-4 w-4" aria-hidden="true" />}
    >
      Reprendre les mesures
    </Button>
  );

  // ── Mode panneau (wizard) : la carte est le canvas, ici uniquement les
  //    contrôles, en ligne (pas de soupe de bandeaux). ──
  if (!showMap) {
    return (
      <div className="flex flex-col gap-4">
        <StatusRow
          accuracy={accuracy}
          isPrecise={isPrecise}
          tooImprecise={tooImprecise}
        />
        <p className="code-type text-sm text-text-muted tabular-nums">
          {reading.lat.toFixed(5)}° N, {reading.lng.toFixed(5)}° E
        </p>

        {tooImprecise ? (
          <p className="text-sm text-text-muted leading-relaxed">
            Votre appareil ne donne pas une position assez précise. C’est souvent
            le cas sur un ordinateur, sans GPS. Essayez depuis votre téléphone, à
            l’extérieur.
          </p>
        ) : !isPrecise && relaxed ? (
          <p className="text-sm text-text-muted leading-relaxed">
            Position approximative — vous pouvez valider quand même, votre photo
            aidera les visiteurs à trouver.
          </p>
        ) : null}

        <div className="flex flex-col gap-2.5 pt-1">
          {tooImprecise ? manualButton : validateButton}
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={onRestart}
              className="inline-flex items-center gap-1.5 font-medium text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
              Reprendre les mesures
            </button>
            {!tooImprecise ? (
              <button
                type="button"
                onClick={onManual}
                className="font-medium text-primary hover:underline cursor-pointer"
              >
                Saisir les coordonnées
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  // ── Mode carte embarquée (édition) : la carte est le héros de l'étape. ──
  if (tooImprecise) {
    return (
      <div className="flex flex-col gap-4">
        <AccuracyBadge accuracy={accuracy} isPrecise={false} tooImprecise />
        <StepNote variant="danger" icon={Info} role="alert">
          Votre appareil ne donne pas une position assez précise ({accuracy} m).
          C’est souvent le cas sur un ordinateur, qui n’a pas de GPS. Essayez
          depuis votre téléphone, à l’extérieur, ou saisissez vos coordonnées.
        </StepNote>
        <div className="flex flex-col sm:flex-row gap-2">
          {manualButton}
          {restartButton}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className={classNames(
          'relative overflow-hidden rounded-[var(--radius-lg)] border shadow-md transition-[box-shadow,border-color] duration-300',
          isPrecise
            ? 'border-success/50 ring-2 ring-success/25'
            : 'border-border-strong',
        )}
      >
        <MapPreview destination={reading} interactive={false} />

        <div
          className="absolute top-3 left-3 flex items-center gap-2 rounded-full glass px-3 py-1.5 shadow-sm pointer-events-none"
          aria-live="polite"
        >
          <span
            aria-hidden="true"
            className={classNames(
              'inline-flex h-2.5 w-2.5 rounded-full',
              isPrecise ? 'bg-success animate-pulse' : 'bg-warning',
            )}
          />
          <span className="text-xs font-semibold text-text-primary">
            {isPrecise ? 'Position trouvée' : 'Recherche…'}
          </span>
          <span className="text-xs font-display font-bold tabular-nums text-text-primary">
            ± {accuracy} m
          </span>
        </div>

        <div className="absolute bottom-3 left-3 glass-dark rounded-full px-3 py-1.5 pointer-events-none">
          <span className="code-type text-xs font-semibold text-white tracking-wide">
            {reading.lat.toFixed(5)}° N, {reading.lng.toFixed(5)}° E
          </span>
        </div>
      </div>

      {!isPrecise && relaxed ? (
        <StepNote variant="warning" icon={Info}>
          Position un peu approximative ({accuracy} m). Vous pouvez valider quand
          même : votre photo aidera les visiteurs à trouver.
        </StepNote>
      ) : null}

      <div className="flex flex-col sm:flex-row gap-2">
        {validateButton}
        {restartButton}
      </div>
    </div>
  );
}

/** Ligne d'état de précision (mode panneau) — inline, pas de bandeau-carte. */
function StatusRow({
  accuracy,
  isPrecise,
  tooImprecise,
}: {
  accuracy: number;
  isPrecise: boolean;
  tooImprecise: boolean;
}) {
  const label = isPrecise
    ? 'Position trouvée'
    : tooImprecise
      ? 'Position non fiable'
      : 'Position approximative';
  const tone = isPrecise
    ? 'text-success'
    : tooImprecise
      ? 'text-danger'
      : 'text-warning';
  const dot = isPrecise
    ? 'bg-success animate-pulse'
    : tooImprecise
      ? 'bg-danger'
      : 'bg-warning';
  return (
    <div className="flex items-center justify-between gap-3" aria-live="polite">
      <span className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={classNames('inline-flex h-2.5 w-2.5 rounded-full', dot)}
        />
        <span className={classNames('text-sm font-semibold', tone)}>{label}</span>
      </span>
      {accuracy > 0 ? (
        <span className="code-type text-sm font-bold tabular-nums text-text-primary">
          ± {accuracy} m
        </span>
      ) : null}
    </div>
  );
}

function AccuracyBadge({
  accuracy,
  isPrecise,
  tooImprecise,
}: {
  accuracy: number;
  isPrecise: boolean;
  tooImprecise: boolean;
}) {
  return (
    <div
      className={classNames(
        'flex items-center justify-between gap-3 rounded-[var(--radius-md)] px-4 py-3 border',
        isPrecise
          ? 'bg-primary-surface border-primary/30 text-primary'
          : tooImprecise
            ? 'bg-danger-light border-danger/30 text-danger'
            : 'bg-surface-muted border-border text-text-muted',
      )}
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={classNames(
            'inline-flex h-2.5 w-2.5 rounded-full',
            isPrecise
              ? 'bg-success animate-pulse'
              : tooImprecise
                ? 'bg-danger'
                : 'bg-warning',
          )}
        />
        <span className="text-sm font-medium">
          {isPrecise
            ? 'Position trouvée'
            : tooImprecise
              ? 'Position non fiable'
              : 'Recherche en cours…'}
        </span>
      </div>
      <span className="text-sm font-display font-bold tabular-nums">
        ± {accuracy} m
      </span>
    </div>
  );
}

interface ManualPanelProps {
  reason: ManualReason;
  manualLat: string;
  manualLng: string;
  manualError: string | null;
  onLatChange: (v: string) => void;
  onLngChange: (v: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onRetry: () => void;
}

const MANUAL_INTRO: Record<ManualReason, string> = {
  unsupported:
    'Votre navigateur ne propose pas la géolocalisation. Saisissez les coordonnées manuellement.',
  denied:
    'Nous n’avons pas pu accéder à votre position. Vous pouvez la saisir manuellement ci-dessous ou réessayer.',
  imprecise:
    'Votre appareil ne donne pas une position assez précise (souvent le cas sur un ordinateur, sans GPS). Saisissez vos coordonnées ci-dessous, ou réessayez depuis un téléphone, à l’extérieur.',
};

function ManualPanel({
  reason,
  manualLat,
  manualLng,
  manualError,
  onLatChange,
  onLngChange,
  onSubmit,
  onRetry,
}: ManualPanelProps) {
  const unsupported = reason === 'unsupported';
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <Crosshair
          className="h-5 w-5 mt-0.5 shrink-0 text-primary"
          aria-hidden="true"
        />
        <p className="text-sm text-text-primary leading-relaxed">
          {MANUAL_INTRO[reason]}
        </p>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Latitude"
            placeholder="6.3676"
            inputMode="decimal"
            value={manualLat}
            onChange={(e) => onLatChange(e.target.value)}
          />
          <Input
            label="Longitude"
            placeholder="2.4252"
            inputMode="decimal"
            value={manualLng}
            onChange={(e) => onLngChange(e.target.value)}
          />
        </div>
        {manualError ? (
          <p role="alert" className="text-sm text-danger">
            {manualError}
          </p>
        ) : null}
        {/* Pile verticale : le panneau du wizard ne fait que ~26rem de large,
            donc une rangée `sm:flex-row` (calée sur le viewport) tasserait les
            boutons. Primaire pleine largeur + lien secondaire discret. */}
        <div className="flex flex-col gap-2.5">
          <Button type="submit" variant="primary" size="md" fullWidth>
            Valider manuellement
          </Button>
          {!unsupported ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center justify-center gap-1.5 self-center text-sm font-medium text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
              Réessayer la géolocalisation
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}

export default StepGPS;
