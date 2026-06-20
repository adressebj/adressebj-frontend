'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // En développement, le service worker n'apporte rien d'utile et nuit
    // activement : il intercepte `/a/*` en « stale-while-revalidate » et sert
    // donc la page mise en cache au build précédent, ce qui fait réapparaître
    // d'anciennes mises en page pendant qu'on itère. On le désactive donc hors
    // production — et on retire tout SW déjà enregistré + ses caches, sinon
    // celui installé lors d'une session précédente continuerait de servir du
    // contenu périmé.
    if (process.env.NODE_ENV !== 'production') {
      void navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((reg) => reg.unregister())));
      if ('caches' in window) {
        void caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      }
      return;
    }

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('SW registration failed', err);
      });
    };
    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
    }
  }, []);

  return null;
}

export default ServiceWorkerRegistration;
