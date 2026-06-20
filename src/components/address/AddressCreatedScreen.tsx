'use client';

import { useRouter } from 'next/navigation';
import { CheckCircle2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export interface AddressCreatedScreenProps {
  code: string;
}

export function AddressCreatedScreen({ code }: AddressCreatedScreenProps) {
  const router = useRouter();

  return (
    <section
      role="status"
      aria-live="polite"
      className="mx-auto w-full max-w-md flex flex-col items-center text-center gap-5 py-6"
    >
      {/* Petit burst de célébration : 2 anneaux concentriques expansent
         derrière le check, puis se dissipent. */}
      <div className="relative flex h-20 w-20 items-center justify-center animate-fade-up">
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-success/30 animate-burst"
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-success/20 animate-burst"
          style={{ animationDelay: '160ms' }}
        />
        <span
          aria-hidden="true"
          className="absolute inset-2 rounded-full bg-success/10"
        />
        <CheckCircle2
          className="h-16 w-16 text-success relative drop-shadow-sm"
          strokeWidth={2}
          aria-hidden="true"
        />
      </div>

      <h1 className="font-display font-bold text-2xl text-text-primary animate-fade-up stagger-1">
        Adresse créée&nbsp;!
      </h1>

      <p
        aria-label={`Code de votre adresse : ${code}`}
        className="code-type inline-flex items-center rounded-[var(--radius-lg)] border border-accent/40 bg-primary-surface px-6 py-3 text-3xl sm:text-4xl font-black text-primary animate-fade-up stagger-2"
      >
        {code}
      </p>

      <div className="animate-fade-up stagger-3">
        <Badge variant="warning" size="md">
          En attente de validation
        </Badge>
      </div>

      <p className="text-text-muted animate-fade-up stagger-4">
        Votre adresse est en cours de validation. Vous serez notifié dès sa
        publication&nbsp;; vos liens seront actifs à ce moment-là.
      </p>

      <div className="w-full flex flex-col gap-3 pt-2">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={() => router.push(`/dashboard/address/${code}`)}
          leadingIcon={<Eye className="h-5 w-5" aria-hidden="true" />}
        >
          Voir mon adresse
        </Button>
        <Button
          variant="ghost"
          size="md"
          fullWidth
          onClick={() => router.push('/dashboard')}
        >
          Retour à mes adresses
        </Button>
      </div>
    </section>
  );
}

export default AddressCreatedScreen;
