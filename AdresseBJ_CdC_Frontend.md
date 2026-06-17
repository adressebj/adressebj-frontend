# AdresseBJ — Cahier des Charges Technique · Frontend

> [!IMPORTANT]
> Ce cahier des charges est un guide de référence, pas une spécification exhaustive et définitive. Il pose les grandes lignes : architecture, pages, composants critiques, règles de travail. Mais la responsabilité du frontend — le dernier mot, l'analyse technique, les décisions de détail — revient au développeur frontend. Ce document ne remplace pas ton expertise. Il est inévitablement incomplet : certains cas limites, certaines subtilités d'implémentation, certaines décisions d'UX de détail ne sont pas couverts ici. C'est à toi de les identifier, de les analyser, et de les combler avec ton propre jugement. Tu es le premier responsable de la qualité de ce que tu livres.

> **Destinataire** : Développeur frontend (BANKOLE Primaël)
> **Rôle** : Concevoir l'identité visuelle, implémenter la PWA, tester les parcours critiques, déployer tôt et de manière continue.
> **Relation avec le backend** : Le backend définit le contrat API (`docs/API_CONTRACT.md`). Tu n'as pas besoin de lire le code NestJS — seulement ce contrat. Si quelque chose n'y est pas clair, c'est Mouwafic qui précise.

---

## Table des matières

1. [Contexte et rôle du frontend](#1-contexte-et-rôle-du-frontend)
2. [Stack technique](#2-stack-technique)
3. [Phase design — avant de coder](#3-phase-design--avant-de-coder)
4. [Identité visuelle et système de design](#4-identité-visuelle-et-système-de-design)
5. [Architecture applicative](#5-architecture-applicative)
6. [PWA — configuration native Next.js](#6-pwa--configuration-native-nextjs)
7. [Inventaire complet des pages](#7-inventaire-complet-des-pages)
8. [Description détaillée des pages et parcours](#8-description-détaillée-des-pages-et-parcours)
9. [Composants critiques](#9-composants-critiques)
10. [Intégration API](#10-intégration-api)
11. [Upload Cloudinary](#11-upload-cloudinary)
12. [Navigation cartographique — Leaflet.js](#12-navigation-cartographique--leafletjs)
13. [Tests](#13-tests)
14. [Déploiement](#14-déploiement)
15. [Règles de travail](#15-règles-de-travail)

---

## 1. Contexte et rôle du frontend

AdresseBJ est une PWA conçue pour fonctionner sur les smartphones Android de Cotonou, souvent en connexion dégradée, avec des utilisateurs qui n'ont pas nécessairement l'habitude des applications numériques complexes.

Le frontend porte trois responsabilités que rien d'autre ne peut compenser :

- **L'identité du produit.** AdresseBJ est une infrastructure nationale. Elle doit inspirer confiance, paraître sérieuse et ancrée dans le quotidien béninois — sans être froide. L'UI est le seul point de contact entre l'utilisateur et le système.
- **L'expérience de création d'adresse.** Le flux de création doit être si guidé et si clair qu'un habitant non-technique le complète en moins de 5 minutes sans assistance. Ce parcours inclut désormais la détection d'adresses proches (rayon 15m) et la proposition de rattachement avant création.
- **La navigation vers une adresse.** La page `/a/:code` est l'écran le plus consulté. Un visiteur arrive dessus depuis WhatsApp, sans avoir jamais entendu parler d'AdresseBJ, et doit pouvoir naviguer vers le portail en moins de 30 secondes.

---

## 2. Stack technique

Toutes les versions sont vérifiées au **17 mai 2026**.

| Rôle | Technologie | Version cible |
|------|-------------|---------------|
| Framework | Next.js (App Router) | **16.2.6** |
| Langage | TypeScript | 5.x |
| CSS | Tailwind CSS | **v4.3** |
| PWA | Next.js natif (sans librairie tierce) | — |
| Cartographie | Leaflet.js | dernière stable |
| QR Code | `qrcode.react` | dernière stable |
| Icônes | `lucide-react` | dernière stable |
| Tests | Jest + React Testing Library | std Next.js 16 |
| Déploiement | Vercel | — |

### Points d'attention sur les versions

**Tailwind CSS v4 est une rupture majeure avec v3.** Il n'y a plus de `tailwind.config.js`. Toute la configuration se fait dans le fichier CSS principal via la directive `@theme`. L'installation se fait via `@tailwindcss/postcss`. Partir sur cette base dès le début, pas migrer en cours de route.

**next-pwa est abandonné** depuis 2024. Ne pas l'installer. La PWA se configure nativement avec Next.js 16 (voir section 6).

**Leaflet.js est une librairie côté client uniquement.** Dans Next.js avec App Router, tout composant qui utilise Leaflet doit être importé avec `dynamic(() => import(...), { ssr: false })`. Ne pas respecter cette règle provoque des erreurs `window is not defined` au build — sans exception.

---

## 3. Phase design — avant de coder

**Durée : une journée maximum.** L'objectif n'est pas un Figma parfait — c'est une direction visuelle claire et validée avant d'écrire le premier composant.

### Ce que la phase design doit produire

1. **La palette de couleurs finale** — tokens exacts (codes hex), rôle de chaque couleur.
2. **La typographie** — deux polices maximum (display + body), tailles de la scale.
3. **Les maquettes des 3 écrans critiques** :
   - La page de consultation `/a/:code`
   - Le formulaire de création — une étape représentative (inclure l'écran de détection de doublons)
   - La landing avec champ de recherche

### Outils recommandés

**Google Stitch**, **v0.dev**, ou **Galileo AI**. Génère plusieurs directions, garde la meilleure, ajuste.

### Livrable

Un fichier de référence commité sous `design/`.

---

## 4. Identité visuelle et système de design

### Direction visuelle

Les couleurs du drapeau béninois — vert, jaune, rouge — sont la matière première. L'objectif : **confiant, lisible, ancré localement, différent de tout ce qui existe déjà**.

Ce que tu dois éviter : glassmorphisme, cards en grille uniforme, palette Material Design ou Tailwind par défaut, hero centré générique, animations sans raison fonctionnelle.

Ce que tu dois viser : confiance immédiate, états d'interface clairs (loading, erreur, succès, vide), mobile-first, lisibilité en plein soleil (contraste élevé, tailles généreuses).

### Système de tokens Tailwind v4

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  /* Couleurs */
  --color-primary:       #1A7F50;
  --color-primary-light: #2DA86B;
  --color-accent:        #F4C300;
  --color-danger:        #E8352A;

  --color-bg:            #F8F7F4;
  --color-surface:       #FFFFFF;
  --color-surface-muted: #F0EDE8;

  --color-text-primary:  #1A1A1A;
  --color-text-muted:    #6B6560;
  --color-text-inverse:  #FFFFFF;

  --color-border:        #E2DDD8;
  --color-border-strong: #C4BDB6;

  /* Typographie */
  --font-display: 'Police Display', sans-serif;
  --font-body:    'Police Body', sans-serif;

  --text-display: clamp(2rem, 5vw, 3.5rem);
  --text-h1:      clamp(1.5rem, 3vw, 2.25rem);
  --text-h2:      clamp(1.25rem, 2.5vw, 1.75rem);
  --text-h3:      clamp(1.1rem, 2vw, 1.375rem);
  --text-body:    1rem;
  --text-sm:      0.875rem;
  --text-xs:      0.75rem;

  /* Espacements */
  --spacing-xs:  0.25rem;
  --spacing-sm:  0.5rem;
  --spacing-md:  1rem;
  --spacing-lg:  1.5rem;
  --spacing-xl:  2.5rem;
  --spacing-2xl: 4rem;

  /* Rayons */
  --radius-sm:   6px;
  --radius-md:   12px;
  --radius-lg:   20px;
  --radius-full: 9999px;
}
```

### Badge de fiabilité

Le score brut (1-5) n'est jamais affiché tel quel au visiteur. Le badge affiche la note avec le nombre d'évaluations.

```typescript
// lib/reliability.ts
export type ReliabilityLevel = 'high' | 'medium' | 'low' | 'unknown';

export function scoreToLevel(average: number | null): ReliabilityLevel {
  if (average === null) return 'unknown';
  if (average >= 4.0) return 'high';
  if (average >= 2.5) return 'medium';
  return 'low';
}

// Formatage de l'affichage public
// average = 3.7, count = 23 → "3,7/5 · 23 évaluations"
// average = null → "Pas encore évaluée"
export function formatRating(average: number | null, count: number): string {
  if (average === null || count === 0) return 'Pas encore évaluée';
  return `${average.toFixed(1).replace('.', ',')}/5 · ${count} évaluation${count > 1 ? 's' : ''}`;
}

export const RELIABILITY_CONFIG = {
  high:    { label: 'Adresse fiable',      color: 'text-primary', bg: 'bg-primary/10',    dot: 'bg-primary'       },
  medium:  { label: 'Fiabilité moyenne',   color: 'text-accent',  bg: 'bg-accent/10',     dot: 'bg-accent'        },
  low:     { label: 'Fiabilité faible',    color: 'text-danger',  bg: 'bg-danger/10',     dot: 'bg-danger'        },
  unknown: { label: 'Pas encore évaluée', color: 'text-muted',   bg: 'bg-surface-muted', dot: 'bg-border-strong' },
};
```

---

## 5. Architecture applicative

### Structure des dossiers

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                          # Landing + recherche
│   ├── globals.css
│   ├── manifest.ts
│   ├── not-found.tsx
│   ├── error.tsx
│   │
│   ├── a/[code]/
│   │   ├── page.tsx                      # Consultation adresse visiteur
│   │   └── opengraph-image.tsx
│   │
│   ├── auth/
│   │   └── page.tsx                      # Connexion / Inscription Habitant
│   │
│   ├── dashboard/
│   │   ├── layout.tsx                    # Vérifie JWT rôle HABITANT
│   │   ├── page.tsx                      # Espace personnel (3 onglets)
│   │   ├── profile/
│   │   │   └── page.tsx                  # Paramètres compte + téléphone + suppression
│   │   └── address/
│   │       ├── new/
│   │       │   └── page.tsx              # Création adresse (4 étapes + détection doublons)
│   │       └── [code]/
│   │           ├── page.tsx              # Vue propriétaire
│   │           ├── edit/
│   │           │   └── page.tsx          # Modification adresse
│   │           ├── share/
│   │           │   └── page.tsx          # Partage + QR code
│   │           └── print/
│   │               └── page.tsx          # QR imprimable
│   │
│   ├── admin/
│   │   ├── layout.tsx                    # Vérifie JWT rôle MODERATOR ou ADMIN
│   │   ├── page.tsx                      # Vue d'ensemble (stats clés)
│   │   ├── moderation/
│   │   │   ├── page.tsx                  # Hub modération (4 files, compteurs)
│   │   │   ├── addresses/
│   │   │   │   └── page.tsx              # File : adresses en attente
│   │   │   ├── reports/
│   │   │   │   └── page.tsx              # File : signalements en attente
│   │   │   ├── contributions/
│   │   │   │   └── page.tsx              # File : contributions terrain
│   │   │   └── proposals/
│   │   │       └── page.tsx              # File : propositions contributeurs rattachés
│   │   ├── addresses/
│   │   │   └── page.tsx                  # Supervision référentiel (ADMIN only)
│   │   ├── zones/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── api-keys/
│   │   │   └── page.tsx
│   │   ├── moderators/
│   │   │   └── page.tsx                  # Gestion comptes Modérateurs (ADMIN only)
│   │   └── users/
│   │       └── page.tsx                  # Suspension Habitants (ADMIN only)
│   │
│   └── backoffice/
│       └── login/
│           └── page.tsx                  # Connexion Modérateur / Administrateur (email + password)
│
├── components/
│   ├── ui/
│   │   └── Button, Input, Badge, Modal, Skeleton, Toast, Tabs...
│   ├── address/
│   │   ├── StepsList.tsx
│   │   ├── ReliabilityBadge.tsx
│   │   ├── AddressCard.tsx
│   │   ├── AddressCreatedScreen.tsx
│   │   ├── NearbyAddressesPrompt.tsx     # Choix rattachement vs nouvelle adresse
│   │   ├── QRCodeDisplay.tsx
│   │   └── ShareButton.tsx
│   ├── map/
│   │   └── MapNavigator.tsx              # Leaflet — toujours dynamic ssr:false
│   ├── forms/
│   │   ├── OtpInput.tsx
│   │   ├── CodeSearchInput.tsx
│   │   ├── StarRating.tsx                # Composant évaluation 5 étoiles
│   │   └── AddressForm/
│   │       ├── index.tsx
│   │       ├── StepZone.tsx
│   │       ├── StepGPS.tsx               # Inclut la détection de doublons
│   │       ├── StepInstructions.tsx
│   │       └── StepPhoto.tsx
│   ├── notifications/
│   │   └── NotificationsList.tsx
│   └── layout/
│       ├── Navbar.tsx
│       ├── BottomNav.tsx
│       └── ServiceWorkerRegistration.tsx
│
├── lib/
│   ├── api.ts
│   ├── auth.ts
│   ├── reliability.ts
│   ├── cloudinary.ts
│   └── utils.ts
│
├── hooks/
│   ├── useGeolocation.ts
│   ├── useAuth.ts
│   ├── useAddress.ts
│   ├── useNotifications.ts
│   └── usePushNotifications.ts
│
├── types/
│   └── api.ts
│
└── public/
    ├── icons/
    ├── sw.js
    └── offline.html
```

### Gestion du JWT et des rôles

Stocké dans `localStorage`. Le hook `useAuth` lit le token au montage, vérifie `exp`, supprime et redirige si expiré. Il expose aussi le rôle (`HABITANT`, `MODERATOR`, `ADMIN`) pour les contrôles d'accès.

```typescript
// hooks/useAuth.ts
export function useAuth() {
  // { user, role, isAuthenticated, isHabitant, isModerator, isAdmin, logout }
}
```

### Protection des routes

- `app/dashboard/layout.tsx` : JWT requis + rôle `HABITANT`. Sinon → `/auth`.
- `app/admin/layout.tsx` : JWT requis + rôle `MODERATOR` ou `ADMIN`. Sinon → `/backoffice/login`.
- `app/backoffice/login/page.tsx` : page publique, déjà connecté → `/admin`.

### Contrôle des fonctionnalités Admin-only dans les pages partagées

Les pages sous `/admin/moderation/` sont accessibles aux deux rôles. Les fonctionnalités exclusivement Admin (zones, clés API, comptes Modérateurs, suspension Habitants) sont rendues conditionnellement :

```typescript
const { isAdmin } = useAuth();
// Exemples d'usage :
{isAdmin && <Link href="/admin/zones">Zones</Link>}
{isAdmin && <SuspendUserButton userId={...} />}
```

---

## 6. PWA — configuration native Next.js

### Web App Manifest

```typescript
// app/manifest.ts
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AdresseBJ',
    short_name: 'AdresseBJ',
    description: 'Ton adresse numérique au Bénin',
    start_url: '/',
    display: 'standalone',
    background_color: '#F8F7F4',
    theme_color: '#1A7F50',
    orientation: 'portrait',
    icons: [
      { src: '/icons/icon-192.png',          sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png',          sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
```

### Service Worker et stratégie de cache

```javascript
// public/sw.js
const CACHE_NAME = 'adressebj-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(['/', '/offline.html'])
    )
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Pages adresse publiques — Stale While Revalidate (max 10 en cache)
  if (url.pathname.startsWith('/a/')) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  // Auth et écriture — toujours réseau
  if (url.pathname.includes('/api/v1/auth') || event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Fallback offline
  event.respondWith(
    fetch(event.request).catch(() => caches.match('/offline.html'))
  );
});

// Deep link depuis notification push
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url;
  if (url) {
    event.waitUntil(clients.openWindow(url));
  }
});
```

---

## 7. Inventaire complet des pages

### Pages publiques

| Route | Fichier | Description |
|-------|---------|-------------|
| `/` | `app/page.tsx` | Landing + champ de recherche |
| `/a/:code` | `app/a/[code]/page.tsx` | Consultation adresse + navigation + évaluation |
| `/auth` | `app/auth/page.tsx` | Connexion / Inscription Habitant (phone) |
| `/backoffice/login` | `app/backoffice/login/page.tsx` | Connexion Modérateur / Administrateur (email) |
| — | `app/not-found.tsx` | Page 404 custom |
| — | `app/error.tsx` | Page 500 custom |
| — | `public/offline.html` | Fallback service worker |

### Pages Habitant (JWT HABITANT requis)

| Route | Fichier | Description |
|-------|---------|-------------|
| `/dashboard` | `app/dashboard/page.tsx` | Espace personnel (3 onglets) |
| `/dashboard/address/new` | `app/dashboard/address/new/page.tsx` | Création adresse |
| `/dashboard/address/:code` | `app/dashboard/address/[code]/page.tsx` | Vue propriétaire |
| `/dashboard/address/:code/edit` | `app/dashboard/address/[code]/edit/page.tsx` | Modification |
| `/dashboard/address/:code/share` | `app/dashboard/address/[code]/share/page.tsx` | QR + partage |
| `/dashboard/address/:code/print` | `app/dashboard/address/[code]/print/page.tsx` | QR imprimable |
| `/dashboard/profile` | `app/dashboard/profile/page.tsx` | Paramètres compte |

### Pages back-office (JWT MODERATOR ou ADMIN requis)

| Route | Fichier | Accès | Description |
|-------|---------|-------|-------------|
| `/admin` | `app/admin/page.tsx` | MOD + ADMIN | Vue d'ensemble |
| `/admin/moderation` | `app/admin/moderation/page.tsx` | MOD + ADMIN | Hub 4 files de modération |
| `/admin/moderation/addresses` | `…/moderation/addresses/page.tsx` | MOD + ADMIN | File adresses en attente |
| `/admin/moderation/reports` | `…/moderation/reports/page.tsx` | MOD + ADMIN | File signalements |
| `/admin/moderation/contributions` | `…/moderation/contributions/page.tsx` | MOD + ADMIN | File contributions terrain |
| `/admin/moderation/proposals` | `…/moderation/proposals/page.tsx` | MOD + ADMIN | File propositions rattachés |
| `/admin/addresses` | `app/admin/addresses/page.tsx` | **ADMIN** | Supervision référentiel |
| `/admin/zones` | `app/admin/zones/page.tsx` | **ADMIN** | Liste zones + carte |
| `/admin/zones/new` | `app/admin/zones/new/page.tsx` | **ADMIN** | Création zone manuelle |
| `/admin/zones/:id` | `app/admin/zones/[id]/page.tsx` | **ADMIN** | Détail + édition zone |
| `/admin/api-keys` | `app/admin/api-keys/page.tsx` | **ADMIN** | Gestion clés API |
| `/admin/moderators` | `app/admin/moderators/page.tsx` | **ADMIN** | Gestion comptes Modérateurs |
| `/admin/users` | `app/admin/users/page.tsx` | **ADMIN** | Suspension Habitants |

---

## 8. Description détaillée des pages et parcours

### `/` — Landing + recherche

L'élément central et prioritaire est le champ de recherche par code — visible immédiatement, sans scroll. Un visiteur entre `AKP-7X3K` et est redirigé vers `/a/AKP-7X3K`.

La landing présente aussi un CTA "Créer mon adresse" secondaire visuellement.

---

### `/a/:code` — Page de consultation ⭐ Priorité absolue

**og:tags dynamiques — obligatoires**

```typescript
// app/a/[code]/page.tsx
export async function generateMetadata({ params }: { params: { code: string } }) {
  const address = await fetchAddressForMetadata(params.code);
  if (!address) return { title: 'Adresse introuvable | AdresseBJ' };

  return {
    title: `Adresse ${params.code} | AdresseBJ`,
    description: address.assembledText,
    openGraph: {
      title: `Adresse ${params.code}`,
      description: address.assembledText,
      images: [{ url: address.photoUrl, width: 800, height: 600 }],
      type: 'website',
    },
    twitter: { card: 'summary_large_image', images: [address.photoUrl] },
  };
}
```

**Contenu, dans l'ordre d'affichage :**

1. Photo du portail — grande, pleine largeur, skeleton pendant le chargement.
2. Code de l'adresse — en gros, bouton de copie.
3. Badge de fiabilité (format "3,7/5 · 23 évaluations" ou "Pas encore évaluée").
4. Instructions d'accès — liste numérotée.
5. Carte Leaflet avec marqueur + bouton "Démarrer la navigation".
6. Bouton "J'y suis" (visible après démarrage navigation).
7. Section évaluation (après clôture de la navigation ou accessible depuis la page).
8. Bouton "Signaler un problème" (permanent en bas de page).

**Évaluation 5 étoiles :**

Réservée aux Habitants authentifiés. Si l'utilisateur n'est pas connecté, cliquer sur une étoile redirige vers `/auth?redirect=/a/:code`.

Un Habitant connecté voit son évaluation actuelle pré-sélectionnée si elle existe (récupérer via l'API). Il peut la modifier à tout moment. Le composant `StarRating` gère l'état optimiste : la note sélectionnée s'affiche immédiatement, l'appel API se fait en arrière-plan.

Après une évaluation ≤ 2 étoiles, afficher discrètement : "Souhaitez-vous signaler un problème ?" avec lien vers le formulaire de signalement.

**Contribution terrain (après "J'y suis") :**

```
"J'y suis" → enregistre arrivedAt
           → optionnellement :
             - Évaluation 5 étoiles (si pas déjà soumise)
             - Si note ≤ 3 ou pas d'évaluation : proposer contribution terrain (texte libre)
             - "Signaler un problème" surfacé
```

La contribution terrain (champ texte libre) est soumise via `POST /addresses/:code/contribution` avec le JWT Habitant. Si l'utilisateur n'est pas connecté, la contribution n'est pas proposée.

**États à gérer — tous obligatoires :**

| État | Comportement |
|------|-------------|
| Chargement | Skeleton photo, texte, carte — jamais d'écran blanc |
| Succès | Affichage complet |
| 404 | "Aucune adresse trouvée pour ce code." |
| 410 | "Cette adresse n'est plus active." — message distinct du 404 |
| Erreur réseau | Message + bouton "Réessayer" |
| Cache hors-connexion | Bandeau discret "Mode hors-connexion" |

---

### `/auth` — Connexion / Inscription Habitant

Deux modes sur une seule page, basculables par onglet ou lien :

**Mode Connexion (défaut) :**
1. Saisie numéro de téléphone + mot de passe.
2. Bouton "Se connecter".
3. En cas de compte suspendu → message clair "Votre compte est suspendu." sans exposer le motif.
4. Lien "Pas encore de compte ? S'inscrire".

**Mode Inscription :**

Flux en 3 étapes séquentielles sur la même page :

1. **Étape 1 — Téléphone** : saisie du numéro → "Recevoir le code". Appelle `POST /auth/request-otp`.
2. **Étape 2 — Code OTP** : saisie des 6 chiffres. `autocomplete="one-time-code"`. Bouton "Renvoyer" après 60s.
3. **Étape 3 — Mot de passe** : saisie + confirmation. Champs optionnels prénom + nom. Appelle `POST /auth/register`.

Succès → JWT dans `localStorage` → redirection `/dashboard` (ou l'URL de redirection passée en query param `?redirect=...`).

**Comportements communs :**
- Code incorrect → erreur inline, champ réinitialisé.
- Code expiré → bouton "Renvoyer" retour étape 1.
- Lien "Connexion back-office ?" vers `/backoffice/login` (discret, en pied de page de la page auth).

---

### `/backoffice/login` — Connexion Modérateur / Administrateur

Page simple, épurée, distincte visuellement de la page auth Habitant. Indication claire : "Espace réservé aux modérateurs et administrateurs".

1. Champ email.
2. Champ mot de passe.
3. Lien "Mot de passe oublié ?" → flow de réinitialisation (email envoyé).
4. Succès → JWT → redirection `/admin`.

**Page de réinitialisation :** accessible via un lien dans l'email (token dans l'URL). Formulaire : nouveau mot de passe + confirmation.

---

### `/dashboard` — Espace personnel Habitant

Trois onglets avec compteurs de badge :

**Onglet 1 — Mes adresses :**
- Liste de toutes les adresses créées avec leur état courant (`brouillon`, `en_attente_validation`, `publiée`, `rejetée`, `désactivée`).
- Badge de couleur par état.
- Pour les adresses `rejetée` : le motif de rejet est affiché.
- Bouton "Créer une adresse".
- Chaque adresse est cliquable → `/dashboard/address/:code`.

**Onglet 2 — Mes rattachements :**
- Liste des adresses auxquelles l'Habitant est rattaché comme contributeur.
- Pour chaque : code, zone, statut de l'adresse.
- Bouton "Proposer une modification" → formulaire de proposition.
- Si l'adresse est désactivée, une mention le signale.

**Onglet 3 — Notifications :**
- Historique complet des notifications, triées par date décroissante.
- Indicateur "non lue" (point coloré) jusqu'au clic.
- Bouton "Tout marquer comme lu".
- Chaque notification est cliquable si elle a un `data.addressCode` → `/dashboard/address/:code`.

---

### `/dashboard/address/new` — Création adresse

Formulaire guidé en **4 étapes séquentielles** avec barre de progression et retour en arrière.

| Étape | Contenu | Validation |
|-------|---------|------------|
| 1 — Zone | Sélection depuis liste + champ de recherche | Zone sélectionnée |
| 2 — GPS | Capture auto + vérification doublons 15m | Coordonnées capturées |
| 3 — Instructions | Prompts guidés + aperçu `assembledText` temps réel | ≥ 2 étapes |
| 4 — Photo | Caméra / galerie + upload Cloudinary + aperçu | URL Cloudinary présente |

**Détail de l'étape GPS (critique) :**

Après capture des coordonnées GPS, le frontend appelle `GET /addresses/nearby?lat=...&lng=...&radius=15`.

- Si la liste est vide → continuer normalement.
- Si des adresses existent dans le rayon → afficher le composant `NearbyAddressesPrompt` :

```
┌─────────────────────────────────────────────────────┐
│  Des adresses existent à moins de 15m de vous       │
│                                                     │
│  [Photo] AKP-7X3K — Akpakpa — 8m         [Choisir] │
│  [Photo] AKP-3P9R — Akpakpa — 12m        [Choisir] │
│                                                     │
│  Aucune de ces adresses ne correspond à mon lieu.   │
│                     [Créer une nouvelle adresse]    │
└─────────────────────────────────────────────────────┘
```

- "Choisir" → appelle `POST /addresses/:code/attach` → confirmation + redirection `/dashboard` avec toast "Vous êtes maintenant rattaché à AKP-7X3K".
- "Créer une nouvelle adresse" → continuer le formulaire de création à l'étape 3.

**Géolocalisation refusée :** ne pas bloquer. Afficher explication + proposition de saisie manuelle (champs lat/lng) ou placement manuel sur carte.

**Écran de succès post-création** : affiché sur la même page, pas une redirection. Affiche le code en grand, l'état "En attente de validation", bouton "Partager sur WhatsApp", bouton "Voir mon adresse".

---

### `/dashboard/address/:code` — Vue propriétaire

- Aperçu : photo, code, zone, état courant.
- Si l'état est `rejetée` : motif de rejet affiché en évidence.
- Si l'état est `en_attente_validation` (modification en cours) : bandeau "Une modification est en cours de validation. La version actuelle reste accessible."
- Badge de fiabilité + nombre d'évaluations + nombre de visites.
- Boutons : "Partager" → `/share`, "Modifier" → `/edit`, "Désactiver".

**Flow de désactivation — irréversible :**
1. Bouton "Désactiver" → modal d'avertissement.
2. Modal : "Cette action est irréversible. Le code AKP-7X3K sera définitivement retiré. Les contributeurs rattachés seront notifiés." + champ de confirmation (saisir le code).
3. Confirmation → appel API → redirection `/dashboard` avec toast "Adresse désactivée".

---

### `/dashboard/address/:code/share` — Partage

- QR code grand format.
- Bouton "Partager sur WhatsApp" (`navigator.share` si disponible, sinon `wa.me/?text=...`).
- Bouton "Copier le lien" avec feedback visuel.
- Bouton "Imprimer le QR code" → ouvre `/print`.

---

### `/dashboard/address/:code/print` — QR imprimable

- Logo AdresseBJ + QR code grand format (minimum 6×6 cm) + code textuel + URL courte.
- Aucun élément de navigation.
- `?autoprint=true` → `window.print()` au chargement.

```css
@media print {
  .no-print  { display: none !important; }
  .print-only { display: block !important; }
  body { background: white; }
}
```

---

### `/dashboard/profile` — Paramètres compte

**Section Identité :**
- Prénom (modifiable librement).
- Nom (modifiable librement).
- Email (optionnel, modifiable librement — pas un identifiant d'auth).
- Numéro de téléphone : affiché mais pas directement modifiable. Bouton "Changer mon numéro" → flow séparé.

**Flow de changement de numéro :**
1. Modal : "Entrez votre nouveau numéro de téléphone".
2. `POST /users/me/phone/request-change` → OTP envoyé au nouveau numéro.
3. Étape OTP (composant `OtpInput`).
4. `POST /users/me/phone/confirm-change` → succès → déconnexion automatique + redirection `/auth` avec message "Votre numéro a été mis à jour. Reconnectez-vous.".

**Section Notifications :**
- Bouton activer/désactiver les notifications push. Jamais de demande de permission navigateur abrupte au chargement.

**Section Supprimer mon compte :**
1. Bouton → modal récapitulatif : "Vos adresses seront désactivées. Les contributeurs rattachés seront notifiés. Vos données personnelles seront supprimées sous 30 jours. Cette action est irréversible."
2. Saisie de confirmation (son numéro de téléphone).
3. Confirmation → `DELETE /users/me` → déconnexion → redirection `/` avec toast "Compte supprimé".

---

### `/admin/moderation` — Hub de modération

Page accessible à **MODERATOR et ADMIN**. Affiche les 4 files avec leurs compteurs respectifs en temps réel. Navigation vers chaque file.

```
┌─────────────────────────────────────────────────────────┐
│                 Files de modération                     │
├───────────────────────┬─────────────────────────────────┤
│ Adresses en attente   │         7 en attente     →      │
│ Signalements          │         3 en attente     →      │
│ Contributions terrain │         12 en attente    →      │
│ Propositions rattachés│         2 en attente     →      │
└───────────────────────┴─────────────────────────────────┘
```

---

### `/admin/moderation/addresses` — File adresses en attente

Pour chaque adresse en attente :
- Photo, code temporaire (sera définitif à la validation), zone, date de soumission.
- Instructions et coordonnées GPS (avec mini-carte).
- Bouton "Valider" → statut PUBLIEE + notification au propriétaire.
- Bouton "Rejeter" → modal avec champ motif **obligatoire** → statut REJETEE + notification.

---

### `/admin/moderation/reports` — File signalements

Pour chaque signalement :
- Adresse concernée (photo, code, instructions actuelles).
- Message du signalement.
- Date de signalement.
- Actions : "Marquer comme résolu" / "Désactiver l'adresse" (+ notification à l'habitant) / "Ignorer".
- Note sur l'inactivité du propriétaire (si > 90 jours sans session) — indication visible pour le modérateur.

---

### `/admin/moderation/contributions` — File contributions terrain

Pour chaque contribution (texte libre) :
- L'adresse concernée (photo, code, instructions actuelles).
- La contribution proposée.
- Actions : "Approuver" (intègre aux instructions) / "Rejeter".

---

### `/admin/moderation/proposals` — File propositions contributeurs rattachés

Pour chaque proposition (modification photo, instructions ou GPS) :
- L'adresse concernée.
- Le détail de la proposition (quels champs modifiés, valeurs proposées vs actuelles).
- Actions : "Transmettre au propriétaire" (statut FORWARDED + notification au propriétaire) / "Rejeter" (motif obligatoire + notification au contributeur).

**Note UX** : le Modérateur ne valide pas directement le contenu — il juge la pertinence et transmet au propriétaire. Le propriétaire a le dernier mot.

---

### `/admin/addresses` — Supervision référentiel (ADMIN)

- Recherche par code, zone, ou numéro de téléphone habitant.
- Filtres : publiées / en attente / rejetées / désactivées / signalées.
- Pour chaque adresse : code, zone, état, score moyen, nombre d'évaluations, nombre de signalements.
- Bouton "Désactiver" directement depuis la liste (avec confirmation).

---

### `/admin/zones` et sous-pages (ADMIN)

**Liste zones + carte :** deux vues basculables (liste / carte Leaflet des polygones OSM).

**Création manuelle :** pour les quartiers informels absents d'OSM. Nom, préfixe (auto-généré, éditable), périmètre (dessin sur carte ou saisie), commune.

**Détail zone :** infos, périmètre sur carte, fourchette de prix médiane (lecture seule, "Données insuffisantes" si volume insuffisant), activation/désactivation.

---

### `/admin/api-keys` — Gestion clés API (ADMIN)

- Liste des clés (préfixe `bj_live_` + premiers caractères — jamais la clé complète), label, statut, date d'émission, expiration.
- Bouton "Créer une clé" → formulaire (label obligatoire, expiration optionnelle).
- Bouton "Révoquer" → confirmation → clé révoquée.

---

### `/admin/moderators` — Gestion comptes Modérateurs (ADMIN)

- Liste des Modérateurs : email, nom, statut (actif/désactivé), date de création.
- Bouton "Créer un modérateur" → formulaire (email, mot de passe temporaire, prénom, nom).
- Actions sur chaque compte : "Désactiver" / "Réactiver" / "Réinitialiser le mot de passe" (envoie email de réinitialisation).

---

### `/admin/users` — Suspension Habitants (ADMIN)

- Recherche par numéro de téléphone ou code d'adresse.
- Pour chaque résultat : profil partiel (téléphone masqué, nombre d'adresses, statut suspension).
- Bouton "Suspendre" → modal avec champ motif obligatoire → suspension activée + notification à l'Habitant.
- Bouton "Lever la suspension" → confirmation → suspension levée.

---

## 9. Composants critiques

### `StepsList`

```typescript
interface StepsListProps {
  steps: string[];
  className?: string;
}
```

Liste numérotée en lecture seule. Espacement généreux, lisible en mouvement.

---

### `ReliabilityBadge`

```typescript
interface ReliabilityBadgeProps {
  averageRating: number | null;
  ratingCount: number;
  size?: 'sm' | 'md';
}
```

Transforme la note via `scoreToLevel()`. Affiche le format "3,7/5 · 23 évaluations" ou "Pas encore évaluée". N'affiche jamais le score brut seul.

---

### `StarRating`

```typescript
interface StarRatingProps {
  currentScore: number | null;  // évaluation actuelle de l'Habitant, null si aucune
  onRate: (score: number) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}
```

Cinq étoiles cliquables. Survol prévisualise la sélection. Clic → `onRate(score)`. Si `currentScore` est défini, les étoiles correspondantes sont affichées en plein. `disabled` pour les utilisateurs non connectés (avec tooltip "Connectez-vous pour évaluer").

Ne jamais afficher un indicateur de chargement sur les étoiles elles-mêmes — gestion optimiste : la sélection s'affiche immédiatement, l'appel API est en arrière-plan. En cas d'erreur API, revenir à l'état précédent + toast d'erreur.

---

### `NearbyAddressesPrompt`

```typescript
interface NearbyAddressesPromptProps {
  addresses: Array<{
    code: string;
    distanceMeters: number;
    photoUrl: string;
    assembledText: string;
  }>;
  onAttach: (code: string) => void;
  onCreateNew: () => void;
}
```

Affiché pendant l'étape GPS de la création d'adresse si des adresses sont détectées à < 15m. Propose le rattachement ou la création d'une nouvelle adresse.

---

### `MapNavigator`

```typescript
interface MapNavigatorProps {
  destination: { lat: number; lng: number };
  addressCode: string;
  onArrival: (departAt: string, arrivedAt: string) => void;
}
```

**Toujours importé avec `dynamic(..., { ssr: false })` — sans exception.**

Affiche la carte, trace l'itinéraire OSRM (fallback marqueur seul si OSRM non disponible). Bouton "J'y suis" → `onArrival(departAt, arrivedAt)`.

---

### `OtpInput`

```typescript
interface OtpInputProps {
  length?: number;  // défaut: 6
  onComplete: (code: string) => void;
}
```

Six inputs individuels. Focus auto sur le suivant. Retour arrière efface et revient au précédent. `autocomplete="one-time-code"`. Support du paste.

---

### `AddressForm`

Orchestrateur 4 étapes. Gère l'état global (zone, gps, steps, photoUrl, nearbyAddresses), navigation entre étapes, soumission finale. Les composants d'étape reçoivent leur slice d'état + `onComplete`.

---

### `NotificationsList`

```typescript
interface NotificationsListProps {
  notifications: Notification[];
  onMarkAllRead: () => void;
}
```

Liste les notifications avec indicateur "non lue", date relative, message. Bouton "Tout marquer comme lu" en haut.

---

### `QRCodeDisplay`

```typescript
interface QRCodeDisplayProps {
  url: string;
  code: string;
  size?: number;  // défaut: 256
}
```

QR code via `qrcode.react`. Bouton téléchargement (canvas → PNG). Bouton copie lien.

---

### `ShareButton`

`navigator.share` si disponible, sinon clipboard. Feedback visuel "Lien copié !".

---

### `AddressCreatedScreen`

```typescript
interface AddressCreatedScreenProps {
  code: string;
  status: 'EN_ATTENTE_VALIDATION';  // toujours ce statut à la création
  shareUrl: string;
  whatsappUrl: string;
}
```

Affiché dans la page de création après succès. Code en grand, mention "En attente de validation", boutons de partage.

---

### `CodeSearchInput`

```typescript
interface CodeSearchInputProps {
  onSearch: (code: string) => void;
}
```

Valide le format basique (3 lettres + tiret + 4 caractères) avant soumission. `onSearch` reçoit le code en majuscules.

---

## 10. Intégration API

### Source de vérité

**`docs/API_CONTRACT.md`** dans le dépôt backend. En cas de divergence, ce fichier a priorité.

### Configuration de base

```typescript
// lib/api.ts
const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

async function apiFetch<T>(
  path: string,
  options: RequestInit & { auth?: 'jwt' | 'none' } = {},
): Promise<T> {
  const { auth = 'none', ...fetchOptions } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (auth === 'jwt') {
    const token = localStorage.getItem('adressebj_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}/api/v1${path}`, { ...fetchOptions, headers });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new ApiError(res.status, error.code ?? 'UNKNOWN_ERROR', error.message ?? '');
  }

  const json = await res.json();
  return json.data as T;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
```

### Variables d'environnement

```env
NEXT_PUBLIC_API_URL=https://adressebj-api.onrender.com
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=adressebj
```

### Codes d'erreur → messages utilisateur

| Code backend | Message utilisateur |
|---|---|
| `INVALID_PHONE_FORMAT` | "Numéro de téléphone invalide. Exemple : +22960000000" |
| `INVALID_OR_EXPIRED_OTP` | "Code incorrect ou expiré. Vérifiez votre SMS." |
| `INVALID_CREDENTIALS` | "Identifiants incorrects." |
| `ACCOUNT_SUSPENDED` | "Votre compte est suspendu." |
| `ACCOUNT_INACTIVE` | "Ce compte a été désactivé." |
| `PHONE_ALREADY_REGISTERED` | "Ce numéro est déjà utilisé." |
| `EMAIL_ALREADY_REGISTERED` | "Cet email est déjà utilisé." |
| `ADDRESS_NOT_FOUND` | "Aucune adresse trouvée avec ce code." |
| `ADDRESS_INACTIVE` | "Cette adresse n'est plus active." |
| `COORDINATES_OUT_OF_COVERAGE` | "Cette position est hors de la zone couverte par AdresseBJ." |
| `STEPS_REQUIRED` | "Veuillez ajouter au moins 2 étapes d'instructions." |
| `REJECTION_REASON_REQUIRED` | *(admin)* "Un motif de rejet est obligatoire." |
| `ALREADY_ATTACHED` | "Vous êtes déjà rattaché à cette adresse." |
| `CANNOT_ATTACH_OWN_ADDRESS` | "Vous ne pouvez pas vous rattacher à votre propre adresse." |
| `NOT_ATTACHED` | "Vous n'êtes pas rattaché à cette adresse." |
| `INVALID_SCORE` | "La note doit être entre 1 et 5." |
| `API_KEY_REVOKED` | *(admin)* "Cette clé API a été révoquée." |
| `ANALYTICS_QUOTA_INSUFFICIENT` | *(admin)* "Quota de remontée insuffisant pour cette zone." |

**Règle absolue** : aucun message technique (stack trace, code SQL, message NestJS brut) n'est jamais affiché à l'utilisateur.

### Gestion du 410 Gone

```typescript
try {
  const address = await apiFetch<Address>(`/addresses/${code}`);
} catch (err) {
  if (err instanceof ApiError) {
    if (err.status === 410) {
      // Adresse désactivée — message distinct
    } else if (err.status === 404) {
      // Adresse inconnue
    }
  }
}
```

---

## 11. Upload Cloudinary

```typescript
// lib/cloudinary.ts
export async function uploadPortalPhoto(file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('La photo ne doit pas dépasser 5 Mo.');
  }

  const { signature, timestamp, apiKey, cloudName, folder, transformation } =
    await apiFetch<CloudinarySignature>('/upload/signature', {
      method: 'POST',
      auth: 'jwt',
    });

  const formData = new FormData();
  formData.append('file', file);
  formData.append('signature', signature);
  formData.append('timestamp', String(timestamp));
  formData.append('api_key', apiKey);
  formData.append('folder', folder);
  formData.append('transformation', transformation); // "q_auto,f_auto"

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: formData },
  );

  if (!res.ok) throw new Error("Échec de l'envoi de la photo. Réessayez.");
  const data = await res.json();
  return data.secure_url as string;
}
```

Dans `StepPhoto.tsx` : loader pendant l'upload, aperçu après succès, erreur claire si échec.

---

## 12. Navigation cartographique — Leaflet.js

### Import dynamique — obligatoire, sans exception

```typescript
const MapNavigator = dynamic(
  () => import('@/components/map/MapNavigator'),
  { ssr: false, loading: () => <MapSkeleton /> }
);
```

### Tiles OpenStreetMap

```typescript
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors',
  maxZoom: 19,
}).addTo(map);
```

### Itinéraire OSRM avec fallback

```typescript
try {
  const response = await fetch(
    `https://router.project-osrm.org/route/v1/driving/` +
    `${userLng},${userLat};${destLng},${destLat}?overview=full&geometries=geojson`,
    { signal: AbortSignal.timeout(5000) }
  );
  const data = await response.json();
  if (data.code === 'Ok' && data.routes.length > 0) {
    L.geoJSON(data.routes[0].geometry, {
      style: { color: 'var(--color-primary)', weight: 4, opacity: 0.8 },
    }).addTo(map);
  }
} catch {
  // Fallback silencieux — marqueur de destination toujours affiché
}
```

### Icône marqueur SVG inline

```typescript
const destinationIcon = L.divIcon({
  html: `<div style="
    width: 28px; height: 28px;
    background: var(--color-primary);
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 3px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  "></div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});
```

### Enregistrement des horodatages

Au démarrage : `departAt = new Date().toISOString()` en état local. À "J'y suis" : `arrivedAt`. Transmis au backend via `POST /visits/confirm` (clé API tierce) ou `POST /visits/start` (PWA). Pour la PWA, seul `POST /visits/start` est utilisé — la confirmation côté intégrateurs est distincte.

---

## 13. Tests

### Tests de composants (React Testing Library)

| Composant | Ce qui est testé |
|-----------|--------------------|
| `OtpInput` | Saisie → focus suivant ; paste code complet → `onComplete` ; retour arrière → focus précédent |
| `StepsList` | Rendu correct ; liste vide → pas de rendu |
| `ReliabilityBadge` | 4.5 → "high" ; 3.0 → "medium" ; 1.5 → "low" ; null → "Pas encore évaluée" |
| `StarRating` | Clic étoile → `onRate` appelé ; `currentScore` pré-sélectionné affiché ; `disabled` → pas d'interaction |
| `AddressForm` | Navigation étapes ; blocage si invalide ; `NearbyAddressesPrompt` affiché si adresses proches |
| `NearbyAddressesPrompt` | "Choisir" → `onAttach` ; "Créer nouveau" → `onCreateNew` |
| `CodeSearchInput` | Code valide → `onSearch` ; code invalide → erreur inline |
| `NotificationsList` | Notifications non lues marquées ; "Tout marquer" → `onMarkAllRead` |
| `ShareButton` | `navigator.share` dispo → appelé ; sinon → clipboard |
| `AddressCreatedScreen` | Code affiché ; statut "En attente" visible ; boutons présents |

### Tests de page

| Page | Ce qui est testé |
|------|------------------|
| `/a/:code` | Rendu avec données mockées ; 404 → message spécifique ; 410 → message distinct ; évaluation non connecté → redirect auth |
| `/auth` | Flux inscription complet (OTP + password) ; flux connexion (phone + password) ; compte suspendu → message |
| `/backoffice/login` | Email + password → JWT stocké → redirection `/admin` |
| `/dashboard` | 3 onglets présents ; notifications affichées ; rattachements visibles |
| `/dashboard/address/new` | 4 étapes ; blocage < 2 steps ; détection doublons affiche prompt ; écran succès après submit |
| `/` | Champ présent ; code valide → redirection `/a/:code` |

### Mocking

```typescript
jest.mock('@/lib/api', () => ({ apiFetch: jest.fn() }));
```

Jamais d'appel au vrai backend dans les tests.

### Coverage cible

**≥ 60 %** sur `components/address/`, `components/forms/`, `components/notifications/`.

---

## 14. Déploiement

### Premier déploiement — déclencheur

Dès que `/a/:code` est fonctionnelle sur le vrai backend : photo, instructions, carte branchées sur l'API de production.

### Configuration Vercel

```
Framework Preset : Next.js
Build Command    : next build
```

**Variables d'environnement avant le premier déploiement :**

```
NEXT_PUBLIC_API_URL               = https://adressebj-api.onrender.com
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = adressebj
```

### Vérification post-déploiement (sur mobile)

- `/a/:code` charge et s'affiche correctement.
- Carte Leaflet se charge (pas d'erreur `window is not defined`).
- Application installable depuis Chrome Android.
- Manifest valide (DevTools → Application → Manifest).
- Preview WhatsApp de `/a/:code` affiche la photo (tester via [opengraph.xyz](https://www.opengraph.xyz)).
- `/auth` : inscription + connexion fonctionnels.
- `/backoffice/login` : connexion Modérateur/Admin fonctionnelle.

---

## 15. Règles de travail

### Notifications push — flow de souscription

Proposé depuis `/dashboard/profile`, section "Notifications". **Jamais de demande de permission navigateur abrupte au chargement.**

```typescript
// hooks/usePushNotifications.ts
export function usePushNotifications() {
  // { isSupported, isSubscribed, subscribe, unsubscribe }
  // subscribe() → affiche d'abord une explication
  //             → Notification.requestPermission()
  //             → envoie l'endpoint push au backend
}
```

**Deep link depuis notification push** : géré dans le service worker via `notificationclick`. L'URL cible est dans `event.notification.data.url`.

### Commits

```
feat(auth): add phone+password login flow for Habitant
feat(auth): add registration OTP flow with password setup
feat(backoffice): add email+password login for Moderator/Admin
feat(dashboard): restructure with 3-tab personal space
feat(address-page): replace binary vote with 5-star StarRating
feat(address-creation): add NearbyAddressesPrompt with attach flow
feat(notifications): add NotificationsList component
feat(admin-moderation): implement 4 moderation queues
fix(map): fix Leaflet window is not defined with dynamic import
test(star-rating): rating interaction and disabled state
```

Un commit = une unité fonctionnelle testée. Chaque commit sur `main` est déployable.

### Responsive — mobile d'abord

Tout composant codé à 375px, testé à 390px, puis adapté desktop. Tester sur Chrome DevTools mobile avant chaque commit.

### Accessibilité minimale

- `aria-label` sur tous les éléments interactifs sans texte visible.
- Contrastes WCAG AA (4.5:1 pour le texte normal).
- `<label>` associés à tous les `<input>`.
- `StarRating` : chaque étoile a un `aria-label` ("1 étoile", "2 étoiles", etc.) et est activable au clavier.

### Ce qui ne passe pas

- Composant critique livré sans test.
- Couleur ou taille codée en dur si un token existe.
- Import Leaflet sans `dynamic` + `ssr: false`.
- Erreur API affichée telle quelle à l'utilisateur.
- Écran de chargement absent sur un fetch réseau.
- État vide non géré.
- Suppression ou désactivation sans confirmation explicite.
- Page `/a/:code` sans og:tags.
- Page 404 ou 500 utilisant le rendu par défaut Next.js.
- Évaluation soumise par un utilisateur non connecté sans redirection vers `/auth`.
- Fonctionnalité Admin-only rendue à un Modérateur (vérifier `isAdmin` avant affichage).