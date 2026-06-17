'use client';

import { useCallback, useEffect, useState } from 'react';
import {
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

export function useAuth(): UseAuthResult {
  const [isReady, setIsReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<JwtPayload | null>(null);

  useEffect(() => {
    const stored = getStoredToken();
    if (!stored) {
      setIsReady(true);
      return;
    }
    const payload = decodeJwt(stored);
    if (!payload || isExpired(payload)) {
      clearStoredToken();
      setToken(null);
      setUser(null);
    } else {
      setToken(stored);
      setUser(payload);
    }
    setIsReady(true);
  }, []);

  const login = useCallback((nextToken: string) => {
    setStoredToken(nextToken);
    setToken(nextToken);
    setUser(decodeJwt(nextToken));
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    setToken(null);
    setUser(null);
  }, []);

  const isAuthenticated = Boolean(token && user && !isExpired(user));
  const role = user?.role;
  return {
    isReady,
    isAuthenticated,
    user,
    token,
    isHabitant: isAuthenticated && role === 'CREATOR',
    isModerator: isAuthenticated && role === 'MODERATOR',
    isAdmin: isAuthenticated && role === 'ADMIN',
    login,
    logout,
  };
}
