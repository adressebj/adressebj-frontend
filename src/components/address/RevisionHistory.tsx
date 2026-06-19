'use client';

import { useState } from 'react';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  ListChecks,
  MapPin,
  Pencil,
  Sparkles,
  Tag,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { CATEGORIES } from '@/lib/categories';
import { classNames } from '@/lib/utils';
import type { AddressRevision, AddressRevisionSource } from '@/types/api';

export interface RevisionHistoryProps {
  revisions: AddressRevision[];
}

// Titre humain de chaque événement — pas de jargon « édition propriétaire »,
// pas de numéro de version technique. Le propriétaire lit son propre journal.
const SOURCE_TITLE: Record<AddressRevisionSource, string> = {
  CREATION: 'Adresse créée',
  OWNER_EDIT: 'Mise à jour par vous',
  PROPOSAL_ACCEPTED: "Précision d'un visiteur",
};

// Marqueur de la timeline : icône + tonalité. Les gestes du propriétaire sont
// en vert ; une contribution de visiteur passe en or (couleur « communauté »).
const SOURCE_MARKER: Record<
  AddressRevisionSource,
  { Icon: LucideIcon; className: string }
> = {
  CREATION: { Icon: Sparkles, className: 'bg-primary text-text-inverse' },
  OWNER_EDIT: { Icon: Pencil, className: 'bg-primary text-text-inverse' },
  PROPOSAL_ACCEPTED: { Icon: UserRound, className: 'bg-accent text-canvas-deep' },
};

// Date conviviale : « Aujourd'hui » / « Hier » pour le récent, date pleine sinon.
function formatWhen(iso: string): string {
  const d = new Date(iso);
  const startOf = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(new Date()) - startOf(d)) / 86_400_000);
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Journal des modifications d'une adresse, présenté en **timeline** (écho du
 * langage « parcours » du design system) plutôt qu'en cartes empilées. Chaque
 * événement dit en clair ce qui a changé. La version la plus récente est
 * affichée ; les précédentes se déplient (divulgation progressive).
 */
export function RevisionHistory({ revisions }: RevisionHistoryProps) {
  const [open, setOpen] = useState(false);

  if (revisions.length === 0) return null;

  // Newest-first. On montre la tête ; le reste derrière un bouton.
  const rest = revisions.slice(1);
  const shown = open ? revisions : revisions.slice(0, 1);

  return (
    <div className="flex flex-col gap-4">
      <ol className="relative flex flex-col">
        {shown.map((rev, idx) => (
          <RevisionItem
            key={rev.id}
            revision={rev}
            previous={revisions[idx + 1] ?? null}
            isHead={idx === 0}
            isLast={idx === shown.length - 1}
          />
        ))}
      </ol>

      {rest.length > 0 ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="self-start inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover transition-colors cursor-pointer"
        >
          {open ? (
            <>
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
              Masquer l&apos;historique
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
              Voir tout l&apos;historique ({rest.length} précédente
              {rest.length > 1 ? 's' : ''})
            </>
          )}
        </button>
      ) : (
        <p className="text-sm text-text-muted">
          C&apos;est la version d&apos;origine, rien n&apos;a changé depuis.
        </p>
      )}
    </div>
  );
}

interface RevisionItemProps {
  revision: AddressRevision;
  previous: AddressRevision | null;
  isHead: boolean;
  isLast: boolean;
}

function RevisionItem({ revision, previous, isHead, isLast }: RevisionItemProps) {
  const changes = previous ? computeDiff(revision, previous) : [];
  const { Icon, className: markerClass } = SOURCE_MARKER[revision.source];

  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      {/* Filet de liaison vers l'événement plus ancien. */}
      {!isLast ? (
        <span
          aria-hidden="true"
          className="absolute left-[15px] top-9 -bottom-1 w-px -translate-x-1/2 bg-border-strong"
        />
      ) : null}

      {/* Marqueur de l'événement. */}
      <span
        aria-hidden="true"
        className={classNames(
          'relative z-10 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full shadow-sm',
          markerClass,
          isHead ? 'ring-4 ring-primary/15' : '',
        )}
      >
        <Icon className="h-[15px] w-[15px]" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-display font-semibold text-base text-text-primary leading-tight">
            {SOURCE_TITLE[revision.source]}
          </span>
          {isHead ? (
            <span className="inline-flex items-center rounded-full bg-primary-surface text-primary px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide">
              Version actuelle
            </span>
          ) : null}
        </div>
        <time
          dateTime={revision.createdAt}
          className="block text-xs text-text-muted mt-0.5"
        >
          {formatWhen(revision.createdAt)}
        </time>

        {/* Ce qui a changé — chips lisibles, pas de jargon. */}
        {changes.length > 0 ? (
          <ul className="flex flex-wrap gap-2 mt-2.5">
            {changes.map((change) => (
              <li
                key={change.kind}
                className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-text-primary"
              >
                <change.Icon
                  className="h-3.5 w-3.5 text-text-muted"
                  aria-hidden="true"
                />
                {change.label}
              </li>
            ))}
          </ul>
        ) : null}

        {/* Mot laissé par l'auteur (ou le modérateur pour une précision). */}
        {revision.comment ? (
          <p className="mt-2.5 border-l-2 border-accent/50 pl-3 text-sm text-text-muted italic leading-relaxed">
            « {revision.comment} »
          </p>
        ) : null}
      </div>
    </li>
  );
}

type DiffKind = 'photo' | 'gps' | 'instructions' | 'category';

interface Diff {
  kind: DiffKind;
  label: string;
  Icon: LucideIcon;
}

function computeDiff(current: AddressRevision, previous: AddressRevision): Diff[] {
  const diffs: Diff[] = [];

  if (current.photoUrl !== previous.photoUrl) {
    diffs.push({ kind: 'photo', label: 'Nouvelle photo', Icon: Camera });
  }

  if (
    current.gps.lat !== previous.gps.lat ||
    current.gps.lng !== previous.gps.lng
  ) {
    diffs.push({ kind: 'gps', label: 'Position ajustée', Icon: MapPin });
  }

  const prevSteps = previous.instructions.steps.join('|');
  const currSteps = current.instructions.steps.join('|');
  if (prevSteps !== currSteps) {
    const delta =
      current.instructions.steps.length - previous.instructions.steps.length;
    const label =
      delta > 0
        ? `${delta} étape${delta > 1 ? 's' : ''} ajoutée${delta > 1 ? 's' : ''}`
        : delta < 0
          ? `${-delta} étape${-delta > 1 ? 's' : ''} retirée${-delta > 1 ? 's' : ''}`
          : 'Explications réécrites';
    diffs.push({ kind: 'instructions', label, Icon: ListChecks });
  }

  if (current.category !== previous.category) {
    diffs.push({
      kind: 'category',
      label: `Devenue « ${CATEGORIES[current.category].label} »`,
      Icon: Tag,
    });
  }

  return diffs;
}

export default RevisionHistory;
