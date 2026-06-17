import { render, waitFor } from '@testing-library/react';
import { AdminShell } from '@/components/layout/AdminShell';
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
  usePathname: () => '/admin',
  useSearchParams: () => new URLSearchParams(),
}));

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

function renderShell() {
  return render(
    <ToastProvider>
      <AdminShell>
        <div data-testid="admin-children">Admin content</div>
      </AdminShell>
    </ToastProvider>,
  );
}

describe('AdminShell role guard', () => {
  beforeEach(() => {
    replace.mockClear();
    window.localStorage.clear();
  });

  it('redirects a CREATOR-role user to /dashboard and never renders admin children', async () => {
    window.localStorage.setItem('adressebj_token', makeJwt('CREATOR'));
    const { queryByTestId } = renderShell();

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/dashboard');
    });
    expect(queryByTestId('admin-children')).not.toBeInTheDocument();
  });

  it('renders the admin chrome and children for an ADMIN user', async () => {
    window.localStorage.setItem('adressebj_token', makeJwt('ADMIN'));
    const { findByTestId, getAllByRole } = renderShell();

    await findByTestId('admin-children');
    // Sidebar nav links visible.
    const links = getAllByRole('link');
    const hrefs = links.map((l) => l.getAttribute('href'));
    expect(hrefs).toEqual(expect.arrayContaining(['/admin', '/admin/quartiers', '/admin/reports']));
    expect(replace).not.toHaveBeenCalled();
  });
});
