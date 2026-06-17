import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfilePage from '@/app/dashboard/profile/page';
import { ToastProvider } from '@/components/ui/Toast';
import * as apiModule from '@/lib/api';

const push = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push,
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/dashboard/profile',
  useSearchParams: () => new URLSearchParams(),
}));

// usePushNotifications hits navigator.serviceWorker.ready / PushManager,
// which jsdom doesn't implement. Stub the hook to a deterministic shape.
jest.mock('@/hooks/usePushNotifications', () => ({
  usePushNotifications: () => ({
    isSupported: false,
    isReady: true,
    isSubscribed: false,
    permission: 'unsupported' as const,
    subscribe: jest.fn().mockResolvedValue(false),
    unsubscribe: jest.fn().mockResolvedValue(false),
  }),
}));

function renderProfile() {
  return render(
    <ToastProvider>
      <ProfilePage />
    </ToastProvider>,
  );
}

describe('Profile — delete account', () => {
  beforeEach(() => {
    push.mockClear();
    window.localStorage.clear();
    // Pre-populate a JWT so logout() can wipe it after the test.
    window.localStorage.setItem('adressebj_token', 'fake.jwt.value');
  });

  it('requires the phone to match before allowing the DELETE call', async () => {
    const user = userEvent.setup();
    const deleteSpy = jest.spyOn(apiModule.api, 'deleteMe');

    renderProfile();

    // Wait for /users/me mock to resolve and render the phone.
    await screen.findByText(/\+22960000000/i);

    await user.click(
      screen.getByRole('button', { name: /^supprimer mon compte$/i }),
    );

    const dangerBtn = await screen.findByRole('button', {
      name: /^supprimer définitivement$/i,
    });
    expect(dangerBtn).toBeDisabled();

    const confirm = screen.getByLabelText(/saisissez votre numéro/i);
    await user.type(confirm, '+229WRONG');
    expect(dangerBtn).toBeDisabled();

    await user.clear(confirm);
    await user.type(confirm, '+22960000000');
    expect(
      screen.getByRole('button', { name: /^supprimer définitivement$/i }),
    ).toBeEnabled();

    await user.click(
      screen.getByRole('button', { name: /^supprimer définitivement$/i }),
    );

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/');
    });
    expect(window.localStorage.getItem('adressebj_token')).toBeNull();

    deleteSpy.mockRestore();
  });

  it('saves the email via PATCH /users/me and surfaces a success toast', async () => {
    const user = userEvent.setup();
    const updateSpy = jest.spyOn(apiModule.api, 'updateMe');

    renderProfile();

    await screen.findByText(/\+22960000000/i);
    const emailInput = screen.getByLabelText(/adresse email/i);
    await user.clear(emailInput);
    await user.type(emailInput, 'me@example.com');
    await user.click(screen.getByRole('button', { name: /^enregistrer$/i }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith({ email: 'me@example.com' });
    });
    await waitFor(() => {
      expect(screen.getByText(/profil mis à jour/i)).toBeInTheDocument();
    });

    updateSpy.mockRestore();
  });
});
