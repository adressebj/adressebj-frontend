import {
  addressRevisions,
  addresses,
  adminStats,
  apiKeys,
  backofficeAccounts,
  contributions,
  fieldNotes,
  getDiscoveryItems,
  getHabitantDetail,
  getModerationQueue,
  getModerationQueueItem,
  getModerationStats,
  habitantAccounts,
  habitants,
  landmarks,
  moderators,
  pendingRegistrations,
  quartiers,
  reports,
  toPublicAddress,
  user,
  userNotifications,
  userRatings,
  type AdminStats,
} from '@/mocks/data';
import type {
  AddressCategory,
  AddressRevision,
  AddressStatus,
  AdminAddressDetail,
  AdminHabitant,
  AdminHabitantDetail,
  AdminModerator,
  ApiEnvelope,
  ApiKey,
  AuthRegisterInput,
  AuthTokenResponse,
  CloudinarySignature,
  Contribution,
  CreateAddressInput,
  CreateFieldNoteInput,
  CreatedAddress,
  DiscoveryCategory,
  DiscoveryItem,
  FieldNote,
  HabitantLoginInput,
  HabitantStatus,
  ModerationDecisionInput,
  ModerationQueueItem,
  ModerationStats,
  NearbyLandmark,
  Notification,
  OwnerAddress,
  PublicAddress,
  Quartier,
  RatingUpsertInput,
  RatingUpsertResponse,
  Report,
  Role,
  User,
  VisitStartInput,
  VisitStartResponse,
} from '@/types/api';
import { pointInPolygon } from '@/lib/utils';
import { normalizeRole } from '@/lib/auth';

// A small artificial latency makes loading/skeleton states visible in the real
// app. Under Jest it only slows the suite down and pushes async assertions past
// their default timeouts, so collapse it to zero in tests.
const MOCK_DELAY_MS = process.env.NODE_ENV === 'test' ? 0 : 800;

// Read env vars lazily so jest (which sets them in setupFiles) and runtime
// overrides both behave consistently.
const isMockMode = () => process.env.NEXT_PUBLIC_USE_MOCK === 'true';
const getBaseUrl = () => process.env.NEXT_PUBLIC_API_URL ?? '';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public extra?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Auth = 'jwt' | 'apiKey' | 'none';

interface FetchOptions extends Omit<RequestInit, 'body'> {
  auth?: Auth;
  body?: unknown;
  /** Route interne (hors contrat public) : appelée sur `${baseUrl}<path>` au
      lieu de `${baseUrl}/api<path>`. Réservée aux helpers du produit
      (ex. repères de création), absente du Swagger. */
  internal?: boolean;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Great-circle distance in metres — used by the mock to detect addresses
// within a small radius of a freshly captured GPS point.
function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function jwtHeader(): string | null {
  if (typeof window === 'undefined') return null;
  const token = window.localStorage.getItem('adressebj_token');
  return token ? `Bearer ${token}` : null;
}

// ────────────────────────────────────────────────────────────────────────────
// Couche bas niveau : appel HTTP au vrai backend (préfixe global /api).
// Déballe l'enveloppe { data } et propage les ApiError (code machine).
// ────────────────────────────────────────────────────────────────────────────
async function backendFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    throw new ApiError(0, 'API_URL_MISSING', "L'URL de l'API n'est pas configurée.");
  }

  const { auth = 'none', body, headers, internal = false, ...rest } = options;
  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string> | undefined),
  };
  if (auth === 'jwt') {
    const header = jwtHeader();
    if (header) finalHeaders.Authorization = header;
  }

  const res = await fetch(`${baseUrl}${internal ? '' : '/api'}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let payload: Record<string, unknown> = {};
    try {
      payload = (await res.json()) as Record<string, unknown>;
    } catch {
      // ignore body parse error
    }
    throw new ApiError(
      res.status,
      (payload.code as string) ?? 'UNKNOWN_ERROR',
      (payload.message as string) ?? '',
      payload,
    );
  }

  if (res.status === 204) return undefined as T;
  const json = (await res.json()) as ApiEnvelope<T>;
  return json.data;
}

// ────────────────────────────────────────────────────────────────────────────
// Adaptateur réel — traduit les chemins/méthodes/bodies/formes internes du
// frontend vers le contrat backend canonique (docs/API_CONTRACT.md). Permet de
// brancher le vrai backend SANS toucher aux composants, types ni mocks (les 93
// tests tournent en mock, donc inchangés). Les écarts de forme sont absorbés ici.
// ────────────────────────────────────────────────────────────────────────────

interface BackendAuthResult {
  token: string;
  user: { id: string; phone: string | null; email: string | null; role: string };
}

// Stocke email+password entre les 2 étapes du flux frontend (register → verify-otp)
// que le backend regroupe en request-otp + register(vérifie+crée).
const pendingReg = new Map<string, { email: string; password: string }>();

function toTokenResponse(r: BackendAuthResult): AuthTokenResponse {
  return {
    accessToken: r.token,
    user: {
      id: r.user.id,
      phone: r.user.phone ?? '',
      email: r.user.email,
      role: normalizeRole(r.user.role),
    },
  };
}

// Backend GET /addresses/:code → forme PublicAddress attendue par l'UI.
function toPublicShape(d: {
  code: string;
  category: AddressCategory;
  quartier: { name: string; prefix: string; id?: string };
  gps: { lat: number; lng: number };
  photoUrl: string;
  steps: string[];
  assembledText: string;
  averageRating: number | null;
  ratingCount: number;
  fieldNotes?: { message: string; createdAt: string }[];
  createdAt: string;
}): PublicAddress {
  return {
    code: d.code,
    category: d.category,
    quartier: d.quartier,
    gps: d.gps,
    photoUrl: d.photoUrl,
    instructions: { steps: d.steps, assembledText: d.assembledText },
    reliabilityScore: null,
    averageRating: d.averageRating,
    ratingCount: d.ratingCount,
    visitCount: 0,
    isActive: true,
    mapDiscoverable: true,
    myRating: null,
    createdAt: d.createdAt,
  };
}

function deriveStatus(lifecycle: string, rev: string | null, published: boolean): AddressStatus {
  if (lifecycle === 'DESACTIVEE') return 'DESACTIVEE';
  if (rev === 'REJETEE') return 'REJETEE';
  if (rev === 'EN_ATTENTE_VALIDATION' && !published) return 'EN_ATTENTE_VALIDATION';
  if (published || rev === 'PUBLIEE' || rev === 'ARCHIVEE') return 'PUBLIEE';
  return 'EN_ATTENTE_VALIDATION';
}

// Shape renvoyée par le backend `GET /moderation/revisions`.
interface BackendPendingRevision {
  id: string;
  addressCode: string;
  category: AddressCategory;
  steps: string[];
  assembledText: string;
  photoUrl: string;
  gps: { lat: number; lng: number };
  gpsAccuracyMeters: number;
  quartierName: string;
  ownerPhoneMasked: string;
  createdAt: string;
  isFirstPublication: boolean;
}

function fetchPendingRevisions(): Promise<BackendPendingRevision[]> {
  return backendFetch<BackendPendingRevision[]>('/moderation/revisions', { auth: 'jwt' });
}

function toQueueItem(r: BackendPendingRevision) {
  return {
    code: r.addressCode,
    quartierName: r.quartierName,
    ownerPhoneMasked: r.ownerPhoneMasked,
    submittedAt: r.createdAt,
    gps: r.gps,
    gpsAccuracyMeters: r.gpsAccuracyMeters,
    photoUrl: r.photoUrl,
    assembledText: r.assembledText,
    steps: r.steps,
    isFresh: r.isFirstPublication,
  };
}

async function realFetch<T>(path: string, options: FetchOptions): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const body = options.body as Record<string, unknown> | undefined;
  const T = <X>(v: X) => v as unknown as T;

  // ── Repères Overpass (route interne) : best-effort, vide si non disponible ──
  if (path.startsWith('/internal/nearby-landmark')) return T([]);

  // ── Auth ──────────────────────────────────────────────────────────────────
  if (path === '/auth/register' && method === 'POST') {
    // Étape 1 du frontend = envoi de l'OTP. On mémorise email+password.
    const phone = String(body?.phone ?? '');
    pendingReg.set(phone, {
      email: String(body?.email ?? ''),
      password: String(body?.password ?? ''),
    });
    await backendFetch('/auth/request-otp', { method: 'POST', body: { phone } });
    return T({ message: 'OTP envoyé', expiresIn: 300 });
  }
  if (path === '/auth/request-otp' && method === 'POST') {
    await backendFetch('/auth/request-otp', { method: 'POST', body });
    return T({ message: 'OTP envoyé', expiresIn: 300 });
  }
  if (path === '/auth/verify-otp' && method === 'POST') {
    // Étape 2 = création effective du compte (backend register).
    const phone = String(body?.phone ?? '');
    const pending = pendingReg.get(phone);
    const res = await backendFetch<BackendAuthResult>('/auth/register', {
      method: 'POST',
      body: {
        phone,
        code: body?.code,
        email: pending?.email,
        password: pending?.password,
      },
    });
    pendingReg.delete(phone);
    return T(toTokenResponse(res));
  }
  if (path === '/auth/login' && method === 'POST') {
    const res = await backendFetch<BackendAuthResult>('/auth/login', { method: 'POST', body });
    return T(toTokenResponse(res));
  }
  if (path === '/auth/forgot-password' && method === 'POST') {
    await backendFetch('/auth/password-reset/request', { method: 'POST', body });
    return T({ message: 'Si un compte existe, un code a été envoyé.', expiresIn: 300 });
  }
  if (path === '/auth/reset-password' && method === 'POST') {
    const res = await backendFetch<BackendAuthResult>('/auth/password-reset', { method: 'POST', body });
    return T(toTokenResponse(res));
  }
  if (path === '/auth/admin/login' && method === 'POST') {
    const res = await backendFetch<BackendAuthResult>('/auth/login', { method: 'POST', body });
    return T(toTokenResponse(res));
  }
  // Reset self-service mod/admin par email : hors périmètre backend (pas de
  // transport email). No-op gracieux — la réinit. réelle passe par l'admin.
  if (path === '/auth/admin/forgot-password' && method === 'POST') return T({ sent: true });
  if (path === '/auth/admin/reset-password' && method === 'POST') return T({ reset: true });

  // ── Profil / compte ─────────────────────────────────────────────────────────
  if (path === '/users/me' && method === 'GET') {
    const u = await backendFetch<{
      id: string; phone: string | null; email: string | null;
      firstName: string | null; lastName: string | null; role: string;
    }>('/auth/me', { auth: 'jwt' });
    return T({
      id: u.id, phone: u.phone ?? '', email: u.email,
      firstName: u.firstName, lastName: u.lastName,
      role: normalizeRole(u.role), createdAt: '',
    });
  }
  if (path === '/users/me' && method === 'PATCH') {
    const u = await backendFetch<{
      id: string; phone: string | null; email: string | null;
      firstName: string | null; lastName: string | null; role: string;
    }>('/auth/profile', { method: 'PATCH', body, auth: 'jwt' });
    return T({
      id: u.id, phone: u.phone ?? '', email: u.email,
      firstName: u.firstName, lastName: u.lastName,
      role: normalizeRole(u.role), createdAt: '',
    });
  }
  if (path === '/users/me' && method === 'DELETE') {
    const me = await backendFetch<{ phone: string | null }>('/auth/me', { auth: 'jwt' });
    const r = await backendFetch<{ deleted: boolean; anonymizedAt: string }>('/auth/account', {
      method: 'DELETE', body: { phone: me.phone }, auth: 'jwt',
    });
    // Anonymisation immédiate (pas de purge différée) — on expose la date réelle.
    return T({ deleted: r.deleted, purgeScheduledAt: r.anonymizedAt });
  }
  if (path === '/users/me/phone/request-change' && method === 'POST') {
    await backendFetch('/auth/request-otp', { method: 'POST', body: { phone: body?.newPhone } });
    return T({ sent: true });
  }
  if (path === '/users/me/phone/confirm-change' && method === 'POST') {
    await backendFetch('/auth/phone', {
      method: 'PATCH', body: { phone: body?.newPhone, code: body?.code }, auth: 'jwt',
    });
    return T({ updated: true, newPhone: body?.newPhone });
  }

  // ── Notifications & push ─────────────────────────────────────────────────────
  if (path === '/users/me/notifications' && method === 'GET') {
    const rows = await backendFetch<Array<{
      id: string; type: string; message: string;
      addressCode: string | null; readAt: string | null; createdAt: string;
    }>>('/notifications', { auth: 'jwt' });
    const kindMap: Record<string, Notification['kind']> = {
      ADDRESS_VALIDATED: 'address_validated',
      ADDRESS_REJECTED: 'address_rejected',
      ADDRESS_DEACTIVATED: 'address_disabled',
      RELIABILITY_WARNING: 'system',
    };
    return T(rows.map((n) => ({
      id: n.id,
      kind: kindMap[n.type] ?? 'system',
      message: n.message,
      addressCode: n.addressCode,
      read: n.readAt != null,
      createdAt: n.createdAt,
    })));
  }
  if (path === '/users/me/notifications/read-all' && method === 'POST') {
    return T(await backendFetch('/notifications/read-all', { method: 'POST', auth: 'jwt' }));
  }
  if (path === '/push-subscriptions' && method === 'POST') {
    await backendFetch('/notifications/subscribe', { method: 'POST', body, auth: 'jwt' });
    return T({ subscribed: true });
  }
  if (path === '/push-subscriptions' && method === 'DELETE') {
    await backendFetch('/notifications/unsubscribe', { method: 'DELETE', body, auth: 'jwt' });
    return T({ unsubscribed: true });
  }

  // ── Quartiers (référentiel public) ──────────────────────────────────────────
  if (path === '/quartiers' && method === 'GET') {
    const qs = await backendFetch<Array<{ id: string; name: string; prefix: string }>>('/quartiers');
    return T(qs.map((q) => ({ ...q, isActive: true })));
  }

  // ── Carte de découverte ──────────────────────────────────────────────────────
  if (path.startsWith('/map/addresses') && method === 'GET') {
    const url = new URL(path, 'http://x.local');
    const bbox = url.searchParams.get('bbox');
    const cats = url.searchParams.get('categories');
    const q = new URLSearchParams();
    if (bbox) {
      const [west, south, east, north] = bbox.split(',');
      q.set('north', north); q.set('south', south); q.set('east', east); q.set('west', west);
    }
    // Le backend filtre par une seule catégorie ; on prend la première fournie.
    if (cats) q.set('category', cats.split(',')[0]);
    const markers = await backendFetch<Array<{
      code: string; category: AddressCategory; gps: { lat: number; lng: number };
      muted: boolean; preview: { photoUrl: string; code: string } | null;
    }>>(`/map/addresses?${q.toString()}`);
    return T({
      items: markers.map((m) => ({
        code: m.code, lat: m.gps.lat, lng: m.gps.lng, category: m.category,
        muted: m.muted,
        preview: m.preview ? { photoUrl: m.preview.photoUrl, quartierName: '' } : null,
      })),
    });
  }

  // ── Adresses : lecture publique / propriétaire ──────────────────────────────
  const codeResolve = path.match(/^\/addresses\/([^/]+)\/resolve$/);
  const codePublic = path.match(/^\/addresses\/([^/]+)$/);
  if (method === 'GET' && (codeResolve || codePublic)) {
    // Vue propriétaire ET vue visiteur passent par l'endpoint public (le helper
    // ownerAddress visait /resolve, réservé aux clés API — corrigé ici).
    const code = (codeResolve ?? codePublic)![1];
    const d = await backendFetch<Parameters<typeof toPublicShape>[0]>(`/addresses/${code}`);
    return T(toPublicShape(d));
  }
  if ((path === '/addresses' || path === '/addresses/mine') && method === 'GET') {
    const rows = await backendFetch<Array<{
      code: string; lifecycle: string; mapDiscoverable: boolean; published: boolean;
      category: AddressCategory | null; currentRevisionStatus: string | null; createdAt: string;
    }>>('/addresses/mine', { auth: 'jwt' });
    return T(rows.map((a) => ({
      code: a.code,
      quartierId: '',
      category: (a.category ?? 'AUTRE') as AddressCategory,
      gps: { lat: 0, lng: 0 },
      photoUrl: '',
      instructions: { steps: [], assembledText: '' },
      reliabilityScore: null,
      averageRating: null,
      ratingCount: 0,
      visitCount: 0,
      isActive: a.lifecycle !== 'DESACTIVEE',
      status: deriveStatus(a.lifecycle, a.currentRevisionStatus, a.published),
      mapDiscoverable: a.mapDiscoverable,
      createdAt: a.createdAt,
    })));
  }
  const codeRevisions = path.match(/^\/addresses\/([^/]+)\/revisions$/);
  if (codeRevisions && method === 'GET') {
    const code = codeRevisions[1];
    const revs = await backendFetch<Array<{
      id: string; status: string; category: AddressCategory; steps: string[];
      assembledText: string; photoUrl: string; rejectionReason: string | null;
      isPublished: boolean; createdAt: string;
    }>>(`/addresses/${code}/revisions`, { auth: 'jwt' });
    return T({
      items: revs.map((r, i) => ({
        id: r.id,
        version: revs.length - i,
        category: r.category,
        gps: { lat: 0, lng: 0 },
        photoUrl: r.photoUrl,
        instructions: { steps: r.steps, assembledText: r.assembledText },
        source: 'OWNER_EDIT' as const,
        authorPhoneMasked: '',
        comment: r.rejectionReason,
        createdAt: r.createdAt,
      })),
    });
  }

  // ── Adresses : écriture propriétaire ────────────────────────────────────────
  if (path === '/addresses' && method === 'POST') {
    return T(await backendFetch('/addresses', { method: 'POST', body, auth: 'jwt' }));
  }
  const codeOnly = path.match(/^\/addresses\/([^/]+)$/);
  if (codeOnly && method === 'PATCH') {
    const code = codeOnly[1];
    // Toggle découverte ⇒ endpoint dédié ; sinon nouvelle révision.
    if (typeof body?.mapDiscoverable === 'boolean'
      && !body?.photoUrl && !body?.instructions && !body?.coordinates) {
      await backendFetch(`/addresses/${code}/discoverable`, {
        method: 'PATCH', body: { discoverable: body.mapDiscoverable }, auth: 'jwt',
      });
      return T({ updated: true });
    }
    const instr = body?.instructions as { steps: string[] } | undefined;
    await backendFetch(`/addresses/${code}`, {
      method: 'PATCH',
      body: { steps: instr?.steps, photoUrl: body?.photoUrl, category: body?.category },
      auth: 'jwt',
    });
    return T({ updated: true });
  }
  if (codeOnly && method === 'DELETE') {
    const code = codeOnly[1];
    const r = await backendFetch<{ code: string; lifecycle: string }>(`/addresses/${code}`, {
      method: 'DELETE', auth: 'jwt',
    });
    return T({ deactivated: r.lifecycle === 'DESACTIVEE', deactivatedAt: new Date().toISOString() });
  }

  // ── Évaluation / signalement / contribution / notes terrain ──────────────────
  const codeRating = path.match(/^\/addresses\/([^/]+)\/rating$/);
  if (codeRating && method === 'PUT') {
    const code = codeRating[1];
    const r = await backendFetch<{ averageRating: number | null; ratingCount: number }>(
      `/addresses/${code}/rate`,
      { method: 'POST', body: { stars: body?.score }, auth: 'jwt' },
    );
    return T({ addressCode: code, score: Number(body?.score), newAverage: r.averageRating, ratingCount: r.ratingCount });
  }
  const codeReports = path.match(/^\/addresses\/([^/]+)\/reports$/);
  if (codeReports && method === 'POST') {
    const r = await backendFetch<{ reportId: string; status: string }>(
      `/addresses/${codeReports[1]}/report`, { method: 'POST', body, auth: 'jwt' },
    );
    return T(r);
  }
  const codeContrib = path.match(/^\/addresses\/([^/]+)\/contributions$/);
  if (codeContrib && method === 'POST') {
    // Le frontend envoie { circulationDirection?, entrySide? } → message libre backend.
    const b = body as { circulationDirection?: string; entrySide?: string } | undefined;
    const message = [b?.circulationDirection, b?.entrySide].filter(Boolean).join(' — ') || ' ';
    const r = await backendFetch<{ contributionId: string; status: string }>(
      `/addresses/${codeContrib[1]}/contribution`, { method: 'POST', body: { message }, auth: 'jwt' },
    );
    return T(r);
  }
  const codeFieldNotes = path.match(/^\/addresses\/([^/]+)\/field-notes$/);
  if (codeFieldNotes && method === 'GET') {
    const code = codeFieldNotes[1];
    const d = await backendFetch<{ fieldNotes?: { message: string; createdAt: string }[] }>(`/addresses/${code}`);
    return T({
      items: (d.fieldNotes ?? []).map((n, i) => ({
        id: `fn_${code}_${i}`, addressCode: code, message: n.message,
        authorPhoneMasked: '', createdAt: n.createdAt,
      })),
    });
  }
  if (codeFieldNotes && method === 'POST') {
    const code = codeFieldNotes[1];
    const r = await backendFetch<{ contributionId: string }>(
      `/addresses/${code}/contribution`, { method: 'POST', body, auth: 'jwt' },
    );
    return T({
      id: r.contributionId, addressCode: code, message: String((body as { message?: string })?.message ?? ''),
      authorPhoneMasked: '', createdAt: new Date().toISOString(),
    });
  }
  const codeVote = path.match(/^\/addresses\/([^/]+)\/reliability\/vote$/);
  if (codeVote && method === 'POST') return T({ recorded: true }); // legacy, non câblé

  // ── Visites ──────────────────────────────────────────────────────────────────
  if (path === '/visits/start' && method === 'POST') {
    const b = body as { addressCode: string; startedAt: string };
    const r = await backendFetch<{ visitId: string }>('/visits/start', {
      method: 'POST', body: { addressCode: b.addressCode, departAt: b.startedAt },
    });
    return T({ visitId: r.visitId, startedAt: b.startedAt });
  }
  if (path === '/visits/confirm' && method === 'POST') {
    return T(await backendFetch('/visits/confirm', { method: 'POST', body }));
  }

  // ── Upload Cloudinary ────────────────────────────────────────────────────────
  if (path === '/upload/signature' && method === 'POST') {
    return T(await backendFetch('/upload/signature', { method: 'POST', auth: 'jwt' }));
  }

  // ── Administration : routes alignées sur le backend existant ────────────────
  if (path === '/admin/stats' && method === 'GET') {
    return T(await backendFetch('/admin/stats', { auth: 'jwt' }));
  }
  if (path === '/admin/quartiers' && method === 'GET') {
    return T(await backendFetch('/admin/quartiers', { auth: 'jwt' }));
  }
  if (path === '/admin/quartiers' && method === 'POST') {
    return T(await backendFetch('/admin/quartiers', { method: 'POST', body, auth: 'jwt' }));
  }
  const adminQuartier = path.match(/^\/admin\/quartiers\/([^/]+)$/);
  if (adminQuartier && method === 'PATCH') {
    return T(await backendFetch(`/admin/quartiers/${adminQuartier[1]}`, { method: 'PATCH', body, auth: 'jwt' }));
  }
  if (path.startsWith('/admin/addresses') && method === 'GET') {
    // Réutilise la pagination/filtre backend (status → lifecycle).
    const url = new URL(path, 'http://x.local');
    const q = new URLSearchParams();
    const search = url.searchParams.get('search');
    const status = url.searchParams.get('status');
    if (search) q.set('code', search);
    if (status === 'inactive') q.set('lifecycle', 'DESACTIVEE');
    if (status === 'active') q.set('lifecycle', 'ACTIVE');
    for (const k of ['page', 'limit']) {
      const v = url.searchParams.get(k);
      if (v) q.set(k, v);
    }
    const detail = url.pathname.match(/^\/admin\/addresses\/([^/]+)$/);
    if (!detail) {
      const res = await backendFetch<{ items: Array<{ code: string; quartier: { name: string } | null; lifecycle: string; createdAt: string }>; total: number; page: number; limit: number }>(
        `/admin/addresses?${q.toString()}`, { auth: 'jwt' },
      );
      return T({
        items: res.items.map((a) => ({
          code: a.code, quartier: a.quartier, ownerPhone: '••••',
          isActive: a.lifecycle !== 'DESACTIVEE', reliabilityScore: null,
          reportCount: 0, createdAt: a.createdAt,
        })),
        total: res.total, page: res.page, limit: res.limit,
      });
    }
  }
  const adminDeactivate = path.match(/^\/admin\/addresses\/([^/]+)\/deactivate$/);
  if (adminDeactivate && method === 'PATCH') {
    await backendFetch(`/admin/addresses/${adminDeactivate[1]}/deactivate`, { method: 'PATCH', body, auth: 'jwt' });
    return T({ deactivated: true });
  }
  if (path === '/admin/quartiers' && method === 'GET') {
    return T(await backendFetch('/admin/quartiers', { auth: 'jwt' }));
  }
  if (path === '/admin/api-keys' && method === 'POST') {
    return T(await backendFetch('/admin/api-keys', { method: 'POST', body, auth: 'jwt' }));
  }
  const adminApiKey = path.match(/^\/admin\/api-keys\/([^/]+)$/);
  if (adminApiKey && method === 'PATCH') {
    const k = await backendFetch<{ id: string; status: string; revokedAt: string }>(
      `/admin/api-keys/${adminApiKey[1]}`, { method: 'DELETE', auth: 'jwt' },
    );
    return T({ revoked: k.status === 'REVOKED', revokedAt: k.revokedAt });
  }
  if (path === '/admin/reports' && method === 'GET') {
    return T(await backendFetch('/moderation/reports', { auth: 'jwt' }));
  }
  if (path === '/admin/contributions' && method === 'GET') {
    return T(await backendFetch('/moderation/contributions', { auth: 'jwt' }));
  }
  if (path === '/admin/moderators' && method === 'POST') {
    // Le backend crée un modérateur par email+password (pas par téléphone).
    return T(await backendFetch('/admin/moderators', { method: 'POST', body, auth: 'jwt' }));
  }

  // ── File de modération (révisions) ──────────────────────────────────────────
  // Le frontend raisonne en file unifiée clé = code adresse ; le backend expose
  // trois files distinctes clé = id. Une seule révision est EN_ATTENTE par
  // adresse, donc code ↔ révision est 1:1 et résoluble depuis la liste.
  if (path === '/admin/moderation/stats' && method === 'GET') {
    const [revs, reports, contribs] = await Promise.all([
      backendFetch<unknown[]>('/moderation/revisions', { auth: 'jwt' }),
      backendFetch<unknown[]>('/moderation/reports', { auth: 'jwt' }),
      backendFetch<unknown[]>('/moderation/contributions', { auth: 'jwt' }),
    ]);
    return T({
      pendingAddresses: revs.length,
      pendingReports: reports.length,
      pendingContributions: contribs.length,
    });
  }
  if (path === '/admin/moderation/queue' && method === 'GET') {
    const revs = await fetchPendingRevisions();
    return T(revs.map(toQueueItem));
  }
  const modQueueItem = path.match(/^\/admin\/moderation\/queue\/([^/]+)$/);
  if (modQueueItem && method === 'GET') {
    const code = modQueueItem[1].toUpperCase();
    const rev = (await fetchPendingRevisions()).find((r) => r.addressCode.toUpperCase() === code);
    if (!rev) throw new ApiError(404, 'REVISION_NOT_FOUND', 'Révision introuvable dans la file.');
    return T(toQueueItem(rev));
  }
  if (modQueueItem && method === 'POST') {
    const code = modQueueItem[1].toUpperCase();
    const rev = (await fetchPendingRevisions()).find((r) => r.addressCode.toUpperCase() === code);
    if (!rev) throw new ApiError(404, 'REVISION_NOT_FOUND', 'Révision introuvable dans la file.');
    const decision = body as { status: 'approved' | 'rejected'; reason?: string | null };
    if (decision.status === 'approved') {
      await backendFetch(`/moderation/revisions/${rev.id}/approve`, { method: 'PATCH', auth: 'jwt' });
    } else {
      await backendFetch(`/moderation/revisions/${rev.id}/reject`, {
        method: 'PATCH', body: { reason: decision.reason ?? 'Non conforme' }, auth: 'jwt',
      });
    }
    return T({ decided: true });
  }

  // Reste du back-office (listes habitants/modérateurs/clés, détails) :
  // endpoints backend à compléter — signalé explicitement.
  throw new ApiError(
    501, 'ADMIN_ENDPOINT_NOT_WIRED',
    `Endpoint back-office non encore raccordé au backend réel : ${method} ${path}.`,
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Mock router — keeps the same call signature as the real backend so the
// switch is transparent for callers.
// ────────────────────────────────────────────────────────────────────────────

async function mockFetch<T>(path: string, options: FetchOptions): Promise<T> {
  await delay(MOCK_DELAY_MS);
  const method = (options.method ?? 'GET').toUpperCase();

  // --- Quartiers ---
  if (path === '/quartiers' && method === 'GET') {
    return quartiers.filter((q) => q.isActive) as unknown as T;
  }

  // --- Auth Habitant : register + verify-otp + login ─────────────────────
  // Inscription en 2 temps : POST /auth/register valide les champs et
  // envoie un OTP (mock = 123456) ; POST /auth/verify-otp confirme la
  // création du compte. Connexion ultérieure : POST /auth/login (phone +
  // password) qui retourne directement le JWT, sans OTP.
  if (path === '/auth/register' && method === 'POST') {
    const body = options.body as
      | { phone?: string; email?: string; password?: string }
      | undefined;
    const phone = body?.phone ?? '';
    const email = (body?.email ?? '').trim().toLowerCase();
    const password = body?.password ?? '';
    if (!/^\+229\d{8}$/.test(phone)) {
      throw new ApiError(400, 'INVALID_PHONE_FORMAT', 'Numéro de téléphone invalide.');
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      throw new ApiError(400, 'INVALID_EMAIL_FORMAT', 'Adresse e-mail invalide.');
    }
    if (password.length < 8) {
      throw new ApiError(400, 'PASSWORD_TOO_SHORT', 'Mot de passe trop court (8 caractères minimum).');
    }
    if (habitantAccounts.some((a) => a.phone === phone)) {
      throw new ApiError(409, 'PHONE_ALREADY_REGISTERED', 'Ce numéro est déjà associé à un compte.');
    }
    if (habitantAccounts.some((a) => a.email.toLowerCase() === email)) {
      throw new ApiError(409, 'EMAIL_ALREADY_REGISTERED', 'Cet e-mail est déjà associé à un compte.');
    }
    pendingRegistrations.set(phone, {
      phone,
      email,
      password,
      createdAt: new Date().toISOString(),
    });
    return { message: 'OTP envoyé', expiresIn: 300 } as unknown as T;
  }
  if (path === '/auth/request-otp' && method === 'POST') {
    const phone = (options.body as { phone?: string } | undefined)?.phone ?? '';
    if (!/^\+229\d{8}$/.test(phone)) {
      throw new ApiError(400, 'INVALID_PHONE_FORMAT', 'Numéro de téléphone invalide.');
    }
    return { message: 'OTP envoyé', expiresIn: 300 } as unknown as T;
  }
  if (path === '/auth/verify-otp' && method === 'POST') {
    const body = options.body as { phone?: string; code?: string } | undefined;
    const phone = body?.phone ?? '';
    if (!body?.code || body.code !== '123456') {
      throw new ApiError(401, 'INVALID_OR_EXPIRED_OTP', 'Code incorrect ou expiré.');
    }
    // Si une inscription est en attente pour ce numéro, on la finalise :
    // création du compte Habitant définitif avec son mot de passe.
    const pending = pendingRegistrations.get(phone);
    if (pending) {
      habitantAccounts.push({
        id: `usr_${Date.now()}`,
        phone: pending.phone,
        email: pending.email,
        password: pending.password,
        firstName: null,
        lastName: null,
        status: 'verified',
        createdAt: new Date().toISOString(),
      });
      pendingRegistrations.delete(phone);
    }
    const account =
      habitantAccounts.find((a) => a.phone === phone) ?? habitantAccounts[0];
    return {
      accessToken: buildMockJwt('CREATOR'),
      user: {
        id: account.id,
        phone: account.phone,
        email: account.email,
        role: 'CREATOR' as Role,
      },
    } satisfies AuthTokenResponse as unknown as T;
  }
  if (path === '/auth/login' && method === 'POST') {
    const body = options.body as { phone?: string; password?: string } | undefined;
    const phone = body?.phone ?? '';
    const password = body?.password ?? '';
    if (!/^\+229\d{8}$/.test(phone)) {
      throw new ApiError(400, 'INVALID_PHONE_FORMAT', 'Numéro de téléphone invalide.');
    }
    const account = habitantAccounts.find((a) => a.phone === phone);
    if (!account || account.password !== password) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Téléphone ou mot de passe incorrect.');
    }
    if (account.status === 'disabled') {
      throw new ApiError(403, 'HABITANT_SUSPENDED', 'Votre compte a été désactivé.');
    }
    return {
      accessToken: buildMockJwt('CREATOR'),
      user: {
        id: account.id,
        phone: account.phone,
        email: account.email,
        role: 'CREATOR' as Role,
      },
    } satisfies AuthTokenResponse as unknown as T;
  }

  // Mot de passe oublié Habitant — demande d'OTP (non-énumérant) + reset.
  if (path === '/auth/forgot-password' && method === 'POST') {
    const phone = (options.body as { phone?: string } | undefined)?.phone ?? '';
    if (!/^\+229\d{8}$/.test(phone)) {
      throw new ApiError(400, 'INVALID_PHONE_FORMAT', 'Numéro de téléphone invalide.');
    }
    // Réponse non-énumérante : on ne révèle jamais si le compte existe.
    return {
      message: 'Si un compte existe, un code a été envoyé.',
      expiresIn: 300,
    } as unknown as T;
  }
  if (path === '/auth/reset-password' && method === 'POST') {
    const body = options.body as
      | { phone?: string; code?: string; password?: string }
      | undefined;
    const phone = body?.phone ?? '';
    const password = body?.password ?? '';
    const account = habitantAccounts.find((a) => a.phone === phone);
    // Compte inexistant OU OTP faux → même erreur (non-énumérant).
    if (!account || body?.code !== '123456') {
      throw new ApiError(401, 'INVALID_OR_EXPIRED_OTP', 'Code incorrect ou expiré.');
    }
    if (password.length < 8) {
      throw new ApiError(
        400,
        'PASSWORD_TOO_SHORT',
        'Mot de passe trop court (8 caractères minimum).',
      );
    }
    account.password = password;
    return {
      accessToken: buildMockJwt('CREATOR'),
      user: {
        id: account.id,
        phone: account.phone,
        email: account.email,
        role: 'CREATOR' as Role,
      },
    } satisfies AuthTokenResponse as unknown as T;
  }

  // Connexion back-office (Modérateur / Admin) — email + password.
  if (path === '/auth/admin/login' && method === 'POST') {
    const body = options.body as { email?: string; password?: string } | undefined;
    if (!body?.email || !body.password) {
      throw new ApiError(400, 'INVALID_CREDENTIALS', 'Identifiants incorrects.');
    }
    const account = backofficeAccounts.find(
      (a) => a.email.toLowerCase() === body.email!.toLowerCase(),
    );
    if (!account || account.password !== body.password) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Identifiants incorrects.');
    }
    if (account.status === 'suspended') {
      throw new ApiError(403, 'ACCOUNT_SUSPENDED', 'Votre compte est suspendu.');
    }
    return {
      accessToken: buildMockJwt(account.role),
      user: {
        id: account.id,
        phone: '+22999999999',
        email: account.email,
        role: account.role,
      },
    } satisfies AuthTokenResponse as unknown as T;
  }

  // Mot de passe oublié back-office (toast côté UI, pas de vrai envoi mail).
  if (path === '/auth/admin/forgot-password' && method === 'POST') {
    return { sent: true } as unknown as T;
  }
  if (path === '/auth/admin/reset-password' && method === 'POST') {
    return { reset: true } as unknown as T;
  }

  // Changement de numéro Habitant (profil) — request + confirm.
  if (path === '/users/me/phone/request-change' && method === 'POST') {
    const phone = (options.body as { newPhone?: string } | undefined)?.newPhone ?? '';
    if (!/^\+229\d{8}$/.test(phone)) {
      throw new ApiError(400, 'INVALID_PHONE_FORMAT', 'Numéro invalide.');
    }
    return { sent: true } as unknown as T;
  }
  if (path === '/users/me/phone/confirm-change' && method === 'POST') {
    const body = options.body as { newPhone?: string; code?: string } | undefined;
    if (body?.code !== '123456') {
      throw new ApiError(401, 'INVALID_OR_EXPIRED_OTP', 'Code incorrect ou expiré.');
    }
    return { updated: true, newPhone: body?.newPhone } as unknown as T;
  }

  // Notifications utilisateur — liste + mark all read.
  if (path === '/users/me/notifications' && method === 'GET') {
    return userNotifications
      .slice()
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)) as unknown as T;
  }
  if (path === '/users/me/notifications/read-all' && method === 'POST') {
    userNotifications.forEach((n) => {
      n.read = true;
    });
    return { updated: userNotifications.length } as unknown as T;
  }

  // Réinitialisation forcée du mot de passe d'un Modérateur (action Admin).
  const adminResetMatch = path.match(
    /^\/admin\/moderators\/([^/]+)\/reset-password$/,
  );
  if (adminResetMatch && method === 'POST') {
    return { sent: true } as unknown as T;
  }

  // --- Repères avoisinants (point de départ des instructions, création) ---
  // Endpoint INTERNE (hors /api/v1) : POI connus proches du GPS, triés par
  // distance. Liste vide = rédaction libre (cas normal, pas une erreur). En
  // production le backend encapsule Overpass + cache géographique (CDC §Overpass).
  if (path.startsWith('/internal/nearby-landmark') && method === 'GET') {
    const url = new URL(path, 'http://mock.local');
    const lat = Number(url.searchParams.get('lat'));
    const lng = Number(url.searchParams.get('lng'));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return [] as unknown as T;
    }
    const RADIUS_M = 300;
    const found: NearbyLandmark[] = landmarks
      .map((l) => ({
        name: l.name,
        category: l.category,
        lat: l.lat,
        lng: l.lng,
        distanceM: Math.round(haversineMeters(lat, lng, l.lat, l.lng)),
      }))
      .filter((l) => l.distanceM <= RADIUS_M)
      .sort((a, b) => a.distanceM - b.distanceM);
    return found as unknown as T;
  }

  // --- Addresses (visitor public read) ---
  const resolveMatch = path.match(/^\/addresses\/([^/]+)\/resolve$/);
  const publicMatch = path.match(/^\/addresses\/([^/]+)$/);
  if (method === 'GET' && (resolveMatch || publicMatch)) {
    const rawCode = (resolveMatch ?? publicMatch)![1];
    const code = rawCode.toUpperCase();
    // Special-cased fixtures so the address page can be exercised on the
    // three documented states without polluting the addresses[] list.
    if (code === 'DESACTIVE') {
      throw new ApiError(
        410,
        'ADDRESS_INACTIVE',
        "Cette adresse n'est plus active.",
        { address_code: code, deactivated_at: '2026-03-14T10:22:00Z' },
      );
    }
    if (code === 'INEXISTANT') {
      throw new ApiError(404, 'ADDRESS_NOT_FOUND', 'Aucune adresse trouvée.');
    }
    const found = addresses.find((a) => a.code === code);
    if (!found) {
      throw new ApiError(404, 'ADDRESS_NOT_FOUND', 'Aucune adresse trouvée.');
    }
    if (!found.isActive) {
      throw new ApiError(
        410,
        'ADDRESS_INACTIVE',
        "Cette adresse n'est plus active.",
        { address_code: found.code, deactivated_at: found.deactivatedAt ?? null },
      );
    }
    return toPublicAddress(found) as unknown as T;
  }

  // --- Reliability vote, report, contribution (visitor, public) ---
  const voteMatch = path.match(/^\/addresses\/([^/]+)\/reliability\/vote$/);
  if (voteMatch && method === 'POST') {
    return { recorded: true } as unknown as T;
  }
  const reportMatch = path.match(/^\/addresses\/([^/]+)\/reports$/);
  if (reportMatch && method === 'POST') {
    return { reportId: `report_mock_${Date.now()}`, status: 'PENDING' } as unknown as T;
  }
  const contribMatch = path.match(/^\/addresses\/([^/]+)\/contributions$/);
  if (contribMatch && method === 'POST') {
    return { contributionId: `contrib_mock_${Date.now()}`, status: 'PENDING' } as unknown as T;
  }
  // --- Visit start (départ de navigation) ---
  if (path === '/visits/start' && method === 'POST') {
    const body = options.body as VisitStartInput;
    return {
      visitId: `visit_mock_${Date.now()}`,
      startedAt: body.startedAt,
    } satisfies VisitStartResponse as unknown as T;
  }
  // --- Visit confirmation (J'y suis) ---
  if (path === '/visits/confirm' && method === 'POST') {
    return { visitId: `visit_mock_${Date.now()}`, recorded: true } as unknown as T;
  }

  // --- Ratings upsert (CDC v5 §8 — 1-5 idempotent par utilisateur) ---
  const ratingMatch = path.match(/^\/addresses\/([^/]+)\/rating$/);
  if (ratingMatch && method === 'PUT') {
    const code = ratingMatch[1].toUpperCase();
    const body = options.body as RatingUpsertInput;
    const found = addresses.find((a) => a.code === code);
    const previous = userRatings[code];
    userRatings[code] = body.score;
    if (found) {
      const oldAvg = found.averageRating ?? 0;
      const oldCount = found.ratingCount;
      const newCount = previous != null ? oldCount : oldCount + 1;
      const sumPrev = oldAvg * oldCount;
      const newSum = previous != null
        ? sumPrev - previous + body.score
        : sumPrev + body.score;
      found.ratingCount = newCount;
      found.averageRating = newCount > 0 ? Number((newSum / newCount).toFixed(2)) : null;
    }
    return {
      addressCode: code,
      score: body.score,
      newAverage: found?.averageRating ?? null,
      ratingCount: found?.ratingCount ?? 0,
    } satisfies RatingUpsertResponse as unknown as T;
  }

  // --- Field notes (CDC Frontend §11 — observations terrain libres) ---
  const fieldNotesMatch = path.match(/^\/addresses\/([^/]+)\/field-notes$/);
  if (fieldNotesMatch && method === 'GET') {
    const code = fieldNotesMatch[1].toUpperCase();
    return { items: fieldNotes[code] ?? [] } as unknown as T;
  }
  if (fieldNotesMatch && method === 'POST') {
    const code = fieldNotesMatch[1].toUpperCase();
    const body = options.body as CreateFieldNoteInput;
    const trimmed = body.message.trim();
    if (trimmed.length < 5) {
      throw new ApiError(400, 'NOTE_TOO_SHORT', 'La note est trop courte.');
    }
    const note: FieldNote = {
      id: `fn_mock_${Date.now()}`,
      addressCode: code,
      message: trimmed,
      authorPhoneMasked: '+229 ••00',
      createdAt: new Date().toISOString(),
    };
    fieldNotes[code] = [note, ...(fieldNotes[code] ?? [])];
    return note as unknown as T;
  }

  // --- Carte publique de découverte (CDC Backend §11) ---
  // GET /map/addresses?bbox=west,south,east,north&categories=COMMERCE,SANTE
  if (path.startsWith('/map/addresses') && method === 'GET') {
    const url = new URL(path, 'http://mock.local');
    const bboxRaw = url.searchParams.get('bbox');
    const bbox = bboxRaw
      ? (() => {
          const [west, south, east, north] = bboxRaw.split(',').map(Number);
          if ([west, south, east, north].some((n) => !Number.isFinite(n))) {
            return null;
          }
          return { west, south, east, north };
        })()
      : null;
    const categoriesRaw = url.searchParams.get('categories');
    const categories = categoriesRaw
      ? (categoriesRaw.split(',').filter(Boolean) as DiscoveryCategory[])
      : null;
    return { items: getDiscoveryItems(bbox, categories) } as unknown as T;
  }

  // --- Address revisions (CDC v5 §4 — versioning historique) ---
  const revisionsMatch = path.match(/^\/addresses\/([^/]+)\/revisions$/);
  if (revisionsMatch && method === 'GET') {
    const code = revisionsMatch[1].toUpperCase();
    const list = addressRevisions[code] ?? [];
    return { items: list } as unknown as T;
  }

  // --- Address update (PATCH) / deactivation (DELETE) ---
  const codeOnlyMatch = path.match(/^\/addresses\/([^/]+)$/);
  if (codeOnlyMatch && method === 'PATCH') {
    const code = codeOnlyMatch[1].toUpperCase();
    const found = addresses.find((a) => a.code === code);
    if (found) {
      const patch = (options.body ?? {}) as {
        photoUrl?: string;
        instructions?: { steps: string[]; assembledText: string };
        coordinates?: { lat: number; lng: number };
        mapDiscoverable?: boolean;
      };
      if (patch.photoUrl) found.photoUrl = patch.photoUrl;
      if (patch.instructions) found.instructions = patch.instructions;
      if (patch.coordinates) {
        found.gps = patch.coordinates;
        found.coordinates = patch.coordinates;
      }
      // Toggle opt-out de découverte : pas de nouvelle révision créée
      // (le contenu n'a pas changé), juste un flag UI/serveur.
      if (typeof patch.mapDiscoverable === 'boolean') {
        found.mapDiscoverable = patch.mapDiscoverable;
      }
      const isContentChange =
        Boolean(patch.photoUrl) ||
        Boolean(patch.instructions) ||
        Boolean(patch.coordinates);
      found.updatedAt = new Date().toISOString();
      if (!isContentChange) {
        return { updated: true } as unknown as T;
      }
      const previous = addressRevisions[code] ?? [];
      const nextVersion = (previous[0]?.version ?? 0) + 1;
      const revision: AddressRevision = {
        id: `rev_${code}_v${nextVersion}_${Date.now()}`,
        version: nextVersion,
        category: found.category,
        gps: found.gps,
        photoUrl: found.photoUrl,
        instructions: found.instructions,
        source: 'OWNER_EDIT',
        authorPhoneMasked: '+229 ••00',
        comment: null,
        createdAt: found.updatedAt,
      };
      addressRevisions[code] = [revision, ...previous];
    }
    return { updated: true } as unknown as T;
  }
  if (codeOnlyMatch && method === 'DELETE') {
    return { deactivated: true, deactivatedAt: new Date().toISOString() } as unknown as T;
  }

  // --- Profile (users/me) ---
  if (path === '/users/me' && method === 'GET') {
    return user as unknown as T;
  }
  if (path === '/users/me' && method === 'PATCH') {
    const patch = options.body as { email?: string | null } | undefined;
    return { ...user, email: patch?.email ?? null } as unknown as T;
  }
  if (path === '/users/me' && method === 'DELETE') {
    return { deleted: true, purgeScheduledAt: new Date(Date.now() + 30 * 86_400_000).toISOString() } as unknown as T;
  }

  // --- Push subscriptions ---
  if (path === '/push-subscriptions' && method === 'POST') {
    return { subscribed: true } as unknown as T;
  }
  if (path === '/push-subscriptions' && method === 'DELETE') {
    return { unsubscribed: true } as unknown as T;
  }

  // --- Addresses (owner dashboard list) ---
  // The CDC alternates between /addresses and /addresses/mine for the owner
  // list. Accept both so neither callsite breaks if the backend lands on
  // either name.
  if ((path === '/addresses' || path === '/addresses/mine') && method === 'GET') {
    return addresses as unknown as T;
  }

  // --- Address create ---
  if (path === '/addresses' && method === 'POST') {
    const input = options.body as CreateAddressInput;
    // Quartier dérivé du GPS (rattachement automatique côté backend, CDC v5
    // §Besoin 1) — l'habitant ne choisit jamais sa zone. On résout par
    // point-in-polygon sur les quartiers actifs géométrés.
    const quartier = quartiers.find(
      (q) =>
        q.isActive &&
        q.polygon != null &&
        pointInPolygon(input.gpsLat, input.gpsLng, q.polygon.coordinates),
    );
    if (!quartier) {
      throw new ApiError(
        400,
        'COORDINATES_OUT_OF_COVERAGE',
        'Cette position est hors des quartiers couverts par AdresseBJ.',
      );
    }
    if (!input.steps || input.steps.filter((s) => s.trim()).length < 2) {
      throw new ApiError(400, 'STEPS_REQUIRED', 'Au moins 2 étapes sont requises.');
    }
    if (!input.category) {
      throw new ApiError(400, 'CATEGORY_REQUIRED', 'Veuillez choisir une catégorie.');
    }
    // 409 — l'habitant a déjà une adresse sur cette localisation (≤ 15 m). Le
    // rattachement à la localisation est interne (resolveOrCreate ≤ 15 m, CDC
    // Backend) ; en mock le store `/addresses` représente les adresses de
    // l'utilisateur courant.
    const collision = addresses.find(
      (a) =>
        a.isActive &&
        haversineMeters(a.gps.lat, a.gps.lng, input.gpsLat, input.gpsLng) <= 15,
    );
    if (collision) {
      throw new ApiError(
        409,
        'ADDRESS_ALREADY_EXISTS_AT_LOCATION',
        'Vous avez déjà une adresse à cet endroit.',
        { address_code: collision.code },
      );
    }
    // Match the documented shape — sequence of 4 base32 chars from the
    // alphabet used by the backend.
    const ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
    let sequence = '';
    for (let i = 0; i < 4; i += 1) {
      sequence += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
    const code = `${quartier.prefix}-${sequence}`;
    const cleanedSteps = input.steps.map((s) => s.trim()).filter(Boolean);
    const assembledText = cleanedSteps.join('. ') + '.';
    // Persist the new address into the mock store so /dashboard, /a/:code and
    // /dashboard/address/:code all see it immediately after creation. Without
    // this push, the create flow looked successful but every follow-up read
    // returned 404.
    const createdAtIso = new Date().toISOString();
    addresses.unshift({
      code,
      quartierId: quartier.id,
      quartier,
      category: input.category,
      gps: { lat: input.gpsLat, lng: input.gpsLng },
      coordinates: { lat: input.gpsLat, lng: input.gpsLng },
      photoUrl: input.photoUrl,
      instructions: { steps: cleanedSteps, assembledText },
      reliabilityScore: null,
      averageRating: null,
      ratingCount: 0,
      visitCount: 0,
      isActive: true,
      // Freshly created addresses await moderator validation before going live.
      status: 'EN_ATTENTE_VALIDATION',
      // Découvrable par défaut sauf DOMICILE — le propriétaire peut basculer
      // depuis /dashboard/address/:code (CDC v5 §6 toggle opt-out).
      mapDiscoverable: input.category !== 'DOMICILE',
      createdAt: createdAtIso,
    });
    addressRevisions[code] = [
      {
        id: `rev_${code}_v1`,
        version: 1,
        category: input.category,
        gps: { lat: input.gpsLat, lng: input.gpsLng },
        photoUrl: input.photoUrl,
        instructions: { steps: cleanedSteps, assembledText },
        source: 'CREATION',
        authorPhoneMasked: '+229 ••00',
        comment: null,
        createdAt: createdAtIso,
      },
    ];
    return {
      code,
      assembledText,
      shareUrl: `https://adressebj.vercel.app/a/${code}`,
      whatsappUrl: `https://wa.me/?text=${encodeURIComponent(
        `Mon adresse AdresseBJ : ${code} → https://adressebj.vercel.app/a/${code}`,
      )}`,
    } satisfies CreatedAddress as unknown as T;
  }

  // ──────────────────────────────────────────────────────────────────────
  // ADMIN endpoints (assume the role check would happen server-side; the
  // mock just exposes the data so the frontend can build the UI).
  // ──────────────────────────────────────────────────────────────────────

  if (path === '/admin/stats' && method === 'GET') {
    return adminStats() as unknown as T;
  }

  // Quartiers — list + create + patch (toggle / rename).
  if (path === '/admin/quartiers' && method === 'GET') {
    return quartiers.map((q) => ({
      ...q,
      addressCount: addresses.filter((a) => a.quartierId === q.id).length,
    })) as unknown as T;
  }
  if (path === '/admin/quartiers' && method === 'POST') {
    const body = options.body as {
      name: string;
      prefix: string;
      commune?: string;
      coordinates?: { lat: number; lng: number };
    };
    return {
      id: `quartier_${Date.now()}`,
      name: body.name,
      prefix: body.prefix,
      isActive: true,
      createdAt: new Date().toISOString(),
    } satisfies Quartier as unknown as T;
  }
  const adminQuartierMatch = path.match(/^\/admin\/quartiers\/([^/]+)$/);
  if (adminQuartierMatch && method === 'GET') {
    const quartier = quartiers.find((q) => q.id === adminQuartierMatch[1]);
    if (!quartier) {
      throw new ApiError(404, 'QUARTIER_NOT_FOUND', 'Quartier introuvable.');
    }
    const addressCount = addresses.filter((a) => a.quartierId === quartier.id).length;
    return { ...quartier, addressCount, medianPriceFCFA: null } as unknown as T;
  }
  if (adminQuartierMatch && method === 'PATCH') {
    return { updated: true } as unknown as T;
  }

  // Admin addresses supervision — search + filter + paginate.
  if (path.startsWith('/admin/addresses') && method === 'GET') {
    const url = new URL(path, 'http://mock.local');
    const search = (url.searchParams.get('search') ?? '').trim().toLowerCase();
    const status = url.searchParams.get('status') ?? 'all';
    const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
    const limit = Math.max(1, Number(url.searchParams.get('limit') ?? '20'));

    let filtered = addresses.slice();
    if (status === 'active') filtered = filtered.filter((a) => a.isActive);
    if (status === 'inactive') filtered = filtered.filter((a) => !a.isActive);
    if (status === 'reported') {
      const reportedIds = new Set(
        reports.filter((r) => !r.resolved).map((r) => r.addressId),
      );
      filtered = filtered.filter((a) => reportedIds.has(a.code));
    }
    if (search) {
      filtered = filtered.filter(
        (a) =>
          a.code.toLowerCase().includes(search) ||
          (a.quartier?.name ?? '').toLowerCase().includes(search) ||
          (user.phone.includes(search) ? true : false),
      );
    }
    const total = filtered.length;
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);
    return {
      items: items.map((addr) => ({
        code: addr.code,
        quartier: addr.quartier ? { name: addr.quartier.name } : null,
        ownerPhone: user.phone.replace(/(\+\d{3}\d{2})\d+(\d{2})/, '$1****$2'),
        isActive: addr.isActive,
        reliabilityScore: addr.reliabilityScore,
        reportCount: reports.filter((r) => r.addressId === addr.code && !r.resolved).length,
        createdAt: addr.createdAt,
      })),
      total,
      page,
      limit,
    } as unknown as T;
  }

  const adminDeactivateMatch = path.match(
    /^\/admin\/addresses\/([^/]+)\/deactivate$/,
  );
  if (adminDeactivateMatch && method === 'PATCH') {
    return { deactivated: true } as unknown as T;
  }

  // Reports — list + detail + status patch.
  if (path === '/admin/reports' && method === 'GET') {
    return reports
      .slice()
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)) as unknown as T;
  }
  const adminReportMatch = path.match(/^\/admin\/reports\/([^/]+)$/);
  if (adminReportMatch && method === 'GET') {
    const id = adminReportMatch[1];
    const report = reports.find((r) => r.id === id);
    if (!report) {
      throw new ApiError(404, 'REPORT_NOT_FOUND', 'Signalement introuvable.');
    }
    const address = addresses.find((a) => a.code === report.addressId) ?? null;
    return {
      report,
      address: address ? toPublicAddress(address) : null,
    } as unknown as T;
  }
  if (adminReportMatch && method === 'PATCH') {
    return { updated: true } as unknown as T;
  }

  // Contributions — list + status patch.
  if (path === '/admin/contributions' && method === 'GET') {
    const url = new URL(path, 'http://mock.local');
    const status = url.searchParams.get('status');
    let list = contributions.slice();
    if (status) list = list.filter((c) => c.status === status);
    return list as unknown as T;
  }
  const adminContributionMatch = path.match(/^\/admin\/contributions\/([^/]+)$/);
  if (adminContributionMatch && method === 'PATCH') {
    return { updated: true } as unknown as T;
  }

  // --- API keys ---
  if (path === '/admin/api-keys' && method === 'GET') {
    return apiKeys as unknown as T;
  }
  if (path === '/admin/api-keys' && method === 'POST') {
    const body = options.body as { label: string; expiresAt?: string | null };
    const random = Math.random().toString(36).slice(2, 18).padEnd(16, '0');
    return {
      id: `key_${Date.now()}`,
      key: `bj_live_${random}`,
      label: body.label,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      expiresAt: body.expiresAt ?? null,
    } satisfies ApiKey as unknown as T;
  }
  const adminApiKeyMatch = path.match(/^\/admin\/api-keys\/([^/]+)$/);
  if (adminApiKeyMatch && method === 'PATCH') {
    return { revoked: true, revokedAt: new Date().toISOString() } as unknown as T;
  }

  // --- Admin address detail ---
  const adminAddressDetailMatch = path.match(/^\/admin\/addresses\/([^/]+)$/);
  if (adminAddressDetailMatch && method === 'GET') {
    const code = adminAddressDetailMatch[1].toUpperCase();
    const found = addresses.find((a) => a.code === code);
    if (!found) {
      throw new ApiError(404, 'ADDRESS_NOT_FOUND', 'Adresse introuvable.');
    }
    const addressReports = reports
      .filter((r) => r.addressId === code)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const detail: AdminAddressDetail = {
      address: toPublicAddress(found),
      ownerPhoneMasked: user.phone.replace(
        /(\+\d{3}\d{2})\d+(\d{2})/,
        '$1****$2',
      ),
      reports: addressReports,
      isActive: found.isActive,
    };
    return detail as unknown as T;
  }

  // --- Habitants ---
  if (path.startsWith('/admin/habitants') && method === 'GET') {
    const detailMatch = path.match(/^\/admin\/habitants\/([^/]+)$/);
    if (detailMatch) {
      const detail = getHabitantDetail(detailMatch[1]);
      if (!detail) {
        throw new ApiError(404, 'HABITANT_NOT_FOUND', 'Habitant introuvable.');
      }
      return detail as unknown as T;
    }
    const url = new URL(path, 'http://mock.local');
    const search = (url.searchParams.get('search') ?? '').trim().toLowerCase();
    const status = url.searchParams.get('status') ?? 'all';
    let list = habitants.slice();
    if (status !== 'all') list = list.filter((h) => h.status === status);
    if (search) {
      list = list.filter(
        (h) =>
          h.phone.includes(search) ||
          (h.email ?? '').toLowerCase().includes(search),
      );
    }
    return list as unknown as T;
  }
  const adminHabitantMatch = path.match(/^\/admin\/habitants\/([^/]+)$/);
  if (adminHabitantMatch && method === 'PATCH') {
    return { updated: true } as unknown as T;
  }

  // --- Moderation hub ---
  if (path === '/admin/moderation/stats' && method === 'GET') {
    return getModerationStats() as unknown as T;
  }
  if (path === '/admin/moderation/queue' && method === 'GET') {
    return getModerationQueue() as unknown as T;
  }
  const moderationQueueDetail = path.match(/^\/admin\/moderation\/queue\/([^/]+)$/);
  if (moderationQueueDetail && method === 'GET') {
    const item = getModerationQueueItem(moderationQueueDetail[1].toUpperCase());
    if (!item) {
      throw new ApiError(404, 'QUEUE_ITEM_NOT_FOUND', 'Soumission introuvable.');
    }
    return item as unknown as T;
  }
  if (moderationQueueDetail && method === 'POST') {
    // approve / reject decision — body { status, reason }
    return { decided: true } as unknown as T;
  }

  // --- Moderators ---
  if (path === '/admin/moderators' && method === 'GET') {
    return moderators as unknown as T;
  }
  if (path === '/admin/moderators' && method === 'POST') {
    const body = options.body as { phone: string; email?: string | null };
    return {
      id: `mod_${Date.now()}`,
      phone: body.phone,
      email: body.email ?? null,
      status: 'active',
      decisionsCount: 0,
      approvalRate: 0,
      createdAt: new Date().toISOString(),
      lastActiveAt: null,
    } satisfies AdminModerator as unknown as T;
  }
  const adminModeratorMatch = path.match(/^\/admin\/moderators\/([^/]+)$/);
  if (adminModeratorMatch && method === 'PATCH') {
    return { updated: true } as unknown as T;
  }

  // --- Cloudinary signature ---
  if (path === '/upload/signature' && method === 'POST') {
    return {
      signature: 'mock_signature',
      timestamp: Math.round(Date.now() / 1000),
      apiKey: 'mock_api_key',
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? 'adressebj',
      folder: 'adressebj/portals',
      transformation: 'q_auto,f_auto',
    } satisfies CloudinarySignature as unknown as T;
  }

  throw new ApiError(404, 'MOCK_ENDPOINT_NOT_IMPLEMENTED', `Mock endpoint ${method} ${path} not implemented.`);
}

function buildMockJwt(role: Role = user.role): string {
  // Unsigned JWT for local mock work — exp 7 days out.
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const sub =
    role === 'ADMIN'
      ? 'user_admin'
      : role === 'MODERATOR'
        ? 'user_moderator'
        : user.id;
  const payload = btoa(
    JSON.stringify({
      sub,
      phone: user.phone,
      role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    }),
  );
  return `${header}.${payload}.mock`;
}

export function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  if (isMockMode()) return mockFetch<T>(path, options);
  return realFetch<T>(path, options);
}

// ────────────────────────────────────────────────────────────────────────────
// Typed call helpers (sugar on top of apiFetch) — keep page code intention-
// revealing without each component re-typing the endpoint URLs.
// ────────────────────────────────────────────────────────────────────────────

export const api = {
  quartiers: () => apiFetch<Quartier[]>('/quartiers'),
  publicAddress: (code: string) =>
    apiFetch<PublicAddress>(`/addresses/${code}`),
  myAddresses: () => apiFetch<OwnerAddress[]>('/addresses', { auth: 'jwt' }),
  // Repère connu le plus proche pour amorcer les instructions (point de
  // départ). Tolérant : tout échec/timeout → `null`, jamais d'exception — le
  // champ repère reste une saisie libre derrière le prompt, donc l'échec de la
  // suggestion ne bloque jamais la création. Route INTERNE (hors /api/v1).
  nearbyLandmark: async (
    lat: number,
    lng: number,
  ): Promise<NearbyLandmark | null> => {
    try {
      const list = await apiFetch<NearbyLandmark[]>(
        `/internal/nearby-landmark?lat=${lat}&lng=${lng}`,
        { auth: 'jwt', internal: true, signal: AbortSignal.timeout(5000) },
      );
      if (!Array.isArray(list) || list.length === 0) return null;
      return list.reduce((closest, l) =>
        l.distanceM < closest.distanceM ? l : closest,
      );
    } catch {
      return null;
    }
  },
  createAddress: (input: CreateAddressInput) =>
    apiFetch<CreatedAddress>('/addresses', { method: 'POST', body: input, auth: 'jwt' }),
  apiKeys: () => apiFetch<ApiKey[]>('/admin/api-keys', { auth: 'jwt' }),
  uploadSignature: () =>
    apiFetch<CloudinarySignature>('/upload/signature', { method: 'POST', auth: 'jwt' }),
  registerHabitant: (input: AuthRegisterInput) =>
    apiFetch<{ message: string; expiresIn: number }>('/auth/register', {
      method: 'POST',
      body: input,
    }),
  requestOtp: (phone: string) =>
    apiFetch<{ message: string; expiresIn: number }>('/auth/request-otp', {
      method: 'POST',
      body: { phone },
    }),
  verifyOtp: (phone: string, code: string) =>
    apiFetch<AuthTokenResponse>('/auth/verify-otp', {
      method: 'POST',
      body: { phone, code },
    }),
  loginHabitant: (phone: string, password: string) =>
    apiFetch<AuthTokenResponse>('/auth/login', {
      method: 'POST',
      body: { phone, password } satisfies HabitantLoginInput,
    }),
  forgotPasswordHabitant: (phone: string) =>
    apiFetch<{ message: string; expiresIn: number }>('/auth/forgot-password', {
      method: 'POST',
      body: { phone },
    }),
  resetPasswordHabitant: (phone: string, code: string, password: string) =>
    apiFetch<AuthTokenResponse>('/auth/reset-password', {
      method: 'POST',
      body: { phone, code, password },
    }),
  adminLogin: (email: string, password: string) =>
    apiFetch<AuthTokenResponse>('/auth/admin/login', {
      method: 'POST',
      body: { email, password },
    }),
  adminForgotPassword: (email: string) =>
    apiFetch<{ sent: boolean }>('/auth/admin/forgot-password', {
      method: 'POST',
      body: { email },
    }),
  adminResetPassword: (token: string, password: string) =>
    apiFetch<{ reset: boolean }>('/auth/admin/reset-password', {
      method: 'POST',
      body: { token, password },
    }),
  requestPhoneChange: (newPhone: string) =>
    apiFetch<{ sent: boolean }>('/users/me/phone/request-change', {
      method: 'POST',
      body: { newPhone },
      auth: 'jwt',
    }),
  confirmPhoneChange: (newPhone: string, code: string) =>
    apiFetch<{ updated: boolean; newPhone: string }>(
      '/users/me/phone/confirm-change',
      { method: 'POST', body: { newPhone, code }, auth: 'jwt' },
    ),
  myNotifications: () =>
    apiFetch<Notification[]>('/users/me/notifications', { auth: 'jwt' }),
  markAllNotificationsRead: () =>
    apiFetch<{ updated: number }>('/users/me/notifications/read-all', {
      method: 'POST',
      auth: 'jwt',
    }),
  reportAddress: (code: string, message: string) =>
    apiFetch<{ reportId: string; status: string }>(
      `/addresses/${encodeURIComponent(code)}/reports`,
      { method: 'POST', body: { message }, auth: 'jwt' },
    ),
  submitContribution: (
    code: string,
    body: { circulationDirection?: string; entrySide?: string },
  ) =>
    apiFetch<{ contributionId: string; status: string }>(
      `/addresses/${encodeURIComponent(code)}/contributions`,
      { method: 'POST', body, auth: 'jwt' },
    ),
  confirmArrival: (body: {
    addressCode: string;
    departAt: string;
    arrivedAt: string;
  }) =>
    apiFetch<{ visitId: string; recorded: boolean }>('/visits/confirm', {
      method: 'POST',
      body,
    }),
  startVisit: (body: VisitStartInput) =>
    apiFetch<VisitStartResponse>('/visits/start', {
      method: 'POST',
      body,
    }),
  upsertRating: (code: string, score: 1 | 2 | 3 | 4 | 5) =>
    apiFetch<RatingUpsertResponse>(
      `/addresses/${encodeURIComponent(code)}/rating`,
      { method: 'PUT', body: { score } satisfies RatingUpsertInput, auth: 'jwt' },
    ),
  // Lecture publique : les informations terrain approuvées sont affichées en
  // lecture seule sur la vue publique `/a/:code` (CDC Frontend §549/753), donc
  // accessibles sans compte. Le backend ne renvoie que les notes publiées.
  listFieldNotes: (code: string) =>
    apiFetch<{ items: FieldNote[] }>(
      `/addresses/${encodeURIComponent(code)}/field-notes`,
      { auth: 'none' },
    ),
  createFieldNote: (code: string, body: CreateFieldNoteInput) =>
    apiFetch<FieldNote>(
      `/addresses/${encodeURIComponent(code)}/field-notes`,
      { method: 'POST', body, auth: 'jwt' },
    ),
  /**
   * Carte publique de découverte — `GET /map/addresses?bbox=...&categories=...`.
   * Le backend renvoie uniquement les adresses PUBLIEE + mapDiscoverable
   * dans la bounding box, en appliquant la matrice de visibilité du CDC
   * (DOMICILE muté, autres en clair avec aperçu).
   */
  discoveryMap: (params: {
    bbox?: { west: number; south: number; east: number; north: number };
    categories?: DiscoveryCategory[];
  } = {}) => {
    const q = new URLSearchParams();
    if (params.bbox) {
      q.set(
        'bbox',
        [params.bbox.west, params.bbox.south, params.bbox.east, params.bbox.north].join(','),
      );
    }
    if (params.categories?.length) {
      q.set('categories', params.categories.join(','));
    }
    const qs = q.toString();
    return apiFetch<{ items: DiscoveryItem[] }>(
      `/map/addresses${qs ? `?${qs}` : ''}`,
    );
  },
  ownerAddress: (code: string) =>
    apiFetch<PublicAddress>(
      `/addresses/${encodeURIComponent(code)}/resolve`,
      { auth: 'jwt' },
    ),
  addressRevisions: (code: string) =>
    apiFetch<{ items: AddressRevision[] }>(
      `/addresses/${encodeURIComponent(code)}/revisions`,
      { auth: 'jwt' },
    ),
  updateAddress: (
    code: string,
    body: {
      photoUrl?: string;
      instructions?: { steps: string[]; assembledText: string };
      coordinates?: { lat: number; lng: number };
      mapDiscoverable?: boolean;
    },
  ) =>
    apiFetch<{ updated: boolean }>(`/addresses/${encodeURIComponent(code)}`, {
      method: 'PATCH',
      body,
      auth: 'jwt',
    }),
  deactivateAddress: (code: string) =>
    apiFetch<{ deactivated: boolean; deactivatedAt: string }>(
      `/addresses/${encodeURIComponent(code)}`,
      { method: 'DELETE', auth: 'jwt' },
    ),
  me: () => apiFetch<User>('/users/me', { auth: 'jwt' }),
  updateMe: (body: { email?: string | null }) =>
    apiFetch<User>('/users/me', { method: 'PATCH', body, auth: 'jwt' }),
  deleteMe: () =>
    apiFetch<{ deleted: boolean; purgeScheduledAt: string }>('/users/me', {
      method: 'DELETE',
      auth: 'jwt',
    }),
  subscribePush: (body: { endpoint: string; keys: { p256dh: string; auth: string } }) =>
    apiFetch<{ subscribed: boolean }>('/push-subscriptions', {
      method: 'POST',
      body,
      auth: 'jwt',
    }),
  unsubscribePush: (body: { endpoint: string }) =>
    apiFetch<{ unsubscribed: boolean }>('/push-subscriptions', {
      method: 'DELETE',
      body,
      auth: 'jwt',
    }),

  // ─── Admin ────────────────────────────────────────────────────────────
  adminStats: () => apiFetch<AdminStats>('/admin/stats', { auth: 'jwt' }),
  adminQuartiers: () =>
    apiFetch<Array<Quartier & { addressCount: number }>>('/admin/quartiers', { auth: 'jwt' }),
  adminCreateQuartier: (body: {
    name: string;
    prefix: string;
    commune?: string;
    coordinates?: { lat: number; lng: number };
  }) => apiFetch<Quartier>('/admin/quartiers', { method: 'POST', body, auth: 'jwt' }),
  adminQuartier: (id: string) =>
    apiFetch<Quartier & { addressCount: number; medianPriceFCFA: number | null }>(
      `/admin/quartiers/${encodeURIComponent(id)}`,
      { auth: 'jwt' },
    ),
  adminUpdateQuartier: (
    id: string,
    body: { name?: string; prefix?: string; isActive?: boolean },
  ) =>
    apiFetch<{ updated: boolean }>(`/admin/quartiers/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body,
      auth: 'jwt',
    }),
  adminAddresses: (params: {
    search?: string;
    status?: 'all' | 'active' | 'inactive' | 'reported';
    page?: number;
    limit?: number;
  } = {}) => {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.status) q.set('status', params.status);
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return apiFetch<{
      items: Array<{
        code: string;
        quartier: { name: string } | null;
        ownerPhone: string;
        isActive: boolean;
        reliabilityScore: number | null;
        reportCount: number;
        createdAt: string;
      }>;
      total: number;
      page: number;
      limit: number;
    }>(`/admin/addresses${qs ? `?${qs}` : ''}`, { auth: 'jwt' });
  },
  adminDeactivateAddress: (code: string) =>
    apiFetch<{ deactivated: boolean }>(
      `/admin/addresses/${encodeURIComponent(code)}/deactivate`,
      { method: 'PATCH', auth: 'jwt' },
    ),
  adminAddressDetail: (code: string) =>
    apiFetch<AdminAddressDetail>(
      `/admin/addresses/${encodeURIComponent(code)}`,
      { auth: 'jwt' },
    ),
  adminReports: () => apiFetch<Report[]>('/admin/reports', { auth: 'jwt' }),
  adminReport: (id: string) =>
    apiFetch<{ report: Report; address: PublicAddress | null }>(
      `/admin/reports/${encodeURIComponent(id)}`,
      { auth: 'jwt' },
    ),
  adminUpdateReport: (id: string, body: { status: 'resolved' | 'ignored' }) =>
    apiFetch<{ updated: boolean }>(`/admin/reports/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body,
      auth: 'jwt',
    }),
  adminContributions: (status?: 'PENDING' | 'APPROVED' | 'REJECTED') => {
    const path = status
      ? `/admin/contributions?status=${status}`
      : '/admin/contributions';
    return apiFetch<Contribution[]>(path, { auth: 'jwt' });
  },
  adminUpdateContribution: (
    id: string,
    body: { status: 'approved' | 'rejected' },
  ) =>
    apiFetch<{ updated: boolean }>(
      `/admin/contributions/${encodeURIComponent(id)}`,
      { method: 'PATCH', body, auth: 'jwt' },
    ),
  adminApiKeys: () => apiFetch<ApiKey[]>('/admin/api-keys', { auth: 'jwt' }),
  adminCreateApiKey: (body: { label: string; expiresAt?: string | null }) =>
    apiFetch<ApiKey>('/admin/api-keys', { method: 'POST', body, auth: 'jwt' }),
  adminRevokeApiKey: (id: string) =>
    apiFetch<{ revoked: boolean; revokedAt: string }>(
      `/admin/api-keys/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: { status: 'revoked' }, auth: 'jwt' },
    ),

  // ─── Habitants ─────────────────────────────────────────────────────────
  adminHabitants: (params: { search?: string; status?: HabitantStatus | 'all' } = {}) => {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.status) q.set('status', params.status);
    const qs = q.toString();
    return apiFetch<AdminHabitant[]>(
      `/admin/habitants${qs ? `?${qs}` : ''}`,
      { auth: 'jwt' },
    );
  },
  adminHabitant: (id: string) =>
    apiFetch<AdminHabitantDetail>(`/admin/habitants/${encodeURIComponent(id)}`, {
      auth: 'jwt',
    }),
  adminUpdateHabitant: (
    id: string,
    body: { status?: HabitantStatus },
  ) =>
    apiFetch<{ updated: boolean }>(
      `/admin/habitants/${encodeURIComponent(id)}`,
      { method: 'PATCH', body, auth: 'jwt' },
    ),

  // ─── Moderation ────────────────────────────────────────────────────────
  adminModerationStats: () =>
    apiFetch<ModerationStats>('/admin/moderation/stats', { auth: 'jwt' }),
  adminModerationQueue: () =>
    apiFetch<ModerationQueueItem[]>('/admin/moderation/queue', { auth: 'jwt' }),
  adminModerationQueueItem: (code: string) =>
    apiFetch<ModerationQueueItem>(
      `/admin/moderation/queue/${encodeURIComponent(code)}`,
      { auth: 'jwt' },
    ),
  adminDecideQueueItem: (code: string, body: ModerationDecisionInput) =>
    apiFetch<{ decided: boolean }>(
      `/admin/moderation/queue/${encodeURIComponent(code)}`,
      { method: 'POST', body, auth: 'jwt' },
    ),

  // ─── Moderators ────────────────────────────────────────────────────────
  adminModerators: () =>
    apiFetch<AdminModerator[]>('/admin/moderators', { auth: 'jwt' }),
  adminCreateModerator: (body: { phone: string; email?: string | null }) =>
    apiFetch<AdminModerator>('/admin/moderators', {
      method: 'POST',
      body,
      auth: 'jwt',
    }),
  adminUpdateModerator: (
    id: string,
    body: { status?: 'active' | 'suspended' },
  ) =>
    apiFetch<{ updated: boolean }>(
      `/admin/moderators/${encodeURIComponent(id)}`,
      { method: 'PATCH', body, auth: 'jwt' },
    ),
  adminResetModeratorPassword: (id: string) =>
    apiFetch<{ sent: boolean }>(
      `/admin/moderators/${encodeURIComponent(id)}/reset-password`,
      { method: 'POST', auth: 'jwt' },
    ),
};
