import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OwnerAddressView } from '@/components/address/OwnerAddressView';
import { ToastProvider } from '@/components/ui/Toast';

const push = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push,
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/dashboard/address/AKP-7X3K',
  useSearchParams: () => new URLSearchParams(),
}));

function renderOwner(code: string) {
  return render(
    <ToastProvider>
      <OwnerAddressView code={code} />
    </ToastProvider>,
  );
}

describe('Owner address — deactivation modal', () => {
  beforeEach(() => {
    push.mockClear();
    window.localStorage.clear();
  });

  it('keeps the danger button disabled until the typed code matches, then deactivates and redirects', async () => {
    const user = userEvent.setup();
    renderOwner('AKP-7X3K');

    // Wait for the mocked address to load.
    await screen.findByRole('link', { name: /partager/i });

    await user.click(screen.getByRole('button', { name: /^désactiver l[’']adresse$/i }));

    // Modal open with the danger CTA initially disabled.
    const dangerBtn = await screen.findByRole('button', {
      name: /désactiver définitivement/i,
    });
    expect(dangerBtn).toBeDisabled();

    // Wrong code → still disabled.
    const confirm = screen.getByLabelText(/saisissez akp-7x3k pour confirmer/i);
    await user.type(confirm, 'WRONG');
    expect(dangerBtn).toBeDisabled();

    // Clear and type the exact code in lower case — the view normalises
    // before comparing.
    await user.clear(confirm);
    await user.type(confirm, 'akp-7x3k');
    expect(
      screen.getByRole('button', { name: /désactiver définitivement/i }),
    ).toBeEnabled();

    await user.click(
      screen.getByRole('button', { name: /désactiver définitivement/i }),
    );

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/dashboard');
    });
    await waitFor(() => {
      expect(screen.getByText(/adresse désactivée/i)).toBeInTheDocument();
    });
  });

  it('closes the modal without calling DELETE on Cancel', async () => {
    const user = userEvent.setup();
    renderOwner('AKP-7X3K');
    await screen.findByRole('link', { name: /partager/i });

    await user.click(screen.getByRole('button', { name: /^désactiver l[’']adresse$/i }));
    await user.click(screen.getByRole('button', { name: /^annuler$/i }));

    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /désactiver définitivement/i }),
      ).not.toBeInTheDocument();
    });
    expect(push).not.toHaveBeenCalled();
  });
});
