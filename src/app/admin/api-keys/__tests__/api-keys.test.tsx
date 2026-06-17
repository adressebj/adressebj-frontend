import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminApiKeysPage from '@/app/admin/api-keys/page';
import { ToastProvider } from '@/components/ui/Toast';
import * as apiModule from '@/lib/api';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/admin/api-keys',
  useSearchParams: () => new URLSearchParams(),
}));

function renderPage() {
  return render(
    <ToastProvider>
      <AdminApiKeysPage />
    </ToastProvider>,
  );
}

describe('Admin API keys — revoke modal', () => {
  it('shows a confirmation modal, calls the revoke endpoint, and switches the row to "Révoquée"', async () => {
    const user = userEvent.setup();
    const revokeSpy = jest.spyOn(apiModule.api, 'adminRevokeApiKey');

    renderPage();

    // Wait for the mock keys to load (the ACTIVE one labelled "App livraison Gozem").
    await screen.findByText(/app livraison gozem/i);

    // Click "Révoquer" on the active row.
    await user.click(screen.getByRole('button', { name: /^révoquer$/i }));

    // Modal asks for confirmation.
    const confirmBtn = await screen.findByRole('button', {
      name: /révoquer définitivement/i,
    });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(revokeSpy).toHaveBeenCalledWith('key_1');
    });

    await waitFor(() => {
      // After update, the row's badge shows "Révoquée" (a second "Révoquée" already
      // existed on key_2 since the mock fixture has one revoked key — assert ≥ 2).
      expect(screen.getAllByText(/^révoquée$/i).length).toBeGreaterThanOrEqual(2);
    });

    revokeSpy.mockRestore();
  });
});
