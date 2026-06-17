import type { BadgeVariant } from '@/components/ui/Badge';
import type { AddressStatus } from '@/types/api';

// Single source of truth for how each moderation status reads + colours on the
// owner-facing UI. Visitors never see this — the public page only exposes the
// reliability badge.
export const ADDRESS_STATUS_CONFIG: Record<
  AddressStatus,
  { label: string; variant: BadgeVariant }
> = {
  BROUILLON: { label: 'Brouillon', variant: 'neutral' },
  EN_ATTENTE_VALIDATION: { label: 'En attente de validation', variant: 'warning' },
  PUBLIEE: { label: 'Publiée', variant: 'success' },
  REJETEE: { label: 'Rejetée', variant: 'danger' },
  DESACTIVEE: { label: 'Désactivée', variant: 'neutral' },
};
