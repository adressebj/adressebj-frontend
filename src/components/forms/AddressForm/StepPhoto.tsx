'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Lightbulb, RotateCw, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { uploadPortalPhoto } from '@/lib/cloudinary';

export interface StepPhotoValue {
  photoUrl: string;
}

export interface StepPhotoProps {
  value: StepPhotoValue | null;
  onComplete: (value: StepPhotoValue) => void;
  /** Final submit label. Creation flow uses "Créer mon adresse" (default);
      the edit flow overrides with "Continuer". */
  submitLabel?: string;
}

type UploadState = 'idle' | 'uploading' | 'error';

export function StepPhoto({
  value,
  onComplete,
  submitLabel = 'Créer mon adresse',
}: StepPhotoProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(value?.photoUrl ?? null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [error, setError] = useState<string | null>(null);

  // Free the ObjectURL when the file changes or the component unmounts.
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handlePick = () => fileInputRef.current?.click();

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    if (!picked) return;
    setFile(picked);
    setPhotoUrl(null);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploadState('uploading');
    setError(null);
    try {
      const url = await uploadPortalPhoto(file);
      setPhotoUrl(url);
      setUploadState('idle');
    } catch (err) {
      setUploadState('error');
      setError(err instanceof Error ? err.message : "Échec de l'envoi de la photo.");
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!photoUrl) return;
    onComplete({ photoUrl });
  };

  // Prefer the local preview so the user always sees the file they actually
  // picked — even after the upload returns a different remote URL. Fall back
  // to the stored URL (edit-page case where we boot up with an existing
  // address but no fresh file).
  const displaySrc = previewUrl ?? photoUrl;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h2 className="font-display font-semibold text-h3 text-text-primary">
          Photo de l’entrée
        </h2>
        <p className="text-sm text-text-muted">
          Dernière étape&nbsp;! Ajoutez une photo claire pour faciliter
          l’identification de votre adresse sur le terrain.
        </p>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="sr-only"
        aria-label="Sélectionnez une photo"
      />

      <div className="flex flex-col gap-3">
        {displaySrc ? (
          <div className="relative w-full h-64 bg-surface-muted overflow-hidden rounded-md border border-dashed border-border">
            {/* Plain <img> on purpose — next/image rejects blob: URLs that
                URL.createObjectURL produces, leaving the preview empty. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displaySrc}
              alt="Aperçu de la photo du portail"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={handlePick}
            className="group w-full aspect-video flex flex-col items-center justify-center gap-4 p-6 bg-surface-muted border-2 border-dashed border-border-strong rounded-xl text-text-muted hover:border-primary transition-colors cursor-pointer"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface shadow-sm text-primary group-hover:scale-105 transition-transform duration-300">
              <Camera className="h-8 w-8" aria-hidden="true" />
            </span>
            <span className="flex flex-col items-center text-center gap-1">
              <span className="text-base font-semibold text-text-primary">
                Prendre une photo ou choisir dans la galerie
              </span>
              <span className="text-sm text-text-muted">
                Format JPG, PNG (Max 5MB)
              </span>
            </span>
          </button>
        )}

        {displaySrc ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handlePick}
            leadingIcon={<Camera className="h-4 w-4" aria-hidden="true" />}
          >
            Choisir une autre photo
          </Button>
        ) : null}
      </div>

      {/* Conseil cadrage */}
      <div className="flex items-start gap-2.5 rounded-md bg-primary-surface border border-primary/20 px-4 py-3">
        <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-sm text-text-primary leading-relaxed">
          <span className="font-semibold">Conseil&nbsp;:</span> prenez une photo
          claire de l’entrée principale, vue depuis la rue. Assurez-vous que la
          luminosité soit suffisante.
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        {!photoUrl ? (
          <Button
            type="button"
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => void handleUpload()}
            disabled={!file || uploadState === 'uploading'}
            loading={uploadState === 'uploading'}
            leadingIcon={<Upload className="h-4 w-4" aria-hidden="true" />}
          >
            {uploadState === 'uploading' ? 'Upload en cours…' : 'Uploader la photo'}
          </Button>
        ) : null}

        {uploadState === 'error' ? (
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => void handleUpload()}
            leadingIcon={<RotateCw className="h-4 w-4" aria-hidden="true" />}
          >
            Réessayer
          </Button>
        ) : null}

        <Button type="submit" variant="primary" size="lg" disabled={!photoUrl} fullWidth>
          {photoUrl ? submitLabel : 'En attente de la photo'}
        </Button>
      </div>
    </form>
  );
}

export default StepPhoto;
