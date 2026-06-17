'use client';

import { use, useRef } from 'react';
import Link from 'next/link';
import { Download, Printer, Share2, X } from 'lucide-react';
import { QRCodeDisplay } from '@/components/address/QRCodeDisplay';
import { ShareButton } from '@/components/address/ShareButton';
import { Button } from '@/components/ui/Button';

interface RouteParams {
  params: Promise<{ code: string }>;
}

const ROOT = 'https://adressebj.com';

export default function ShareAddressPage({ params }: RouteParams) {
  const { code: rawCode } = use(params);
  const code = rawCode.toUpperCase();
  const shareUrl = `${ROOT}/a/${code}`;
  const whatsappText = `Mon adresse AdresseBJ : ${code} → ${shareUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

  const qrWrapperRef = useRef<HTMLDivElement | null>(null);

  const downloadImage = () => {
    const canvas = qrWrapperRef.current?.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${code}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const openPrint = () => {
    window.open(
      `/dashboard/address/${code}/print?autoprint=true`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const openWhatsApp = () => {
    if (typeof navigator.share === 'function') {
      navigator
        .share({ title: 'AdresseBJ', text: whatsappText, url: shareUrl })
        .catch(() => {
          window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
        });
      return;
    }
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="mx-auto w-full max-w-2xl flex flex-col min-h-full">
      {/* App bar — close + title */}
      <header className="flex items-center gap-4 px-4 h-16 w-full bg-surface">
        <Link
          href={`/dashboard/address/${code}`}
          aria-label="Fermer"
          className="w-10 h-10 flex items-center justify-center rounded-full text-text-primary hover:bg-surface-muted transition-colors active:scale-90"
        >
          <X className="h-6 w-6" aria-hidden="true" />
        </Link>
        <h1 className="font-display font-semibold text-2xl text-primary">
          Code QR de l'adresse
        </h1>
      </header>

      <section className="flex-1 w-full px-4 pb-12 flex flex-col items-center">
        {/* QR card */}
        <div
          ref={qrWrapperRef}
          className="w-full max-w-sm aspect-square card rounded-xl p-8 flex items-center justify-center mb-8 mt-4 [&_canvas]:!w-full [&_canvas]:!h-full"
        >
          <QRCodeDisplay url={shareUrl} code={code} size={512} showDownload={false} />
        </div>

        {/* Identity */}
        <div className="text-center space-y-1 mb-10">
          <h2 className="font-display font-bold text-[32px] leading-tight text-primary">
            {code}
          </h2>
          <p className="text-base text-text-muted break-all">{shareUrl}</p>
        </div>

        {/* Actions */}
        <div className="w-full max-w-sm flex flex-col gap-4">
          <Button
            type="button"
            variant="primary"
            size="lg"
            fullWidth
            className="rounded-xl"
            onClick={downloadImage}
            leadingIcon={<Download className="h-5 w-5" aria-hidden="true" />}
          >
            Télécharger l'image
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            fullWidth
            className="rounded-xl"
            onClick={openWhatsApp}
            leadingIcon={<Share2 className="h-5 w-5" aria-hidden="true" />}
          >
            Partager
          </Button>
          <ShareButton
            url={shareUrl}
            variant="ghost"
            size="md"
            fullWidth
            preferNativeShare={false}
          >
            Copier le lien
          </ShareButton>
          <Button
            type="button"
            variant="ghost"
            size="md"
            fullWidth
            onClick={openPrint}
            leadingIcon={<Printer className="h-4 w-4" aria-hidden="true" />}
          >
            Imprimer le QR
          </Button>
        </div>

        <p className="mt-10 text-xs text-text-muted text-center leading-relaxed px-4">
          Scannez ce code pour accéder instantanément aux instructions d'accès.
        </p>
      </section>
    </div>
  );
}
