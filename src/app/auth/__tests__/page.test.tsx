import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthPage from '@/app/auth/page';
import { ToastProvider } from '@/components/ui/Toast';

const replace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace,
    back: jest.fn(),
    prefetch: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/auth',
  useSearchParams: () => new URLSearchParams(),
}));

function renderPage() {
  return render(
    <ToastProvider>
      <AuthPage />
    </ToastProvider>,
  );
}

function makeJwt(expSecondsFromNow: number): string {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub: 'user_test',
      phone: '+22960000000',
      role: 'CREATOR',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + expSecondsFromNow,
    }),
  );
  return `${header}.${payload}.sig`;
}

describe('AuthPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    replace.mockClear();
  });

  it('connecte un Habitant existant avec téléphone + mot de passe (mode Connexion par défaut)', async () => {
    const user = userEvent.setup();
    renderPage();

    // Mode « Connexion » est sélectionné par défaut.
    const phoneInput = await screen.findByLabelText(/numéro de téléphone/i);
    await user.type(phoneInput, '60000000');
    await user.type(screen.getByLabelText(/^mot de passe$/i), 'demo1234');
    await user.click(screen.getByRole('button', { name: /^se connecter$/i }));

    await waitFor(() => {
      expect(window.localStorage.getItem('adressebj_token')).not.toBeNull();
    });
    expect(replace).toHaveBeenCalledWith('/dashboard');
  });

  it('refuse la connexion avec un mauvais mot de passe et ne pose pas de token', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/numéro de téléphone/i), '60000000');
    await user.type(screen.getByLabelText(/^mot de passe$/i), 'mauvais_mdp');
    await user.click(screen.getByRole('button', { name: /^se connecter$/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/téléphone ou mot de passe incorrect/i),
      ).toBeInTheDocument();
    });
    expect(window.localStorage.getItem('adressebj_token')).toBeNull();
    expect(replace).not.toHaveBeenCalledWith('/dashboard');
  });

  it('parcourt l’inscription : tel + email + mot de passe → OTP 123456 → JWT', async () => {
    const user = userEvent.setup();
    renderPage();

    // Bascule en mode Inscription.
    await user.click(screen.getByRole('tab', { name: /inscription/i }));

    await user.type(screen.getByLabelText(/numéro de téléphone/i), '71000000');
    await user.type(screen.getByLabelText(/adresse e-mail/i), 'nouveau@adressebj.bj');
    await user.type(screen.getByLabelText(/^mot de passe$/i), 'motdepasse');
    await user.click(screen.getByRole('button', { name: /recevoir le code sms/i }));

    // Étape OTP atteinte.
    await screen.findByRole('group', { name: /code de vérification/i });
    const cells = screen.getAllByRole('textbox') as HTMLInputElement[];
    cells[0].focus();
    await user.keyboard('123456');

    await waitFor(() => {
      expect(window.localStorage.getItem('adressebj_token')).not.toBeNull();
    });
    expect(replace).toHaveBeenCalledWith('/dashboard');
  });

  it('redirige immédiatement vers /dashboard quand un JWT valide est déjà stocké', async () => {
    window.localStorage.setItem('adressebj_token', makeJwt(3600));
    renderPage();

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/dashboard');
    });

    expect(screen.queryByLabelText(/numéro de téléphone/i)).not.toBeInTheDocument();
  });
});
