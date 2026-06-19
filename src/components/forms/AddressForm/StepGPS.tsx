'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Check, Crosshair, Info, Loader2, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { classNames } from '@/lib/utils';

const MapPreview = dynamic(
  () => import('@/components/map/MapNavigator').then((m) => m.MapNavigator),
  {
    ssr: false,
    loading: () => <div className="w-full h-[260px] bg-surface-muted animate-pulse" />,
  },
);

export interface StepGpsValue {
  lat: number;
  lng: number;
}

export interface StepGpsProps {
  value: StepGpsValue | null;
  onComplete: (value: StepGpsValue) => void;
}

// Seuil de précision GPS au-dessus duquel on considère que la position
// "porte-à-porte" est fiable. 15m est le compromis : sous ce seuil un
// livreur arrive devant le bon portail ; au-dessus, il peut hésiter entre
// deux maisons voisines.
const ACCURACY_THRESHOLD_METERS = 15;
// Au bout de ce délai, même si la précision plafonne au-dessus du seuil,
// on autorise la validation (avec un avertissement). Évite de bloquer
// indéfiniment un utilisateur dans un quartier à mauvais signal.
const TIMEOUT_BEFORE_RELAX_MS = 30_000;

const COORD_PATTERN = /^-?\d+(?:\.\d+)?$/;

interface GpsReading {
  lat: number;
  lng: number;
  accuracy: number;
}

type UiState =
  | { kind: 'idle' }
  | { kind: 'acquiring'; reading: GpsReading | null; relaxed: boolean }
  | { kind: 'denied' }
  | { kind: 'unsupported' };

export function StepGPS({ value, onComplete }: StepGpsProps) {
  const [ui, setUi] = useState<UiState>(() =>
    value ? { kind: 'acquiring', reading: null, relaxed: true } : { kind: 'idle' },
  );
  const [manualLat, setManualLat] = useState(value ? String(value.lat) : '');
  const [manualLng, setManualLng] = useState(value ? String(value.lng) : '');
  const [manualError, setManualError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const relaxTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      setUi({ kind: 'unsupported' });
      return;
    }
    stopWatch();
    setUi({ kind: 'acquiring', reading: null, relaxed: false });

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const incoming: GpsReading = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        // On garde le meilleur échantillon vu — `watchPosition` peut
        // émettre des lectures bruitées entre deux bonnes mesures, ne pas
        // régresser silencieusement.
        setUi((current) => {
          if (current.kind !== 'acquiring') return current;
          if (!current.reading || incoming.accuracy < current.reading.accuracy) {
            return { ...current, reading: incoming };
          }
          return current;
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setUi({ kind: 'denied' });
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

  // Démarrage automatique au montage si on n'a pas déjà une valeur.
  useEffect(() => {
    if (ui.kind === 'idle' && !value) {
      startWatch();
    } else if (ui.kind === 'idle' && value) {
      // Valeur préexistante : on affiche le mode "acquise" sans relancer
      // le watch (économies de batterie pour les retours en arrière).
      setUi({
        kind: 'acquiring',
        reading: { lat: value.lat, lng: value.lng, accuracy: 0 },
        relaxed: true,
      });
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
    onComplete({ lat, lng });
  };

  const handleValidate = (lat: number, lng: number) => {
    onComplete({ lat, lng });
  };

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1 text-center">
        <h2 className="font-display font-semibold text-h3 text-text-primary">
          Position exacte
        </h2>
        <p className="text-sm text-text-muted">
          Placez-vous devant votre porte d&apos;entrée et restez immobile
          quelques secondes&nbsp;: la précision s&apos;affine au fil du temps.
        </p>
      </header>

      <div className="flex items-start gap-2.5 rounded-md bg-warning-light border border-warning/30 px-4 py-3">
        <Info className="h-4 w-4 text-warning shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-sm text-text-primary leading-relaxed">
          Sortez du bâtiment pour mieux capter. Ça prend en général 10 à
          20 secondes.
        </p>
      </div>

      {ui.kind === 'acquiring' ? (
        <AcquiringPanel
          reading={ui.reading}
          relaxed={ui.relaxed}
          onValidate={handleValidate}
          onRestart={startWatch}
        />
      ) : null}

      {ui.kind === 'denied' || ui.kind === 'unsupported' ? (
        <ManualPanel
          unsupported={ui.kind === 'unsupported'}
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
  onValidate: (lat: number, lng: number) => void;
  onRestart: () => void;
}

function AcquiringPanel({
  reading,
  relaxed,
  onValidate,
  onRestart,
}: AcquiringPanelProps) {
  if (!reading) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-text-muted">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm">Recherche de votre position…</p>
        <p className="text-xs text-center max-w-sm">
          Patientez quelques secondes. Si rien ne se passe, vérifiez que vous
          avez autorisé la localisation pour ce site.
        </p>
      </div>
    );
  }

  const accuracy = Math.round(reading.accuracy);
  const isPrecise = accuracy <= ACCURACY_THRESHOLD_METERS;
  const canValidate = isPrecise || relaxed;

  return (
    <div className="flex flex-col gap-3">
      <AccuracyBadge accuracy={accuracy} isPrecise={isPrecise} />

      <div className="rounded-[var(--radius-lg)] overflow-hidden border border-border-strong shadow-md">
        <MapPreview destination={reading} interactive={false} />
      </div>

      <p className="text-center text-xs text-text-muted font-mono tracking-wide">
        {reading.lat.toFixed(5)}° N, {reading.lng.toFixed(5)}° E
      </p>

      {!isPrecise && relaxed ? (
        <div className="flex items-start gap-2.5 rounded-md bg-warning-light border border-warning/30 px-4 py-3">
          <Info
            className="h-4 w-4 text-warning shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <p className="text-sm text-text-primary leading-relaxed">
            Position un peu approximative ({accuracy} m). Vous pouvez valider
            quand même : votre photo aidera les visiteurs à trouver.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col sm:flex-row gap-2">
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
        <Button
          type="button"
          variant="ghost"
          size="md"
          onClick={onRestart}
          leadingIcon={<RotateCw className="h-4 w-4" aria-hidden="true" />}
        >
          Reprendre les mesures
        </Button>
      </div>
    </div>
  );
}

function AccuracyBadge({
  accuracy,
  isPrecise,
}: {
  accuracy: number;
  isPrecise: boolean;
}) {
  return (
    <div
      className={classNames(
        'flex items-center justify-between gap-3 rounded-md px-4 py-3 border',
        isPrecise
          ? 'bg-primary-surface border-primary/30 text-primary'
          : 'bg-surface-muted border-border text-text-muted',
      )}
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={classNames(
            'inline-flex h-2.5 w-2.5 rounded-full',
            isPrecise ? 'bg-success animate-pulse' : 'bg-warning',
          )}
        />
        <span className="text-sm font-medium">
          {isPrecise ? 'Position trouvée' : 'Recherche en cours…'}
        </span>
      </div>
      <span className="text-sm font-display font-bold tabular-nums">
        ± {accuracy} m
      </span>
    </div>
  );
}

interface ManualPanelProps {
  unsupported: boolean;
  manualLat: string;
  manualLng: string;
  manualError: string | null;
  onLatChange: (v: string) => void;
  onLngChange: (v: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onRetry: () => void;
}

function ManualPanel({
  unsupported,
  manualLat,
  manualLng,
  manualError,
  onLatChange,
  onLngChange,
  onSubmit,
  onRetry,
}: ManualPanelProps) {
  return (
    <div className="flex flex-col gap-4 bg-surface-muted rounded-md p-4 border border-dashed border-border">
      <p className="text-sm text-text-primary leading-relaxed">
        {unsupported
          ? 'Votre navigateur ne propose pas la géolocalisation. Saisissez les coordonnées manuellement.'
          : 'Nous n’avons pas pu accéder à votre position. Vous pouvez la saisir manuellement ci-dessous ou réessayer.'}
      </p>
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
        <div className="flex flex-col sm:flex-row gap-2">
          <Button type="submit" variant="primary" size="md" fullWidth>
            Valider manuellement
          </Button>
          {!unsupported ? (
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={onRetry}
              leadingIcon={<RotateCw className="h-4 w-4" aria-hidden="true" />}
            >
              Réessayer la géolocalisation
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  );
}

export default StepGPS;
