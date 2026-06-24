'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import {
  TOKEN_KEY,
  clearStoredToken,
  decodeJwt,
  getStoredToken,
  isExpired,
  setStoredToken,
} from '@/lib/auth';
import type { JwtPayload } from '@/types/api';

export interface UseAuthResult {
  isReady: boolean;
  isAuthenticated: boolean;
  user: JwtPayload | null;
  token: string | null;
  /** Habitant ordinaire — peut créer / modifier ses adresses. */
  isHabitant: boolean;
  /** Modérateur — accès aux files de modération. */
  isModerator: boolean;
  /** Administrateur — toutes les fonctionnalités admin (zones, clés API,
      modérateurs, suspension habitants). */
  isAdmin: boolean;
  login: (token: string) => void;
  logout: () => void;
}

// ── Store d'authentification partagé ─────────────────────────────────────────
// Un SEUL token fait autorité pour toute l'application. `useAuth` est consommé
// par des composants à durées de vie différentes — en particulier le *layout*
// `AdminShell`, qui reste monté pendant que la page `/admin/login` est
// naviguée. Avec un `useState` local figé au montage, une connexion réalisée
// dans la page de login ne se propageait jamais au shell persistant : ce
// dernier conservait `isAuthenticated=false` et rebondissait indéfiniment
// `/admin → /admin/login`, tandis que la page de login fraîchement montée lisait
// le token et renvoyait vers `/admin` (boucle de redirection). On synchronise
// donc TOUTES les instances de `useAuth` via une source externe unique.
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Synchronisation inter-onglets : un login/logout dans un autre onglet
  // (ou un `localStorage.clear()`, `event.key === null`) rafraîchit aussi ici.
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === TOKEN_KEY) emit();
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorage);
    }
  };
}

// Le snapshot est le token brut (une primitive) : `useSyncExternalStore` le
// compare par valeur via `Object.is`, donc le relire à chaque appel est sûr et
// stable tant qu'il ne change pas — pas besoin de cache, ce qui évite tout état
// résiduel entre tests. `getStoredToken` est déjà résilient (SecurityError →
// null dans les navigateurs in-app / navigation privée stricte).
function getSnapshot(): string | null {
  return getStoredToken();
}

function getServerSnapshot(): string | null {
  return null;
}

export function useAuth(): UseAuthResult {
  const token = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Premier passage client : purge un token expiré/illisible une bonne fois
    // (et notifie les autres instances), puis débloque l'UI. `isReady` DOIT
    // toujours se résoudre — sinon tout l'UI conditionné par `isReady` (bouton
    // Connexion, liens) disparaît et la navbar se réduit au logo.
    const stored = getStoredToken();
    if (stored) {
      const payload = decodeJwt(stored);
      if (!payload || isExpired(payload)) {
        clearStoredToken();
        emit();
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- bascule « monté côté client » jouée une seule fois ; isReady DOIT toujours se résoudre
    setIsReady(true);
  }, []);

  const login = useCallback((nextToken: string) => {
    setStoredToken(nextToken);
    emit();
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    emit();
  }, []);

  const user = token ? decodeJwt(token) : null;
  const isAuthenticated = Boolean(token && user && !isExpired(user));
  const role = user?.role;

  return {
    isReady,
    isAuthenticated,
    user: isAuthenticated ? user : null,
    token: isAuthenticated ? token : null,
    isHabitant: isAuthenticated && role === 'CREATOR',
    isModerator: isAuthenticated && role === 'MODERATOR',
    isAdmin: isAuthenticated && role === 'ADMIN',
    login,
    logout,
  };
}
