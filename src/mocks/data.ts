import type {
  AddressRevision,
  AdminHabitant,
  AdminHabitantDetail,
  AdminModerator,
  ApiKey,
  Contribution,
  DiscoveryCategory,
  DiscoveryItem,
  ModerationQueueItem,
  ModerationStats,
  Notification,
  OwnerAddress,
  PublicAddress,
  Quartier,
  Report,
  User,
} from '@/types/api';

// Polygones rectangulaires approximatifs autour des quartiers de
// Cotonou — suffisants pour démontrer la validation de quartier à Step 2 GPS
// en mode mock. En production, ces géométries sont importées via l'API
// Overpass (OpenStreetMap) à l'initialisation du backend (CDC Backend §12).
export const quartiers: Quartier[] = [
  {
    id: 'quartier_akp',
    name: 'Akpakpa',
    prefix: 'AKP',
    isActive: true,
    createdAt: '2026-01-12T08:00:00Z',
    polygon: {
      type: 'Polygon',
      coordinates: [
        [
          [2.4150, 6.3600],
          [2.4400, 6.3600],
          [2.4400, 6.3800],
          [2.4150, 6.3800],
          [2.4150, 6.3600],
        ],
      ],
    },
  },
  {
    id: 'quartier_cad',
    name: 'Cadjèhoun',
    prefix: 'CAD',
    isActive: true,
    createdAt: '2026-01-12T08:00:00Z',
    polygon: {
      type: 'Polygon',
      coordinates: [
        [
          [2.3850, 6.3550],
          [2.4000, 6.3550],
          [2.4000, 6.3700],
          [2.3850, 6.3700],
          [2.3850, 6.3550],
        ],
      ],
    },
  },
  {
    id: 'quartier_fid',
    name: 'Fidjrossè',
    prefix: 'FID',
    isActive: true,
    createdAt: '2026-01-12T08:00:00Z',
    polygon: {
      type: 'Polygon',
      coordinates: [
        [
          [2.3700, 6.3500],
          [2.3850, 6.3500],
          [2.3850, 6.3650],
          [2.3700, 6.3650],
          [2.3700, 6.3500],
        ],
      ],
    },
  },
  {
    id: 'quartier_ggn',
    name: 'Godomey-Calavi',
    prefix: 'GDM',
    isActive: true,
    createdAt: '2026-01-12T08:00:00Z',
  },
  // ─── Quartiers réels de la commune de Sèmè-Kpodji ───────────────────
  // Arrondissements officiels d'après le Ministère de la Décentralisation.
  // Ces deux quartiers permettent de tester la validation hors-quartier à Step 2
  // GPS : la position du dev (6.3830947, 2.5208339) tombe dans
  // Agblangandan ; si l'utilisateur choisit Ekpè PK10 à Step 1, son GPS
  // sera détecté hors zone et déclenchera la bannière d'avertissement.

  // Arrondissement d'Agblangandan — contient la position du dev (Entrepôt
  // PK10 est référencé côté Agblangandan sur mapcarta). ±0.005° autour
  // de la position → polygone ≈ 1.1 km × 1.1 km.
  {
    id: 'quartier_agb',
    name: 'Agblangandan',
    prefix: 'AGB',
    isActive: true,
    createdAt: '2026-06-11T08:00:00Z',
    polygon: {
      type: 'Polygon',
      coordinates: [
        [
          [2.5158, 6.3781],
          [2.5258, 6.3781],
          [2.5258, 6.3881],
          [2.5158, 6.3881],
          [2.5158, 6.3781],
        ],
      ],
    },
  },
  // Arrondissement d'Ekpè — quartier Ekpè Kp10 (PK10), voisin à l'est
  // d'Agblangandan le long de la route Cotonou ↔ Porto-Novo. Polygone
  // adjacent (frontière en lng 2.5258), même bande latitudinale.
  {
    id: 'quartier_ekp',
    name: 'Ekpè PK10',
    prefix: 'EKP',
    isActive: true,
    createdAt: '2026-06-11T08:00:00Z',
    polygon: {
      type: 'Polygon',
      coordinates: [
        [
          [2.5258, 6.3781],
          [2.5358, 6.3781],
          [2.5358, 6.3881],
          [2.5258, 6.3881],
          [2.5258, 6.3781],
        ],
      ],
    },
  },
  {
    id: 'quartier_kdj',
    name: 'Kindonou',
    prefix: 'KDJ',
    isActive: false,
    createdAt: '2026-02-01T08:00:00Z',
  },
];

// Repères connus (POI) — synthétiques pour le mock. En production le backend
// les sert via Overpass (POI OSM proches du GPS), endpoint interne
// `/internal/nearby-landmark` (CDC v5 §Besoin 1 + §Overpass). Placés dans les
// polygones des quartiers de démo ; celui d'Agblangandan est tout proche de la
// position réelle d'un dev sur place, pour démontrer le cas « repère trouvé ».
export const landmarks: Array<{
  name: string;
  category: string;
  lat: number;
  lng: number;
}> = [
  // Agblangandan (autour de la position dev 6.3831 / 2.5208)
  { name: 'Station-service PK10', category: 'Station', lat: 6.3832, lng: 2.5210 },
  { name: 'Pharmacie d’Agblangandan', category: 'Pharmacie', lat: 6.3825, lng: 2.5201 },
  // Akpakpa
  { name: 'Marché Dantokpa', category: 'Marché', lat: 6.3660, lng: 2.4300 },
  { name: 'Pharmacie Les Potiers', category: 'Pharmacie', lat: 6.3705, lng: 2.4252 },
  // Cadjèhoun
  { name: 'Carrefour Cadjèhoun', category: 'Repère', lat: 6.3625, lng: 2.3925 },
  // Fidjrossè
  { name: 'Église Saint-Michel', category: 'Édifice', lat: 6.3575, lng: 2.3780 },
];

export const user: User = {
  id: 'user_demo',
  phone: '+22960000000',
  email: 'demo@adressebj.bj',
  firstName: 'Primaël',
  lastName: 'BANKOLE',
  role: 'CREATOR',
  createdAt: '2026-02-15T10:00:00Z',
};

// Comptes Habitant — téléphone + email + mot de passe (CDC v5 §3 révisé).
// L'OTP n'intervient qu'à l'inscription pour vérifier le numéro ; la
// connexion ultérieure se fait par téléphone + mot de passe uniquement.
export interface HabitantAccount {
  id: string;
  phone: string;
  email: string;
  password: string;
  firstName?: string | null;
  lastName?: string | null;
  status: 'verified' | 'disabled';
  createdAt: string;
}

export const habitantAccounts: HabitantAccount[] = [
  {
    id: user.id,
    phone: user.phone,
    email: 'demo@adressebj.bj',
    password: 'demo1234',
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    status: 'verified',
    createdAt: user.createdAt,
  },
];

// Inscriptions en attente de vérification OTP — clé = téléphone, valeur =
// brouillon de compte. Évacué à la première vérification OTP réussie.
export interface PendingRegistration {
  phone: string;
  email: string;
  password: string;
  createdAt: string;
}
export const pendingRegistrations: Map<string, PendingRegistration> = new Map();

// Comptes back-office (Modérateurs / Administrateur) pour /login.
// Email + mot de passe en clair côté mock — équivalent du seed initial qu'on
// remplace en production par une procédure d'invitation.
export interface BackofficeAccount {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'MODERATOR' | 'ADMIN';
  status: 'active' | 'suspended';
}

export const backofficeAccounts: BackofficeAccount[] = [
  {
    id: 'bo_admin',
    email: 'admin@adressebj.bj',
    password: 'admin1234',
    firstName: 'Sandra',
    lastName: 'AHOUANGAN',
    role: 'ADMIN',
    status: 'active',
  },
  {
    id: 'bo_mod_1',
    email: 'kossi@adressebj.bj',
    password: 'mod1234',
    firstName: 'Kossi',
    lastName: 'DOSSOU',
    role: 'MODERATOR',
    status: 'active',
  },
  {
    id: 'bo_mod_2',
    email: 'fatouma@adressebj.bj',
    password: 'mod1234',
    firstName: 'Fatouma',
    lastName: 'DIALLO',
    role: 'MODERATOR',
    status: 'suspended',
  },
];

// ─── Notifications utilisateur ─────────────────────────────────────────────

export const userNotifications: Notification[] = [
  {
    id: 'notif_1',
    kind: 'address_validated',
    message: 'Votre adresse AKP-7X3K a été validée et est désormais publique.',
    addressCode: 'AKP-7X3K',
    read: false,
    createdAt: '2026-06-11T08:30:00Z',
  },
  {
    id: 'notif_2',
    kind: 'report_received',
    message:
      'Un visiteur a signalé un problème sur votre adresse CAD-3M9P.',
    addressCode: 'CAD-3M9P',
    read: false,
    createdAt: '2026-06-10T14:15:00Z',
  },
  {
    id: 'notif_3',
    kind: 'system',
    message: 'Bienvenue sur AdresseBJ ! Pensez à partager votre adresse.',
    addressCode: null,
    read: true,
    createdAt: '2026-06-09T09:00:00Z',
  },
];

const stepsAkp = [
  'Partir du marché Dantokpa',
  'Prendre la 2ème rue à droite après la station Total',
  'Continuer sur 200 mètres jusqu’au manguier',
  'Portail bleu avec étoile jaune, côté nord',
];

const stepsCad = [
  'Depuis le carrefour Cadjèhoun, prendre la voie pavée',
  'Tourner à gauche après la pharmacie Sainte-Rita',
  '3ème portail à droite, mur ocre',
];

const stepsFid = [
  'Depuis l’hôtel du Lac, prendre la voie longeant la plage',
  '1ère rue de sable à droite',
  'Portail noir avec inscription "Maison Gnonlonfoun"',
];

const buildAssembled = (steps: string[]) =>
  steps.map((s) => s.trim()).join('. ') + '.';

function seedAddresses(): OwnerAddress[] {
  return [
  {
    code: 'AKP-7X3K',
    quartierId: 'quartier_akp',
    quartier: quartiers[0],
    gps: { lat: 6.3676, lng: 2.4252 },
    coordinates: { lat: 6.3676, lng: 2.4252 },
    photoUrl:
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800',
    instructions: {
      steps: stepsAkp,
      assembledText: buildAssembled(stepsAkp),
    },
    category: 'COMMERCE',
    reliabilityScore: 82,
    averageRating: 4.1,
    ratingCount: 23,
    visitCount: 27,
    isActive: true,
    status: 'PUBLIEE',
    mapDiscoverable: true,
    createdAt: '2026-03-04T14:21:00Z',
    updatedAt: '2026-04-22T11:00:00Z',
  },
  {
    code: 'CAD-3M9P',
    quartierId: 'quartier_cad',
    quartier: quartiers[1],
    gps: { lat: 6.3617, lng: 2.3924 },
    coordinates: { lat: 6.3617, lng: 2.3924 },
    photoUrl:
      'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=800',
    instructions: {
      steps: stepsCad,
      assembledText: buildAssembled(stepsCad),
    },
    category: 'DOMICILE',
    reliabilityScore: 54,
    averageRating: 2.7,
    ratingCount: 8,
    visitCount: 9,
    isActive: true,
    status: 'PUBLIEE',
    // Démo : propriétaire ayant désactivé la découverte publique en plus
    // d'être en DOMICILE — adresse complètement absente de /carte.
    mapDiscoverable: false,
    createdAt: '2026-04-12T09:08:00Z',
  },
  {
    code: 'FID-K2QR',
    quartierId: 'quartier_fid',
    quartier: quartiers[2],
    gps: { lat: 6.3559, lng: 2.3777 },
    coordinates: { lat: 6.3559, lng: 2.3777 },
    photoUrl:
      'https://images.unsplash.com/photo-1583331793556-9d1f8aa44d44?w=800',
    instructions: {
      steps: stepsFid,
      assembledText: buildAssembled(stepsFid),
    },
    category: 'RESTAURATION',
    reliabilityScore: null,
    averageRating: null,
    ratingCount: 0,
    visitCount: 0,
    isActive: true,
    status: 'EN_ATTENTE_VALIDATION',
    mapDiscoverable: true,
    createdAt: '2026-05-19T16:50:00Z',
  },
  ];
}

// Mutable in-memory store — createAddress() unshifts into this so the rest of
// the app sees new addresses within a session. Rebuilt from the seed by
// resetMockData() so tests start from a clean slate.
export const addresses: OwnerAddress[] = seedAddresses();

// Historique versionné — clé = code adresse, valeur = liste de révisions du
// plus récent au plus ancien. Alimenté par seedRevisions() puis muté par les
// handlers POST /addresses (CREATION) et PATCH /addresses/:code (OWNER_EDIT).
export const addressRevisions: Record<string, AddressRevision[]> = {};

function maskOwnerPhone(): string {
  // Pas d'utilisateur multi-comptes en mock — on masque le numéro principal.
  return '+229 ••00';
}

function seedRevisions(): void {
  for (const key of Object.keys(addressRevisions)) {
    delete addressRevisions[key];
  }
  for (const addr of addresses) {
    addressRevisions[addr.code] = [
      {
        id: `rev_${addr.code}_v1`,
        version: 1,
        category: addr.category,
        gps: addr.gps,
        photoUrl: addr.photoUrl,
        instructions: addr.instructions,
        source: 'CREATION',
        authorPhoneMasked: maskOwnerPhone(),
        comment: null,
        createdAt: addr.createdAt,
      },
    ];
  }
  // Démo : AKP-7X3K a été éditée par son propriétaire après création (photo
  // remplacée + 4ème étape ajoutée). On garde l'ancienne v1 en archive pour
  // que le composant RevisionHistory ait quelque chose à afficher.
  if (addressRevisions['AKP-7X3K']) {
    const v1 = addressRevisions['AKP-7X3K'][0];
    const previousSteps = [
      'Sortir du carrefour Étoile Rouge en direction du marché Dantokpa',
      "Continuer 200m, prendre la 2ème ruelle à droite (juste après l'école)",
      'Notre portail est le 3ème sur la gauche, peint en bleu avec une étoile',
    ];
    const previousPhotoUrl =
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&v=old';
    // On remplace la v1 par l'ancien contenu, et on ajoute v2 = l'état
    // courant (celui présent dans `addresses`).
    addressRevisions['AKP-7X3K'] = [
      {
        ...v1,
        version: 2,
        id: 'rev_AKP-7X3K_v2',
        source: 'OWNER_EDIT',
        comment: 'Photo remplacée après ravalement du portail.',
        createdAt: '2026-04-22T11:00:00Z',
      },
      {
        ...v1,
        photoUrl: previousPhotoUrl,
        instructions: {
          steps: previousSteps,
          assembledText: buildAssembled(previousSteps),
        },
      },
    ];
  }
}

seedRevisions();

/**
 * Restore the mutable mock stores to their seeded state. Call between tests to
 * keep suites isolated from each other's writes.
 */
export function resetMockData(): void {
  addresses.splice(0, addresses.length, ...seedAddresses());
  seedRevisions();
  for (const key of Object.keys(userRatings)) {
    delete userRatings[key];
  }
}

export const apiKeys: ApiKey[] = [
  {
    id: 'key_1',
    key: 'bj_live_a1b2c3d4e5f6g7h8',
    label: 'App livraison Gozem (sandbox)',
    status: 'ACTIVE',
    createdAt: '2026-02-20T08:00:00Z',
    expiresAt: null,
  },
  {
    id: 'key_2',
    key: 'bj_live_z9y8x7w6v5u4t3s2',
    label: 'Intégration test fintech',
    status: 'REVOKED',
    createdAt: '2026-01-05T08:00:00Z',
    revokedAt: '2026-04-30T12:00:00Z',
  },
];

export const reports: Report[] = [
  {
    id: 'report_1',
    addressId: 'AKP-7X3K',
    message: 'Le portail bleu a été repeint en rouge, photo plus à jour.',
    resolved: false,
    createdAt: '2026-05-20T10:00:00Z',
  },
  {
    id: 'report_2',
    addressId: 'CAD-3M9P',
    message: 'Adresse difficile à trouver sans repère supplémentaire.',
    resolved: false,
    createdAt: '2026-05-22T16:30:00Z',
  },
  {
    id: 'report_3',
    addressId: 'AKP-7X3K',
    message: 'Adresse fermée pour travaux.',
    resolved: true,
    createdAt: '2026-04-12T09:08:00Z',
  },
];

export const contributions: Contribution[] = [
  {
    id: 'contrib_1',
    addressId: 'AKP-7X3K',
    addressCode: 'AKP-7X3K',
    direction: 'Sens unique nord → sud',
    entrySide: 'Côté gauche en venant du marché',
    status: 'PENDING',
    createdAt: '2026-05-21T08:00:00Z',
  },
  {
    id: 'contrib_2',
    addressId: 'CAD-3M9P',
    addressCode: 'CAD-3M9P',
    direction: 'Double sens',
    entrySide: null,
    status: 'PENDING',
    createdAt: '2026-05-23T14:30:00Z',
  },
];

export interface AdminStats {
  activeAddresses: number;
  visitsToday: number;
  pendingReports: number;
  activeQuartiers: number;
}

export function adminStats(): AdminStats {
  const activeAddresses = addresses.filter((a) => a.isActive).length;
  const activeQuartiers = quartiers.filter((q) => q.isActive).length;
  const pendingReports = reports.filter((r) => !r.resolved).length;
  // No visits store in the mock — surface a stable mock figure.
  return { activeAddresses, visitsToday: 47, pendingReports, activeQuartiers };
}

// ─── Habitants ─────────────────────────────────────────────────────────────

export const habitants: AdminHabitant[] = [
  {
    id: 'hab_1',
    phone: '+22997012345',
    email: null,
    status: 'verified',
    addressCount: 3,
    reportsAgainstCount: 0,
    createdAt: '2026-05-29T12:00:00Z',
    lastSeenAt: '2026-06-10T08:30:00Z',
  },
  {
    id: 'hab_2',
    phone: '+22996884422',
    email: 'mt@example.bj',
    status: 'unverified',
    addressCount: 1,
    reportsAgainstCount: 1,
    createdAt: '2026-06-11T07:00:00Z',
    lastSeenAt: '2026-06-11T07:15:00Z',
  },
  {
    id: 'hab_3',
    phone: '+22990123456',
    email: null,
    status: 'disabled',
    addressCount: 0,
    reportsAgainstCount: 3,
    createdAt: '2026-06-04T12:00:00Z',
    lastSeenAt: '2026-06-05T18:00:00Z',
  },
  {
    id: 'hab_4',
    phone: '+22997998877',
    email: null,
    status: 'verified',
    addressCount: 2,
    reportsAgainstCount: 0,
    createdAt: '2026-06-08T10:00:00Z',
    lastSeenAt: '2026-06-10T19:00:00Z',
  },
  {
    id: 'hab_5',
    phone: '+22961002211',
    email: 'sd@example.bj',
    status: 'verified',
    addressCount: 5,
    reportsAgainstCount: 0,
    createdAt: '2026-06-10T09:00:00Z',
    lastSeenAt: '2026-06-11T06:00:00Z',
  },
  {
    id: 'hab_6',
    phone: '+22995332211',
    email: null,
    status: 'verified',
    addressCount: 1,
    reportsAgainstCount: 0,
    createdAt: '2026-05-28T16:00:00Z',
    lastSeenAt: '2026-06-09T20:00:00Z',
  },
];

export function getHabitantDetail(id: string): AdminHabitantDetail | null {
  const base = habitants.find((h) => h.id === id);
  if (!base) return null;
  // Build a fake address list and timeline that is plausible from the existing
  // mock addresses store, so the detail page has something to render.
  const owned = addresses.slice(0, Math.min(base.addressCount, addresses.length));
  return {
    ...base,
    addresses: owned.map((a) => ({
      code: a.code,
      quartierName: a.quartier?.name ?? 'Quartier inconnu',
      status: a.status,
      createdAt: a.createdAt,
    })),
    timeline: [
      base.status === 'disabled'
        ? {
            id: `${id}_disabled`,
            label: 'Compte désactivé par un modérateur',
            occurredAt: base.lastSeenAt ?? base.createdAt,
            tone: 'danger' as const,
          }
        : {
            id: `${id}_verified`,
            label: 'Compte vérifié par OTP',
            occurredAt: base.createdAt,
            tone: 'success' as const,
          },
      {
        id: `${id}_created`,
        label: 'Inscription via numéro de téléphone',
        occurredAt: base.createdAt,
        tone: 'neutral' as const,
      },
    ],
  };
}

// ─── Moderators ────────────────────────────────────────────────────────────

export const moderators: AdminModerator[] = [
  {
    id: 'mod_1',
    phone: '+22999999999',
    email: 'admin@adressebj.bj',
    status: 'active',
    decisionsCount: 184,
    approvalRate: 0.78,
    createdAt: '2026-01-15T09:00:00Z',
    lastActiveAt: '2026-06-11T07:00:00Z',
  },
  {
    id: 'mod_2',
    phone: '+22997001122',
    email: 'kossi@adressebj.bj',
    status: 'active',
    decisionsCount: 92,
    approvalRate: 0.83,
    createdAt: '2026-03-08T10:00:00Z',
    lastActiveAt: '2026-06-10T18:30:00Z',
  },
  {
    id: 'mod_3',
    phone: '+22996445566',
    email: 'fatouma@adressebj.bj',
    status: 'suspended',
    decisionsCount: 41,
    approvalRate: 0.55,
    createdAt: '2026-04-22T11:00:00Z',
    lastActiveAt: '2026-05-30T08:00:00Z',
  },
];

// ─── Moderation queue ──────────────────────────────────────────────────────
//
// Built from the addresses store: any address with status 'pending' shows up
// here. We synthesise a few extra placeholder items so the queue does not feel
// empty in mock mode.

const extraQueueSeed: ModerationQueueItem[] = [
  {
    code: 'AKP-2847',
    quartierName: 'Cotonou - Akpakpa',
    ownerPhoneMasked: '+229 97XX',
    submittedAt: '2026-06-11T05:30:00Z',
    gps: { lat: 6.3654, lng: 2.4183 },
    gpsAccuracyMeters: 15,
    photoUrl:
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800',
    assembledText:
      "Depuis le carrefour Ganhi, prendre la rue à droite juste après l'immeuble bleu, c'est le portail marron au fond de l'impasse.",
    steps: [
      'Depuis le carrefour Ganhi, prendre la rue à droite',
      "Juste après l'immeuble bleu",
      "Portail marron au fond de l'impasse",
    ],
    isFresh: true,
  },
  {
    code: 'FID-9102',
    quartierName: 'Cotonou - Fidjrossè',
    ownerPhoneMasked: '+229 61XX',
    submittedAt: '2026-06-11T03:30:00Z',
    gps: { lat: 6.3482, lng: 2.3712 },
    gpsAccuracyMeters: 8,
    photoUrl:
      'https://images.unsplash.com/photo-1583331793556-9d1f8aa44d44?w=800',
    assembledText:
      "Maison à étage verte avec balcon blanc, située en face de la boutique 'Espoir' après le château d'eau.",
    steps: [
      "Aller jusqu'au château d'eau",
      "Maison à étage verte avec balcon blanc",
      "En face de la boutique 'Espoir'",
    ],
    isFresh: false,
  },
];

export function getModerationQueue(): ModerationQueueItem[] {
  const fromAddresses: ModerationQueueItem[] = addresses
    .filter((a) => a.status === 'EN_ATTENTE_VALIDATION')
    .map((a) => ({
      code: a.code,
      quartierName: a.quartier?.name ?? 'Quartier inconnu',
      ownerPhoneMasked: '+229 ••XX',
      submittedAt: a.createdAt,
      gps: a.gps,
      gpsAccuracyMeters: 15,
      photoUrl: a.photoUrl,
      assembledText: a.instructions.assembledText,
      steps: a.instructions.steps,
      isFresh:
        Date.now() - new Date(a.createdAt).getTime() < 6 * 60 * 60 * 1000,
    }));
  return [...fromAddresses, ...extraQueueSeed];
}

export function getModerationQueueItem(code: string): ModerationQueueItem | null {
  return getModerationQueue().find((item) => item.code === code) ?? null;
}

export function getModerationStats(): ModerationStats {
  return {
    pendingAddresses: getModerationQueue().length,
    pendingReports: reports.filter((r) => !r.resolved).length,
    pendingContributions: contributions.filter((c) => c.status === 'PENDING').length,
  };
}

// ─── Carte publique de découverte ──────────────────────────────────────────
//
// Seed des marqueurs visibles sur /carte. On mélange volontairement beaucoup
// de DOMICILE (qui resteront muets) et quelques marqueurs catégorisés en
// clair — c'est ce mix qui rend la matrice de visibilité lisible visuellement.
// Centré sur Cotonou (~6.36, 2.40), avec quelques points autour d'Agblangandan
// (~6.38, 2.52) pour démontrer le rendu dans la zone de test du dev.

const DISCOVERY_SEED: DiscoveryItem[] = [
  // ── Centre Cotonou — Akpakpa / Cadjèhoun / Fidjrossè ──
  {
    code: 'AKP-7X3K',
    lat: 6.3676,
    lng: 2.4252,
    category: 'COMMERCE',
    muted: false,
    preview: {
      photoUrl:
        'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=400',
      quartierName: 'Akpakpa',
    },
  },
  {
    code: 'CAD-3M9P',
    lat: 6.3617,
    lng: 2.3924,
    category: 'RESTAURATION',
    muted: false,
    preview: {
      photoUrl:
        'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=400',
      quartierName: 'Cadjèhoun',
    },
  },
  {
    code: 'FID-K2QR',
    lat: 6.3559,
    lng: 2.3777,
    category: 'SANTE',
    muted: false,
    preview: {
      photoUrl:
        'https://images.unsplash.com/photo-1583331793556-9d1f8aa44d44?w=400',
      quartierName: 'Fidjrossè',
    },
  },
  // Quelques points colorés supplémentaires pour faire ressortir la diversité
  // des catégories à l'écran.
  {
    code: 'AKP-EDU1',
    lat: 6.3702,
    lng: 2.4181,
    category: 'EDUCATION',
    muted: false,
    preview: { photoUrl: 'https://images.unsplash.com/photo-1580537659466-0a9bfa916a54?w=400', quartierName: 'Akpakpa' },
  },
  {
    code: 'CAD-ADM1',
    lat: 6.3585,
    lng: 2.3960,
    category: 'ADMINISTRATION',
    muted: false,
    preview: { photoUrl: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=400', quartierName: 'Cadjèhoun' },
  },
  // ── Volée de DOMICILE muets autour d'Akpakpa pour illustrer la matrice ──
  ...buildDomicileCluster(6.3680, 2.4240, 14, 'AKP'),
  ...buildDomicileCluster(6.3620, 2.3930, 10, 'CAD'),
  ...buildDomicileCluster(6.3560, 2.3780, 8, 'FID'),

  // ── Quartiers Agblangandan / Ekpè PK10 (position dev) ──
  {
    code: 'AGB-MKT1',
    lat: 6.3833,
    lng: 2.5215,
    category: 'COMMERCE',
    muted: false,
    preview: { photoUrl: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400', quartierName: 'Agblangandan' },
  },
  {
    code: 'AGB-RST1',
    lat: 6.3820,
    lng: 2.5198,
    category: 'RESTAURATION',
    muted: false,
    preview: { photoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400', quartierName: 'Agblangandan' },
  },
  ...buildDomicileCluster(6.3831, 2.5208, 12, 'AGB'),
];

// Petit utilitaire interne — génère N adresses DOMICILE muettes autour d'un
// centre, en dispersant les positions sur ~250m. Code généré déterministe
// pour ne pas casser le mock à chaque appel.
function buildDomicileCluster(
  centerLat: number,
  centerLng: number,
  count: number,
  prefix: string,
): DiscoveryItem[] {
  const items: DiscoveryItem[] = [];
  for (let i = 0; i < count; i += 1) {
    // Dispersion pseudo-aléatoire stable (offsets ~ ±0.0025° ≈ ±275m).
    const angle = (i * 137.5 * Math.PI) / 180; // golden angle pour répartir
    const radius = 0.0008 + (i % 3) * 0.0008;
    items.push({
      code: `${prefix}-D${String(i + 1).padStart(2, '0')}`,
      lat: centerLat + Math.sin(angle) * radius,
      lng: centerLng + Math.cos(angle) * radius,
      category: 'DOMICILE',
      muted: true,
      preview: null,
    });
  }
  return items;
}

export function getDiscoveryItems(
  bbox: { west: number; south: number; east: number; north: number } | null,
  categories: DiscoveryCategory[] | null,
): DiscoveryItem[] {
  return DISCOVERY_SEED.filter((it) => {
    if (bbox) {
      if (it.lng < bbox.west || it.lng > bbox.east) return false;
      if (it.lat < bbox.south || it.lat > bbox.north) return false;
    }
    // Les DOMICILE sont toujours rendus (matrice de visibilité) — le filtre
    // catégorie ne s'applique qu'aux catégories filtrables (non-DOMICILE).
    if (it.category === 'DOMICILE') return true;
    if (categories && categories.length > 0) {
      return categories.includes(it.category);
    }
    return true;
  });
}

export function toPublicAddress(addr: OwnerAddress): PublicAddress {
  return {
    code: addr.code,
    quartier: { id: addr.quartierId, name: addr.quartier?.name ?? '', prefix: addr.quartier?.prefix ?? '' },
    category: addr.category,
    gps: addr.gps,
    photoUrl: addr.photoUrl,
    instructions: addr.instructions,
    reliabilityScore: addr.reliabilityScore,
    averageRating: addr.averageRating,
    ratingCount: addr.ratingCount,
    visitCount: addr.visitCount,
    isActive: addr.isActive,
    mapDiscoverable: addr.mapDiscoverable,
    // Score de l'utilisateur courant — mock pivot sur la table userRatings
    // pour permettre l'upsert sans localStorage côté visiteur (CDC v5 §8).
    myRating: userRatings[addr.code] ?? null,
    createdAt: addr.createdAt,
  };
}

// Notes terrain (FieldNotes) — clé = code adresse. Distinct des contributions
// (sens / côté entrée) et des propositions de modification (étapes corrigées).
// Visible côté propriétaire dans /dashboard/address/:code.
export const fieldNotes: Record<string, import('@/types/api').FieldNote[]> = {
  'AKP-7X3K': [
    {
      id: 'fn_1',
      addressCode: 'AKP-7X3K',
      message:
        "Difficile de repérer le portail la nuit, il n'y a pas d'éclairage dans la ruelle.",
      authorPhoneMasked: '+229 ••42',
      createdAt: '2026-05-30T20:14:00Z',
    },
  ],
};

// Notes individuelles laissées par l'utilisateur courant — clé = code
// adresse, valeur = score 1-5. Réinitialisé entre les tests via resetMockData.
export const userRatings: Record<string, number> = {};
