'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to the console so the digest is visible in production logs; users
    // never see this message.
    console.error('app/error.tsx caught:', error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-bg px-4 py-12">
      <section className="w-full max-w-md flex flex-col items-center text-center gap-5">
        <span
          aria-hidden="true"
          className="flex h-48 w-48 items-center justify-center rounded-full bg-surface-muted shadow-md text-text-muted"
        >
          <AlertTriangle className="h-24 w-24" strokeWidth={1.5} />
        </span>
        <h1 className="font-display font-bold text-2xl text-text-primary">
          Une erreur inattendue s’est produite
        </h1>
        <p className="text-base text-text-muted max-w-sm">
          Nos équipes en ont été informées. Vous pouvez réessayer ou revenir à
          l’accueil.
        </p>
        <div className="flex flex-col gap-4 w-full max-w-sm pt-2">
          <Button
            variant="primary"
            size="lg"
            onClick={() => reset()}
            leadingIcon={<RotateCw className="h-5 w-5" aria-hidden="true" />}
            fullWidth
          >
            Réessayer
          </Button>
          <Link href="/" className="w-full">
            <Button variant="secondary" size="lg" fullWidth>
              Retour à l’accueil
            </Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
