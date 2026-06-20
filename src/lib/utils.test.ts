import { buildAssembledText } from './utils';

// Typographie française : espace fine insécable (U+202F) avant ? ! ; —
// espace insécable (U+00A0) avant :. Référencées par escape `\u` pour rester
// lisibles dans le source (les vraies espaces sont invisibles).
const THIN = ' ';
const NBSP = ' ';

describe('buildAssembledText', () => {
  it('returns an empty string when there are no steps', () => {
    expect(buildAssembledText([])).toBe('');
    expect(buildAssembledText(['', '   '])).toBe('');
  });

  it('joins steps into sentences ending with a period', () => {
    expect(
      buildAssembledText(['Partir du marché Dantokpa', 'tourner à droite']),
    ).toBe('Partir du marché Dantokpa. Tourner à droite.');
  });

  it('capitalizes the first letter of each step', () => {
    expect(buildAssembledText(['tourner à droite'])).toBe('Tourner à droite.');
  });

  it('leaves the rest of the casing untouched (acronyms, proper nouns)', () => {
    expect(buildAssembledText(['continuer vers le GPS de ESBTP'])).toBe(
      'Continuer vers le GPS de ESBTP.',
    );
  });

  it('does not double the period when the user already typed one', () => {
    expect(buildAssembledText(['Tourner à droite.', 'Portail bleu.'])).toBe(
      'Tourner à droite. Portail bleu.',
    );
  });

  it('collapses a run of trailing periods or ellipsis', () => {
    expect(buildAssembledText(['Continuer tout droit...'])).toBe(
      'Continuer tout droit.',
    );
  });

  it('removes a space the user left before the trailing punctuation', () => {
    expect(buildAssembledText(['Tourner à droite .'])).toBe('Tourner à droite.');
  });

  it('preserves a question/exclamation mark as the terminator with a French thin space', () => {
    expect(buildAssembledText(['Où est-ce ?'])).toBe(`Où est-ce${THIN}?`);
    expect(buildAssembledText(['Attention au chien !'])).toBe(
      `Attention au chien${THIN}!`,
    );
  });

  it('applies a thin non-breaking space before an inner ; ! or ?', () => {
    expect(buildAssembledText(['Au feu ; puis à gauche'])).toBe(
      `Au feu${THIN}; puis à gauche.`,
    );
  });

  it('applies a non-breaking space before a colon', () => {
    expect(buildAssembledText(['Au carrefour : tournez'])).toBe(
      `Au carrefour${NBSP}: tournez.`,
    );
  });

  it('does not space a colon that sits between digits (times, ratios)', () => {
    expect(buildAssembledText(['Rendez-vous à 8:30'])).toBe(
      'Rendez-vous à 8:30.',
    );
  });

  it('is idempotent when the user already typed a thin space before punctuation', () => {
    expect(buildAssembledText([`Où est-ce${THIN}?`])).toBe(`Où est-ce${THIN}?`);
  });

  it('collapses repeated internal whitespace', () => {
    expect(buildAssembledText(['tourner   à    droite'])).toBe(
      'Tourner à droite.',
    );
  });

  it('strips stray punctuation a user left at the very start of a step', () => {
    expect(buildAssembledText(['. tourner à droite'])).toBe('Tourner à droite.');
    expect(buildAssembledText([', puis tout droit'])).toBe('Puis tout droit.');
  });

  it('drops segments that are blank or punctuation-only after trimming', () => {
    expect(buildAssembledText(['Tourner', '', '   ', '...'])).toBe('Tourner.');
  });
});
