import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CodeSearchInput } from '@/components/forms/CodeSearchInput';

describe('CodeSearchInput', () => {
  it('calls onSearch with the upper-cased code when the format is valid', async () => {
    const user = userEvent.setup();
    const onSearch = jest.fn();
    render(<CodeSearchInput onSearch={onSearch} />);

    await user.type(screen.getByLabelText(/code adresse/i), 'akp-7x3k');
    await user.click(screen.getByRole('button', { name: /rechercher/i }));

    expect(onSearch).toHaveBeenCalledWith('AKP-7X3K');
  });

  it('shows an inline error and does not call onSearch when the format is invalid', async () => {
    const user = userEvent.setup();
    const onSearch = jest.fn();
    render(<CodeSearchInput onSearch={onSearch} />);

    await user.type(screen.getByLabelText(/code adresse/i), 'abc1234');
    await user.click(screen.getByRole('button', { name: /rechercher/i }));

    expect(onSearch).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/format invalide/i);
  });

  it('clears the error when the user edits the value after a failed submit', async () => {
    const user = userEvent.setup();
    const onSearch = jest.fn();
    render(<CodeSearchInput onSearch={onSearch} />);

    const input = screen.getByLabelText(/code adresse/i);
    await user.type(input, 'bad');
    await user.click(screen.getByRole('button', { name: /rechercher/i }));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    await user.type(input, '!');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
