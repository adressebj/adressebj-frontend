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
 * Texte libre, validé en modération avant publication. Affichée en lecture
 * seule à la fois côté propriétaire (`/dashboard`) et côté visiteur sur la vue
 * publique `/a/:code` (CDC Frontend §549/753, « Informations terrain »).
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
          className="rounded-[var(--radius-md)] border border-border bg-surface p-4 flex flex-col gap-2"
        >
          <p className="text-[15px] text-text-primary leading-relaxed">
            « {note.message} »
          </p>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <MessageSquareText className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span>{note.authorPhoneMasked}</span>
            <span aria-hidden="true">•</span>
            <time dateTime={note.createdAt}>{formatDate(note.createdAt)}</time>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default FieldNotesList;
