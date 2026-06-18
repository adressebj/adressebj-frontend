import type { Metadata, Viewport } from 'next';
import { Inter, Fraunces, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ServiceWorkerRegistration } from '@/components/layout/ServiceWorkerRegistration';
import { ToastProvider } from '@/components/ui/Toast';

// Inter — corps de texte, labels & UI (Design System « Repère »)
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-body',
});

// Fraunces — display éditorial à fort caractère, pour les grands titres.
// L'âme « modernisme africain » : chaleureux, optique, distinctif.
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '900'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-display',
});

// JetBrains Mono — le code adresse (AAA-0000) traité comme objet signature.
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-mono',
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
  themeColor: '#0E6B43',
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
      className={`${inter.variable} ${fraunces.variable} ${jetbrainsMono.variable}`}
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
