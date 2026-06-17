'use client';

import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Info } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CATEGORIES } from '@/lib/categories';
import { classNames } from '@/lib/utils';
import type { AddressCategory } from '@/types/api';

export interface StepCategoryValue {
  category: AddressCategory;
}

export interface StepCategoryProps {
  value: StepCategoryValue | null;
  onComplete: (value: StepCategoryValue) => void;
}

// Ordre d'affichage — Domicile en tête (cas par défaut), suivi des
// catégories les plus parlantes, AUTRE en dernier filet de sécurité.
const ORDER: AddressCategory[] = [
  'DOMICILE',
  'COMMERCE',
  'RESTAURATION',
  'SANTE',
  'EDUCATION',
  'ADMINISTRATION',
  'LOISIR',
  'AUTRE',
];

/**
 * Step 4 du formulaire de création — choix de la catégorie.
 *
 * L'effet de la catégorie sur la visibilité publique est **explicitement
 * affiché** : DOMICILE → marqueur muet sur la carte ; autres → visible
 * avec photo et code (CDC Frontend §9 — « signaler explicitement »).
 * Sans cette transparence, l'habitant pourrait croire qu'il a un contrôle
 * indépendant de la catégorie sur la confidentialité.
 */
export function StepCategory({ value, onComplete }: StepCategoryProps) {
  const [selected, setSelected] = useState<AddressCategory | null>(
    value?.category ?? null,
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    onComplete({ category: selected });
  };

  const isDomicile = selected === 'DOMICILE';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h2 className="font-display font-semibold text-h3 text-text-primary">
          De quoi s&apos;agit-il&nbsp;?
        </h2>
        <p className="text-sm text-text-muted">
          Choisissez la catégorie qui décrit le mieux ce lieu. C&apos;est
          obligatoire et ça aide les visiteurs à comprendre ce qu&apos;ils
          trouveront.
        </p>
      </header>

      <ul
        role="radiogroup"
        aria-label="Catégorie d'adresse"
        className="grid grid-cols-2 gap-3"
      >
        {ORDER.map((cat) => {
          const meta = CATEGORIES[cat];
          const Icon = meta.icon;
          const checked = selected === cat;
          return (
            <li key={cat}>
              <button
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => setSelected(cat)}
                className={classNames(
                  'w-full h-full flex flex-col items-start gap-2 p-4 rounded-xl text-left',
                  'transition-all duration-200 active:scale-[0.98] cursor-pointer',
                  checked
                    ? 'bg-primary-surface border-2 border-primary shadow-sm'
                    : 'bg-surface border border-border hover:border-border-strong shadow-sm',
                )}
              >
                <span
                  aria-hidden="true"
                  className={classNames(
                    'flex h-9 w-9 items-center justify-center rounded-full',
                    checked
                      ? 'bg-primary text-text-inverse'
                      : 'bg-surface-muted text-text-muted',
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span
                  className={classNames(
                    'font-display font-semibold text-base',
                    checked ? 'text-primary' : 'text-text-primary',
                  )}
                >
                  {meta.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Bandeau d'effet visibilité — visuellement distinct selon le choix,
         pour ne pas laisser l'habitant ignorer ce que la catégorie change
         côté carte publique. */}
      {selected ? (
        <div
          className={classNames(
            'flex items-start gap-2.5 rounded-md border px-4 py-3',
            isDomicile
              ? 'bg-primary-surface border-primary/30'
              : 'bg-warning-light border-warning/30',
          )}
        >
          {isDomicile ? (
            <EyeOff className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4 text-warning shrink-0 mt-0.5" aria-hidden="true" />
          )}
          <p className="text-sm text-text-primary leading-relaxed">
            {isDomicile ? (
              <>
                <span className="font-semibold">Confidentialité renforcée&nbsp;:</span>{' '}
                votre adresse apparaîtra en marqueur muet sur la carte publique —
                ni photo, ni code visibles à l&apos;exploration. Elle reste
                résolvable par lien direct.
              </>
            ) : (
              <>
                <span className="font-semibold">Visible sur la carte publique&nbsp;:</span>{' '}
                votre adresse apparaîtra avec sa photo et son code lors de
                l&apos;exploration. Vous pourrez la retirer de la carte à tout
                moment depuis votre tableau de bord.
              </>
            )}
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-2.5 rounded-md bg-surface-muted border border-border px-4 py-3">
          <Info className="h-4 w-4 text-text-muted shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-text-muted leading-relaxed">
            La catégorie influence aussi la visibilité sur la carte publique.
            Choisissez pour voir l&apos;effet.
          </p>
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={!selected}
        fullWidth
        trailingIcon={<ArrowRight className="h-5 w-5" aria-hidden="true" />}
      >
        Continuer
      </Button>
    </form>
  );
}

export default StepCategory;
