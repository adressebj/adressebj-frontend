'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

/**
 * Garde de page ADMIN-only. À utiliser sur les routes que le CDC §5 réserve
 * exclusivement aux Administrateurs (zones, clés API, modérateurs, habitants,
 * supervision adresses) — un Modérateur authentifié est renvoyé vers
 * `/admin` au lieu de voir un écran d'accès refusé.
 *
 * Le retour de l'auth est attendu via `useAuth().isReady` : tant que le
 * hook n'a pas résolu le token, on ne redirige pas (évite un flash de
 * redirection vers `/admin` avant que `isAdmin` ne soit déterminé).
 *
 * Retourne `{ isReady, isAdmin }` pour les composants qui veulent rendre
 * un loader pendant la vérification.
 */
export function useRequireAdmin(): { isReady: boolean; isAdmin: boolean } {
  const router = useRouter();
  const { isReady, isAuthenticated, isAdmin } = useAuth();

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace('/admin/login');
      return;
    }
    if (!isAdmin) {
      router.replace('/admin');
    }
  }, [isReady, isAuthenticated, isAdmin, router]);

  return { isReady, isAdmin };
}
