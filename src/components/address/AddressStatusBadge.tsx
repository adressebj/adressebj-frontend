import { Badge, type BadgeProps } from '@/components/ui/Badge';
import { ADDRESS_STATUS_CONFIG } from '@/lib/addressStatus';
import type { AddressStatus } from '@/types/api';

export interface AddressStatusBadgeProps {
  status: AddressStatus;
  size?: BadgeProps['size'];
  className?: string;
}

// Fallback neutre : si le backend renvoie un statut qu'on ne connaît pas
// encore (nouvelle valeur côté CDC, données stale après un HMR), on rend
// le code brut plutôt que de crasher la page.
const FALLBACK = { label: 'Statut inconnu', variant: 'neutral' as const };

/**
 * Pastille unique pour le statut de modération d'une adresse — réutilisée
 * sur le dashboard propriétaire, la fiche détaillée admin et la timeline
 * Habitant. Source de vérité unique pour le couple libellé/ton (CDC v5 §4).
 */
export function AddressStatusBadge({
  status,
  size = 'sm',
  className,
}: AddressStatusBadgeProps) {
  const config = ADDRESS_STATUS_CONFIG[status] ?? FALLBACK;
  return (
    <Badge variant={config.variant} size={size} className={className}>
      {config.label}
    </Badge>
  );
}

export default AddressStatusBadge;
