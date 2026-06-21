'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Footprints, Lock, MapPin, type LucideIcon } from 'lucide-react';
import { AddressCodeDisplay } from '@/components/address/AddressCodeDisplay';
import { StepGPS, type StepGpsValue } from '@/components/forms/AddressForm/StepGPS';
import {
  StepInstructions,
  type StepInstructionsValue,
} from '@/components/forms/AddressForm/StepInstructions';
import { StepPhoto, type StepPhotoValue } from '@/components/forms/AddressForm/StepPhoto';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { ApiError, api } from '@/lib/api';
import { buildAssembledText } from '@/lib/utils';
import type { PublicAddress } from '@/types/api';

export interface EditAddressViewProps {
  code: string;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ok'; address: PublicAddress }
  | { kind: 'error' };

export function EditAddressView({ code: rawCode }: EditAddressViewProps) {
  const code = rawCode.toUpperCase();
  const router = useRouter();
  const toast = useToast();

  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const address = await api.ownerAddress(code);
        if (!cancelled) setState({ kind: 'ok', address });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && (err.status === 404 || err.status === 410)) {
          toast.show({
            message: "Cette adresse n'est plus modifiable.",
            variant: 'error',
          });
          router.replace('/dashboard');
        }
        setState({ kind: 'error' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, router, toast]);

  const patchAndAck = useCallback(
    async (
      body: Parameters<typeof api.updateAddress>[1],
      mergeAddress: (current: PublicAddress) => PublicAddress,
      successMessage: string,
    ) => {
      try {
        await api.updateAddress(code, body);
        setState((current) =>
          current.kind === 'ok'
            ? { kind: 'ok', address: mergeAddress(current.address) }
            : current,
        );
        toast.show({ message: successMessage, variant: 'success' });
        router.push(`/dashboard/address/${code}`);
      } catch {
        toast.show({
          message: "Impossible d'enregistrer la modification. Réessayez.",
          variant: 'error',
        });
      }
    },
    [code, router, toast],
  );

  const handlePhoto = useCallback(
    (value: StepPhotoValue) =>
      patchAndAck(
        { photoUrl: value.photoUrl },
        (addr) => ({ ...addr, photoUrl: value.photoUrl }),
        'Photo mise à jour.',
      ),
    [patchAndAck],
  );

  const handleInstructions = useCallback(
    (value: StepInstructionsValue) =>
      patchAndAck(
        {
          instructions: {
            steps: value.steps,
            assembledText: value.assembledText,
          },
        },
        (addr) => ({
          ...addr,
          instructions: {
            steps: value.steps,
            assembledText: value.assembledText || buildAssembledText(value.steps),
          },
        }),
        'Instructions mises à jour.',
      ),
    [patchAndAck],
  );

  const handleGps = useCallback(
    (value: StepGpsValue) =>
      patchAndAck(
        { coordinates: { lat: value.lat, lng: value.lng } },
        (addr) => ({ ...addr, gps: { lat: value.lat, lng: value.lng } }),
        'Position mise à jour.',
      ),
    [patchAndAck],
  );

  if (state.kind === 'loading') {
    return (
      <section className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-6 flex flex-col gap-6">
        <Skeleton width={200} height={28} />
        <Skeleton width="100%" height={120} count={3} />
      </section>
    );
  }

  if (state.kind === 'error') {
    return (
      <section
        role="alert"
        className="mx-auto w-full max-w-md px-4 sm:px-6 py-12 text-center"
      >
        <p className="text-text-primary">Impossible de charger cette adresse.</p>
      </section>
    );
  }

  const { address } = state;

  return (
    <section className="mx-auto w-full max-w-2xl px-4 sm:px-6 pt-6 pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-12 flex flex-col gap-6">
      <Link
        href={`/dashboard/address/${code}`}
        className="text-sm text-text-muted hover:text-text-primary inline-flex items-center gap-1 self-start"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Retour à l’adresse
      </Link>

      <header className="flex flex-col gap-2 animate-fade-up">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
          Modifier
        </p>
        <h1 className="font-display font-black text-h1 text-text-primary">
          Modifier mon adresse
        </h1>
        <div className="mt-1 flex flex-col gap-2">
          <AddressCodeDisplay code={address.code} size="sm" showCopyButton={false} />
          <p className="text-xs text-text-muted inline-flex items-center gap-1.5">
            <Lock className="h-3 w-3" aria-hidden="true" /> Le code ne change
            jamais : c’est le nom unique de votre adresse.
          </p>
        </div>
      </header>

      <EditSection
        icon={Camera}
        title="Photo du portail"
        description="Changez la photo si votre entrée a changé, ou si l'ancienne n'est pas assez nette."
        delay="60ms"
      >
        <StepPhoto
          value={{ photoUrl: address.photoUrl }}
          onComplete={(v) => void handlePhoto(v)}
          submitLabel="Continuer"
        />
      </EditSection>

      <EditSection
        icon={Footprints}
        title="Les derniers mètres"
        description="Reformulez vos repères pour que vos visiteurs suivent les derniers mètres jusqu'à votre porte sans hésitation."
        delay="120ms"
      >
        <StepInstructions
          value={{
            steps: address.instructions.steps,
            assembledText: address.instructions.assembledText,
          }}
          onComplete={(v) => void handleInstructions(v)}
        />
      </EditSection>

      <EditSection
        icon={MapPin}
        title="Position GPS"
        description="Reprenez la position depuis votre porte pour plus de précision."
        delay="180ms"
      >
        <StepGPS
          value={{ lat: address.gps.lat, lng: address.gps.lng }}
          onComplete={(v) => void handleGps(v)}
        />
      </EditSection>
    </section>
  );
}

function EditSection({
  icon: Icon,
  title,
  description,
  delay,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  delay?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="card p-5 sm:p-6 flex flex-col gap-4 animate-fade-up"
      style={delay ? { animationDelay: delay } : undefined}
    >
      <header className="flex items-start gap-3.5">
        <span
          aria-hidden="true"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-surface text-primary ring-1 ring-primary/15"
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="font-display font-bold text-h3 text-text-primary">
            {title}
          </h2>
          <p className="text-sm text-text-muted">{description}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

export default EditAddressView;
