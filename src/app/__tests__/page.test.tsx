import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '@/app/page';
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
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Stub Nominatim — jamais d'appel réseau dans les tests, et on contrôle ce
// que la SearchBar reçoit comme suggestions.
jest.mock('@/lib/nominatim', () => ({
  geocode: jest.fn(async () => []),
}));

function renderPage() {
  return render(
    <ToastProvider>
      <Home />
    </ToastProvider>,
  );
}

describe('Landing page (/)', () => {
  beforeEach(() => {
    push.mockClear();
  });

  it('renders the hero copy and the section headlines', () => {
    renderPage();
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /chaque porte du bénin/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /adresser un lieu/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /pensé pour le terrain béninois/i,
      }),
    ).toBeInTheDocument();
  });

  it('navigates to /a/CODE when the search input matches the code format on submit', async () => {
    const user = userEvent.setup();
    renderPage();

    // SearchBar unifié — un seul champ qui accepte code OU lieu.
    const input = screen.getByLabelText(/recherche par code ou par lieu/i);
    // L'utilisateur tape en minuscules ; la SearchBar uppercase avant la
    // détection du format, comme prévu côté CDC.
    await user.type(input, 'akp-7x3k{Enter}');

    expect(push).toHaveBeenCalledWith('/a/AKP-7X3K');
  });

  it('does not navigate when the text is neither a code nor a known place', async () => {
    const user = userEvent.setup();
    renderPage();

    const input = screen.getByLabelText(/recherche par code ou par lieu/i);
    // "nope" passe la longueur minimum (3 chars) donc Nominatim est appelé,
    // mais le mock renvoie [] → pas de redirection.
    await user.type(input, 'nope{Enter}');

    expect(push).not.toHaveBeenCalled();
  });

  it('exposes a conversion CTA link targeting /auth', () => {
    renderPage();
    const links = screen
      .getAllByRole('link')
      .filter((el) => el.getAttribute('href') === '/auth');
    expect(links.length).toBeGreaterThanOrEqual(1);
  });

  it('exposes a CTA link targeting the discovery map /carte', () => {
    renderPage();
    const links = screen
      .getAllByRole('link')
      .filter((el) => el.getAttribute('href') === '/carte');
    expect(links.length).toBeGreaterThanOrEqual(1);
  });
});
