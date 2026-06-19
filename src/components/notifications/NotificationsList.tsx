'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronRight,
  Flag,
  Info,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';
import { classNames } from '@/lib/utils';
import type { Notification, NotificationKind } from '@/types/api';

export interface NotificationsListProps {
  notifications: Notification[];
  onMarkAllRead: () => void;
}

// Iconographie cohérente par type de notification — l'icône reprend la
// couleur sémantique associée (succès, alerte, info, danger).
const KIND_META: Record<
  NotificationKind,
  { icon: LucideIcon; tone: 'success' | 'warning' | 'danger' | 'info' }
> = {
  address_validated:     { icon: CheckCircle2, tone: 'success' },
  address_rejected:      { icon: AlertTriangle, tone: 'warning' },
  address_disabled:      { icon: AlertTriangle, tone: 'danger' },
  report_received:       { icon: Flag, tone: 'warning' },
  contribution_received: { icon: MessageSquare, tone: 'info' },
  system:                { icon: Info, tone: 'info' },
};

const TONE_BG: Record<'success' | 'warning' | 'danger' | 'info', string> = {
  success: 'bg-success-light text-success',
  warning: 'bg-warning-light text-warning',
  danger:  'bg-danger-light text-danger',
  info:    'bg-info-light text-info',
};

export function NotificationsList({
  notifications,
  onMarkAllRead,
}: NotificationsListProps) {
  if (notifications.length === 0) {
    return (
      <div className="card motif-paper p-8 flex flex-col items-center text-center gap-3 animate-fade-up">
        <div className="relative">
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-primary/15 blur-lg animate-soft-pulse"
          />
          <span
            aria-hidden="true"
            className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary-surface text-primary ring-1 ring-primary/15"
          >
            <Bell className="h-7 w-7" />
          </span>
        </div>
        <h2 className="font-display font-semibold text-h3 text-text-primary">
          Aucune alerte pour le moment
        </h2>
        <p className="text-sm text-text-muted max-w-sm">
          On vous préviendra ici dès qu&apos;il se passe quelque chose sur une de
          vos adresses.
        </p>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex flex-col gap-3">
      {unreadCount > 0 ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-muted">
            {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
          </p>
          <button
            type="button"
            onClick={onMarkAllRead}
            className="text-sm font-medium text-primary hover:underline cursor-pointer"
          >
            Tout marquer comme lu
          </button>
        </div>
      ) : null}

      <ul className="flex flex-col gap-2" aria-label="Liste des notifications">
        {notifications.map((n, idx) => (
          <NotificationItem
            key={n.id}
            notification={n}
            staggerIdx={Math.min(idx + 1, 5)}
          />
        ))}
      </ul>
    </div>
  );
}

function NotificationItem({
  notification,
  staggerIdx,
}: {
  notification: Notification;
  staggerIdx: number;
}) {
  const { icon: Icon, tone } = KIND_META[notification.kind];
  const clickable = !!notification.addressCode;
  const content = (
    <div
      className={classNames(
        'card p-4 flex items-start gap-3',
        clickable && 'card-interactive',
        !notification.read && 'ring-2 ring-primary/20',
      )}
    >
      <span
        aria-hidden="true"
        className={classNames(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
          TONE_BG[tone],
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="flex-1 min-w-0">
        <p
          className={classNames(
            'text-sm leading-relaxed',
            notification.read ? 'text-text-muted' : 'text-text-primary',
          )}
        >
          {notification.message}
        </p>
        <p className="text-xs text-text-muted mt-1">
          {formatRelative(notification.createdAt)}
        </p>
      </div>
      {notification.addressCode ? (
        <ChevronRight
          className="h-4 w-4 text-text-muted shrink-0 mt-2"
          aria-hidden="true"
        />
      ) : null}
      {!notification.read ? (
        <span
          aria-label="Non lue"
          className="absolute top-3 right-3 h-2 w-2 rounded-full bg-danger"
        />
      ) : null}
    </div>
  );

  // Si la notif référence une adresse, le bloc devient cliquable et ramène
  // vers la vue propriétaire correspondante.
  if (notification.addressCode) {
    return (
      <li
        className={`relative animate-fade-up stagger-${staggerIdx}`}
      >
        <Link
          href={`/dashboard/address/${notification.addressCode}`}
          aria-label={`Voir l'adresse ${notification.addressCode}`}
          className="block"
        >
          {content}
        </Link>
      </li>
    );
  }
  return (
    <li className={`relative animate-fade-up stagger-${staggerIdx}`}>
      {content}
    </li>
  );
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'à l’instant';
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days} j`;
  return new Date(iso).toLocaleDateString('fr-FR');
}

export default NotificationsList;
