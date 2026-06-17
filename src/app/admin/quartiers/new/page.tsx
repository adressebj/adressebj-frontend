'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';

const MapPreview = dynamic(
  () => import('@/components/map/MapNavigator').then((m) => m.MapNavigator),
  {
    ssr: false,
    loading: () => <div className="w-full h-[260px] bg-surface-muted animate-pulse" />,
  },
);

const COMMUNES = ['Cotonou', 'Calavi', 'Abomey-Calavi'] as const;
const ALPHABET_FILTER = /[^A-Z]/g;

function autoPrefix(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(ALPHABET_FILTER, '')
    .slice(0, 3);
}

export default function NewQuartierPage() {
  const router = useRouter();
  const toast = useToast();

  const [name, setName] = useState('');
  const [prefix, setPrefix] = useState('');
  const [commune, setCommune] = useState<(typeof COMMUNES)[number]>('Cotonou');
  const [lat, setLat] = useState('6.37');
  const [lng, setLng] = useState('2.41');
  const [submitting, setSubmitting] = useState(false);

  const computedPrefix = useMemo(() => autoPrefix(name), [name]);
  const effectivePrefix = prefix || computedPrefix;

  const parsedCoords = useMemo(() => {
    const parsedLat = Number.parseFloat(lat);
    const parsedLng = Number.parseFloat(lng);
    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) return null;
    if (parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) {
      return null;
    }
    return { lat: parsedLat, lng: parsedLng };
  }, [lat, lng]);

  const canSubmit =
    name.trim().length > 0 &&
    effectivePrefix.length === 3 &&
    parsedCoords !== null &&
    !submitting;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await api.adminCreateQuartier({
        name: name.trim(),
        prefix: effectivePrefix,
        commune,
        coordinates: parsedCoords ?? undefined,
      });
      toast.show({ message: `Quartier ${effectivePrefix} créé.`, variant: 'success' });
      router.push('/admin/quartiers');
    } catch {
      toast.show({
        message: "Impossible de créer le quartier. Réessayez.",
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-6 flex flex-col gap-6">
      <header>
        <h1 className="font-display font-bold text-[32px] leading-[38px] tracking-[-0.01em] text-text-primary">
          Créer un quartier
        </h1>
        <p className="text-sm text-text-muted">
          Pour les quartiers informels absents d’OpenStreetMap.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="bg-surface rounded-lg border border-border shadow-sm p-5 sm:p-6 flex flex-col gap-5"
      >
        <Input
          label="Nom du quartier"
          placeholder="Ex : Vodjè"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Input
          label="Préfixe (3 lettres)"
          value={prefix || computedPrefix}
          onChange={(e) =>
            setPrefix(e.target.value.toUpperCase().replace(ALPHABET_FILTER, '').slice(0, 3))
          }
          hint="Auto-généré depuis le nom — vous pouvez le surcharger si besoin."
          maxLength={3}
          autoCapitalize="characters"
          spellCheck={false}
        />

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-text-primary">Commune</span>
          <select
            value={commune}
            onChange={(e) => setCommune(e.target.value as (typeof COMMUNES)[number])}
            className="h-11 rounded-md border border-border bg-surface px-3 text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {COMMUNES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Latitude (centre)"
            inputMode="decimal"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
          />
          <Input
            label="Longitude (centre)"
            inputMode="decimal"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
          />
        </div>

        {parsedCoords ? (
          <div className="-mx-5 sm:-mx-6">
            <MapPreview destination={parsedCoords} interactive={false} />
          </div>
        ) : (
          <p className="text-sm text-danger">Coordonnées invalides.</p>
        )}

        <Button type="submit" variant="primary" size="lg" loading={submitting} disabled={!canSubmit}>
          Créer le quartier
        </Button>
      </form>
    </section>
  );
}
