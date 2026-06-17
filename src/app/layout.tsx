import type { Metadata, Viewport } from 'next';
import { Inter, Lexend } from 'next/font/google';
import './globals.css';
import { ServiceWorkerRegistration } from '@/components/layout/ServiceWorkerRegistration';
import { ToastProvider } from '@/components/ui/Toast';

// Inter — corps de texte & labels (Design System §3)
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-body',
});

// Lexend — titres, conçue pour la lisibilité maximale (Design System §3)
const lexend = Lexend({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: {
    default: 'AdresseBJ — Ton adresse numérique au Bénin',
    template: '%s | AdresseBJ',
  },
  description:
    "Crée, partage et retrouve une adresse précise au Bénin en un tap. Infrastructure d'adressage numérique nationale.",
  applicationName: 'AdresseBJ',
  appleWebApp: {
    capable: true,
    title: 'AdresseBJ',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  themeColor: '#1A7F50',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${lexend.variable}`}
      suppressHydrationWarning
    >
      {/*
        suppressHydrationWarning on <body> so attributes injected by browser
        extensions (Bitdefender's bis_*, Grammarly's data-gr-*, Honey's
        __processed_*, etc.) don't trigger React hydration mismatches in dev.
        This is the official Next.js workaround for this exact class of noise.
      */}
      <body
        className="min-h-screen bg-bg text-text-primary font-body"
        suppressHydrationWarning
      >
        <ToastProvider>{children}</ToastProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
