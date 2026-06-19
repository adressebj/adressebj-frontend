'use client';

import { use, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { QRCodeDisplay } from '@/components/address/QRCodeDisplay';

interface RouteParams {
  params: Promise<{ code: string }>;
}

const ROOT = 'adressebj.com';

export default function PrintAddressPage({ params }: RouteParams) {
  const { code: rawCode } = use(params);
  const code = rawCode.toUpperCase();
  const searchParams = useSearchParams();
  const autoPrint = searchParams?.get('autoprint') === 'true';

  const shareUrl = `https://${ROOT}/a/${code}`;

  useEffect(() => {
    if (!autoPrint) return;
    // Defer one frame so the browser has actually painted the QR canvas
    // before opening the system print dialog.
    const id = window.requestAnimationFrame(() => {
      window.print();
    });
    return () => window.cancelAnimationFrame(id);
  }, [autoPrint]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-bg p-6">
      <article className="print-content w-full max-w-md bg-surface border border-border shadow-sm rounded-lg p-6 sm:p-10 flex flex-col items-center gap-6">
        <h1 className="font-display font-bold text-h2 text-text-primary">
          Adresse<span className="text-primary">BJ</span>
        </h1>

        <QRCodeDisplay url={shareUrl} code={code} size={300} showDownload={false} />

        <div className="flex flex-col items-center gap-2">
          <p
            className="code-type font-black tracking-[0.08em] text-display text-text-primary"
            aria-label={`Code adresse ${code}`}
          >
            {code}
          </p>
          <p className="text-sm text-text-muted">
            {ROOT}/a/{code}
          </p>
        </div>

        <p className="text-xs text-text-muted text-center max-w-xs">
          Scannez ce QR code pour ouvrir l’adresse dans votre navigateur.
        </p>
      </article>
    </main>
  );
}
