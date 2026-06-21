import type { JwtPayload } from '@/types/api';

const TOKEN_KEY = 'adressebj_token';

// Accéder à `window.localStorage` peut lever une SecurityError dans les
// navigateurs in-app (WhatsApp / Facebook / Instagram) et en navigation privée
// stricte — pas seulement getItem/setItem, mais l'accès à la propriété
// elle-même. On enveloppe tout : pas de stockage = simplement « déconnecté »,
// jamais une exception qui remonte et fige l'UI.
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Stockage indisponible — la session ne survivra pas au rechargement,
    // mais on ne casse pas le flux de connexion en cours.
  }
}

export function clearStoredToken(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Rien à nettoyer si le stockage est inaccessible.
  }
}

export function decodeJwt(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = typeof atob === 'function' ? atob(payload) : Buffer.from(payload, 'base64').toString('utf8');
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function isExpired(payload: JwtPayload | null): boolean {
  if (!payload?.exp) return false;
  return payload.exp * 1000 <= Date.now();
}
