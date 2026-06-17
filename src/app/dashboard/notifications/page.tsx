'use client';

import { useCallback, useEffect, useState } from 'react';
import { NotificationsList } from '@/components/notifications/NotificationsList';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import type { Notification } from '@/types/api';

export default function NotificationsPage() {
  const toast = useToast();
  const [items, setItems] = useState<Notification[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .myNotifications()
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch(() => {
        if (!cancelled) {
          toast.show({
            message: 'Impossible de charger vos notifications.',
            variant: 'error',
          });
          setItems([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await api.markAllNotificationsRead();
      setItems((current) =>
        current ? current.map((n) => ({ ...n, read: true })) : current,
      );
      toast.show({
        message: 'Notifications marquées comme lues.',
        variant: 'success',
      });
    } catch {
      toast.show({ message: 'Action impossible.', variant: 'error' });
    }
  }, [toast]);

  return (
    <section className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-6 flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display font-bold text-h2 text-text-primary">
          Alertes
        </h1>
        <p className="text-sm text-text-muted">
          Validations, signalements et mises à jour de vos adresses.
        </p>
      </header>

      {items === null ? (
        <ul className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <li key={i} className="card p-4 flex items-start gap-3">
              <Skeleton width={40} height={40} />
              <div className="flex-1 flex flex-col gap-2">
                <Skeleton width="80%" height={16} />
                <Skeleton width="40%" height={12} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <NotificationsList
          notifications={items}
          onMarkAllRead={handleMarkAllRead}
        />
      )}
    </section>
  );
}
