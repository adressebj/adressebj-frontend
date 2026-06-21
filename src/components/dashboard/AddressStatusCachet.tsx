import { Check, Clock, FilePen, PowerOff, X, type LucideIcon } from 'lucide-react';
import { classNames } from '@/lib/utils';
import type { AddressStatus } from '@/types/api';

export interface AddressStatusCachetProps {
  status: AddressStatus;
  /** Une adresse inactive lit « Désactivée » quel que soit son statut. */
  isActive?: boolean;
  className?: string;
}

type CachetKind = 'sealed' | 'pending' | 'rejected' | 'draft' | 'disabled';

interface CachetStyle {
  label: string;
  icon: LucideIcon;
  /** Habillage de la pastille. */
  chip: string;
  /** Couleur de l'icône (états « encre »). */
  ink?: string;
  /** Cachet apposé = plaque sombre + sceau or (l'objet signature). */
  sealed?: boolean;
}

// Statut lu comme un CACHET d'enregistrement officiel, pas un badge fade.
// « Publiée » = plaque sombre canvas-deep (langage « plaque » de la marque) +
// micro-texture losange Fon + SCEAU OR portant la coche, légèrement tamponné.
// Les autres états = « tampon à l'encre » (même forme, contour pointillé fin
// teinté sur papier) ; désactivée = neutre à plat (pas de tampon).
const STYLES: Record<CachetKind, CachetStyle> = {
  sealed: {
    label: 'Publiée',
    icon: Check,
    chip: 'bg-canvas-deep text-text-inverse motif-light',
    sealed: true,
  },
  pending: {
    label: 'En attente',
    icon: Clock,
    chip: 'bg-surface/95 text-warning border border-dashed border-warning/60',
    ink: 'text-warning',
  },
  rejected: {
    label: 'Rejetée',
    icon: X,
    chip: 'bg-surface/95 text-danger border border-dashed border-danger/60',
    ink: 'text-danger',
  },
  draft: {
    label: 'Brouillon',
    icon: FilePen,
    chip: 'bg-surface/95 text-text-muted border border-dashed border-border-strong',
    ink: 'text-text-muted',
  },
  disabled: {
    label: 'Désactivée',
    icon: PowerOff,
    chip: 'bg-surface-muted text-text-muted',
    ink: 'text-text-muted',
  },
};

function resolveKind(status: AddressStatus, isActive: boolean): CachetKind {
  if (!isActive) return 'disabled';
  switch (status) {
    case 'PUBLIEE':
      return 'sealed';
    case 'EN_ATTENTE_VALIDATION':
      return 'pending';
    case 'REJETEE':
      return 'rejected';
    case 'DESACTIVEE':
      return 'disabled';
    default:
      return 'draft'; // BROUILLON + repli sûr sur un statut inconnu.
  }
}

/**
 * Indicateur de statut « cachet » pour la card du registre (`OwnerAddressPanel`),
 * apposé en surimpression de la photo. Surfaces solides, contraste fort, langage
 * « plaque » + or + losange Fon de la marque « Repère ». Le tampon se redresse
 * au survol de la card (groupe parent). Réservé au registre — les autres
 * surfaces gardent `AddressStatusBadge`.
 */
export function AddressStatusCachet({
  status,
  isActive = true,
  className,
}: AddressStatusCachetProps) {
  const kind = resolveKind(status, isActive);
  const style = STYLES[kind];
  const Icon = style.icon;
  const stamped = kind !== 'disabled';

  return (
    <span
      role="status"
      aria-label={`Statut : ${style.label}`}
      className={classNames(
        'inline-flex items-center gap-1.5 rounded-[10px] py-1 text-[11px] font-bold uppercase tracking-[0.1em] shadow-md transition-transform duration-300',
        // Le cachet scellé porte son sceau à gauche → moins de marge à gauche.
        style.sealed ? 'pl-1 pr-2.5' : 'px-2.5',
        stamped && '-rotate-[1.5deg] group-hover:rotate-0',
        style.chip,
        className,
      )}
    >
      {style.sealed ? (
        // Sceau or : disque doré portant la coche en encre canvas-deep —
        // la marque de validation officielle.
        <span
          aria-hidden="true"
          className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-accent text-canvas-deep shadow-sm"
        >
          <Icon className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
        </span>
      ) : (
        <Icon
          className={classNames('h-3.5 w-3.5', style.ink)}
          strokeWidth={2.5}
          aria-hidden="true"
        />
      )}
      {style.label}
    </span>
  );
}

export default AddressStatusCachet;
