'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Eye, HelpCircle, Loader2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { ApiError, api } from '@/lib/api';
import { classNames } from '@/lib/utils';
import { AddressCreatedScreen } from '@/components/address/AddressCreatedScreen';
import { Modal } from '@/components/ui/Modal';
import {
  StepGPS,
  type StepGpsValue,
  type GpsReading,
  ACCURACY_THRESHOLD_METERS,
  ACCURACY_HARD_CAP_METERS,
} from './StepGPS';
import { StepInstructions, type StepInstructionsValue } from './StepInstructions';
import { StepCategory, type StepCategoryValue } from './StepCategory';
import { StepPhoto, type StepPhotoValue } from './StepPhoto';
import type { CreatedAddress } from '@/types/api';

// Carte-canvas plein cadre — `ssr:false` : Leaflet touche `window` à l'import.
const LocationCanvas = dynamic(
  () => import('./LocationCanvas').then((m) => m.LocationCanvas),
  {
    ssr: false,
    loading: () => <div className="w-full h-full bg-surface-muted animate-pulse" />,
  },
);

// 4 étapes — CDC Frontend §/dashboard/address/new : GPS → Instructions →
// Catégorie → Photo. Le quartier est dérivé du GPS côté backend (jamais choisi).
const STEP_LABELS = ['Position', 'Instructions', 'Catégorie', 'Photo'] as const;

// Aide contextuelle du bouton « ? » flottant : un contenu par étape, affiché
// en place (modale) sans jamais quitter le wizard. Va au-delà du sous-titre de
// l'étape : le « pourquoi », les astuces concrètes, la réassurance vie privée.
const STEP_HELP: ReadonlyArray<{ title: string; tips: string[] }> = [
  {
    title: 'Trouver votre position',
    tips: [
      'Placez-vous devant votre porte, dehors : le GPS capte mal sous un toit.',
      'Restez immobile quelques secondes, la précision s’affine (visez ≤ 15 m).',
      'Sur ordinateur la position vient souvent du réseau, peu précise — préférez votre téléphone, ou saisissez vos coordonnées à la main.',
      'Vos coordonnées exactes ne servent qu’à créer votre adresse.',
    ],
  },
  {
    title: 'Décrire le chemin',
    tips: [
      'Partez d’un repère connu et bien visible : marché, pharmacie, carrefour.',
      'Une indication par étape : « tourner à droite après l’école », « continuer tout droit »…',
      'Réordonnez les étapes intermédiaires par glisser-déposer si besoin.',
      'Terminez par un élément reconnaissable sur place : portail bleu, grand manguier.',
    ],
  },
  {
    title: 'Choisir la catégorie',
    tips: [
      'La catégorie indique le type de lieu : domicile, commerce, bureau…',
      'Elle aide vos visiteurs et le registre à situer l’adresse d’un coup d’œil.',
    ],
  },
  {
    title: 'Ajouter une photo',
    tips: [
      'Photographiez l’entrée telle qu’on la voit depuis la rue.',
      'Cadrez un détail reconnaissable : portail, enseigne, façade.',
      'Une bonne photo lève le dernier doute quand on arrive devant.',
    ],
  },
];

interface FormState {
  gps: StepGpsValue | null;
  instructions: StepInstructionsValue | null;
  category: StepCategoryValue | null;
  photo: StepPhotoValue | null;
}

const EMPTY: FormState = {
  gps: null,
  instructions: null,
  category: null,
  photo: null,
};

export interface AddressFormProps {
  /** Used by tests to drive the form without remounting between steps. */
  initialStep?: number;
}

export function AddressForm({ initialStep = 0 }: AddressFormProps) {
  const router = useRouter();
  const toast = useToast();

  const [step, setStep] = useState(initialStep);
  const [data, setData] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<CreatedAddress | null>(null);
  // Aide contextuelle (bouton « ? » flottant) — affichée en place, par étape.
  const [helpOpen, setHelpOpen] = useState(false);
  // Lecture GPS live (étape 1) — alimente la carte-canvas pendant la capture,
  // avant confirmation. Une fois `data.gps` posé, c'est lui qui prime.
  const [liveReading, setLiveReading] = useState<GpsReading | null>(null);
  // 409 — l'habitant a déjà une adresse à cet endroit (sa propre adresse sur
  // cette localisation, rattachement interne backend ≤ 15 m). On l'oriente vers
  // sa vue propriétaire plutôt que de créer un doublon.
  const [existingCode, setExistingCode] = useState<string | null>(null);

  const goBack = useCallback(() => {
    setStep((current) => Math.max(0, current - 1));
  }, []);

  const handleGps = useCallback((gps: StepGpsValue) => {
    setData((current) => ({ ...current, gps }));
    setStep(1);
  }, []);

  const handleInstructions = useCallback((instructions: StepInstructionsValue) => {
    setData((current) => ({ ...current, instructions }));
    setStep(2);
  }, []);

  const handleCategory = useCallback((category: StepCategoryValue) => {
    setData((current) => ({ ...current, category }));
    setStep(3);
  }, []);

  const handlePhoto = useCallback(
    async (photo: StepPhotoValue) => {
      setData((current) => ({ ...current, photo }));
      const snapshot = { ...data, photo };
      if (!snapshot.gps || !snapshot.instructions || !snapshot.category) {
        toast.show({
          message: 'Une étape est manquante. Reprenez le formulaire.',
          variant: 'error',
        });
        return;
      }
      setSubmitting(true);
      try {
        const result = await api.createAddress({
          // Le quartier est dérivé du GPS côté backend — aucun `quartierId`.
          category: snapshot.category.category,
          steps: snapshot.instructions.steps,
          gpsLat: snapshot.gps.lat,
          gpsLng: snapshot.gps.lng,
          photoUrl: photo.photoUrl,
        });
        setCreated(result);
      } catch (err) {
        // 409 — une adresse de l'habitant existe déjà à cet endroit. On bascule
        // sur un écran dédié (« Voir / modifier ») plutôt que de créer un
        // doublon. Ne jamais parler de « localisation »/« position ».
        if (
          err instanceof ApiError &&
          err.code === 'ADDRESS_ALREADY_EXISTS_AT_LOCATION'
        ) {
          setExistingCode((err.extra?.address_code as string | undefined) ?? '');
          return;
        }
        const message =
          err instanceof ApiError && err.code === 'STEPS_REQUIRED'
            ? 'Au moins 2 étapes d’instructions sont requises.'
            : err instanceof ApiError && err.code === 'CATEGORY_REQUIRED'
              ? 'Veuillez choisir une catégorie.'
              : err instanceof ApiError && err.code === 'COORDINATES_OUT_OF_COVERAGE'
                ? 'Cette position est hors des quartiers couverts par AdresseBJ.'
                : "Impossible de créer l’adresse. Réessayez dans un instant.";
        toast.show({ message, variant: 'error' });
      } finally {
        setSubmitting(false);
      }
    },
    [data, toast],
  );

  if (existingCode !== null) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-bg motif-paper px-4 py-12">
        <AlreadyExistsScreen code={existingCode} />
      </main>
    );
  }

  if (created) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-bg motif-paper px-4 py-12">
        <AddressCreatedScreen code={created.code} />
      </main>
    );
  }

  // Point affiché sur la carte-canvas : position confirmée sinon lecture live.
  const canvasPoint =
    data.gps ?? (liveReading ? { lat: liveReading.lat, lng: liveReading.lng } : null);
  // Anneau / pastille de précision : seulement pendant la capture (pas encore
  // confirmée) et quand l'accuracy est exploitable.
  const liveAccuracy =
    !data.gps && liveReading && liveReading.accuracy > 0
      ? Math.round(liveReading.accuracy)
      : null;

  return (
    <main className="relative min-h-screen bg-bg lg:h-screen lg:overflow-hidden">
      {/* ── CARTE-CANVAS — signature du produit, toujours présente. ── */}
      <div className="fixed inset-x-0 top-0 h-[42vh] z-0 lg:absolute lg:inset-y-0 lg:left-[26rem] lg:right-0 lg:h-auto">
        <LocationCanvas
          point={canvasPoint}
          accuracyRadius={liveAccuracy != null ? liveReading!.accuracy : undefined}
          className="w-full h-full"
        />

        {liveAccuracy != null ? <PrecisionPill accuracy={liveAccuracy} /> : null}

        {/* Chrome flottant minimal — retour + aide (langage `/a/:code`). */}
        <div
          className="absolute inset-x-0 top-0 z-[400] flex items-center justify-between gap-2 p-3 pointer-events-none"
          style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
        >
          <button
            type="button"
            onClick={() => (step > 0 ? goBack() : router.push('/dashboard'))}
            aria-label="Retour"
            className="pointer-events-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-text-primary shadow-md border border-border tap-press hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            aria-label="Aide pour cette étape"
            className="pointer-events-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-text-muted shadow-md border border-border tap-press hover:text-primary transition-colors"
          >
            <HelpCircle className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ── PANNEAU PAPIER — le composer du wizard. ── */}
      <div className="relative z-10 mt-[36vh] lg:mt-0 lg:fixed lg:inset-y-0 lg:left-0 lg:w-[26rem] lg:overflow-y-auto">
        <div className="bg-surface rounded-t-[var(--radius-2xl)] lg:rounded-none border-t lg:border-t-0 lg:border-r border-border shadow-[0_-12px_40px_-12px_rgba(26,20,12,0.18)] lg:shadow-lg min-h-[64vh] lg:min-h-full">
          {/* Poignée décorative (affordance « feuille ») — mobile seulement. */}
          <div className="flex justify-center pt-3 pb-1 lg:hidden" aria-hidden="true">
            <div className="h-1.5 w-10 rounded-full bg-border-strong" />
          </div>

          <div className="px-5 sm:px-7 pt-5 pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-12 flex flex-col gap-7">
            <header className="flex flex-col gap-2.5">
              <p
                id="address-form-title"
                className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-muted"
              >
                Nouvelle adresse
              </p>
              <Stepper current={step} />
              <p className="text-sm text-text-muted">
                Étape {step + 1} sur {STEP_LABELS.length} ·{' '}
                <span className="font-semibold text-text-primary">
                  {STEP_LABELS[step]}
                </span>
              </p>
            </header>

            {submitting ? (
              <div className="flex items-center justify-center gap-2 py-12 text-text-muted">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                <span>Création de votre adresse…</span>
              </div>
            ) : (
              <div key={step} className="animate-step-in">
                {step === 0 ? (
                  <StepGPS
                    value={data.gps}
                    onComplete={handleGps}
                    onReading={setLiveReading}
                    showMap={false}
                  />
                ) : step === 1 ? (
                  <StepInstructions
                    value={data.instructions}
                    onComplete={handleInstructions}
                    gps={data.gps}
                  />
                ) : step === 2 ? (
                  <StepCategory value={data.category} onComplete={handleCategory} />
                ) : step === 3 ? (
                  <StepPhoto
                    value={data.photo}
                    onComplete={(p) => void handlePhoto(p)}
                  />
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Aide contextuelle — contenu propre à l'étape courante, en place. */}
      <Modal
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={STEP_HELP[step]?.title ?? 'Aide'}
      >
        <ul className="flex flex-col gap-3">
          {(STEP_HELP[step]?.tips ?? []).map((tip) => (
            <li key={tip} className="flex items-start gap-2.5">
              <Check
                className="h-4 w-4 mt-0.5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <span className="text-sm leading-relaxed text-text-primary">
                {tip}
              </span>
            </li>
          ))}
        </ul>
      </Modal>
    </main>
  );
}

// Pastille de précision posée sur la carte-canvas (bas-centre).
function PrecisionPill({ accuracy }: { accuracy: number }) {
  const precise = accuracy <= ACCURACY_THRESHOLD_METERS;
  const bad = accuracy > ACCURACY_HARD_CAP_METERS;
  return (
    <div
      aria-hidden="true"
      className="absolute left-1/2 -translate-x-1/2 bottom-4 z-[400] flex items-center gap-2 rounded-full glass px-3.5 py-2 shadow-md pointer-events-none"
    >
      <span
        className={classNames(
          'inline-flex h-2.5 w-2.5 rounded-full',
          precise ? 'bg-success animate-pulse' : bad ? 'bg-danger' : 'bg-warning',
        )}
      />
      <span className="text-sm font-display font-bold tabular-nums text-text-primary">
        ± {accuracy} m
      </span>
    </div>
  );
}

// Barre de progression **segmentée** — un segment par étape, qui se remplit à
// mesure : franchi = plein, actif = à moitié rempli (en cours), à venir = en
// sourdine. Le libellé de l'étape active vit dans l'en-tête, juste en dessous.
function Stepper({ current }: { current: number }) {
  return (
    <ol
      aria-label={`Étape ${current + 1} sur ${STEP_LABELS.length}`}
      className="flex items-center gap-1.5"
    >
      {STEP_LABELS.map((label, idx) => {
        const done = idx < current;
        const active = idx === current;
        return (
          <li
            key={label}
            aria-current={active ? 'step' : undefined}
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-border"
          >
            <span
              aria-hidden="true"
              className={classNames(
                'block h-full rounded-full bg-primary transition-[width] duration-500 ease-out',
                done ? 'w-full' : active ? 'w-1/2' : 'w-0',
              )}
            />
          </li>
        );
      })}
    </ol>
  );
}

// Écran 409 — l'habitant a déjà une adresse à cet endroit. On l'oriente vers sa
// fiche (consultation / modification) au lieu de créer un doublon.
function AlreadyExistsScreen({ code }: { code: string }) {
  return (
    <section
      role="status"
      className="w-full max-w-md flex flex-col items-center text-center gap-5"
    >
      <MapPin
        aria-hidden="true"
        className="h-9 w-9 text-primary"
        strokeWidth={2}
      />

      <div className="flex flex-col gap-1.5">
        <h1 className="font-display font-bold text-2xl text-text-primary">
          Vous avez déjà une adresse à cet endroit.
        </h1>
        <p className="text-text-muted max-w-sm">
          Inutile d’en créer une nouvelle — vous pouvez la consulter ou la
          modifier directement.
        </p>
      </div>

      <div className="w-full flex flex-col gap-3 pt-2">
        {code ? (
          <Link href={`/dashboard/address/${code}`} className="block">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              leadingIcon={<Eye className="h-5 w-5" aria-hidden="true" />}
            >
              Voir / modifier cette adresse
            </Button>
          </Link>
        ) : null}
        <Link href="/dashboard" className="block">
          <Button variant="ghost" size="md" fullWidth>
            Retour à mes adresses
          </Button>
        </Link>
      </div>
    </section>
  );
}

export default AddressForm;
