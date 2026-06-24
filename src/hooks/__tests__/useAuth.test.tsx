import { act, renderHook, waitFor } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';

function makeJwt(role: 'CREATOR' | 'ADMIN'): string {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub: 'user_x',
      phone: '+22960000000',
      role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  );
  return `${header}.${payload}.sig`;
}

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

// Régression : la boucle de redirection /admin ⇄ /admin/login. Le layout
// `AdminShell` reste monté pendant que la page `/admin/login` est naviguée ;
// chaque `useAuth()` gardait jadis un état local figé au montage, si bien
// qu'une connexion faite dans la page de login ne se propageait jamais au
// shell — qui rebondissait alors indéfiniment vers /admin/login. Toutes les
// instances de `useAuth` doivent partager une SEULE source de vérité.
describe('useAuth — état de session partagé entre instances', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('propage un login fait dans une instance à toutes les autres', async () => {
    const shell = renderHook(() => useAuth()); // ex: AdminShell (layout persistant)
    const loginPage = renderHook(() => useAuth()); // ex: page /admin/login

    await waitFor(() => expect(shell.result.current.isReady).toBe(true));
    expect(shell.result.current.isAdmin).toBe(false);

    act(() => {
      loginPage.result.current.login(makeJwt('ADMIN'));
    });

    // L'instance « shell » DOIT voir la session admin, sinon /admin rebondit
    // en boucle vers /admin/login.
    await waitFor(() => expect(shell.result.current.isAdmin).toBe(true));
    expect(shell.result.current.isAuthenticated).toBe(true);
  });

  it('propage un logout à toutes les instances', async () => {
    window.localStorage.setItem('adressebj_token', makeJwt('ADMIN'));
    const shell = renderHook(() => useAuth());
    const navbar = renderHook(() => useAuth());

    await waitFor(() => expect(shell.result.current.isAdmin).toBe(true));

    act(() => {
      navbar.result.current.logout();
    });

    // Après déconnexion, aucune instance ne doit afficher une session « relogin ».
    await waitFor(() => expect(shell.result.current.isAuthenticated).toBe(false));
    expect(shell.result.current.user).toBeNull();
  });
});
