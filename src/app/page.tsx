import Link from 'next/link';
import {
  Map,
  MapPin,
  Navigation,
  Plus,
  QrCode,
  Shield,
  Smartphone,
  Zap,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Logo } from '@/components/ui/Logo';
import { SearchBar } from '@/components/forms/SearchBar';

// "Comment ça marche" — 3 étapes
const STEPS = [
  {
    icon: MapPin,
    title: 'Créez votre adresse',
    body: 'Générez un code unique pour votre domicile ou votre entreprise.',
  },
  {
    icon: QrCode,
    title: 'Partagez le code',
    body: 'Envoyez votre code AdresseBJ à vos livreurs, invités ou clients.',
  },
  {
    icon: Navigation,
    title: 'Guidez vos visiteurs',
    body: 'Ils obtiennent l’itinéraire précis jusqu’à votre porte.',
  },
];

// "Pourquoi AdresseBJ" — 3 atouts
const REASONS = [
  {
    icon: Zap,
    title: 'Rapide & Précis',
    body: 'Finies les descriptions vagues. Une précision au mètre près.',
  },
  {
    icon: Shield,
    title: 'Fiable & Officiel',
    body: 'Le système de référence pour l’adressage au Bénin.',
  },
  {
    icon: Smartphone,
    title: 'Conçu pour Mobile',
    body: 'Optimisé pour une utilisation fluide sur tous les smartphones.',
  },
];

export default function Home() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 flex flex-col items-center w-full">
        {/* ────────────────────────────────────────────────────────────── */}
        {/* HERO — recherche en premier, avec glow ambiant derrière       */}
        {/* ────────────────────────────────────────────────────────────── */}
        <section
          aria-labelledby="hero-title"
          className="relative w-full px-4 py-12 md:py-16 max-w-2xl flex flex-col items-center text-center isolate overflow-hidden"
        >
          {/* Halo vert très doux derrière le titre — donne de la profondeur
             au hero sans tomber dans le gradient flashy. */}
          <div
            aria-hidden="true"
            className="absolute top-2 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-primary/15 blur-3xl animate-hero-glow -z-10"
          />

          <h1
            id="hero-title"
            className="font-display font-bold text-[24px] leading-[28px] md:text-[32px] md:leading-[38px] tracking-[-0.01em] text-text-primary mb-2 w-full animate-fade-up"
          >
            Trouvez n’importe quelle adresse au Bénin
          </h1>
          <p className="text-base text-text-muted mb-6 max-w-[90%] animate-fade-up stagger-1">
            Entrez un code adresse pour obtenir l’itinéraire exact, étape par
            étape
          </p>

          <div className="relative z-40 w-full mb-4 animate-fade-up stagger-2">
            <SearchBar variant="landing" />
          </div>

          {/* Deux CTAs secondaires côte à côte — explorer le territoire ou
             commencer à publier sa propre adresse. */}
          <div className="w-full grid grid-cols-2 gap-3 mt-2 animate-fade-up stagger-3">
            <Link
              href="/carte"
              className="card card-interactive flex flex-col items-center justify-center text-center gap-2 p-4 rounded-xl"
            >
              <span
                aria-hidden="true"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-surface text-primary ring-1 ring-primary/15"
              >
                <Map className="h-5 w-5" />
              </span>
              <span className="font-display font-semibold text-sm text-text-primary">
                Explorer la carte
              </span>
            </Link>
            <Link
              href="/auth"
              className="card card-interactive flex flex-col items-center justify-center text-center gap-2 p-4 rounded-xl"
            >
              <span
                aria-hidden="true"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-surface text-primary ring-1 ring-primary/15"
              >
                <Plus className="h-5 w-5" />
              </span>
              <span className="font-display font-semibold text-sm text-text-primary">
                Créer mon adresse
              </span>
            </Link>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────────── */}
        {/* COMMENT ÇA MARCHE                                               */}
        {/* ────────────────────────────────────────────────────────────── */}
        <section
          aria-labelledby="how-title"
          className="w-full bg-surface py-6 px-4"
        >
          <div className="max-w-2xl mx-auto">
            <h2
              id="how-title"
              className="font-display font-semibold text-2xl text-text-primary mb-6"
            >
              Comment ça marche
            </h2>

            <ol className="flex flex-col gap-4">
              {STEPS.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <li
                    key={step.title}
                    className={`card card-interactive rounded-xl p-4 flex items-start gap-4 animate-fade-up stagger-${idx + 1}`}
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-surface text-primary ring-1 ring-primary/15"
                    >
                      <Icon className="h-6 w-6" />
                    </span>
                    <div>
                      <h3 className="font-display font-semibold text-h3 text-text-primary mb-1">
                        {step.title}
                      </h3>
                      <p className="text-base text-text-muted">{step.body}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────────── */}
        {/* POURQUOI ADRESSEBJ                                              */}
        {/* ────────────────────────────────────────────────────────────── */}
        <section aria-labelledby="why-title" className="w-full py-12 px-4">
          <div className="max-w-2xl mx-auto">
            <h2
              id="why-title"
              className="font-display font-semibold text-2xl text-text-primary mb-6 text-center"
            >
              Pourquoi AdresseBJ
            </h2>

            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {REASONS.map((reason, idx) => {
                const Icon = reason.icon;
                return (
                  <li
                    key={reason.title}
                    className={`card card-interactive rounded-xl p-5 flex flex-col items-center text-center animate-fade-up stagger-${idx + 1}`}
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-surface text-primary mb-3 ring-1 ring-primary/15"
                    >
                      <Icon className="h-6 w-6" />
                    </span>
                    <h3 className="font-display font-semibold text-h3 text-text-primary mb-1">
                      {reason.title}
                    </h3>
                    <p className="text-base text-text-muted">{reason.body}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </main>

      <footer className="w-full bg-surface-muted py-6 px-4 border-t border-border mt-auto">
        <div className="max-w-2xl mx-auto flex flex-col items-center text-center">
          <div className="mb-4">
            <Logo size="md" />
          </div>
          <nav aria-label="Liens de pied de page" className="flex gap-4 mb-4">
            <Link
              href="/"
              className="text-xs text-text-muted hover:text-primary transition-colors"
            >
              Mentions légales
            </Link>
            <Link
              href="/"
              className="text-xs text-text-muted hover:text-primary transition-colors"
            >
              Confidentialité
            </Link>
            <Link
              href="/"
              className="text-xs text-text-muted hover:text-primary transition-colors"
            >
              Contact
            </Link>
          </nav>
          <p className="text-xs text-text-muted">
            © {currentYear} AdresseBJ. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
}
