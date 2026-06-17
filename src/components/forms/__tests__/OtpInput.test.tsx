import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OtpInput } from '@/components/forms/OtpInput';

const getCells = () =>
  screen.getAllByRole('textbox') as HTMLInputElement[];

describe('OtpInput', () => {
  it('moves focus to the next cell after each digit', async () => {
    const user = userEvent.setup();
    render(<OtpInput onComplete={jest.fn()} />);

    const cells = getCells();
    expect(cells).toHaveLength(6);
    cells[0].focus();

    await user.keyboard('1');
    expect(document.activeElement).toBe(cells[1]);

    await user.keyboard('2');
    expect(document.activeElement).toBe(cells[2]);
  });

  it('ignores non-digit characters', async () => {
    const user = userEvent.setup();
    render(<OtpInput onComplete={jest.fn()} />);
    const cells = getCells();
    cells[0].focus();

    await user.keyboard('A');
    expect(cells[0].value).toBe('');
  });

  it('calls onComplete when six digits are typed in sequence', async () => {
    const user = userEvent.setup();
    const onComplete = jest.fn();
    render(<OtpInput onComplete={onComplete} />);

    const cells = getCells();
    cells[0].focus();
    await user.keyboard('123456');

    expect(onComplete).toHaveBeenCalledWith('123456');
  });

  it('clears the current digit on backspace, then jumps to the previous cell', async () => {
    const user = userEvent.setup();
    render(<OtpInput onComplete={jest.fn()} />);

    const cells = getCells();
    cells[0].focus();
    await user.keyboard('12');
    // After typing "12", cursor is on cell[2].
    expect(document.activeElement).toBe(cells[2]);

    await user.keyboard('{Backspace}');
    // First backspace: nothing in cell[2] to delete → moves to cell[1] and clears it.
    expect(document.activeElement).toBe(cells[1]);
    expect(cells[1].value).toBe('');

    await user.keyboard('{Backspace}');
    // cell[1] is now empty → moves to cell[0] and clears it.
    expect(document.activeElement).toBe(cells[0]);
    expect(cells[0].value).toBe('');
  });

  it('fills all cells and calls onComplete from a paste event', async () => {
    const user = userEvent.setup();
    const onComplete = jest.fn();
    render(<OtpInput onComplete={onComplete} />);

    const cells = getCells();
    cells[0].focus();
    await user.paste('847291');

    expect(cells.map((c) => c.value).join('')).toBe('847291');
    expect(onComplete).toHaveBeenCalledWith('847291');
  });
});
