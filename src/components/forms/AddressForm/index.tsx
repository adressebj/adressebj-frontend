'use client';

import { Fragment, useCallback, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, HelpCircle, Loader2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { AddressCodeDisplay } from '@/components/address/AddressCodeDisplay';
import { ApiError, api } from '@/lib/api';
import { classNames } from '@/lib/utils';
import { AddressCreatedScreen } from '@/components/address/AddressCreatedScreen';
import { StepQuartier, type StepQuartierValue } from './StepQuartier';
import { StepGPS, type StepGpsValue } from './StepGPS';
import { StepInstructions, type StepInstructionsValue } from './StepInstructions';
import { StepCategory, type StepCategoryValue } from './StepCategory';
import { StepPhoto, type StepPhotoValue } from './StepPhoto';
import type { CreatedAddress, PublicAddress } from '@/types/api';

// 5 étapes — CDC v5 §4 : Quartier → GPS → Instructions → Catégorie → Photo.
const STEP_LABELS = ['Quartier', 'GPS', 'Infos', 'Type', 'Photo'] as const;

interface FormState {
  quartier: StepQuartierValue | null;
  gps: StepGpsValue | null;
  instructions: StepInstructionsValue | null;
  category: StepCategoryValue | null;
  photo: StepPhotoValue | null;
}

const EMPTY: FormState = {
  quartier: null,
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

  // Duplicate detection — between GPS capture and the instructions step we
  // look for existing addresses within ~15 m and, if any, interrupt the flow
  // so the user can attach to one instead of creating a redundant entry.
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [nearby, setNearby] = useState<PublicAddress[] | null>(null);

  const goBack = useCallback(() => {
    setStep((current) => Math.max(0, current - 1));
  }, []);

  const handleQuartier = useCallback((quartier: StepQuartierValue) => {
    setData((current) => ({ ...current, quartier }));
    setStep(1);
  }, []);

  const handleGps = useCallback(async (gps: StepGpsValue) => {
    setData((current) => ({ ...current, gps }));
    setCheckingDuplicates(true);
    try {
      const found = await api.nearbyAddresses(gps.lat, gps.lng, 15);
      if (found.length > 0) {
        setNearby(found);
        return; // hold on the interstitial; user decides what to do next
      }
    } catch {
      // A failed proximity check must never block creation — fall through.
    } finally {
      setCheckingDuplicates(false);
    }
    setStep(2);
  }, []);

  const handleCreateAnyway = useCallback(() => {
    setNearby(null);
    setStep(2);
  }, []);

  const handleAttach = useCallback(
    (code: string) => {
      router.push(`/a/${code}`);
    },
    [router],
  );

  const handleInstructions = useCallback((instructions: StepInstructionsValue) => {
    setData((current) => ({ ...current, instructions }));
    setStep(3);
  }, []);

  const handleCategory = useCallback((category: StepCategoryValue) => {
    setData((current) => ({ ...current, category }));
    setStep(4);
  }, []);

  const handlePhoto = useCallback(
    async (photo: StepPhotoValue) => {
      setData((current) => ({ ...current, photo }));
      const snapshot = { ...data, photo };
      if (
        !snapshot.quartier ||
        !snapshot.gps ||
        !snapshot.instructions ||
        !snapshot.category
      ) {
        toast.show({
          message: 'Une étape est manquante. Reprenez le formulaire.',
          variant: 'error',
        });
        return;
      }
      setSubmitting(true);
      try {
        const result = await api.createAddress({
          quartierId: snapshot.quartier.quartierId,
          category: snapshot.category.category,
          steps: snapshot.instructions.steps,
          gpsLat: snapshot.gps.lat,
          gpsLng: snapshot.gps.lng,
          photoUrl: photo.photoUrl,
        });
        setCreated(result);
      } catch (err) {
        // 409 — un autre habitant a déjà créé une adresse à la même position
        // pendant que l'utilisateur remplissait le formulaire. On redirige
        // directement vers la fiche existante (CDC Frontend §7 : pas de
        // doublon possible côté backend même si l'interstitiel 15 m a été
        // contourné par "Créer quand même").
        if (
          err instanceof ApiError &&
          err.code === 'ADDRESS_ALREADY_EXISTS_AT_LOCATION'
        ) {
          const existingCode = err.extra?.address_code as string | undefined;
          toast.show({
            message: existingCode
              ? `Une adresse (${existingCode}) existe déjà à cette position. Vous y êtes redirigé.`
              : 'Une adresse existe déjà à cette position.',
            variant: 'info',
          });
          if (existingCode) {
            router.push(`/a/${existingCode}`);
          }
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
    [data, toast, router],
  );

  if (created) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-8">
        <AddressCreatedScreen
          code={created.code}
          shareUrl={created.shareUrl}
          whatsappUrl={created.whatsappUrl}
        />
      </div>
    );
  }

  return (
    <section
      aria-labelledby="address-form-title"
      className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-6 flex flex-col gap-6"
    >
      <header className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => (step > 0 ? goBack() : router.push('/dashboard'))}
            aria-label="Retour"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-text-primary hover:bg-surface-muted"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <h1
            id="address-form-title"
            className="font-display font-black text-h3 text-text-primary"
          >
            Créer une adresse
          </h1>
          <Link
            href="/"
            aria-label="Aide"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-text-muted hover:bg-surface-muted"
          >
            <HelpCircle className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
        <Stepper current={step} />
      </header>

      <div className="card p-4 sm:p-5">
        {submitting ? (
          <div className="flex items-center justify-center gap-2 py-12 text-text-muted">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            <span>Création de votre adresse…</span>
          </div>
        ) : checkingDuplicates ? (
          <div className="flex items-center justify-center gap-2 py-12 text-text-muted">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            <span>Vérification des adresses proches…</span>
          </div>
        ) : nearby ? (
          <DuplicateInterstitial
            addresses={nearby}
            onAttach={handleAttach}
            onCreateAnyway={handleCreateAnyway}
          />
        ) : step === 0 ? (
          <StepQuartier value={data.quartier} onComplete={handleQuartier} />
        ) : step === 1 ? (
          <StepGPS
            value={data.gps}
            onComplete={handleGps}
            quartierName={data.quartier?.quartierName ?? null}
            quartierPolygon={data.quartier?.quartierPolygon ?? null}
          />
        ) : step === 2 ? (
          <StepInstructions
            value={data.instructions}
            onComplete={handleInstructions}
          />
        ) : step === 3 ? (
          <StepCategory
            value={data.category}
            onComplete={handleCategory}
          />
        ) : step === 4 ? (
          <StepPhoto value={data.photo} onComplete={(p) => void handlePhoto(p)} />
        ) : null}
      </div>
    </section>
  );
}

// Stepper à pastilles **losange** — écho du motif Fon/kente de la marque
// (cf. `CategoryMedallion`, `StepsList`). Étape complétée = losange vert plein +
// check, active = losange papier liseré vert + numéro, future = losange muet.
// La plaque tourne à 45°, le contenu reste droit (contre-rotation implicite :
// le numéro/icône vit dans une couche non tournée par-dessus).
function Stepper({ current }: { current: number }) {
  return (
    <div aria-label={`Étape ${current + 1} sur ${STEP_LABELS.length}`}>
      <ol className="flex items-center">
        {STEP_LABELS.map((label, idx) => {
          const done = idx < current;
          const active = idx === current;
          return (
            <Fragment key={label}>
              <li className="flex flex-col items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="relative flex h-8 w-8 items-center justify-center"
                >
                  <span
                    className={classNames(
                      'absolute inset-0 rotate-45 rounded-[7px] border-2 transition-colors',
                      done
                        ? 'bg-primary border-primary'
                        : active
                          ? 'bg-primary-surface border-primary'
                          : 'bg-surface border-border',
                    )}
                  />
                  <span
                    className={classNames(
                      'relative text-sm font-semibold',
                      done
                        ? 'text-text-inverse'
                        : active
                          ? 'text-primary'
                          : 'text-text-muted',
                    )}
                  >
                    {done ? <Check className="h-4 w-4" /> : idx + 1}
                  </span>
                </span>
                <span
                  className={classNames(
                    'text-xs',
                    active
                      ? 'font-semibold text-primary'
                      : done
                        ? 'text-text-primary'
                        : 'text-text-muted',
                  )}
                >
                  {label}
                </span>
              </li>
              {idx < STEP_LABELS.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={classNames(
                    'h-0.5 flex-1 mx-1 -mt-5 rounded-full transition-colors',
                    idx < current ? 'bg-primary' : 'bg-border',
                  )}
                />
              ) : null}
            </Fragment>
          );
        })}
      </ol>
    </div>
  );
}

interface DuplicateInterstitialProps {
  addresses: PublicAddress[];
  onAttach: (code: string) => void;
  onCreateAnyway: () => void;
}

function DuplicateInterstitial({
  addresses,
  onAttach,
  onCreateAnyway,
}: DuplicateInterstitialProps) {
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h2 className="font-display font-bold text-h3 text-text-primary">
          Des adresses existent près de vous
        </h2>
        <p className="text-sm text-text-muted">
          Il y a peut-être déjà une adresse ici. Rejoignez-en une plutôt que
          d’en créer une en double, ou continuez si la vôtre est vraiment
          différente.
        </p>
      </header>

      <ul className="flex flex-col gap-3">
        {addresses.map((address) => (
          <li
            key={address.code}
            className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-3 shadow-sm"
          >
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-surface-muted">
              <Image
                src={address.photoUrl}
                alt={`Portail ${address.code}`}
                fill
                sizes="64px"
                className="object-cover"
                unoptimized
              />
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <AddressCodeDisplay
                code={address.code}
                size="sm"
                showCopyButton={false}
              />
              <p className="text-xs text-text-muted line-clamp-2">
                {address.instructions.assembledText}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onAttach(address.code)}
              className="shrink-0"
            >
              Se rattacher
            </Button>
          </li>
        ))}
      </ul>

      <Button
        type="button"
        variant="primary"
        size="lg"
        fullWidth
        onClick={onCreateAnyway}
        leadingIcon={<MapPin className="h-4 w-4" aria-hidden="true" />}
      >
        Créer quand même une nouvelle adresse
      </Button>
    </div>
  );
}

export default AddressForm;
