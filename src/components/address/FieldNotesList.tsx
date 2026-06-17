'use client';

import { MessageSquareText } from 'lucide-react';
import type { FieldNote } from '@/types/api';

export interface FieldNotesListProps {
  notes: FieldNote[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Liste des observations terrain laissées par les visiteurs (CDC Frontend §11).
 * Texte libre, complémentaire des contributions structurées (sens, côté
 * entrée) et des propositions de modification. Affichée côté propriétaire
 * uniquement — le visiteur ne voit pas les notes des autres.
 */
export function FieldNotesList({ notes }: FieldNotesListProps) {
  if (notes.length === 0) {
    return (
      <p className="text-sm text-text-muted italic">
        Aucune observation terrain pour l&apos;instant.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {notes.map((note) => (
        <li
          key={note.id}
          className="rounded-lg border border-border bg-surface p-3 flex flex-col gap-1.5"
        >
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <MessageSquareText className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{note.authorPhoneMasked}</span>
            <span aria-hidden="true">•</span>
            <time dateTime={note.createdAt}>{formatDate(note.createdAt)}</time>
          </div>
          <p className="text-sm text-text-primary leading-relaxed">
            « {note.message} »
          </p>
        </li>
      ))}
    </ul>
  );
}

export default FieldNotesList;
