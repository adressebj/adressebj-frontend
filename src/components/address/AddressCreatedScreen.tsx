'use client';

import { useRouter } from 'next/navigation';
import { CheckCircle2, MessageCircle, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export interface AddressCreatedScreenProps {
  code: string;
  shareUrl: string;
  whatsappUrl: string;
}

export function AddressCreatedScreen({
  code,
  shareUrl,
  whatsappUrl,
}: AddressCreatedScreenProps) {
  const router = useRouter();

  return (
    <section
      role="status"
      aria-live="polite"
      className="mx-auto w-full max-w-md flex flex-col items-center text-center gap-5 py-6"
    >
      {/* Petit burst de célébration : 2 anneaux concentriques expansent
         derrière le check, puis se dissipent. L'icône reste statique en
         relief sur le succès. */}
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
        className="font-display font-bold text-[36px] leading-[40px] text-primary tracking-wider animate-fade-up stagger-2"
      >
        {code}
      </p>

      <div className="animate-fade-up stagger-3">
        <Badge variant="warning" size="md">
          En attente de validation
        </Badge>
      </div>

      <p className="text-text-muted animate-fade-up stagger-4">
        Votre adresse sera examinée par un modérateur sous 48h.
      </p>

      <div className="w-full flex flex-col gap-3 pt-2">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={() => window.open(whatsappUrl, '_blank', 'noopener,noreferrer')}
          leadingIcon={<MessageCircle className="h-5 w-5" aria-hidden="true" />}
        >
          Partager via WhatsApp
        </Button>
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onClick={() => router.push(`/dashboard/address/${code}/share`)}
          leadingIcon={<QrCode className="h-5 w-5" aria-hidden="true" />}
        >
          Afficher le QR Code
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

      <p className="sr-only">{shareUrl}</p>
    </section>
  );
}

export default AddressCreatedScreen;
