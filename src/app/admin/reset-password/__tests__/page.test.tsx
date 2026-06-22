import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BackofficeResetPasswordPage from '@/app/admin/reset-password/page';
import { ToastProvider } from '@/components/ui/Toast';

let resetToken = 'tok_123';
const replace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace,
    push: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/admin/reset-password',
  useSearchParams: () =>
    new URLSearchParams(resetToken ? `token=${resetToken}` : ''),
}));

function renderPage() {
  return render(
    <ToastProvider>
      <BackofficeResetPasswordPage />
    </ToastProvider>,
  );
}

describe('Back-office reset-password', () => {
  beforeEach(() => {
    replace.mockClear();
    resetToken = 'tok_123';
  });

  it('avec un token : nouveau mot de passe confirmé → succès', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(
      await screen.findByLabelText(/nouveau mot de passe/i),
      'nouveau1234',
    );
    await user.type(screen.getByLabelText(/confirmer/i), 'nouveau1234');
    await user.click(screen.getByRole('button', { name: /mettre à jour/i }));

    expect(await screen.findByText(/mot de passe mis à jour/i)).toBeInTheDocument();
  });

  it('refuse si les deux mots de passe diffèrent', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(
      await screen.findByLabelText(/nouveau mot de passe/i),
      'nouveau1234',
    );
    await user.type(screen.getByLabelText(/confirmer/i), 'different1234');
    await user.click(screen.getByRole('button', { name: /mettre à jour/i }));

    expect(screen.getByText(/ne correspondent pas/i)).toBeInTheDocument();
  });

  it('sans token : affiche « lien invalide »', async () => {
    resetToken = '';
    renderPage();
    expect(screen.getByText(/lien invalide/i)).toBeInTheDocument();
  });
});
