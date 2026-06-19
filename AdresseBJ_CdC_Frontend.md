# AdresseBJ — Cahier des Charges Technique · Frontend

> [!IMPORTANT]
> Ce cahier des charges est un guide de référence, pas une spécification exhaustive et définitive. Il pose les grandes lignes : architecture, pages, composants critiques, règles de travail. Mais la responsabilité du frontend — le dernier mot, l'analyse technique, les décisions de détail — revient au développeur frontend. Ce document ne remplace pas ton expertise. Il est inévitablement incomplet : certains cas limites, certaines subtilités d'implémentation, certaines décisions d'UX de détail ne sont pas couverts ici. C'est à toi de les identifier, de les analyser, et de les combler avec ton propre jugement. Tu es le premier responsable de la qualité de ce que tu livres.

> **Destinataire** : Développeur frontend (BANKOLE Primaël)
> **Rôle** : Concevoir l'identité visuelle, implémenter la PWA, tester les parcours critiques, déployer tôt et de manière continue.
> **Relation avec le backend** : Le backend définit le contrat API (`docs/API_CONTRACT.md`). Tu n'as pas besoin de lire le code NestJS — seulement ce contrat. Si quelque chose n'y est pas clair, c'est Mouwafic qui précise.
> **Source de vérité fonctionnelle** : le cahier des charges fonctionnel AdresseBJ (v5) prime en cas de divergence.

---

## Table des matières

1. [Contexte et rôle du frontend](#1-contexte-et-rôle-du-frontend)
2. [Concepts métier essentiels pour le frontend](#2-concepts-métier-essentiels-pour-le-frontend)
3. [Stack technique](#3-stack-technique)
4. [Phase design — avant de coder](#4-phase-design--avant-de-coder)
5. [Identité visuelle et système de design](#5-identité-visuelle-et-système-de-design)
6. [Architecture applicative](#6-architecture-applicative)
7. [PWA — configuration native Next.js](#7-pwa--configuration-native-nextjs)
8. [Inventaire complet des pages](#8-inventaire-complet-des-pages)
9. [Description détaillée des pages et parcours](#9-description-détaillée-des-pages-et-parcours)
10. [Composants critiques](#10-composants-critiques)
11. [Intégration API](#11-intégration-api)
12. [Upload Cloudinary](#12-upload-cloudinary)
13. [Cartographie — Leaflet.js](#13-cartographie--leafletjs)
14. [Tests](#14-tests)
15. [Déploiement](#15-déploiement)
16. [Règles de travail](#16-règles-de-travail)

---

## 1. Contexte et rôle du frontend

AdresseBJ est une PWA — une application web installable depuis le navigateur, sans passer par les stores. Conçue pour les smartphones Android de Cotonou, souvent en connexion dégradée, avec des utilisateurs qui n'ont pas nécessairement l'habitude des applications numériques complexes.

Le frontend porte trois responsabilités que rien d'autre ne peut compenser :

- **L'identité du produit.** AdresseBJ est une infrastructure nationale. Elle doit inspirer confiance, paraître sérieuse et ancrée dans le quotidien béninois — sans être froide. L'UI est le seul point de contact entre l'utilisateur et le système.
- **L'expérience de création d'adresse.** Le flux doit être si guidé qu'un habitant non-technique le complète en moins de 5 minutes sans assistance.
- **La consultation et la navigation.** La page `/a/:code` est l'écran le plus consulté. Un visiteur y arrive depuis WhatsApp, sans avoir jamais entendu parler d'AdresseBJ, et doit pouvoir naviguer vers le portail en moins de 30 secondes.

---

## 2. Concepts métier essentiels pour le frontend

Le frontend n'a pas à implémenter la logique du modèle, mais il doit en comprendre les **effets visibles** pour ne pas concevoir d'écrans contradictoires.

**Localisation vs Adresse.** Une localisation est un point physique partagé ; une adresse est ce qu'un habitant en publie (photo, instructions, catégorie, code). Plusieurs adresses peuvent coexister au même endroit. **Le frontend ne manipule jamais la notion de localisation** : elle est entièrement interne au backend. L'habitant croit simplement « créer son adresse ». Si le backend renvoie `409 ADDRESS_ALREADY_EXISTS_AT_LOCATION`, le frontend affiche « Vous avez déjà une adresse à cet endroit » et propose de la modifier — sans jamais prononcer le mot « localisation ».

**États d'une adresse (deux axes).** Une adresse n'est pas un simple « actif/inactif ». Le modèle distingue **l'état de l'entité** (`ACTIVE` / `DESACTIVEE`) et **l'état de sa dernière version de contenu** (en attente de validation / publiée / rejetée). Les deux se combinent : une adresse peut être publiée **et** avoir une modification en attente de validation. Le dashboard habitant **doit** refléter cette combinaison pour chaque adresse, car une version en attente ou rejetée n'est pas consultable publiquement même quand une version précédente l'est. Une dernière version rejetée affiche son motif et un bouton « Corriger et resoumettre ». La notion de localisation et le mécanisme de révision restent internes : l'habitant ne voit que « son adresse » et « sa modification ».

**Catégorie.** Chaque adresse a une catégorie obligatoire (`DOMICILE`, `COMMERCE`, `RESTAURATION`, `SANTE`, `EDUCATION`, `ADMINISTRATION`, `LOISIR`, `AUTRE`). Elle a un **effet visible** : elle détermine si l'adresse apparaît en clair ou en marqueur muet sur la carte publique. L'écran de création doit le signaler.

**Découverte cartographique (opt-out).** Une adresse publiée est par défaut visible sur la carte publique. Le propriétaire peut la retirer de la carte (toggle dans son espace), sans affecter sa résolution par code. Deux réglages indépendants : *présence sur la carte* (toggle) et *niveau de détail* (catégorie).

**Évaluation.** Notation **sur 5 étoiles**, réservée aux **habitants authentifiés**, une par adresse, modifiable. Pas de vote anonyme. La moyenne (ex : « 3.7/5 ») est affichée publiquement.

**Trois rôles.** Habitant (téléphone + mot de passe ; OTP seulement à l'inscription), Modérateur (email + mot de passe, modération seule), Administrateur (email + mot de passe, tout). L'espace `/admin` n'est plus monolithique : certaines sections sont réservées à l'Admin, d'autres ouvertes au Modérateur.

---

## 3. Stack technique

Toutes les versions sont vérifiées au **17 mai 2026**.

| Rôle | Technologie | Version cible |
|------|-------------|---------------|
| Framework | Next.js (App Router) | **16.2.6** |
| Langage | TypeScript | 5.x |
| CSS | Tailwind CSS | **v4.3** |
| PWA | Next.js natif (sans librairie tierce) | — |
| Cartographie | Leaflet.js | dernière stable |
| Géocodage | Nominatim (OpenStreetMap, API publique) | — |
| Routage | OSRM (API publique) | — |
| QR Code | `qrcode.react` | dernière stable |
| Icônes | `lucide-react` | dernière stable |
| Tests | Jest + React Testing Library | std Next.js 16 |
| Déploiement | Vercel | — |

### Points d'attention sur les versions

**Tailwind CSS v4 est une rupture majeure avec v3.** Plus de `tailwind.config.js`. Toute la config dans le CSS principal via `@theme`. Installation via `@tailwindcss/postcss`. Partir sur cette base dès le début, pas migrer en cours de route.

**next-pwa est abandonné** depuis 2024. Ne pas l'installer. La PWA se configure nativement avec Next.js 16 (section 7).

**Leaflet.js est côté client uniquement.** Tout composant qui l'utilise doit être importé avec `dynamic(() => import(...), { ssr: false })`. Sinon erreur `window is not defined` au build — sans exception.

**Nominatim et OSRM publics ont des limites d'usage.** Encapsuler les appels, prévoir un fallback (OSRM : marqueur seul si pas d'itinéraire ; Nominatim : message « lieu introuvable, essayez un code »). Respecter la politique d'usage Nominatim (User-Agent identifiable, pas de requête à chaque frappe — debounce obligatoire).

---

## 4. Phase design — avant de coder

**Durée : une journée maximum.** L'objectif n'est pas un Figma parfait — c'est une direction visuelle claire et validée avant le premier composant.

### Ce que la phase design doit produire

1. **Palette de couleurs finale** — tokens hex, rôle de chaque couleur.
2. **Typographie** — deux polices max (display + body), scale.
3. **Maquettes des 4 écrans critiques** :
   - La page de consultation d'adresse `/a/:code`
   - Le formulaire de création — une étape représentative (idéalement l'étape instructions avec repères proposés)
   - La landing avec la **barre de recherche unifiée** (code + lieu)
   - La **carte de découverte publique** (surcouche des adresses + filtres par catégorie)

### Outils recommandés
**Google Stitch**, **v0.dev**, ou **Galileo AI**. Génère plusieurs directions, garde la meilleure.

### Livrable
Un fichier de référence commité sous `design/`.

---

## 5. Identité visuelle et système de design

### Direction visuelle

AdresseBJ est un projet béninois, pour les Béninois. Les couleurs du drapeau — vert, jaune, rouge — sont la matière première, traitées avec intelligence, pas comme un sticker patriotique. Objectif : **confiant, lisible, ancré localement, différent de tout ce qui existe déjà**.

À éviter : glassmorphisme ; cards uniformes en grille sans rythme ; palette Material/Tailwind par défaut ; hero centré générique ; animations sans raison fonctionnelle.

À viser : confiance immédiate ; états d'interface clairs (loading, erreur, succès, vide) ; **mobile-first** fonctionnant aussi sur desktop ; lisibilité en plein soleil (contraste élevé, tailles généreuses).

### Système de tokens Tailwind v4

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
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

  --font-display: 'Police Display', sans-serif;
  --font-body:    'Police Body', sans-serif;

  --text-display: clamp(2rem, 5vw, 3.5rem);
  --text-h1:      clamp(1.5rem, 3vw, 2.25rem);
  --text-h2:      clamp(1.25rem, 2.5vw, 1.75rem);
  --text-h3:      clamp(1.1rem, 2vw, 1.375rem);
  --text-body:    1rem;
  --text-sm:      0.875rem;
  --text-xs:      0.75rem;

  --spacing-xs:  0.25rem;
  --spacing-sm:  0.5rem;
  --spacing-md:  1rem;
  --spacing-lg:  1.5rem;
  --spacing-xl:  2.5rem;
  --spacing-2xl: 4rem;

  --radius-sm:   6px;
  --radius-md:   12px;
  --radius-lg:   20px;
  --radius-full: 9999px;
}
```

### Affichage de la fiabilité

Le score est une **moyenne sur 5 étoiles**, affichée chiffrée et en étoiles. Le score brut composite 0–100 n'existe plus.

```typescript
// lib/reliability.ts
export interface Reliability {
  average: number | null;  // null = aucune évaluation
  count: number;
}

// Rendu :
// - average === null  → "Aucune évaluation pour le moment"
// - sinon             → "3.7/5" + rangée d'étoiles + "(12 avis)"
```

```typescript
// components/address/RatingDisplay.tsx
interface RatingDisplayProps {
  average: number | null;
  count: number;
  size?: 'sm' | 'md';
}
```

> **Affichage de la moyenne chiffrée au visiteur — assumé** (cahier v5, Besoin 8). On affiche « 3.7/5 », contrairement à l'ancienne règle « ne jamais montrer le score brut ». La règle a changé : le visiteur voit la moyenne et le nombre d'avis.

### Catégories — libellés et couleurs

```typescript
// lib/categories.ts
export const CATEGORIES = {
  DOMICILE:       { label: 'Domicile',                 icon: 'Home' },
  COMMERCE:       { label: 'Commerce',                 icon: 'Store' },
  RESTAURATION:   { label: 'Restauration',             icon: 'UtensilsCrossed' },
  SANTE:          { label: 'Santé',                    icon: 'Cross' },
  EDUCATION:      { label: 'Éducation',                icon: 'GraduationCap' },
  ADMINISTRATION: { label: 'Administration / service public', icon: 'Landmark' },
  LOISIR:         { label: 'Loisir',                   icon: 'Music' },
  AUTRE:          { label: 'Autre',                    icon: 'MapPin' },
} as const;

export type Category = keyof typeof CATEGORIES;
```

---

## 6. Architecture applicative

### Structure des dossiers

```
src/
├── app/
│   ├── layout.tsx                        # Layout racine (fonts, metadata PWA, providers)
│   ├── page.tsx                          # Landing + barre de recherche unifiée
│   ├── globals.css                       # Tailwind @import + @theme
│   ├── manifest.ts                       # Web App Manifest (PWA)
│   ├── not-found.tsx                     # 404 custom brandée
│   ├── error.tsx                         # 500 custom brandée
│   │
│   ├── carte/
│   │   └── page.tsx                      # Carte de découverte publique (surcouche + filtres)
│   │
│   ├── a/[code]/
│   │   ├── page.tsx                      # Consultation adresse visiteur
│   │   └── opengraph-image.tsx           # og:image dynamique (preview WhatsApp)
│   │
│   ├── auth/
│   │   └── page.tsx                      # Inscription (OTP+mdp+email) + connexion habitant
│   ├── login/
│   │   └── page.tsx                      # Login Modérateur / Admin (email + mot de passe)
│   │
│   ├── dashboard/
│   │   ├── layout.tsx                    # Layout protégé habitant
│   │   ├── page.tsx                      # Liste des adresses + état + toggle carte
│   │   ├── profile/
│   │   │   └── page.tsx                  # Compte + notifications + suppression
│   │   ├── notifications/
│   │   │   └── page.tsx                  # Historique des notifications
│   │   └── address/
│   │       ├── new/page.tsx              # Création (étapes + écran succès)
│   │       └── [code]/
│   │           ├── page.tsx              # Vue propriétaire (état, stats, actions)
│   │           ├── edit/page.tsx         # Modification (→ re-validation)
│   │           ├── share/page.tsx        # Partage + QR
│   │           └── print/page.tsx        # QR imprimable
│   │
│   ├── moderation/                       # Modérateur ET Admin
│   │   ├── layout.tsx                    # Vérifie rôle MODERATEUR ou ADMIN
│   │   ├── page.tsx                      # Vue d'ensemble des 3 files
│   │   ├── revisions/page.tsx            # File 1 : révisions en attente
│   │   ├── reports/
│   │   │   ├── page.tsx                  # File 2 : signalements
│   │   │   └── [id]/page.tsx             # Traitement d'un signalement
│   │   └── contributions/page.tsx        # File 3 : contributions terrain
│   │
│   └── admin/                            # Admin uniquement
│       ├── layout.tsx                    # Vérifie rôle ADMIN
│       ├── page.tsx                      # Vue d'ensemble + stats
│       ├── quartiers/
│       │   ├── page.tsx                  # Liste + carte de couverture
│       │   ├── new/page.tsx              # Création manuelle de quartier
│       │   └── [id]/page.tsx             # Détail + édition + fourchette prix
│       ├── addresses/page.tsx            # Supervision référentiel
│       ├── moderators/page.tsx           # Gestion des comptes Modérateurs
│       ├── users/page.tsx                # Suspension / levée d'Habitants
│       └── api-keys/page.tsx             # Gestion clés API
│
├── components/
│   ├── ui/                               # Button, Input, Badge, Modal, Skeleton, Toast...
│   ├── address/
│   │   ├── StepsList.tsx
│   │   ├── RatingDisplay.tsx             # moyenne /5 + étoiles (lecture)
│   │   ├── RatingInput.tsx               # saisie 1..5 étoiles (habitant authentifié)
│   │   ├── CategoryBadge.tsx
│   │   ├── AddressStatusBadge.tsx        # badge à deux axes (entité + dernière version)
│   │   ├── AddressCard.tsx
│   │   ├── AddressCreatedScreen.tsx
│   │   ├── FieldNotes.tsx                # contributions terrain approuvées (lecture seule)
│   │   ├── QRCodeDisplay.tsx
│   │   └── ShareButton.tsx
│   ├── map/
│   │   ├── MapNavigator.tsx              # navigation /a/:code — dynamic ssr:false
│   │   └── DiscoveryMap.tsx              # carte browsable /carte — dynamic ssr:false
│   ├── forms/
│   │   ├── OtpInput.tsx
│   │   ├── SearchBar.tsx                 # barre unifiée code + lieu (landing & carte)
│   │   └── AddressForm/
│   │       ├── index.tsx                 # orchestrateur multi-étapes
│   │       ├── StepGPS.tsx
│   │       ├── StepInstructions.tsx      # repères proposés + rédaction libre
│   │       ├── StepCategory.tsx          # choix catégorie + effet visibilité signalé
│   │       └── StepPhoto.tsx
│   └── layout/
│       ├── Navbar.tsx
│       ├── BottomNav.tsx
│       └── ServiceWorkerRegistration.tsx
│
├── lib/
│   ├── api.ts
│   ├── auth.ts
│   ├── reliability.ts
│   ├── categories.ts
│   ├── nominatim.ts                      # géocodage texte libre
│   ├── cloudinary.ts
│   └── utils.ts
│
├── hooks/
│   ├── useGeolocation.ts
│   ├── useAuth.ts
│   ├── useAddress.ts
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

### Gestion du JWT
Stocké dans `localStorage`. `useAuth` lit le token au montage, vérifie `exp`, supprime et redirige si expiré. Le payload contient `role` (`HABITANT` | `MODERATEUR` | `ADMIN`).

### Protection des routes
- `/dashboard/*` → JWT habitant requis.
- `/moderation/*` → rôle `MODERATEUR` **ou** `ADMIN`.
- `/admin/*` → rôle `ADMIN` strictement.
Chaque layout vérifie le rôle et redirige si insuffisant.

---

## 7. PWA — configuration native Next.js

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
  event.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(['/', '/offline.html'])));
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/a/')) {               // pages adresse — stale-while-revalidate
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }
  if (url.pathname.includes('/api/v1/auth') || event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));          // auth/écriture — toujours réseau
    return;
  }
  event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url;
  if (url) event.waitUntil(clients.openWindow(url));
});
```

**Page offline brandée** (`public/offline.html`) — jamais la page d'erreur navigateur par défaut.

### Enregistrement du SW

```typescript
// components/layout/ServiceWorkerRegistration.tsx
'use client';
import { useEffect } from 'react';
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(console.error);
  }, []);
  return null;
}
```

### Icônes PWA
192×192, 512×512, 512×512 maskable. Générées depuis le logo via realfavicongenerator.net.

---

## 8. Inventaire complet des pages

Référence exhaustive. Aucune page hors de cet inventaire. Aucune page listée ne peut être omise.

### Pages publiques — aucune authentification

| Route | Fichier | Description |
|-------|---------|-------------|
| `/` | `app/page.tsx` | Landing + barre de recherche unifiée (code ou lieu) |
| `/carte` | `app/carte/page.tsx` | Carte de découverte publique (surcouche adresses + filtres catégorie) |
| `/a/:code` | `app/a/[code]/page.tsx` | Consultation adresse + navigation |
| `/auth` | `app/auth/page.tsx` | Inscription + connexion habitant |
| `/login` | `app/login/page.tsx` | Login Modérateur / Admin |
| — | `app/not-found.tsx` | 404 brandée |
| — | `app/error.tsx` | 500 brandée |
| — | `public/offline.html` | Fallback hors-connexion |

### Pages habitant — JWT requis

| Route | Fichier | Description |
|-------|---------|-------------|
| `/dashboard` | `app/dashboard/page.tsx` | Mes adresses + état + toggle découverte carte |
| `/dashboard/address/new` | `.../new/page.tsx` | Création (étapes + écran succès) |
| `/dashboard/address/:code` | `.../[code]/page.tsx` | Vue propriétaire : état, stats, actions |
| `/dashboard/address/:code/edit` | `.../edit/page.tsx` | Modification (→ re-validation) |
| `/dashboard/address/:code/share` | `.../share/page.tsx` | QR + lien WhatsApp + lien copiable |
| `/dashboard/address/:code/print` | `.../print/page.tsx` | QR imprimable (`@media print`) |
| `/dashboard/profile` | `.../profile/page.tsx` | Compte + notifications + suppression |
| `/dashboard/notifications` | `.../notifications/page.tsx` | Historique des notifications |

### Pages modération — rôle MODERATEUR ou ADMIN

| Route | Fichier | Description |
|-------|---------|-------------|
| `/moderation` | `app/moderation/page.tsx` | Vue d'ensemble des 3 files |
| `/moderation/revisions` | `.../revisions/page.tsx` | File 1 : révisions en attente (créations + modifications) |
| `/moderation/reports` | `.../reports/page.tsx` | File 2 : signalements |
| `/moderation/reports/:id` | `.../reports/[id]/page.tsx` | Traitement d'un signalement |
| `/moderation/contributions` | `.../contributions/page.tsx` | File 3 : contributions terrain |

### Pages admin — rôle ADMIN strictement

| Route | Fichier | Description |
|-------|---------|-------------|
| `/admin` | `app/admin/page.tsx` | Vue d'ensemble + stats |
| `/admin/quartiers` | `.../quartiers/page.tsx` | Liste quartiers + carte de couverture |
| `/admin/quartiers/new` | `.../quartiers/new/page.tsx` | Création manuelle de quartier |
| `/admin/quartiers/:id` | `.../quartiers/[id]/page.tsx` | Détail + édition + fourchette prix |
| `/admin/addresses` | `.../addresses/page.tsx` | Supervision référentiel |
| `/admin/moderators` | `.../moderators/page.tsx` | Gestion comptes Modérateurs |
| `/admin/users` | `.../users/page.tsx` | Suspension / levée d'Habitants |
| `/admin/api-keys` | `.../api-keys/page.tsx` | Clés API |

---

## 9. Description détaillée des pages et parcours

### `/` — Landing + barre de recherche unifiée

Deux rôles : présenter le produit et offrir **une seule barre de recherche** qui accepte indifféremment :
- un **code AdresseBJ** (format `[QUARTIER]-[4CAR]`) → redirection `/a/:code` ;
- un **lieu en texte libre** → géocodage Nominatim → redirection `/carte` centrée sur le résultat.

Le routage est interne : l'utilisateur saisit, le composant `SearchBar` détecte le format. **L'utilisateur ne choisit jamais un « mode ».**

```typescript
// components/forms/SearchBar.tsx
// 1. Trim + upper. Si match /^[A-Z]{3}-[A-Z0-9]{4}$/ → router.push(`/a/${value}`)
// 2. Sinon → géocodage Nominatim (debounce 400ms) → suggestions → sélection → /carte?lat=..&lng=..
```

Le reste de la landing (présentation, CTA « Créer mon adresse », CTA « Explorer la carte ») est secondaire visuellement.

---

### `/carte` — Carte de découverte publique

Carte Leaflet plein écran, fond OpenStreetMap, avec la **surcouche des adresses AdresseBJ publiées et découvrables** (endpoint `GET /map/addresses` selon la bbox visible). Explorable librement, sans compte.

**Filtres** : par catégorie (chips multi-sélection : commerces, santé, restauration…).

**Niveau de détail des marqueurs — matrice de visibilité (appliquée par le backend, le frontend rend ce qu'il reçoit) :**

| Catégorie | Marqueur | Survol / clic léger | Ouverture |
|-----------|----------|---------------------|-----------|
| `DOMICILE` | muet (`muted: true`, `preview: null`) | aucun aperçu | ouverture → navigation vers `/a/:code` (= consultation) |
| Autres | en clair (`muted: false`) | aperçu : photo + code (`preview`) | ouverture → `/a/:code` |

> Le frontend ne décide jamais de masquer : il affiche `preview` si présent, rien sinon. La règle de confidentialité est portée par le backend. Recharger la surcouche au `moveend`/`zoomend` de la carte (avec debounce) en passant la bbox courante.

---

### `/a/:code` — Page de consultation adresse ⭐ Priorité absolue

L'écran le plus consulté. Le visiteur arrive depuis WhatsApp ou un QR.

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

**Contenu, dans l'ordre :**

1. Photo du portail — grande, pleine largeur, skeleton au chargement.
2. Code + catégorie (`CategoryBadge`), bouton de copie du code.
3. **Affichage de la fiabilité** (`RatingDisplay`) : « 3.7/5 » + étoiles + « (12 avis) », ou « Aucune évaluation pour le moment ».
4. Instructions d'accès — liste numérotée, tailles généreuses.
5. **Informations terrain** (`FieldNotes`) — contributions approuvées, en lecture seule, si présentes.
6. Carte Leaflet (`MapNavigator`) + bouton « Démarrer la navigation ».
7. Actions :
   - « J'y suis » (public, enregistre l'arrivée).
   - **Évaluation 5 étoiles** (`RatingInput`) — **nécessite un compte habitant**. Si non connecté, le clic invite à se connecter. Après navigation, l'évaluation est proposée ; si note ≤ 3 ou absence d'évaluation, le formulaire de contribution terrain est surfacé.
   - « Signaler un problème » (**nécessite un compte habitant**).

**États à gérer — tous obligatoires :**

| État | Comportement |
|------|-------------|
| Chargement | Skeleton photo/texte/carte — jamais d'écran blanc |
| Succès | Affichage complet |
| 404 | « Aucune adresse trouvée pour ce code. » |
| 410 (désactivée) | « Cette adresse n'est plus active. » — message distinct du 404 |
| Erreur réseau | Message + « Réessayer » |
| Cache hors-connexion | Bandeau « Mode hors-connexion — données issues du cache » |

> **Important** : une adresse qui n'a jamais eu de version publiée renvoie `404` côté API (son existence n'est pas exposée). Le frontend la traite comme un 404 standard. Seule une adresse ayant une version publiée est consultable ici ; pendant qu'une modification est en attente, c'est la version précédente qui s'affiche.

**Évaluation 5 étoiles** : upsert côté backend (une note par habitant, modifiable). Pas de `localStorage voted_${code}` — l'unicité est gérée par le backend via le compte. Si l'habitant a déjà noté, afficher sa note actuelle, modifiable.

---

### `/auth` — Inscription et connexion (habitant)

La page a **deux modes** (onglets ou bascule) : *Connexion* et *Inscription*.

**Connexion** (cas courant) : numéro de téléphone + mot de passe → `POST /auth/login` → JWT → `/dashboard`. Pas d'OTP. Erreur identifiants → message inline.

**Inscription** (première fois) : en trois temps sur la page —
1. Saisie du numéro → « Recevoir le code » (`POST /auth/request-otp`).
2. Saisie de l'OTP 6 chiffres (`autocomplete="one-time-code"`) — vérifie la possession du numéro. Code incorrect → erreur inline ; expiré → « Renvoyer un code ».
3. Définition du **mot de passe** et de l'**email** (tous deux obligatoires) → `POST /auth/register` → JWT → `/dashboard`.

> L'OTP ne connecte pas : il vérifie le numéro pendant l'inscription. La reconnexion ultérieure se fait par téléphone + mot de passe. Le mot de passe et l'email sont exigés à l'inscription (validation inline avant envoi). Lien « mot de passe oublié » → flux de réinitialisation (hors périmètre prototype si non implémenté, à signaler).

### `/login` — Modérateur / Administrateur

Formulaire email + mot de passe. Succès → JWT → redirection selon rôle (`/moderation` pour MODERATEUR, `/admin` pour ADMIN). Erreur identifiants → message inline. Compte modérateur désactivé → message dédié. Lien « mot de passe oublié » → flux de réinitialisation par email.

---

### `/dashboard` — Mes adresses

Liste des adresses de l'habitant. **Pour chaque adresse, un badge à deux axes** (`AddressStatusBadge`) combinant l'état de l'entité et celui de sa dernière version :

| Situation | Libellé | Action associée |
|-----------|---------|-----------------|
| Jamais publiée, dernière version en attente | « En attente de validation » | — |
| Jamais publiée, dernière version rejetée | « Rejetée » + motif | « Corriger et resoumettre » |
| Publiée, aucune version en cours | « Publiée » | toggle « Visible sur la carte » (`PATCH /addresses/:code/discoverable`) |
| Publiée, modification en attente | « Publiée · modification en attente » | toggle « Visible sur la carte » |
| Publiée, dernière modification rejetée | « Publiée · modification rejetée » + motif | « Corriger et resoumettre » |
| Désactivée | « Désactivée » | lecture seule |

Le toggle « Visible sur la carte » (opt-out découverte) n'apparaît que pour une adresse ayant une version publiée ; il est indépendant de la résolution par code.

Plus de section « Mes rattachements » (la notion n'existe plus). CTA « Créer une adresse ».

---

### `/dashboard/address/new` — Création adresse

Formulaire guidé en **étapes séquentielles**. Une étape à la fois, barre de progression, retour possible.

| Étape | Contenu | Validation |
|-------|---------|------------|
| 1 — GPS | Capture auto `navigator.geolocation` + aperçu carte. Le quartier est déterminé automatiquement à partir du GPS (jamais saisi). | Coordonnées capturées ou saisie manuelle |
| 2 — Instructions | **Repère de départ proposé depuis Overpass** + étapes libres + aperçu `assembledText` temps réel | Au moins 2 étapes |
| 3 — Catégorie | Choix parmi la liste fermée + **mention de l'effet sur la visibilité carte** | Une catégorie choisie |
| 4 — Photo | Caméra / galerie + upload Cloudinary + aperçu | URL Cloudinary présente |

> Il n'y a plus d'étape « choix du quartier » : le quartier découle du GPS (rattachement automatique côté backend). L'habitant ne sélectionne jamais sa zone.

**Étape 2 — repères proposés (Lecture 1)** : à partir du GPS, afficher une liste de repères connus avoisinants (pharmacies, supermarchés, marchés, stations, édifices). L'habitant en choisit un comme **point de départ**, puis rédige les étapes suivantes. **Si aucun repère trouvé** : message explicite (« Aucun repère connu détecté autour de vous ») et rédaction entièrement libre, étape par étape. Ce cas est normal, pas une erreur.

**Étape 3 — catégorie** : signaler explicitement que `DOMICILE` apparaîtra en marqueur muet sur la carte publique, les autres en clair (photo + code visibles à l'exploration).

**État géolocalisation refusée (étape 1)** : ne pas bloquer. Explication + saisie manuelle lat/lng ou placement sur carte.

**Soumission** : la création soumet directement la première version en attente de validation (pas de brouillon). L'écran de succès (`AddressCreatedScreen`) le dit clairement : « Votre adresse est en cours de validation. Vous serez notifié dès sa publication. » Code affiché, mais préciser que les liens ne seront actifs **qu'après validation**.

**Cas `409 ADDRESS_ALREADY_EXISTS_AT_LOCATION`** : afficher « Vous avez déjà une adresse à cet endroit » + bouton « Voir / modifier cette adresse » (vers le code existant renvoyé). Ne jamais parler de « localisation ».

---

### `/dashboard/address/:code` — Vue propriétaire

- Aperçu : photo, code, catégorie, quartier, date, **état courant**.
- `RatingDisplay` (moyenne + nombre d'avis) + nombre de visites.
- Toggle « Visible sur la carte » (si publiée).
- Boutons : « Partager », « Modifier », « Désactiver ».

**Désactivation — irréversible, confirmation explicite :**
1. Bouton → modal d'avertissement.
2. Modal : « Action irréversible. Le code AKP-7X3K sera définitivement retiré. Les liens et QR partagés ne fonctionneront plus. » + saisie du code pour confirmer.
3. Confirmation → API → redirection dashboard + toast.

> Plus aucune mention de « contributeurs notifiés ». La désactivation n'affecte que cette adresse.

---

### `/dashboard/address/:code/edit` — Modification

Modification photo / instructions / catégorie / GPS. Toute modification crée une nouvelle version soumise à validation ; la version précédente reste publiquement consultable jusqu'à approbation. Le prévenir : « Vos modifications seront validées avant d'être visibles. La version actuelle reste en ligne entre-temps. » Sert aussi à corriger une dernière version rejetée (afficher le motif en haut).

### `/dashboard/address/:code/share` et `/print`
Inchangés : QR grand format, WhatsApp (`navigator.share` sinon `wa.me`), copie de lien, impression (`@media print`, min 6×6 cm, `?autoprint=true`).

### `/dashboard/profile` — Paramètres compte
- Téléphone (affiché ; modification → flux re-vérification OTP via `PATCH /auth/phone`).
- Nom, prénom (modifiables librement). Email modifiable mais non supprimable (obligatoire pour un compte actif).
- Notifications push (activer/désactiver).
- Supprimer mon compte.

**Suppression de compte :**
1. Modal : « Vos adresses seront désactivées. Vos données personnelles seront anonymisées immédiatement. Action irréversible. »
2. Saisie du numéro pour confirmer.
3. API → déconnexion → `/` + toast.

### `/dashboard/notifications` — Historique
Liste persistée des notifications (validation, rejet + motif, dégradation de score, désactivation). Lien profond vers l'adresse concernée.

---

### `/moderation` — Espace de modération (Modérateur + Admin)

Vue d'ensemble des **3 files** avec compteurs. Accès par rôle `MODERATEUR` ou `ADMIN`.

- **`/moderation/revisions`** — révisions en attente (créations et modifications) : photo, code, catégorie, instructions, quartier, type (création / modification). Actions : « Valider » (→ version publiée, pointeur basculé + notif) / « Rejeter » (**motif obligatoire** + notif ; la version en ligne précédente ne change pas).
- **`/moderation/reports`** + `/[id]` — signalements : adresse concernée, message, et **indicateur « propriétaire inactif > 90 j »** comme aide à la décision. Actions : « Marquer résolu » / « Désactiver l'adresse » (+ notif habitant).
- **`/moderation/contributions`** — contributions terrain (texte libre) : adresse concernée + message proposé. Actions : « Approuver » (publiée comme info terrain, **n'altère pas les instructions de l'adresse**) / « Rejeter ». L'UI doit être claire : approuver ≠ modifier l'adresse.

---

### `/admin` — Administration (Admin uniquement)

Vue d'ensemble + stats. Donne accès aux sections réservées :

- **`/admin/quartiers`**, `/new`, `/:id` — liste + carte de couverture (polygones OSM colorés par statut ; quartiers sans polygone affichés par leur point central) ; création manuelle (nom, préfixe auto éditable, polygone dessiné ou point, commune) ; détail/édition (renommage, périmètre, fourchette de prix en lecture seule « Données insuffisantes » si volume faible, activation/désactivation).
- **`/admin/addresses`** — supervision : recherche par code/quartier/téléphone, filtres (publiées / désactivées / signalées), désactivation directe. Plus de filtre « doublons ».
- **`/admin/moderators`** — liste des comptes Modérateurs ; créer (email + mot de passe initial) ; désactiver/réactiver ; réinitialiser le mot de passe.
- **`/admin/users`** — recherche d'un Habitant ; suspendre (motif obligatoire) ; lever la suspension. Préciser à l'écran : la suspension gèle création/évaluation/signalement/contribution, mais les adresses publiées restent visibles.
- **`/admin/api-keys`** — liste (préfixe `bj_live_` masqué), création (label, expiration optionnelle), révocation (confirmation).

---

## 10. Composants critiques

### `SearchBar`
```typescript
interface SearchBarProps {
  variant?: 'landing' | 'map';   // landing → redirige ; map → recentre
}
```
Barre unifiée. Détecte le format code (`/^[A-Z]{3}-[A-Z0-9]{4}$/`) → `/a/:code`. Sinon géocodage Nominatim (debounce 400 ms) → suggestions → sélection. Jamais d'appel Nominatim à chaque frappe.

### `DiscoveryMap`
```typescript
interface DiscoveryMapProps {
  initialCenter?: { lat: number; lng: number };
  categoryFilter?: Category[];
}
```
**`dynamic(..., { ssr: false })`.** Charge la surcouche via `GET /map/addresses` selon la bbox (recharge au `moveend`/`zoomend`, debounce). Rend les marqueurs selon `muted` : muet (pas de popup d'aperçu, clic → `/a/:code`) ou en clair (popup aperçu photo+code, clic → `/a/:code`). Filtre par catégorie côté requête.

### `MapNavigator`
```typescript
interface MapNavigatorProps {
  destination: { lat: number; lng: number };
  onArrival: () => void;
}
```
**`dynamic(..., { ssr: false })`.** Position courante, itinéraire OSRM si dispo, fallback marqueur seul. « J'y suis » → `onArrival()`.

### `RatingDisplay` / `RatingInput`
```typescript
interface RatingDisplayProps { average: number | null; count: number; size?: 'sm' | 'md'; }
interface RatingInputProps { code: string; currentStars?: number; onSubmit: (stars: number) => void; }
```
`RatingDisplay` : lecture seule, « X.X/5 » + étoiles + « (N avis) », ou « Aucune évaluation ». `RatingInput` : saisie 1..5, **nécessite l'authentification** (sinon invite à se connecter), pré-rempli avec la note existante (modifiable).

### `AddressStatusBadge`
```typescript
interface AddressStatusBadgeProps {
  lifecycle: 'ACTIVE' | 'DESACTIVEE';
  isPublished: boolean;                                    // une version a-t-elle déjà été publiée ?
  latestRevisionStatus: 'EN_ATTENTE_VALIDATION' | 'PUBLIEE' | 'REJETEE';
  rejectionReason?: string;                                // si la dernière version est rejetée
}
```
Pastille colorée + libellé FR. Couleurs distinctes : en attente = accent, publiée = primary, rejetée = danger, désactivée = muted.

### `CategoryBadge`
```typescript
interface CategoryBadgeProps { category: Category; }
```
Icône lucide + libellé depuis `lib/categories.ts`.

### `FieldNotes`
```typescript
interface FieldNotesProps { notes: { message: string; createdAt: string }[]; }
```
Liste en lecture seule des contributions terrain approuvées. Masqué si vide.

### `OtpInput`
6 inputs, focus auto, retour arrière, `autocomplete="one-time-code"`, paste.

### `AddressForm`
Orchestrateur des étapes (gps, steps, **category**, photoUrl ; le quartier est dérivé du GPS côté backend). Gère navigation et soumission. Les composants d'étape reçoivent leur slice + `onComplete`.

### `QRCodeDisplay`, `ShareButton`, `AddressCreatedScreen`
QR via `qrcode.react` (téléchargement PNG, copie). Partage `navigator.share` sinon clipboard. Écran de succès post-création (code en grand, partage) — **mentionne l'état « en attente de validation »**.

---

## 11. Intégration API

### Source de vérité
**`docs/API_CONTRACT.md`** dans le dépôt backend. En cas de divergence, ce fichier prime sur le présent CdC.

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
  return (await res.json()).data as T;
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
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
| `INVALID_PHONE_FORMAT` | « Numéro de téléphone invalide. Exemple : +22960000000 » |
| `INVALID_OR_EXPIRED_OTP` | « Code incorrect ou expiré. Vérifiez votre SMS. » |
| `EMAIL_AND_PASSWORD_REQUIRED` | *(inscription)* « Un email et un mot de passe sont obligatoires. » |
| `PHONE_ALREADY_REGISTERED` | *(inscription)* « Ce numéro est déjà associé à un compte. Connectez-vous. » |
| `PHONE_MISMATCH` | *(suppression compte)* « Le numéro saisi ne correspond pas à votre compte. » |
| `INVALID_CREDENTIALS` | *(login)* « Identifiant ou mot de passe incorrect. » |
| `ACCOUNT_DEACTIVATED` | *(login mod)* « Ce compte a été désactivé. Contactez un administrateur. » |
| `ACCOUNT_SUSPENDED` | « Votre compte est suspendu. Vous ne pouvez pas effectuer cette action. » |
| `ADDRESS_NOT_FOUND` | « Aucune adresse trouvée avec ce code. » |
| `ADDRESS_INACTIVE` | « Cette adresse n'est plus active. » |
| `ADDRESS_ALREADY_EXISTS_AT_LOCATION` | « Vous avez déjà une adresse à cet endroit. Modifiez-la plutôt que d'en créer une seconde. » |
| `COORDINATES_OUT_OF_COVERAGE` | « Cette position est hors des quartiers couverts par AdresseBJ. » |
| `STEPS_REQUIRED` | « Veuillez ajouter au moins 2 étapes d'instructions. » |
| `CATEGORY_REQUIRED` | « Veuillez choisir une catégorie. » |
| `INVALID_RATING` | « Note invalide. » |
| `CONTRIBUTION_MESSAGE_REQUIRED` | « Veuillez saisir une information. » |
| `REJECTION_REASON_REQUIRED` | *(modération)* « Le motif de rejet est obligatoire. » |
| `API_KEY_REVOKED` | *(admin)* « Cette clé API a été révoquée. » |
| `ANALYTICS_QUOTA_INSUFFICIENT` | *(admin)* « Quota de remontée insuffisant pour ce quartier. » |

**Règle absolue** : aucun message technique n'est jamais affiché à l'utilisateur.

### Gestion du 410 Gone
```typescript
try {
  const address = await apiFetch<Address>(`/addresses/${code}`);
} catch (err) {
  if (err instanceof ApiError) {
    if (err.status === 410) { /* désactivée — message spécifique */ }
    else if (err.status === 404) { /* inconnue ou non publiée — message générique */ }
  }
}
```

> Une adresse en attente de validation ou rejetée renvoie `404` (existence non exposée). Le frontend la traite comme un 404. Seul `410` signale une désactivation.

---

## 12. Upload Cloudinary

```typescript
// lib/cloudinary.ts
export async function uploadPortalPhoto(file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024) throw new Error('La photo ne doit pas dépasser 5 Mo.');

  const { signature, timestamp, apiKey, cloudName, folder, transformation } =
    await apiFetch<CloudinarySignature>('/upload/signature', { method: 'POST', auth: 'jwt' });

  const formData = new FormData();
  formData.append('file', file);
  formData.append('signature', signature);
  formData.append('timestamp', String(timestamp));
  formData.append('api_key', apiKey);
  formData.append('folder', folder);
  formData.append('transformation', transformation); // "q_auto,f_auto"

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: formData });
  if (!res.ok) throw new Error("Échec de l'envoi de la photo. Réessayez.");
  return (await res.json()).secure_url as string;
}
```

Dans `StepPhoto.tsx` : loader pendant l'upload, aperçu après succès, erreur claire si échec. L'utilisateur perçoit un seul geste.

---

## 13. Cartographie — Leaflet.js

### Import dynamique — obligatoire
```typescript
const MapNavigator = dynamic(() => import('@/components/map/MapNavigator'), { ssr: false, loading: () => <MapSkeleton /> });
const DiscoveryMap = dynamic(() => import('@/components/map/DiscoveryMap'), { ssr: false, loading: () => <MapSkeleton /> });
```

### Tuiles OpenStreetMap
```typescript
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors', maxZoom: 19,
}).addTo(map);
```

### Géocodage Nominatim (recherche texte libre)
```typescript
// lib/nominatim.ts — debounce obligatoire, User-Agent identifiable, usage modéré
export async function geocode(query: string) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=5&` +
    `countrycodes=bj&q=${encodeURIComponent(query)}`,
    { headers: { 'Accept-Language': 'fr' } },
  );
  return res.json(); // [{ lat, lon, display_name }, ...]
}
```
Fallback : si aucun résultat → « Lieu introuvable. Essayez un code AdresseBJ (ex : AKP-7X3K). »

### Repères avoisinants à la création (Overpass)
À l'étape instructions, requête des POI proches du GPS (via le backend de préférence, ou Overpass directement). Affichés comme suggestions de **point de départ**. Aucun résultat → rédaction libre. Encapsuler, gérer le cas vide proprement.

### Itinéraire OSRM avec fallback
```typescript
try {
  const r = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${userLng},${userLat};${destLng},${destLat}?overview=full&geometries=geojson`,
    { signal: AbortSignal.timeout(5000) },
  );
  const data = await r.json();
  if (data.code === 'Ok' && data.routes.length) {
    L.geoJSON(data.routes[0].geometry, { style: { color: 'var(--color-primary)', weight: 4, opacity: 0.8 } }).addTo(map);
  }
} catch { /* fallback silencieux : le marqueur destination reste affiché */ }
```

### Icône marqueur
```typescript
const destinationIcon = L.divIcon({
  html: `<div style="width:28px;height:28px;background:var(--color-primary);border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
  className: '', iconSize: [28, 28], iconAnchor: [14, 28],
});
```

### Horodatages de navigation
Au démarrage : `POST /visits/start` → `visitId`. À « J'y suis » : `POST /visits/confirm` avec `visitId` + `arrivedAt`. Anonyme, aucun compte requis.

---

## 14. Tests

### Tests de composants (React Testing Library)

| Composant | Ce qui est testé |
|-----------|-----------------|
| `OtpInput` | Saisie → focus suivant ; paste → `onComplete` ; retour arrière → focus précédent |
| `StepsList` | Rendu correct ; vide → pas de rendu |
| `RatingDisplay` | 3.7 + 12 → « 3.7/5 (12 avis) » ; null → « Aucune évaluation » |
| `RatingInput` | Sélection étoile → `onSubmit` ; non authentifié → invite connexion ; note existante pré-remplie |
| `AddressStatusBadge` | Chaque combinaison (entité × dernière version) → bon libellé ; « publiée + modif en attente » distinct de « publiée » |
| `CategoryBadge` | Catégorie → bon libellé + icône |
| `SearchBar` | Format code → redirection `/a/:code` ; texte libre → géocodage |
| `AddressForm` | Navigation étapes ; blocage si invalide ; catégorie obligatoire ; soumission appelle API |
| `ShareButton` | `navigator.share` dispo → appelé ; sinon clipboard |
| `AddressCreatedScreen` | Code affiché ; mention « en attente de validation » |

### Tests de page

| Page | Ce qui est testé |
|------|-----------------|
| `/a/:code` | Rendu avec données mockées ; 404 → message ; 410 → message distinct ; non publiée → traitée comme 404 |
| `/carte` | Surcouche chargée ; domicile = marqueur muet (pas d'aperçu) ; commerce = aperçu ; filtre catégorie |
| `/auth` | Inscription : téléphone → OTP → mdp+email → JWT ; Connexion : téléphone+mdp → JWT |
| `/login` | Login mod/admin (email+mdp) → redirection selon rôle |
| `/dashboard` | États d'adresse affichés ; toggle découverte sur publiée ; bouton resoumettre sur rejetée |
| `/dashboard/address/new` | Étapes ; blocage < 2 steps ; catégorie requise ; écran succès « en attente » ; 409 → message dédié |
| `/moderation/revisions` | Liste créations+modifs ; valider → publiée + pointeur ; rejeter sans motif → bloqué |
| `/` | Barre présente ; code valide → `/a/:code` ; lieu → géocodage |

### Mocking
```typescript
jest.mock('@/lib/api', () => ({ apiFetch: jest.fn() }));
```
Jamais d'appel au vrai backend dans les tests.

### Coverage cible
**≥ 60 %** sur `components/address/`, `components/forms/`, `components/map/`.

---

## 15. Déploiement

### Premier déploiement — déclencheur
Dès que `/a/:code` est fonctionnelle sur le vrai backend (photo, instructions, carte, sur une adresse **publiée**). Le reste peut tourner sur mocks.

### Configuration Vercel
```
Framework Preset : Next.js
Build Command    : next build
```
Variables avant le premier déploiement :
```
NEXT_PUBLIC_API_URL               = https://adressebj-api.onrender.com
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = adressebj
```

### Déploiements suivants
Chaque jalon testé → commit `main` → déploiement auto. Branches `feat/*` → preview URLs.

### Vérification post-déploiement (mobile)
- `/a/:code` charge correctement (adresse publiée).
- `/carte` : surcouche s'affiche, domiciles muets, commerces en clair, filtres OK.
- Carte Leaflet sans erreur `window is not defined`.
- Application installable depuis Chrome Android, manifest valide.
- Preview WhatsApp de `/a/:code` affiche la photo (tester via opengraph.xyz).

---

## 16. Règles de travail

### Notifications push — flow de souscription
Proposé depuis `/dashboard/profile`. **Jamais de demande de permission abrupte au chargement.**
```typescript
// hooks/usePushNotifications.ts
// { isSupported, isSubscribed, subscribe, unsubscribe }
// subscribe() → explication → Notification.requestPermission() → envoi endpoint au backend
```
Deep link : `notificationclick` dans le SW, URL dans `event.notification.data.url` (définie par le backend).

### Commits
```
feat(search): unified search bar (code + Nominatim geocoding)
feat(map): public discovery map with category filters and visibility matrix
feat(address-page): five-star rating for authenticated residents
feat(dashboard): address status badges and map-discoverability toggle
feat(moderation): three-queue moderation UI (addresses, reports, contributions)
fix(map): Leaflet window is not defined via dynamic import
```
Un commit = une unité fonctionnelle testée. Chaque commit sur `main` est déployable.

### Responsive — mobile d'abord
Codé à 375px, testé à 390px, adapté desktop ensuite.

### Accessibilité minimale
`aria-label` sur interactifs sans texte ; contrastes WCAG AA (4.5:1) ; `<label>` sur tous les `<input>`.

### Ce qui ne passe pas
- Composant critique sans test.
- Couleur ou taille en dur si un token existe.
- Import Leaflet sans `dynamic` + `ssr: false`.
- Erreur API affichée telle quelle.
- Écran de chargement absent sur un fetch.
- État vide non géré.
- Suppression ou désactivation sans confirmation explicite.
- Page `/a/:code` sans og:tags.
- 404/500 par défaut Next.js.
- **Le mot « localisation » exposé à l'utilisateur** (notion strictement interne).
- **Score brut 0–100 affiché** (on affiche la moyenne /5).
- **Évaluation ou signalement ouvert sans authentification habitant.**
- **Marqueur domicile affichant un aperçu** sur la carte de découverte (doit rester muet).
