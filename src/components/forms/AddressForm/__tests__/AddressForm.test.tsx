import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddressForm } from '@/components/forms/AddressForm';
import { ToastProvider } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import type { NearbyLandmark } from '@/types/api';

// Le shell immersif rend la carte-canvas (LocationCanvas) — pas de Leaflet en
// jsdom (même raison que les autres cartes mockées ailleurs).
jest.mock('@/components/forms/AddressForm/LocationCanvas', () => ({
  __esModule: true,
  LocationCanvas: () => <div data-testid="location-canvas" />,
  default: () => <div data-testid="location-canvas" />,
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
  usePathname: () => '/dashboard/address/new',
  useSearchParams: () => new URLSearchParams(),
}));

// Repère synthétique renvoyé par le spy quand on veut le cas « trouvé ».
const FAKE_LANDMARK: NearbyLandmark = {
  name: 'Pharmacie Les Potiers',
  category: 'Pharmacie',
  lat: 6.3705,
  lng: 2.4252,
  distanceM: 120,
};

// Coordonnées dans le polygone d'Akpakpa, loin des adresses seedées (création
// sans collision 409).
const AKP_COORDS = { lat: 6.369, lng: 2.43 };
// Coordonnées exactes de la fixture AKP-7X3K → collision ≤ 15 m → 409.
const DUPLICATE_COORDS = { lat: 6.3676, lng: 2.4252 };

function renderForm() {
  return render(
    <ToastProvider>
      <AddressForm />
    </ToastProvider>,
  );
}

function mockGeolocation(
  result: 'success' | 'denied',
  coords: { lat: number; lng: number } = AKP_COORDS,
  accuracy = 10,
) {
  const successPosition = {
    coords: {
      latitude: coords.lat,
      longitude: coords.lng,
      accuracy,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      toJSON() {
        return {};
      },
    },
    timestamp: Date.now(),
    toJSON() {
      return {};
    },
  } as GeolocationPosition;
  const errorPayload = {
    code: 1,
    message: 'denied',
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  } as GeolocationPositionError;

  const watchPosition = jest
    .fn()
    .mockImplementation(
      (success: PositionCallback, error?: PositionErrorCallback) => {
        if (result === 'success') {
          success(successPosition);
        } else {
          error?.(errorPayload);
        }
        return 1; // watch ID
      },
    );
  const getCurrentPosition = jest
    .fn()
    .mockImplementation(
      (success: PositionCallback, error?: PositionErrorCallback) => {
        if (result === 'success') {
          success(successPosition);
        } else {
          error?.(errorPayload);
        }
      },
    );
  const clearWatch = jest.fn();
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition, watchPosition, clearWatch },
  });
  return watchPosition;
}

// Étape 1 (GPS) → validation → on arrive sur l'étape Instructions.
async function completeGps(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByText(/° N,/i);
  await user.click(
    screen.getByRole('button', { name: /je suis devant ma porte/i }),
  );
}

describe('AddressForm', () => {
  beforeEach(() => {
    push.mockClear();
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('détecte un repère, le confirme, puis crée l’adresse (succès)', async () => {
    jest.spyOn(api, 'nearbyLandmark').mockResolvedValue(FAKE_LANDMARK);
    const user = userEvent.setup();
    mockGeolocation('success', AKP_COORDS);
    renderForm();

    // Étape 1 — GPS.
    await completeGps(user);

    // Étape 2 — confirmation du repère détecté.
    await screen.findByText(/un repère pour démarrer/i, undefined, {
      timeout: 5000,
    });
    expect(screen.getByText(/pharmacie les potiers/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /oui, je pars de là/i }));

    // Éditeur « guidé » : le départ est verrouillé ; on remplit une indication
    // de trajet (milieu) puis le repère visuel d'arrivée (toujours en dernier).
    const middleField = await screen.findByLabelText(
      /que faut-il faire ensuite/i,
    );
    const arrivalField = screen.getByLabelText(/reconnaît-on l.endroit/i);
    await user.type(middleField, 'Tourner à droite après l’école');
    await user.type(arrivalField, 'Portail bleu, grand manguier');
    await user.click(screen.getByRole('button', { name: /^continuer$/i }));

    // Étape 3 — catégorie.
    await user.click(await screen.findByRole('radio', { name: /^domicile$/i }));
    await user.click(screen.getByRole('button', { name: /^continuer$/i }));

    // Étape 4 — photo.
    const fileInput = screen.getByLabelText(/sélectionnez une photo/i);
    const file = new File(['x'], 'portail.jpg', { type: 'image/jpeg' });
    await user.upload(fileInput as HTMLInputElement, file);
    await user.click(screen.getByRole('button', { name: /uploader la photo/i }));
    await waitFor(
      () => {
        expect(
          screen.queryByRole('button', { name: /upload en cours/i }),
        ).not.toBeInTheDocument();
      },
      { timeout: 5000 },
    );
    await user.click(screen.getByRole('button', { name: /créer mon adresse/i }));

    // Écran de succès.
    const section = await screen.findByRole('status', undefined, { timeout: 5000 });
    expect(within(section).getByText(/adresse créée/i)).toBeInTheDocument();
    expect(within(section).getByText(/en attente de validation/i)).toBeInTheDocument();
    const codeNode = within(section).getByLabelText(/code de votre adresse/i);
    expect(codeNode.textContent).toMatch(/^AKP-[A-Z0-9]{4}$/);
  }, 20000);

  it('bascule en saisie libre quand aucun repère n’est détecté', async () => {
    jest.spyOn(api, 'nearbyLandmark').mockResolvedValue(null);
    const user = userEvent.setup();
    mockGeolocation('success', AKP_COORDS);
    renderForm();

    await completeGps(user);

    await screen.findByText(/aucun repère connu détecté/i, undefined, {
      timeout: 5000,
    });
    expect(
      screen.getByLabelText(/repère connu voulez-vous indiquer/i),
    ).toBeInTheDocument();
  }, 20000);

  it('laisse rejeter le repère détecté pour saisir le sien', async () => {
    jest.spyOn(api, 'nearbyLandmark').mockResolvedValue(FAKE_LANDMARK);
    const user = userEvent.setup();
    mockGeolocation('success', AKP_COORDS);
    renderForm();

    await completeGps(user);
    await screen.findByText(/un repère pour démarrer/i, undefined, {
      timeout: 5000,
    });
    await user.click(
      screen.getByRole('button', { name: /non, ce n.est pas le bon/i }),
    );

    expect(
      screen.getByLabelText(/repère connu voulez-vous indiquer/i),
    ).toBeInTheDocument();
  }, 20000);

  it('exige le premier (départ) et le dernier (arrivée) champ', async () => {
    jest.spyOn(api, 'nearbyLandmark').mockResolvedValue(null);
    const user = userEvent.setup();
    mockGeolocation('success', AKP_COORDS);
    renderForm();

    await completeGps(user);
    await screen.findByText(/aucun repère connu détecté/i, undefined, {
      timeout: 5000,
    });

    // Rien de rempli → désactivé, on réclame d'abord le départ.
    expect(
      await screen.findByRole('button', {
        name: /indiquez le point de départ/i,
      }),
    ).toBeDisabled();

    // Départ seul → toujours désactivé : l'arrivée reste obligatoire.
    await user.type(
      screen.getByLabelText(/repère connu voulez-vous indiquer/i),
      'Marché Dantokpa',
    );
    expect(
      screen.getByRole('button', { name: /indiquez le repère d.arrivée/i }),
    ).toBeDisabled();

    // Une étape de milieu reste optionnelle : elle ne débloque rien.
    await user.type(
      screen.getByLabelText(/que faut-il faire ensuite/i),
      'Tourner à droite',
    );
    expect(
      screen.getByRole('button', { name: /indiquez le repère d.arrivée/i }),
    ).toBeDisabled();

    // Départ + arrivée renseignés → activé.
    await user.type(
      screen.getByLabelText(/reconnaît-on l.endroit/i),
      'Portail bleu',
    );
    expect(screen.getByRole('button', { name: /^continuer$/i })).toBeEnabled();
  }, 20000);

  it('conserve les étapes saisies et ajoutées quand on revient en arrière', async () => {
    jest.spyOn(api, 'nearbyLandmark').mockResolvedValue(null);
    const user = userEvent.setup();
    mockGeolocation('success', AKP_COORDS);
    renderForm();

    await completeGps(user);
    await screen.findByText(/aucun repère connu détecté/i, undefined, {
      timeout: 5000,
    });

    await user.type(
      screen.getByLabelText(/repère connu voulez-vous indiquer/i),
      'Marché Dantokpa',
    );
    // Remplit l'étape de milieu par défaut, puis en ajoute une seconde.
    await user.type(
      screen.getByLabelText(/que faut-il faire ensuite/i),
      'Tourner à droite',
    );
    await user.click(screen.getByRole('button', { name: /ajouter une étape/i }));
    const middles = screen.getAllByLabelText(/que faut-il faire ensuite/i);
    expect(middles).toHaveLength(2);
    await user.type(middles[1], 'Continuer sur 100 m');
    await user.type(
      screen.getByLabelText(/reconnaît-on l.endroit/i),
      'Portail bleu',
    );
    await user.click(screen.getByRole('button', { name: /^continuer$/i }));

    // On a bien avancé (étape catégorie), puis on revient en arrière.
    await screen.findByRole('radio', { name: /^domicile$/i });
    await user.click(screen.getByRole('button', { name: /retour/i }));

    // Tous les champs précédemment remplis / ajoutés sont rétablis.
    expect(
      await screen.findByLabelText(/repère connu voulez-vous indiquer/i),
    ).toHaveValue('Marché Dantokpa');
    const restored = screen.getAllByLabelText(/que faut-il faire ensuite/i);
    expect(restored).toHaveLength(2);
    expect(restored[0]).toHaveValue('Tourner à droite');
    expect(restored[1]).toHaveValue('Continuer sur 100 m');
    expect(screen.getByLabelText(/reconnaît-on l.endroit/i)).toHaveValue(
      'Portail bleu',
    );
  }, 20000);

  it('refuse de valider une position trop imprécise et bascule en saisie manuelle', async () => {
    const user = userEvent.setup();
    // Précision de type géoloc IP (centaines de km) → au-dessus du plafond dur.
    mockGeolocation('success', AKP_COORDS, 230_913);
    renderForm();

    await screen.findByText(/position non fiable/i);
    // Pas de validation « devant ma porte » : l'option est retirée.
    expect(
      screen.queryByRole('button', { name: /je suis devant ma porte/i }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /saisir mes coordonnées/i }),
    );

    expect(screen.getByLabelText(/^latitude$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^longitude$/i)).toBeInTheDocument();
  }, 20000);

  it('affiche le formulaire manuel lat/lng quand la géolocalisation est refusée', async () => {
    mockGeolocation('denied');
    renderForm();

    await screen.findByText(/nous n’avons pas pu accéder à votre position/i);
    expect(screen.getByLabelText(/^latitude$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^longitude$/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /valider manuellement/i }),
    ).toBeInTheDocument();
  });

  it('rejette des coordonnées manuelles non numériques', async () => {
    mockGeolocation('denied');
    const user = userEvent.setup();
    renderForm();

    await screen.findByText(/nous n’avons pas pu accéder/i);
    await user.type(screen.getByLabelText(/^latitude$/i), 'abc');
    await user.type(screen.getByLabelText(/^longitude$/i), '!!');
    await user.click(screen.getByRole('button', { name: /valider manuellement/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/nombres décimaux/i);
  });

  it('permet de revenir à l’étape GPS', async () => {
    jest.spyOn(api, 'nearbyLandmark').mockResolvedValue(null);
    const user = userEvent.setup();
    mockGeolocation('success', AKP_COORDS);
    renderForm();

    await completeGps(user);
    await screen.findByText(/aucun repère connu détecté/i, undefined, {
      timeout: 5000,
    });

    await user.click(screen.getByRole('button', { name: /^retour$/i }));

    // De retour sur l'étape GPS : la position préremplie réaffiche la validation.
    expect(
      await screen.findByRole('button', { name: /je suis devant ma porte/i }),
    ).toBeInTheDocument();
  }, 20000);

  it('affiche l’écran « déjà une adresse ici » sur un doublon (409)', async () => {
    jest.spyOn(api, 'nearbyLandmark').mockResolvedValue(null);
    const user = userEvent.setup();
    mockGeolocation('success', DUPLICATE_COORDS);
    renderForm();

    await completeGps(user);
    await screen.findByText(/aucun repère connu détecté/i, undefined, {
      timeout: 5000,
    });

    await user.type(
      screen.getByLabelText(/repère connu voulez-vous indiquer/i),
      'Marché Dantokpa',
    );
    await user.type(
      screen.getByLabelText(/que faut-il faire ensuite/i),
      'Tourner à droite',
    );
    await user.type(
      screen.getByLabelText(/reconnaît-on l.endroit/i),
      'Portail bleu',
    );
    await user.click(screen.getByRole('button', { name: /^continuer$/i }));

    await user.click(await screen.findByRole('radio', { name: /^domicile$/i }));
    await user.click(screen.getByRole('button', { name: /^continuer$/i }));

    const fileInput = screen.getByLabelText(/sélectionnez une photo/i);
    await user.upload(
      fileInput as HTMLInputElement,
      new File(['x'], 'p.jpg', { type: 'image/jpeg' }),
    );
    await user.click(screen.getByRole('button', { name: /uploader la photo/i }));
    await waitFor(
      () => {
        expect(
          screen.queryByRole('button', { name: /upload en cours/i }),
        ).not.toBeInTheDocument();
      },
      { timeout: 5000 },
    );
    await user.click(screen.getByRole('button', { name: /créer mon adresse/i }));

    // Écran 409 conforme.
    await screen.findByText(/vous avez déjà une adresse à cet endroit/i, undefined, {
      timeout: 5000,
    });
    expect(
      screen.getByRole('link', { name: /voir \/ modifier cette adresse/i }),
    ).toBeInTheDocument();
  }, 20000);
});
