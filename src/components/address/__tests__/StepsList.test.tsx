import { render, screen } from '@testing-library/react';
import { StepsList } from '@/components/address/StepsList';

describe('StepsList', () => {
  const steps = [
    'Partir du marché Dantokpa',
    'Prendre la 2ème rue à droite',
    'Continuer sur 200 mètres',
    'Portail bleu avec étoile jaune',
  ];

  it('rend chaque étape comme un élément de liste', () => {
    render(<StepsList steps={steps} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });

  it('libelle le premier nœud « Départ » et le dernier « Arrivée »', () => {
    render(<StepsList steps={steps} />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent(/départ/i);
    expect(items[0]).toHaveTextContent(/dantokpa/i);
    expect(items[3]).toHaveTextContent(/arrivée/i);
    expect(items[3]).toHaveTextContent(/portail bleu/i);
  });

  it('numérote les étapes de trajet à partir de 1', () => {
    render(<StepsList steps={steps} />);
    const items = screen.getAllByRole('listitem');
    expect(items[1]).toHaveTextContent('1');
    expect(items[2]).toHaveTextContent('2');
  });

  it('conserve le contrat d’accessibilité (liste « Instructions d’accès »)', () => {
    render(<StepsList steps={steps} />);
    expect(
      screen.getByRole('list', { name: /instructions d.?accès/i }),
    ).toBeInTheDocument();
  });

  it('avec 2 étapes : départ + arrivée, aucune étape numérotée', () => {
    render(<StepsList steps={['Sortir de la station Total', 'Maison à toit rouge']} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent(/départ/i);
    expect(items[1]).toHaveTextContent(/arrivée/i);
  });

  it('ne rend rien pour un tableau vide', () => {
    const { container } = render(<StepsList steps={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
