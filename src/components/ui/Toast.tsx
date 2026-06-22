'use client';

import type { ReactNode } from 'react';
import { showToast, type ToastOptions } from 'nextjs-toast-notify';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastInput {
  message: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastApi {
  show: (toast: ToastInput) => void;
  dismiss: (id?: number) => void;
}

// Réglages partagés à tous les toasts (la lib ne gère qu'une position globale,
// pas de responsive — on choisit `top-center`, toujours visible et sans conflit
// avec la navigation/FAB bas d'écran de la PWA). Durée 4 s (comme l'ancien
// système maison ; le défaut de la lib est 8 s). `fadeIn` reste discret et
// respectueux de `prefers-reduced-motion`.
const BASE_OPTIONS: ToastOptions = {
  duration: 4000,
  position: 'top-center',
  transition: 'fadeIn',
  progress: true,
};

function show({ message, variant = 'info', duration }: ToastInput): void {
  // La lib manipule le DOM : appel côté client uniquement (les call-sites sont
  // déjà dans des handlers, mais on blinde contre un éventuel rendu serveur).
  if (typeof window === 'undefined') return;
  showToast[variant](message, {
    ...BASE_OPTIONS,
    ...(duration != null ? { duration } : {}),
  });
}

// La lib n'expose pas de fermeture programmatique par identifiant (les toasts
// s'auto-ferment). On garde `dismiss` pour préserver la signature historique
// de `useToast()` — aucun call-site applicatif ne l'utilise.
function dismiss(id?: number): void {
  void id;
}

const toastApi: ToastApi = { show, dismiss };

/**
 * Conservé pour rétro-compatibilité : `nextjs-toast-notify` gère son propre
 * conteneur DOM et ne requiert aucun provider ni import CSS. On expose donc un
 * passe-plat, pour ne pas toucher `layout.tsx` ni les tests qui montent encore
 * `<ToastProvider>` comme wrapper de rendu.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useToast(): ToastApi {
  return toastApi;
}

export default ToastProvider;
