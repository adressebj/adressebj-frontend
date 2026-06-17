'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';

export interface UsePushNotificationsResult {
  isSupported: boolean;
  isReady: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission | 'unsupported';
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
}

// Lightweight conversion of a PushSubscription into the body shape the
// backend expects (matches CDC §15).
function describeSubscription(sub: PushSubscription) {
  const json = sub.toJSON();
  const keys = (json.keys ?? {}) as { p256dh?: string; auth?: string };
  return {
    endpoint: sub.endpoint,
    keys: {
      p256dh: keys.p256dh ?? '',
      auth: keys.auth ?? '',
    },
  };
}

export function usePushNotifications(): UsePushNotificationsResult {
  const [isReady, setIsReady] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    'unsupported',
  );

  const isSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  useEffect(() => {
    if (!isSupported) {
      setIsReady(true);
      return;
    }
    setPermission(Notification.permission);
    void (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        setIsSubscribed(Boolean(existing));
      } catch {
        setIsSubscribed(false);
      } finally {
        setIsReady(true);
      }
    })();
  }, [isSupported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result !== 'granted') return false;

    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        // VAPID public key would land here in real prod; the backend
        // contract accepts the resulting endpoint either way for mocks.
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true });
      }
      await api.subscribePush(describeSubscription(sub));
      setIsSubscribed(true);
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        // surface the failure to the caller by leaving subscribed = false
      }
      return false;
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api.unsubscribePush({ endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
      return true;
    } catch {
      return false;
    }
  }, [isSupported]);

  return {
    isSupported,
    isReady,
    isSubscribed,
    permission,
    subscribe,
    unsubscribe,
  };
}

export default usePushNotifications;
