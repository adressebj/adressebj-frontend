// Types inferred from the Prisma schema documented in CDC_Backend §4 and
// the API contract surface in CDC_Backend §9. Names use the JSON shape
// returned to the frontend (camelCase, ISO date strings), not the raw DB
// types — what the network actually carries is what code consumes.

export type Role = 'CREATOR' | 'MODERATOR' | 'ADMIN';
export type VisitSource = 'WEB' | 'API';
export type RatingType = 'CONFORM' | 'NONCONFORM';
export type ApiKeyStatus = 'ACTIVE' | 'REVOKED';
export type ContributionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ReliabilityConfidence = 'none' | 'low' | 'medium' | 'high';

// Moderation lifecycle of an address — valeurs FR MAJUSCULE alignées sur le
// CDC v5 §4. `BROUILLON` = saisie en cours (avant submit) ; `EN_ATTENTE_VALIDATION` = file
// modération ; `PUBLIEE` = visible publiquement ; `REJETEE` = refus modérateur ;
// `DESACTIVEE` = retirée par le propriétaire ou un admin.
export type AddressStatus =
  | 'BROUILLON'
  | 'EN_ATTENTE_VALIDATION'
  | 'PUBLIEE'
  | 'REJETEE'
  | 'DESACTIVEE';

export interface ApiEnvelope<T> {
  data: T;
  meta?: {
    timestamp?: string;
    total?: number;
    page?: number;
    limit?: number;
  };
}

export interface ApiErrorPayload {
  statusCode: number;
  error?: string;
  code: string;
  message?: string;
  address_code?: string;
  deactivated_at?: string;
}

export interface User {
  id: string;
  phone: string;
  email: string | null;
  firstName?: string | null;
  lastName?: string | null;
  role: Role;
  createdAt: string;
  updatedAt?: string;
}

// Découpage territorial — quartiers et arrondissements importés depuis
// OpenStreetMap via l'API Overpass à l'initialisation du backend (CDC
// Backend §3 et §12). Le préfixe (3 lettres majuscules) sert à construire
// le code adresse au format AAA-XXXX.
export interface Quartier {
  id: string;
  name: string;
  prefix: string;
  polygon?: GeoJsonPolygon | null;
  isActive: boolean;
  createdAt?: string;
}

export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface AddressInstructions {
  steps: string[];
  assembledText: string;
}

export interface AddressCoordinates {
  lat: number;
  lng: number;
}

// Public visitor payload — GET /api/v1/addresses/:code
// Instructions are nested to match the storage shape used through the rest
// of the app (CDC_General §4 + OwnerAddress); a small adapter flattens or
// unflattens at the API boundary.
export interface PublicAddress {
  code: string;
  quartier: Pick<Quartier, 'name' | 'prefix'> & { id?: string };
  /** Catégorie obligatoire de l'adresse (CDC v5 §4 — 8 enums). Effet
      visible sur la carte publique : DOMICILE = marqueur muet. */
  category: AddressCategory;
  gps: AddressCoordinates;
  photoUrl: string;
  instructions: AddressInstructions;
  /** Score composite 0-100 calculé en backend (CDC §III.2.3 formule
      pondérée notes/visites/âge/signalements). Sert au calcul de la
      fiabilité affichée — JAMAIS rendu brut côté visiteur. */
  reliabilityScore: number | null;
  /** Moyenne arithmétique des notes 1-5 laissées par les visiteurs.
      Affichée dans ReliabilityBadge au format "X,Y/5". */
  averageRating: number | null;
  /** Nombre d'évaluations 1-5 (étoiles) qui ont nourri averageRating. */
  ratingCount: number;
  visitCount: number;
  isActive: boolean;
  /** Adresse opt-out de la découverte sur /carte (CDC v5 §6 toggle
      propriétaire). Si false → invisible même si non-DOMICILE. */
  mapDiscoverable: boolean;
  /** Note 1-5 laissée par l'utilisateur courant (null si non noté ou
      anonyme). Permet le « upsert » de notes sans localStorage. */
  myRating: number | null;
  /** État du cycle de vie — renseigné pour la **vue propriétaire** uniquement
      (une adresse non publiée n'est pas exposée au public). Absent (= publiée)
      sur la vue visiteur. Permet d'afficher le bandeau « en cours d'analyse »
      et de bloquer les actions qui exigent une adresse validée. */
  status?: AddressStatus;
  createdAt: string;
}

// Les 8 catégories du CDC v5 §4. Aussi exposées via `lib/categories.ts`
// pour les libellés FR + icônes ; ce type est l'autorité du contrat API.
export type AddressCategory =
  | 'DOMICILE'
  | 'COMMERCE'
  | 'RESTAURATION'
  | 'SANTE'
  | 'EDUCATION'
  | 'ADMINISTRATION'
  | 'LOISIR'
  | 'AUTRE';

// Owner dashboard payload — used when listing user's own addresses.
export interface OwnerAddress {
  code: string;
  quartierId: string;
  quartier?: Quartier;
  /** Catégorie obligatoire (CDC v5 §4). */
  category: AddressCategory;
  gps: AddressCoordinates;
  coordinates?: AddressCoordinates;
  photoUrl: string;
  instructions: AddressInstructions;
  reliabilityScore: number | null;
  /** Moyenne des notes 1-5 (CDC §4 ReliabilityBadge). */
  averageRating: number | null;
  ratingCount: number;
  visitCount: number;
  isActive: boolean;
  status: AddressStatus;
  /** Toggle opt-out de la découverte publique (CDC v5 §6). Indépendant de
      `category` : un commerce peut être public sans figurer sur /carte. */
  mapDiscoverable: boolean;
  /** Identifiant de la révision actuellement publiée (CDC v5 §4 — Address
      vs AddressRevision). Permet d'afficher « v2 », « v3 » dans l'UI sans
      recharger l'historique. */
  currentRevisionId?: string;
  /** Historique versionné — chargé via GET /addresses/:code/revisions et
      attaché par l'API mock à la vue propriétaire. La révision la plus
      récente est en tête de tableau. */
  revisions?: AddressRevision[];
  createdAt: string;
  updatedAt?: string;
  deactivatedAt?: string | null;
}

// ─── Versioning d'adresse (CDC v5 §4 + CDC Frontend §10) ────────────────────
//
// Identité stable (code, quartier, owner) sur `OwnerAddress` ; contenu modifiable
// (photo, GPS, instructions, catégorie) snapshoté à chaque édition validée.
// `source` trace l'origine de la révision pour la modération a posteriori.

export type AddressRevisionSource =
  | 'CREATION' // 1ère révision posée à la création de l'adresse
  | 'OWNER_EDIT' // édition par le propriétaire depuis /dashboard
  | 'PROPOSAL_ACCEPTED'; // proposition visiteur acceptée par un modérateur

export interface AddressRevision {
  id: string;
  /** Numéro incrémental affiché à l'humain (1, 2, 3…). */
  version: number;
  /** Snapshot du contenu à cette révision. */
  category: AddressCategory;
  gps: AddressCoordinates;
  photoUrl: string;
  instructions: AddressInstructions;
  source: AddressRevisionSource;
  /** Téléphone masqué de l'auteur (CDC §RGPD — jamais le numéro brut). */
  authorPhoneMasked: string;
  /** Commentaire optionnel laissé par l'auteur (édition) ou le modérateur
      (proposition acceptée). */
  comment?: string | null;
  createdAt: string;
}

// Used to compose API responses on create.
export interface CreatedAddress {
  code: string;
  assembledText: string;
  shareUrl: string;
  whatsappUrl: string;
}

export interface CreateAddressInput {
  /** Catégorie obligatoire à la création (CDC v5 §4). Backend rejette
      avec `CATEGORY_REQUIRED` (400) si absente. */
  category: AddressCategory;
  steps: string[];
  /** Le quartier est dérivé du GPS côté backend (rattachement automatique,
      CDC v5 §Besoin 1). L'habitant ne choisit jamais sa zone — aucun
      `quartierId` n'est transmis. */
  gpsLat: number;
  gpsLng: number;
  photoUrl: string;
}

/** Repère connu avoisinant proposé comme point de départ des instructions
    (CDC v5 §Besoin 1 + §Overpass). Servi par l'endpoint interne
    `/internal/nearby-landmark` (hors contrat public `/api/v1/`). */
export interface NearbyLandmark {
  name: string;
  category?: string;
  lat: number;
  lng: number;
  /** Distance au point GPS de l'habitant, en mètres. */
  distanceM: number;
}

export interface UpdateAddressInput {
  steps?: string[];
  gpsLat?: number;
  gpsLng?: number;
  photoUrl?: string;
}

export interface Visit {
  id: string;
  addressId: string;
  departAt: string;
  arrivedAt: string | null;
  source: VisitSource;
  finalPrice?: number | null;
  createdAt: string;
}

export interface VisitConfirmInput {
  addressCode: string;
  departAt: string;
  arrivedAt: string;
  finalPrice?: number;
}

// CDC Backend §9 — POST /visits/start : marque le début de navigation pour
// pouvoir mesurer la durée réelle au moment de POST /visits/confirm.
export interface VisitStartInput {
  addressCode: string;
  startedAt: string;
}

export interface VisitStartResponse {
  visitId: string;
  startedAt: string;
}

// CDC v5 §8 — note 1-5 idempotente par utilisateur. Le backend remplace la
// précédente note si l'utilisateur évalue à nouveau (upsert).
export interface RatingUpsertInput {
  score: 1 | 2 | 3 | 4 | 5;
}

export interface RatingUpsertResponse {
  addressCode: string;
  score: number;
  newAverage: number | null;
  ratingCount: number;
}

// FieldNotes — observations terrain libres laissées par un visiteur après
// arrivée (CDC Frontend §11 « notes terrain »). Distinct des contributions
// structurées (sens / côté entrée) et des propositions de modification.
export interface FieldNote {
  id: string;
  addressCode: string;
  message: string;
  authorPhoneMasked: string;
  createdAt: string;
}

export interface CreateFieldNoteInput {
  message: string;
}

export interface Rating {
  id: string;
  addressId: string;
  type: RatingType;
  createdAt: string;
}

export interface Report {
  id: string;
  addressId: string;
  message?: string | null;
  resolved: boolean;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  key: string;
  label: string;
  status: ApiKeyStatus;
  expiresAt?: string | null;
  createdAt: string;
  revokedAt?: string | null;
}

export interface Contribution {
  id: string;
  addressId: string;
  addressCode?: string;
  direction?: string | null;
  entrySide?: string | null;
  status: ContributionStatus;
  reviewedAt?: string | null;
  createdAt: string;
}

export interface ReliabilityVerification {
  code: string;
  reliabilityScore: number;
  visitCount: number;
  isActive: boolean;
}

export interface EtaEstimate {
  estimatedMinutes: number | null;
  confidence: ReliabilityConfidence;
  basedOnVisits: number;
  message?: string;
}

export interface QuartierAnalytics {
  quartierId: string;
  quartierName: string;
  totalVisits: number;
  medianEtaMinutes: number;
  medianPriceFCFA: number;
  peakHours: string[];
  successRate: number;
  period: string;
}

export interface CloudinarySignature {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
  transformation: string;
}

// Inscription Habitant — téléphone béninois + courriel + mot de passe ; le
// backend envoie un OTP par SMS pour vérifier le numéro. Le compte est
// définitivement créé après vérification du code.
export interface AuthRegisterInput {
  phone: string;
  email: string;
  password: string;
}

export interface AuthRequestOtpInput {
  phone: string;
}

export interface AuthVerifyOtpInput {
  phone: string;
  code: string;
}

// Connexion Habitant — téléphone + mot de passe (pas d'OTP au login, le
// numéro est déjà vérifié par l'inscription).
export interface HabitantLoginInput {
  phone: string;
  password: string;
}

// Email + password — connexion Modérateur / Administrateur via /login.
export interface AdminAuthInput {
  email: string;
  password: string;
}

// Flow réinitialisation mot de passe back-office (email → token → reset).
export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}

// Flow de changement de numéro de téléphone Habitant (/dashboard/profile).
export interface PhoneChangeRequestInput {
  newPhone: string;
}

export interface PhoneChangeConfirmInput {
  newPhone: string;
  code: string;
}

// ─── Carte publique de découverte (/carte) ─────────────────────────────────
//
// CDC Backend §11 : `GET /map/addresses?bbox=west,south,east,north&categories=...`
// retourne les adresses PUBLIEE + mapDiscoverable dans la bbox. Le backend
// applique la matrice de visibilité : DOMICILE → `muted: true, preview: null`
// pour ne jamais exposer photo/code. Les autres catégories → `muted: false`
// avec un aperçu `{ photoUrl, quartierName }` cliquable.

// Alias historique — pendant la mise en conformité CDC on n'a qu'un seul
// jeu de catégories (AddressCategory). On garde l'export pour ne pas
// casser les imports en place côté mocks/components.
export type DiscoveryCategory = AddressCategory;

export interface DiscoveryItem {
  code: string;
  lat: number;
  lng: number;
  category: AddressCategory;
  /** Si vrai, marqueur muet (DOMICILE). Aucun aperçu, clic = nav directe. */
  muted: boolean;
  /** Aperçu présent uniquement si `muted: false`. */
  preview: {
    photoUrl: string;
    quartierName: string;
  } | null;
}

// ─── Notifications utilisateur ─────────────────────────────────────────────

export type NotificationKind =
  | 'address_validated'
  | 'address_rejected'
  | 'address_disabled'
  | 'report_received'
  | 'contribution_received'
  | 'system';

export interface Notification {
  id: string;
  kind: NotificationKind;
  message: string;
  /** Code adresse cliquable si la notif s'y rapporte. */
  addressCode?: string | null;
  read: boolean;
  createdAt: string;
}

export interface AuthTokenResponse {
  accessToken: string;
  user: Pick<User, 'id' | 'phone' | 'email' | 'role'>;
}

export interface JwtPayload {
  sub: string;
  phone: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export interface PushSubscriptionInput {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// ─── Admin: habitants, moderators, moderation queue ─────────────────────────

export type HabitantStatus = 'verified' | 'unverified' | 'disabled';

export interface AdminHabitant {
  id: string;
  phone: string;
  email: string | null;
  status: HabitantStatus;
  addressCount: number;
  reportsAgainstCount: number;
  createdAt: string;
  lastSeenAt?: string | null;
}

export interface AdminHabitantDetail extends AdminHabitant {
  addresses: Array<{
    code: string;
    quartierName: string;
    status: AddressStatus;
    createdAt: string;
  }>;
  timeline: Array<{
    id: string;
    label: string;
    occurredAt: string;
    tone: 'neutral' | 'success' | 'warning' | 'danger';
  }>;
}

export type ModeratorStatus = 'active' | 'suspended';

export interface AdminModerator {
  id: string;
  phone: string;
  email: string | null;
  status: ModeratorStatus;
  decisionsCount: number;
  approvalRate: number;
  createdAt: string;
  lastActiveAt?: string | null;
}

// One pending address in the moderation queue. Distinct from the moderation
// of *reports* and *contributions* — covers fresh submissions only.
export interface ModerationQueueItem {
  code: string;
  quartierName: string;
  ownerPhoneMasked: string;
  submittedAt: string;
  gps: AddressCoordinates;
  gpsAccuracyMeters: number;
  photoUrl: string;
  assembledText: string;
  steps: string[];
  isFresh: boolean;
}

export interface ModerationStats {
  pendingAddresses: number;
  pendingReports: number;
  pendingContributions: number;
}

export interface ModerationDecisionInput {
  status: 'approved' | 'rejected';
  reason?: string | null;
}

export interface AdminAddressDetail {
  address: PublicAddress;
  ownerPhoneMasked: string;
  reports: Report[];
  isActive: boolean;
}
