'use client';

import { useState } from 'react';
import { Camera, ChevronDown, ChevronUp, Edit3, MapPin, ScrollText, Sparkles } from 'lucide-react';
import { CATEGORIES } from '@/lib/categories';
import { classNames } from '@/lib/utils';
import type { AddressRevision, AddressRevisionSource } from '@/types/api';

export interface RevisionHistoryProps {
  revisions: AddressRevision[];
}

const SOURCE_LABEL: Record<AddressRevisionSource, string> = {
  CREATION: 'Création',
  OWNER_EDIT: 'Édition propriétaire',
  PROPOSAL_ACCEPTED: 'Proposition visiteur acceptée',
};

const SOURCE_TONE: Record<AddressRevisionSource, string> = {
  CREATION: 'bg-primary-surface text-primary border-primary/20',
  OWNER_EDIT: 'bg-info-light text-info border-info/20',
  PROPOSAL_ACCEPTED: 'bg-warning-light text-warning border-warning/20',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Timeline des révisions d'une adresse (CDC v5 §4 — Address vs
 * AddressRevision). Affiche la version, l'origine (création, édition
 * propriétaire, proposition acceptée), l'auteur masqué et un résumé des
 * changements par rapport à la version précédente.
 */
export function RevisionHistory({ revisions }: RevisionHistoryProps) {
  const [open, setOpen] = useState(false);

  if (revisions.length === 0) return null;

  // On affiche par défaut uniquement la révision la plus récente avec un
  // bouton "Voir l'historique" pour déplier — l'historique complet peut être
  // long et n'intéresse pas tous les propriétaires.
  const head = revisions[0];
  const rest = revisions.slice(1);

  return (
    <div className="flex flex-col gap-3">
      <RevisionRow revision={head} previous={revisions[1] ?? null} isHead />

      {rest.length > 0 ? (
        <>
          {open ? (
            <ul className="flex flex-col gap-3 border-l-2 border-dashed border-border pl-4 ml-2">
              {rest.map((rev, idx) => (
                <li key={rev.id}>
                  <RevisionRow
                    revision={rev}
                    previous={rest[idx + 1] ?? null}
                  />
                </li>
              ))}
            </ul>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="self-start inline-flex items-center gap-1 text-sm text-primary hover:underline underline-offset-2 cursor-pointer"
            aria-expanded={open}
          >
            {open ? (
              <>
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
                Masquer l&apos;historique
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
                Voir l&apos;historique ({rest.length} version
                {rest.length > 1 ? 's' : ''})
              </>
            )}
          </button>
        </>
      ) : (
        <p className="text-xs text-text-muted italic">
          Aucune modification depuis la création.
        </p>
      )}
    </div>
  );
}

interface RevisionRowProps {
  revision: AddressRevision;
  previous: AddressRevision | null;
  isHead?: boolean;
}

function RevisionRow({ revision, previous, isHead = false }: RevisionRowProps) {
  const changes = previous ? computeDiff(revision, previous) : null;
  return (
    <div
      className={classNames(
        'rounded-lg border p-3 flex flex-col gap-2',
        isHead
          ? 'border-primary/30 bg-primary-surface/40'
          : 'border-border bg-surface',
      )}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="font-display font-semibold text-sm text-text-primary">
            v{revision.version}
          </span>
          <span
            className={classNames(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs',
              SOURCE_TONE[revision.source],
            )}
          >
            {revision.source === 'CREATION' ? (
              <Sparkles className="h-3 w-3" aria-hidden="true" />
            ) : (
              <Edit3 className="h-3 w-3" aria-hidden="true" />
            )}
            {SOURCE_LABEL[revision.source]}
          </span>
        </div>
        <time
          dateTime={revision.createdAt}
          className="text-xs text-text-muted"
        >
          {formatDate(revision.createdAt)}
        </time>
      </div>

      <p className="text-xs text-text-muted">par {revision.authorPhoneMasked}</p>

      {changes && changes.length > 0 ? (
        <ul className="flex flex-col gap-1 mt-1">
          {changes.map((change) => (
            <li
              key={change.kind}
              className="flex items-center gap-1.5 text-xs text-text-primary"
            >
              {change.kind === 'photo' ? (
                <Camera className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
              ) : change.kind === 'gps' ? (
                <MapPin className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
              ) : (
                <ScrollText className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
              )}
              {change.label}
            </li>
          ))}
        </ul>
      ) : null}

      {revision.comment ? (
        <p className="text-xs text-text-muted italic border-l-2 border-border pl-2">
          « {revision.comment} »
        </p>
      ) : null}

      <p className="text-[11px] text-text-muted">
        Catégorie : {CATEGORIES[revision.category].label}
      </p>
    </div>
  );
}

type DiffKind = 'photo' | 'gps' | 'instructions' | 'category';

interface Diff {
  kind: DiffKind;
  label: string;
}

function computeDiff(current: AddressRevision, previous: AddressRevision): Diff[] {
  const diffs: Diff[] = [];
  if (current.photoUrl !== previous.photoUrl) {
    diffs.push({ kind: 'photo', label: 'Photo remplacée' });
  }
  if (
    current.gps.lat !== previous.gps.lat ||
    current.gps.lng !== previous.gps.lng
  ) {
    diffs.push({ kind: 'gps', label: 'Position GPS ajustée' });
  }
  const prevSteps = previous.instructions.steps.join('|');
  const currSteps = current.instructions.steps.join('|');
  if (prevSteps !== currSteps) {
    const delta = current.instructions.steps.length - previous.instructions.steps.length;
    diffs.push({
      kind: 'instructions',
      label:
        delta > 0
          ? `Instructions enrichies (+${delta} étape${delta > 1 ? 's' : ''})`
          : delta < 0
            ? `Instructions allégées (${delta} étape${delta < -1 ? 's' : ''})`
            : 'Instructions reformulées',
    });
  }
  if (current.category !== previous.category) {
    diffs.push({
      kind: 'category',
      label: `Catégorie changée → ${CATEGORIES[current.category].label}`,
    });
  }
  return diffs;
}

export default RevisionHistory;
