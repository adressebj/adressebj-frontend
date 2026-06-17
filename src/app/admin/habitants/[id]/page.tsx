'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  ChevronRight,
  Flag,
  Mail,
  MapPin,
  Phone,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { AddressStatusBadge } from '@/components/address/AddressStatusBadge';
import { ApiError, api } from '@/lib/api';
import { classNames } from '@/lib/utils';
import type { AdminHabitantDetail, HabitantStatus } from '@/types/api';

const STATUS_LABEL: Record<HabitantStatus, string> = {
  verified: 'Vérifié',
  unverified: 'Non vérifié',
  disabled: 'Désactivé',
};

const STATUS_VARIANT: Record<HabitantStatus, 'success' | 'warning' | 'danger'> = {
  verified: 'success',
  unverified: 'warning',
  disabled: 'danger',
};

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ok'; detail: AdminHabitantDetail }
  | { kind: 'not_found' }
  | { kind: 'error' };

interface RouteParams {
  params: Promise<{ id: string }>;
}

export default function AdminHabitantProfilePage({ params }: RouteParams) {
  const { id } = use(params);
  const toast = useToast();

  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [acting, setActing] = useState(false);

  const load = useCallback(() => {
    setState({ kind: 'loading' });
    api
      .adminHabitant(id)
      .then((detail) => setState({ kind: 'ok', detail }))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setState({ kind: 'not_found' });
        } else {
          setState({ kind: 'error' });
        }
      });
  }, [id]);

  useEffect(load, [load]);

  const handleDisable = useCallback(async () => {
    if (state.kind !== 'ok') return;
    setActing(true);
    try {
      await api.adminUpdateHabitant(id, { status: 'disabled' });
      setState({
        kind: 'ok',
        detail: { ...state.detail, status: 'disabled' },
      });
      toast.show({ message: 'Compte désactivé.', variant: 'success' });
      setConfirmOpen(false);
    } catch {
      toast.show({ message: 'Action impossible.', variant: 'error' });
    } finally {
      setActing(false);
    }
  }, [id, state, toast]);

  const handleReactivate = useCallback(async () => {
    if (state.kind !== 'ok') return;
    setActing(true);
    try {
      await api.adminUpdateHabitant(id, { status: 'verified' });
      setState({
        kind: 'ok',
        detail: { ...state.detail, status: 'verified' },
      });
      toast.show({ message: 'Compte réactivé.', variant: 'success' });
    } catch {
      toast.show({ message: 'Action impossible.', variant: 'error' });
    } finally {
      setActing(false);
    }
  }, [id, state, toast]);

  if (state.kind === 'loading') {
    return (
      <section className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 py-6 flex flex-col gap-6">
        <Skeleton width={240} height={28} />
        <Skeleton width="100%" height={120} />
        <Skeleton width="100%" height={200} />
      </section>
    );
  }

  if (state.kind === 'not_found') {
    return (
      <section className="mx-auto w-full max-w-md px-4 py-12 text-center flex flex-col gap-3">
        <h1 className="font-display font-bold text-h2">Habitant introuvable</h1>
        <Link href="/admin/habitants" className="self-center">
          <Button variant="primary" size="md">
            Retour à la liste
          </Button>
        </Link>
      </section>
    );
  }

  if (state.kind === 'error') {
    return (
      <section className="mx-auto w-full max-w-md px-4 py-12 text-center flex flex-col gap-3">
        <h1 className="font-display font-bold text-h2">
          Erreur de chargement
        </h1>
        <Button
          variant="primary"
          size="md"
          onClick={load}
          className="self-center"
        >
          Réessayer
        </Button>
      </section>
    );
  }

  const { detail } = state;
  const isDisabled = detail.status === 'disabled';

  return (
    <section className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8 flex flex-col gap-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <nav
            aria-label="Fil d'Ariane"
            className="flex items-center gap-2 text-xs text-text-muted mb-2"
          >
            <Link href="/admin/habitants" className="hover:text-primary">
              Habitants
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-semibold text-primary">{detail.phone}</span>
          </nav>
          <h1 className="font-display font-bold text-[32px] leading-[38px] tracking-[-0.01em] text-text-primary">
            Profil habitant
          </h1>
        </div>
        <Link
          href="/admin/habitants"
          className="text-sm text-text-muted hover:text-text-primary inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Habitants
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <article className="card rounded-xl p-6 flex flex-col gap-4 lg:col-span-1">
          <div className="flex flex-col items-center text-center gap-3">
            <span
              aria-hidden="true"
              className="w-20 h-20 rounded-full bg-primary-surface text-primary text-2xl font-bold flex items-center justify-center"
            >
              {detail.phone.replace(/\D+/g, '').slice(-2)}
            </span>
            <div>
              <p className="inline-flex items-center gap-2 text-base text-text-primary">
                <Phone className="h-4 w-4 text-primary" aria-hidden="true" />
                <span className="font-medium tracking-wide">
                  {detail.phone}
                </span>
              </p>
              {detail.email ? (
                <p className="inline-flex items-center gap-2 text-sm text-text-muted mt-1">
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                  {detail.email}
                </p>
              ) : null}
            </div>
            <Badge variant={STATUS_VARIANT[detail.status]} size="md">
              {STATUS_LABEL[detail.status]}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
            <StatPill
              icon={<MapPin className="h-4 w-4" aria-hidden="true" />}
              label="Adresses"
              value={detail.addressCount}
            />
            <StatPill
              icon={<Flag className="h-4 w-4" aria-hidden="true" />}
              label="Signalements"
              value={detail.reportsAgainstCount}
              tone={detail.reportsAgainstCount > 0 ? 'danger' : 'muted'}
            />
          </div>

          <div className="pt-4 border-t border-border flex flex-col gap-2">
            {isDisabled ? (
              <Button
                type="button"
                variant="primary"
                size="md"
                fullWidth
                loading={acting}
                onClick={() => void handleReactivate()}
                leadingIcon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
              >
                Réactiver le compte
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="md"
                fullWidth
                onClick={() => setConfirmOpen(true)}
                leadingIcon={<Ban className="h-4 w-4" aria-hidden="true" />}
                className="!text-danger hover:!bg-danger-light/40"
              >
                Désactiver le compte
              </Button>
            )}
          </div>
        </article>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <article className="card rounded-xl p-5 flex flex-col gap-4">
            <h2 className="font-display font-semibold text-h3 text-text-primary">
              Adresses ({detail.addresses.length})
            </h2>
            {detail.addresses.length === 0 ? (
              <p className="text-sm text-text-muted">
                Aucune adresse enregistrée par cet habitant.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {detail.addresses.map((addr) => (
                  <li
                    key={addr.code}
                    className="flex items-center justify-between gap-3 rounded-md border border-border p-3 hover:bg-surface-muted transition-colors"
                  >
                    <div>
                      <Link
                        href={`/a/${addr.code}`}
                        className="font-display font-semibold text-primary tracking-wide hover:underline"
                      >
                        {addr.code}
                      </Link>
                      <p className="text-xs text-text-muted">{addr.quartierName}</p>
                    </div>
                    <AddressStatusBadge status={addr.status} />
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="card rounded-xl p-5 flex flex-col gap-4">
            <h2 className="font-display font-semibold text-h3 text-text-primary">
              Historique
            </h2>
            <ul className="flex flex-col gap-4">
              {detail.timeline.map((event) => (
                <li key={event.id} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={classNames(
                      'mt-1 h-3 w-3 rounded-full shrink-0',
                      event.tone === 'success' && 'bg-success',
                      event.tone === 'warning' && 'bg-warning',
                      event.tone === 'danger' && 'bg-danger',
                      event.tone === 'neutral' && 'bg-border-strong',
                    )}
                  />
                  <div className="flex-1">
                    <p className="text-sm text-text-primary">{event.label}</p>
                    <p className="text-xs text-text-muted">
                      {new Date(event.occurredAt).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>

      <Modal
        isOpen={confirmOpen}
        onClose={() => {
          if (!acting) setConfirmOpen(false);
        }}
        title="Désactiver ce compte"
        footer={
          <>
            <Button
              variant="ghost"
              size="md"
              onClick={() => setConfirmOpen(false)}
              disabled={acting}
            >
              Annuler
            </Button>
            <Button
              variant="danger"
              size="md"
              loading={acting}
              onClick={() => void handleDisable()}
            >
              Désactiver
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-primary leading-relaxed">
          L&apos;habitant <strong>{detail.phone}</strong> ne pourra plus se
          connecter ni gérer ses adresses. Les adresses publiées restent
          accessibles. L&apos;action est réversible.
        </p>
      </Modal>
    </section>
  );
}

function StatPill({
  icon,
  label,
  value,
  tone = 'muted',
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: 'muted' | 'danger';
}) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-md bg-surface-muted">
      <span
        className={classNames(
          'inline-flex items-center gap-1.5 text-xs',
          tone === 'danger' ? 'text-danger' : 'text-text-muted',
        )}
      >
        {icon}
        {label}
      </span>
      <span
        className={classNames(
          'font-display font-bold text-2xl',
          tone === 'danger' ? 'text-danger' : 'text-text-primary',
        )}
      >
        {value}
      </span>
    </div>
  );
}
