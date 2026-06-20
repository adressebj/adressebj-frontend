import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditAddressView } from '@/components/address/EditAddressView';
import { ToastProvider } from '@/components/ui/Toast';
import * as apiModule from '@/lib/api';

jest.mock('@/components/map/MapNavigator', () => ({
  __esModule: true,
  MapNavigator: () => <div data-testid="map-navigator" />,
  default: () => <div data-testid="map-navigator" />,
}));

const push = jest.fn();
const replace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push,
    replace,
    back: jest.fn(),
    prefetch: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/dashboard/address/AKP-7X3K/edit',
  useSearchParams: () => new URLSearchParams(),
}));

function renderEdit(code: string) {
  return render(
    <ToastProvider>
      <EditAddressView code={code} />
    </ToastProvider>,
  );
}

describe('Edit address — instructions section', () => {
  beforeEach(() => {
    push.mockClear();
    replace.mockClear();
  });

  it('sends a PATCH with the new instructions and confirms via toast', async () => {
    const user = userEvent.setup();
    const updateSpy = jest.spyOn(apiModule.api, 'updateAddress');

    renderEdit('AKP-7X3K');

    // Wait for the mocked address to load — en édition (value présent),
    // StepInstructions rend l'éditeur libre pré-rempli : le point de départ est
    // l'étape 0.
    const firstPrompt = await screen.findByLabelText(
      /repère connu voulez-vous indiquer/i,
    );
    expect(firstPrompt).toHaveValue('Partir du marché Dantokpa');

    await user.clear(firstPrompt);
    await user.type(firstPrompt, 'Depuis le marché central');

    // Three sections render their own "Continuer" submit (Photo, Instructions,
    // GPS — in that order). Click the instructions one (index 1).
    const submitButtons = screen.getAllByRole('button', { name: /^continuer$/i });
    expect(submitButtons.length).toBeGreaterThanOrEqual(2);
    await user.click(submitButtons[1]);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalled();
    });

    const lastCall = updateSpy.mock.calls.find(
      ([, body]) => 'instructions' in body,
    );
    expect(lastCall).toBeDefined();
    expect(lastCall![0]).toBe('AKP-7X3K');
    expect(lastCall![1].instructions?.steps[0]).toBe('Depuis le marché central');

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/dashboard/address/AKP-7X3K');
    });
    await waitFor(() => {
      expect(screen.getByText(/instructions mises à jour/i)).toBeInTheDocument();
    });

    updateSpy.mockRestore();
  });
});
