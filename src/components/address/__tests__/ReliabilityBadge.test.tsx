import { render, screen } from '@testing-library/react';
import { ReliabilityBadge } from '@/components/address/ReliabilityBadge';

describe('ReliabilityBadge', () => {
  it('shows the "fiable" label for a high score', () => {
    render(<ReliabilityBadge score={80} />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveAttribute('data-level', 'high');
    expect(badge).toHaveTextContent(/adresse fiable/i);
  });

  it('shows the medium label for a mid score', () => {
    render(<ReliabilityBadge score={50} />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveAttribute('data-level', 'medium');
    expect(badge).toHaveTextContent(/moyenne/i);
  });

  it('shows the low label for a low score', () => {
    render(<ReliabilityBadge score={20} />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveAttribute('data-level', 'low');
    expect(badge).toHaveTextContent(/faible/i);
  });

  it('shows the neutral label when score is null', () => {
    render(<ReliabilityBadge score={null} />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveAttribute('data-level', 'unknown');
    expect(badge).toHaveTextContent(/pas encore évaluée/i);
  });

  it('never displays the raw numeric score', () => {
    render(<ReliabilityBadge score={87} />);
    expect(screen.queryByText('87')).not.toBeInTheDocument();
  });
});
