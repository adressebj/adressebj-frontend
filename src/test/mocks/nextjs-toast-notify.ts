// Mock jest de `nextjs-toast-notify`. La vraie lib manipule directement le DOM
// (insertion/animation) de façon non déterministe sous jsdom. Ici, chaque toast
// insère simplement un nœud portant le message dans `document.body`, ce qui
// suffit aux assertions de test (`getByText(...)`) tout en restant stable.
//
// Le nettoyage entre tests est assuré par `clearMockToasts()` (appelé dans
// `jest.setup.ts`), pour éviter qu'un toast d'un test ne fuite vers le suivant.

type Method = 'success' | 'error' | 'warning' | 'info';

function render(variant: Method, message: string): void {
  if (typeof document === 'undefined') return;
  const node = document.createElement('div');
  node.setAttribute('data-mock-toast', variant);
  node.setAttribute('role', 'status');
  node.textContent = message;
  document.body.appendChild(node);
}

export const showToast = {
  success: (message: string) => render('success', message),
  error: (message: string) => render('error', message),
  warning: (message: string) => render('warning', message),
  info: (message: string) => render('info', message),
};

export function clearMockToasts(): void {
  if (typeof document === 'undefined') return;
  document
    .querySelectorAll('[data-mock-toast]')
    .forEach((el) => el.remove());
}
