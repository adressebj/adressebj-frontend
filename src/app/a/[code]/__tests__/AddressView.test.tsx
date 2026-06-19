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

  it('records a high rating then thanks the visitor without asking for a contribution', async () => {
    const user = userEvent.setup();
    // CDC §327 : à l'arrivée, le dialogue de retour est présenté EXPLICITEMENT
    // (pas un bloc passif dans le défilement). Une note ≥ 4 remercie et clôt,
    // sans proposer de contribution terrain.
    authenticate();
    renderAt('AKP-7X3K');

    await user.click(
      await screen.findByRole('button', { name: /lancer la navigation/i }),
    );
    await user.click(screen.getByRole('button', { name: /^j[’']y suis$/i }));

    // Étape « note » du dialogue.
    await user.click(await screen.findByRole('radio', { name: /4 étoiles/i }));

    // Note ≥ 4 → remerciement, et AUCUN formulaire de contribution.
    await screen.findByRole('heading', { name: /merci/i });
    expect(
      screen.queryByLabelText(/votre observation terrain/i),
    ).not.toBeInTheDocument();
  });

  it('proposes the field-note form after a low rating and confirms on submit', async () => {
    const user = userEvent.setup();
    // CDC §327 : note ≤ 3 → le formulaire de contribution terrain (texte libre)
    // est enchaîné dans le même dialogue.
    authenticate();
    renderAt('AKP-7X3K');

    await user.click(
      await screen.findByRole('button', { name: /lancer la navigation/i }),
    );
    await user.click(screen.getByRole('button', { name: /^j[’']y suis$/i }));

    // Note basse → bascule vers la contribution.
    await user.click(await screen.findByRole('radio', { name: /2 étoiles/i }));

    expect(
      await screen.findByRole('heading', {
        name: /aidez les prochains visiteurs/i,
      }),
    ).toBeInTheDocument();

    const noteField = screen.getByLabelText(/votre observation terrain/i);
    await user.type(noteField, 'Portail vert juste après la pharmacie.');
    await user.click(
      screen.getByRole('button', { name: /partager ma contribution/i }),
    );

    // Étape de remerciement après envoi.
    await screen.findByRole('heading', { name: /merci/i });
  });

  it('lets a visitor skip the rating and go straight to a field note', async () => {
    const user = userEvent.setup();
    authenticate();
    renderAt('AKP-7X3K');

    await user.click(
      await screen.findByRole('button', { name: /lancer la navigation/i }),
    );
    await user.click(screen.getByRole('button', { name: /^j[’']y suis$/i }));

    // « Je préfère ne pas noter » → contribution directement (CDC §327, branche
    // « absence d'évaluation »).
    await user.click(
      await screen.findByRole('button', { name: /je préfère ne pas noter/i }),
    );
    expect(
      await screen.findByRole('heading', {
        name: /aidez les prochains visiteurs/i,
      }),
    ).toBeInTheDocument();
  });

  it('invites an anonymous visitor to sign in when they arrive', async () => {
    const user = userEvent.setup();
    renderAt('AKP-7X3K'); // non authentifié

    await user.click(
      await screen.findByRole('button', { name: /lancer la navigation/i }),
    );
    await user.click(screen.getByRole('button', { name: /^j[’']y suis$/i }));

    // Dialogue d'invitation à se connecter — pas d'étoiles pour un anonyme.
    expect(
      await screen.findByRole('heading', { name: /vous êtes arrivé/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('radio', { name: /4 étoiles/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /se connecter/i }),
    ).toBeInTheDocument();
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

  it('gates the journey: "J’y suis" appears only after navigation, rating only after arrival', async () => {
    const user = userEvent.setup();
    authenticate();
    renderAt('AKP-7X3K');

    // 1. État initial : pas de « J'y suis », pas d'étoiles (dialogue fermé).
    await screen.findByRole('button', { name: /lancer la navigation/i });
    expect(
      screen.queryByRole('button', { name: /^j[’']y suis$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('radio', { name: /4 étoiles/i }),
    ).not.toBeInTheDocument();

    // 2. Après « Lancer la navigation » : « J'y suis » apparaît, pas encore d'étoiles.
    await user.click(
      screen.getByRole('button', { name: /lancer la navigation/i }),
    );
    expect(
      await screen.findByRole('button', { name: /^j[’']y suis$/i }),
    ).toBeEnabled();
    expect(
      screen.queryByRole('radio', { name: /4 étoiles/i }),
    ).not.toBeInTheDocument();

    // 3. Après « J'y suis » : le dialogue de retour s'ouvre avec les étoiles.
    await user.click(screen.getByRole('button', { name: /^j[’']y suis$/i }));
    expect(
      await screen.findByRole('radio', { name: /4 étoiles/i }),
    ).toBeEnabled();
  });
});
