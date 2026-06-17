import { render, screen } from '@testing-library/react';
import { StepsList } from '@/components/address/StepsList';

describe('StepsList', () => {
  it('renders each step as a list item', () => {
    render(
      <StepsList
        steps={[
          'Partir du marché Dantokpa',
          'Prendre la 2ème rue à droite',
          'Portail bleu avec étoile jaune',
        ]}
      />,
    );
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent(/dantokpa/i);
    expect(items[2]).toHaveTextContent(/portail bleu/i);
  });

  it('renders numbered markers starting at 1', () => {
    render(<StepsList steps={['A', 'B']} />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('1');
    expect(items[1]).toHaveTextContent('2');
  });

  it('renders nothing for an empty array', () => {
    const { container } = render(<StepsList steps={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
