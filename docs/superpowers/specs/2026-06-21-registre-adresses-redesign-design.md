# Refonte du registre d'adresses — « Adresse héros »

> Branche `redesign/repere` · Phase 3 (Dashboard habitant) · 2026-06-21
> Page concernée : `/dashboard` (`src/app/dashboard/page.tsx`)

## Contexte & objectif

Élever la page registre d'adresses du dashboard habitant au niveau de la
direction « Repère », pour desktop **et** mobile. La page actuelle (en-tête
éditorial + bandeau de stats agrégées + carte d'aperçu + grille de cartes
`OwnerAddressCard`) est calibrée pour un volume moyen-élevé d'adresses.

### Décisions produit (cadrage)

1. **Volume réaliste : 1-3 adresses, cas dominant 1-2.** La grille de cartes est
   surdimensionnée et paraît vide à 1 adresse. → Chaque adresse devient un
   **objet héros** pleine largeur, pas une vignette de grille.
2. **Job n°1 : équilibre partage + suivi.** Chaque adresse doit montrer son
   **statut d'un coup d'œil** ET offrir le **partage inline**, les deux en
   première classe.
3. **Direction de layout : « Adresse héros »** (panneaux empilés pleine
   largeur), retenue contre « carte vivante + liste » (trop de chrome à bas
   volume) et « registre raffiné » (pas assez de saut qualitatif).
4. **Actions inline : Partager (primaire) + Copier le code + menu ⋯.**
5. **Identité visuelle du panneau : photo du portail** (reconnaissance
   instantanée). La carte signature globale (tous les pins) est **conservée**
   en haut comme moment de marque ; le média de chaque panneau reste la photo.

## Périmètre

**Inclus** : refonte de `src/app/dashboard/page.tsx` et de ses sous-composants
de liste ; renommage navbar « Adresses » → « Mes adresses » (déjà fait).

**Exclus** : la fiche détail `OwnerAddressView` (déjà refondue), les pages
`/edit`, `/share`, `/print`, `/new`, le profil, les notifications, l'admin.

## Architecture

### Structure de page (`DashboardPage`)

```
Header éditorial      (eyebrow greeting · « Mes adresses » · sous-titre)  [+ Créer (desktop)]
Carte signature       (RegistreMap, tous les pins, pleine largeur)
──────────────────────────────────────────────
OwnerAddressPanel #1  (objet héros pleine largeur)
OwnerAddressPanel #2
OwnerAddressPanel #3
CreateAddressCTA      (bande slim pleine largeur en fin de pile)
                                                              FAB mobile (+)
```

### Composants

| Composant | Action | Détail |
| --- | --- | --- |
| `OwnerAddressPanel` | **Créer** (`src/components/dashboard/OwnerAddressPanel.tsx`) | Remplace `OwnerAddressCard` comme unité de liste. |
| `OwnerAddressCard` | **Supprimer** | Utilisé uniquement par `dashboard/page.tsx`. |
| `RegistreOverview` | **Supprimer** | Bandeau stats agrégées, utilisé uniquement par `dashboard/page.tsx`, sans valeur à bas volume. |
| `RegistreMap` | **Conserver** | Carte d'aperçu signature en haut. Raffinée (hauteur responsive). |
| `ShareButton` | **Réutiliser** | Bouton « Partager » : Web Share natif sur mobile, fallback presse-papier + toast. URL = `/a/[code]` publique (origin absolue). |
| `AddressCodeDisplay` | **Réutiliser** | Code mono signature + bouton « Copier » intégré (✓). Couvre « Copier le code ». |
| `AddressStatusBadge` | **Réutiliser** | Statut de modération en surimpression photo. |
| `CategoryMedallion` | **Réutiliser** | Losange Fon signature en surimpression photo. |

> `RatingSummary` est un **bloc encadré** (réservé à la fiche détail). Sur le
> panneau, la performance est une **ligne compacte** (★ note · 👣 visites),
> pas le bloc complet — sinon le panneau devient trop lourd.

## Anatomie de `OwnerAddressPanel`

**Props** : `{ address: OwnerAddress; className?: string }`.

**Desktop = horizontal** · **Mobile = empilé** (photo en bannière, corps
dessous, actions en ligne pleine largeur).

### Média (gauche desktop ~16rem / bannière mobile)
- Photo du portail (`address.photoUrl`, `next/image` `unoptimized` comme
  l'existant), `object-cover`, zoom doux au survol.
- En surimpression : `AddressStatusBadge` (coin haut-gauche) +
  `CategoryMedallion` (coin bas).
- La photo **et** le code sont des liens vers `/dashboard/address/[code]`.
  ⚠️ Le panneau n'est **plus** un `<Link>` global (boutons d'action imbriqués
  interdits) : ce sont des zones cliquables distinctes.

### Corps
- **Code** : `AddressCodeDisplay` (taille `md`, `showCopyButton`) → satisfait
  « Copier le code ».
- **Quartier** : 📍 + `address.quartier?.name ?? 'Quartier inconnu'`.
- **Performance compacte** : si noté → ★ (or) `averageRating` (virgule FR) ·
  👣 `visitCount` ; sinon « Pas encore notée » + visites.
- **Rangée d'actions** :
  - `[Partager]` — primaire vert, `ShareButton` vers l'URL publique. **Désactivé
    si le statut n'est pas `PUBLIEE`** (cf. états).
  - `[⋯]` — menu déroulant accessible (`role="menu"`, fermeture clic
    extérieur + Échap, calqué sur le menu avatar de la navbar) :
    - Voir la fiche → `/dashboard/address/[code]`
    - Aperçu visiteur → `/a/[code]`
    - Modifier → `/dashboard/address/[code]/edit`
    - QR / Imprimer → `/dashboard/address/[code]/print`

## États par statut (`address.status`)

| Statut | Traitement |
| --- | --- |
| `PUBLIEE` | Partage actif ; performance affichée ; accent vert. |
| `EN_ATTENTE_VALIDATION` | Statut mis en avant ; **partage désactivé** + mention « Bientôt partageable » (la fiche publique n'est pas live → ne pas inviter à partager un lien mort). |
| `REJETEE` | Raison de rejet (si dispo) + CTA **Modifier** proéminent ; partage désactivé. |
| Désactivée (`isActive === false`) | Panneau en sourdine + CTA réactiver (via fiche détail) ; partage désactivé. |

> Les valeurs exactes de `AddressStatus` sont à confirmer dans
> `src/types/api.ts` au moment de l'implémentation ; le statut « rejetée » est
> traité s'il existe, sinon ignoré sans régression.

## Carte signature (haut de page)

`RegistreMap` conservée, pleine largeur, **hauteur responsive** (~`h-44`
mobile / `h-56` desktop), bords arrondis, ombre douce. À 1 pin, reste un
moment de marque cohérent.

## Responsive

- **Mobile** : header empilé ; carte `h-44` ; panneaux empilés pleine largeur
  (photo bannière + corps + actions pleine largeur) ; FAB `+` conservé.
- **Desktop** : header avec bouton « Créer » à droite ; panneaux horizontaux
  (média gauche, corps droite, actions alignées à droite) ; pas de FAB (le CTA
  de fin de pile + le bouton header suffisent).

## États de page (`DashboardPage`)

| État | Traitement |
| --- | --- |
| `loading` | Skeleton calé sur le **nouveau** layout (carte + panneaux empilés). |
| `error` | Carte d'erreur + bouton « Réessayer » (inchangé). |
| `suspended` | Sortie de garde plein écran (inchangée). |
| `ok` + 0 adresse | `EmptyRegistre` raffiné (inchangé sur le fond). |
| `ok` + N adresses | Carte signature + pile de panneaux + CTA créer. |

## Tests (TDD)

Aucun test n'existe actuellement sur `dashboard/page.tsx`.

1. **`OwnerAddressPanel`** (nouveau test) :
   - Rend le code, le quartier, le statut.
   - « Copier le code » présent.
   - « Partager » présent et **actif** si `PUBLIEE`.
   - « Partager » **désactivé** + « Bientôt partageable » si `EN_ATTENTE_VALIDATION`.
   - Menu ⋯ : ouverture, items présents (Modifier, QR/Imprimer, Aperçu visiteur),
     fermeture Échap.
   - La photo et le code lient vers `/dashboard/address/[code]`.
2. **`DashboardPage`** (nouveau test léger) :
   - État `ok` : liste les panneaux + CTA créer.
   - État `loading` : `aria-busy`.
   - État `ok` vide : `EmptyRegistre`.
   - (États `error`/`suspended` : couverture minimale, déjà robustes.)

`CategoryMedallion`, `RatingSummary`, `ShareButton`, `AddressCodeDisplay`,
`AddressStatusBadge` sont déjà testés/éprouvés ailleurs — pas de re-test.

## Contraintes & garde-fous

- **Direction « Repère »** : surfaces papier solides, bords nets, ombres
  chaudes. **Zéro glassmorphisme** (banni). Pas d'AI-slop.
- **React Compiler activé** : pas de `useMemo`/`useCallback` ajoutés à la main.
- **Tailwind v4** : tokens du design system (`globals.css`), pas de couleurs en
  dur — réutiliser les classes existantes (`bg-canvas-deep`, `text-accent`,
  `card`, `tap-press`, `animate-fade-up`, etc.).
- **A11y** : menu ⋯ clavier-navigable (Échap, focus), libellés `aria`, états
  désactivés explicites (pas seulement visuels).
- **Périmètre commit** : ne toucher que les fichiers du redesign ; ne pas
  committer les `.md` de cahier des charges modifiés en working-tree.
