'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Database,
  FileCheck2,
  Flag,
  Key,
  LayoutDashboard,
  Loader2,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { classNames } from '@/lib/utils';

type BadgeKey = 'reports' | 'moderation';

interface NavLink {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  match: (pathname: string) => boolean;
  badge?: BadgeKey;
  /** Si true, le lien n'est visible que pour les ADMIN (pas les MOD). */
  adminOnly?: boolean;
}

const NAV: NavLink[] = [
  {
    href: '/admin',
    label: 'Tableau de bord',
    icon: LayoutDashboard,
    match: (p) => p === '/admin',
  },
  {
    href: '/admin/moderation',
    label: 'Modération',
    icon: FileCheck2,
    match: (p) => p.startsWith('/admin/moderation'),
    badge: 'moderation',
  },
  {
    href: '/admin/addresses',
    label: 'Adresses',
    icon: Database,
    match: (p) => p.startsWith('/admin/addresses'),
    adminOnly: true,
  },
  {
    href: '/admin/quartiers',
    label: 'Quartiers',
    icon: MapPin,
    match: (p) => p.startsWith('/admin/quartiers'),
    adminOnly: true,
  },
  {
    href: '/admin/reports',
    label: 'Signalements',
    icon: Flag,
    match: (p) => p.startsWith('/admin/reports'),
    badge: 'reports',
  },
  {
    href: '/admin/contributions',
    label: 'Contributions',
    icon: MessageSquare,
    match: (p) => p.startsWith('/admin/contributions'),
  },
  {
    href: '/admin/habitants',
    label: 'Habitants',
    icon: Users,
    match: (p) => p.startsWith('/admin/habitants'),
    adminOnly: true,
  },
  {
    href: '/admin/moderators',
    label: 'Modérateurs',
    icon: ShieldCheck,
    match: (p) => p.startsWith('/admin/moderators'),
    adminOnly: true,
  },
  {
    href: '/admin/api-keys',
    label: 'Clés API',
    icon: Key,
    match: (p) => p.startsWith('/admin/api-keys'),
    adminOnly: true,
  },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const { isReady, isAuthenticated, user, logout } = useAuth();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pendingReports, setPendingReports] = useState(0);
  const [pendingModeration, setPendingModeration] = useState(0);

  // Le back-office accueille MODERATOR et ADMIN — les fonctionnalités
  // ADMIN-only sont garées au niveau des pages, pas du shell.
  const isAdmin = user?.role === 'ADMIN';
  const isBackoffice = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  // Routes d'auth back-office (login / forgot-password / reset-password) :
  // publiques, en dehors de la garde et du shell.
  const isAuthRoute = /^\/admin\/(login|forgot-password|reset-password)$/.test(
    pathname,
  );

  useEffect(() => {
    if (isAuthRoute || !isReady) return;
    if (!isAuthenticated) {
      router.replace('/admin/login');
      return;
    }
    if (!isBackoffice) {
      router.replace('/dashboard');
    }
  }, [isAuthRoute, isReady, isAuthenticated, isBackoffice, router]);

  // Refresh the badge counts whenever we navigate within /admin so freshly
  // resolved items update the chips without a hard reload.
  useEffect(() => {
    if (!isReady || !isAuthenticated || !isBackoffice) return;
    let cancelled = false;
    void (async () => {
      try {
        const [reportList, modStats] = await Promise.all([
          api.adminReports(),
          api.adminModerationStats(),
        ]);
        if (!cancelled) {
          setPendingReports(reportList.filter((r) => !r.resolved).length);
          // Le hub de modération couvre uniquement la file des nouvelles
          // adresses — précisions terrain et signalements ont leurs propres
          // chips et pages.
          setPendingModeration(modStats.pendingAddresses);
        }
      } catch {
        // silent — badges are purely informational
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isReady, isAuthenticated, isBackoffice, pathname]);

  useEffect(() => {
    // Auto-close the mobile drawer when the route changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ferme le drawer au changement de route
    setDrawerOpen(false);
  }, [pathname]);

  // Pages d'auth back-office : rendues nues (sans shell ni garde).
  if (isAuthRoute) {
    return <>{children}</>;
  }

  if (!isReady || !isAuthenticated || !isBackoffice) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-2 text-text-muted">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        <span>Vérification de votre accès administrateur…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-bg">
      {/* ──── Mobile top bar ──── */}
      <header className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between gap-3 bg-surface border-b border-border px-4 py-3">
        <Link
          href="/admin"
          className="font-display font-bold text-h3 text-text-primary"
        >
          Adresse<span className="text-primary">BJ</span>{' '}
          <span className="text-xs font-medium uppercase tracking-[0.1em] text-text-muted">
            admin
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Ouvrir le menu d'administration"
          className="inline-flex items-center justify-center h-10 w-10 rounded-md text-text-primary hover:bg-surface-muted"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      </header>

      {/* ──── Desktop sidebar ──── */}
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-[260px] bg-surface border-r border-border z-20">
        <SidebarContent
          pathname={pathname}
          pendingReports={pendingReports}
          pendingModeration={pendingModeration}
          isAdmin={isAdmin}
          onLogout={logout}
        />
      </aside>

      {/* ──── Mobile drawer ──── */}
      {drawerOpen ? (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDrawerOpen(false);
          }}
        >
          <aside
            role="dialog"
            aria-modal="true"
            className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-surface border-r border-border flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <span className="font-display font-bold text-h3 text-text-primary">
                Adresse<span className="text-primary">BJ</span>
              </span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Fermer le menu"
                className="h-9 w-9 inline-flex items-center justify-center rounded-md text-text-muted hover:bg-surface-muted"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <SidebarContent
              pathname={pathname}
              pendingReports={pendingReports}
              pendingModeration={pendingModeration}
              isAdmin={isAdmin}
              onLogout={logout}
              compact
            />
          </aside>
        </div>
      ) : null}

      <main className="flex-1 md:ml-[260px] pt-16 md:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}

function SidebarContent({
  pathname,
  pendingReports,
  pendingModeration,
  isAdmin,
  onLogout,
  compact = false,
}: {
  pathname: string;
  pendingReports: number;
  pendingModeration: number;
  isAdmin: boolean;
  onLogout: () => void;
  compact?: boolean;
}) {
  // Filtre les liens ADMIN-only quand l'utilisateur est seulement Modérateur.
  const visibleNav = NAV.filter((link) => !link.adminOnly || isAdmin);
  const badgeFor = (key: BadgeKey | undefined): number => {
    if (key === 'reports') return pendingReports;
    if (key === 'moderation') return pendingModeration;
    return 0;
  };
  return (
    <>
      {!compact ? (
        <div className="h-20 flex items-center px-6 border-b border-border">
          <Link href="/admin" aria-label="Accueil administration AdresseBJ">
            <Logo size="lg" />
          </Link>
        </div>
      ) : null}
      <nav aria-label="Navigation administrateur" className="flex-1 overflow-y-auto py-6 px-3">
        <ul className="flex flex-col gap-1">
          {visibleNav.map((link) => {
            const Icon = link.icon;
            const active = link.match(pathname);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={classNames(
                    'flex items-center justify-between gap-3 px-4 py-3 text-sm rounded-lg transition-colors duration-200',
                    active
                      ? 'bg-primary-surface text-primary font-semibold'
                      : 'text-text-muted font-medium hover:bg-bg hover:text-text-primary',
                  )}
                >
                  <span className="inline-flex items-center gap-3">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    {link.label}
                  </span>
                  {link.badge && badgeFor(link.badge) > 0 ? (
                    <span
                      aria-label={`${badgeFor(link.badge)} en attente`}
                      className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-semibold rounded-full bg-danger text-text-inverse"
                    >
                      {badgeFor(link.badge)}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-4 px-2">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-surface text-primary font-display font-bold"
          >
            A
          </span>
          <div>
            <p className="text-sm font-semibold text-text-primary">Administration</p>
            <p className="text-xs text-text-muted">Gestion du système</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-text-muted hover:text-danger hover:bg-danger-light/40 rounded-lg transition-colors duration-200 cursor-pointer"
        >
          <LogOut className="h-5 w-5" aria-hidden="true" /> Déconnexion
        </button>
      </div>
    </>
  );
}

export default AdminShell;
