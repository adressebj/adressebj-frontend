export function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export function formatAddressCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidAddressCodeFormat(code: string): boolean {
  return /^[A-Z]{3}-[A-Z0-9]{4}$/.test(code);
}

// Typographie française : espace fine insécable (U+202F) avant ? ! ; et espace
// insécable (U+00A0) avant : — pour que le texte d'itinéraire respecte les
// règles d'espacement, peu importe ce que l'utilisateur a (ou n'a pas) tapé.
const THIN_NBSP = ' ';
const NBSP = ' ';

// Applique l'espacement français à la ponctuation interne d'un corps de phrase :
// remplace toute espace (ou absence d'espace) avant « ; ! ? » par une fine
// insécable, et avant « : » par une insécable — sauf le « : » entre deux
// chiffres (heures, ratios : « 8:30 », « 2:1 ») qui n'est pas une ponctuation.
// Idempotent : réappliqué sur un texte déjà correct, il ne change rien.
function applyFrenchSpacing(body: string): string {
  return body
    .replace(/(\S)\s*([;!?])/g, `$1${THIN_NBSP}$2`)
    .replace(/([^\s\d])\s*:(?!\d)/g, `$1${NBSP}:`);
}

// Assemble les étapes saisies par l'habitant en un texte d'itinéraire lisible.
// Chaque étape est rédigée à la main par un utilisateur différent (le créateur,
// puis un éditeur), donc la casse et la ponctuation sont imprévisibles : on
// normalise chaque segment en une « phrase » propre avant de les joindre, pour
// éviter les ratés grammaticaux du texte final (majuscule manquante, point en
// double parce que l'un a terminé par un point et pas l'autre, espace avant la
// ponctuation, points de suspension, etc.).
function toSentence(raw: string): string {
  // 1. Normalise les espaces internes (runs d'espaces/tabs → une espace).
  let s = raw.replace(/\s+/g, ' ').trim();
  if (!s) return '';
  // 2. Retire la ponctuation parasite en tête (un segment qui commence par
  //    « . » ou « , » casse la lecture une fois joint).
  s = s.replace(/^[.,;:!?…·–—\s-]+/, '').trim();
  if (!s) return '';
  // 3. Isole la grappe de ponctuation finale (avec d'éventuelles espaces que
  //    l'utilisateur a laissées avant) du corps de la phrase.
  const trail = s.match(/[\s.!?…]+$/)?.[0] ?? '';
  const body = trail ? s.slice(0, s.length - trail.length) : s;
  if (!body) return '';
  // 4. Choisit le terminateur : on respecte un « ? » ou un « ! » volontaire
  //    (précédé d'une fine insécable), sinon (point, points de suspension, ou
  //    rien) on met un point unique.
  const lastMark = trail.replace(/\s+/g, '').slice(-1);
  const terminator =
    lastMark === '?' || lastMark === '!' ? `${THIN_NBSP}${lastMark}` : '.';
  // 5. Majuscule sur la première lettre, le reste intact (préserve les sigles
  //    et noms propres : « GPS », « ESBTP », « Dantokpa »).
  const capitalized = body.charAt(0).toLocaleUpperCase('fr-FR') + body.slice(1);
  // 6. Espacement français de la ponctuation interne, puis terminateur.
  return applyFrenchSpacing(capitalized) + terminator;
}

export function buildAssembledText(steps: string[]): string {
  const sentences = steps.map(toSentence).filter(Boolean);
  return sentences.join(' ');
}

export function isValidBeninPhone(phone: string): boolean {
  return /^\+229\d{8}$/.test(phone.trim());
}

// Ray-casting point-in-polygon for GeoJSON Polygon coordinates.
// `polygon` is a GeoJSON Polygon `coordinates` array: an array of linear
// rings, each ring being an array of `[lng, lat]` pairs. The outer ring is
// at index 0; subsequent rings are holes.
//
// Used by StepGPS to confirm the captured position falls inside the zone
// the user picked at Step 1 — protects against acquiring a GPS reading in
// the wrong neighborhood (a common failure mode when the user is indoors
// or has just travelled).
export function pointInPolygon(
  lat: number,
  lng: number,
  polygon: number[][][],
): boolean {
  if (!polygon || polygon.length === 0) return true;
  const ring = polygon[0];
  if (!ring || ring.length < 3) return true;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  // Subtract any hole the point falls into.
  for (let h = 1; h < polygon.length; h += 1) {
    const hole = polygon[h];
    let inHole = false;
    for (let i = 0, j = hole.length - 1; i < hole.length; j = i++) {
      const [xi, yi] = hole[i];
      const [xj, yj] = hole[j];
      const intersect =
        yi > lat !== yj > lat &&
        lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
      if (intersect) inHole = !inHole;
    }
    if (inHole) return false;
  }
  return inside;
}

// Masks the middle digits while keeping the country code and the last two
// for recognition. Formatted with thin spaces in the standard Bénin grouping
// (+229 XX XX XX XX) so the result reads as a real phone number rather than
// a wall of digits — `"+22960123456"` → `"+229 60 ** ** 56"`.
export function maskPhone(phone: string): string {
  const trimmed = phone.trim();
  if (!isValidBeninPhone(trimmed)) return trimmed;
  // Local is 8 digits after the +229 prefix. We surface the first 2 and the
  // last 2 — enough for recognition, opaque on the middle 4.
  const local = trimmed.slice(4);
  const head = local.slice(0, 2);
  const tail = local.slice(-2);
  return `+229 ${head} ** ** ${tail}`;
}
