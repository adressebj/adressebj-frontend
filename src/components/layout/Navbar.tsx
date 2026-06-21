'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  ChevronDown,
  Compass,
  Home,
  LogOut,
  MapPin,
  Menu,
  User,
  X,
  type LucideIcon,
} from 'lucide-react';
// Bell est toujours utilisé dans le drawer "Alertes" via DRAWER_ITEMS.
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/hooks/useAuth';
import { classNames } from '@/lib/utils';

interface DrawerItem {
  href: string;
  label: string;
  icon: LucideIcon;
  dot?: boolean;
  match: (pathname: string) => boolean;
}

const DRAWER_ITEMS: DrawerItem[] = [
  { href: '/', label: 'Accueil', icon: Home, match: (p) => p === '/' },
  { href: '/carte', label: 'Explorer', icon: Compass, match: (p) => p.startsWith('/carte') },
  {
    href: '/dashboard',
    label: 'Mes adresses',
    icon: MapPin,
    match: (p) =>
      p.startsWith('/dashboard') &&
      !p.startsWith('/dashboard/profile') &&
      !p.startsWith('/dashboard/notifications'),
  },
  {
    href: '/dashboard/notifications',
    label: 'Alertes',
    icon: Bell,
    dot: true,
    match: (p) => p.startsWith('/dashboard/notifications'),
  },
  {
    href: '/dashboard/profile',
    label: 'Profil',
    icon: User,
    match: (p) => p.startsWith('/dashboard/profile'),
  },
];

// Same first two links on the desktop top bar (Alertes/Profil/Déconnexion
// vivent dans le menu de l'avatar — ACCOUNT_ITEMS).
const DESKTOP_LINKS = [
  { href: '/', label: 'Accueil', icon: Home, match: (p: string) => p === '/' },
  {
    href: '/dashboard',
    label: 'Mes adresses',
    icon: MapPin,
    // On n'allume pas « Mes adresses » quand on est dans profil ou
    // notifications (ils ont leur entrée dédiée).
    match: (p: string) =>
      p.startsWith('/dashboard') &&
      !p.startsWith('/dashboard/profile') &&
      !p.startsWith('/dashboard/notifications'),
  },
];

// Menu de l'avatar (desktop connecté) : les deux entrées de compte du drawer
// (Alertes, Profil). Accueil/Adresses sont déjà dans la barre.
const ACCOUNT_ITEMS = DRAWER_ITEMS.filter(
  (item) =>
    item.href === '/dashboard/notifications' ||
    item.href === '/dashboard/profile',
);

export function Navbar() {
  const { isAuthenticated, isReady, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname() ?? '/';

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the drawer AND the account menu whenever the route changes — typical
  // pattern so a link tap doesn't leave them visible behind the destination.
  useEffect(() => {
    setDrawerOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open so the backdrop doesn't allow
  // background scrolling on mobile.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  // Account menu (desktop) : fermeture au clic extérieur + touche Échap.
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

  const handleLogout = () => {
    logout();
    setDrawerOpen(false);
    setMenuOpen(false);
    router.push('/');
  };

  return (
    <>
      {/* Mobile : barre pleine largeur collée en haut (en flux). Desktop :
         pilule « island » flottante en overlay (fixed) — décrochée du haut,
         centrée et arrondie. En overlay, elle ne réserve aucune hauteur :
         le contenu passe dessous (le hero remonte jusqu'en haut). */}
      <header className="sticky top-0 z-30 w-full bg-bg/85 backdrop-blur-md border-b border-border/80 md:fixed md:inset-x-0 md:top-0 md:bg-transparent md:backdrop-blur-none md:border-b-0 md:pt-4">
        <nav className="mx-auto flex h-16 items-center justify-between gap-2 px-4 max-w-[1280px] md:h-auto md:max-w-fit md:justify-center md:gap-4 md:rounded-full md:border md:border-border/70 md:bg-bg/80 md:backdrop-blur-md md:shadow-lg md:pl-6 md:pr-3 md:py-3">
          <div className="flex items-center gap-2 md:pr-1">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Ouvrir le menu"
                aria-expanded={drawerOpen}
                aria-controls="mobile-nav-drawer"
                className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-md text-text-primary hover:bg-surface-muted transition-colors"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
            ) : null}
            <Link href="/" aria-label="Accueil AdresseBJ">
              <Logo size="lg" />
            </Link>
          </div>

          {/* Séparateur net entre le logo et les options (desktop). */}
          <span
            aria-hidden="true"
            className="hidden md:block h-7 w-px bg-border/70"
          />

          <div className="hidden md:flex items-center gap-1">
            {DESKTOP_LINKS.map((link) => {
              const active = link.match(pathname);
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={classNames(
                    'inline-flex items-center gap-2 text-sm px-3.5 py-2 rounded-full transition-colors',
                    active
                      ? 'font-semibold text-primary bg-primary-surface'
                      : 'text-text-muted hover:bg-surface-muted hover:text-text-primary',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {/* Visiteur : accès rapide Explorer + Connexion.
               Connecté mobile : tout passe par le drawer (hamburger gauche).
               Connecté desktop : avatar + menu déroulant (Alertes/Profil/
               Déconnexion) — sinon aucun accès au compte sur grand écran. */}
            {isReady && isAuthenticated ? (
              // Connecté : « Explorer » devient un bouton vert signature — pilule
              // de marque + boussole qui pivote au survol. Calque le composant
              // fourni, adapté à notre vert (texte inverse pour le contraste,
              // notre vert primary étant foncé).
              <Link
                href="/carte"
                aria-label="Explorer la carte"
                aria-current={pathname.startsWith('/carte') ? 'page' : undefined}
                className="group hidden sm:inline-flex items-center gap-2.5 h-10 pl-2.5 pr-4 rounded-full bg-primary text-text-inverse text-sm font-semibold shadow-md hover:bg-primary-hover active:scale-[0.97] transition-[background-color,transform] duration-300"
              >
                <svg
                  viewBox="0 0 512 512"
                  aria-hidden="true"
                  className="h-[25px] w-[25px] fill-current transition-transform duration-[1500ms] group-hover:rotate-[250deg]"
                >
                  <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm50.7-186.9L162.4 380.6c-19.4 7.5-38.5-11.6-31-31l55.5-144.3c3.3-8.5 9.9-15.1 18.4-18.4l144.3-55.5c19.4-7.5 38.5 11.6 31 31L325.1 306.7c-3.2 8.5-9.9 15.1-18.4 18.4zM288 256a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z" />
                </svg>
                Explorer
              </Link>
            ) : isReady ? (
              <Link
                href="/carte"
                className="hidden sm:inline-flex items-center gap-2 text-sm px-3.5 py-2 rounded-full text-text-muted hover:bg-surface-muted hover:text-text-primary transition-colors"
              >
                <Compass className="h-4 w-4" aria-hidden="true" />
                Explorer
              </Link>
            ) : null}

            {isReady && !isAuthenticated ? (
              <Link
                href="/auth"
                className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-full bg-primary text-text-inverse shadow-sm hover:bg-primary-hover hover:shadow-md transition-all tap-press"
              >
                <User className="h-4 w-4" aria-hidden="true" />
                Connexion
              </Link>
            ) : null}

            {isReady && isAuthenticated ? (
              <div ref={menuRef} className="hidden md:block relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label="Menu du compte"
                  className="relative inline-flex items-center gap-1 rounded-full p-0.5 pr-1.5 hover:bg-surface-muted transition-colors cursor-pointer"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary-surface text-primary">
                    <User className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <ChevronDown
                    className={classNames(
                      'h-4 w-4 text-text-muted transition-transform',
                      menuOpen ? 'rotate-180' : '',
                    )}
                    aria-hidden="true"
                  />
                  {/* Pastille d'alerte (placeholder, cohérent avec le drawer). */}
                  <span
                    aria-hidden="true"
                    className="absolute left-6 top-0.5 h-2 w-2 rounded-full bg-danger ring-2 ring-bg"
                  />
                </button>

                {menuOpen ? (
                  <div
                    role="menu"
                    aria-label="Menu du compte"
                    className="absolute right-0 top-full mt-2 w-56 origin-top-right rounded-2xl border border-border/70 bg-surface p-1.5 shadow-lg animate-fade-up"
                  >
                    {ACCOUNT_ITEMS.map((item) => {
                      const active = item.match(pathname);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          role="menuitem"
                          aria-current={active ? 'page' : undefined}
                          className={classNames(
                            'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors',
                            active
                              ? 'bg-primary-surface text-primary font-semibold'
                              : 'text-text-muted hover:bg-surface-muted hover:text-text-primary',
                          )}
                        >
                          <Icon className="h-4 w-4" aria-hidden="true" />
                          <span>{item.label}</span>
                          {item.dot && !active ? (
                            <span
                              aria-hidden="true"
                              className="ml-auto h-2 w-2 rounded-full bg-danger"
                            />
                          ) : null}
                        </Link>
                      );
                    })}
                    <div
                      aria-hidden="true"
                      className="my-1 h-px bg-border/70"
                    />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-danger hover:bg-danger-light/40 transition-colors cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      Se déconnecter
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </nav>
      </header>

      {isAuthenticated && drawerOpen ? (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDrawerOpen(false);
          }}
        >
          <aside
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navigation"
            className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-surface flex flex-col animate-drawer-in"
          >
            <div className="flex items-center justify-between px-4 h-16 border-b border-border">
              <Link href="/" aria-label="Accueil AdresseBJ">
                <Logo size="sm" />
              </Link>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Fermer le menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-text-muted hover:bg-surface-muted transition-colors"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <nav
              aria-label="Navigation principale"
              className="flex-1 overflow-y-auto py-4 px-3"
            >
              <ul className="flex flex-col gap-1">
                {DRAWER_ITEMS.map((item) => {
                  const active = item.match(pathname);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={classNames(
                          'relative flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors',
                          active
                            ? 'bg-primary-surface text-primary font-semibold'
                            : 'text-text-muted hover:bg-surface-muted hover:text-text-primary',
                        )}
                      >
                        <Icon className="h-5 w-5" aria-hidden="true" />
                        <span>{item.label}</span>
                        {item.dot && !active ? (
                          <span
                            aria-hidden="true"
                            className="ml-auto h-2 w-2 rounded-full bg-danger"
                          />
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="p-3 border-t border-border">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full inline-flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-danger hover:bg-danger-light/40 transition-colors cursor-pointer"
              >
                <LogOut className="h-5 w-5" aria-hidden="true" />
                Se déconnecter
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

export default Navbar;
