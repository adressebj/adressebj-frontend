'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isReady, isAuthenticated } = useAuth();

  // Print pages render in a popup that the user immediately prints. The
  // dashboard chrome (Navbar) would be noise — strip it whenever the URL
  // ends in /print.
  const isPrintMode = (pathname ?? '').endsWith('/print');

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace('/auth');
    }
  }, [isReady, isAuthenticated, router]);

  // While the auth state is unresolved OR we're about to redirect, render a
  // minimal loader. Never paint protected children for even one frame.
  if (!isReady || !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        {!isPrintMode ? <Navbar /> : null}
        <main
          className="flex-1 flex items-center justify-center gap-2 text-text-muted"
          aria-busy="true"
        >
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          <span>Vérification de votre session…</span>
        </main>
      </div>
    );
  }

  if (isPrintMode) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      {/* Sur desktop la navbar est en overlay (fixed) : on réserve la hauteur
         de la pilule flottante pour que le contenu ne passe pas dessous. */}
      <main className="flex-1 md:pt-20">{children}</main>
    </div>
  );
}
