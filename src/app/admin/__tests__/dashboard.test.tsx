import { render, screen, waitFor } from '@testing-library/react';
import AdminHomePage from '@/app/admin/page';

// Régression : le tableau de bord plantait avec
// « Cannot read properties of undefined (reading 'toLocaleString') ».
// L'adaptateur réel renvoyait la structure imbriquée brute du backend
// (addresses/quartiers/moderation…) au lieu du contrat plat `AdminStats`,
// laissant les 4 clés `undefined`. Ce test verrouille le contrat
// shape ⇄ page : les 4 indicateurs réels doivent se rendre sans crash.
describe('Tableau de bord admin — indicateurs', () => {
  it('rend les 4 indicateurs réels et leurs valeurs sans planter', async () => {
    render(<AdminHomePage />);

    // Libellés présents dès le rendu (valeurs encore en skeleton).
    expect(screen.getByText('Adresses actives')).toBeInTheDocument();
    expect(screen.getByText('Révisions en attente')).toBeInTheDocument();
    expect(screen.getByText('Signalements en attente')).toBeInTheDocument();
    expect(screen.getByText('Quartiers actifs')).toBeInTheDocument();

    // Les valeurs chiffrées remplacent les skeletons, et l'état d'erreur
    // n'apparaît jamais.
    await waitFor(() => {
      expect(screen.getAllByText(/^\d+$/).length).toBeGreaterThanOrEqual(4);
    });
    expect(
      screen.queryByText(/Impossible de récupérer les statistiques/),
    ).not.toBeInTheDocument();
  });
});
