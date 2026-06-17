import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddressView } from '@/components/address/AddressView';
import { ToastProvider } from '@/components/ui/Toast';

// next/dynamic + leaflet would blow up in jsdom. Replace the dynamic map
// with a stable test-only placeholder so the surrounding flow stays
// observable.
jest.mock('@/components/map/MapNavigator', () => ({
  __esModule: true,
  MapNavigator: () => <div data-testid="map-navigator" />,
  default: () => <div data-testid="map-navigator" />,
}));

const push = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push,
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/a/AKP-7X3K',
  useSearchParams: () => new URLSearchParams(),
}));

function renderAt(code: string) {
  return render(
    <ToastProvider>
      <AddressView code={code} />
    </ToastProvider>,
  );
}

// Build a minimal unsigned JWT that the in-app useAuth hook accepts. Used to
// simulate an authenticated visitor for actions that the cas d'usage gates
// behind login (Signaler, Évaluer, Soumettre une précision terrain).
function authenticate() {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub: 'user_test',
      phone: '+22960000000',
      role: 'CREATOR',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86_400,
    }),
  );
  window.localStorage.setItem('adressebj_token', `${header}.${payload}.test`);
}

describe('AddressView', () => {
  beforeEach(() => {
    push.mockClear();
    window.localStorage.clear();
  });

  it('renders the photo, code, badge and instructions for the mocked address', async () => {
    renderAt('AKP-7X3K');

    // Code displayed (twice in DOM thanks to aria-label + visible text — at
    // least once is enough).
    await waitFor(() => {
      expect(screen.getAllByText('AKP-7X3K').length).toBeGreaterThan(0);
    });

    // Photo with the right alt text.
    expect(
      screen.getByAltText(/portail de l[’']adresse akp-7x3k/i),
    ).toBeInTheDocument();

    // ReliabilityBadge mode public CDC §4 — affiche "4,1/5 · 23 évaluations"
    // pour l'adresse mock AKP-7X3K (averageRating 4.1, ratingCount 23).
    expect(
      screen.getByRole('status', { name: /4,1\/5.*23 évaluations/i }),
    ).toBeInTheDocument();

    // Instructions list — 4 mocked steps.
    const list = screen.getByRole('list', { name: /instructions d[’']accès/i });
    expect(within(list).getAllByRole('listitem')).toHaveLength(4);

    // Navigation map placeholder rendered.
    expect(screen.getByTestId('map-navigator')).toBeInTheDocument();
  });

  it('shows a 404 message and a "Retour à l’accueil" link for an unknown code', async () => {
    renderAt('INEXISTANT');
    await screen.findByText(/aucune adresse trouvée pour ce code/i);
    expect(
      screen.queryByText(/cette adresse n[’']est plus active/i),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /retour à l[’']accueil/i })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it("shows a 410 message visibly distinct from the 404 copy when the address is deactivated", async () => {
    renderAt('DESACTIVE');
    await screen.findByRole('heading', {
      level: 1,
      name: /cette adresse n[’']est plus active/i,
    });
    expect(
      screen.queryByText(/aucune adresse trouvée pour ce code/i),
    ).not.toBeInTheDocument();
  });

  it('records the vote on a single star tap and shows the current score (upsert)', async () => {
    const user = userEvent.setup();
    // CDC §8 : l'évaluation est réservée aux Habitants authentifiés ; la
    // note est un upsert (PUT /addresses/:code/rating) — pas de blocage
    // côté frontend, l'utilisateur peut la modifier à tout moment.
    authenticate();
    renderAt('AKP-7X3K');

    const fourStars = await screen.findByRole('radio', { name: /4 étoiles/i });
    await user.click(fourStars);

    // L'entête bascule sur l'état « note actuelle » dès que l'upsert revient.
    await screen.findByRole('heading', {
      name: /votre note actuelle\s*:\s*4\/5/i,
    });

    const fourth = screen.getByRole('radio', { name: /4 étoiles/i });
    expect(fourth).toHaveAttribute('aria-checked', 'true');
  });

  it('opens the contribution form on "J’y suis" and toasts on submit', async () => {
    const user = userEvent.setup();
    // Cas d'usage : Soumettre une précision terrain <<include>> s'authentifier.
    // Authenticate first so the post_arrivée contribution form opens.
    authenticate();
    renderAt('AKP-7X3K');

    const arrived = await screen.findByRole('button', { name: /^j[’']y suis$/i });
    await user.click(arrived);

    // Contribution form appeared.
    const heading = await screen.findByRole('heading', {
      name: /aidez les prochains visiteurs/i,
    });
    expect(heading).toBeInTheDocument();

    // Pick a direction so the validation doesn't fire the "info" toast.
    const directionSelect = screen.getByLabelText(/sens de circulation/i);
    await user.selectOptions(directionSelect, 'double-sens');

    await user.click(
      screen.getByRole('button', { name: /partager ma contribution/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(/merci pour votre contribution/i),
      ).toBeInTheDocument();
    });
  });

  it('shows the auth gate when an anonymous visitor taps "Signaler un problème"', async () => {
    const user = userEvent.setup();
    renderAt('AKP-7X3K');

    const reportButton = await screen.findByRole('button', {
      name: /signaler un problème/i,
    });
    await user.click(reportButton);

    // Auth gate dialog appears with the login CTA, not the report form.
    expect(
      await screen.findByRole('heading', { name: /connexion requise/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /^signaler un problème$/i }),
    ).not.toBeInTheDocument();
  });
});
