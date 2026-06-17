'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, Lock, Plus, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { AddressStatusBadge } from '@/components/address/AddressStatusBadge';
import { CategoryBadge } from '@/components/address/CategoryBadge';
import { ApiError, api } from '@/lib/api';
import type { OwnerAddress } from '@/types/api';

type ListState =
  | { kind: 'loading' }
  | { kind: 'ok'; addresses: OwnerAddress[] }
  | { kind: 'suspended'; reason?: string | null }
  | { kind: 'error' };

export default function DashboardPage() {
  const [state, setState] = useState<ListState>({ kind: 'loading' });

  const load = () => {
    setState({ kind: 'loading' });
    api
      .myAddresses()
      .then((addresses) => setState({ kind: 'ok', addresses }))
      .catch((err) => {
        // Suspension Habitant — un compte désactivé reçoit 403 sur tous les
        // endpoints protégés (CDC Backend §8). On l'affiche en sortie de
        // garde au lieu d'un message d'erreur générique.
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
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="relative min-h-full pb-8">
      <section className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-6 flex flex-col gap-5">
        <h1 className="sr-only">Mes adresses</h1>

        {state.kind === 'loading' ? (
          <ul className="flex flex-col gap-3" aria-label="Chargement des adresses">
            {[0, 1, 2].map((i) => (
              <li key={i} className="card p-4 flex items-center gap-4">
                <Skeleton width={64} height={64} />
                <div className="flex-1 flex flex-col gap-2">
                  <Skeleton width={140} height={20} />
                  <Skeleton width={200} height={14} />
                  <Skeleton width={100} height={14} />
                </div>
              </li>
            ))}
          </ul>
        ) : state.kind === 'suspended' ? (
          <div className="card p-6 flex flex-col gap-3" role="alert">
            <span
              aria-hidden="true"
              className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-danger-light text-danger ring-1 ring-danger/15 self-start"
            >
              <Lock className="h-6 w-6" />
            </span>
            <div>
              <h2 className="font-display font-semibold text-h3 text-text-primary">
                Compte suspendu
              </h2>
              <p className="text-text-muted mt-1 leading-relaxed">
                Votre compte AdresseBJ a été désactivé par un modérateur.
                Vos adresses ne sont plus consultables et vous ne pouvez plus
                en créer ou en modifier.
                {state.reason ? (
                  <>
                    <br />
                    <span className="block mt-2 italic">« {state.reason} »</span>
                  </>
                ) : null}
              </p>
              <p className="text-text-muted mt-3 text-sm">
                Pour contester cette décision, écrivez-nous à{' '}
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
        ) : state.kind === 'error' ? (
          <div className="card p-5 flex flex-col gap-3">
            <p className="text-text-primary">
              Impossible de charger vos adresses pour l’instant.
            </p>
            <Button
              variant="primary"
              size="md"
              onClick={load}
              leadingIcon={<RotateCw className="h-4 w-4" aria-hidden="true" />}
              className="self-start"
            >
              Réessayer
            </Button>
          </div>
        ) : state.addresses.length === 0 ? (
          <div className="card p-6 flex flex-col items-center text-center gap-4 animate-fade-up">
            <span
              aria-hidden="true"
              className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary-surface text-primary ring-1 ring-primary/15"
            >
              <span className="absolute inset-0 rounded-full bg-primary/15 animate-soft-pulse" />
              <Plus className="h-7 w-7 relative" />
            </span>
            <div>
              <h2 className="font-display font-semibold text-h3 text-text-primary">
                Vous n’avez pas encore d’adresse.
              </h2>
              <p className="text-text-muted mt-1">
                Créez la vôtre en 5 minutes&nbsp;: portail, position GPS et
                3 indications de chemin.
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
        ) : (
          <ul className="flex flex-col gap-3" aria-label="Liste de mes adresses">
            {state.addresses.map((address, idx) => (
              <li
                key={address.code}
                className={`animate-fade-up stagger-${Math.min(idx + 1, 5)}`}
              >
                <Link
                  href={`/dashboard/address/${address.code}`}
                  aria-label={`Voir l'adresse ${address.code}`}
                  className="card card-interactive p-4 flex items-center gap-4 group"
                >
                  <div className="relative w-20 h-16 bg-surface-muted shrink-0 overflow-hidden rounded-lg">
                    <Image
                      src={address.photoUrl}
                      alt={`Portail ${address.code}`}
                      fill
                      sizes="80px"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      unoptimized
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-semibold text-h3 text-text-primary">
                      {address.code}
                    </h3>
                    <p className="text-base text-text-muted truncate">
                      {address.quartier?.name ?? 'Quartier inconnu'}
                    </p>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <AddressStatusBadge status={address.status} />
                      <CategoryBadge category={address.category} size="sm" />
                    </div>
                  </div>
                  <ChevronRight
                    className="h-5 w-5 text-text-muted shrink-0 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-primary"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {state.kind === 'suspended' ? null : (
        <Link
          href="/dashboard/address/new"
          aria-label="Créer une nouvelle adresse"
          className="fixed z-40 bottom-6 right-4 md:right-6 inline-flex items-center justify-center h-14 w-14 rounded-full bg-primary text-text-inverse shadow-lg hover:bg-primary-hover hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/40 group"
        >
          {/* Halo doux derrière le FAB pour le faire ressortir. */}
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-primary/40 blur-md animate-soft-pulse"
          />
          <Plus
            className="h-6 w-6 relative transition-transform duration-200 group-hover:rotate-90"
            aria-hidden="true"
          />
        </Link>
      )}
    </div>
  );
}
