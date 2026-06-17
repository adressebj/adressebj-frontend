export function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export function formatAddressCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidAddressCodeFormat(code: string): boolean {
  return /^[A-Z]{3}-[A-Z0-9]{4}$/.test(code);
}

export function buildAssembledText(steps: string[]): string {
  const trimmed = steps.map((s) => s.trim()).filter(Boolean);
  if (trimmed.length === 0) return '';
  return trimmed.join('. ') + '.';
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
