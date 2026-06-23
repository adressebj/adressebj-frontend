'use client';

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Download, MessageCircle, Printer, Share2, X } from 'lucide-react';
import { QRCodeDisplay } from '@/components/address/QRCodeDisplay';
import { ShareButton } from '@/components/address/ShareButton';
import { Button } from '@/components/ui/Button';

interface RouteParams {
  params: Promise<{ code: string }>;
}

// Domaine public réel du site (le lien partagé / QR doit ouvrir la vraie page).
// Surchargé par NEXT_PUBLIC_SITE_URL si un domaine propre est configuré.
const ROOT = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://adressebj.vercel.app';

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

  // WhatsApp explicite et fiable : on ouvre toujours wa.me (mobile → l'appli,
  // desktop → WhatsApp Web). Pas de Web Share API ici, pour garantir WhatsApp.
  const openWhatsApp = () => {
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  // « Plus d'options » : feuille de partage native (Telegram, SMS, e-mail, …).
  // Affichée seulement si l'API existe (détectée après montage → pas de
  // divergence d'hydratation).
  const [canNativeShare, setCanNativeShare] = useState(false);
  useEffect(() => {
    // Détection post-montage (l'API n'existe pas au SSR) → démarre `false` des
    // deux côtés, pas de divergence d'hydratation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanNativeShare(
      typeof navigator !== 'undefined' && typeof navigator.share === 'function',
    );
  }, []);
  const shareNative = () => {
    navigator
      .share({ title: 'AdresseBJ', text: whatsappText, url: shareUrl })
      .catch(() => {});
  };

  return (
    <div className="mx-auto w-full max-w-2xl flex flex-col min-h-full">
      {/* App bar — close + title */}
      <header className="flex items-center gap-4 px-4 h-16 w-full">
        <Link
          href={`/dashboard/address/${code}`}
          aria-label="Fermer"
          className="w-10 h-10 flex items-center justify-center rounded-full text-text-primary hover:bg-surface-muted transition-colors active:scale-90"
        >
          <X className="h-6 w-6" aria-hidden="true" />
        </Link>
        <h1 className="font-display font-bold text-2xl text-text-primary">
          Code QR de l’adresse
        </h1>
      </header>

      <section className="flex-1 w-full px-4 pb-12 flex flex-col items-center">
        {/* Plaque QR — cadre papier + liseré or (langage « plaque » de la fiche). */}
        <div
          ref={qrWrapperRef}
          className="w-full max-w-sm aspect-square card rounded-[var(--radius-xl)] ring-1 ring-accent/25 p-8 flex items-center justify-center mb-8 mt-4 [&_canvas]:!w-full [&_canvas]:!h-full animate-fade-up"
        >
          <QRCodeDisplay url={shareUrl} code={code} size={512} showDownload={false} />
        </div>

        {/* Identity — le code comme objet typographique signature. */}
        <div className="text-center space-y-1 mb-10 animate-fade-up stagger-1">
          <h2 className="code-type text-3xl sm:text-[32px] font-black leading-tight text-primary">
            {code}
          </h2>
          <p className="text-base text-text-muted break-all">{shareUrl}</p>
        </div>

        {/* Actions — WhatsApp en premier (au minimum), puis les autres canaux. */}
        <div className="w-full max-w-sm flex flex-col gap-3">
          <Button
            type="button"
            variant="primary"
            size="lg"
            fullWidth
            className="rounded-xl !bg-[#25D366] hover:!bg-[#1FAE55] !border-transparent !text-white"
            onClick={openWhatsApp}
            leadingIcon={<MessageCircle className="h-5 w-5" aria-hidden="true" />}
          >
            Partager sur WhatsApp
          </Button>
          {canNativeShare ? (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              fullWidth
              className="rounded-xl"
              onClick={shareNative}
              leadingIcon={<Share2 className="h-5 w-5" aria-hidden="true" />}
            >
              Plus d’options de partage
            </Button>
          ) : null}
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
            onClick={downloadImage}
            leadingIcon={<Download className="h-4 w-4" aria-hidden="true" />}
          >
            Télécharger l’image
          </Button>
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
          Scannez ce code pour ouvrir l’adresse et ses repères d’accès.
        </p>
      </section>
    </div>
  );
}
