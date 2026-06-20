'use client';

import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Info } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CATEGORIES, categoryTint } from '@/lib/categories';
import { classNames } from '@/lib/utils';
import type { AddressCategory } from '@/types/api';
import { StepHeading } from './StepHeading';
import { StepNote } from './StepNote';

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
      <StepHeading
        title="De quoi s’agit-il ?"
        subtitle="Choisissez ce qui correspond le mieux à ce lieu. Ça aide les visiteurs à savoir où ils vont."
      />

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
                  'w-full h-full flex flex-col items-start gap-2.5 p-4 rounded-[var(--radius-lg)] text-left',
                  'transition-all duration-200 active:scale-[0.98] cursor-pointer border-2 shadow-sm',
                  checked ? '' : 'bg-surface border-border hover:border-border-strong',
                )}
                style={
                  checked
                    ? {
                        borderColor: meta.color,
                        backgroundColor: categoryTint(meta.color, 10),
                      }
                    : undefined
                }
              >
                {/* Icône nue dans la couleur d'identité de la catégorie —
                   visible même non sélectionnée pour signer chaque choix. */}
                <Icon
                  className="h-7 w-7 shrink-0"
                  style={{ color: meta.color }}
                  strokeWidth={2}
                  aria-hidden="true"
                />
                <span
                  className={classNames(
                    'font-display font-semibold text-base',
                    !checked && 'text-text-primary',
                  )}
                  style={checked ? { color: meta.color } : undefined}
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
        isDomicile ? (
          <StepNote variant="primary" icon={EyeOff}>
            <span className="font-semibold">Adresse privée&nbsp;:</span> elle
            n’apparaîtra pas sur la carte. Les gens pourront quand même y aller
            avec son lien ou son code.
          </StepNote>
        ) : (
          <StepNote variant="warning" icon={Eye}>
            <span className="font-semibold">Visible par tous&nbsp;:</span> votre
            adresse apparaîtra sur la carte, avec sa photo. Vous pourrez la
            retirer quand vous voulez.
          </StepNote>
        )
      ) : (
        <StepNote variant="info" icon={Info}>
          Votre choix change aussi qui peut voir l’adresse sur la carte.
          Choisissez pour voir.
        </StepNote>
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
