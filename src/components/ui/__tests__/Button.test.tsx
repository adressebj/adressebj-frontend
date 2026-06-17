import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('renders the children label', () => {
    render(<Button>Valider</Button>);
    expect(screen.getByRole('button', { name: /valider/i })).toBeInTheDocument();
  });

  it('shows a spinner and is busy when loading', () => {
    render(<Button loading>Envoi…</Button>);
    const button = screen.getByRole('button', { name: /envoi/i });
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
    // The Loader2 icon is aria-hidden, so we assert via the SVG class.
    expect(button.querySelector('svg')).not.toBeNull();
  });

  it('does not fire onClick when disabled', async () => {
    const onClick = jest.fn();
    render(
      <Button disabled onClick={onClick}>
        Bloqué
      </Button>,
    );
    await userEvent.click(screen.getByRole('button', { name: /bloqué/i }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not fire onClick when loading', async () => {
    const onClick = jest.fn();
    render(
      <Button loading onClick={onClick}>
        Envoi
      </Button>,
    );
    await userEvent.click(screen.getByRole('button', { name: /envoi/i }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
