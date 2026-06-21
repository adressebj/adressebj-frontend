'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Lock, Plus, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { OwnerAddressPanel } from '@/components/dashboard/OwnerAddressPanel';
import { ApiError, api } from '@/lib/api';
import type { OwnerAddress } from '@/types/api';

// Aperçu carte non interactif — Leaflet touche `window` à l'import.
const RegistreMap = dynamic(
  () => import('@/components/dashboard/RegistreMap').then((m) => m.RegistreMap),
  {
    ssr: false,
    loading: () => <div className="h-full w-full skeleton-shimmer" />,
  },
);

type ListState =
  | { kind: 'loading' }
  | { kind: 'ok'; addresses: OwnerAddress[] }
  | { kind: 'suspended'; reason?: string | null }
  | { kind: 'error' };

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Bonsoir';
  if (h < 18) return 'Bonjour';
  return 'Bonsoir';
}

export default function DashboardPage() {
  const [state, setState] = useState<ListState>({ kind: 'loading' });

  const fetchAddresses = useCallback(() => {
    api
      .myAddresses()
      .then((addresses) => setState({ kind: 'ok', addresses }))
      .catch((err) => {
        if (
          err instanceof ApiError &&
          err.status === 403 &&
          (err.code === 'HABITANT_SUSPENDED' || err.code === 'ACCOUNT_SUSPENDED')
        ) {
          setState({
            kind: 'suspended',
            reason: (err.extra?.reason as string | undefined) ?? null,
          });
          return;
        }
        setState({ kind: 'error' });
      });
  }, []);

  const reload = useCallback(() => {
    setState({ kind: 'loading' });
    fetchAddresses();
  }, [fetchAddresses]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  // ── Compte suspendu — sortie de garde plein écran, pas de chrome registre. ──
  if (state.kind === 'suspended') {
    return (
      <section className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-10">
        <div className="card p-6 sm:p-8 flex flex-col gap-3 animate-fade-up" role="alert">
          <span
            aria-hidden="true"
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-danger-light text-danger ring-1 ring-danger/15 self-start"
          >
            <Lock className="h-6 w-6" />
          </span>
          <div>
            <h1 className="font-display font-bold text-h3 text-text-primary">
              Compte suspendu
            </h1>
            <p className="text-text-muted mt-1 leading-relaxed">
              Un membre de notre équipe a suspendu votre compte. Pour l’instant,
              vos adresses ne sont plus visibles et vous ne pouvez plus en créer
              ni en modifier.
              {state.reason ? (
                <>
                  <br />
                  <span className="block mt-2 italic">« {state.reason} »</span>
                </>
              ) : null}
            </p>
            <p className="text-text-muted mt-3 text-sm">
              Si vous pensez qu’il s’agit d’une erreur, écrivez-nous à{' '}
              <a
                href="mailto:support@adressebj.bj"
                className="text-primary underline"
              >
                support@adressebj.bj
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    );
  }

  const pins =
    state.kind === 'ok'
      ? state.addresses.map((a) => ({
          code: a.code,
          lat: a.gps.lat,
          lng: a.gps.lng,
          category: a.category,
        }))
      : [];

  return (
    <div className="relative min-h-full pb-20 lg:pb-12">
      <section className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-6 lg:py-10 flex flex-col gap-7">
        {/* ── En-tête éditorial ── */}
        <header className="flex flex-col gap-3 animate-fade-up sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              {greeting()}
            </p>
            <h1 className="font-display font-black text-h1 text-text-primary">
              Votre registre d’adresses
            </h1>
            <p className="text-text-muted max-w-prose">
              Toutes vos adresses au même endroit. Voyez lesquelles sont prêtes
              et partagez-les facilement.
            </p>
          </div>
          <Link href="/dashboard/address/new" className="hidden sm:block shrink-0">
            <Button
              variant="primary"
              size="md"
              leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
            >
              Créer une adresse
            </Button>
          </Link>
        </header>

        {state.kind === 'loading' ? (
          <LoadingRegistre />
        ) : state.kind === 'error' ? (
          <div className="card p-5 flex flex-col gap-3 animate-fade-up">
            <p className="text-text-primary">
              On n’arrive pas à afficher vos adresses pour le moment.
            </p>
            <Button
              variant="primary"
              size="md"
              onClick={reload}
              leadingIcon={<RotateCw className="h-4 w-4" aria-hidden="true" />}
              className="self-start"
            >
              Réessayer
            </Button>
          </div>
        ) : state.addresses.length === 0 ? (
          <EmptyRegistre />
        ) : (
          <>
            {/* ── Signature carte — aperçu de tous vos pins ── */}
            <div className="relative h-44 sm:h-56 overflow-hidden rounded-[var(--radius-lg)] border border-border shadow-sm animate-fade-up stagger-1">
              <RegistreMap pins={pins} className="h-full w-full" />
            </div>

            {/* ── Pile de panneaux ── */}
            <ul
              aria-label="Liste de mes adresses"
              className="flex flex-col gap-4"
            >
              {state.addresses.map((address, idx) => (
                <li
                  key={address.code}
                  className={`animate-fade-up stagger-${Math.min(idx + 2, 5)}`}
                >
                  <OwnerAddressPanel address={address} />
                </li>
              ))}
              <li className="animate-fade-up">
                <Link
                  href="/dashboard/address/new"
                  className="group flex items-center justify-center gap-3 rounded-[var(--radius-lg)] border-2 border-dashed border-border-strong bg-surface-muted/40 px-6 py-5 text-center transition-colors hover:border-primary hover:bg-primary-surface/40 tap-press"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-surface text-primary ring-1 ring-primary/15 transition-transform group-hover:scale-110">
                    <Plus className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="font-display font-semibold text-text-primary">
                    Créer une adresse
                  </span>
                </Link>
              </li>
            </ul>
          </>
        )}
      </section>

      {/* FAB mobile — sur desktop le bouton d'en-tête + le CTA de fin suffisent. */}
      <Link
        href="/dashboard/address/new"
        aria-label="Créer une nouvelle adresse"
        className="lg:hidden fixed z-40 bottom-6 right-4 inline-flex items-center justify-center h-14 w-14 rounded-full bg-primary text-text-inverse shadow-lg hover:bg-primary-hover hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/40 group"
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-primary/40 blur-md animate-soft-pulse"
        />
        <Plus
          className="h-6 w-6 relative transition-transform duration-200 group-hover:rotate-90"
          aria-hidden="true"
        />
      </Link>
    </div>
  );
}

function LoadingRegistre() {
  return (
    <div
      className="flex flex-col gap-7"
      aria-label="Chargement des adresses"
      aria-busy="true"
    >
      <div className="h-44 sm:h-56 rounded-[var(--radius-lg)] skeleton-shimmer" />
      <ul className="flex flex-col gap-4">
        {[0, 1].map((i) => (
          <li key={i} className="card overflow-hidden flex flex-col sm:flex-row">
            <div className="aspect-[16/10] w-full sm:aspect-auto sm:w-56 sm:shrink-0 skeleton-shimmer" />
            <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
              <div className="h-8 w-40 rounded skeleton-shimmer" />
              <div className="h-3 w-32 rounded skeleton-shimmer" />
              <div className="h-3 w-24 rounded skeleton-shimmer" />
              <div className="mt-2 h-9 w-28 rounded-full skeleton-shimmer" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyRegistre() {
  return (
    <div className="card p-8 sm:p-10 flex flex-col items-center text-center gap-4 animate-fade-up motif-paper">
      <span
        aria-hidden="true"
        className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary-surface text-primary ring-1 ring-primary/15"
      >
        <span className="absolute inset-0 rounded-full bg-primary/15 animate-soft-pulse" />
        <Plus className="h-7 w-7 relative" />
      </span>
      <div>
        <h2 className="font-display font-bold text-h3 text-text-primary">
          Vous n’avez pas encore d’adresse.
        </h2>
        <p className="text-text-muted mt-1 max-w-sm">
          Créez la vôtre en quelques minutes. On vous accompagne à chaque étape,
          c’est simple.
        </p>
      </div>
      <Link href="/dashboard/address/new">
        <Button
          variant="primary"
          size="md"
          leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
        >
          Créer ma première adresse
        </Button>
      </Link>
    </div>
  );
}
