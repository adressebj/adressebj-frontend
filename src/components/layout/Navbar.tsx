'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
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

// Same first two links on the desktop top bar (no Alertes/Profil — those live
// in the bell icon and the avatar menu).
const DESKTOP_LINKS = [
  { href: '/', label: 'Accueil', match: (p: string) => p === '/' },
  {
    href: '/dashboard',
    label: 'Adresses',
    match: (p: string) => p.startsWith('/dashboard'),
  },
];

export function Navbar() {
  const { isAuthenticated, isReady, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname() ?? '/';

  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the drawer whenever the route changes — typical pattern so a link
  // tap doesn't leave the drawer visible behind the destination page.
  useEffect(() => {
    setDrawerOpen(false);
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

  const handleLogout = () => {
    logout();
    setDrawerOpen(false);
    router.push('/');
  };

  return (
    <>
      <header className="sticky top-0 z-30 w-full h-16 bg-bg/85 backdrop-blur-md border-b border-border/80">
        <nav className="mx-auto flex h-full max-w-[1280px] items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
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
              <Logo size="md" />
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-4">
            {DESKTOP_LINKS.map((link) => {
              const active = link.match(pathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={classNames(
                    'text-sm px-3.5 py-2 rounded-full transition-colors',
                    active
                      ? 'font-semibold text-primary bg-primary-surface'
                      : 'text-text-muted hover:bg-surface-muted hover:text-text-primary',
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {/* Le visiteur non-connecté garde un accès rapide à l'auth ;
               le connecté passe par le drawer (hamburger gauche) qui
               contient déjà Alertes — on évite le doublon de cloche en
               haut. */}
            {isReady && !isAuthenticated ? (
              <>
                <Link
                  href="/carte"
                  className="hidden sm:inline-flex text-sm px-3.5 py-2 rounded-full text-text-muted hover:bg-surface-muted hover:text-text-primary transition-colors"
                >
                  Explorer
                </Link>
                <Link
                  href="/auth"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-full bg-primary text-text-inverse shadow-sm hover:bg-primary-hover hover:shadow-md transition-all tap-press"
                >
                  <User className="h-4 w-4" aria-hidden="true" />
                  Connexion
                </Link>
              </>
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
