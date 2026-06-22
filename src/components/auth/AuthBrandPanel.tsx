import Link from 'next/link';
import { MapPin, Navigation, QrCode, type LucideIcon } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

const FEATURES: { icon: LucideIcon; label: string }[] = [
  { icon: MapPin, label: 'Un code unique pour votre domicile ou commerce' },
  { icon: QrCode, label: 'Partage instantané par lien et QR code' },
  { icon: Navigation, label: 'Itinéraire guidé jusqu’à votre porte, même hors-ligne' },
];

/**
 * Panneau marque du split-screen d'authentification (desktop uniquement).
 * Parti-pris : un « champ-carte » vivant en fond plein panneau (grille de rues
 * + itinéraire tracé jusqu'à un pin), la promesse produit à gauche, et la
 * carte-adresse signature posée à droite au bout de l'itinéraire. Surfaces
 * solides, accent or, zéro glassmorphisme. Présentation pure.
 */
export function AuthBrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-canvas-deep p-10 text-text-inverse lg:flex lg:flex-col xl:p-12">
      <RouteField />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 -left-24 h-96 w-96 rounded-full bg-primary/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -right-20 h-[28rem] w-[28rem] rounded-full bg-accent/20 blur-3xl"
      />

      <div className="relative z-10">
        <Link href="/" aria-label="Accueil" className="inline-flex w-fit">
          <Logo size="lg" tone="inverse" />
        </Link>
      </div>

      <div className="relative z-10 flex flex-1 items-center py-10">
        <div className="grid w-full items-center gap-12 xl:grid-cols-[minmax(0,1fr)_auto]">
          {/* Colonne texte */}
          <div className="flex max-w-lg flex-col gap-6">
            <h2 className="font-display font-black text-[3rem] leading-[1.02] xl:text-[3.5rem]">
              <span className="text-[#F5EFE2]">Votre adresse,</span>
              <br />
              <span className="text-accent">enfin précise.</span>
            </h2>
            <p className="max-w-md text-base leading-relaxed text-white/70">
              Créez votre point de repère, partagez-le d’un tap, et guidez vos
              visiteurs jusqu’à votre porte, partout au Bénin.
            </p>
            <ul className="mt-2 flex flex-col gap-4">
              {FEATURES.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3.5">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-accent">
                    <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  </span>
                  <span className="text-sm text-white/85">{label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Carte-adresse vitrine, au bout de l'itinéraire (largeur exploitée) */}
          <div className="hidden xl:flex xl:justify-center">
            <ShowcaseCard />
          </div>
        </div>
      </div>

      <p className="relative z-10 text-xs uppercase tracking-[0.18em] text-white/40">
        Infrastructure d’adressage numérique · Bénin
      </p>
    </aside>
  );
}

/**
 * Fond plein panneau : grille de rues stylisée + itinéraire qui se trace de
 * bas en haut jusqu'à un pin de destination (en or). Décoratif, slice pour
 * couvrir toute la surface quel que soit le format.
 */
function RouteField() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 480 900"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <defs>
        <linearGradient id="abj-auth-route" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--color-primary-light)" />
          <stop offset="60%" stopColor="var(--color-primary-light)" />
          <stop offset="100%" stopColor="var(--color-accent)" />
        </linearGradient>
      </defs>

      {/* Grille de rues */}
      <g stroke="#ffffff" strokeWidth="1" opacity="0.05">
        <path d="M0 150 H480" />
        <path d="M0 320 H480" />
        <path d="M0 490 H480" />
        <path d="M0 660 H480" />
        <path d="M0 820 H480" />
        <path d="M120 0 V900" />
        <path d="M260 0 V900" />
        <path d="M380 0 V900" />
      </g>

      {/* Itinéraire qui se trace */}
      <path
        d="M70 840 C 210 815, 130 640, 280 600 S 410 380, 384 214"
        fill="none"
        stroke="url(#abj-auth-route)"
        strokeWidth="4"
        strokeLinecap="round"
        className="animate-route"
      />
      <circle cx="70" cy="840" r="6" fill="var(--color-primary-light)" />

      {/* Pin de destination (or) au bout de l'itinéraire */}
      <g>
        <path
          d="M384 214 C 376 201, 369 196, 369 187 A 15 15 0 0 1 399 187 C 399 196, 392 201, 384 214 Z"
          fill="var(--color-accent)"
          stroke="var(--color-canvas-deep)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx="384" cy="186" r="5" fill="var(--color-canvas-deep)" />
      </g>
    </svg>
  );
}

/**
 * Carte-adresse vitrine : l'objet code signature posé sur une carte papier
 * blanche, en contraste fort sur la plaque sombre (langage marketing premium).
 */
function ShowcaseCard() {
  return (
    <div className="w-[20rem] -rotate-2 rounded-[var(--radius-lg)] bg-surface p-5 text-text-primary shadow-2xl ring-1 ring-black/5">
      <div className="flex items-center justify-between">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-surface text-primary">
          <MapPin className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-light px-2.5 py-1 text-xs font-semibold text-success">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-success" />
          Vérifiée
        </span>
      </div>
      <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">
        Code adresse
      </p>
      <p className="code-type text-3xl font-black leading-none text-primary">
        AKP-204X
      </p>
      <p className="mt-2 flex items-center gap-1.5 text-sm text-text-muted">
        <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        Akpakpa · Cotonou
      </p>
    </div>
  );
}

export default AuthBrandPanel;
