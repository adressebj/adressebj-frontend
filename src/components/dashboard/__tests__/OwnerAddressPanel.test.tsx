import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OwnerAddressPanel } from '@/components/dashboard/OwnerAddressPanel';
import { ToastProvider } from '@/components/ui/Toast';
import type { OwnerAddress } from '@/types/api';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

function makeAddress(overrides: Partial<OwnerAddress> = {}): OwnerAddress {
  return {
    code: 'AKP-7X3K',
    quartierId: 'q1',
    quartier: {
      id: 'q1',
      name: 'Cadjèhoun',
      prefix: 'AKP',
      isActive: true,
    },
    category: 'DOMICILE',
    gps: { lat: 6.36, lng: 2.42 },
    photoUrl: 'https://example.com/portail.jpg',
    instructions: { steps: ['Tournez à droite'], assembledText: 'Tournez à droite' },
    reliabilityScore: null,
    averageRating: 4.8,
    ratingCount: 12,
    visitCount: 128,
    isActive: true,
    status: 'PUBLIEE',
    mapDiscoverable: true,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function renderPanel(address: OwnerAddress) {
  return render(
    <ToastProvider>
      <OwnerAddressPanel address={address} />
    </ToastProvider>,
  );
}

describe('OwnerAddressPanel', () => {
  it('affiche le code, le quartier et le lien vers la fiche détail', () => {
    renderPanel(makeAddress());
    expect(screen.getByLabelText('Code adresse AKP-7X3K')).toBeInTheDocument();
    expect(screen.getByText('Cadjèhoun')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /voir l['']adresse akp-7x3k/i }),
    ).toHaveAttribute('href', '/dashboard/address/AKP-7X3K');
  });

  it('expose Copier le code et un Partager actif quand publiée', () => {
    renderPanel(makeAddress({ status: 'PUBLIEE' }));
    expect(
      screen.getByRole('button', { name: /copier le code adresse/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^partager$/i })).toBeEnabled();
  });

  it('désactive Partager et annonce « Bientôt partageable » en attente', () => {
    renderPanel(makeAddress({ status: 'EN_ATTENTE_VALIDATION' }));
    expect(screen.getByRole('button', { name: /^partager$/i })).toBeDisabled();
    expect(screen.getByText(/bientôt partageable/i)).toBeInTheDocument();
  });

  it('annonce « Brouillon » pour une adresse en brouillon', () => {
    renderPanel(makeAddress({ status: 'BROUILLON' }));
    expect(screen.getByRole('button', { name: /^partager$/i })).toBeDisabled();
    const captions = screen.getAllByText(/^brouillon$/i);
    expect(captions.length).toBeGreaterThan(0);
  });

  it('annonce « Désactivée » pour une adresse désactivée', () => {
    renderPanel(makeAddress({ isActive: false }));
    expect(screen.getByRole('button', { name: /^partager$/i })).toBeDisabled();
    const captions = screen.getAllByText(/^désactivée$/i);
    expect(captions.length).toBeGreaterThan(0);
  });

  it('propose Modifier en CTA primaire quand rejetée', () => {
    renderPanel(makeAddress({ status: 'REJETEE' }));
    expect(
      screen.getByRole('link', { name: /^modifier$/i }),
    ).toHaveAttribute('href', '/dashboard/address/AKP-7X3K/edit');
  });

  it('ouvre le menu ⋯ avec ses actions et le ferme à Échap', async () => {
    const user = userEvent.setup();
    renderPanel(makeAddress());

    await user.click(screen.getByRole('button', { name: /plus d['']actions/i }));
    const menu = screen.getByRole('menu', { name: /actions de l['']adresse/i });
    expect(menu).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /voir la fiche/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /aperçu visiteur/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /modifier/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /qr/i })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
