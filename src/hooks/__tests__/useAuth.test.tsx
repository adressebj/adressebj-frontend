import { renderHook, waitFor } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';

// Régression : dans les navigateurs in-app (WhatsApp / Facebook / Instagram)
// et en navigation privée stricte, accéder à `window.localStorage` lève une
// SecurityError. Si `useAuth` laisse alors `isReady` bloqué à `false`, TOUT
// l'UI conditionné par `isReady` (bouton Connexion, liens, etc.) disparaît —
// la navbar se réduit au logo. `isReady` doit TOUJOURS finir par se résoudre.
describe('useAuth — résilience au stockage indisponible', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('devient prêt même si localStorage lève à la lecture', async () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError: localStorage is not available');
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.isAuthenticated).toBe(false);
  });
});
