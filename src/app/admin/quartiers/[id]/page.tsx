'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface QuartierDetail {
  id: string;
  name: string;
  prefix: string;
  isActive: boolean;
  addressCount: number;
  medianPriceFCFA: number | null;
}

export default function AdminQuartierDetailPage({ params }: RouteParams) {
  const { id } = use(params);
  const toast = useToast();

  const [quartier, setQuartier] = useState<QuartierDetail | null>(null);
  const [name, setName] = useState('');
  const [prefix, setPrefix] = useState('');
  const [saving, setSaving] = useState(false);
  const [toggleOpen, setToggleOpen] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .adminQuartier(id)
      .then((data) => {
        if (cancelled) return;
        setQuartier(data);
        setName(data.name);
        setPrefix(data.prefix);
      })
      .catch(() => {
        if (!cancelled) {
          toast.show({ message: 'Quartier introuvable.', variant: 'error' });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, toast]);

  const handleSave = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!quartier) return;
      setSaving(true);
      try {
        await api.adminUpdateQuartier(quartier.id, { name, prefix });
        setQuartier({ ...quartier, name, prefix });
        toast.show({ message: 'Quartier mis à jour.', variant: 'success' });
      } catch {
        toast.show({
          message: 'Modification impossible pour l’instant.',
          variant: 'error',
        });
      } finally {
        setSaving(false);
      }
    },
    [name, prefix, toast, quartier],
  );

  const handleToggle = useCallback(async () => {
    if (!quartier) return;
    setToggling(true);
    try {
      await api.adminUpdateQuartier(quartier.id, { isActive: !quartier.isActive });
      setQuartier({ ...quartier, isActive: !quartier.isActive });
      toast.show({
        message: quartier.isActive
          ? 'Quartier désactivé : aucune nouvelle adresse ne pourra y être créée.'
          : 'Quartier réactivé.',
        variant: 'success',
      });
      setToggleOpen(false);
    } catch {
      toast.show({ message: 'Action impossible.', variant: 'error' });
    } finally {
      setToggling(false);
    }
  }, [toast, quartier]);

  if (!quartier) {
    return (
      <section className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-6 flex flex-col gap-4">
        <Skeleton width={200} height={28} />
        <Skeleton width="100%" height={120} count={2} />
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-6 flex flex-col gap-6">
      <Link
        href="/admin/quartiers"
        className="text-sm text-text-muted hover:text-text-primary inline-flex items-center gap-1 self-start"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Quartiers
      </Link>

      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-[32px] leading-[38px] tracking-[-0.01em] text-text-primary">
            {quartier.name}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Préfixe <span className="font-display tracking-[0.1em]">{quartier.prefix}</span>{' '}
            · {quartier.addressCount} adresses
          </p>
        </div>
        {quartier.isActive ? (
          <Badge variant="success">Actif</Badge>
        ) : (
          <Badge variant="neutral">Inactif</Badge>
        )}
      </header>

      <form
        onSubmit={handleSave}
        className="bg-surface rounded-lg border border-border shadow-sm p-5 sm:p-6 flex flex-col gap-4"
      >
        <h2 className="font-display font-bold text-h3 text-text-primary">
          Identité
        </h2>
        <Input label="Nom du quartier" value={name} onChange={(e) => setName(e.target.value)} />
        <Input
          label="Préfixe (3 lettres)"
          value={prefix}
          onChange={(e) => setPrefix(e.target.value.toUpperCase().slice(0, 3))}
          maxLength={3}
        />
        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={saving}
          className="self-start"
        >
          Enregistrer
        </Button>
      </form>

      <section className="bg-surface rounded-lg border border-border shadow-sm p-5 sm:p-6 flex flex-col gap-2">
        <h2 className="font-display font-bold text-h3 text-text-primary">
          Fourchette de prix médiane
        </h2>
        <p className="text-text-muted text-sm">
          {quartier.medianPriceFCFA !== null
            ? `${quartier.medianPriceFCFA.toLocaleString('fr-FR')} FCFA (médiane calculée par le backend)`
            : 'Données insuffisantes.'}
        </p>
      </section>

      <section className="bg-surface rounded-lg border border-border shadow-sm p-5 sm:p-6 flex flex-col gap-3">
        <h2 className="font-display font-bold text-h3 text-text-primary">
          {quartier.isActive ? 'Désactiver le quartier' : 'Réactiver le quartier'}
        </h2>
        <p className="text-sm text-text-muted">
          {quartier.isActive
            ? 'Les nouvelles adresses ne pourront plus être créées dans ce quartier. Les codes existants restent résolubles.'
            : 'La création de nouvelles adresses dans ce quartier redevient possible.'}
        </p>
        <Button
          variant={quartier.isActive ? 'danger' : 'primary'}
          size="md"
          onClick={() => setToggleOpen(true)}
          className="self-start"
        >
          {quartier.isActive ? 'Désactiver' : 'Réactiver'}
        </Button>
      </section>

      <Modal
        isOpen={toggleOpen}
        onClose={() => {
          if (!toggling) setToggleOpen(false);
        }}
        title={quartier.isActive ? 'Désactiver ce quartier' : 'Réactiver ce quartier'}
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setToggleOpen(false)} disabled={toggling}>
              Annuler
            </Button>
            <Button
              variant={quartier.isActive ? 'danger' : 'primary'}
              size="md"
              loading={toggling}
              onClick={() => void handleToggle()}
            >
              Confirmer
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-primary leading-relaxed">
          {quartier.isActive
            ? 'Confirmez-vous la désactivation de ce quartier ? Les codes existants restent fonctionnels, mais aucune nouvelle adresse ne pourra y être créée.'
            : 'Confirmez-vous la réactivation de ce quartier ?'}
        </p>
      </Modal>
    </section>
  );
}
