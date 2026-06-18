import Link from 'next/link';
import {
  ArrowRight,
  Compass,
  MapPin,
  Navigation,
  Plus,
  QrCode,
  Shield,
  Smartphone,
  Sparkles,
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
    body: 'Posez un point sur la carte. AdresseBJ génère un code unique pour votre domicile ou votre commerce.',
  },
  {
    icon: QrCode,
    title: 'Partagez le code',
    body: 'Un code, un lien, un QR. Envoyez-le à vos livreurs, vos invités ou vos clients en un instant.',
  },
  {
    icon: Navigation,
    title: 'Guidez vos visiteurs',
    body: "Ils obtiennent l'itinéraire précis, étape par étape, jusqu'à votre porte. Sans se perdre.",
  },
];

// Villes & quartiers — bandeau défilant
const PLACES = [
  'Cotonou',
  'Porto-Novo',
  'Parakou',
  'Abomey-Calavi',
  'Bohicon',
  'Natitingou',
  'Ouidah',
  'Djougou',
  'Kandi',
  'Lokossa',
  'Abomey',
  'Sèmè-Podji',
];

export default function Home() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 flex flex-col w-full">
        {/* ══════════════════════════════════════════════════════════════ */}
        {/* HERO — la vitrine. Papier chaud, motif béninois, lueur ambiante */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <section
          aria-labelledby="hero-title"
          className="relative w-full overflow-hidden motif-paper isolate"
        >
          {/* Lueurs ambiantes — vert + or, très douces. */}
          <div
            aria-hidden="true"
            className="absolute -top-24 -left-24 w-[28rem] h-[28rem] rounded-full bg-primary/15 blur-3xl animate-hero-glow -z-10"
          />
          <div
            aria-hidden="true"
            className="absolute top-32 -right-20 w-[24rem] h-[24rem] rounded-full bg-accent/15 blur-3xl animate-hero-glow -z-10"
            style={{ animationDelay: '3s' }}
          />

          <div className="mx-auto max-w-[1200px] px-4 md:px-6 py-12 md:py-20 grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
            {/* ── Colonne texte ── */}
            <div className="flex flex-col items-start text-left">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 backdrop-blur px-3.5 py-1.5 text-xs font-medium text-text-muted animate-fade-up">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-soft-pulse" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                Infrastructure d&apos;adressage national · Bénin
              </span>

              <h1
                id="hero-title"
                className="mt-5 font-display font-black tracking-[-0.03em] text-[clamp(2.5rem,6vw,4.25rem)] leading-[0.98] text-text-primary animate-rise"
              >
                Une adresse précise
                <br />
                pour{' '}
                <span className="italic font-semibold text-primary">
                  chaque porte
                </span>{' '}
                du Bénin.
              </h1>

              <p className="mt-5 max-w-xl text-lg text-text-muted leading-relaxed animate-fade-up stagger-2">
                Fini les « tu tournes après la pharmacie ». Un code, un lien,
                un itinéraire exact — pour retrouver n&apos;importe quel lieu,
                au mètre près.
              </p>

              {/* Recherche — encadrée façon objet premium. */}
              <div className="mt-7 w-full max-w-xl animate-fade-up stagger-3">
                <SearchBar variant="landing" />
                <p className="mt-3 flex items-center gap-2 text-sm text-text-muted">
                  <Compass className="h-4 w-4 text-primary" aria-hidden="true" />
                  Essayez un code comme{' '}
                  <span className="code-type font-medium text-text-primary">
                    COT-4821
                  </span>
                </p>
              </div>

              {/* CTAs */}
              <div className="mt-7 flex flex-wrap items-center gap-3 animate-fade-up stagger-4">
                <Link
                  href="/auth"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 h-12 font-semibold text-text-inverse shadow-sm hover:bg-primary-hover hover:shadow-md transition-all tap-press"
                >
                  <Plus className="h-5 w-5" aria-hidden="true" />
                  Créer mon adresse
                </Link>
                <Link
                  href="/carte"
                  className="inline-flex items-center gap-2 rounded-full bg-surface px-6 h-12 font-semibold text-text-primary border border-border-strong hover:border-primary hover:bg-primary-surface transition-all tap-press"
                >
                  <Compass className="h-5 w-5 text-primary" aria-hidden="true" />
                  Explorer la carte
                </Link>
              </div>
            </div>

            {/* ── Colonne visuelle — la carte adresse, moment signature ── */}
            <div className="relative animate-fade-up stagger-2">
              <AddressShowcase />
            </div>
          </div>

          {/* Bandeau défilant de villes. */}
          <div className="relative border-t border-border/70 bg-surface/50 backdrop-blur py-3 overflow-hidden">
            <div className="flex w-max animate-marquee gap-8 pr-8">
              {[...PLACES, ...PLACES].map((place, i) => (
                <span
                  key={`${place}-${i}`}
                  className="flex items-center gap-2 text-sm font-medium text-text-muted whitespace-nowrap"
                >
                  <MapPin className="h-3.5 w-3.5 text-primary/70" aria-hidden="true" />
                  {place}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* COMMENT ÇA MARCHE — timeline éditoriale                         */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <section
          aria-labelledby="how-title"
          className="w-full py-20 md:py-28 px-4"
        >
          <div className="mx-auto max-w-[1100px]">
            <div className="max-w-2xl">
              <span className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                Trois gestes
              </span>
              <h2
                id="how-title"
                className="mt-3 font-display font-bold text-[clamp(2rem,4vw,3rem)] leading-[1.02] text-text-primary"
              >
                Adresser un lieu n&apos;a jamais été aussi simple.
              </h2>
            </div>

            <ol className="mt-12 grid gap-6 md:grid-cols-3">
              {STEPS.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <li
                    key={step.title}
                    className={`group card card-interactive relative p-7 overflow-hidden animate-fade-up stagger-${idx + 1}`}
                  >
                    <span
                      aria-hidden="true"
                      className="absolute -top-6 -right-2 font-display font-black text-[5.5rem] leading-none text-primary/[0.06] select-none"
                    >
                      {idx + 1}
                    </span>
                    <span
                      aria-hidden="true"
                      className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-surface text-primary ring-1 ring-primary/15"
                    >
                      <Icon className="h-7 w-7" />
                    </span>
                    <h3 className="relative mt-5 font-display font-semibold text-xl text-text-primary">
                      {step.title}
                    </h3>
                    <p className="relative mt-2 text-text-muted leading-relaxed">
                      {step.body}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* POURQUOI — bento grid                                           */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <section
          aria-labelledby="why-title"
          className="w-full py-20 md:py-28 px-4 bg-surface border-y border-border"
        >
          <div className="mx-auto max-w-[1100px]">
            <div className="max-w-2xl">
              <span className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                Pourquoi AdresseBJ
              </span>
              <h2
                id="why-title"
                className="mt-3 font-display font-bold text-[clamp(2rem,4vw,3rem)] leading-[1.02] text-text-primary"
              >
                Pensé pour le terrain béninois.
              </h2>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-3 md:auto-rows-[minmax(0,1fr)]">
              {/* Grande tuile — précision / carte */}
              <article className="md:col-span-2 md:row-span-2 relative overflow-hidden rounded-[var(--radius-xl)] bg-canvas-deep text-text-inverse p-8 flex flex-col justify-between min-h-[20rem] animate-fade-up">
                <div className="absolute inset-0 motif-light opacity-40" aria-hidden="true" />
                <div
                  aria-hidden="true"
                  className="absolute -bottom-28 -right-24 w-72 h-72 rounded-full bg-primary-light/25 blur-3xl"
                />
                <div className="relative">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                    <Zap className="h-6 w-6 text-accent" />
                  </span>
                  <h3 className="mt-5 font-display font-semibold text-2xl md:text-3xl max-w-md text-text-inverse">
                    Une précision au mètre près.
                  </h3>
                  <p className="mt-3 max-w-md text-white/70 leading-relaxed">
                    Chaque adresse est un point GPS validé, doublé
                    d&apos;instructions humaines. Les livreurs arrivent du
                    premier coup.
                  </p>
                </div>
                <div className="relative mt-8">
                  <RouteMini />
                </div>
              </article>

              {/* Tuile — code signature */}
              <article className="relative overflow-hidden rounded-[var(--radius-xl)] bg-accent-light p-7 flex flex-col justify-between min-h-[9.5rem] animate-fade-up stagger-1">
                <div className="absolute inset-0 motif-gold opacity-70" aria-hidden="true" />
                <div className="relative">
                  <h3 className="font-display font-semibold text-xl text-accent-text">
                    Un code qui vous suit partout.
                  </h3>
                </div>
                <p className="relative mt-4 code-type text-2xl font-bold text-text-primary">
                  COT-4821
                </p>
              </article>

              {/* Tuile — mobile */}
              <article className="card relative p-7 flex flex-col gap-3 animate-fade-up stagger-2">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-surface text-primary ring-1 ring-primary/15">
                  <Smartphone className="h-6 w-6" />
                </span>
                <h3 className="font-display font-semibold text-lg text-text-primary">
                  Conçu mobile, même hors-ligne
                </h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  Léger, rapide, installable. Pensé pour tous les smartphones et
                  les réseaux capricieux.
                </p>
              </article>

              {/* Tuile large — fiable / officiel */}
              <article className="md:col-span-3 card relative p-7 flex flex-col md:flex-row md:items-center gap-5 animate-fade-up stagger-3">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-surface text-primary ring-1 ring-primary/15">
                  <Shield className="h-6 w-6" />
                </span>
                <div className="flex-1">
                  <h3 className="font-display font-semibold text-lg text-text-primary">
                    Fiable, vérifié, officiel
                  </h3>
                  <p className="text-sm text-text-muted leading-relaxed">
                    Chaque adresse est modérée avant publication. Le système de
                    référence pour l&apos;adressage numérique au Bénin.
                  </p>
                </div>
                <Link
                  href="/carte"
                  className="inline-flex items-center gap-2 self-start md:self-auto rounded-full px-5 h-11 font-semibold text-primary border border-border-strong hover:border-primary hover:bg-primary-surface transition-all tap-press whitespace-nowrap"
                >
                  Voir la carte
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </article>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* CTA — canvas profond immersif                                   */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <section className="w-full px-4 py-20 md:py-28">
          <div className="relative mx-auto max-w-[1100px] overflow-hidden rounded-[var(--radius-2xl)] bg-canvas-deep px-6 py-16 md:px-16 md:py-20 text-center isolate">
            <div className="absolute inset-0 motif-light opacity-70" aria-hidden="true" />
            <div
              aria-hidden="true"
              className="absolute -top-20 left-1/2 -translate-x-1/2 w-[34rem] h-[34rem] rounded-full bg-primary/30 blur-3xl animate-hero-glow -z-10"
            />
            <div className="relative flex flex-col items-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 ring-1 ring-white/15 px-4 py-1.5 text-sm text-white/80">
                <Sparkles className="h-4 w-4 text-accent" aria-hidden="true" />
                Gratuit pour les habitants
              </span>
              <h2 className="mt-6 font-display font-bold text-[clamp(2rem,5vw,3.5rem)] leading-[1.02] text-text-inverse max-w-2xl">
                Donnez une adresse à votre porte.
              </h2>
              <p className="mt-4 max-w-xl text-lg text-white/70">
                Quelques secondes suffisent. Votre code est prêt, partageable,
                pour toujours.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/auth"
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-7 h-13 font-semibold text-text-primary shadow-sm hover:bg-accent-hover hover:shadow-md transition-all tap-press"
                >
                  Créer mon adresse
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Link>
                <Link
                  href="/carte"
                  className="inline-flex items-center gap-2 rounded-full px-7 h-13 font-semibold text-white border border-white/25 hover:bg-white/10 transition-all tap-press"
                >
                  Explorer d&apos;abord
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* FOOTER                                                            */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <footer className="w-full bg-canvas-deep-2 text-white/70">
        <div className="mx-auto max-w-[1100px] px-4 md:px-6 py-14">
          <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
            <div>
              <Logo size="lg" tone="inverse" />
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
                L&apos;infrastructure d&apos;adressage numérique du Bénin.
                Chaque lieu, une adresse.
              </p>
            </div>
            <nav aria-label="Produit" className="flex flex-col gap-3 text-sm">
              <span className="font-display font-semibold text-white/90">
                Produit
              </span>
              <Link href="/carte" className="hover:text-accent transition-colors w-fit">
                Explorer la carte
              </Link>
              <Link href="/auth" className="hover:text-accent transition-colors w-fit">
                Créer une adresse
              </Link>
              <Link href="/" className="hover:text-accent transition-colors w-fit">
                Comment ça marche
              </Link>
            </nav>
            <nav aria-label="Légal" className="flex flex-col gap-3 text-sm">
              <span className="font-display font-semibold text-white/90">
                Légal
              </span>
              <Link href="/" className="hover:text-accent transition-colors w-fit">
                Mentions légales
              </Link>
              <Link href="/" className="hover:text-accent transition-colors w-fit">
                Confidentialité
              </Link>
              <Link href="/" className="hover:text-accent transition-colors w-fit">
                Contact
              </Link>
            </nav>
          </div>
          <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/50">
            <p>© {currentYear} AdresseBJ. Tous droits réservés.</p>
            <p className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary-light" />
              Fait au Bénin
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   AddressShowcase — la « carte adresse » du hero (moment signature).
   Carte papier flottante : code mono, mini-carte avec pin qui tombe et
   itinéraire qui se trace.
   ────────────────────────────────────────────────────────────────────── */
function AddressShowcase() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      {/* Halo derrière la carte */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 translate-y-6 scale-95 rounded-[var(--radius-2xl)] bg-primary/20 blur-2xl"
      />
      <div className="card overflow-hidden rounded-[var(--radius-2xl)] shadow-lg">
        {/* Mini-carte */}
        <div className="relative h-44 bg-primary-surface motif-paper overflow-hidden">
          <svg
            viewBox="0 0 320 176"
            className="absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            {/* rues stylisées */}
            <g stroke="var(--color-border-strong)" strokeWidth="2" opacity="0.6">
              <path d="M0 60 H320" />
              <path d="M0 120 H320" />
              <path d="M90 0 V176" />
              <path d="M210 0 V176" />
            </g>
            {/* itinéraire qui se trace */}
            <path
              d="M40 150 C 110 150, 90 90, 160 90 S 250 60, 280 36"
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="3.5"
              strokeLinecap="round"
              className="animate-route"
            />
            <circle cx="40" cy="150" r="5" fill="var(--color-primary)" />
          </svg>
          {/* pin destination */}
          <div className="absolute right-9 top-5 animate-pin-drop">
            <span className="flex h-10 w-10 items-center justify-center rounded-full rounded-bl-none rotate-45 bg-primary shadow-md ring-4 ring-white">
              <MapPin className="h-5 w-5 -rotate-45 text-white" aria-hidden="true" />
            </span>
          </div>
        </div>

        {/* Détails */}
        <div className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Code adresse
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success-light px-2.5 py-1 text-xs font-semibold text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Vérifiée
            </span>
          </div>
          <p className="mt-1.5 code-type text-3xl font-bold text-text-primary">
            COT-4821
          </p>
          <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-surface text-primary">
              <MapPin className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-text-primary">
                Quartier Haie Vive
              </p>
              <p className="text-xs text-text-muted">Cotonou · Littoral</p>
            </div>
            <span className="ml-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-sm">
              <Navigation className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>

      {/* Badge QR flottant */}
      <div className="absolute -bottom-5 -left-5 hidden sm:flex h-20 w-20 items-center justify-center rounded-2xl bg-surface shadow-lg border border-border rotate-[-6deg]">
        <QrCode className="h-10 w-10 text-text-primary" aria-hidden="true" />
      </div>
    </div>
  );
}

/* Mini itinéraire décoratif pour la grande tuile bento. */
function RouteMini() {
  return (
    <svg
      viewBox="0 0 400 80"
      className="w-full h-16"
      aria-hidden="true"
    >
      <path
        d="M10 60 C 90 60, 80 24, 160 24 S 280 56, 330 30 L 390 18"
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="2 10"
        opacity="0.8"
      />
      <circle cx="10" cy="60" r="5" fill="#FFFFFF" />
      <circle cx="390" cy="18" r="6" fill="var(--color-accent)" />
    </svg>
  );
}
