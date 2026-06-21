# Refonte registre « Adresse héros » — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la grille de cartes du dashboard `/dashboard` par des panneaux d'adresse « héros » pleine largeur, calibrés pour 1-3 adresses, avec partage + suivi à égalité.

**Architecture:** Un nouveau composant `OwnerAddressPanel` (panneau horizontal desktop / empilé mobile) devient l'unité de liste. `DashboardPage` est recâblé pour empiler ces panneaux sous la carte signature, en supprimant le bandeau de stats agrégées. Les composants orphelins `OwnerAddressCard` et `RegistreOverview` sont supprimés.

**Tech Stack:** Next.js 16 App Router, React 19 (React Compiler), TypeScript strict, Tailwind v4, Jest + React Testing Library + `@testing-library/user-event`.

## Global Constraints

- Direction « Repère » : surfaces papier solides, bords nets, ombres chaudes. **ZÉRO glassmorphisme.** Pas d'AI-slop.
- React Compiler activé : **ne pas** ajouter `useMemo`/`useCallback` à la main.
- Tailwind v4 : utiliser **uniquement** les tokens/classes du design system (`card`, `bg-surface-muted`, `text-accent`, `text-primary`, `text-text-muted`, `border-border`, `animate-fade-up`, `tap-press`, `skeleton-shimmer`…). Aucune couleur en dur.
- Strings, commentaires, libellés : **en français**.
- Tests serial (`npm test` = `--runInBand`). Ne pas réactiver le parallélisme.
- Réutiliser sans réécrire : `ShareButton`, `AddressCodeDisplay`, `AddressStatusBadge`, `CategoryBadge`.
- Périmètre commit : ne committer que les fichiers du redesign ; **ne pas** committer les `.md` de cahier des charges modifiés en working-tree.
- Le renommage navbar « Adresses » → « Mes adresses » est **déjà fait** (`src/components/layout/Navbar.tsx`), à committer avec la Task 2.

**Écart assumé vs spec :** le spec mentionnait que « la photo ET le code lient vers la fiche ». `AddressCodeDisplay` contient déjà un bouton « Copier » (interactif) — on n'imbrique donc pas le code dans un `<Link>`. Le lien vers la fiche passe par **la photo** + l'entrée « Voir la fiche » du menu ⋯. Le code conserve sa fonction « Copier ».

**Écart assumé vs spec :** pas de test au niveau `DashboardPage` (import dynamique de Leaflet `ssr:false` + `api.myAddresses` sous auth JWT = harnais brittle pour une faible valeur marginale). Le contrat est couvert par le test de `OwnerAddressPanel` (Task 1) + la vérification build/lint/suite (Task 2).

---

### Task 1: Composant `OwnerAddressPanel`

**Files:**
- Create: `src/components/dashboard/OwnerAddressPanel.tsx`
- Test: `src/components/dashboard/__tests__/OwnerAddressPanel.test.tsx`

**Interfaces:**
- Consumes: `OwnerAddress` (`@/types/api`) ; `ShareButton` (`@/components/address/ShareButton`) ; `AddressCodeDisplay` (`@/components/address/AddressCodeDisplay`) ; `AddressStatusBadge` (`@/components/address/AddressStatusBadge`) ; `CategoryBadge` (`@/components/address/CategoryBadge`) ; `Button` (`@/components/ui/Button`) ; `classNames` (`@/lib/utils`).
- Produces: `OwnerAddressPanel({ address, className }: OwnerAddressPanelProps)` — named export + default export. `OwnerAddressPanelProps = { address: OwnerAddress; className?: string }`.

- [ ] **Step 1: Write the failing test**

Create `src/components/dashboard/__tests__/OwnerAddressPanel.test.tsx`:

```tsx
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
      screen.getByRole('link', { name: /voir l['’]adresse akp-7x3k/i }),
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

  it('propose Modifier en CTA primaire quand rejetée', () => {
    renderPanel(makeAddress({ status: 'REJETEE' }));
    expect(
      screen.getByRole('link', { name: /^modifier$/i }),
    ).toHaveAttribute('href', '/dashboard/address/AKP-7X3K/edit');
  });

  it('ouvre le menu ⋯ avec ses actions et le ferme à Échap', async () => {
    const user = userEvent.setup();
    renderPanel(makeAddress());

    await user.click(screen.getByRole('button', { name: /plus d['’]actions/i }));
    const menu = screen.getByRole('menu', { name: /actions de l['’]adresse/i });
    expect(menu).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /voir la fiche/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /aperçu visiteur/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /modifier/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /qr/i })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/dashboard/__tests__/OwnerAddressPanel.test.tsx`
Expected: FAIL — `Cannot find module '@/components/dashboard/OwnerAddressPanel'`.

- [ ] **Step 3: Write the component**

Create `src/components/dashboard/OwnerAddressPanel.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Eye,
  Footprints,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  QrCode,
  Star,
  type LucideIcon,
} from 'lucide-react';
import { AddressCodeDisplay } from '@/components/address/AddressCodeDisplay';
import { AddressStatusBadge } from '@/components/address/AddressStatusBadge';
import { CategoryBadge } from '@/components/address/CategoryBadge';
import { ShareButton } from '@/components/address/ShareButton';
import { Button } from '@/components/ui/Button';
import { classNames } from '@/lib/utils';
import type { OwnerAddress } from '@/types/api';

export interface OwnerAddressPanelProps {
  address: OwnerAddress;
  className?: string;
}

/**
 * Panneau d'adresse « héros » du registre (`/dashboard`). Objet pleine largeur
 * — média portail à gauche (desktop) / en bannière (mobile), corps à droite
 * avec code signature copiable, quartier, performance compacte et actions de
 * partage. Le partage n'est actif que sur une adresse publiée et active ; les
 * autres statuts orientent vers l'action utile (Modifier) ou expliquent
 * l'indisponibilité. Le détail est accessible via la photo et le menu ⋯.
 */
export function OwnerAddressPanel({ address, className }: OwnerAddressPanelProps) {
  const detailHref = `/dashboard/address/${address.code}`;
  const publicUrl =
    (typeof window !== 'undefined' ? window.location.origin : '') +
    `/a/${address.code}`;
  const rated = address.ratingCount > 0 && address.averageRating != null;
  const canShare = address.status === 'PUBLIEE' && address.isActive;

  // Légende quand le partage est indisponible — on n'invite pas à partager un
  // lien public qui n'est pas (encore) live.
  const unavailableCaption = !address.isActive
    ? 'Désactivée'
    : address.status === 'EN_ATTENTE_VALIDATION'
      ? 'Bientôt partageable'
      : 'Brouillon';

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Menu ⋯ : fermeture au clic extérieur + Échap (même pattern que le menu
  // avatar de la navbar).
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  return (
    <article
      className={classNames(
        'card overflow-hidden flex flex-col sm:flex-row',
        !address.isActive && 'opacity-75',
        className,
      )}
    >
      {/* ── Média : portail + statut en surimpression, lien vers la fiche ── */}
      <Link
        href={detailHref}
        aria-label={`Voir l'adresse ${address.code}`}
        className="group relative block aspect-[16/10] overflow-hidden bg-surface-muted sm:aspect-auto sm:w-56 sm:shrink-0"
      >
        <Image
          src={address.photoUrl}
          alt={`Portail ${address.code}`}
          fill
          sizes="(min-width: 640px) 14rem, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          unoptimized
        />
        <span className="absolute left-3 top-3 drop-shadow-sm">
          <AddressStatusBadge status={address.status} />
        </span>
      </Link>

      {/* ── Corps ── */}
      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <AddressCodeDisplay code={address.code} size="md" />

          <div ref={menuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Plus d'actions"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-muted hover:text-text-primary cursor-pointer"
            >
              <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
            </button>

            {menuOpen ? (
              <div
                role="menu"
                aria-label="Actions de l'adresse"
                className="absolute right-0 top-full z-10 mt-2 w-52 origin-top-right rounded-2xl border border-border/70 bg-surface p-1.5 shadow-lg animate-fade-up"
              >
                <PanelMenuLink href={detailHref} icon={Eye}>
                  Voir la fiche
                </PanelMenuLink>
                <PanelMenuLink href={`/a/${address.code}`} icon={Eye}>
                  Aperçu visiteur
                </PanelMenuLink>
                <PanelMenuLink href={`${detailHref}/edit`} icon={Pencil}>
                  Modifier
                </PanelMenuLink>
                <PanelMenuLink href={`${detailHref}/print`} icon={QrCode}>
                  QR / Imprimer
                </PanelMenuLink>
              </div>
            ) : null}
          </div>
        </div>

        <p className="flex items-center gap-1.5 text-sm text-text-muted">
          <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="truncate">
            {address.quartier?.name ?? 'Quartier inconnu'}
          </span>
        </p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <CategoryBadge category={address.category} size="sm" />
          <span className="flex items-center gap-3 text-xs font-medium text-text-muted">
            {rated ? (
              <span className="inline-flex items-center gap-1">
                <Star
                  className="h-3.5 w-3.5 fill-accent text-accent"
                  aria-hidden="true"
                />
                {address.averageRating!.toFixed(1).replace('.', ',')}
              </span>
            ) : (
              <span>Pas encore notée</span>
            )}
            <span className="inline-flex items-center gap-1">
              <Footprints className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              {address.visitCount}
            </span>
          </span>
        </div>

        {/* ── Actions : partage (publiée) / modifier (rejetée) / indispo ── */}
        <div className="mt-auto flex items-center gap-2 pt-1">
          {canShare ? (
            <ShareButton
              url={publicUrl}
              title={`Adresse ${address.code}`}
              text={`Voici mon adresse AdresseBJ : ${address.code}`}
              variant="primary"
              size="sm"
            />
          ) : address.status === 'REJETEE' ? (
            <Link href={`${detailHref}/edit`}>
              <Button
                variant="primary"
                size="sm"
                leadingIcon={<Pencil className="h-4 w-4" aria-hidden="true" />}
              >
                Modifier
              </Button>
            </Link>
          ) : (
            <>
              <Button
                variant="primary"
                size="sm"
                disabled
                leadingIcon={<MessageCircle className="h-4 w-4" aria-hidden="true" />}
              >
                Partager
              </Button>
              <span className="text-xs text-text-muted">{unavailableCaption}</span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function PanelMenuLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-muted transition-colors hover:bg-surface-muted hover:text-text-primary"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span>{children}</span>
    </Link>
  );
}

export default OwnerAddressPanel;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/dashboard/__tests__/OwnerAddressPanel.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Lint the new files**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/OwnerAddressPanel.tsx src/components/dashboard/__tests__/OwnerAddressPanel.test.tsx
git commit -m "$(cat <<'EOF'
refonte(registre): composant OwnerAddressPanel (adresse héros)

Panneau pleine largeur — média portail + code copiable + partage
contextuel selon le statut + menu d'actions. Remplacera OwnerAddressCard.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Recâbler `DashboardPage` + supprimer les orphelins

**Files:**
- Modify: `src/app/dashboard/page.tsx` (réécriture du rendu `ok`/loading + en-tête + CTA)
- Delete: `src/components/dashboard/OwnerAddressCard.tsx`
- Delete: `src/components/dashboard/RegistreOverview.tsx`
- (Already modified, à committer ici) : `src/components/layout/Navbar.tsx`

**Interfaces:**
- Consumes: `OwnerAddressPanel` (Task 1) ; `RegistreMap` (`@/components/dashboard/RegistreMap`, inchangé) ; `api.myAddresses()` (inchangé) ; `Button`, `Link`, icônes lucide `Plus`/`RotateCw`/`Lock`.
- Produces: page `/dashboard` rendue avec carte signature + pile de `OwnerAddressPanel` + CTA « Créer une adresse ».

- [ ] **Step 1: Vérifier l'absence d'autres consommateurs des orphelins**

Run: `grep -rn "OwnerAddressCard\|RegistreOverview" src`
Expected: occurrences **uniquement** dans `src/components/dashboard/OwnerAddressCard.tsx`, `src/components/dashboard/RegistreOverview.tsx` et `src/app/dashboard/page.tsx`. Si un autre fichier apparaît, s'arrêter et réévaluer.

- [ ] **Step 2: Réécrire `src/app/dashboard/page.tsx`**

Remplacer **intégralement** le contenu du fichier par :

```tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Lock, Plus, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { OwnerAddressPanel } from '@/components/dashboard/OwnerAddressPanel';
import { ApiError, api } from '@/lib/api';
import type { OwnerAddress } from '@/types/api';

// Aperçu carte non interactif — Leaflet touche `window` à l'import.
const RegistreMap = dynamic(
  () => import('@/components/dashboard/RegistreMap').then((m) => m.RegistreMap),
  {
    ssr: false,
    loading: () => <div className="h-full w-full skeleton-shimmer" />,
  },
);

type ListState =
  | { kind: 'loading' }
  | { kind: 'ok'; addresses: OwnerAddress[] }
  | { kind: 'suspended'; reason?: string | null }
  | { kind: 'error' };

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Bonsoir';
  if (h < 18) return 'Bonjour';
  return 'Bonsoir';
}

export default function DashboardPage() {
  const [state, setState] = useState<ListState>({ kind: 'loading' });

  const fetchAddresses = useCallback(() => {
    api
      .myAddresses()
      .then((addresses) => setState({ kind: 'ok', addresses }))
      .catch((err) => {
        if (
          err instanceof ApiError &&
          err.status === 403 &&
          (err.code === 'HABITANT_SUSPENDED' || err.code === 'ACCOUNT_SUSPENDED')
        ) {
          setState({
            kind: 'suspended',
            reason: (err.extra?.reason as string | undefined) ?? null,
          });
          return;
        }
        setState({ kind: 'error' });
      });
  }, []);

  const reload = useCallback(() => {
    setState({ kind: 'loading' });
    fetchAddresses();
  }, [fetchAddresses]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  // ── Compte suspendu — sortie de garde plein écran, pas de chrome registre. ──
  if (state.kind === 'suspended') {
    return (
      <section className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-10">
        <div className="card p-6 sm:p-8 flex flex-col gap-3 animate-fade-up" role="alert">
          <span
            aria-hidden="true"
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-danger-light text-danger ring-1 ring-danger/15 self-start"
          >
            <Lock className="h-6 w-6" />
          </span>
          <div>
            <h1 className="font-display font-bold text-h3 text-text-primary">
              Compte suspendu
            </h1>
            <p className="text-text-muted mt-1 leading-relaxed">
              Un membre de notre équipe a suspendu votre compte. Pour l’instant,
              vos adresses ne sont plus visibles et vous ne pouvez plus en créer
              ni en modifier.
              {state.reason ? (
                <>
                  <br />
                  <span className="block mt-2 italic">« {state.reason} »</span>
                </>
              ) : null}
            </p>
            <p className="text-text-muted mt-3 text-sm">
              Si vous pensez qu’il s’agit d’une erreur, écrivez-nous à{' '}
              <a
                href="mailto:support@adressebj.bj"
                className="text-primary underline"
              >
                support@adressebj.bj
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    );
  }

  const pins =
    state.kind === 'ok'
      ? state.addresses.map((a) => ({
          code: a.code,
          lat: a.gps.lat,
          lng: a.gps.lng,
          category: a.category,
        }))
      : [];

  return (
    <div className="relative min-h-full pb-20 lg:pb-12">
      <section className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-6 lg:py-10 flex flex-col gap-7">
        {/* ── En-tête éditorial ── */}
        <header className="flex flex-col gap-3 animate-fade-up sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              {greeting()}
            </p>
            <h1 className="font-display font-black text-h1 text-text-primary">
              Votre registre d’adresses
            </h1>
            <p className="text-text-muted max-w-prose">
              Toutes vos adresses au même endroit. Voyez lesquelles sont prêtes
              et partagez-les facilement.
            </p>
          </div>
          <Link href="/dashboard/address/new" className="hidden sm:block shrink-0">
            <Button
              variant="primary"
              size="md"
              leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
            >
              Créer une adresse
            </Button>
          </Link>
        </header>

        {state.kind === 'loading' ? (
          <LoadingRegistre />
        ) : state.kind === 'error' ? (
          <div className="card p-5 flex flex-col gap-3 animate-fade-up">
            <p className="text-text-primary">
              On n’arrive pas à afficher vos adresses pour le moment.
            </p>
            <Button
              variant="primary"
              size="md"
              onClick={reload}
              leadingIcon={<RotateCw className="h-4 w-4" aria-hidden="true" />}
              className="self-start"
            >
              Réessayer
            </Button>
          </div>
        ) : state.addresses.length === 0 ? (
          <EmptyRegistre />
        ) : (
          <>
            {/* ── Signature carte — aperçu de tous vos pins ── */}
            <div className="relative h-44 sm:h-56 overflow-hidden rounded-[var(--radius-lg)] border border-border shadow-sm animate-fade-up stagger-1">
              <RegistreMap pins={pins} className="h-full w-full" />
            </div>

            {/* ── Pile de panneaux ── */}
            <ul
              aria-label="Liste de mes adresses"
              className="flex flex-col gap-4"
            >
              {state.addresses.map((address, idx) => (
                <li
                  key={address.code}
                  className={`animate-fade-up stagger-${Math.min(idx + 2, 5)}`}
                >
                  <OwnerAddressPanel address={address} />
                </li>
              ))}
              <li className="animate-fade-up">
                <Link
                  href="/dashboard/address/new"
                  className="group flex items-center justify-center gap-3 rounded-[var(--radius-lg)] border-2 border-dashed border-border-strong bg-surface-muted/40 px-6 py-5 text-center transition-colors hover:border-primary hover:bg-primary-surface/40 tap-press"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-surface text-primary ring-1 ring-primary/15 transition-transform group-hover:scale-110">
                    <Plus className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="font-display font-semibold text-text-primary">
                    Créer une adresse
                  </span>
                </Link>
              </li>
            </ul>
          </>
        )}
      </section>

      {/* FAB mobile — sur desktop le bouton d'en-tête + le CTA de fin suffisent. */}
      <Link
        href="/dashboard/address/new"
        aria-label="Créer une nouvelle adresse"
        className="lg:hidden fixed z-40 bottom-6 right-4 inline-flex items-center justify-center h-14 w-14 rounded-full bg-primary text-text-inverse shadow-lg hover:bg-primary-hover hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/40 group"
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-primary/40 blur-md animate-soft-pulse"
        />
        <Plus
          className="h-6 w-6 relative transition-transform duration-200 group-hover:rotate-90"
          aria-hidden="true"
        />
      </Link>
    </div>
  );
}

function LoadingRegistre() {
  return (
    <div
      className="flex flex-col gap-7"
      aria-label="Chargement des adresses"
      aria-busy="true"
    >
      <div className="h-44 sm:h-56 rounded-[var(--radius-lg)] skeleton-shimmer" />
      <ul className="flex flex-col gap-4">
        {[0, 1].map((i) => (
          <li key={i} className="card overflow-hidden flex flex-col sm:flex-row">
            <div className="aspect-[16/10] w-full sm:aspect-auto sm:w-56 sm:shrink-0 skeleton-shimmer" />
            <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
              <div className="h-8 w-40 rounded skeleton-shimmer" />
              <div className="h-3 w-32 rounded skeleton-shimmer" />
              <div className="h-3 w-24 rounded skeleton-shimmer" />
              <div className="mt-2 h-9 w-28 rounded-full skeleton-shimmer" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyRegistre() {
  return (
    <div className="card p-8 sm:p-10 flex flex-col items-center text-center gap-4 animate-fade-up motif-paper">
      <span
        aria-hidden="true"
        className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary-surface text-primary ring-1 ring-primary/15"
      >
        <span className="absolute inset-0 rounded-full bg-primary/15 animate-soft-pulse" />
        <Plus className="h-7 w-7 relative" />
      </span>
      <div>
        <h2 className="font-display font-bold text-h3 text-text-primary">
          Vous n’avez pas encore d’adresse.
        </h2>
        <p className="text-text-muted mt-1 max-w-sm">
          Créez la vôtre en quelques minutes. On vous accompagne à chaque étape,
          c’est simple.
        </p>
      </div>
      <Link href="/dashboard/address/new">
        <Button
          variant="primary"
          size="md"
          leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
        >
          Créer ma première adresse
        </Button>
      </Link>
    </div>
  );
}
```

- [ ] **Step 3: Supprimer les composants orphelins**

```bash
git rm src/components/dashboard/OwnerAddressCard.tsx src/components/dashboard/RegistreOverview.tsx
```

- [ ] **Step 4: Vérifier que rien ne référence plus les orphelins**

Run: `grep -rn "OwnerAddressCard\|RegistreOverview" src`
Expected: **aucune** occurrence.

- [ ] **Step 5: Lancer la suite de tests complète**

Run: `npm test`
Expected: PASS (toute la suite verte, y compris le nouveau test de Task 1).

- [ ] **Step 6: Build + lint**

Run: `npm run lint && npm run build`
Expected: lint sans erreur ; build réussi.

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/page.tsx src/components/layout/Navbar.tsx
git commit -m "$(cat <<'EOF'
refonte(registre): page dashboard en panneaux « adresse héros »

Pile de OwnerAddressPanel sous la carte signature, en-tête avec CTA
desktop, skeleton recalé. Supprime le bandeau stats agrégé et la grille
de cartes (OwnerAddressCard, RegistreOverview). Navbar : « Mes adresses ».

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**1. Spec coverage**
- Direction « Adresse héros » pleine largeur → Task 1 (`OwnerAddressPanel`) + Task 2 (pile). ✅
- Suppression bandeau stats agrégé (`RegistreOverview`) → Task 2 Step 3. ✅
- Photo média + statut overlay → Task 1 composant. ✅
- Code copiable (`AddressCodeDisplay`) → Task 1, test Step 1. ✅
- Performance compacte (★ · visites) → Task 1 composant. ✅
- Partager (primaire) + menu ⋯ → Task 1, tests. ✅
- États par statut (publiée/en attente/rejetée/désactivée) → Task 1 logique `canShare` + `unavailableCaption` + branche REJETEE, tests. ✅
- Carte signature conservée, hauteur responsive → Task 2 (`h-44 sm:h-56`). ✅
- Responsive desktop horizontal / mobile empilé → `flex-col sm:flex-row`. ✅
- États de page (loading recalé, error, suspended, empty) → Task 2. ✅
- Renommage navbar → déjà fait, committé Task 2. ✅
- **Écart documenté** : code non-lié (copie inline) + pas de test page-level — voir Global Constraints. ✅

**2. Placeholder scan** : aucun TBD/TODO ; tout le code des steps est complet. ✅

**3. Type consistency** : `OwnerAddressPanelProps`, `OwnerAddress`, `canShare`, `unavailableCaption`, `PanelMenuLink` cohérents entre Task 1 et 2. `RegistreMap` consomme `pins: {code,lat,lng,category}` comme l'existant. ✅
