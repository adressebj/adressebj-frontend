import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportDetailView } from '@/components/address/ReportDetailView';
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
  usePathname: () => '/admin/reports/report_1',
  useSearchParams: () => new URLSearchParams(),
}));

function renderDetail(id: string) {
  return render(
    <ToastProvider>
      <ReportDetailView id={id} />
    </ToastProvider>,
  );
}

describe('Report detail — actions', () => {
  beforeEach(() => {
    push.mockClear();
  });

  it('PATCHes status=resolved and redirects with a success toast', async () => {
    const user = userEvent.setup();
    const patchSpy = jest.spyOn(apiModule.api, 'adminUpdateReport');

    renderDetail('report_1');

    // Wait for the report payload + address rendering.
    await screen.findByRole('heading', { name: /message du signalement/i });

    await user.click(screen.getByRole('button', { name: /^marquer résolu$/i }));

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith('report_1', { status: 'resolved' });
    });
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/admin/reports');
    });
    patchSpy.mockRestore();
  });

  it('deactivates the address via DELETE-like admin endpoint when the destructive action is picked', async () => {
    const user = userEvent.setup();
    const deactivateSpy = jest.spyOn(apiModule.api, 'adminDeactivateAddress');

    renderDetail('report_1');
    await screen.findByRole('heading', { name: /message du signalement/i });

    await user.click(screen.getByRole('button', { name: /désactiver l[’']adresse/i }));

    await waitFor(() => {
      expect(deactivateSpy).toHaveBeenCalledWith('AKP-7X3K');
    });
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/admin/reports');
    });
    deactivateSpy.mockRestore();
  });
});
