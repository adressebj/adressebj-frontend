'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Home, MapPinOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex items-center justify-center bg-bg px-4 py-12 relative overflow-hidden">
      {/* Watermark « 404 » en arrière-plan */}
      <span
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-display font-bold text-[180px] text-border/40 select-none whitespace-nowrap pointer-events-none"
      >
        404
      </span>

      <section className="relative z-10 w-full max-w-md flex flex-col items-center text-center gap-6">
        {/* Illustration — pin perdu */}
        <span aria-hidden="true" className="text-primary drop-shadow-md">
          <MapPinOff className="h-28 w-28" strokeWidth={1.5} />
        </span>

        <h1 className="font-display font-bold text-2xl text-text-primary">
          Oups&nbsp;! Page introuvable
        </h1>
        <p className="text-base text-text-muted max-w-[320px]">
          Il semblerait que vous ayez suivi un lien rompu, ou que cette page ait
          été déplacée vers une autre adresse.
        </p>

        <div className="w-full flex flex-col gap-4 items-center">
          <Link href="/" className="w-full sm:w-[240px]">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              className="rounded-xl"
              leadingIcon={<Home className="h-5 w-5" aria-hidden="true" />}
            >
              Retour à l’accueil
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="lg"
            onClick={() => router.back()}
            className="w-full sm:w-[240px] rounded-xl !text-primary"
            leadingIcon={<ArrowLeft className="h-5 w-5" aria-hidden="true" />}
          >
            Page précédente
          </Button>
        </div>
      </section>
    </main>
  );
}
