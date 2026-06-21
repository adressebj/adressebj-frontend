# Refonte premium des interfaces d'authentification + découplage back-office

> Branche `redesign/repere` · 2026-06-21
> Surfaces : `/auth` (habitant), back-office auth (déplacé sous `/admin/*`)

## Contexte & objectif

Refonte UI **et** UX premium des écrans d'authentification, **découplage total
du back-office** (les habitants/visiteurs ne doivent jamais apprendre son
existence ; route dédiée), et **implémentation du flow complet de mot de passe
oublié habitant** + des interfaces/étapes manquantes.

### État actuel

- `/auth` (habitant) : machine `mode (login|register) × step (form|OTP)`.
  Login = téléphone + mot de passe ; register = téléphone + email + mot de passe
  → OTP. **Aucun mot de passe oublié habitant.** Expose le back-office (lien
  « Espace modérateur/admin → Connexion back-office », `auth/page.tsx:563-565`).
- Back-office : `/login` (email+password → `/admin`), `/forgot-password` (email
  → lien). Routes top-level génériques, liées depuis/vers `/auth`. **Pas de page
  `reset-password`** (landing du lien email).
- Garde admin redirige les non-authentifiés vers `/login`
  (`useRequireAdmin.ts:27`, `AdminShell.tsx:119`).
- API mock : habitant `register`/`request-otp`/`verify-otp`/`login` ; back-office
  `admin/login`/`admin/forgot-password`/`admin/reset-password`. Helpers
  `api.adminForgotPassword`/`api.adminResetPassword` présents.

### Décisions validées

1. Back-office → namespace dédié **`/admin/login`**, `/admin/forgot-password`,
   `/admin/reset-password`. Anciennes `/login` + `/forgot-password`
   **supprimées** (pas de redirection 301).
2. Reset habitant **intégré dans `/auth`** comme 3ᵉ mode, **auto-connexion** à
   la fin.
3. Direction premium **split-screen desktop** (panneau marque + formulaire),
   colonne unique mobile. Back-office volontairement **sobre** (pas de panneau
   marketing).

## Architecture

### Routage & découplage

| Avant | Après | Action |
| --- | --- | --- |
| `/login` | `/admin/login` | déplacer + supprimer l'ancienne |
| `/forgot-password` | `/admin/forgot-password` | déplacer + supprimer l'ancienne |
| — | `/admin/reset-password` | **créer** (landing `?token=`) |
| `/auth` | `/auth` | refonte + 3ᵉ mode reset |

- **Routes `/admin/*` d'auth publiques** : `AdminShell` (client, déjà sur
  `usePathname`) ajoute une exception `isAuthRoute` (regex
  `^/admin/(login|forgot-password|reset-password)$`) → rend `{children}` **nus**
  (sans shell, sans garde, sans redirection), exactement comme l'exception
  `/print` du `dashboard/layout.tsx`. Le layout admin reste inchangé.
- **Redirection de garde** : `AdminShell.tsx:119` et `useRequireAdmin.ts:27`
  passent de `/login` à `/admin/login`.
- **Étanchéité** : suppression du bloc « Espace modérateur/admin » de
  `/auth` ; suppression du lien « Espace Habitant » du back-office login.
  `forgot-password` back-office lie vers `/admin/login`. Aucune surface habitant
  ne référence `/admin/*`.

### Habitant `/auth`

**Layout split-screen** (`src/app/auth/page.tsx` + composants extraits) :
- Desktop `lg+` : grille 2 colonnes. Gauche = `AuthBrandPanel` (panneau marque
  immersif : `motif-paper`/lueurs ambiantes, logo, promesse produit ; surfaces
  solides, **zéro glassmorphisme**). Droite = colonne formulaire centrée
  (`max-w` lisible).
- Mobile : colonne unique ; marque condensée en en-tête (logo + tagline courte),
  formulaire dessous.

**Machine à états** : `mode: 'login' | 'register' | 'reset'`, `step: 'form' | 'otp'`.
- **Login** : téléphone + mot de passe. Lien **« Mot de passe oublié ? »** →
  `mode = 'reset'`. Bascule Connexion/Inscription conservée.
- **Register** : inchangé fonctionnellement (téléphone + email + mot de passe →
  OTP → compte créé + connecté), re-stylé.
- **Reset (nouveau)** :
  1. `step=form` : saisie du **téléphone** → `api.forgotPasswordHabitant(phone)`
     envoie un OTP (mock `123456`).
  2. `step=otp` : **OTP** + **nouveau mot de passe** (≥ 8) →
     `api.resetPasswordHabitant(phone, code, password)` → vérifie l'OTP, change
     le mot de passe, **retourne le JWT** → `login(token)` → `router.push` vers
     `redirect` ou `/dashboard`.

**UX premium** : transitions `animate-step-in` entre modes/étapes ; validation
inline ; erreurs près des champs en `role="alert"`/`aria-live` ; états de
chargement sur les boutons ; **toggle voir/masquer** mot de passe ; **focus géré**
au changement d'étape (focus le 1ᵉʳ champ) ; format téléphone béninois
(`isValidBeninPhone`, `maskPhone` pour l'écran OTP) ; `OtpInput` existant.

**Décomposition** (le fichier fait ~590 lignes, +reset) :
- `src/components/auth/AuthBrandPanel.tsx` — panneau marque (présentation pure).
- `src/components/auth/AuthShell.tsx` — layout split-screen responsive
  (brand panel + slot formulaire).
- `src/app/auth/page.tsx` — machine à états + formulaires, dans `AuthShell`.

### Back-office auth (sobre)

- `src/app/admin/login/page.tsx` (depuis `app/login/page.tsx`) — email + mot de
  passe → `/admin`. Sans lien habitant. Lien « Mot de passe oublié ? » →
  `/admin/forgot-password`.
- `src/app/admin/forgot-password/page.tsx` (depuis `app/forgot-password`) —
  email → `api.adminForgotPassword`. « Retour » → `/admin/login`.
- `src/app/admin/reset-password/page.tsx` (**nouveau**) — lit `?token=` (via
  `useSearchParams`, sous `Suspense` avec fallback **visible**, pas un `<main>`
  vide), nouveau mot de passe → `api.adminResetPassword(token, password)` →
  succès → `/admin/login`. États : token manquant/invalide, succès.
- Design : carte centrée nette, design system, **pas** le panneau split-screen
  marketing. Finition premium, ton utilitaire « outil interne ».

### API / mock (`src/lib/api.ts`, `src/mocks/data.ts`)

Ajouts habitant (réplique route réelle + mock + erreurs cohérentes) :
- `POST /auth/forgot-password {phone}` → si le compte existe, (mock) envoie un
  OTP ; réponse **non-énumérante** `{ message, expiresIn }` (toujours 200, ne
  révèle pas si le numéro existe). Mock : pose le même OTP `123456`.
- `POST /auth/reset-password {phone, code, password}` → OTP invalide →
  `ApiError(400, 'OTP_INVALID')` ; mot de passe < 8 →
  `ApiError(400, 'PASSWORD_TOO_SHORT')` ; succès → met à jour le mot de passe du
  compte mock + retourne `AuthTokenResponse` (auto-login).
- Helpers : `api.forgotPasswordHabitant(phone)`,
  `api.resetPasswordHabitant(phone, code, password)`.

Back-office : `api.adminResetPassword(token, password)` déjà présent ; le mock
`/auth/admin/reset-password` renvoie déjà `{ reset: true }`.

## États & erreurs

- Téléphone invalide → message sous le champ. OTP incorrect/expiré → message.
  Mot de passe trop court → message. Compte désactivé (login) → message dédié.
  Erreur réseau → toast générique. Aucune énumération de comptes sur le reset.

## Tests

- `src/app/auth/__tests__/page.test.tsx` (mise à jour + ajouts) :
  - Login OK ; Register → OTP → connecté ; **Reset : téléphone → OTP + nouveau
    mot de passe → connecté**.
  - **Aucun lien/texte « back-office » / « /admin/login » / « modérateur » sur
    `/auth`** (assertion d'étanchéité).
- Back-office : `admin/login` (login + redirect), `admin/forgot-password`,
  `admin/reset-password` (token → succès, token manquant → message).
- Garde : non-authentifié sur une page admin protégée → `router.replace` vers
  **`/admin/login`** (mettre à jour les tests de garde existants).
- Mock : `forgotPasswordHabitant` ne révèle pas l'existence ; `resetPasswordHabitant`
  OTP faux → erreur, OK → token + mot de passe changé (le nouveau login marche).

## Contraintes & garde-fous

- Direction « Repère » : surfaces papier solides, bords nets, ombres chaudes,
  accent or, **zéro glassmorphisme**, pas d'AI-slop.
- React Compiler ON : pas de `useMemo`/`useCallback` ajoutés à la main pour la
  perf.
- Tailwind v4 : tokens du design system uniquement, aucune couleur en dur (sauf
  le drapeau béninois décoratif déjà présent, à conserver/raffiner dans le brand
  panel s'il est gardé).
- French partout. A11y : labels, focus management, `aria-live` erreurs, toggles
  mot de passe accessibles, `Suspense` fallbacks visibles (jamais de `<main>`
  vide).
- Périmètre commit : fichiers redesign uniquement ; ne pas committer les `.md`
  de cahier des charges.
- **Étanchéité vérifiée** : `grep` final → aucune surface habitant ne
  référence `/admin/login` ni « back-office ».
