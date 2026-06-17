'use client';

import { useEffect, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface QRCodeDisplayProps {
  url: string;
  code: string;
  size?: number;
  showDownload?: boolean;
  className?: string;
}

export function QRCodeDisplay({
  url,
  code,
  size = 256,
  showDownload = true,
  className,
}: QRCodeDisplayProps) {
  // qrcode.react renders an internal <canvas>; we expose it via a wrapping
  // ref so a download button can pull a PNG without forking the library.
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // No-op effect kept as a hook anchor in case future versions of
    // qrcode.react add an imperative API we want to subscribe to.
  }, [url]);

  const handleDownload = () => {
    const canvas = wrapperRef.current?.querySelector('canvas');
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${code}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className={className}>
      <div
        ref={wrapperRef}
        className="inline-block bg-surface p-3 border border-dashed border-border rounded-md"
        data-testid="qr-canvas-wrapper"
      >
        <QRCodeCanvas
          value={url}
          size={size}
          level="M"
          marginSize={1}
          fgColor="#1A7F50"
          aria-label={`Code QR pour l'adresse ${code}`}
        />
      </div>
      {showDownload ? (
        <div className="mt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            leadingIcon={<Download className="h-4 w-4" aria-hidden="true" />}
          >
            Télécharger le QR
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default QRCodeDisplay;
